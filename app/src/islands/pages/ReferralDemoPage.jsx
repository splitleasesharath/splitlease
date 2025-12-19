import React, { useState } from 'react';
import styled from 'styled-components';

// ============================================
// STYLED COMPONENTS
// ============================================

const PageContainer = styled.div`
  min-height: 100vh;
  background: #f8f9fa;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;

const Header = styled.header`
  background: white;
  padding: 16px 24px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Logo = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: #7c3aed;
`;

const DemoLabel = styled.span`
  background: #fef3c7;
  color: #92400e;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
`;

const MainContent = styled.main`
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 24px;
`;

const SectionLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
`;

// ============================================
// REFERRAL CARD - SIMPLE VERSION
// ============================================

const ReferralCard = styled.div`
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
`;

const MoneyIcon = styled.div`
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
`;

const CardTitle = styled.div`
  h2 {
    font-size: 20px;
    font-weight: 700;
    color: #111827;
    margin: 0 0 4px;
  }
  p {
    font-size: 14px;
    color: #6b7280;
    margin: 0;
  }
`;

const ReferralLinkSection = styled.div`
  background: #f3f4f6;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
`;

const ReferralLink = styled.div`
  flex: 1;
  font-size: 15px;
  color: #374151;
  font-weight: 500;
`;

const CopyButton = styled.button`
  padding: 10px 20px;
  background: ${props => props.$copied ? '#10b981' : '#7c3aed'};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 80px;

  &:hover {
    background: ${props => props.$copied ? '#059669' : '#6d28d9'};
  }
`;

const ShareButton = styled.button`
  padding: 10px 20px;
  background: #111827;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background: #1f2937;
  }
`;

const StatsRow = styled.div`
  display: flex;
  gap: 24px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
`;

const StatItem = styled.div`
  .value {
    font-size: 24px;
    font-weight: 700;
    color: #10b981;
  }
  .label {
    font-size: 13px;
    color: #6b7280;
  }
`;

// ============================================
// HOW IT WORKS
// ============================================

const HowItWorks = styled.div`
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
`;

const StepsContainer = styled.div`
  display: flex;
  gap: 16px;

  @media (max-width: 640px) {
    flex-direction: column;
  }
`;

const Step = styled.div`
  flex: 1;
  text-align: center;
  padding: 16px;

  .number {
    width: 32px;
    height: 32px;
    background: #ede9fe;
    color: #7c3aed;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 14px;
    margin: 0 auto 12px;
  }

  .title {
    font-weight: 600;
    color: #111827;
    margin-bottom: 4px;
  }

  .description {
    font-size: 13px;
    color: #6b7280;
  }
`;

const Arrow = styled.div`
  display: flex;
  align-items: center;
  color: #d1d5db;
  font-size: 20px;

  @media (max-width: 640px) {
    transform: rotate(90deg);
    justify-content: center;
  }
`;

// ============================================
// LANDING PAGE PREVIEW
// ============================================

const PreviewContainer = styled.div`
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
`;

const PhoneMockup = styled.div`
  max-width: 375px;
  margin: 0 auto;
  border: 8px solid #1f2937;
  border-radius: 32px;
  overflow: hidden;
  background: white;
`;

const LandingPage = styled.div`
  .header {
    background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
    padding: 40px 24px;
    text-align: center;
    color: white;

    h1 {
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 8px;
    }

    .reward {
      font-size: 48px;
      font-weight: 800;
      margin: 16px 0;
    }

    p {
      font-size: 14px;
      opacity: 0.9;
    }
  }

  .body {
    padding: 24px;

    .value-prop {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid #f3f4f6;

      &:last-child {
        border-bottom: none;
      }

      .icon {
        font-size: 20px;
      }

      .text {
        font-size: 14px;
        color: #374151;
      }
    }

    .cta {
      margin-top: 24px;
      width: 100%;
      padding: 16px;
      background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
    }
  }
`;

// ============================================
// SHARE MODAL
// ============================================

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;

  @media (min-width: 640px) {
    align-items: center;
  }
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 20px 20px 0 0;
  padding: 24px;
  width: 100%;
  max-width: 400px;

  @media (min-width: 640px) {
    border-radius: 20px;
  }
`;

const ModalHandle = styled.div`
  width: 40px;
  height: 4px;
  background: #d1d5db;
  border-radius: 2px;
  margin: 0 auto 20px;

  @media (min-width: 640px) {
    display: none;
  }
`;

const ModalTitle = styled.h3`
  font-size: 18px;
  font-weight: 700;
  text-align: center;
  margin: 0 0 20px;
  color: #111827;
`;

const ShareOptions = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
`;

const ShareOption = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  background: #f9fafb;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #f3f4f6;
  }

  .icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
  }

  .icon.message { background: #22c55e; }
  .icon.email { background: #3b82f6; }
  .icon.copy { background: #6b7280; }
  .icon.more { background: #8b5cf6; }

  .label {
    font-size: 12px;
    color: #6b7280;
    font-weight: 500;
  }
`;

const MessagePreview = styled.div`
  background: #f3f4f6;
  border-radius: 12px;
  padding: 16px;
  font-size: 14px;
  line-height: 1.5;
  color: #374151;
  white-space: pre-wrap;
`;

// ============================================
// SUCCESS TOAST
// ============================================

const Toast = styled.div`
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: #10b981;
  color: white;
  padding: 16px 24px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideUp 0.3s ease;
  z-index: 1001;

  @keyframes slideUp {
    from {
      transform: translateX(-50%) translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
  }

  .icon { font-size: 20px; }
  .message { font-weight: 500; }
`;

// ============================================
// SIMULATION CONTROLS
// ============================================

const SimControls = styled.div`
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
`;

const SimTitle = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #92400e;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
`;

const SimButtons = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const SimButton = styled.button`
  padding: 8px 16px;
  background: white;
  border: 1px solid #fcd34d;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #92400e;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #fffbeb;
  }
`;

// ============================================
// HOST VERSION TOGGLE
// ============================================

const VersionToggle = styled.div`
  display: flex;
  background: #f3f4f6;
  border-radius: 10px;
  padding: 4px;
  margin-bottom: 24px;
`;

const ToggleOption = styled.button`
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: ${props => props.$active ? 'white' : 'transparent'};
  color: ${props => props.$active ? '#111827' : '#6b7280'};
  box-shadow: ${props => props.$active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};
`;

// ============================================
// MAIN COMPONENT
// ============================================

export default function ReferralDemoPage() {
  const [userType, setUserType] = useState('guest');
  const [referralCount, setReferralCount] = useState(3);
  const [totalEarned, setTotalEarned] = useState(150);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const referralCode = 'alex';
  const referralLink = userType === 'guest'
    ? `splitlease.com/r/${referralCode}`
    : `splitlease.com/host/r/${referralCode}`;

  const rewardAmount = userType === 'guest' ? 50 : 100;

  const handleCopy = () => {
    setCopiedLink(true);
    showToastMessage('Link copied!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const showToastMessage = (message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const simulateReferral = () => {
    setReferralCount(prev => prev + 1);
    setTotalEarned(prev => prev + rewardAmount);
    showToastMessage(`+$${rewardAmount} earned! Your friend just booked.`);
  };

  const shareMessage = userType === 'guest'
    ? `Hey! I've been using Split Lease for my NYC trips - way cheaper than hotels and I get the same apartment every time.\n\nHere's $50 off your first booking: ${referralLink}`
    : `Hey! You mentioned you have empty nights at your place. I've been using Split Lease to rent mine out.\n\nList with my link and your first booking is commission-free: ${referralLink}`;

  return (
    <PageContainer>
      <Header>
        <Logo>Split Lease</Logo>
        <DemoLabel>Referral Demo</DemoLabel>
      </Header>

      <MainContent>
        {/* Simulation Controls */}
        <SimControls>
          <SimTitle>Demo Controls</SimTitle>
          <SimButtons>
            <SimButton onClick={simulateReferral}>
              + Simulate Referral
            </SimButton>
            <SimButton onClick={() => { setReferralCount(0); setTotalEarned(0); }}>
              Reset Stats
            </SimButton>
            <SimButton onClick={() => setShowShareModal(true)}>
              Open Share Sheet
            </SimButton>
          </SimButtons>
        </SimControls>

        {/* User Type Toggle */}
        <VersionToggle>
          <ToggleOption
            $active={userType === 'guest'}
            onClick={() => setUserType('guest')}
          >
            Guest ($50 reward)
          </ToggleOption>
          <ToggleOption
            $active={userType === 'host'}
            onClick={() => setUserType('host')}
          >
            Host ($100 reward)
          </ToggleOption>
        </VersionToggle>

        {/* Main Referral Card */}
        <SectionLabel>Dashboard Component</SectionLabel>
        <ReferralCard>
          <CardHeader>
            <MoneyIcon>💰</MoneyIcon>
            <CardTitle>
              <h2>
                {userType === 'guest'
                  ? 'Give $50, Get $50'
                  : 'Refer a Host, Get $100'}
              </h2>
              <p>
                {userType === 'guest'
                  ? 'Share your link. When your friend books, you both get $50.'
                  : 'Know someone with empty nights? Get $100 when they get their first booking.'}
              </p>
            </CardTitle>
          </CardHeader>

          <ReferralLinkSection>
            <ReferralLink>{referralLink}</ReferralLink>
            <CopyButton onClick={handleCopy} $copied={copiedLink}>
              {copiedLink ? '✓ Copied' : 'Copy'}
            </CopyButton>
            <ShareButton onClick={() => setShowShareModal(true)}>
              <span>↗</span> Share
            </ShareButton>
          </ReferralLinkSection>

          <StatsRow>
            <StatItem>
              <div className="value">${totalEarned}</div>
              <div className="label">Total earned</div>
            </StatItem>
            <StatItem>
              <div className="value">{referralCount}</div>
              <div className="label">Friends referred</div>
            </StatItem>
          </StatsRow>
        </ReferralCard>

        {/* How It Works */}
        <SectionLabel>How It Works</SectionLabel>
        <HowItWorks>
          <StepsContainer>
            <Step>
              <div className="number">1</div>
              <div className="title">Share your link</div>
              <div className="description">Send to friends who travel to NYC</div>
            </Step>
            <Arrow>→</Arrow>
            <Step>
              <div className="number">2</div>
              <div className="title">Friend books</div>
              <div className="description">They get ${rewardAmount} off their first stay</div>
            </Step>
            <Arrow>→</Arrow>
            <Step>
              <div className="number">3</div>
              <div className="title">You get paid</div>
              <div className="description">${rewardAmount} credit added to your account</div>
            </Step>
          </StepsContainer>
        </HowItWorks>

        {/* Landing Page Preview */}
        <SectionLabel>What Your Friend Sees</SectionLabel>
        <PreviewContainer>
          <PhoneMockup>
            <LandingPage>
              <div className="header">
                <h1>Alex invited you</h1>
                <div className="reward">$50 OFF</div>
                <p>your first Split Lease booking</p>
              </div>
              <div className="body">
                <div className="value-prop">
                  <span className="icon">✓</span>
                  <span className="text">45% cheaper than hotels</span>
                </div>
                <div className="value-prop">
                  <span className="icon">✓</span>
                  <span className="text">Same apartment every trip</span>
                </div>
                <div className="value-prop">
                  <span className="icon">✓</span>
                  <span className="text">Leave your stuff between visits</span>
                </div>
                <button className="cta">Claim Your $50</button>
              </div>
            </LandingPage>
          </PhoneMockup>
        </PreviewContainer>
      </MainContent>

      {/* Share Modal */}
      {showShareModal && (
        <ModalOverlay onClick={() => setShowShareModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHandle />
            <ModalTitle>Share your ${rewardAmount} gift</ModalTitle>

            <ShareOptions>
              <ShareOption>
                <div className="icon message">💬</div>
                <span className="label">Message</span>
              </ShareOption>
              <ShareOption>
                <div className="icon email">✉️</div>
                <span className="label">Email</span>
              </ShareOption>
              <ShareOption onClick={() => { handleCopy(); setShowShareModal(false); }}>
                <div className="icon copy">📋</div>
                <span className="label">Copy</span>
              </ShareOption>
              <ShareOption>
                <div className="icon more">⋯</div>
                <span className="label">More</span>
              </ShareOption>
            </ShareOptions>

            <MessagePreview>{shareMessage}</MessagePreview>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Success Toast */}
      {showToast && (
        <Toast>
          <span className="icon">🎉</span>
          <span className="message">{toastMessage}</span>
        </Toast>
      )}
    </PageContainer>
  );
}
