import { useState, useCallback, useMemo } from 'react';
import type { ReferralMethod, UseFooterReferralReturn } from '../Footer.types';
import { validateReferralContact } from '../Footer.schema';

const SUBMIT_SUCCESS_MESSAGE = 'Referral sent successfully!';
const SUBMIT_TIMEOUT_MS = 2000;

/**
 * Custom hook for managing referral form state and logic
 * Handles validation, submission, and error states for the referral section
 *
 * @param onSubmit - Optional callback function to handle referral submission
 * @returns {UseFooterReferralReturn} Object containing state and handlers
 *
 * @example
 * ```tsx
 * const referral = useFooterReferral(async (method, contact) => {
 *   await api.sendReferral(method, contact);
 * });
 *
 * return (
 *   <div>
 *     <input
 *       value={referral.contact}
 *       onChange={(e) => referral.setContact(e.target.value)}
 *       placeholder={referral.placeholder}
 *     />
 *     <button onClick={referral.handleSubmit}>
 *       {referral.isSubmitting ? 'Sending...' : 'Share now'}
 *     </button>
 *   </div>
 * );
 * ```
 */
export function useFooterReferral(
  onSubmit?: (method: ReferralMethod, contact: string) => void | Promise<void>
): UseFooterReferralReturn {
  const [method, setMethod] = useState<ReferralMethod>('text');
  const [contact, setContact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  /**
   * Computes placeholder text based on selected referral method
   * Memoized to prevent unnecessary recalculations
   */
  const placeholder = useMemo(() => {
    return method === 'text'
      ? "Your friend's phone number"
      : "Your friend's email";
  }, [method]);

  /**
   * Clears error message
   * Stabilized with useCallback for performance
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Handles referral form submission with validation
   * Validates input based on method (phone or email)
   * Calls optional onSubmit callback and shows success feedback
   */
  const handleSubmit = useCallback(async () => {
    // Clear previous messages
    setError(null);
    setSuccessMessage(null);

    // Validate contact is not empty
    if (!contact.trim()) {
      setError('Please enter contact information');
      return;
    }

    // Validate format based on method
    const validation = validateReferralContact(method, contact);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid contact information');
      return;
    }

    // Submit if callback provided
    if (onSubmit) {
      setIsSubmitting(true);
      try {
        await onSubmit(method, contact);
        setSuccessMessage(SUBMIT_SUCCESS_MESSAGE);
        setContact(''); // Clear input on success

        // Clear success message after timeout
        setTimeout(() => {
          setSuccessMessage(null);
        }, SUBMIT_TIMEOUT_MS);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to send referral'
        );
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [method, contact, onSubmit]);

  return {
    method,
    contact,
    isSubmitting,
    error,
    successMessage,
    placeholder,
    setMethod,
    setContact,
    handleSubmit,
    clearError,
  };
}
