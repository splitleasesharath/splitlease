/**
 * useSignupForm Hook Tests
 *
 * TDD approach: Write failing tests first, then implement the hook
 *
 * Tests cover:
 * - Form state initialization
 * - Field updates
 * - Step navigation
 * - Form submission
 * - Validation integration
 * - Error handling
 *
 * Target: >90% code coverage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSignupForm } from './useSignupForm';
import { FormStep } from '../SignupTrialHost.types';
import type { UseSignupFormOptions, ValidatedFormData } from '../SignupTrialHost.types';

describe('useSignupForm Hook', () => {
  let mockOnSubmit: ReturnType<typeof vi.fn>;
  let mockOnSuccess: ReturnType<typeof vi.fn>;
  let mockOnError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSubmit = vi.fn().mockResolvedValue(undefined);
    mockOnSuccess = vi.fn();
    mockOnError = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with empty form state', () => {
      const { result } = renderHook(() => useSignupForm({}));

      expect(result.current.formData.personalInfo.fullName).toBe('');
      expect(result.current.formData.personalInfo.email).toBe('');
      expect(result.current.formData.personalInfo.phone).toBe('');
      expect(result.current.formData.propertyInfo.address).toBe('');
      expect(result.current.formData.trialPreferences.termsAccepted).toBe(false);
    });

    it('should initialize at step 1 by default', () => {
      const { result } = renderHook(() => useSignupForm({}));

      expect(result.current.currentStep).toBe(FormStep.PersonalInfo);
      expect(result.current.isFirstStep).toBe(true);
      expect(result.current.isLastStep).toBe(false);
    });

    it('should initialize with custom initial step', () => {
      const { result } = renderHook(() =>
        useSignupForm({ initialStep: FormStep.PropertyInfo })
      );

      expect(result.current.currentStep).toBe(FormStep.PropertyInfo);
    });

    it('should initialize with initial data', () => {
      const initialData = {
        personalInfo: {
          fullName: 'John Doe',
          email: 'john@example.com',
          phone: '1234567890',
        },
      };

      const { result } = renderHook(() => useSignupForm({ initialData }));

      expect(result.current.formData.personalInfo.fullName).toBe('John Doe');
      expect(result.current.formData.personalInfo.email).toBe('john@example.com');
      expect(result.current.formData.personalInfo.phone).toBe('1234567890');
    });

    it('should initialize with empty errors', () => {
      const { result } = renderHook(() => useSignupForm({}));

      expect(Object.keys(result.current.errors)).toHaveLength(0);
      expect(result.current.hasErrors).toBe(false);
    });

    it('should initialize with idle submission state', () => {
      const { result } = renderHook(() => useSignupForm({}));

      expect(result.current.submissionState).toBe('idle');
      expect(result.current.isSubmitting).toBe(false);
    });

    it('should initialize with 0% progress', () => {
      const { result } = renderHook(() => useSignupForm({}));

      expect(result.current.progress).toBe(0);
    });
  });

  describe('Field Updates', () => {
    it('should update field value on change', () => {
      const { result } = renderHook(() => useSignupForm({}));

      act(() => {
        result.current.handleChange('fullName', 'John Doe');
      });

      expect(result.current.formData.personalInfo.fullName).toBe('John Doe');
    });

    it('should update multiple fields independently', () => {
      const { result } = renderHook(() => useSignupForm({}));

      act(() => {
        result.current.handleChange('fullName', 'John Doe');
        result.current.handleChange('email', 'john@example.com');
        result.current.handleChange('phone', '1234567890');
      });

      expect(result.current.formData.personalInfo.fullName).toBe('John Doe');
      expect(result.current.formData.personalInfo.email).toBe('john@example.com');
      expect(result.current.formData.personalInfo.phone).toBe('1234567890');
    });

    it('should handle boolean values for checkbox fields', () => {
      const { result } = renderHook(() => useSignupForm({}));

      act(() => {
        result.current.handleChange('termsAccepted', true);
      });

      expect(result.current.formData.trialPreferences.termsAccepted).toBe(true);
    });

    it('should handle number values for numeric fields', () => {
      const { result } = renderHook(() => useSignupForm({}));

      act(() => {
        result.current.handleChange('bedrooms', 3);
        result.current.handleChange('bathrooms', 2.5);
      });

      expect(result.current.formData.propertyInfo.bedrooms).toBe(3);
      expect(result.current.formData.propertyInfo.bathrooms).toBe(2.5);
    });
  });

  describe('Touch State', () => {
    it('should mark field as touched on blur', () => {
      const { result } = renderHook(() => useSignupForm({}));

      act(() => {
        result.current.handleBlur('email');
      });

      expect(result.current.touched.email).toBe(true);
    });

    it('should validate field on blur', () => {
      const { result } = renderHook(() => useSignupForm({}));

      act(() => {
        result.current.handleChange('email', 'invalid-email');
        result.current.handleBlur('email');
      });

      expect(result.current.errors.email).toBeDefined();
    });

    it('should not show error until field is touched', () => {
      const { result } = renderHook(() => useSignupForm({}));

      act(() => {
        result.current.handleChange('email', 'invalid-email');
      });

      // Error exists but shouldn't be displayed until touched
      expect(result.current.touched.email).toBeFalsy();
    });
  });

  describe('Step Navigation - Forward', () => {
    it('should not navigate to next step with invalid data', () => {
      const { result } = renderHook(() => useSignupForm({}));

      act(() => {
        result.current.handleNext();
      });

      expect(result.current.currentStep).toBe(FormStep.PersonalInfo);
      expect(result.current.hasErrors).toBe(true);
    });

    it('should navigate to next step with valid data', () => {
      const { result } = renderHook(() => useSignupForm({}));

      act(() => {
        result.current.handleChange('fullName', 'John Doe');
        result.current.handleChange('email', 'john@example.com');
        result.current.handleChange('phone', '1234567890');
        result.current.handleNext();
      });

      expect(result.current.currentStep).toBe(FormStep.PropertyInfo);
    });

    it('should clear errors when navigating to next step with valid data', () => {
      const { result } = renderHook(() => useSignupForm({}));

      act(() => {
        // First, trigger errors
        result.current.handleNext();
      });

      expect(result.current.hasErrors).toBe(true);

      act(() => {
        // Then fix the data and navigate
        result.current.handleChange('fullName', 'John Doe');
        result.current.handleChange('email', 'john@example.com');
        result.current.handleChange('phone', '1234567890');
        result.current.handleNext();
      });

      expect(result.current.currentStep).toBe(FormStep.PropertyInfo);
      expect(result.current.hasErrors).toBe(false);
    });

    it('should not navigate past the last step', () => {
      const { result } = renderHook(() =>
        useSignupForm({ initialStep: FormStep.TrialPreferences })
      );

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      act(() => {
        result.current.handleChange('startDate', futureDate.toISOString().split('T')[0]);
        result.current.handleChange('duration', 14);
        result.current.handleChange('termsAccepted', true);
        result.current.handleNext();
      });

      expect(result.current.currentStep).toBe(FormStep.TrialPreferences);
    });

    it('should update canGoNext based on current step validation', () => {
      const { result } = renderHook(() => useSignupForm({}));

      expect(result.current.canGoNext).toBe(false);

      act(() => {
        result.current.handleChange('fullName', 'John Doe');
        result.current.handleChange('email', 'john@example.com');
        result.current.handleChange('phone', '1234567890');
      });

      expect(result.current.canGoNext).toBe(true);
    });
  });

  describe('Step Navigation - Backward', () => {
    it('should navigate to previous step', () => {
      const { result } = renderHook(() =>
        useSignupForm({ initialStep: FormStep.PropertyInfo })
      );

      act(() => {
        result.current.handleBack();
      });

      expect(result.current.currentStep).toBe(FormStep.PersonalInfo);
    });

    it('should not navigate before the first step', () => {
      const { result } = renderHook(() => useSignupForm({}));

      act(() => {
        result.current.handleBack();
      });

      expect(result.current.currentStep).toBe(FormStep.PersonalInfo);
    });

    it('should not validate when going back', () => {
      const { result } = renderHook(() =>
        useSignupForm({ initialStep: FormStep.PropertyInfo })
      );

      act(() => {
        // Don't fill in any data
        result.current.handleBack();
      });

      expect(result.current.currentStep).toBe(FormStep.PersonalInfo);
      expect(result.current.hasErrors).toBe(false);
    });

    it('should preserve data when going back', () => {
      const { result } = renderHook(() =>
        useSignupForm({ initialStep: FormStep.PropertyInfo })
      );

      act(() => {
        result.current.handleChange('address', '123 Main St');
        result.current.handleBack();
      });

      expect(result.current.formData.propertyInfo.address).toBe('123 Main St');
    });

    it('should update canGoBack based on current step', () => {
      const { result } = renderHook(() => useSignupForm({}));

      expect(result.current.canGoBack).toBe(false);

      act(() => {
        result.current.handleChange('fullName', 'John Doe');
        result.current.handleChange('email', 'john@example.com');
        result.current.handleChange('phone', '1234567890');
        result.current.handleNext();
      });

      expect(result.current.canGoBack).toBe(true);
    });
  });

  describe('Direct Step Navigation', () => {
    it('should allow going to specific step', () => {
      const { result } = renderHook(() => useSignupForm({}));

      act(() => {
        result.current.goToStep(FormStep.TrialPreferences);
      });

      expect(result.current.currentStep).toBe(FormStep.TrialPreferences);
    });
  });

  describe('Progress Tracking', () => {
    it('should calculate progress for step 1', () => {
      const { result } = renderHook(() => useSignupForm({}));

      expect(result.current.progress).toBe(0);
    });

    it('should calculate progress for step 2', () => {
      const { result } = renderHook(() =>
        useSignupForm({ initialStep: FormStep.PropertyInfo })
      );

      expect(result.current.progress).toBeCloseTo(33.33, 1);
    });

    it('should calculate progress for step 3', () => {
      const { result } = renderHook(() =>
        useSignupForm({ initialStep: FormStep.TrialPreferences })
      );

      expect(result.current.progress).toBeCloseTo(66.67, 1);
    });
  });

  describe('Form Submission', () => {
    it('should not submit with invalid data', async () => {
      const { result } = renderHook(() =>
        useSignupForm({
          onSubmit: mockOnSubmit,
          initialStep: FormStep.TrialPreferences,
        })
      );

      await act(async () => {
        const event = { preventDefault: vi.fn() } as unknown as React.FormEvent;
        await result.current.handleSubmit(event);
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
      expect(result.current.hasErrors).toBe(true);
    });

    it('should call onSubmit with valid data', async () => {
      const { result } = renderHook(() =>
        useSignupForm({
          onSubmit: mockOnSubmit,
          initialStep: FormStep.TrialPreferences,
        })
      );

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      await act(async () => {
        // Fill all required fields
        result.current.handleChange('fullName', 'John Doe');
        result.current.handleChange('email', 'john@example.com');
        result.current.handleChange('phone', '1234567890');
        result.current.handleChange('address', '123 Main Street, City, State');
        result.current.handleChange('propertyType', 'single-family');
        result.current.handleChange('bedrooms', 3);
        result.current.handleChange('bathrooms', 2);
        result.current.handleChange('startDate', futureDate.toISOString().split('T')[0]);
        result.current.handleChange('duration', 14);
        result.current.handleChange('termsAccepted', true);

        const event = { preventDefault: vi.fn() } as unknown as React.FormEvent;
        await result.current.handleSubmit(event);
      });

      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
        personalInfo: expect.any(Object),
        propertyInfo: expect.any(Object),
        trialPreferences: expect.any(Object),
      }));
    });

    it('should set submitting state during submission', async () => {
      let resolveSubmit: () => void;
      const submitPromise = new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      });

      mockOnSubmit = vi.fn().mockReturnValue(submitPromise);

      const { result } = renderHook(() =>
        useSignupForm({
          onSubmit: mockOnSubmit,
          initialStep: FormStep.TrialPreferences,
        })
      );

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      act(() => {
        result.current.handleChange('fullName', 'John Doe');
        result.current.handleChange('email', 'john@example.com');
        result.current.handleChange('phone', '1234567890');
        result.current.handleChange('address', '123 Main Street, City, State');
        result.current.handleChange('propertyType', 'single-family');
        result.current.handleChange('bedrooms', 3);
        result.current.handleChange('bathrooms', 2);
        result.current.handleChange('startDate', futureDate.toISOString().split('T')[0]);
        result.current.handleChange('duration', 14);
        result.current.handleChange('termsAccepted', true);
      });

      const submitPromiseAct = act(async () => {
        const event = { preventDefault: vi.fn() } as unknown as React.FormEvent;
        await result.current.handleSubmit(event);
      });

      // Should be submitting
      expect(result.current.isSubmitting).toBe(true);
      expect(result.current.submissionState).toBe('submitting');

      // Resolve the submission
      resolveSubmit!();
      await submitPromiseAct;

      expect(result.current.isSubmitting).toBe(false);
    });

    it('should call onSuccess after successful submission', async () => {
      const { result } = renderHook(() =>
        useSignupForm({
          onSubmit: mockOnSubmit,
          onSuccess: mockOnSuccess,
          initialStep: FormStep.TrialPreferences,
        })
      );

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      await act(async () => {
        result.current.handleChange('fullName', 'John Doe');
        result.current.handleChange('email', 'john@example.com');
        result.current.handleChange('phone', '1234567890');
        result.current.handleChange('address', '123 Main Street, City, State');
        result.current.handleChange('propertyType', 'single-family');
        result.current.handleChange('bedrooms', 3);
        result.current.handleChange('bathrooms', 2);
        result.current.handleChange('startDate', futureDate.toISOString().split('T')[0]);
        result.current.handleChange('duration', 14);
        result.current.handleChange('termsAccepted', true);

        const event = { preventDefault: vi.fn() } as unknown as React.FormEvent;
        await result.current.handleSubmit(event);
      });

      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      expect(result.current.submissionState).toBe('success');
    });

    it('should call onError after failed submission', async () => {
      const submitError = new Error('Submission failed');
      mockOnSubmit = vi.fn().mockRejectedValue(submitError);

      const { result } = renderHook(() =>
        useSignupForm({
          onSubmit: mockOnSubmit,
          onError: mockOnError,
          initialStep: FormStep.TrialPreferences,
        })
      );

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      await act(async () => {
        result.current.handleChange('fullName', 'John Doe');
        result.current.handleChange('email', 'john@example.com');
        result.current.handleChange('phone', '1234567890');
        result.current.handleChange('address', '123 Main Street, City, State');
        result.current.handleChange('propertyType', 'single-family');
        result.current.handleChange('bedrooms', 3);
        result.current.handleChange('bathrooms', 2);
        result.current.handleChange('startDate', futureDate.toISOString().split('T')[0]);
        result.current.handleChange('duration', 14);
        result.current.handleChange('termsAccepted', true);

        const event = { preventDefault: vi.fn() } as unknown as React.FormEvent;
        await result.current.handleSubmit(event);
      });

      expect(mockOnError).toHaveBeenCalledTimes(1);
      expect(mockOnError).toHaveBeenCalledWith(submitError);
      expect(result.current.submissionState).toBe('error');
    });

    it('should prevent double submission', async () => {
      let resolveSubmit: () => void;
      const submitPromise = new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      });

      mockOnSubmit = vi.fn().mockReturnValue(submitPromise);

      const { result } = renderHook(() =>
        useSignupForm({
          onSubmit: mockOnSubmit,
          initialStep: FormStep.TrialPreferences,
        })
      );

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      act(() => {
        result.current.handleChange('fullName', 'John Doe');
        result.current.handleChange('email', 'john@example.com');
        result.current.handleChange('phone', '1234567890');
        result.current.handleChange('address', '123 Main Street, City, State');
        result.current.handleChange('propertyType', 'single-family');
        result.current.handleChange('bedrooms', 3);
        result.current.handleChange('bathrooms', 2);
        result.current.handleChange('startDate', futureDate.toISOString().split('T')[0]);
        result.current.handleChange('duration', 14);
        result.current.handleChange('termsAccepted', true);
      });

      const submitPromiseAct = act(async () => {
        const event = { preventDefault: vi.fn() } as unknown as React.FormEvent;
        await result.current.handleSubmit(event);
      });

      // Try to submit again while first submission is in progress
      await act(async () => {
        const event = { preventDefault: vi.fn() } as unknown as React.FormEvent;
        await result.current.handleSubmit(event);
      });

      // Should only be called once
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);

      resolveSubmit!();
      await submitPromiseAct;
    });

    it('should handle submission without onSubmit callback', async () => {
      const { result } = renderHook(() =>
        useSignupForm({ initialStep: FormStep.TrialPreferences })
      );

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      await act(async () => {
        result.current.handleChange('fullName', 'John Doe');
        result.current.handleChange('email', 'john@example.com');
        result.current.handleChange('phone', '1234567890');
        result.current.handleChange('address', '123 Main Street, City, State');
        result.current.handleChange('propertyType', 'single-family');
        result.current.handleChange('bedrooms', 3);
        result.current.handleChange('bathrooms', 2);
        result.current.handleChange('startDate', futureDate.toISOString().split('T')[0]);
        result.current.handleChange('duration', 14);
        result.current.handleChange('termsAccepted', true);

        const event = { preventDefault: vi.fn() } as unknown as React.FormEvent;
        await result.current.handleSubmit(event);
      });

      // Should not throw error
      expect(result.current.submissionState).toBe('success');
    });
  });

  describe('Form Reset', () => {
    it('should reset form to initial state', () => {
      const { result } = renderHook(() => useSignupForm({}));

      act(() => {
        result.current.handleChange('fullName', 'John Doe');
        result.current.handleChange('email', 'john@example.com');
        result.current.handleBlur('email');
        result.current.resetForm();
      });

      expect(result.current.formData.personalInfo.fullName).toBe('');
      expect(result.current.formData.personalInfo.email).toBe('');
      expect(result.current.currentStep).toBe(FormStep.PersonalInfo);
      expect(Object.keys(result.current.errors)).toHaveLength(0);
      expect(Object.keys(result.current.touched)).toHaveLength(0);
      expect(result.current.submissionState).toBe('idle');
    });

    it('should reset to custom initial data if provided', () => {
      const initialData = {
        personalInfo: {
          fullName: 'Jane Doe',
          email: 'jane@example.com',
          phone: '9876543210',
        },
      };

      const { result } = renderHook(() => useSignupForm({ initialData }));

      act(() => {
        result.current.handleChange('fullName', 'John Doe');
        result.current.resetForm();
      });

      expect(result.current.formData.personalInfo.fullName).toBe('Jane Doe');
    });
  });

  describe('Callback Stability', () => {
    it('should have stable handleChange callback', () => {
      const { result, rerender } = renderHook(() => useSignupForm({}));

      const firstHandleChange = result.current.handleChange;
      rerender();
      const secondHandleChange = result.current.handleChange;

      expect(firstHandleChange).toBe(secondHandleChange);
    });

    it('should have stable handleBlur callback', () => {
      const { result, rerender } = renderHook(() => useSignupForm({}));

      const firstHandleBlur = result.current.handleBlur;
      rerender();
      const secondHandleBlur = result.current.handleBlur;

      expect(firstHandleBlur).toBe(secondHandleBlur);
    });

    it('should have stable handleNext callback', () => {
      const { result, rerender } = renderHook(() => useSignupForm({}));

      const firstHandleNext = result.current.handleNext;
      rerender();
      const secondHandleNext = result.current.handleNext;

      expect(firstHandleNext).toBe(secondHandleNext);
    });

    it('should have stable handleSubmit callback', () => {
      const { result, rerender } = renderHook(() => useSignupForm({}));

      const firstHandleSubmit = result.current.handleSubmit;
      rerender();
      const secondHandleSubmit = result.current.handleSubmit;

      expect(firstHandleSubmit).toBe(secondHandleSubmit);
    });
  });
});
