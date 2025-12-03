/**
 * Styles for PasswordResetView component
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
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
`;

export const Icon = styled.div`
  color: #7C3AED;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const Title = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: #1F2937;
  margin: 0;
`;

export const Subtitle = styled.p`
  font-size: 14px;
  color: #6B7280;
  margin: 0;
  max-width: 320px;
  line-height: 1.5;
`;

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const InfoBox = styled.div`
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  background: #F0F9FF;
  border: 1px solid #BAE6FD;
  border-radius: 8px;
  margin-top: 8px;
`;

export const InfoIcon = styled.span`
  font-size: 18px;
  flex-shrink: 0;
`;

export const InfoText = styled.p`
  font-size: 13px;
  color: #075985;
  margin: 0;
  line-height: 1.5;
`;

export const SuccessContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px 0;
  text-align: center;
  animation: fadeIn 300ms ease-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
`;

export const SuccessIcon = styled.div`
  color: #10B981;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: checkmark 400ms ease-out;

  @keyframes checkmark {
    0% {
      transform: scale(0);
      opacity: 0;
    }
    50% {
      transform: scale(1.1);
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }
`;

export const SuccessTitle = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: #1F2937;
  margin: 0;
`;

export const SuccessText = styled.p`
  font-size: 14px;
  color: #6B7280;
  margin: 0;
  line-height: 1.6;
  max-width: 320px;

  strong {
    color: #374151;
    font-weight: 600;
  }
`;

export const SuccessNote = styled.p`
  font-size: 13px;
  color: #9CA3AF;
  margin: 0;
  font-style: italic;
`;

export const ResendButton = styled.button`
  background: none;
  border: none;
  color: #7C3AED;
  text-decoration: underline;
  cursor: pointer;
  font-size: 14px;
  padding: 8px;
  margin-top: 8px;

  &:hover {
    color: #6D28D9;
  }

  &:focus-visible {
    outline: 2px solid #7C3AED;
    outline-offset: 2px;
    border-radius: 4px;
  }
`;
