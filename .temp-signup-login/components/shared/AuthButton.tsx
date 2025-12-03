/**
 * Reusable authentication button component
 * Supports primary, secondary, and outline variants with loading states
 */

import React from 'react';
import * as S from './AuthButton.styles';

export interface AuthButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium' | 'large';
  icon?: React.ReactNode;
}

export const AuthButton: React.FC<AuthButtonProps> = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled,
  loading,
  fullWidth = true,
  size = 'medium',
  icon,
}) => {
  return (
    <S.StyledButton
      type={type}
      onClick={onClick}
      $variant={variant}
      $size={size}
      disabled={disabled || loading}
      $fullWidth={fullWidth}
      aria-busy={loading}
    >
      {loading ? (
        <>
          <S.Spinner />
          <span>Processing...</span>
        </>
      ) : (
        <>
          {icon && <S.IconWrapper>{icon}</S.IconWrapper>}
          {children}
        </>
      )}
    </S.StyledButton>
  );
};
