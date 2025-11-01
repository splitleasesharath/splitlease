/**
 * @fileoverview Tests for useAuthMode hook
 * Tests mode management and toggling functionality
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuthMode } from './useAuthMode';
import type { AuthMode } from '../SignupLogin.types';

describe('useAuthMode', () => {
  it('initializes with default mode (signup)', () => {
    const { result } = renderHook(() => useAuthMode());

    expect(result.current.mode).toBe('signup');
  });

  it('initializes with provided mode', () => {
    const { result } = renderHook(() => useAuthMode('login'));

    expect(result.current.mode).toBe('login');
  });

  it('toggles from signup to login', () => {
    const { result } = renderHook(() => useAuthMode('signup'));

    act(() => {
      result.current.toggleMode();
    });

    expect(result.current.mode).toBe('login');
  });

  it('toggles from login to signup', () => {
    const { result } = renderHook(() => useAuthMode('login'));

    act(() => {
      result.current.toggleMode();
    });

    expect(result.current.mode).toBe('signup');
  });

  it('sets mode directly via setMode', () => {
    const { result } = renderHook(() => useAuthMode('signup'));

    act(() => {
      result.current.setMode('login');
    });

    expect(result.current.mode).toBe('login');

    act(() => {
      result.current.setMode('signup');
    });

    expect(result.current.mode).toBe('signup');
  });

  it('calls onModeChange callback when mode changes', () => {
    const onModeChange = vi.fn();
    const { result } = renderHook(() => useAuthMode('signup', onModeChange));

    act(() => {
      result.current.toggleMode();
    });

    expect(onModeChange).toHaveBeenCalledWith('login');
    expect(onModeChange).toHaveBeenCalledTimes(1);
  });

  it('calls onModeChange when using setMode', () => {
    const onModeChange = vi.fn();
    const { result } = renderHook(() => useAuthMode('signup', onModeChange));

    act(() => {
      result.current.setMode('login');
    });

    expect(onModeChange).toHaveBeenCalledWith('login');
  });

  it('does not call onModeChange if callback is undefined', () => {
    const { result } = renderHook(() => useAuthMode('signup'));

    // Should not throw error
    expect(() => {
      act(() => {
        result.current.toggleMode();
      });
    }).not.toThrow();
  });

  it('maintains stable function references', () => {
    const { result, rerender } = renderHook(() => useAuthMode('signup'));

    const toggleMode1 = result.current.toggleMode;
    const setMode1 = result.current.setMode;

    rerender();

    const toggleMode2 = result.current.toggleMode;
    const setMode2 = result.current.setMode;

    expect(toggleMode1).toBe(toggleMode2);
    expect(setMode1).toBe(setMode2);
  });
});
