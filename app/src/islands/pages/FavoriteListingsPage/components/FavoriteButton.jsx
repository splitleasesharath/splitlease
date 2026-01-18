/**
 * FavoriteButton Component
 * Heart icon that toggles favorite status for a listing
 */

import { useState } from 'react';
import './FavoriteButton.css';

const FavoriteButton = ({
  listingId,
  isFavorited,
  onToggle,
  disabled = false,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = (e) => {
    e.stopPropagation(); // Prevent card click when clicking favorite button

    if (disabled) return;

    setIsAnimating(true);
    onToggle(listingId);

    // Reset animation after 300ms
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <button
      className={`favorite-button ${isFavorited ? 'favorited' : 'not-favorited'} ${isAnimating ? 'animating' : ''}`}
      onClick={handleClick}
      disabled={disabled}
      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill={isFavorited ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
      </svg>
    </button>
  );
};

export default FavoriteButton;
