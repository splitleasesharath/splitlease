import { useState, useEffect } from 'react';
import '../../../styles/components/import-listing-modal.css';

/**
 * Feather Icons as inline SVG components
 * Following POPUP_REPLICATION_PROTOCOL.md: Monochromatic, stroke-width: 2, no fill
 */
const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const AlertCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

/**
 * ImportListingModal Component
 *
 * A modal for importing listings from external platforms (Airbnb, VRBO, etc.)
 * Updated to follow POPUP_REPLICATION_PROTOCOL.md design system.
 *
 * Features:
 * - Monochromatic purple color scheme (no green/yellow)
 * - Mobile bottom sheet behavior (< 480px)
 * - Feather icons (stroke-only)
 * - Pill-shaped buttons (100px radius)
 * - Fixed header/footer with scrollable body
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
    }
    // Only restore on cleanup, not when isOpen changes to false
    // Use '' instead of 'unset' for proper mobile behavior
    return () => {
      if (isOpen) {
        document.body.style.overflow = '';
      }
    };
  }, [isOpen]);

  /**
   * Validates form inputs
   * @returns {boolean} - True if form is valid, false otherwise
   */
  const validate = () => {
    const newErrors = {};

    // Validate listing URL - just check it's not empty
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
      aria-labelledby="import-modal-title"
    >
      {/* Modal container */}
      <div
        className="import-listing-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile grab handle - visible only on mobile */}
        <div className="import-listing-grab-handle" aria-hidden="true" />

        {/* Header Section */}
        <header className="import-listing-header">
          <div className="import-listing-header-content">
            {/* Download Icon (Feather) */}
            <span className="import-listing-icon" aria-hidden="true">
              <DownloadIcon />
            </span>

            {/* Title */}
            <h2 id="import-modal-title" className="import-listing-title">
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
            <XIcon />
          </button>
        </header>

        {/* Scrollable Body */}
        <div className="import-listing-body">
          <form onSubmit={handleSubmit} aria-label="Import listing form">
            {/* Listing URL Section */}
            <div className="import-listing-section">
              <label htmlFor="listing-url" className="import-listing-label">
                Listing URL
              </label>
              <input
                id="listing-url"
                type="text"
                value={listingUrl}
                onChange={(e) => setListingUrl(e.target.value)}
                placeholder="Enter or paste URL here..."
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
                Supports all platforms: Airbnb, VRBO, and more.
              </p>
            </div>

            {/* Email Section */}
            <div className="import-listing-section">
              <label htmlFor="email-address" className="import-listing-label">
                Email Address
              </label>
              <input
                id="email-address"
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="your@email.com"
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

            {/* Info Banner */}
            <div className="import-listing-info" role="note" aria-label="Import information">
              <div className="info-icon">
                <AlertCircleIcon />
              </div>
              <p className="import-listing-info-text">
                We'll import photos, description, and amenities. You can edit everything after import.
              </p>
            </div>
          </form>
        </div>

        {/* Footer with Submit Button */}
        <footer className="import-listing-footer">
          <button
            type="submit"
            disabled={isLoading}
            className="import-listing-btn import-listing-btn-primary"
            aria-label={isLoading ? 'Importing listing' : 'Import listing'}
            onClick={handleSubmit}
          >
            {isLoading ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Importing...
              </>
            ) : (
              'Import Listing'
            )}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ImportListingModal;
