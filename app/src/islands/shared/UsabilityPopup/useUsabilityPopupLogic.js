/**
 * Usability Popup Logic Hook
 * Split Lease - Frontend
 *
 * Manages the state and business logic for the UsabilityPopup component.
 * Determines when to show the popup and handles the SMS send flow.
 *
 * The popup shows when:
 * 1. User is a usability tester (isUsabilityTester flag)
 * 2. User is on desktop (viewport > 768px)
 * 3. User has not dismissed the popup this session
 *
 * Usage:
 *   import { useUsabilityPopupLogic } from './useUsabilityPopupLogic.js';
 *
 *   const {
 *     shouldShowPopup,
 *     dismissPopup,
 *     phoneNumber,
 *     setPhoneNumber,
 *     isLoading,
 *     error,
 *     handleSendLink
 *   } = useUsabilityPopupLogic({ userData });
 */

import { useState, useCallback, useEffect } from 'react';
import { useIsDesktop } from '../../../hooks/useDeviceDetection.js';
import { sendMagicLinkViaSms } from './usabilityPopupService.js';
import { toE164Format, isValidUsPhoneNumber } from '../../../lib/phoneUtils.js';
import { logger } from '../../../lib/logger.js';

// Session storage key for dismissal tracking
const DISMISSAL_KEY = 'usability_popup_dismissed';

/**
 * Hook for managing UsabilityPopup state and logic
 *
 * @param {Object} params - Hook parameters
 * @param {Object} params.userData - User data from validateTokenAndFetchUser
 * @param {Function} [params.onSuccess] - Callback when SMS sent successfully
 * @param {Function} [params.onError] - Callback when SMS fails
 * @returns {Object} Popup state and handlers
 */
export function useUsabilityPopupLogic({ userData, onSuccess, onError }) {
  const isDesktop = useIsDesktop();

  // Phone number state - pre-fill from user profile if available
  const [phoneNumber, setPhoneNumber] = useState(userData?.phoneNumber || '');

  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Dismissal tracking
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(DISMISSAL_KEY) === 'true';
  });

  // Update phone number if userData changes (e.g., after login)
  useEffect(() => {
    if (userData?.phoneNumber && !phoneNumber) {
      setPhoneNumber(userData.phoneNumber);
    }
  }, [userData?.phoneNumber]);

  /**
   * Determine if popup should be shown
   * Shows when: user is tester + on desktop + not dismissed
   */
  const shouldShowPopup =
    userData?.isUsabilityTester === true &&
    isDesktop &&
    !isDismissed &&
    !successMessage; // Hide after successful send

  /**
   * Dismiss the popup for this session
   */
  const dismissPopup = useCallback(() => {
    setIsDismissed(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(DISMISSAL_KEY, 'true');
    }
    logger.debug('[UsabilityPopup] Popup dismissed');
  }, []);

  /**
   * Clear any existing error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Handle phone number input change
   * Clears error when user starts typing
   */
  const handlePhoneChange = useCallback((value) => {
    setPhoneNumber(value);
    if (error) {
      setError(null);
    }
  }, [error]);

  /**
   * Validate phone number before sending
   */
  const validatePhone = useCallback(() => {
    if (!phoneNumber || phoneNumber.trim() === '') {
      setError('Please enter your phone number');
      return false;
    }

    if (!isValidUsPhoneNumber(phoneNumber)) {
      setError('Please enter a valid US phone number');
      return false;
    }

    return true;
  }, [phoneNumber]);

  /**
   * Handle the send magic link action
   */
  const handleSendLink = useCallback(async () => {
    // Validate inputs
    if (!validatePhone()) {
      return;
    }

    if (!userData?.email) {
      setError('Unable to send link. Please try logging in again.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Convert phone to E.164 format
      const e164Phone = toE164Format(phoneNumber);
      if (!e164Phone) {
        throw new Error('Invalid phone number format');
      }

      logger.debug('[UsabilityPopup] Sending magic link...');

      const result = await sendMagicLinkViaSms({
        email: userData.email,
        phoneNumber: e164Phone,
        redirectTo: window.location.href // Keep user on same page
      });

      logger.debug('[UsabilityPopup] Magic link sent successfully');

      // Show success message
      setSuccessMessage('Check your phone! Login link sent.');

      // Call success callback if provided
      if (onSuccess) {
        onSuccess(result);
      }

      // Auto-dismiss after showing success briefly
      setTimeout(() => {
        dismissPopup();
      }, 3000);

    } catch (err) {
      logger.error('[UsabilityPopup] Failed to send link:', err);

      const errorMessage = err.message || 'Failed to send link. Please try again.';
      setError(errorMessage);

      // Call error callback if provided
      if (onError) {
        onError(err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [phoneNumber, userData, validatePhone, dismissPopup, onSuccess, onError]);

  return {
    // Visibility
    shouldShowPopup,

    // Phone input state
    phoneNumber,
    setPhoneNumber: handlePhoneChange,

    // Status states
    isLoading,
    error,
    successMessage,

    // Actions
    dismissPopup,
    clearError,
    handleSendLink
  };
}
