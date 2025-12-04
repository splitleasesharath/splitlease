/**
 * Get Favorites Handler
 * Fetches user's favorited listings from Supabase
 *
 * Uses Supabase service role to:
 * 1. Get user's "Favorited Listings" array from user table
 * 2. Fetch those listings from the listing table
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateRequiredFields } from '../../_shared/validation.ts';

interface GetFavoritesPayload {
  userId: string;
  page?: number;
  perPage?: number;
  sortBy?: string;
}

interface Listing {
  _id: string;
  Name?: string;
  'Location - Address'?: {
    lat?: number;
    lng?: number;
    address?: string;
  };
  'Location - Hood'?: string;
  'Location - Borough'?: string;
  'Features - Photos'?: string[];
  'Features - Type of Space'?: string;
  'Features - Qty Bedrooms'?: number;
  'Features - Qty Bathrooms'?: number;
  'Features - Qty Guests'?: number;
  pricing_list?: string;
  [key: string]: unknown;
}

/**
 * Handle get favorites
 * Returns paginated list of favorited listings
 */
export async function handleGetFavorites(
  payload: GetFavoritesPayload
): Promise<{
  listings: Array<{
    id: string;
    name: string;
    location: {
      lat?: number;
      lng?: number;
      address?: string;
      neighborhood?: string;
      borough?: string;
    };
    photos: string[];
    propertyType?: string;
    bedrooms?: number;
    bathrooms?: number;
    guests?: number;
    pricingList?: {
      startingNightlyPrice?: number;
    };
    listerPriceDisplay?: number;
  }>;
  pagination: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}> {
  console.log('[GetFavorites Handler] ========== GET FAVORITES ==========');
  console.log('[GetFavorites Handler] User ID:', payload.userId);

  // Validate required fields
  validateRequiredFields(payload, ['userId']);

  const { userId, page = 1, perPage = 20, sortBy = 'price_asc' } = payload;

  // Initialize Supabase with service role key (bypasses RLS)
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Step 1: Fetch user's favorited listing IDs
    console.log('[GetFavorites Handler] Step 1: Fetching user favorites...');
    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('"Favorited Listings"')
      .eq('_id', userId)
      .single();

    if (userError) {
      console.error('[GetFavorites Handler] User fetch error:', userError);
      throw new Error(`Failed to fetch user data: ${userError.message}`);
    }

    // Parse Favorited Listings - it's stored as a stringified JSON array in the database
    let favoritedIds: string[] = [];
    const rawFavorites = userData?.['Favorited Listings'];
    console.log('[GetFavorites Handler] Raw favorites value:', rawFavorites, 'Type:', typeof rawFavorites);

    if (rawFavorites) {
      if (typeof rawFavorites === 'string') {
        // Parse the stringified JSON array
        try {
          favoritedIds = JSON.parse(rawFavorites);
          console.log('[GetFavorites Handler] Parsed favorites from string:', favoritedIds);
        } catch (parseError) {
          console.error('[GetFavorites Handler] Failed to parse favorites string:', parseError);
          favoritedIds = [];
        }
      } else if (Array.isArray(rawFavorites)) {
        // Already an array
        favoritedIds = rawFavorites;
        console.log('[GetFavorites Handler] Favorites already an array:', favoritedIds);
      }
    }

    console.log('[GetFavorites Handler] Favorited IDs:', favoritedIds);

    // If no favorites, return empty response
    if (favoritedIds.length === 0) {
      console.log('[GetFavorites Handler] No favorites found');
      return {
        listings: [],
        pagination: {
          total: 0,
          page,
          perPage,
          totalPages: 0,
        },
      };
    }

    // Step 2: Fetch listings by IDs
    console.log('[GetFavorites Handler] Step 2: Fetching listings...');
    const { data: listings, error: listingsError } = await supabase
      .from('listing')
      .select(`
        _id,
        "Name",
        "Location - Address",
        "Location - Hood",
        "Location - Borough",
        "Features - Photos",
        "Features - Type of Space",
        "Features - Qty Bedrooms",
        "Features - Qty Bathrooms",
        "Features - Qty Guests",
        "pricing_list",
        "💰Nightly Host Rate for 2 nights",
        "Active",
        "Approved"
      `)
      .in('_id', favoritedIds)
      .eq('Active', true);

    if (listingsError) {
      console.error('[GetFavorites Handler] Listings fetch error:', listingsError);
      throw new Error(`Failed to fetch listings: ${listingsError.message}`);
    }

    console.log('[GetFavorites Handler] Found listings:', listings?.length || 0);

    // Transform listings to frontend format
    const transformedListings = (listings || []).map((listing: Listing) => {
      // Parse pricing_list if it's a string
      let pricingData: Record<string, number> | null = null;
      if (listing.pricing_list) {
        try {
          pricingData = typeof listing.pricing_list === 'string'
            ? JSON.parse(listing.pricing_list)
            : listing.pricing_list;
        } catch {
          console.warn('[GetFavorites Handler] Failed to parse pricing_list for', listing._id);
        }
      }

      // Get starting price (use 2-night rate or first available price)
      const startingPrice = listing['💰Nightly Host Rate for 2 nights']
        || pricingData?.['Price 2 nights selected']
        || pricingData?.price_2_nights
        || 0;

      return {
        id: listing._id,
        name: listing['Name'] || 'Unnamed Listing',
        location: {
          lat: listing['Location - Address']?.lat,
          lng: listing['Location - Address']?.lng,
          address: listing['Location - Address']?.address,
          neighborhood: listing['Location - Hood'],
          borough: listing['Location - Borough'],
        },
        photos: listing['Features - Photos'] || [],
        propertyType: listing['Features - Type of Space'],
        bedrooms: listing['Features - Qty Bedrooms'],
        bathrooms: listing['Features - Qty Bathrooms'],
        guests: listing['Features - Qty Guests'],
        pricingList: {
          startingNightlyPrice: Number(startingPrice) || 0,
        },
        listerPriceDisplay: Number(startingPrice) || 0,
      };
    });

    // Apply sorting
    if (sortBy === 'price_asc') {
      transformedListings.sort((a, b) =>
        (a.listerPriceDisplay || 0) - (b.listerPriceDisplay || 0)
      );
    } else if (sortBy === 'price_desc') {
      transformedListings.sort((a, b) =>
        (b.listerPriceDisplay || 0) - (a.listerPriceDisplay || 0)
      );
    }

    // Apply pagination
    const total = transformedListings.length;
    const totalPages = Math.ceil(total / perPage);
    const startIdx = (page - 1) * perPage;
    const paginatedListings = transformedListings.slice(startIdx, startIdx + perPage);

    console.log('[GetFavorites Handler] ========== SUCCESS ==========');

    return {
      listings: paginatedListings,
      pagination: {
        total,
        page,
        perPage,
        totalPages,
      },
    };
  } catch (error) {
    console.error('[GetFavorites Handler] ========== ERROR ==========');
    console.error('[GetFavorites Handler] Failed to get favorites:', error);
    throw error;
  }
}
