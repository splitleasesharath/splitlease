/**
 * API service for favorite listings
 * Uses Supabase Edge Functions (bubble-proxy) to interact with Bubble.io
 */

import { supabase } from '../../../lib/supabase.js';

/**
 * Fetch favorited listings for a user
 * @param {string} userId - The user's ID
 * @param {Object} [options] - Fetch options
 * @param {number} [options.page=1] - Page number
 * @param {number} [options.perPage=20] - Items per page
 * @param {string} [options.sortBy='price_asc'] - Sort order
 * @returns {Promise<{listings: Array, pagination: Object}>}
 */
export async function getFavoritedListings(userId, options = {}) {
  const { page = 1, perPage = 20, sortBy = 'price_asc' } = options;

  try {
    const { data, error } = await supabase.functions.invoke('bubble-proxy', {
      body: {
        action: 'listing',
        type: 'favorites',
        userId,
        page,
        perPage,
        sortBy,
      },
    });

    if (error) {
      console.error('❌ Error fetching favorited listings:', error);
      throw error;
    }

    // If no data returned, return empty response
    if (!data || !data.listings) {
      return {
        listings: [],
        pagination: {
          total: 0,
          page: 1,
          perPage: 20,
          totalPages: 0,
        },
      };
    }

    return data;
  } catch (err) {
    console.error('❌ Failed to fetch favorited listings:', err);
    throw err;
  }
}

/**
 * Remove a listing from user's favorites
 * @param {string} userId - The user's ID
 * @param {string} listingId - The listing ID to remove
 * @returns {Promise<{success: boolean, favorites: string[]}>}
 */
export async function removeFromFavorites(userId, listingId) {
  try {
    // Use Edge Function to remove from favorites (bypasses RLS with service role key)
    console.log('🔄 Calling Edge Function to remove from favorites:', { userId, listingId });

    const { data, error } = await supabase.functions.invoke('bubble-proxy', {
      body: {
        action: 'toggle_favorite',
        payload: {
          userId,
          listingId,
          action: 'remove',
        },
      },
    });

    if (error) {
      console.error('❌ Edge Function error:', error);
      throw error;
    }

    if (!data?.success) {
      throw new Error(data?.error?.message || 'Failed to remove from favorites');
    }

    console.log('✅ Removed from favorites successfully');
    return { success: true, favorites: data.data?.favorites || [] };
  } catch (err) {
    console.error('❌ Failed to remove from favorites:', err);
    throw err;
  }
}

/**
 * Add a listing to user's favorites
 * @param {string} userId - The user's ID
 * @param {string} listingId - The listing ID to add
 * @returns {Promise<{success: boolean, favorites: string[]}>}
 */
export async function addToFavorites(userId, listingId) {
  try {
    // Use Edge Function to add to favorites (bypasses RLS with service role key)
    console.log('🔄 Calling Edge Function to add to favorites:', { userId, listingId });

    const { data, error } = await supabase.functions.invoke('bubble-proxy', {
      body: {
        action: 'toggle_favorite',
        payload: {
          userId,
          listingId,
          action: 'add',
        },
      },
    });

    if (error) {
      console.error('❌ Edge Function error:', error);
      throw error;
    }

    if (!data?.success) {
      throw new Error(data?.error?.message || 'Failed to add to favorites');
    }

    console.log('✅ Added to favorites successfully');
    return { success: true, favorites: data.data?.favorites || [] };
  } catch (err) {
    console.error('❌ Failed to add to favorites:', err);
    throw err;
  }
}
