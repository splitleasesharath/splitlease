import React, { useState } from 'react';
import styled from 'styled-components';

// ============================================
// STYLED COMPONENTS
// ============================================

const PageContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  color: white;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;

const Header = styled.header`
  padding: 24px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const Logo = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: #a855f7;
`;

const NavTabs = styled.div`
  display: flex;
  gap: 8px;
`;

const NavTab = styled.button`
  padding: 10px 20px;
  background: ${props => props.$active ? 'rgba(168, 85, 247, 0.2)' : 'transparent'};
  border: 1px solid ${props => props.$active ? '#a855f7' : 'rgba(255, 255, 255, 0.2)'};
  border-radius: 24px;
  color: ${props => props.$active ? '#a855f7' : 'rgba(255, 255, 255, 0.7)'};
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    border-color: #a855f7;
    color: #a855f7;
  }
`;

const MainContent = styled.main`
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px;
`;

const SectionTitle = styled.h2`
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
  background: linear-gradient(90deg, #a855f7, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const SectionSubtitle = styled.p`
  color: rgba(255, 255, 255, 0.6);
  font-size: 16px;
  margin-bottom: 32px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
  margin-bottom: 48px;
`;

const Card = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  backdrop-filter: blur(10px);
`;

const CardTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

// ============================================
// REFERRAL CARD COMPONENT (Dashboard Integration)
// ============================================

const ReferralCardWrapper = styled(Card)`
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(236, 72, 153, 0.1) 100%);
  border-color: rgba(168, 85, 247, 0.3);
`;

const ReferralCardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
`;

const ReferralCardIcon = styled.span`
  font-size: 32px;
`;

const ReferralCardTitle = styled.div`
  h4 {
    font-size: 18px;
    font-weight: 600;
    margin: 0;
  }
  p {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.6);
    margin: 4px 0 0;
  }
`;

const StatsRow = styled.div`
  display: flex;
  gap: 24px;
  margin-bottom: 20px;
`;

const Stat = styled.div`
  .label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .value {
    font-size: 24px;
    font-weight: 700;
    color: #a855f7;
  }
`;

const ProgressContainer = styled.div`
  margin-bottom: 20px;
`;

const ProgressLabel = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin-bottom: 8px;
  color: rgba(255, 255, 255, 0.7);
`;

const ProgressBar = styled.div`
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  width: ${props => props.$percent}%;
  background: linear-gradient(90deg, #a855f7, #ec4899);
  border-radius: 4px;
  transition: width 0.5s ease;
`;

const ShareButtons = styled.div`
  display: flex;
  gap: 12px;
`;

const ShareButton = styled.button`
  flex: 1;
  padding: 12px 16px;
  border-radius: 10px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  &.whatsapp {
    background: #25D366;
    color: white;
  }
  &.email {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  &.copy {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
`;

// ============================================
// BADGE COMPONENT
// ============================================

const BadgeCard = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: ${props => props.$active
    ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(236, 72, 153, 0.15) 100%)'
    : 'rgba(255, 255, 255, 0.03)'};
  border: 1px solid ${props => props.$active ? 'rgba(168, 85, 247, 0.4)' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 12px;
  opacity: ${props => props.$locked ? 0.5 : 1};
  transition: all 0.3s;

  &:hover {
    border-color: rgba(168, 85, 247, 0.4);
  }
`;

const BadgeIcon = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: ${props => props.$color || 'rgba(168, 85, 247, 0.2)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  position: relative;

  ${props => props.$locked && `
    &::after {
      content: '🔒';
      position: absolute;
      bottom: -4px;
      right: -4px;
      font-size: 14px;
    }
  `}
`;

const BadgeInfo = styled.div`
  flex: 1;

  .name {
    font-weight: 600;
    font-size: 16px;
    margin-bottom: 4px;
  }
  .requirement {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.5);
  }
  .status {
    font-size: 12px;
    color: #22c55e;
    margin-top: 4px;
  }
`;

// ============================================
// SHARE MODAL COMPONENT
// ============================================

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
`;

const ModalContent = styled.div`
  background: #1a1a2e;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 32px;
  width: 90%;
  max-width: 480px;
  position: relative;
`;

const ModalClose = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 24px;
  cursor: pointer;

  &:hover {
    color: white;
  }
`;

const ModalTitle = styled.h3`
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
  text-align: center;
`;

const ModalSubtitle = styled.p`
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
  margin-bottom: 24px;
`;

const ReferralLinkBox = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;

  input {
    flex: 1;
    background: none;
    border: none;
    color: white;
    font-size: 14px;
    outline: none;
  }

  button {
    padding: 8px 16px;
    background: #a855f7;
    border: none;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    cursor: pointer;

    &:hover {
      background: #9333ea;
    }
  }
`;

const MessagePreview = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  font-size: 14px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 24px;
  white-space: pre-wrap;
`;

const ShareOptionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
`;

const ShareOption = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: white;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: #a855f7;
  }

  .icon {
    font-size: 28px;
  }
  .label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
  }
`;

// ============================================
// LANDING PAGE PREVIEW
// ============================================

const LandingPreview = styled.div`
  background: white;
  border-radius: 12px;
  overflow: hidden;
  color: #1a1a2e;
`;

const LandingHeader = styled.div`
  background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%);
  padding: 32px;
  color: white;
  text-align: center;

  h3 {
    font-size: 24px;
    margin-bottom: 8px;
  }
  p {
    opacity: 0.9;
    font-size: 14px;
  }
`;

const LandingBody = styled.div`
  padding: 24px;

  .value-props {
    list-style: none;
    padding: 0;
    margin: 0 0 24px;

    li {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid #eee;
      font-size: 14px;

      &:last-child {
        border-bottom: none;
      }

      .check {
        color: #22c55e;
        font-size: 18px;
      }
    }
  }

  .cta-button {
    width: 100%;
    padding: 16px;
    background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%);
    border: none;
    border-radius: 12px;
    color: white;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s;

    &:hover {
      transform: scale(1.02);
    }
  }
`;

// ============================================
// ACHIEVEMENT NOTIFICATION
// ============================================

const NotificationToast = styled.div`
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 1px solid rgba(168, 85, 247, 0.4);
  border-radius: 16px;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  animation: slideIn 0.5s ease;
  z-index: 1001;

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .icon {
    font-size: 40px;
  }

  .content {
    h4 {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 4px;
      color: #a855f7;
    }
    p {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.7);
      margin: 0;
    }
  }
`;

// ============================================
// LEADERBOARD
// ============================================

const LeaderboardTable = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const LeaderboardRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: ${props => props.$rank === 1
    ? 'linear-gradient(90deg, rgba(255, 215, 0, 0.1) 0%, transparent 100%)'
    : props.$rank === 2
    ? 'linear-gradient(90deg, rgba(192, 192, 192, 0.1) 0%, transparent 100%)'
    : props.$rank === 3
    ? 'linear-gradient(90deg, rgba(205, 127, 50, 0.1) 0%, transparent 100%)'
    : 'rgba(255, 255, 255, 0.03)'};
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;

  .rank {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: ${props => props.$rank <= 3 ? '20px' : '14px'};
  }

  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, #a855f7, #ec4899);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
  }

  .name {
    flex: 1;
    font-weight: 500;
  }

  .count {
    font-weight: 700;
    color: #a855f7;
  }

  .badge {
    font-size: 20px;
  }
`;

// ============================================
// SHAREABLE ACHIEVEMENT CARD
// ============================================

const AchievementCardPreview = styled.div`
  background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%);
  border-radius: 20px;
  padding: 32px;
  text-align: center;
  border: 2px solid rgba(168, 85, 247, 0.4);
  max-width: 320px;
  margin: 0 auto;

  .badge-icon {
    font-size: 64px;
    margin-bottom: 16px;
  }

  .badge-name {
    font-size: 24px;
    font-weight: 700;
    background: linear-gradient(90deg, #a855f7, #ec4899);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 8px;
  }

  .user-name {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 16px;
  }

  .stats {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 4px;
  }

  .divider {
    width: 60%;
    height: 1px;
    background: rgba(255, 255, 255, 0.2);
    margin: 20px auto;
  }

  .branding {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
  }
`;

// ============================================
// SIMULATION CONTROLS
// ============================================

const SimControls = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
`;

const SimButton = styled.button`
  padding: 8px 16px;
  background: ${props => props.$variant === 'primary'
    ? 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)'
    : 'rgba(255, 255, 255, 0.1)'};
  border: 1px solid ${props => props.$variant === 'primary' ? 'transparent' : 'rgba(255, 255, 255, 0.2)'};
  border-radius: 8px;
  color: white;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// ============================================
// MAIN COMPONENT
// ============================================

const GUEST_BADGES = [
  { id: 1, icon: '🏠', name: 'Multi-Local Member', requirement: 'Active guest with 1+ booking', threshold: 1 },
  { id: 2, icon: '🌆', name: 'City Connector', requirement: '5 successful referrals', threshold: 5 },
  { id: 3, icon: '🦸', name: 'Housing Hero', requirement: '10 successful referrals', threshold: 10 },
  { id: 4, icon: '🚀', name: 'Split Lease Pioneer', requirement: '25 successful referrals', threshold: 25 },
];

const HOST_BADGES = [
  { id: 1, icon: '🔑', name: 'Host Member', requirement: 'Active host with 1+ listing', threshold: 1 },
  { id: 2, icon: '🏘️', name: 'Neighborhood Networker', requirement: '3 host referrals', threshold: 3 },
  { id: 3, icon: '🏢', name: 'Building Ambassador', requirement: '7 host referrals', threshold: 7 },
  { id: 4, icon: '👑', name: 'Founding Host', requirement: '15 host referrals + 1% revenue share', threshold: 15 },
];

const LEADERBOARD_DATA = [
  { rank: 1, name: 'Sarah M.', referrals: 27, badge: '🚀' },
  { rank: 2, name: 'Michael K.', referrals: 19, badge: '🦸' },
  { rank: 3, name: 'Jessica L.', referrals: 14, badge: '🦸' },
  { rank: 4, name: 'David R.', referrals: 8, badge: '🌆' },
  { rank: 5, name: 'Emily W.', referrals: 6, badge: '🌆' },
];

export default function ReferralDemoPage() {
  const [activeTab, setActiveTab] = useState('guest');
  const [referralCount, setReferralCount] = useState(7);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [totalSavings, setTotalSavings] = useState(12400);

  const badges = activeTab === 'guest' ? GUEST_BADGES : HOST_BADGES;
  const currentBadge = badges.filter(b => referralCount >= b.threshold).pop() || badges[0];
  const nextBadge = badges.find(b => referralCount < b.threshold);
  const progressPercent = nextBadge
    ? ((referralCount - (currentBadge?.threshold || 0)) / (nextBadge.threshold - (currentBadge?.threshold || 0))) * 100
    : 100;

  const simulateReferral = () => {
    const newCount = referralCount + 1;
    setReferralCount(newCount);
    setTotalSavings(prev => prev + 1800);

    // Check if we earned a new badge
    const newBadge = badges.find(b => b.threshold === newCount);
    if (newBadge) {
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 4000);
    }
  };

  const handleCopyLink = () => {
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const referralLink = `splitlease.com/r/happy-nest-${String(referralCount).padStart(3, '0')}`;

  const shareMessage = activeTab === 'guest'
    ? `Hey! I've been using Split Lease for my NYC trips and it's a game-changer.

Instead of $300/night hotels, I pay ~$100/night for the SAME apartment every time. I leave my stuff there, no packing/unpacking circus.

I've saved $${totalSavings.toLocaleString()} so far this year 🤯

Check it out: ${referralLink}`
    : `Hey! You mentioned you have that spare room/empty nights at your place.

I've been hosting on Split Lease and it's been great - made $${totalSavings.toLocaleString()} this year just from nights I wasn't using anyway.

It's not like Airbnb - guests are professionals who come the same nights every week, way less turnover.

Worth checking out: ${referralLink}`;

  return (
    <PageContainer>
      <Header>
        <Logo>Split Lease</Logo>
        <NavTabs>
          <NavTab $active={activeTab === 'guest'} onClick={() => setActiveTab('guest')}>
            Guest Program
          </NavTab>
          <NavTab $active={activeTab === 'host'} onClick={() => setActiveTab('host')}>
            Host Program
          </NavTab>
        </NavTabs>
      </Header>

      <MainContent>
        {/* Section 1: Program Overview */}
        <SectionTitle>
          {activeTab === 'guest' ? '🏠 Free Your Friends From Hotel Hell' : '🔑 Unlock the Empty Nights Network'}
        </SectionTitle>
        <SectionSubtitle>
          {activeTab === 'guest'
            ? 'Turn your savings into social proof. Every friend you rescue from hotel hell earns you status.'
            : 'Grow your network. Every host you bring in strengthens the Split Lease community.'}
        </SectionSubtitle>

        {/* Simulation Controls */}
        <SimControls>
          <SimButton $variant="primary" onClick={simulateReferral}>
            + Simulate Referral
          </SimButton>
          <SimButton onClick={() => setShowShareModal(true)}>
            Open Share Modal
          </SimButton>
          <SimButton onClick={() => { setReferralCount(0); setTotalSavings(0); }}>
            Reset
          </SimButton>
          <SimButton onClick={() => { setReferralCount(10); setTotalSavings(18000); }}>
            Set to 10 referrals
          </SimButton>
        </SimControls>

        <Grid>
          {/* Referral Card (Dashboard) */}
          <ReferralCardWrapper>
            <CardTitle>📊 Dashboard Referral Card</CardTitle>
            <ReferralCardHeader>
              <ReferralCardIcon>{currentBadge?.icon || '🏠'}</ReferralCardIcon>
              <ReferralCardTitle>
                <h4>{activeTab === 'guest' ? 'Free Your Friends From Hotel Hell' : 'Unlock the Empty Nights Network'}</h4>
                <p>You've {activeTab === 'guest' ? 'saved' : 'earned'} ${totalSavings.toLocaleString()} this year</p>
              </ReferralCardTitle>
            </ReferralCardHeader>

            <StatsRow>
              <Stat>
                <div className="label">{activeTab === 'guest' ? 'Friends Rescued' : 'Hosts Referred'}</div>
                <div className="value">{referralCount}</div>
              </Stat>
              <Stat>
                <div className="label">{activeTab === 'guest' ? 'Their Total Savings' : 'Their Total Earnings'}</div>
                <div className="value">${(totalSavings * 1.8).toLocaleString()}</div>
              </Stat>
            </StatsRow>

            {nextBadge && (
              <ProgressContainer>
                <ProgressLabel>
                  <span>Progress to {nextBadge.icon} {nextBadge.name}</span>
                  <span>{referralCount}/{nextBadge.threshold}</span>
                </ProgressLabel>
                <ProgressBar>
                  <ProgressFill $percent={Math.min(progressPercent, 100)} />
                </ProgressBar>
              </ProgressContainer>
            )}

            <ShareButtons>
              <ShareButton className="whatsapp" onClick={() => setShowShareModal(true)}>
                <span>📱</span> WhatsApp
              </ShareButton>
              <ShareButton className="email" onClick={() => setShowShareModal(true)}>
                <span>✉️</span> Email
              </ShareButton>
              <ShareButton className="copy" onClick={handleCopyLink}>
                <span>{copiedLink ? '✅' : '🔗'}</span> {copiedLink ? 'Copied!' : 'Copy Link'}
              </ShareButton>
            </ShareButtons>
          </ReferralCardWrapper>

          {/* Badge Progress */}
          <Card>
            <CardTitle>🏆 Badge Progress</CardTitle>
            {badges.map((badge) => (
              <BadgeCard
                key={badge.id}
                $active={currentBadge?.id === badge.id}
                $locked={referralCount < badge.threshold}
              >
                <BadgeIcon $locked={referralCount < badge.threshold}>
                  {badge.icon}
                </BadgeIcon>
                <BadgeInfo>
                  <div className="name">{badge.name}</div>
                  <div className="requirement">{badge.requirement}</div>
                  {referralCount >= badge.threshold && (
                    <div className="status">✓ Unlocked</div>
                  )}
                </BadgeInfo>
              </BadgeCard>
            ))}
          </Card>

          {/* Personalized Landing Page */}
          <Card>
            <CardTitle>🌐 Referral Landing Page</CardTitle>
            <LandingPreview>
              <LandingHeader>
                <h3>Alex thinks you'd love Split Lease</h3>
                <p>They've saved ${totalSavings.toLocaleString()} this year on NYC stays</p>
              </LandingHeader>
              <LandingBody>
                <ul className="value-props">
                  <li>
                    <span className="check">✓</span>
                    45% cheaper than Airbnb
                  </li>
                  <li>
                    <span className="check">✓</span>
                    Same apartment every trip
                  </li>
                  <li>
                    <span className="check">✓</span>
                    Leave your stuff - no packing
                  </li>
                  <li>
                    <span className="check">✓</span>
                    Pay only for nights you need
                  </li>
                </ul>
                <button className="cta-button">Explore Rentals</button>
              </LandingBody>
            </LandingPreview>
          </Card>

          {/* Shareable Achievement */}
          <Card>
            <CardTitle>🎨 Shareable Achievement Card</CardTitle>
            <AchievementCardPreview>
              <div className="badge-icon">{currentBadge?.icon || '🏠'}</div>
              <div className="badge-name">{currentBadge?.name || 'Multi-Local Member'}</div>
              <div className="user-name">Alex Thompson</div>
              <div className="stats">Rescued {referralCount} friends from hotel hell</div>
              <div className="stats">Combined savings: ${(totalSavings * 2.5).toLocaleString()}</div>
              <div className="divider" />
              <div className="branding">splitlease.com</div>
            </AchievementCardPreview>
          </Card>

          {/* Leaderboard */}
          <Card>
            <CardTitle>📈 Monthly Leaderboard</CardTitle>
            <LeaderboardTable>
              {LEADERBOARD_DATA.map((user) => (
                <LeaderboardRow key={user.rank} $rank={user.rank}>
                  <div className="rank">
                    {user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : user.rank === 3 ? '🥉' : user.rank}
                  </div>
                  <div className="avatar">{user.name.charAt(0)}</div>
                  <div className="name">{user.name}</div>
                  <div className="count">{user.referrals} referrals</div>
                  <div className="badge">{user.badge}</div>
                </LeaderboardRow>
              ))}
            </LeaderboardTable>
          </Card>

          {/* Impact Stats */}
          <Card>
            <CardTitle>📊 Your Impact</CardTitle>
            <div style={{ padding: '16px 0' }}>
              <StatsRow>
                <Stat>
                  <div className="label">Friends Rescued</div>
                  <div className="value">{referralCount}</div>
                </Stat>
                <Stat>
                  <div className="label">Hotel Nights Avoided</div>
                  <div className="value">{referralCount * 18}</div>
                </Stat>
              </StatsRow>
              <StatsRow>
                <Stat>
                  <div className="label">Combined Savings</div>
                  <div className="value">${(totalSavings * 2.5).toLocaleString()}</div>
                </Stat>
                <Stat>
                  <div className="label">Suitcases Not Packed</div>
                  <div className="value">{referralCount * 36}</div>
                </Stat>
              </StatsRow>
            </div>
          </Card>
        </Grid>
      </MainContent>

      {/* Share Modal */}
      {showShareModal && (
        <ModalOverlay onClick={() => setShowShareModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalClose onClick={() => setShowShareModal(false)}>×</ModalClose>
            <ModalTitle>Share Your Link</ModalTitle>
            <ModalSubtitle>Invite friends and climb the leaderboard</ModalSubtitle>

            <ReferralLinkBox>
              <input type="text" value={referralLink} readOnly />
              <button onClick={handleCopyLink}>{copiedLink ? 'Copied!' : 'Copy'}</button>
            </ReferralLinkBox>

            <MessagePreview>{shareMessage}</MessagePreview>

            <ShareOptionsGrid>
              <ShareOption>
                <span className="icon">💬</span>
                <span className="label">WhatsApp</span>
              </ShareOption>
              <ShareOption>
                <span className="icon">✉️</span>
                <span className="label">Email</span>
              </ShareOption>
              <ShareOption>
                <span className="icon">💼</span>
                <span className="label">LinkedIn</span>
              </ShareOption>
            </ShareOptionsGrid>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Achievement Notification */}
      {showNotification && (
        <NotificationToast>
          <div className="icon">{currentBadge?.icon}</div>
          <div className="content">
            <h4>New Badge Unlocked!</h4>
            <p>You've earned the {currentBadge?.name} badge</p>
          </div>
        </NotificationToast>
      )}
    </PageContainer>
  );
}
