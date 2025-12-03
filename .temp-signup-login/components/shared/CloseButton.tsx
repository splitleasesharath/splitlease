/**
 * Close button component for modal
 */

import React from 'react';
import styled from 'styled-components';

export interface CloseButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export const CloseButton: React.FC<CloseButtonProps> = ({
  onClick,
  disabled = false,
}) => {
  return (
    <StyledCloseButton
      onClick={onClick}
      disabled={disabled}
      aria-label="Close modal"
      type="button"
    >
      <CloseIcon />
    </StyledCloseButton>
  );
};

const StyledCloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: transparent;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: #6B7280;
  border-radius: 6px;
  transition: all 150ms ease;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;

  &:hover:not(:disabled) {
    background: #F3F4F6;
    color: #374151;
  }

  &:active:not(:disabled) {
    background: #E5E7EB;
  }

  &:focus-visible {
    outline: 2px solid #7C3AED;
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
