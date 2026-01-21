/**
 * Usability Popup Component
 * Split Lease - Shared Island Component
 *
 * Prompts desktop usability testers to continue testing on mobile
 * by sending them an SMS with a magic login link.
 *
 * Features:
 * - Only shows to users with isUsabilityTester flag
 * - Only shows on desktop (viewport > 768px)
 * - Phone input with formatting and validation
 * - Integrates with existing ToastProvider for notifications
 * - Session-based dismissal (won't show again until new session)
 *
 * Usage:
 *   import UsabilityPopup from '../shared/UsabilityPopup/UsabilityPopup.jsx';
 *
 *   // In your page component:
 *   <UsabilityPopup userData={userData} />
 */

import { useCallback } from 'react';
import { useUsabilityPopupLogic } from './useUsabilityPopupLogic.js';
import { formatPhoneAsYouType } from '../../../lib/phoneUtils.js';
import { useToast } from '../Toast.jsx';
import './UsabilityPopup.css';

/**
 * Phone icon SVG component
 */
const PhoneIcon = () => (
  <svg
    className="usability-popup-phone-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

/**
 * Mobile device icon SVG component
 */
const MobileIcon = () => (
  <svg
    className="usability-popup-mobile-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12.01" y2="18" />
  </svg>
);

/**
 * Close button icon
 */
const CloseIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/**
 * Success checkmark icon
 */
const CheckIcon = () => (
  <svg
    className="usability-popup-check-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

/**
 * Loading spinner component
 */
const LoadingSpinner = () => (
  <div className="usability-popup-spinner">
    <div className="usability-popup-spinner-circle" />
  </div>
);

/**
 * UsabilityPopup Component
 *
 * @param {Object} props - Component props
 * @param {Object} props.userData - User data from validateTokenAndFetchUser
 * @param {Function} [props.onSuccess] - Optional callback when SMS sent
 * @param {Function} [props.onError] - Optional callback on error
 */
export default function UsabilityPopup({ userData, onSuccess, onError }) {
  const { showToast } = useToast();

  // Handle success with toast notification
  const handleSuccess = useCallback((result) => {
    showToast({
      title: 'Link Sent!',
      content: 'Check your phone for the login link.',
      type: 'success'
    });
    if (onSuccess) onSuccess(result);
  }, [showToast, onSuccess]);

  // Handle error with toast notification
  const handleError = useCallback((error) => {
    showToast({
      title: 'Failed to send',
      content: error.message || 'Please try again.',
      type: 'error'
    });
    if (onError) onError(error);
  }, [showToast, onError]);

  const {
    shouldShowPopup,
    phoneNumber,
    setPhoneNumber,
    isLoading,
    error,
    successMessage,
    dismissPopup,
    handleSendLink
  } = useUsabilityPopupLogic({
    userData,
    onSuccess: handleSuccess,
    onError: handleError
  });

  // Handle phone input with formatting
  const handlePhoneInput = useCallback((e) => {
    const formatted = formatPhoneAsYouType(e.target.value);
    setPhoneNumber(formatted);
  }, [setPhoneNumber]);

  // Handle form submission
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    handleSendLink();
  }, [handleSendLink]);

  // Handle key press (Enter to submit)
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSendLink();
    }
  }, [handleSendLink, isLoading]);

  // Don't render if popup shouldn't show
  if (!shouldShowPopup) {
    return null;
  }

  return (
    <div className="usability-popup-overlay" role="dialog" aria-modal="true" aria-labelledby="usability-popup-title">
      <div className="usability-popup">
        {/* Close button */}
        <button
          className="usability-popup-close"
          onClick={dismissPopup}
          aria-label="Close popup"
          type="button"
        >
          <CloseIcon />
        </button>

        {/* Header with mobile icon */}
        <div className="usability-popup-header">
          <MobileIcon />
          <h2 id="usability-popup-title" className="usability-popup-title">
            Continue on Mobile
          </h2>
        </div>

        {/* Description */}
        <p className="usability-popup-description">
          For the best testing experience, continue this session on your phone.
          We'll text you a login link.
        </p>

        {/* Success state */}
        {successMessage ? (
          <div className="usability-popup-success">
            <CheckIcon />
            <span>{successMessage}</span>
          </div>
        ) : (
          /* Phone input form */
          <form className="usability-popup-form" onSubmit={handleSubmit}>
            <div className="usability-popup-input-wrapper">
              <PhoneIcon />
              <input
                type="tel"
                className={`usability-popup-input ${error ? 'usability-popup-input-error' : ''}`}
                placeholder="(555) 123-4567"
                value={phoneNumber}
                onChange={handlePhoneInput}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                aria-label="Phone number"
                aria-invalid={!!error}
                aria-describedby={error ? 'usability-popup-error' : undefined}
                autoComplete="tel"
              />
            </div>

            {/* Error message */}
            {error && (
              <p id="usability-popup-error" className="usability-popup-error" role="alert">
                {error}
              </p>
            )}

            {/* Submit button */}
            <button
              type="submit"
              className="usability-popup-submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner />
                  <span>Sending...</span>
                </>
              ) : (
                <span>Send Login Link</span>
              )}
            </button>
          </form>
        )}

        {/* Footer note */}
        <p className="usability-popup-footer">
          Standard messaging rates may apply. Link expires in 15 minutes.
        </p>
      </div>
    </div>
  );
}
