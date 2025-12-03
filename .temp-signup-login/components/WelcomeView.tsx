/**
 * Welcome view component
 * Initial decision screen for users to choose between login, signup, or market report
 */

import React from 'react';
import { AuthButton } from './shared';
import * as S from './WelcomeView.styles';

export interface WelcomeViewProps {
  onSelectLogin: () => void;
  onSelectSignup: () => void;
  onSelectMarketReport?: () => void;
  referral?: {
    cashbackPoints: number;
    cesScore: number;
    referrantName?: string;
  } | null;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({
  onSelectLogin,
  onSelectSignup,
  onSelectMarketReport,
  referral,
}) => {
  return (
    <S.Container>
      <S.Header>
        <S.Logo>
          {/* Replace with your actual logo */}
          <S.LogoText>Split Lease</S.LogoText>
        </S.Logo>
        <S.Title>Welcome to Split Lease!</S.Title>
        <S.Subtitle>Find your perfect roommate and home</S.Subtitle>
      </S.Header>

      {referral && (
        <S.ReferralBanner>
          <S.ReferralIcon>🎉</S.ReferralIcon>
          <S.ReferralContent>
            <S.ReferralTitle>You've been referred!</S.ReferralTitle>
            <S.ReferralText>
              {referral.referrantName && (
                <>
                  <strong>{referral.referrantName}</strong> invited you to join Split Lease.
                </>
              )}
              {referral.cashbackPoints > 0 && (
                <> Get <strong>${referral.cashbackPoints}</strong> in cashback points when you sign up!</>
              )}
            </S.ReferralText>
          </S.ReferralContent>
        </S.ReferralBanner>
      )}

      <S.ActionsContainer>
        <AuthButton
          onClick={onSelectSignup}
          variant="primary"
          fullWidth
        >
          Create Account
        </AuthButton>

        <AuthButton
          onClick={onSelectLogin}
          variant="outline"
          fullWidth
        >
          Log into my account
        </AuthButton>

        {onSelectMarketReport && (
          <>
            <S.Divider>
              <S.DividerLine />
              <S.DividerText>or</S.DividerText>
              <S.DividerLine />
            </S.Divider>

            <AuthButton
              onClick={onSelectMarketReport}
              variant="ghost"
              fullWidth
            >
              Get Market Report (No Account Required)
            </AuthButton>
          </>
        )}
      </S.ActionsContainer>

      <S.Footer>
        <S.FooterText>
          By continuing, you agree to our{' '}
          <S.Link href="/terms" target="_blank" rel="noopener noreferrer">
            Terms of Service
          </S.Link>{' '}
          and{' '}
          <S.Link href="/privacy" target="_blank" rel="noopener noreferrer">
            Privacy Policy
          </S.Link>
        </S.FooterText>
      </S.Footer>
    </S.Container>
  );
};
