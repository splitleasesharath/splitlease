/**
 * AI Tools Module Index
 *
 * Central export point for all AI Tools components and utilities.
 *
 * @module AITools
 */

// Provider and context hook
export { AIToolsProvider, useAITools, INPUT_METHODS } from './AIToolsProvider';

// State hook (for advanced usage)
export { useAIToolsState } from './useAIToolsState';

// Input method components
export { default as FreeformTextInput } from './FreeformTextInput';
export { default as WifiPhotoExtractor } from './WifiPhotoExtractor';
export { default as AudioRecorder } from './AudioRecorder';
export { default as PdfDocUploader } from './PdfDocUploader';
export { default as PhoneCallInterface } from './PhoneCallInterface';

// Utility components
export { default as InputMethodSelector } from './InputMethodSelector';
export { default as HouseManualEditor } from './HouseManualEditor';
