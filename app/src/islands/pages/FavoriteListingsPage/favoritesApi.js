/**
 * API service for favorite listings
 * Uses direct Supabase queries to the user table's "Favorited Listings" JSONB field
 */

import { supabase } from '../../../lib/supabase.js';

/**
 * Fetch favorited listing IDs for a user from the user table
 * @param {string} userId - The user's ID
 * @returns {Promise<string[]>} Array of favorited listing IDs
 */
export async function getFavoritedListingIds(userId) {
  console.log('📡 [favoritesApi] getFavoritedListingIds called with:', { userId });

  try {
    const { data: userData, error } = await supabase
      .from('user')
      .select('"Favorited Listings"')
      .eq('_id', userId)
      .single();

    if (error) {
      console.error('❌ Error fetching favorited listing IDs:', error);
      throw error;
    }

    const favorites = userData?.['Favorited Listings'] || [];
    console.log('📡 [favoritesApi] Found', favorites.length, 'favorited listings');
    return favorites;
  } catch (err) {
    console.error('❌ Failed to fetch favorited listing IDs:', err);
    throw err;
  }
}

/**
 * Check if a specific listing is favorited by the user
 * @param {string} userId - The user's ID
 * @param {string} listingId - The listing ID to check
 * @returns {Promise<boolean>} True if favorited, false otherwise
 */
export async function isListingFavorited(userId, listingId) {
  try {
    const favorites = await getFavoritedListingIds(userId);
    return favorites.includes(listingId);
  } catch (err) {
    console.error('❌ Failed to check if listing is favorited:', err);
    return false;
  }
}

/**
 * Remove a listing from user's favorites
 * Updates the user table's "Favorited Listings" JSONB field directly
 * @param {string} userId - The user's ID
 * @param {string} listingId - The listing ID to remove
 * @returns {Promise<{success: boolean, favorites: string[]}>}
 */
export async function removeFromFavorites(userId, listingId) {
  try {
    console.log('🔄 Removing from favorites:', { userId, listingId });

    // Fetch current favorites
    const currentFavorites = await getFavoritedListingIds(userId);

    // Remove the listing ID
    const newFavorites = currentFavorites.filter(id => id !== listingId);

    // Update user table
    const { error: updateError } = await supabase
      .from('user')
      .update({ 'Favorited Listings': newFavorites })
      .eq('_id', userId);

    if (updateError) {
      console.error('❌ Error updating favorites:', updateError);
      throw updateError;
    }

    console.log('✅ Removed from favorites successfully');
    return { success: true, favorites: newFavorites };
  } catch (err) {
    console.error('❌ Failed to remove from favorites:', err);
    throw err;
  }
}

/**
 * Add a listing to user's favorites
 * Updates the user table's "Favorited Listings" JSONB field directly
 * @param {string} userId - The user's ID
 * @param {string} listingId - The listing ID to add
 * @returns {Promise<{success: boolean, favorites: string[]}>}
 */
export async function addToFavorites(userId, listingId) {
  try {
    console.log('🔄 Adding to favorites:', { userId, listingId });

    // Fetch current favorites
    const currentFavorites = await getFavoritedListingIds(userId);

    // Add the listing ID (avoid duplicates)
    let newFavorites;
    if (!currentFavorites.includes(listingId)) {
      newFavorites = [...currentFavorites, listingId];
    } else {
      newFavorites = currentFavorites;
    }

    // Update user table
    const { error: updateError } = await supabase
      .from('user')
      .update({ 'Favorited Listings': newFavorites })
      .eq('_id', userId);

    if (updateError) {
      console.error('❌ Error updating favorites:', updateError);
      throw updateError;
    }

    console.log('✅ Added to favorites successfully');
    return { success: true, favorites: newFavorites };
  } catch (err) {
    console.error('❌ Failed to add to favorites:', err);
    throw err;
  }
}
