/**
 * FavoriteButton Component
 *
 * A reusable heart icon button for favoriting listings.
 * Manages its own state for immediate visual feedback while staying
 * in sync with the parent's state via the initialFavorited prop.
 *
 * Uses direct Supabase updates to the user table's "Favorited Listings" JSONB field.
 *
 * Usage:
 *   <FavoriteButton
 *     listingId="123x456"
 *     userId="789x012"
 *     initialFavorited={isFavorited}
 *     onToggle={(newState, listingId) => updateParentState(listingId, newState)}
 *     onRequireAuth={() => showLoginModal()}
 *   />
 *
 * Key Features:
 * - Immediate visual feedback (no waiting for API)
 * - Syncs with parent state when initialFavorited changes
 * - Multiple instances for same listing stay in sync
 * - Shows login modal if user not authenticated
 * - Reverts visual state on API error
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../../lib/supabase.js';
import './FavoriteButton.css';

const FavoriteButton = ({
  listingId,
  userId,
  initialFavorited = false,
  onToggle,
  onRequireAuth,
  disabled = false,
  size = 'medium', // 'small', 'medium', 'large'
}) => {
  // Local state for immediate visual feedback
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Sync internal state when parent's initialFavorited prop changes
  // This ensures multiple FavoriteButton instances for the same listing stay in sync
  useEffect(() => {
    setIsFavorited(initialFavorited);
  }, [initialFavorited]);

  const handleClick = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled || isLoading) return;

    // If no userId, user needs to log in
    if (!userId) {
      if (onRequireAuth) {
        onRequireAuth();
      }
      return;
    }

    // Immediate visual feedback - toggle state NOW
    const newFavoritedState = !isFavorited;
    setIsFavorited(newFavoritedState);
    setIsAnimating(true);

    // Reset animation
    setTimeout(() => setIsAnimating(false), 300);

    // Sync with Supabase user table directly
    setIsLoading(true);
    try {
      // Fetch current favorites from user table
      const { data: userData, error: fetchError } = await supabase
        .from('user')
        .select('"Favorited Listings"')
        .eq('_id', userId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Get current favorites array (or empty array if null)
      const currentFavorites = userData?.['Favorited Listings'] || [];

      // Add or remove the listing ID
      let newFavorites;
      if (newFavoritedState) {
        // Add to favorites (avoid duplicates)
        if (!currentFavorites.includes(listingId)) {
          newFavorites = [...currentFavorites, listingId];
        } else {
          newFavorites = currentFavorites;
        }
      } else {
        // Remove from favorites
        newFavorites = currentFavorites.filter(id => id !== listingId);
      }

      // Update user table with new favorites array
      const { error: updateError } = await supabase
        .from('user')
        .update({ 'Favorited Listings': newFavorites })
        .eq('_id', userId);

      if (updateError) {
        throw updateError;
      }

      // Notify parent if callback provided
      if (onToggle) {
        onToggle(newFavoritedState, listingId);
      }

      console.log(`[FavoriteButton] ${newFavoritedState ? 'Added' : 'Removed'} listing ${listingId} ${newFavoritedState ? 'to' : 'from'} favorites`);
    } catch (error) {
      console.error('[FavoriteButton] Error toggling favorite:', error);
      // Revert visual state on error
      setIsFavorited(!newFavoritedState);
    } finally {
      setIsLoading(false);
    }
  }, [listingId, userId, isFavorited, isLoading, disabled, onToggle, onRequireAuth]);

  // Size classes
  const sizeClass = {
    small: 'favorite-button--small',
    medium: 'favorite-button--medium',
    large: 'favorite-button--large',
  }[size] || 'favorite-button--medium';

  // Icon sizes
  const iconSize = {
    small: 16,
    medium: 20,
    large: 24,
  }[size] || 20;

  return (
    <button
      type="button"
      className={`favorite-button-shared ${sizeClass} ${isFavorited ? 'favorited' : ''} ${isAnimating ? 'animating' : ''} ${isLoading ? 'loading' : ''}`}
      onClick={handleClick}
      disabled={disabled || isLoading}
      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill={isFavorited ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="favorite-button-icon"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
};

export default FavoriteButton;
