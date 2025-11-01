/**
 * @fileoverview Tests for useLoginForm hook
 * Tests login form state management, validation, and submission
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLoginForm } from './useLoginForm';

describe('useLoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with default values', () => {
    const { result } = renderHook(() => useLoginForm());

    expect(result.current.formData).toEqual({
      email: '',
      password: '',
      rememberMe: false,
    });
    expect(result.current.errors).toEqual({});
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.submissionError).toBeNull();
  });

  it('updates email field', () => {
    const { result } = renderHook(() => useLoginForm());

    act(() => {
      result.current.handleFieldChange('email', 'test@example.com');
    });

    expect(result.current.formData.email).toBe('test@example.com');
  });

  it('updates password field', () => {
    const { result } = renderHook(() => useLoginForm());

    act(() => {
      result.current.handleFieldChange('password', 'password123');
    });

    expect(result.current.formData.password).toBe('password123');
  });

  it('toggles rememberMe field', () => {
    const { result } = renderHook(() => useLoginForm());

    act(() => {
      result.current.handleFieldChange('rememberMe', true);
    });

    expect(result.current.formData.rememberMe).toBe(true);

    act(() => {
      result.current.handleFieldChange('rememberMe', false);
    });

    expect(result.current.formData.rememberMe).toBe(false);
  });

  it('validates email format on blur', () => {
    const { result } = renderHook(() => useLoginForm());

    act(() => {
      result.current.handleFieldChange('email', 'invalid-email');
    });

    act(() => {
      result.current.handleFieldBlur('email');
    });

    expect(result.current.errors.email).toBeTruthy();
  });

  it('validates required email field', () => {
    const { result } = renderHook(() => useLoginForm());

    act(() => {
      result.current.handleFieldBlur('email');
    });

    expect(result.current.errors.email).toBe('Email is required');
  });

  it('validates required password field', () => {
    const { result } = renderHook(() => useLoginForm());

    act(() => {
      result.current.handleFieldBlur('password');
    });

    expect(result.current.errors.password).toBe('Password is required');
  });

  it('clears error when field value changes', () => {
    const { result } = renderHook(() => useLoginForm());

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

  it('handles successful form submission', async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useLoginForm(onSuccess));

    act(() => {
      result.current.handleFieldChange('email', 'test@example.com');
      result.current.handleFieldChange('password', 'password123');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: false,
      });
    });
  });

  it('sets isSubmitting during submission', async () => {
    const onSuccess = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => setTimeout(resolve, 100));
    });
    const { result } = renderHook(() => useLoginForm(onSuccess));

    act(() => {
      result.current.handleFieldChange('email', 'test@example.com');
      result.current.handleFieldChange('password', 'password123');
    });

    const submitPromise = act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.isSubmitting).toBe(true);

    await submitPromise;

    expect(result.current.isSubmitting).toBe(false);
  });

  it('shows validation errors on submit with invalid data', async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useLoginForm(onSuccess));

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.errors.email).toBeTruthy();
    expect(result.current.errors.password).toBeTruthy();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('handles submission errors', async () => {
    const onSuccess = vi.fn().mockRejectedValue(new Error('Login failed'));
    const { result } = renderHook(() => useLoginForm(onSuccess));

    act(() => {
      result.current.handleFieldChange('email', 'test@example.com');
      result.current.handleFieldChange('password', 'password123');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    await waitFor(() => {
      expect(result.current.submissionError).toBe('Login failed');
    });
  });

  it('handles null/undefined onSuccess callback', async () => {
    const { result } = renderHook(() => useLoginForm());

    act(() => {
      result.current.handleFieldChange('email', 'test@example.com');
      result.current.handleFieldChange('password', 'password123');
    });

    // Should not throw
    await expect(
      act(async () => {
        await result.current.handleSubmit();
      })
    ).resolves.not.toThrow();
  });

  it('maintains stable callback references', () => {
    const { result, rerender } = renderHook(() => useLoginForm());

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

  it('trims whitespace from email', () => {
    const { result } = renderHook(() => useLoginForm());

    act(() => {
      result.current.handleFieldChange('email', '  test@example.com  ');
    });

    expect(result.current.formData.email).toBe('test@example.com');
  });
});
