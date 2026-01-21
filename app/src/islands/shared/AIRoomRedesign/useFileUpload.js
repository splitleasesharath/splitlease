/**
 * useFileUpload Hook
 *
 * Manages file upload state including validation, preview generation,
 * and base64 conversion for the AI Room Redesign component.
 */

import { useState, useCallback } from 'react';
import {
  fileToBase64,
  fileToDataUrl,
  validateFileSize,
  validateFileType,
} from './fileUtils';

/**
 * @typedef {Object} FileUploadState
 * @property {File|null} file - The uploaded file
 * @property {string|null} preview - Data URL for preview display
 * @property {string|null} base64 - Base64 string for API submission
 * @property {string|null} error - Error message if any
 */

/**
 * @typedef {Object} UseFileUploadOptions
 * @property {number} [maxSizeMB=10] - Maximum file size in MB
 * @property {string[]} [acceptedTypes] - Accepted MIME types and extensions
 * @property {(error: string) => void} [onError] - Error callback
 */

/**
 * @typedef {Object} UseFileUploadReturn
 * @property {File|null} file - The uploaded file
 * @property {string|null} preview - Data URL for preview display
 * @property {string|null} base64 - Base64 string for API submission
 * @property {string|null} error - Error message if any
 * @property {boolean} isValidating - Whether file is being validated
 * @property {(file: File) => Promise<void>} handleFileSelect - Handle file selection
 * @property {(files: File[]) => Promise<void>} handleFileDrop - Handle file drop
 * @property {() => void} clearFile - Clear the current file
 */

/**
 * Hook for managing file upload with validation and conversion
 * @param {UseFileUploadOptions} options - Configuration options
 * @returns {UseFileUploadReturn} File upload state and handlers
 */
export const useFileUpload = (options = {}) => {
  const {
    maxSizeMB = 10,
    acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', '.jpg', '.jpeg', '.png', '.webp'],
    onError,
  } = options;

  const [state, setState] = useState({
    file: null,
    preview: null,
    base64: null,
    error: null,
  });

  const [isValidating, setIsValidating] = useState(false);

  const handleError = useCallback(
    (error) => {
      setState((prev) => ({ ...prev, error }));
      onError?.(error);
    },
    [onError]
  );

  const handleFileSelect = useCallback(
    async (file) => {
      setIsValidating(true);
      setState((prev) => ({ ...prev, error: null }));

      try {
        // Validate file type
        if (!validateFileType(file, acceptedTypes)) {
          handleError(
            `Invalid file type. Accepted types: ${acceptedTypes
              .filter((t) => t.startsWith('.'))
              .join(', ')}`
          );
          setIsValidating(false);
          return;
        }

        // Validate file size
        if (!validateFileSize(file, maxSizeMB)) {
          handleError(`File size exceeds ${maxSizeMB}MB limit.`);
          setIsValidating(false);
          return;
        }

        // Convert to base64 and data URL for preview
        const [base64, preview] = await Promise.all([
          fileToBase64(file),
          fileToDataUrl(file),
        ]);

        setState({
          file,
          preview,
          base64,
          error: null,
        });
      } catch (err) {
        handleError(
          err instanceof Error ? err.message : 'Failed to process file'
        );
      } finally {
        setIsValidating(false);
      }
    },
    [acceptedTypes, maxSizeMB, handleError]
  );

  const handleFileDrop = useCallback(
    async (files) => {
      if (files.length === 0) {
        handleError('No files were dropped.');
        return;
      }

      if (files.length > 1) {
        handleError('Please upload only one image at a time.');
        return;
      }

      await handleFileSelect(files[0]);
    },
    [handleFileSelect, handleError]
  );

  const clearFile = useCallback(() => {
    setState({
      file: null,
      preview: null,
      base64: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    handleFileSelect,
    handleFileDrop,
    clearFile,
    isValidating,
  };
};
