/**
 * Password Reset view component
 * Handles password reset requests via email
 */

import React, { useState } from 'react';
import { AuthInput, AuthButton, ErrorMessage } from './shared';
import { useValidation } from '../hooks/useValidation';
import * as S from './PasswordResetView.styles';

export interface PasswordResetViewProps {
  defaultEmail?: string;
  onBack: () => void;
  onSuccess: () => void;
  onResetPassword: (email: string) => Promise<boolean>;
  loading?: boolean;
  error?: string | null;
}

export const PasswordResetView: React.FC<PasswordResetViewProps> = ({
  defaultEmail = '',
  onBack,
  onSuccess,
  onResetPassword,
  loading = false,
  error: externalError = null,
}) => {
  const [email, setEmail] = useState(defaultEmail);
  const [submitted, setSubmitted] = useState(false);
  const { errors, validate, clearError } = useValidation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email
    const isValid = validate({
      email: {
        value: email,
        rules: { required: true, email: true },
      },
    });

    if (!isValid) return;

    // Call reset password function
    const success = await onResetPassword(email);
    if (success) {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <S.Container>
        <S.SuccessContainer>
          <S.SuccessIcon>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </S.SuccessIcon>
          <S.SuccessTitle>Check Your Email</S.SuccessTitle>
          <S.SuccessText>
            We've sent password reset instructions to <strong>{email}</strong>.
            Please check your inbox and follow the link to reset your password.
          </S.SuccessText>
          <S.SuccessNote>
            Didn't receive the email? Check your spam folder or try again.
          </S.SuccessNote>
          <AuthButton onClick={onSuccess} fullWidth>
            Back to Login
          </AuthButton>
          <S.ResendButton onClick={() => setSubmitted(false)} type="button">
            Resend Email
          </S.ResendButton>
        </S.SuccessContainer>
      </S.Container>
    );
  }

  return (
    <S.Container>
      <S.BackButton onClick={onBack} type="button">
        <S.BackIcon>←</S.BackIcon>
      </S.BackButton>

      <S.Header>
        <S.Icon>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </S.Icon>
        <S.Title>Reset Password</S.Title>
        <S.Subtitle>
          Enter your email address and we'll send you instructions to reset your password
        </S.Subtitle>
      </S.Header>

      <S.Form onSubmit={handleSubmit}>
        {externalError && (
          <ErrorMessage message={externalError} variant="error" />
        )}

        <AuthInput
          type="email"
          label="Email Address"
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

        <AuthButton type="submit" loading={loading} fullWidth>
          Send Reset Instructions
        </AuthButton>

        <S.InfoBox>
          <S.InfoIcon>ℹ️</S.InfoIcon>
          <S.InfoText>
            You'll receive an email with a link to reset your password. The link will expire in 24 hours.
          </S.InfoText>
        </S.InfoBox>
      </S.Form>
    </S.Container>
  );
};
