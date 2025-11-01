/**
 * @fileoverview useAuthMode hook
 * Manages authentication mode toggling between signup and login
 */

import { useState, useCallback, useEffect } from 'react';
import type { AuthMode } from '../SignupLogin.types';

/**
 * Hook for managing authentication mode state
 * @param initialMode - Initial mode (defaults to 'signup')
 * @param onModeChange - Optional callback when mode changes
 * @returns Mode state and functions to modify it
 */
export function useAuthMode(
  initialMode: AuthMode = 'signup',
  onModeChange?: (mode: AuthMode) => void
) {
  const [mode, setModeState] = useState<AuthMode>(initialMode);

  // Synchronize internal state with prop changes
  useEffect(() => {
    setModeState(initialMode);
  }, [initialMode]);

  /**
   * Toggle between signup and login modes
   */
  const toggleMode = useCallback(() => {
    setModeState((prevMode) => {
      const newMode = prevMode === 'signup' ? 'login' : 'signup';
      onModeChange?.(newMode);
      return newMode;
    });
  }, [onModeChange]);

  /**
   * Set mode directly
   * @param newMode - The mode to set
   */
  const setMode = useCallback(
    (newMode: AuthMode) => {
      setModeState(newMode);
      onModeChange?.(newMode);
    },
    [onModeChange]
  );

  return {
    mode,
    toggleMode,
    setMode,
  };
}
