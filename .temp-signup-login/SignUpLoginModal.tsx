/**
 * Main Sign Up & Login Modal Component
 * Converted from Bubble.io reusable element
 *
 * This is a comprehensive authentication modal that handles:
 * - User login
 * - User signup/registration
 * - Password reset
 * - Passwordless authentication
 * - Referral tracking
 * - State management across different views
 */

import React, { useEffect } from 'react';
import { CloseButton } from './components/shared';
import { WelcomeView } from './components/WelcomeView';
import { LoginView } from './components/LoginView';
import { SignupView } from './components/SignupView';
import { PasswordResetView } from './components/PasswordResetView';
import { useAuthState } from './hooks/useAuthState';
import { useAuthFlow } from './hooks/useAuthFlow';
import { SignUpLoginModalProps } from './types';
import * as S from './SignUpLoginModal.styles';

export const SignUpLoginModal: React.FC<SignUpLoginModalProps> = ({
  isOpen,
  onClose,
  defaultEmail,
  fromPageType,
  houseManual,
  referral,
  disableClose = false,
  fromTrialHost = false,
  isNYU = false,
  onAuthSuccess,
}) => {
  const {
    state,
    updateState,
    resetState,
    showLogin,
    showSignup,
    showPasswordReset,
    showWelcome,
    showPasswordless,
  } = useAuthState({
    defaultEmail,
    fromPageType,
    houseManual,
    referral,
    disableClose,
    fromTrialHost,
    isNYU,
  });

  const {
    loading,
    error,
    login,
    signup,
    resetPassword,
    passwordlessLogin,
    clearError,
  } = useAuthFlow();

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetState();
      clearError();
    }
  }, [isOpen, resetState, clearError]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !state.disableClose) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, state.disableClose]);

  const handleClose = () => {
    if (!state.disableClose) {
      resetState();
      clearError();
      onClose();
    }
  };

  // Handle login
  const handleLogin = async (email: string, password: string) => {
    const user = await login({ email, password });
    if (user) {
      onAuthSuccess?.(user);
      handleClose();
    }
    return user;
  };

  // Handle signup
  const handleSignup = async (data: any) => {
    const user = await signup(data);
    if (user) {
      onAuthSuccess?.(user);
      handleClose();
    }
    return user;
  };

  // Handle password reset
  const handlePasswordReset = async (email: string) => {
    return await resetPassword({ email });
  };

  // Handle passwordless login
  const handlePasswordless = async (email: string) => {
    return await passwordlessLogin(email);
  };

  // Render current view based on state
  const renderContent = () => {
    switch (state.showingToggle) {
      case 'welcome':
        return (
          <WelcomeView
            onSelectLogin={showLogin}
            onSelectSignup={showSignup}
            onSelectMarketReport={() => {
              // Handle market report flow
              console.log('Market report requested');
            }}
            referral={state.referral}
          />
        );

      case 'login':
        return (
          <LoginView
            defaultEmail={state.defaultEmail}
            onSuccess={onAuthSuccess}
            onSwitchToSignup={showSignup}
            onForgotPassword={showPasswordReset}
            onPasswordless={showPasswordless}
            onGoBack={showWelcome}
            onLogin={handleLogin}
            loading={loading}
            error={error}
          />
        );

      case 'signup':
        return (
          <SignupView
            defaultEmail={state.defaultEmail}
            referral={state.referral}
            onSuccess={onAuthSuccess}
            onSwitchToLogin={showLogin}
            onGoBack={showWelcome}
            onSignup={handleSignup}
            loading={loading}
            error={error}
          />
        );

      case 'reset':
        return (
          <PasswordResetView
            defaultEmail={state.defaultEmail}
            onBack={showLogin}
            onSuccess={showLogin}
            onResetPassword={handlePasswordReset}
            loading={loading}
            error={error}
          />
        );

      case 'passwordless':
        // TODO: Implement passwordless view
        return (
          <div>
            <h2>Passwordless Login</h2>
            <p>Coming soon...</p>
            <button onClick={showLogin}>Back to Login</button>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <S.Overlay onClick={handleClose} aria-hidden="true" />
      <S.ModalContainer
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {!state.disableClose && <CloseButton onClick={handleClose} />}
        <S.ContentWrapper>{renderContent()}</S.ContentWrapper>
      </S.ModalContainer>
    </>
  );
};

export default SignUpLoginModal;
