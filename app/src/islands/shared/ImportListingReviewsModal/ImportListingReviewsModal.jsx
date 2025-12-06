import { useState, useEffect } from 'react';
import '../../../styles/components/import-listing-modal.css';

/**
 * ImportListingReviewsModal Component
 *
 * A modal component for importing reviews from external platforms (Airbnb, VRBO, etc.)
 * Based on ImportListingModal pattern
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls modal visibility
 * @param {Function} props.onClose - Close handler callback
 * @param {Function} props.onSubmit - Submit handler callback with form data
 * @param {string} props.currentUserEmail - Pre-filled email address
 * @param {string} props.listingId - ID of the listing to import reviews for
 * @param {boolean} props.isLoading - Loading state for submit button
 */
const ImportListingReviewsModal = ({
  isOpen = false,
  onClose = () => {},
  onSubmit = () => {},
  currentUserEmail = '',
  listingId = '',
  isLoading = false
}) => {
  // Form state
  const [reviewsUrl, setReviewsUrl] = useState('');
  const [emailAddress, setEmailAddress] = useState(currentUserEmail);
  const [errors, setErrors] = useState({});

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setReviewsUrl('');
      setEmailAddress(currentUserEmail);
      setErrors({});
    }
  }, [isOpen, currentUserEmail]);

  // Close modal on Escape key press
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  /**
   * Validates form inputs
   * @returns {boolean} - True if form is valid, false otherwise
   */
  const validate = () => {
    const newErrors = {};

    // Validate reviews URL - just check it's not empty
    if (!reviewsUrl.trim()) {
      newErrors.reviewsUrl = 'Reviews URL is required';
    }

    // Validate email address
    if (!emailAddress.trim()) {
      newErrors.emailAddress = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)) {
      newErrors.emailAddress = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handles form submission
   * @param {Event} e - Form submit event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    // Call parent submit handler with form data
    await onSubmit({
      reviewsUrl: reviewsUrl.trim(),
      emailAddress: emailAddress.trim(),
      listingId
    });
  };

  /**
   * Handles backdrop click to close modal
   * @param {Event} e - Click event
   */
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Don't render anything if modal is not open
  if (!isOpen) return null;

  return (
    <div
      className="import-listing-modal-overlay"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Modal container */}
      <div
        className="import-listing-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Section */}
        <div className="import-listing-header">
          <div className="import-listing-header-top">
            {/* Star/Review Icon */}
            <span className="import-listing-icon" aria-hidden="true">⭐</span>

            {/* Title */}
            <h2
              id="modal-title"
              className="import-listing-title"
            >
              Import Listing Reviews
            </h2>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="import-listing-close-btn"
            aria-label="Close modal"
            type="button"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" aria-label="Import reviews form">
          {/* Reviews URL Section */}
          <div className="import-listing-section">
            <label
              htmlFor="reviews-url"
              className="import-listing-label"
            >
              Reviews Page URL
            </label>
            <input
              id="reviews-url"
              type="text"
              value={reviewsUrl}
              onChange={(e) => setReviewsUrl(e.target.value)}
              placeholder="Paste your Airbnb or VRBO reviews link here..."
              className={`import-listing-input ${errors.reviewsUrl ? 'input-error' : ''}`}
              aria-invalid={errors.reviewsUrl ? 'true' : 'false'}
              aria-describedby={errors.reviewsUrl ? 'reviews-url-error' : 'reviews-url-help'}
            />
            {errors.reviewsUrl && (
              <span id="reviews-url-error" className="error-message" role="alert">
                {errors.reviewsUrl}
              </span>
            )}
            <p id="reviews-url-help" className="import-listing-helper">
              Supports Airbnb, VRBO, Booking.com, and other platforms.
            </p>
          </div>

          {/* Email Section */}
          <div className="import-listing-section">
            <label
              htmlFor="email-address"
              className="import-listing-label"
            >
              Your email address
            </label>
            <input
              id="email-address"
              type="email"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              placeholder="Email Address..."
              className={`import-listing-input ${errors.emailAddress ? 'input-error' : ''}`}
              aria-invalid={errors.emailAddress ? 'true' : 'false'}
              aria-describedby={errors.emailAddress ? 'email-error' : undefined}
            />
            {errors.emailAddress && (
              <span id="email-error" className="error-message" role="alert">
                {errors.emailAddress}
              </span>
            )}
          </div>

          {/* Info Box */}
          <div className="import-listing-info" role="note" aria-label="Import information">
            <div className="info-icon">ℹ️</div>
            <p className="import-listing-info-text">
              Our team will review your request and import your reviews within 24-48 hours. You'll receive an email confirmation once complete.
            </p>
          </div>

          {/* Submit Button */}
          <div className="import-listing-buttons">
            <button
              type="submit"
              disabled={isLoading}
              className="import-listing-btn import-listing-btn-primary"
              aria-label={isLoading ? 'Submitting request' : 'Submit import request'}
            >
              {isLoading ? 'Submitting...' : 'Import Reviews'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ImportListingReviewsModal;
