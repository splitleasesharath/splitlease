import { useState, useEffect } from 'react';
import '../../../styles/components/import-listing-modal.css';

/**
 * ImportListingModal Component
 *
 * A modal component for importing listings from external platforms (Airbnb, VRBO, etc.)
 * Converted from Bubble.io reusable element to React
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls modal visibility
 * @param {Function} props.onClose - Close handler callback
 * @param {Function} props.onSubmit - Submit handler callback with form data
 * @param {string} props.currentUserEmail - Pre-filled email address
 * @param {boolean} props.isLoading - Loading state for submit button
 */
const ImportListingModal = ({
  isOpen = false,
  onClose = () => {},
  onSubmit = () => {},
  currentUserEmail = '',
  isLoading = false
}) => {
  // Form state
  const [listingUrl, setListingUrl] = useState('');
  const [emailAddress, setEmailAddress] = useState(currentUserEmail);
  const [errors, setErrors] = useState({});

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setListingUrl('');
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

    // Validate listing URL - just check it's not empty
    // We accept any text since it will be sent to Slack for processing
    if (!listingUrl.trim()) {
      newErrors.listingUrl = 'Listing URL is required';
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
      listingUrl: listingUrl.trim(),
      emailAddress: emailAddress.trim()
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
            {/* Download Icon */}
            <span className="import-listing-icon" aria-hidden="true">📥</span>

            {/* Title */}
            <h2
              id="modal-title"
              className="import-listing-title"
            >
              Import Your Listing
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
        <form onSubmit={handleSubmit} className="space-y-4" aria-label="Import listing form">
          {/* Listing URL Section */}
          <div className="import-listing-section">
            <label
              htmlFor="listing-url"
              className="import-listing-label"
            >
              Listing URL
            </label>
            <input
              id="listing-url"
              type="text"
              value={listingUrl}
              onChange={(e) => setListingUrl(e.target.value)}
              placeholder="Enter or Paste URL here..."
              className={`import-listing-input ${errors.listingUrl ? 'input-error' : ''}`}
              aria-invalid={errors.listingUrl ? 'true' : 'false'}
              aria-describedby={errors.listingUrl ? 'listing-url-error' : 'listing-url-help'}
            />
            {errors.listingUrl && (
              <span id="listing-url-error" className="error-message" role="alert">
                {errors.listingUrl}
              </span>
            )}
            <p id="listing-url-help" className="import-listing-helper">
              Supports all platforms: Airbnb, VRBO and more.
            </p>
          </div>

          {/* Email Section */}
          <div className="import-listing-section">
            <label
              htmlFor="email-address"
              className="import-listing-label"
            >
              Enter your email address
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
              We'll import photos, description, and amenities. You can edit everything after import.
            </p>
          </div>

          {/* Submit Button */}
          <div className="import-listing-buttons">
            <button
              type="submit"
              disabled={isLoading}
              className="import-listing-btn import-listing-btn-primary"
              aria-label={isLoading ? 'Importing listing' : 'Import listing'}
            >
              {isLoading ? 'Importing...' : 'Import Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ImportListingModal;
