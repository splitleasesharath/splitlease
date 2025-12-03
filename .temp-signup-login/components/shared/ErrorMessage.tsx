/**
 * Reusable error message component
 * Displays validation and authentication errors
 */

import React from 'react';
import styled from 'styled-components';

export interface ErrorMessageProps {
  message: string;
  variant?: 'error' | 'warning' | 'info';
  onDismiss?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  variant = 'error',
  onDismiss,
}) => {
  if (!message) return null;

  return (
    <Container $variant={variant} role="alert">
      <IconWrapper>
        {variant === 'error' && <ErrorIcon />}
        {variant === 'warning' && <WarningIcon />}
        {variant === 'info' && <InfoIcon />}
      </IconWrapper>
      <Message>{message}</Message>
      {onDismiss && (
        <DismissButton
          onClick={onDismiss}
          aria-label="Dismiss message"
          type="button"
        >
          <CloseIcon />
        </DismissButton>
      )}
    </Container>
  );
};

const Container = styled.div<{ $variant: 'error' | 'warning' | 'info' }>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  animation: slideDown 200ms ease-out;

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  ${props => {
    switch (props.$variant) {
      case 'error':
        return `
          background: #FEE2E2;
          border: 1px solid #FCA5A5;
          color: #991B1B;
        `;
      case 'warning':
        return `
          background: #FEF3C7;
          border: 1px solid #FCD34D;
          color: #92400E;
        `;
      case 'info':
        return `
          background: #DBEAFE;
          border: 1px solid #93C5FD;
          color: #1E40AF;
        `;
    }
  }}
`;

const IconWrapper = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
`;

const Message = styled.div`
  flex: 1;
  line-height: 1.5;
`;

const DismissButton = styled.button`
  flex-shrink: 0;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  color: inherit;
  opacity: 0.6;
  transition: opacity 150ms ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    opacity: 1;
  }

  &:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
    border-radius: 4px;
  }
`;

// Icon components
const ErrorIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

const WarningIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

const InfoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
