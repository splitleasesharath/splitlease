/**
 * Login view component
 * Handles user authentication with email and password
 */

import React, { useState } from 'react';
import { AuthInput, AuthButton, ErrorMessage } from './shared';
import { useValidation } from '../hooks/useValidation';
import * as S from './LoginView.styles';

export interface LoginViewProps {
  defaultEmail?: string;
  onSuccess?: (user: any) => void;
  onSwitchToSignup: () => void;
  onForgotPassword: () => void;
  onPasswordless?: (email: string) => Promise<boolean>;
  onGoBack: () => void;
  onLogin: (email: string, password: string) => Promise<any>;
  loading?: boolean;
  error?: string | null;
}

export const LoginView: React.FC<LoginViewProps> = ({
  defaultEmail = '',
  onSuccess,
  onSwitchToSignup,
  onForgotPassword,
  onPasswordless,
  onGoBack,
  onLogin,
  loading = false,
  error: externalError = null,
}) => {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [sendingMagicLink, setSendingMagicLink] = useState(false);
  const { errors, validate, clearError } = useValidation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const isValid = validate({
      email: {
        value: email,
        rules: { required: true, email: true },
      },
      password: {
        value: password,
        rules: { required: true },
      },
    });

    if (!isValid) return;

    // Call login function
    const user = await onLogin(email, password);
    if (user && onSuccess) {
      onSuccess(user);
    }
  };

  const handlePasswordlessClick = async () => {
    if (!onPasswordless || !email.trim()) return;

    setSendingMagicLink(true);
    const success = await onPasswordless(email);
    setSendingMagicLink(false);

    if (success) {
      setMagicLinkSent(true);
    }
  };

  // Show magic link sent confirmation
  if (magicLinkSent) {
    return (
      <S.Container>
        <S.BackButton onClick={onGoBack} type="button">
          <S.BackIcon>←</S.BackIcon>
        </S.BackButton>

        <S.SuccessContainer>
          <S.SuccessIcon>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </S.SuccessIcon>
          <S.SuccessTitle>Check Your Email & Phone</S.SuccessTitle>
          <S.SuccessText>
            We've sent a magic login link to:
          </S.SuccessText>
          <S.EmailDisplay>{email}</S.EmailDisplay>
          <S.SuccessNote>
            If you have a phone number registered with this account, you'll also receive a text message with the login link.
          </S.SuccessNote>
          <S.InstructionBox>
            <S.InstructionIcon>📱</S.InstructionIcon>
            <S.InstructionText>
              Click the link in your email or text message to log in instantly - no password needed!
            </S.InstructionText>
          </S.InstructionBox>
          <S.SuccessNote>
            Didn't receive it? Check your spam folder or try again.
          </S.SuccessNote>
          <AuthButton onClick={() => setMagicLinkSent(false)} variant="outline" fullWidth>
            Send Another Link
          </AuthButton>
          <S.BackToLogin>
            <S.Link onClick={onGoBack} type="button">
              ← Back to Welcome
            </S.Link>
          </S.BackToLogin>
        </S.SuccessContainer>
      </S.Container>
    );
  }

  return (
    <S.Container>
      <S.BackButton onClick={onGoBack} type="button">
        <S.BackIcon>←</S.BackIcon>
      </S.BackButton>

      <S.Header>
        <S.Title>Welcome Back!</S.Title>
        <S.Subtitle>Log in to your Split Lease account</S.Subtitle>
      </S.Header>

      <S.Form onSubmit={handleSubmit}>
        {externalError && (
          <ErrorMessage message={externalError} variant="error" />
        )}

        <AuthInput
          type="email"
          label="Email"
          placeholder="example@example.com"
          value={email}
          onChange={(value) => {
            setEmail(value);
            clearError('email');
          }}
          error={errors.email}
          autoFocus
          autoComplete="email"
          name="email"
        />

        <AuthInput
          type="password"
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChange={(value) => {
            setPassword(value);
            clearError('password');
          }}
          error={errors.password}
          showPasswordToggle
          autoComplete="current-password"
          name="password"
        />

        <S.ForgotPasswordLink onClick={onForgotPassword} type="button">
          Forgot password?
        </S.ForgotPasswordLink>

        <AuthButton type="submit" loading={loading} fullWidth>
          Log In
        </AuthButton>

        {onPasswordless && email.trim() !== '' && (
          <>
            <S.Divider>
              <S.DividerLine />
              <S.DividerText>or</S.DividerText>
              <S.DividerLine />
            </S.Divider>

            <AuthButton
              onClick={handlePasswordlessClick}
              variant="outline"
              fullWidth
              type="button"
              loading={sendingMagicLink}
            >
              Login Without Password
            </AuthButton>
          </>
        )}

        <S.SocialButtons>
          {/* Add social auth buttons here if needed */}
        </S.SocialButtons>

        <S.BottomSection>
          <S.Text>Don't have an account?</S.Text>
          <S.Link onClick={onSwitchToSignup} type="button">
            Sign Up Here
          </S.Link>
        </S.BottomSection>
      </S.Form>
    </S.Container>
  );
};
