/**
 * GuestReviewForm Component
 *
 * Form for guests to submit reviews with ratings and text feedback.
 * Includes star ratings for multiple categories.
 *
 * @param {Object} props
 * @param {Object} props.formData - Current form data
 * @param {function} props.onReviewTextChange - Review text change handler
 * @param {function} props.onRatingChange - Rating change handler
 * @param {function} props.onSubmit - Form submit handler
 * @param {function} props.onCancel - Cancel handler
 * @param {boolean} props.canSubmit - Whether form can be submitted
 * @param {boolean} props.isSubmitting - Whether form is being submitted
 * @param {string|null} props.error - Error message if any
 */

import { useState, useCallback } from 'react';

const GuestReviewForm = ({
  formData,
  onReviewTextChange,
  onRatingChange,
  onSubmit,
  onCancel,
  canSubmit,
  isSubmitting,
  error,
}) => {
  // Track hovered star for visual feedback
  const [hoveredRating, setHoveredRating] = useState({});

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (canSubmit) {
        onSubmit();
      }
    },
    [canSubmit, onSubmit]
  );

  // Rating categories to display
  const ratingCategories = [
    { field: 'overallRating', label: 'Overall Experience', required: true },
    { field: 'cleanlinessRating', label: 'Cleanliness', required: false },
    { field: 'accuracyRating', label: 'Accuracy', required: false },
    { field: 'communicationRating', label: 'Host Communication', required: false },
    { field: 'locationRating', label: 'Location', required: false },
    { field: 'valueRating', label: 'Value for Money', required: false },
    { field: 'checkInRating', label: 'Check-in Experience', required: false },
  ];

  return (
    <form className="vrhm-review-form" onSubmit={handleSubmit}>
      <h3 className="vrhm-review-form__title">Write a Review</h3>

      {error && <div className="vrhm-review-form__error">{error}</div>}

      {/* Rating Section */}
      <div className="vrhm-review-form__field">
        <label className="vrhm-review-form__label">
          Rate Your Experience
          <span className="vrhm-review-form__required">*</span>
        </label>

        <div className="vrhm-rating">
          {ratingCategories.map(({ field, label, required }) => (
            <StarRating
              key={field}
              field={field}
              label={label}
              required={required}
              value={formData[field]}
              hoveredValue={hoveredRating[field]}
              onRatingChange={onRatingChange}
              onHover={(value) =>
                setHoveredRating((prev) => ({ ...prev, [field]: value }))
              }
              onHoverEnd={() =>
                setHoveredRating((prev) => ({ ...prev, [field]: null }))
              }
            />
          ))}
        </div>
      </div>

      {/* Review Text */}
      <div className="vrhm-review-form__field">
        <label htmlFor="review-text" className="vrhm-review-form__label">
          Your Review
          <span className="vrhm-review-form__required">*</span>
        </label>
        <textarea
          id="review-text"
          className="vrhm-review-form__textarea"
          placeholder="Share your experience staying at this property. What did you enjoy? Any tips for future guests?"
          value={formData.reviewText}
          onChange={onReviewTextChange}
          minLength={10}
          required
        />
        <span className="vrhm-review-form__hint">
          Minimum 10 characters.{' '}
          {formData.reviewText.length > 0 &&
            `(${formData.reviewText.length} characters)`}
        </span>
      </div>

      {/* Form Actions */}
      <div className="vrhm-review-form__actions">
        <button
          type="button"
          className="vrhm-button-secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="vrhm-button-primary"
          disabled={!canSubmit || isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>
    </form>
  );
};

/**
 * Star Rating Component
 *
 * Interactive 5-star rating input.
 */
const StarRating = ({
  field,
  label,
  required,
  value,
  hoveredValue,
  onRatingChange,
  onHover,
  onHoverEnd,
}) => {
  const handleClick = useCallback(
    (rating) => {
      onRatingChange(field, rating);
    },
    [field, onRatingChange]
  );

  const handleKeyDown = useCallback(
    (e, rating) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick(rating);
      }
    },
    [handleClick]
  );

  // Determine which stars should be filled
  const displayValue = hoveredValue || value || 0;

  return (
    <div className="vrhm-rating__row">
      <span className="vrhm-rating__label">
        {label}
        {required && <span className="vrhm-review-form__required">*</span>}
      </span>
      <div
        className="vrhm-rating__stars"
        role="radiogroup"
        aria-label={`${label} rating`}
        onMouseLeave={onHoverEnd}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= displayValue;
          const isHovered = hoveredValue && star <= hoveredValue;

          return (
            <span
              key={star}
              role="radio"
              aria-checked={value === star}
              aria-label={`${star} star${star !== 1 ? 's' : ''}`}
              tabIndex={0}
              className={`vrhm-rating__star ${
                isFilled ? 'vrhm-rating__star--filled' : ''
              } ${isHovered ? 'vrhm-rating__star--hovered' : ''}`}
              onClick={() => handleClick(star)}
              onKeyDown={(e) => handleKeyDown(e, star)}
              onMouseEnter={() => onHover(star)}
            >
              &#9733;
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default GuestReviewForm;
