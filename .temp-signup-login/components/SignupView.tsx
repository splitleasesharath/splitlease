/**
 * Signup view component - Multi-step registration
 * Step 1: First Name, Last Name, Email
 * Step 2: Account Type, Date of Birth, Phone Number, Password
 */

import React, { useState } from 'react';
import { AuthInput, AuthButton, ErrorMessage } from './shared';
import { useValidation } from '../hooks/useValidation';
import * as S from './SignupView.styles';

export interface SignupViewProps {
  defaultEmail?: string;
  referral?: {
    cashbackPoints: number;
    cesScore: number;
    referrantName?: string;
  } | null;
  onSuccess?: (user: any) => void;
  onSwitchToLogin: () => void;
  onGoBack: () => void;
  onSignup: (data: SignupFormData) => Promise<any>;
  loading?: boolean;
  error?: string | null;
}

export interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  phoneNumber: string;
  accountType: 'guest' | 'host';
  referralCode?: string;
}

export const SignupView: React.FC<SignupViewProps> = ({
  defaultEmail = '',
  referral,
  onSuccess,
  onSwitchToLogin,
  onGoBack,
  onSignup,
  loading = false,
  error: externalError = null,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState<SignupFormData>({
    email: defaultEmail,
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    birthDate: '',
    phoneNumber: '',
    accountType: 'guest',
    referralCode: '',
  });

  const { errors, validate, clearError, validatePasswordStrength } = useValidation();
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const updateField = (field: keyof SignupFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    clearError(field);
  };

  const handleStep1Next = () => {
    // Validate step 1 fields
    const isValid = validate({
      firstName: {
        value: formData.firstName,
        rules: { required: true },
      },
      lastName: {
        value: formData.lastName,
        rules: { required: true },
      },
      email: {
        value: formData.email,
        rules: { required: true, email: true },
      },
    });

    if (isValid) {
      setCurrentStep(2);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate step 2 fields
    const isValid = validate({
      birthDate: {
        value: formData.birthDate,
        rules: { required: true },
      },
      phoneNumber: {
        value: formData.phoneNumber,
        rules: { required: true, minLength: 10 },
      },
      password: {
        value: formData.password,
        rules: {
          required: true,
          minLength: 8,
          custom: validatePasswordStrength,
        },
      },
      confirmPassword: {
        value: formData.confirmPassword,
        rules: {
          required: true,
          match: formData.password,
        },
      },
    });

    if (!isValid) return;

    if (!acceptedTerms) {
      alert('Please accept the Terms of Service and Privacy Policy');
      return;
    }

    // Call signup function
    const user = await onSignup(formData);
    if (user && onSuccess) {
      onSuccess(user);
    }
  };

  return (
    <S.Container>
      <S.BackButton
        onClick={currentStep === 1 ? onGoBack : () => setCurrentStep(1)}
        type="button"
      >
        <S.BackIcon>←</S.BackIcon>
      </S.BackButton>

      <S.Header>
        <S.Title>Create Your Account</S.Title>
        <S.Subtitle>
          {currentStep === 1 ? 'Step 1 of 2: Basic Information' : 'Step 2 of 2: Account Details'}
        </S.Subtitle>
        <S.StepIndicator>
          <S.Step $active={currentStep === 1} $completed={currentStep === 2}>1</S.Step>
          <S.StepLine $active={currentStep === 2} />
          <S.Step $active={currentStep === 2} $completed={false}>2</S.Step>
        </S.StepIndicator>
      </S.Header>

      {referral && currentStep === 1 && (
        <S.ReferralInfo>
          <S.ReferralIcon>🎁</S.ReferralIcon>
          <S.ReferralText>
            You'll receive <strong>${referral.cashbackPoints}</strong> in cashback points!
          </S.ReferralText>
        </S.ReferralInfo>
      )}

      {currentStep === 1 ? (
        // STEP 1: Names and Email
        <S.Form onSubmit={(e) => { e.preventDefault(); handleStep1Next(); }}>
          {externalError && (
            <ErrorMessage message={externalError} variant="error" />
          )}

          <S.NameRow>
            <AuthInput
              type="text"
              label="First Name"
              placeholder="John"
              value={formData.firstName}
              onChange={(value) => updateField('firstName', value)}
              error={errors.firstName}
              autoComplete="given-name"
              name="firstName"
              autoFocus
            />
            <AuthInput
              type="text"
              label="Last Name"
              placeholder="Doe"
              value={formData.lastName}
              onChange={(value) => updateField('lastName', value)}
              error={errors.lastName}
              autoComplete="family-name"
              name="lastName"
            />
          </S.NameRow>

          <AuthInput
            type="email"
            label="Email"
            placeholder="example@example.com"
            value={formData.email}
            onChange={(value) => updateField('email', value)}
            error={errors.email}
            autoComplete="email"
            name="email"
          />

          <AuthButton type="submit" fullWidth>
            Continue to Step 2
          </AuthButton>

          <S.BottomSection>
            <S.Text>Already have an account?</S.Text>
            <S.Link onClick={onSwitchToLogin} type="button">
              Log In Here
            </S.Link>
          </S.BottomSection>
        </S.Form>
      ) : (
        // STEP 2: Account Type, DOB, Phone, Password
        <S.Form onSubmit={handleFinalSubmit}>
          {externalError && (
            <ErrorMessage message={externalError} variant="error" />
          )}

          <S.AccountTypeSection>
            <S.Label>I am a:</S.Label>
            <S.AccountTypeButtons>
              <S.AccountTypeButton
                type="button"
                $selected={formData.accountType === 'guest'}
                onClick={() => updateField('accountType', 'guest')}
              >
                <S.AccountTypeIcon>🏠</S.AccountTypeIcon>
                <S.AccountTypeLabel>Guest</S.AccountTypeLabel>
                <S.AccountTypeDesc>Looking for a place</S.AccountTypeDesc>
              </S.AccountTypeButton>

              <S.AccountTypeButton
                type="button"
                $selected={formData.accountType === 'host'}
                onClick={() => updateField('accountType', 'host')}
              >
                <S.AccountTypeIcon>🔑</S.AccountTypeIcon>
                <S.AccountTypeLabel>Host</S.AccountTypeLabel>
                <S.AccountTypeDesc>Have a space to share</S.AccountTypeDesc>
              </S.AccountTypeButton>
            </S.AccountTypeButtons>
          </S.AccountTypeSection>

          <AuthInput
            type="date"
            label="Date of Birth"
            placeholder="MM/DD/YYYY"
            value={formData.birthDate}
            onChange={(value) => updateField('birthDate', value)}
            error={errors.birthDate}
            name="birthDate"
          />

          <AuthInput
            type="text"
            label="Phone Number"
            placeholder="+1 (555) 123-4567"
            value={formData.phoneNumber}
            onChange={(value) => updateField('phoneNumber', value)}
            error={errors.phoneNumber}
            autoComplete="tel"
            name="phoneNumber"
          />

          <AuthInput
            type="password"
            label="Password"
            placeholder="Create a password (min 8 characters)"
            value={formData.password}
            onChange={(value) => updateField('password', value)}
            error={errors.password}
            showPasswordToggle
            autoComplete="new-password"
            name="password"
          />

          <AuthInput
            type="password"
            label="Confirm Password"
            placeholder="Re-enter your password"
            value={formData.confirmPassword}
            onChange={(value) => updateField('confirmPassword', value)}
            error={errors.confirmPassword}
            showPasswordToggle
            autoComplete="new-password"
            name="confirmPassword"
          />

          {referral && (
            <AuthInput
              type="text"
              label="Referral Code (Optional)"
              placeholder="Enter referral code"
              value={formData.referralCode}
              onChange={(value) => updateField('referralCode', value)}
              name="referralCode"
            />
          )}

          <S.CheckboxContainer>
            <S.Checkbox
              type="checkbox"
              id="terms"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
            />
            <S.CheckboxLabel htmlFor="terms">
              I agree to the{' '}
              <S.TermsLink href="/terms" target="_blank" rel="noopener noreferrer">
                Terms of Service
              </S.TermsLink>{' '}
              and{' '}
              <S.TermsLink href="/privacy" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </S.TermsLink>
            </S.CheckboxLabel>
          </S.CheckboxContainer>

          <AuthButton type="submit" loading={loading} fullWidth>
            Create Account
          </AuthButton>

          <S.BackToStep1>
            <S.Link onClick={() => setCurrentStep(1)} type="button">
              ← Back to Step 1
            </S.Link>
          </S.BackToStep1>
        </S.Form>
      )}
    </S.Container>
  );
};
