/**
 * StarRating Component
 *
 * Interactive 5-star rating widget with full keyboard accessibility.
 * Supports Arrow keys for navigation, Enter/Space for selection.
 */

import { useState, useCallback } from 'react';

const StarRating = ({
  value = 0,
  onChange,
  maxStars = 5,
  disabled = false,
  size = 'medium' // 'small', 'medium', 'large'
}) => {
  const [hoverValue, setHoverValue] = useState(0);

  const sizeMap = {
    small: 16,
    medium: 24,
    large: 32
  };
  const starSize = sizeMap[size] || sizeMap.medium;

  const handleClick = useCallback((starValue) => {
    if (!disabled && onChange) {
      onChange(starValue);
    }
  }, [disabled, onChange]);

  const handleKeyDown = useCallback((e, starValue) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        onChange?.(starValue);
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        e.preventDefault();
        if (starValue < maxStars) {
          onChange?.(starValue + 1);
        }
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        e.preventDefault();
        if (starValue > 1) {
          onChange?.(starValue - 1);
        }
        break;
      default:
        break;
    }
  }, [disabled, onChange, maxStars]);

  const handleMouseEnter = useCallback((starValue) => {
    if (!disabled) {
      setHoverValue(starValue);
    }
  }, [disabled]);

  const handleMouseLeave = useCallback(() => {
    setHoverValue(0);
  }, []);

  const displayValue = hoverValue || value;

  return (
    <div
      className={`hrg-star-rating hrg-star-rating--${size} ${disabled ? 'hrg-star-rating--disabled' : ''}`}
      role="group"
      aria-label="Rating"
      onMouseLeave={handleMouseLeave}
    >
      {Array.from({ length: maxStars }, (_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= displayValue;

        return (
          <button
            key={starValue}
            type="button"
            className={`hrg-star ${isFilled ? 'hrg-star--filled' : ''}`}
            onClick={() => handleClick(starValue)}
            onKeyDown={(e) => handleKeyDown(e, starValue)}
            onMouseEnter={() => handleMouseEnter(starValue)}
            disabled={disabled}
            aria-label={`${starValue} star${starValue !== 1 ? 's' : ''}`}
            aria-pressed={value === starValue}
            tabIndex={disabled ? -1 : 0}
          >
            <svg
              width={starSize}
              height={starSize}
              viewBox="0 0 24 24"
              fill={isFilled ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;
