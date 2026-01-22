/**
 * useRoomRedesign Hook
 *
 * Manages the room redesign workflow state and API calls.
 * This hook integrates with the ai-room-redesign Edge Function
 * instead of calling Gemini API directly (security best practice).
 */

import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

/**
 * @typedef {Object} RoomStyle
 * @property {string} id - Style identifier
 * @property {string} name - Display name
 * @property {string} description - Style description
 * @property {string} imageUrl - Preview image URL
 * @property {string} prompt - AI prompt for this style
 */

/**
 * @typedef {Object} AIRoomRedesignState
 * @property {boolean} isLoading - Whether API call is in progress
 * @property {string|null} base64OriginalImage - Base64 of uploaded image
 * @property {string|null} resultImage - Data URL of generated image
 * @property {RoomStyle|null} selectedRoomStyle - Selected design style
 * @property {string|null} selectedPhotoType - Selected room type
 * @property {File|null} uploadedFile - The uploaded file
 * @property {string|null} error - Error message if any
 */

/**
 * @typedef {Object} UseRoomRedesignOptions
 * @property {(imageUrl: string) => void} [onSuccess] - Success callback
 * @property {(error: string) => void} [onError] - Error callback
 */

const initialState = {
  isLoading: false,
  base64OriginalImage: null,
  resultImage: null,
  selectedRoomStyle: null,
  selectedPhotoType: null,
  uploadedFile: null,
  error: null,
};

/**
 * Call the ai-room-redesign Edge Function
 * @param {string} base64Image - Base64 encoded image
 * @param {RoomStyle} style - Selected room style
 * @param {string|null} photoType - Room type (optional)
 * @returns {Promise<{success: boolean, imageUrl?: string, error?: string}>}
 */
const callRedesignAPI = async (base64Image, style, photoType) => {
  try {
    const { data, error } = await supabase.functions.invoke('ai-room-redesign', {
      body: {
        action: 'generate',
        payload: {
          base64Image,
          styleId: style.id,
          stylePrompt: style.prompt,
          photoType: photoType || null,
        },
      },
    });

    if (error) {
      console.error('[useRoomRedesign] Edge Function error:', error);
      return {
        success: false,
        error: error.message || 'Failed to connect to redesign service.',
      };
    }

    if (!data?.success) {
      return {
        success: false,
        error: data?.error || 'Failed to generate redesign.',
      };
    }

    return {
      success: true,
      imageUrl: data.imageUrl,
    };
  } catch (err) {
    console.error('[useRoomRedesign] API call failed:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred.',
    };
  }
};

/**
 * Hook for managing room redesign workflow
 * @param {UseRoomRedesignOptions} options - Configuration options
 * @returns {Object} State and handlers for room redesign
 */
export const useRoomRedesign = (options = {}) => {
  const { onSuccess, onError } = options;

  const [state, setState] = useState(initialState);

  const setSelectedStyle = useCallback((style) => {
    setState((prev) => ({ ...prev, selectedRoomStyle: style, error: null }));
  }, []);

  const setSelectedPhotoType = useCallback((photoType) => {
    setState((prev) => ({ ...prev, selectedPhotoType: photoType }));
  }, []);

  const setBase64Image = useCallback((base64) => {
    setState((prev) => ({ ...prev, base64OriginalImage: base64, error: null }));
  }, []);

  const setUploadedFile = useCallback((file) => {
    setState((prev) => ({ ...prev, uploadedFile: file }));
  }, []);

  const generateRedesign = useCallback(async () => {
    if (!state.base64OriginalImage) {
      const error = 'Please upload an image first.';
      setState((prev) => ({ ...prev, error }));
      onError?.(error);
      return;
    }

    if (!state.selectedRoomStyle) {
      const error = 'Please select a room style.';
      setState((prev) => ({ ...prev, error }));
      onError?.(error);
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null, resultImage: null }));

    const result = await callRedesignAPI(
      state.base64OriginalImage,
      state.selectedRoomStyle,
      state.selectedPhotoType
    );

    if (result.success && result.imageUrl) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        resultImage: result.imageUrl,
        error: null,
      }));
      onSuccess?.(result.imageUrl);
    } else {
      const error = result.error || 'Failed to generate redesign.';
      setState((prev) => ({ ...prev, isLoading: false, error }));
      onError?.(error);
    }
  }, [state.base64OriginalImage, state.selectedRoomStyle, state.selectedPhotoType, onSuccess, onError]);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const canGenerate =
    !!state.base64OriginalImage &&
    !!state.selectedRoomStyle &&
    !state.isLoading;

  return {
    ...state,
    setSelectedStyle,
    setSelectedPhotoType,
    setBase64Image,
    setUploadedFile,
    generateRedesign,
    reset,
    canGenerate,
  };
};
