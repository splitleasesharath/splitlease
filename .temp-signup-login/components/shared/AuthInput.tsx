/**
 * Reusable authentication input component
 * Handles email, password, and text inputs with validation
 */

import React, { useState } from 'react';
import * as S from './AuthInput.styles';
import { EyeIcon, EyeOffIcon } from './Icons';

export interface AuthInputProps {
  type: 'email' | 'password' | 'text' | 'date';
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  label?: string;
  autoFocus?: boolean;
  showPasswordToggle?: boolean;
  disabled?: boolean;
  name?: string;
  autoComplete?: string;
  onBlur?: () => void;
  onFocus?: () => void;
}

export const AuthInput: React.FC<AuthInputProps> = ({
  type,
  placeholder,
  value,
  onChange,
  error,
  label,
  autoFocus,
  showPasswordToggle = type === 'password',
  disabled = false,
  name,
  autoComplete,
  onBlur,
  onFocus,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputType = showPasswordToggle && showPassword ? 'text' : type;

  return (
    <S.Container>
      {label && <S.Label htmlFor={name}>{label}</S.Label>}
      <S.InputWrapper $hasError={!!error}>
        <S.Input
          id={name}
          name={name}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onFocus={onFocus}
          autoFocus={autoFocus}
          disabled={disabled}
          autoComplete={autoComplete}
          $hasError={!!error}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
        />
        {showPasswordToggle && (
          <S.IconButton
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOffIcon />
            ) : (
              <EyeIcon />
            )}
          </S.IconButton>
        )}
      </S.InputWrapper>
      {error && (
        <S.Error id={`${name}-error`} role="alert">
          {error}
        </S.Error>
      )}
    </S.Container>
  );
};
