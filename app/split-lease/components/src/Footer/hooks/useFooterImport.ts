import { useState, useCallback } from 'react';
import type { UseFooterImportReturn } from '../Footer.types';
import { validateImportForm } from '../Footer.schema';

const SUBMIT_SUCCESS_MESSAGE = 'Import request submitted successfully!';
const SUBMIT_TIMEOUT_MS = 2000;

/**
 * Custom hook for managing import listing form state and logic
 * Handles validation, submission, and error states for the import section
 *
 * @param onSubmit - Optional callback function to handle import submission
 * @returns {UseFooterImportReturn} Object containing state and handlers
 *
 * @example
 * ```tsx
 * const importForm = useFooterImport(async (url, email) => {
 *   await api.importListing(url, email);
 * });
 *
 * return (
 *   <div>
 *     <input
 *       value={importForm.url}
 *       onChange={(e) => importForm.setUrl(e.target.value)}
 *       aria-invalid={!!importForm.errors.url}
 *     />
 *     {importForm.errors.url && <span>{importForm.errors.url}</span>}
 *     <button onClick={importForm.handleSubmit}>
 *       {importForm.isSubmitting ? 'Importing...' : 'Submit'}
 *     </button>
 *   </div>
 * );
 * ```
 */
export function useFooterImport(
  onSubmit?: (url: string, email: string) => void | Promise<void>
): UseFooterImportReturn {
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ url?: string; email?: string }>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  /**
   * Clears all error messages
   * Stabilized with useCallback for performance
   */
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  /**
   * Handles import form submission with validation
   * Validates both URL and email fields
   * Calls optional onSubmit callback and shows success feedback
   */
  const handleSubmit = useCallback(async () => {
    // Clear previous messages
    setErrors({});
    setSuccessMessage(null);

    // Validate both fields are not empty
    if (!url.trim() && !email.trim()) {
      setErrors({
        url: 'URL is required',
        email: 'Email is required',
      });
      return;
    }

    if (!url.trim()) {
      setErrors({ url: 'URL is required' });
      return;
    }

    if (!email.trim()) {
      setErrors({ email: 'Email is required' });
      return;
    }

    // Validate formats
    const validation = validateImportForm(url, email);
    if (!validation.isValid) {
      setErrors(validation.errors || {});
      return;
    }

    // Submit if callback provided
    if (onSubmit) {
      setIsSubmitting(true);
      try {
        await onSubmit(url, email);
        setSuccessMessage(SUBMIT_SUCCESS_MESSAGE);
        setUrl(''); // Clear inputs on success
        setEmail('');

        // Clear success message after timeout
        setTimeout(() => {
          setSuccessMessage(null);
        }, SUBMIT_TIMEOUT_MS);
      } catch (err) {
        setErrors({
          url: err instanceof Error ? err.message : 'Failed to submit import',
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [url, email, onSubmit]);

  return {
    url,
    email,
    isSubmitting,
    errors,
    successMessage,
    setUrl,
    setEmail,
    handleSubmit,
    clearErrors,
  };
}
