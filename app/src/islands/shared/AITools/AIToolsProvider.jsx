/**
 * AIToolsProvider - Context Provider for AI Tools State
 *
 * Provides AI tools state to all child components via React Context.
 * Follows Split Lease's component patterns.
 *
 * Usage:
 * ```jsx
 * <AIToolsProvider initialData={existingManualData}>
 *   <FreeformTextInput />
 *   <WifiPhotoExtractor />
 *   ...
 * </AIToolsProvider>
 * ```
 *
 * @module AITools/AIToolsProvider
 */

import React, { createContext, useContext } from 'react';
import { useAIToolsState, INPUT_METHODS } from './useAIToolsState';

// Create context with null default
const AIToolsContext = createContext(null);

/**
 * AIToolsProvider Component
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @param {Object} props.initialData - Initial house manual data
 */
export function AIToolsProvider({ children, initialData = {} }) {
  const state = useAIToolsState(initialData);

  return (
    <AIToolsContext.Provider value={state}>
      {children}
    </AIToolsContext.Provider>
  );
}

/**
 * useAITools Hook
 *
 * Access AI tools state from within the provider.
 * Throws error if used outside of provider.
 *
 * @returns {Object} AI tools state and handlers
 */
export function useAITools() {
  const context = useContext(AIToolsContext);

  if (!context) {
    throw new Error(
      'useAITools must be used within an AIToolsProvider. ' +
      'Wrap your component tree with <AIToolsProvider>.'
    );
  }

  return context;
}

// Re-export INPUT_METHODS for convenience
export { INPUT_METHODS };

export default AIToolsProvider;
