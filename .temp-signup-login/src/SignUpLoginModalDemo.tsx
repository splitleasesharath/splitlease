/**
 * Demo wrapper for SignUpLoginModal that uses mock API
 */

import React, { useEffect } from 'react';
import { CloseButton } from '../components/shared';
import { WelcomeView } from '../components/WelcomeView';
import { LoginView } from '../components/LoginView';
import { SignupView } from '../components/SignupView';
import { PasswordResetView } from '../components/PasswordResetView';
import { useAuthState } from '../hooks/useAuthState';
import { useAuthFlow } from '../hooks/useAuthFlow';
import { SignUpLoginModalProps } from '../types';
import * as S from '../SignUpLoginModal.styles';

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

  useEffect(() => {
    if (!isOpen) {
      resetState();
      clearError();
    }
  }, [isOpen, resetState, clearError]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !state.disableClose) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
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

  const handleLogin = async (email: string, password: string) => {
    const user = await login({ email, password });
    if (user) {
      onAuthSuccess?.(user);
      handleClose();
    }
    return user;
  };

  const handleSignup = async (data: any) => {
    const user = await signup(data);
    if (user) {
      onAuthSuccess?.(user);
      handleClose();
    }
    return user;
  };

  const handlePasswordReset = async (email: string) => {
    return await resetPassword({ email });
  };

  const handlePasswordless = async (email: string) => {
    return await passwordlessLogin(email);
  };

  const renderContent = () => {
    switch (state.showingToggle) {
      case 'welcome':
        return (
          <WelcomeView
            onSelectLogin={showLogin}
            onSelectSignup={showSignup}
            onSelectMarketReport={() => {
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
            onPasswordless={handlePasswordless}
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
