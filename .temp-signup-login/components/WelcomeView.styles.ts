/**
 * Styles for WelcomeView component
 */

import styled from 'styled-components';

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
`;

export const Header = styled.div`
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const Logo = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
`;

export const LogoText = styled.h1`
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
`;

export const Title = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: #1F2937;
  margin: 0;
`;

export const Subtitle = styled.p`
  font-size: 16px;
  color: #6B7280;
  margin: 0;
`;

export const ReferralBanner = styled.div`
  display: flex;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
  border: 1px solid #FCD34D;
  border-radius: 8px;
  animation: slideIn 300ms ease-out;

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

export const ReferralIcon = styled.div`
  font-size: 24px;
  flex-shrink: 0;
`;

export const ReferralContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const ReferralTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #92400E;
`;

export const ReferralText = styled.div`
  font-size: 14px;
  color: #78350F;
  line-height: 1.5;

  strong {
    font-weight: 600;
  }
`;

export const ActionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 8px 0;
`;

export const DividerLine = styled.div`
  flex: 1;
  height: 1px;
  background: #E5E7EB;
`;

export const DividerText = styled.span`
  font-size: 14px;
  color: #9CA3AF;
  font-weight: 500;
`;

export const Footer = styled.div`
  text-align: center;
  margin-top: 8px;
`;

export const FooterText = styled.p`
  font-size: 12px;
  color: #9CA3AF;
  line-height: 1.5;
  margin: 0;
`;

export const Link = styled.a`
  color: #7C3AED;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;
