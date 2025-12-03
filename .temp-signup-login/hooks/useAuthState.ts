/**
 * Custom hook for managing authentication modal state
 * Replaces Bubble's custom states with React state management
 */

import { useState, useCallback } from 'react';
import { AuthState } from '../types';

interface UseAuthStateProps {
  defaultEmail?: string;
  fromPageType?: string;
  houseManual?: any;
  referral?: any;
  disableClose?: boolean;
  fromTrialHost?: boolean;
  isNYU?: boolean;
}

export const useAuthState = (initialProps: UseAuthStateProps = {}) => {
  const [state, setState] = useState<AuthState>({
    showingToggle: 'welcome',
    claimListing: false,
    currentInputFilling: null,
    defaultEmail: initialProps.defaultEmail || '',
    disableClose: initialProps.disableClose || false,
    fromTrialHost: initialProps.fromTrialHost || false,
    fromPageType: initialProps.fromPageType || '',
    houseManual: initialProps.houseManual || null,
    lockLogin: false,
    isNYU: initialProps.isNYU || false,
    referral: initialProps.referral || null,
    shouldTheUser: false,
    signupErrorText: '',
    toggleListingPicture: '',
    userTypeSelection: null,
  });

  /**
   * Update a single state property
   * Equivalent to Bubble's "Set state" action
   */
  const updateState = useCallback(<K extends keyof AuthState>(
    key: K,
    value: AuthState[K]
  ) => {
    setState(prev => ({ ...prev, [key]: value }));
  }, []);

  /**
   * Update multiple state properties at once
   * Equivalent to Bubble's "Set states" action
   */
  const updateStates = useCallback((updates: Partial<AuthState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Reset state to initial values
   * Equivalent to Bubble's "Reset" action
   */
  const resetState = useCallback(() => {
    setState({
      showingToggle: 'welcome',
      claimListing: false,
      currentInputFilling: null,
      defaultEmail: initialProps.defaultEmail || '',
      disableClose: initialProps.disableClose || false,
      fromTrialHost: initialProps.fromTrialHost || false,
      fromPageType: initialProps.fromPageType || '',
      houseManual: initialProps.houseManual || null,
      lockLogin: false,
      isNYU: initialProps.isNYU || false,
      referral: initialProps.referral || null,
      shouldTheUser: false,
      signupErrorText: '',
      toggleListingPicture: '',
      userTypeSelection: null,
    });
  }, [initialProps]);

  /**
   * Navigate to login view
   */
  const showLogin = useCallback(() => {
    updateState('showingToggle', 'login');
  }, [updateState]);

  /**
   * Navigate to signup view
   */
  const showSignup = useCallback(() => {
    updateState('showingToggle', 'signup');
  }, [updateState]);

  /**
   * Navigate to password reset view
   */
  const showPasswordReset = useCallback(() => {
    updateState('showingToggle', 'reset');
  }, [updateState]);

  /**
   * Navigate to welcome view
   */
  const showWelcome = useCallback(() => {
    updateState('showingToggle', 'welcome');
  }, [updateState]);

  /**
   * Navigate to passwordless login view
   */
  const showPasswordless = useCallback(() => {
    updateState('showingToggle', 'passwordless');
  }, [updateState]);

  return {
    state,
    updateState,
    updateStates,
    resetState,
    showLogin,
    showSignup,
    showPasswordReset,
    showWelcome,
    showPasswordless,
  };
};
