/**
 * Demo Application for SignUpLoginModal
 * This is a preview/testing application
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { SignUpLoginModal } from './SignUpLoginModalDemo';
import type { User, Referral } from '../types';

const App: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [useReferral, setUseReferral] = useState(false);
  const [disableClose, setDisableClose] = useState(false);
  const [defaultEmail, setDefaultEmail] = useState('');

  // Example referral data
  const referralData: Referral = {
    id: 'ref_demo_123',
    cashbackPoints: 50,
    cesScore: 10,
    referrantName: 'John Doe',
    code: 'FRIEND50',
  };

  const handleAuthSuccess = (user: User) => {
    console.log('✅ Authentication successful!', user);
    setCurrentUser(user);
    setIsModalOpen(false);

    // Show success notification
    alert(`Welcome ${user.firstName}! You've been successfully authenticated.`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    console.log('👋 User logged out');
  };

  return (
    <Container>
      <Header>
        <Logo>Split Lease</Logo>
        <HeaderSubtitle>SignUpLoginModal Demo</HeaderSubtitle>
      </Header>

      <MainContent>
        {/* User Status Card */}
        <StatusCard>
          <CardTitle>Authentication Status</CardTitle>
          {currentUser ? (
            <UserInfo>
              <StatusBadge $status="success">✅ Authenticated</StatusBadge>
              <UserDetails>
                <UserName>{currentUser.firstName} {currentUser.lastName}</UserName>
                <UserEmail>{currentUser.email}</UserEmail>
                <UserId>User ID: {currentUser.id}</UserId>
              </UserDetails>
              <LogoutButton onClick={handleLogout}>
                Logout
              </LogoutButton>
            </UserInfo>
          ) : (
            <NotAuthenticated>
              <StatusBadge $status="error">❌ Not Authenticated</StatusBadge>
              <InfoText>Click the button below to open the authentication modal</InfoText>
            </NotAuthenticated>
          )}
        </StatusCard>

        {/* Configuration Card */}
        <ConfigCard>
          <CardTitle>Modal Configuration</CardTitle>

          <ConfigOption>
            <Checkbox
              type="checkbox"
              id="referral"
              checked={useReferral}
              onChange={(e) => setUseReferral(e.target.checked)}
            />
            <CheckboxLabel htmlFor="referral">
              Use Referral Code
              <HelpText>Shows referral banner with cashback points</HelpText>
            </CheckboxLabel>
          </ConfigOption>

          <ConfigOption>
            <Checkbox
              type="checkbox"
              id="disableClose"
              checked={disableClose}
              onChange={(e) => setDisableClose(e.target.checked)}
            />
            <CheckboxLabel htmlFor="disableClose">
              Disable Close Button
              <HelpText>Forces user to complete authentication</HelpText>
            </CheckboxLabel>
          </ConfigOption>

          <ConfigOption>
            <InputLabel htmlFor="defaultEmail">
              Default Email (Optional)
            </InputLabel>
            <Input
              type="email"
              id="defaultEmail"
              placeholder="user@example.com"
              value={defaultEmail}
              onChange={(e) => setDefaultEmail(e.target.value)}
            />
          </ConfigOption>
        </ConfigCard>

        {/* Action Buttons */}
        <ButtonGroup>
          <PrimaryButton onClick={() => setIsModalOpen(true)}>
            🚀 Open Authentication Modal
          </PrimaryButton>
        </ButtonGroup>

        {/* Feature List */}
        <FeatureCard>
          <CardTitle>Features Included</CardTitle>
          <FeatureList>
            <FeatureItem>
              <FeatureIcon>✅</FeatureIcon>
              <FeatureText>
                <strong>Email/Password Login</strong>
                <span>Traditional authentication flow</span>
              </FeatureText>
            </FeatureItem>
            <FeatureItem>
              <FeatureIcon>✅</FeatureIcon>
              <FeatureText>
                <strong>User Registration</strong>
                <span>Complete signup with validation</span>
              </FeatureText>
            </FeatureItem>
            <FeatureItem>
              <FeatureIcon>✅</FeatureIcon>
              <FeatureText>
                <strong>Password Reset</strong>
                <span>Reset via email with confirmation</span>
              </FeatureText>
            </FeatureItem>
            <FeatureItem>
              <FeatureIcon>✅</FeatureIcon>
              <FeatureText>
                <strong>Referral Support</strong>
                <span>Track referrals with cashback points</span>
              </FeatureText>
            </FeatureItem>
            <FeatureItem>
              <FeatureIcon>✅</FeatureIcon>
              <FeatureText>
                <strong>Form Validation</strong>
                <span>Real-time validation with helpful errors</span>
              </FeatureText>
            </FeatureItem>
            <FeatureItem>
              <FeatureIcon>✅</FeatureIcon>
              <FeatureText>
                <strong>Responsive Design</strong>
                <span>Works on mobile, tablet, and desktop</span>
              </FeatureText>
            </FeatureItem>
          </FeatureList>
        </FeatureCard>

        {/* Info Card */}
        <InfoCard>
          <InfoIcon>ℹ️</InfoIcon>
          <InfoContent>
            <InfoTitle>Demo Mode</InfoTitle>
            <InfoDescription>
              This is a preview version with mock API responses.
              In production, update the API endpoints in <code>hooks/useAuthFlow.ts</code>
              to connect to your backend.
            </InfoDescription>
            <InfoNote>
              <strong>Note:</strong> All authentication attempts will succeed with mock data
              for testing purposes. Check the browser console for detailed logs.
            </InfoNote>
          </InfoContent>
        </InfoCard>
      </MainContent>

      {/* The Authentication Modal */}
      <SignUpLoginModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        referral={useReferral ? referralData : undefined}
        disableClose={disableClose}
        defaultEmail={defaultEmail}
        fromPageType="demo-preview"
      />

      <Footer>
        <FooterText>
          Built with ❤️ using React + TypeScript + Styled Components
        </FooterText>
        <FooterText>
          Converted from Bubble.io by Claude Code
        </FooterText>
      </Footer>
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  color: white;
`;

const Header = styled.header`
  text-align: center;
  padding: 48px 24px 24px;
`;

const Logo = styled.h1`
  font-size: 48px;
  font-weight: 700;
  margin: 0 0 8px 0;
  background: linear-gradient(135deg, #fff 0%, #e0e7ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const HeaderSubtitle = styled.p`
  font-size: 18px;
  opacity: 0.9;
  margin: 0;
`;

const MainContent = styled.main`
  flex: 1;
  max-width: 900px;
  width: 100%;
  margin: 0 auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const StatusCard = styled.div`
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
`;

const ConfigCard = styled(StatusCard)``;
const FeatureCard = styled(StatusCard)``;
const InfoCard = styled(StatusCard)`
  background: rgba(254, 243, 199, 0.95);
  display: flex;
  gap: 16px;
`;

const CardTitle = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: #1F2937;
  margin: 0 0 24px 0;
`;

const StatusBadge = styled.div<{ $status: 'success' | 'error' }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 16px;
  ${props => props.$status === 'success' ? `
    background: #D1FAE5;
    color: #065F46;
  ` : `
    background: #FEE2E2;
    color: #991B1B;
  `}
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const UserDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const UserName = styled.div`
  font-size: 20px;
  font-weight: 600;
  color: #1F2937;
`;

const UserEmail = styled.div`
  font-size: 16px;
  color: #6B7280;
`;

const UserId = styled.div`
  font-size: 14px;
  color: #9CA3AF;
  font-family: monospace;
`;

const NotAuthenticated = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const InfoText = styled.p`
  font-size: 16px;
  color: #6B7280;
  margin: 0;
`;

const LogoutButton = styled.button`
  padding: 12px 24px;
  background: #EF4444;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 200ms ease;
  align-self: flex-start;

  &:hover {
    background: #DC2626;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
  }
`;

const ConfigOption = styled.div`
  margin-bottom: 20px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const Checkbox = styled.input`
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #7C3AED;
`;

const CheckboxLabel = styled.label`
  display: inline-flex;
  flex-direction: column;
  margin-left: 12px;
  cursor: pointer;
  color: #1F2937;
  font-size: 16px;
  font-weight: 500;
`;

const HelpText = styled.span`
  font-size: 14px;
  color: #6B7280;
  font-weight: 400;
  margin-top: 4px;
`;

const InputLabel = styled.label`
  display: block;
  font-size: 16px;
  font-weight: 500;
  color: #1F2937;
  margin-bottom: 8px;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #E5E7EB;
  border-radius: 8px;
  font-size: 16px;
  color: #1F2937;
  transition: border-color 200ms ease;

  &:focus {
    outline: none;
    border-color: #7C3AED;
  }

  &::placeholder {
    color: #9CA3AF;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
`;

const PrimaryButton = styled.button`
  padding: 16px 32px;
  background: #7C3AED;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 200ms ease;
  box-shadow: 0 4px 16px rgba(124, 58, 237, 0.4);

  &:hover {
    background: #6D28D9;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(124, 58, 237, 0.5);
  }

  &:active {
    transform: translateY(0);
  }
`;

const FeatureList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FeatureItem = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
`;

const FeatureIcon = styled.div`
  font-size: 20px;
  flex-shrink: 0;
`;

const FeatureText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;

  strong {
    font-size: 16px;
    color: #1F2937;
  }

  span {
    font-size: 14px;
    color: #6B7280;
  }
`;

const InfoIcon = styled.div`
  font-size: 32px;
  flex-shrink: 0;
`;

const InfoContent = styled.div`
  flex: 1;
`;

const InfoTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #92400E;
  margin: 0 0 8px 0;
`;

const InfoDescription = styled.p`
  font-size: 14px;
  color: #78350F;
  margin: 0 0 12px 0;
  line-height: 1.6;

  code {
    background: rgba(0, 0, 0, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 13px;
  }
`;

const InfoNote = styled.div`
  font-size: 13px;
  color: #78350F;
  padding: 12px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  line-height: 1.5;

  strong {
    font-weight: 600;
  }
`;

const Footer = styled.footer`
  text-align: center;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const FooterText = styled.p`
  font-size: 14px;
  opacity: 0.8;
  margin: 0;
`;

export default App;
