/**
 * @fileoverview Tests for useSignupForm hook
 * Tests signup form state management, validation, password strength, and submission
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSignupForm } from './useSignupForm';

describe('useSignupForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with default values', () => {
    const { result } = renderHook(() => useSignupForm());

    expect(result.current.formData).toEqual({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      termsAccepted: false,
    });
    expect(result.current.errors).toEqual({});
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.submissionError).toBeNull();
    expect(result.current.passwordStrength).toBeNull();
  });

  it('updates firstName field', () => {
    const { result } = renderHook(() => useSignupForm());

    act(() => {
      result.current.handleFieldChange('firstName', 'John');
    });

    expect(result.current.formData.firstName).toBe('John');
  });

  it('updates lastName field', () => {
    const { result } = renderHook(() => useSignupForm());

    act(() => {
      result.current.handleFieldChange('lastName', 'Doe');
    });

    expect(result.current.formData.lastName).toBe('Doe');
  });

  it('updates email field', () => {
    const { result } = renderHook(() => useSignupForm());

    act(() => {
      result.current.handleFieldChange('email', 'john@example.com');
    });

    expect(result.current.formData.email).toBe('john@example.com');
  });

  it('updates password field and calculates strength', () => {
    const { result } = renderHook(() => useSignupForm());

    act(() => {
      result.current.handleFieldChange('password', 'Password123!');
    });

    expect(result.current.formData.password).toBe('Password123!');
    expect(result.current.passwordStrength).toBeTruthy();
  });

  it('updates confirmPassword field', () => {
    const { result } = renderHook(() => useSignupForm());

    act(() => {
      result.current.handleFieldChange('confirmPassword', 'Password123!');
    });

    expect(result.current.formData.confirmPassword).toBe('Password123!');
  });

  it('toggles termsAccepted field', () => {
    const { result } = renderHook(() => useSignupForm());

    act(() => {
      result.current.handleFieldChange('termsAccepted', true);
    });

    expect(result.current.formData.termsAccepted).toBe(true);
  });

  it('validates email format on blur', () => {
    const { result } = renderHook(() => useSignupForm());

    act(() => {
      result.current.handleFieldChange('email', 'invalid-email');
    });

    act(() => {
      result.current.handleFieldBlur('email');
    });

    expect(result.current.errors.email).toBeTruthy();
  });

  it('validates password strength requirements', () => {
    const { result } = renderHook(() => useSignupForm());

    // Too short
    act(() => {
      result.current.handleFieldChange('password', 'Pass1!');
      result.current.handleFieldBlur('password');
    });

    expect(result.current.errors.password).toContain('at least 8 characters');
  });

  it('validates password missing uppercase', () => {
    const { result } = renderHook(() => useSignupForm());

    act(() => {
      result.current.handleFieldChange('password', 'password123!');
      result.current.handleFieldBlur('password');
    });

    expect(result.current.errors.password).toContain('uppercase letter');
  });

  it('validates password missing lowercase', () => {
    const { result } = renderHook(() => useSignupForm());

    act(() => {
      result.current.handleFieldChange('password', 'PASSWORD123!');
      result.current.handleFieldBlur('password');
    });

    expect(result.current.errors.password).toContain('lowercase letter');
  });

  it('validates password missing number', () => {
    const { result } = renderHook(() => useSignupForm());

    act(() => {
      result.current.handleFieldChange('password', 'Password!');
      result.current.handleFieldBlur('password');
    });

    expect(result.current.errors.password).toContain('number');
  });

  it('validates password missing special character', () => {
    const { result } = renderHook(() => useSignupForm());

    act(() => {
      result.current.handleFieldChange('password', 'Password123');
      result.current.handleFieldBlur('password');
    });

    expect(result.current.errors.password).toContain('special character');
  });

  it('validates passwords match', () => {
    const { result } = renderHook(() => useSignupForm());

    act(() => {
      result.current.handleFieldChange('password', 'Password123!');
      result.current.handleFieldChange('confirmPassword', 'DifferentPass123!');
      result.current.handleFieldBlur('confirmPassword');
    });

    expect(result.current.errors.confirmPassword).toContain('do not match');
  });

  it('validates name field (firstName)', () => {
    const { result } = renderHook(() => useSignupForm());

    act(() => {
      result.current.handleFieldChange('firstName', 'J');
      result.current.handleFieldBlur('firstName');
    });

    expect(result.current.errors.firstName).toContain('at least 2 characters');
  });

  it('validates name contains only valid characters', () => {
    const { result } = renderHook(() => useSignupForm());

    act(() => {
      result.current.handleFieldChange('firstName', 'John123');
      result.current.handleFieldBlur('firstName');
    });

    expect(result.current.errors.firstName).toBeTruthy();
  });

  it('validates terms acceptance', () => {
    const { result } = renderHook(() => useSignupForm());

    act(() => {
      result.current.handleFieldBlur('termsAccepted');
    });

    expect(result.current.errors.termsAccepted).toContain('accept the terms');
  });

  it('clears error when field value changes', () => {
    const { result } = renderHook(() => useSignupForm());

    // Set an error
    act(() => {
      result.current.handleFieldBlur('email');
    });

    expect(result.current.errors.email).toBeTruthy();

    // Update field - error should clear
    act(() => {
      result.current.handleFieldChange('email', 'test@example.com');
    });

    expect(result.current.errors.email).toBeUndefined();
  });

  it('calculates weak password strength', () => {
    const { result } = renderHook(() => useSignupForm());

    act(() => {
      result.current.handleFieldChange('password', 'Pass123!');
    });

    expect(result.current.passwordStrength?.strength).toBe('weak');
  });

  it('calculates medium password strength', () => {
    const { result } = renderHook(() => useSignupForm());

    act(() => {
      result.current.handleFieldChange('password', 'Password123!');
    });

    expect(result.current.passwordStrength?.strength).toBe('medium');
  });

  it('calculates strong password strength', () => {
    const { result } = renderHook(() => useSignupForm());

    act(() => {
      result.current.handleFieldChange('password', 'MyV3ryStr0ng!P@ssw0rd');
    });

    expect(result.current.passwordStrength?.strength).toBe('strong');
  });

  it('handles successful form submission', async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useSignupForm(onSuccess));

    act(() => {
      result.current.handleFieldChange('firstName', 'John');
      result.current.handleFieldChange('lastName', 'Doe');
      result.current.handleFieldChange('email', 'john@example.com');
      result.current.handleFieldChange('password', 'Password123!');
      result.current.handleFieldChange('confirmPassword', 'Password123!');
      result.current.handleFieldChange('termsAccepted', true);
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        termsAccepted: true,
      });
    });
  });

  it('clears form after successful submission', async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useSignupForm(onSuccess));

    act(() => {
      result.current.handleFieldChange('firstName', 'John');
      result.current.handleFieldChange('lastName', 'Doe');
      result.current.handleFieldChange('email', 'john@example.com');
      result.current.handleFieldChange('password', 'Password123!');
      result.current.handleFieldChange('confirmPassword', 'Password123!');
      result.current.handleFieldChange('termsAccepted', true);
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    await waitFor(() => {
      expect(result.current.formData.firstName).toBe('');
      expect(result.current.formData.email).toBe('');
      expect(result.current.formData.password).toBe('');
    });
  });

  it('shows validation errors on submit with invalid data', async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useSignupForm(onSuccess));

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.errors.firstName).toBeTruthy();
    expect(result.current.errors.lastName).toBeTruthy();
    expect(result.current.errors.email).toBeTruthy();
    expect(result.current.errors.password).toBeTruthy();
    expect(result.current.errors.termsAccepted).toBeTruthy();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('handles submission errors', async () => {
    const onSuccess = vi.fn().mockRejectedValue(new Error('Signup failed'));
    const { result } = renderHook(() => useSignupForm(onSuccess));

    act(() => {
      result.current.handleFieldChange('firstName', 'John');
      result.current.handleFieldChange('lastName', 'Doe');
      result.current.handleFieldChange('email', 'john@example.com');
      result.current.handleFieldChange('password', 'Password123!');
      result.current.handleFieldChange('confirmPassword', 'Password123!');
      result.current.handleFieldChange('termsAccepted', true);
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    await waitFor(() => {
      expect(result.current.submissionError).toBe('Signup failed');
    });
  });

  it('handles null/undefined onSuccess callback', async () => {
    const { result } = renderHook(() => useSignupForm());

    act(() => {
      result.current.handleFieldChange('firstName', 'John');
      result.current.handleFieldChange('lastName', 'Doe');
      result.current.handleFieldChange('email', 'john@example.com');
      result.current.handleFieldChange('password', 'Password123!');
      result.current.handleFieldChange('confirmPassword', 'Password123!');
      result.current.handleFieldChange('termsAccepted', true);
    });

    // Should not throw
    await expect(
      act(async () => {
        await result.current.handleSubmit();
      })
    ).resolves.not.toThrow();
  });

  it('maintains stable callback references', () => {
    const { result, rerender } = renderHook(() => useSignupForm());

    const handleFieldChange1 = result.current.handleFieldChange;
    const handleFieldBlur1 = result.current.handleFieldBlur;
    const handleSubmit1 = result.current.handleSubmit;

    rerender();

    const handleFieldChange2 = result.current.handleFieldChange;
    const handleFieldBlur2 = result.current.handleFieldBlur;
    const handleSubmit2 = result.current.handleSubmit;

    expect(handleFieldChange1).toBe(handleFieldChange2);
    expect(handleFieldBlur1).toBe(handleFieldBlur2);
    expect(handleSubmit1).toBe(handleSubmit2);
  });

  it('trims whitespace from name fields', () => {
    const { result } = renderHook(() => useSignupForm());

    act(() => {
      result.current.handleFieldChange('firstName', '  John  ');
    });

    expect(result.current.formData.firstName).toBe('John');
  });

  it('trims whitespace from email', () => {
    const { result } = renderHook(() => useSignupForm());

    act(() => {
      result.current.handleFieldChange('email', '  john@example.com  ');
    });

    expect(result.current.formData.email).toBe('john@example.com');
  });
});
