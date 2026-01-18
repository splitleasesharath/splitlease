/**
 * useAIToolsState Hook
 *
 * Core state management for AI Tools house manual creation.
 * Replaces Zustand store with React hooks following Split Lease patterns.
 *
 * Features:
 * - Multi-method input state (freeform, wifi, audio, pdf, phone)
 * - Processing states per method
 * - Extracted data aggregation
 * - Error handling per method
 *
 * @module AITools/useAIToolsState
 */

import { useState, useCallback, useMemo } from 'react';

// Input method types
export const INPUT_METHODS = Object.freeze({
  FREEFORM_TEXT: 'freeform_text',
  WIFI_PHOTO: 'wifi_photo',
  PDF_DOC: 'pdf_doc',
  PHONE_CALL: 'phone_call',
  AUDIO_RECORD: 'audio_record',
});

// Default extracted data structure for house manual
const DEFAULT_EXTRACTED_DATA = {
  wifi_name: '',
  wifi_password: '',
  check_in_instructions: '',
  check_out_instructions: '',
  parking_info: '',
  emergency_contacts: [],
  house_rules: [],
  appliance_instructions: '',
  local_recommendations: [],
  additional_notes: '',
};

/**
 * AI Tools State Hook
 *
 * @param {Object} initialData - Initial house manual data
 * @returns {Object} State and handlers for AI tools
 */
export function useAIToolsState(initialData = {}) {
  // Active input method tab
  const [activeMethod, setActiveMethod] = useState(INPUT_METHODS.FREEFORM_TEXT);

  // Processing states per method (immutable updates)
  const [processingStates, setProcessingStates] = useState({
    [INPUT_METHODS.FREEFORM_TEXT]: false,
    [INPUT_METHODS.WIFI_PHOTO]: false,
    [INPUT_METHODS.PDF_DOC]: false,
    [INPUT_METHODS.PHONE_CALL]: false,
    [INPUT_METHODS.AUDIO_RECORD]: false,
  });

  // Extracted data from all methods (merged)
  const [extractedData, setExtractedData] = useState({
    ...DEFAULT_EXTRACTED_DATA,
    ...initialData,
  });

  // Error states per method
  const [errors, setErrors] = useState({
    [INPUT_METHODS.FREEFORM_TEXT]: null,
    [INPUT_METHODS.WIFI_PHOTO]: null,
    [INPUT_METHODS.PDF_DOC]: null,
    [INPUT_METHODS.PHONE_CALL]: null,
    [INPUT_METHODS.AUDIO_RECORD]: null,
  });

  // Success states per method (for UI feedback)
  const [successStates, setSuccessStates] = useState({
    [INPUT_METHODS.FREEFORM_TEXT]: false,
    [INPUT_METHODS.WIFI_PHOTO]: false,
    [INPUT_METHODS.PDF_DOC]: false,
    [INPUT_METHODS.PHONE_CALL]: false,
    [INPUT_METHODS.AUDIO_RECORD]: false,
  });

  // ─────────────────────────────────────────────────────────────
  // State Setters (Pure, Immutable Updates)
  // ─────────────────────────────────────────────────────────────

  /**
   * Set processing state for a specific method
   */
  const setProcessingState = useCallback((method, isProcessing) => {
    setProcessingStates(prev => ({
      ...prev,
      [method]: isProcessing,
    }));

    // Clear error when starting new processing
    if (isProcessing) {
      setErrors(prev => ({
        ...prev,
        [method]: null,
      }));
      setSuccessStates(prev => ({
        ...prev,
        [method]: false,
      }));
    }
  }, []);

  /**
   * Set error for a specific method
   */
  const setError = useCallback((method, errorMessage) => {
    setErrors(prev => ({
      ...prev,
      [method]: errorMessage,
    }));
  }, []);

  /**
   * Mark a method as successful
   */
  const setSuccess = useCallback((method) => {
    setSuccessStates(prev => ({
      ...prev,
      [method]: true,
    }));
  }, []);

  /**
   * Update extracted data from a specific method
   * Merges new data with existing (doesn't overwrite unrelated fields)
   */
  const updateExtractedData = useCallback((method, newData) => {
    setExtractedData(prev => ({
      ...prev,
      ...newData,
    }));
    setSuccess(method);
  }, [setSuccess]);

  /**
   * Clear all extracted data (reset to initial)
   */
  const clearExtractedData = useCallback(() => {
    setExtractedData({
      ...DEFAULT_EXTRACTED_DATA,
      ...initialData,
    });
  }, [initialData]);

  /**
   * Clear error for a specific method
   */
  const clearError = useCallback((method) => {
    setErrors(prev => ({
      ...prev,
      [method]: null,
    }));
  }, []);

  /**
   * Reset all states
   */
  const resetAll = useCallback(() => {
    setActiveMethod(INPUT_METHODS.FREEFORM_TEXT);
    setProcessingStates({
      [INPUT_METHODS.FREEFORM_TEXT]: false,
      [INPUT_METHODS.WIFI_PHOTO]: false,
      [INPUT_METHODS.PDF_DOC]: false,
      [INPUT_METHODS.PHONE_CALL]: false,
      [INPUT_METHODS.AUDIO_RECORD]: false,
    });
    setExtractedData({
      ...DEFAULT_EXTRACTED_DATA,
      ...initialData,
    });
    setErrors({
      [INPUT_METHODS.FREEFORM_TEXT]: null,
      [INPUT_METHODS.WIFI_PHOTO]: null,
      [INPUT_METHODS.PDF_DOC]: null,
      [INPUT_METHODS.PHONE_CALL]: null,
      [INPUT_METHODS.AUDIO_RECORD]: null,
    });
    setSuccessStates({
      [INPUT_METHODS.FREEFORM_TEXT]: false,
      [INPUT_METHODS.WIFI_PHOTO]: false,
      [INPUT_METHODS.PDF_DOC]: false,
      [INPUT_METHODS.PHONE_CALL]: false,
      [INPUT_METHODS.AUDIO_RECORD]: false,
    });
  }, [initialData]);

  // ─────────────────────────────────────────────────────────────
  // Computed Values
  // ─────────────────────────────────────────────────────────────

  /**
   * Check if any method is currently processing
   */
  const isAnyProcessing = useMemo(() =>
    Object.values(processingStates).some(Boolean),
    [processingStates]
  );

  /**
   * Check if any method has an error
   */
  const hasAnyError = useMemo(() =>
    Object.values(errors).some(Boolean),
    [errors]
  );

  /**
   * Get processing state for active method
   */
  const isActiveMethodProcessing = useMemo(() =>
    processingStates[activeMethod],
    [processingStates, activeMethod]
  );

  /**
   * Get error for active method
   */
  const activeMethodError = useMemo(() =>
    errors[activeMethod],
    [errors, activeMethod]
  );

  /**
   * Check if house manual has any extracted content
   */
  const hasExtractedContent = useMemo(() => {
    return Object.entries(extractedData).some(([key, value]) => {
      if (key === 'emergency_contacts' || key === 'house_rules' || key === 'local_recommendations') {
        return Array.isArray(value) && value.length > 0;
      }
      return Boolean(value);
    });
  }, [extractedData]);

  return {
    // State
    activeMethod,
    processingStates,
    extractedData,
    errors,
    successStates,

    // Setters
    setActiveMethod,
    setProcessingState,
    setError,
    setSuccess,
    updateExtractedData,
    clearExtractedData,
    clearError,
    resetAll,

    // Computed
    isAnyProcessing,
    hasAnyError,
    isActiveMethodProcessing,
    activeMethodError,
    hasExtractedContent,

    // Constants
    INPUT_METHODS,
  };
}

export default useAIToolsState;
