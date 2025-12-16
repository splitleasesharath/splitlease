/**
 * Favorites Handler
 * Handles add/remove favorites for users
 *
 * Uses Supabase service role to bypass RLS and update user's favorites array
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateRequiredFields } from '../../_shared/validation.ts';
import { parseJsonArray } from '../../_shared/jsonUtils.ts';
import {
  addUserListingFavorite,
  removeUserListingFavorite,
} from '../../_shared/junctionHelpers.ts';

interface FavoritesPayload {
  userId: string;
  listingId: string;
  action: 'add' | 'remove';
}

/**
 * Handle favorites add/remove
 * Updates the 'Favorited Listings' JSONB array field on the user table
 */
export async function handleFavorites(
  payload: FavoritesPayload
): Promise<{ success: boolean; favorites: string[] }> {
  console.log('[Favorites Handler] ========== TOGGLE FAVORITE ==========');
  console.log('[Favorites Handler] User ID:', payload.userId);
  console.log('[Favorites Handler] Listing ID:', payload.listingId);
  console.log('[Favorites Handler] Action:', payload.action);

  // Validate required fields
  validateRequiredFields(payload, ['userId', 'listingId', 'action']);

  const { userId, listingId, action } = payload;

  // Validate action
  if (action !== 'add' && action !== 'remove') {
    throw new Error(`Invalid action: ${action}. Must be 'add' or 'remove'`);
  }

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
    // Step 1: Fetch current favorites
    console.log('[Favorites Handler] Step 1: Fetching current favorites...');
    const { data: userData, error: fetchError } = await supabase
      .from('user')
      .select('"Favorited Listings"')
      .eq('_id', userId)
      .single();

    if (fetchError) {
      console.error('[Favorites Handler] Fetch error:', fetchError);
      throw new Error(`Failed to fetch user data: ${fetchError.message}`);
    }

    console.log('[Favorites Handler] Current user data:', userData);

    // Parse current favorites (handle null/undefined AND stringified JSON)
    // CRITICAL: Supabase JSONB can return as stringified JSON - must parse first
    const currentFavorites = parseJsonArray<string>(
      userData?.['Favorited Listings'],
      'Favorited Listings'
    );
    console.log('[Favorites Handler] Current favorites:', currentFavorites);

    // Step 2: Update favorites array
    let updatedFavorites: string[];

    if (action === 'add') {
      // Add listing if not already in favorites
      if (!currentFavorites.includes(listingId)) {
        updatedFavorites = [...currentFavorites, listingId];
        console.log('[Favorites Handler] Adding listing to favorites');
      } else {
        updatedFavorites = currentFavorites;
        console.log('[Favorites Handler] Listing already in favorites, no change needed');
      }
    } else {
      // Remove listing from favorites
      updatedFavorites = currentFavorites.filter(id => id !== listingId);
      console.log('[Favorites Handler] Removing listing from favorites');
    }

    console.log('[Favorites Handler] Updated favorites:', updatedFavorites);

    // Step 3: Update user record using database function
    // Note: Using RPC function to reliably handle column name with space
    console.log('[Favorites Handler] Step 2: Updating user record via RPC...');
    console.log('[Favorites Handler] Update payload:', JSON.stringify(updatedFavorites));

    const { error: updateError } = await supabase.rpc('update_user_favorites', {
      p_user_id: userId,
      p_favorites: updatedFavorites
    });

    if (updateError) {
      console.error('[Favorites Handler] Update error:', updateError);
      throw new Error(`Failed to update favorites: ${updateError.message}`);
    }

    // Dual-write to junction table
    if (action === 'add') {
      await addUserListingFavorite(supabase, userId, listingId);
    } else {
      await removeUserListingFavorite(supabase, userId, listingId);
    }

    // Verify the update by fetching again
    const { data: verifyData, error: verifyError } = await supabase
      .from('user')
      .select('"Favorited Listings"')
      .eq('_id', userId)
      .single();

    if (verifyError) {
      console.error('[Favorites Handler] Verify error:', verifyError);
    } else {
      console.log('[Favorites Handler] Verification - current favorites in DB:', verifyData?.['Favorited Listings']);
      console.log('[Favorites Handler] Favorites count after update:', verifyData?.['Favorited Listings']?.length || 0);
    }

    console.log('[Favorites Handler] ========== SUCCESS ==========');

    return {
      success: true,
      favorites: updatedFavorites,
    };
  } catch (error) {
    console.error('[Favorites Handler] ========== ERROR ==========');
    console.error('[Favorites Handler] Failed to toggle favorite:', error);
    throw error;
  }
}
