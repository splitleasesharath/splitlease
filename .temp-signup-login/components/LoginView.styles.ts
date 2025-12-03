/**
 * Styles for LoginView component
 */

import styled from 'styled-components';

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  position: relative;
`;

export const BackButton = styled.button`
  position: absolute;
  top: -8px;
  left: -8px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: #6B7280;
  cursor: pointer;
  font-size: 14px;
  padding: 8px;
  border-radius: 6px;
  transition: all 150ms ease;

  &:hover {
    color: #374151;
    background: #F3F4F6;
  }

  &:focus-visible {
    outline: 2px solid #7C3AED;
    outline-offset: 2px;
  }
`;

export const BackIcon = styled.span`
  font-size: 18px;
  line-height: 1;
`;

export const Header = styled.div`
  text-align: center;
  margin-top: 24px;
`;

export const Title = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: #1F2937;
  margin: 0 0 8px 0;
`;

export const Subtitle = styled.p`
  font-size: 14px;
  color: #6B7280;
  margin: 0;
`;

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const ForgotPasswordLink = styled.button`
  background: none;
  border: none;
  color: #7C3AED;
  text-decoration: underline;
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  text-align: right;
  align-self: flex-end;
  margin-top: -8px;

  &:hover {
    color: #6D28D9;
  }

  &:focus-visible {
    outline: 2px solid #7C3AED;
    outline-offset: 2px;
    border-radius: 4px;
    padding: 2px 4px;
  }
`;

export const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 4px 0;
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

export const SocialButtons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const BottomSection = styled.div`
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 8px;
  border-top: 1px solid #E5E7EB;
`;

export const Text = styled.span`
  color: #6B7280;
  font-size: 14px;
`;

export const Link = styled.button`
  background: none;
  border: none;
  color: #7C3AED;
  text-decoration: underline;
  cursor: pointer;
  font-size: 14px;
  padding: 0;

  &:hover {
    color: #6D28D9;
  }

  &:focus-visible {
    outline: 2px solid #7C3AED;
    outline-offset: 2px;
    border-radius: 4px;
    padding: 2px 4px;
  }
`;

// Magic Link Success Screen Styles
export const SuccessContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px 0;
  text-align: center;
`;

export const SuccessIcon = styled.div`
  color: #10B981;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
`;

export const SuccessTitle = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: #1F2937;
  margin: 0 0 8px 0;
`;

export const SuccessText = styled.p`
  font-size: 14px;
  color: #6B7280;
  margin: 0;
  line-height: 1.5;
`;

export const EmailDisplay = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #7C3AED;
  padding: 12px 20px;
  background: #F5F3FF;
  border-radius: 8px;
  border: 1px solid #DDD6FE;
  margin: 8px 0;
`;

export const SuccessNote = styled.p`
  font-size: 13px;
  color: #9CA3AF;
  margin: 0;
  line-height: 1.6;
  max-width: 400px;
`;

export const InstructionBox = styled.div`
  display: flex;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%);
  border: 1px solid #BAE6FD;
  border-radius: 12px;
  margin: 8px 0;
  max-width: 420px;
`;

export const InstructionIcon = styled.span`
  font-size: 24px;
  flex-shrink: 0;
`;

export const InstructionText = styled.p`
  font-size: 14px;
  color: #075985;
  margin: 0;
  line-height: 1.6;
  text-align: left;
`;

export const BackToLogin = styled.div`
  text-align: center;
  margin-top: 16px;
`;
