/**
 * HostReviewGuest Component
 *
 * Master form for hosts to review guests after a completed stay.
 * Collects ratings across 12 behavioral dimensions and optional feedback.
 *
 * Usage:
 *   <HostReviewGuest
 *     guest={guestObject}
 *     host={hostObject}
 *     lease={leaseObject}
 *     stay={stayObject}
 *     isVisible={showModal}
 *     onClose={() => setShowModal(false)}
 *     onSubmit={(review) => handleReviewSubmitted(review)}
 *   />
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import RatingCategory from './RatingCategory.jsx';
import hostReviewGuestService from './hostReviewGuestService.js';
import { calculateReviewScore } from '../../../logic/calculators/reviews/calculateReviewScore.js';
import { calculateFormCompletion } from '../../../logic/calculators/reviews/calculateFormCompletion.js';
import { canSubmitReview, isReviewComplete } from '../../../logic/rules/reviews/reviewValidation.js';
import { createEmptyRatings, adaptReviewForSubmission } from '../../../logic/processors/reviews/reviewAdapter.js';
import './HostReviewGuest.css';

const HostReviewGuest = ({
  guest,
  host,
  lease,
  stay,
  isVisible = false,
  onClose,
  onSubmit
}) => {
  // State management
  const [ratings, setRatings] = useState(() => createEmptyRatings());
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [submittedReview, setSubmittedReview] = useState(null);

  // Reset form when visibility changes
  useEffect(() => {
    if (isVisible) {
      setRatings(createEmptyRatings());
      setFeedback('');
      setError(null);
      setSubmittedReview(null);
    }
  }, [isVisible]);

  // Calculate average score
  const averageScore = useMemo(() => {
    const validRatings = ratings.filter(r => r.value > 0);
    if (validRatings.length === 0) return 0;

    try {
      return calculateReviewScore({ ratings: validRatings });
    } catch {
      return 0;
    }
  }, [ratings]);

  // Calculate form completion percentage
  const completionPercentage = useMemo(() => {
    return calculateFormCompletion({ ratings });
  }, [ratings]);

  // Check if form can be submitted
  const canSubmit = useMemo(() => {
    return canSubmitReview({ ratings, isSubmitting });
  }, [ratings, isSubmitting]);

  // Handle rating change for a category
  const handleRatingChange = useCallback((categoryId, value) => {
    setRatings(prev => prev.map(r =>
      r.categoryId === categoryId ? { ...r, value } : r
    ));
    setError(null);
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (!canSubmit) {
      setError('Please complete all rating categories before submitting.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const reviewData = adaptReviewForSubmission({
        guestId: guest?._id || guest?.id,
        hostId: host?._id || host?.id,
        leaseId: lease?._id || lease?.id,
        stayId: stay?._id || stay?.id,
        ratings,
        feedback,
        overallScore: averageScore
      });

      const result = await hostReviewGuestService.submitReview(reviewData);

      if (result.status === 'success') {
        setSubmittedReview(result.data);
        if (onSubmit) {
          onSubmit(result.data);
        }
      } else {
        throw new Error(result.message || 'Failed to submit review');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, guest, host, lease, stay, ratings, feedback, averageScore, onSubmit]);

  // Handle close
  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  // Success confirmation view
  if (submittedReview) {
    return (
      <div className="hrg-overlay" onClick={handleBackdropClick}>
        <div className="hrg-container hrg-container--success">
          <button
            type="button"
            className="hrg-close-btn"
            onClick={handleClose}
            aria-label="Close"
          >
            &times;
          </button>

          <div className="hrg-success-content">
            <div className="hrg-success-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>

            <h2 className="hrg-success-title">Review Submitted!</h2>

            <p className="hrg-success-message">
              Thank you for reviewing {guest?.firstName || guest?.name || 'your guest'}.
              Your feedback helps maintain our community standards.
            </p>

            <div className="hrg-success-score">
              <span className="hrg-success-score__label">Overall Score</span>
              <span className="hrg-success-score__value">{averageScore.toFixed(1)}</span>
            </div>

            <button
              type="button"
              className="hrg-button-primary"
              onClick={handleClose}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main review form view
  return (
    <div className="hrg-overlay" onClick={handleBackdropClick}>
      <div className="hrg-container">
        <button
          type="button"
          className="hrg-close-btn"
          onClick={handleClose}
          aria-label="Close"
        >
          &times;
        </button>

        <div className="hrg-header">
          <h2 className="hrg-title">Review Guest</h2>
          <p className="hrg-subtitle">
            How was your experience hosting {guest?.firstName || guest?.name || 'this guest'}?
          </p>
        </div>

        {/* Progress indicator */}
        <div className="hrg-progress">
          <div className="hrg-progress__bar">
            <div
              className="hrg-progress__fill"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <span className="hrg-progress__text">{completionPercentage}% complete</span>
        </div>

        {/* Error message */}
        {error && (
          <div className="hrg-error" role="alert">
            {error}
          </div>
        )}

        {/* Rating form */}
        <form className="hrg-form" onSubmit={handleSubmit}>
          <div className="hrg-categories">
            {ratings.map(rating => (
              <RatingCategory
                key={rating.categoryId}
                category={{ title: rating.title, question: rating.question }}
                value={rating.value}
                onChange={(value) => handleRatingChange(rating.categoryId, value)}
                disabled={isSubmitting}
              />
            ))}
          </div>

          {/* Optional feedback */}
          <div className="hrg-feedback">
            <label htmlFor="hrg-feedback" className="hrg-feedback__label">
              Additional Comments (Optional)
            </label>
            <textarea
              id="hrg-feedback"
              className="hrg-feedback__input"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Share any additional thoughts about your guest..."
              disabled={isSubmitting}
              rows={4}
            />
          </div>

          {/* Average score display */}
          {isReviewComplete({ ratings }) && (
            <div className="hrg-score-preview">
              <span className="hrg-score-preview__label">Average Score</span>
              <span className="hrg-score-preview__value">{averageScore.toFixed(1)}</span>
            </div>
          )}

          {/* Submit button */}
          <div className="hrg-actions">
            <button
              type="button"
              className="hrg-button-secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="hrg-button-primary"
              disabled={!canSubmit}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HostReviewGuest;
