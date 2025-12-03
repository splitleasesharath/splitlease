/**
 * Styles for AuthButton component
 */

import styled, { css } from 'styled-components';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'small' | 'medium' | 'large';

interface StyledButtonProps {
  $variant: ButtonVariant;
  $fullWidth: boolean;
  $size: ButtonSize;
}

const sizeStyles = {
  small: css`
    padding: 8px 16px;
    font-size: 14px;
  `,
  medium: css`
    padding: 12px 24px;
    font-size: 16px;
  `,
  large: css`
    padding: 16px 32px;
    font-size: 18px;
  `,
};

const variantStyles = {
  primary: css`
    background: #7C3AED;
    color: white;
    border: 2px solid #7C3AED;

    &:hover:not(:disabled) {
      background: #6D28D9;
      border-color: #6D28D9;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
    }

    &:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
    }
  `,
  secondary: css`
    background: #F3F4F6;
    color: #374151;
    border: 2px solid #E5E7EB;

    &:hover:not(:disabled) {
      background: #E5E7EB;
      border-color: #D1D5DB;
    }

    &:active:not(:disabled) {
      background: #D1D5DB;
    }
  `,
  outline: css`
    background: transparent;
    color: #7C3AED;
    border: 2px solid #7C3AED;

    &:hover:not(:disabled) {
      background: #F5F3FF;
      border-color: #6D28D9;
      color: #6D28D9;
    }

    &:active:not(:disabled) {
      background: #EDE9FE;
    }
  `,
  ghost: css`
    background: transparent;
    color: #7C3AED;
    border: 2px solid transparent;

    &:hover:not(:disabled) {
      background: #F5F3FF;
    }

    &:active:not(:disabled) {
      background: #EDE9FE;
    }
  `,
};

export const StyledButton = styled.button<StyledButtonProps>`
  width: ${props => props.$fullWidth ? '100%' : 'auto'};
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 200ms ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: inherit;
  position: relative;
  overflow: hidden;

  ${props => sizeStyles[props.$size]}
  ${props => variantStyles[props.$variant]}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
  }

  &:focus-visible {
    outline: 2px solid #7C3AED;
    outline-offset: 2px;
  }

  /* Ripple effect on click */
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
  }

  &:active:not(:disabled)::after {
    width: 300px;
    height: 300px;
  }
`;

export const Spinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 600ms linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

export const IconWrapper = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
`;
