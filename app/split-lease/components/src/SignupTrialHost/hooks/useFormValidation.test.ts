/**
 * useFormValidation Hook Tests
 *
 * TDD approach: Write failing tests first, then implement the hook
 *
 * Tests cover:
 * - Field validation
 * - Form validation
 * - Error management
 * - Touch state management
 *
 * Target: >90% code coverage
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormValidation } from './useFormValidation';
import { FormStep } from '../SignupTrialHost.types';
import type { FormData } from '../SignupTrialHost.types';

describe('useFormValidation Hook', () => {
  let formData: FormData;

  beforeEach(() => {
    formData = {
      personalInfo: {
        fullName: '',
        email: '',
        phone: '',
      },
      propertyInfo: {
        address: '',
        propertyType: '',
        bedrooms: '',
        bathrooms: '',
      },
      trialPreferences: {
        startDate: '',
        duration: '',
        referralSource: '',
        termsAccepted: false,
      },
    };
  });

  describe('Initialization', () => {
    it('should initialize with empty errors', () => {
      const { result } = renderHook(() => useFormValidation());

      expect(result.current.errors).toEqual({});
      expect(result.current.hasErrors).toBe(false);
    });

    it('should initialize with empty touched fields', () => {
      const { result } = renderHook(() => useFormValidation());

      expect(result.current.touched).toEqual({});
    });
  });

  describe('Email Validation', () => {
    it('should validate valid email format', () => {
      const { result } = renderHook(() => useFormValidation());

      const error = result.current.validateField('email', 'user@example.com');

      expect(error).toBeUndefined();
    });

    it('should return error for invalid email format', () => {
      const { result } = renderHook(() => useFormValidation());

      const error = result.current.validateField('email', 'invalid-email');

      expect(error).toBeDefined();
      expect(error).toContain('valid email');
    });

    it('should return error for empty email', () => {
      const { result } = renderHook(() => useFormValidation());

      const error = result.current.validateField('email', '');

      expect(error).toBeDefined();
    });

    it('should trim email before validation', () => {
      const { result } = renderHook(() => useFormValidation());

      const error = result.current.validateField('email', '  user@example.com  ');

      expect(error).toBeUndefined();
    });
  });

  describe('Phone Validation', () => {
    it('should validate phone with 10 digits', () => {
      const { result } = renderHook(() => useFormValidation());

      const error = result.current.validateField('phone', '1234567890');

      expect(error).toBeUndefined();
    });

    it('should validate formatted phone number', () => {
      const { result } = renderHook(() => useFormValidation());

      const error = result.current.validateField('phone', '(123) 456-7890');

      expect(error).toBeUndefined();
    });

    it('should return error for phone with fewer than 10 digits', () => {
      const { result } = renderHook(() => useFormValidation());

      const error = result.current.validateField('phone', '12345');

      expect(error).toBeDefined();
      expect(error).toContain('10 digits');
    });

    it('should return error for phone with more than 10 digits', () => {
      const { result } = renderHook(() => useFormValidation());

      const error = result.current.validateField('phone', '12345678901');

      expect(error).toBeDefined();
    });

    it('should return error for empty phone', () => {
      const { result } = renderHook(() => useFormValidation());

      const error = result.current.validateField('phone', '');

      expect(error).toBeDefined();
    });
  });

  describe('Name Validation', () => {
    it('should validate valid name', () => {
      const { result } = renderHook(() => useFormValidation());

      const error = result.current.validateField('fullName', 'John Doe');

      expect(error).toBeUndefined();
    });

    it('should return error for name too short', () => {
      const { result } = renderHook(() => useFormValidation());

      const error = result.current.validateField('fullName', 'J');

      expect(error).toBeDefined();
      expect(error).toContain('at least 2 characters');
    });

    it('should return error for name too long', () => {
      const { result } = renderHook(() => useFormValidation());

      const longName = 'a'.repeat(51);
      const error = result.current.validateField('fullName', longName);

      expect(error).toBeDefined();
      expect(error).toContain('at most 50 characters');
    });

    it('should return error for name with invalid characters', () => {
      const { result } = renderHook(() => useFormValidation());

      const error = result.current.validateField('fullName', 'John123');

      expect(error).toBeDefined();
      expect(error).toContain('letters and spaces');
    });

    it('should allow hyphens and apostrophes in names', () => {
      const { result } = renderHook(() => useFormValidation());

      const error1 = result.current.validateField('fullName', "O'Brien");
      const error2 = result.current.validateField('fullName', 'Mary-Jane');

      expect(error1).toBeUndefined();
      expect(error2).toBeUndefined();
    });
  });

  describe('Address Validation', () => {
    it('should validate valid address', () => {
      const { result } = renderHook(() => useFormValidation());

      const error = result.current.validateField('address', '123 Main Street, City, State 12345');

      expect(error).toBeUndefined();
    });

    it('should return error for address too short', () => {
      const { result } = renderHook(() => useFormValidation());

      const error = result.current.validateField('address', '123 Main');

      expect(error).toBeDefined();
      expect(error).toContain('at least 10 characters');
    });

    it('should return error for address too long', () => {
      const { result } = renderHook(() => useFormValidation());

      const longAddress = 'a'.repeat(201);
      const error = result.current.validateField('address', longAddress);

      expect(error).toBeDefined();
      expect(error).toContain('at most 200 characters');
    });
  });

  describe('Number Validation', () => {
    it('should validate valid bedrooms number', () => {
      const { result } = renderHook(() => useFormValidation());

      const error = result.current.validateField('bedrooms', 3);

      expect(error).toBeUndefined();
    });

    it('should return error for bedrooms less than 1', () => {
      const { result } = renderHook(() => useFormValidation());

      const error = result.current.validateField('bedrooms', 0);

      expect(error).toBeDefined();
      expect(error).toContain('at least 1');
    });

    it('should return error for bedrooms more than 20', () => {
      const { result } = renderHook(() => useFormValidation());

      const error = result.current.validateField('bedrooms', 21);

      expect(error).toBeDefined();
      expect(error).toContain('Cannot exceed 20');
    });

    it('should validate valid bathrooms number', () => {
      const { result } = renderHook(() => useFormValidation());

      const error1 = result.current.validateField('bathrooms', 2);
      const error2 = result.current.validateField('bathrooms', 2.5);

      expect(error1).toBeUndefined();
      expect(error2).toBeUndefined();
    });

    it('should return error for bathrooms less than 1', () => {
      const { result } = renderHook(() => useFormValidation());

      const error = result.current.validateField('bathrooms', 0.5);

      expect(error).toBeDefined();
      expect(error).toContain('at least 1');
    });
  });

  describe('Date Validation', () => {
    it('should validate future date', () => {
      const { result } = renderHook(() => useFormValidation());

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const dateStr = futureDate.toISOString().split('T')[0];

      const error = result.current.validateField('startDate', dateStr);

      expect(error).toBeUndefined();
    });

    it('should return error for past date', () => {
      const { result } = renderHook(() => useFormValidation());

      const pastDate = new Date('2020-01-01');
      const dateStr = pastDate.toISOString().split('T')[0];

      const error = result.current.validateField('startDate', dateStr);

      expect(error).toBeDefined();
      expect(error).toContain('future');
    });

    it('should return error for today', () => {
      const { result } = renderHook(() => useFormValidation());

      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];

      const error = result.current.validateField('startDate', dateStr);

      expect(error).toBeDefined();
      expect(error).toContain('future');
    });
  });

  describe('Terms Validation', () => {
    it('should validate accepted terms', () => {
      const { result } = renderHook(() => useFormValidation());

      const error = result.current.validateField('termsAccepted', true);

      expect(error).toBeUndefined();
    });

    it('should return error for not accepted terms', () => {
      const { result } = renderHook(() => useFormValidation());

      const error = result.current.validateField('termsAccepted', false);

      expect(error).toBeDefined();
      expect(error).toContain('accept');
    });
  });

  describe('Step Validation', () => {
    it('should validate complete step 1 with valid data', () => {
      const { result } = renderHook(() => useFormValidation());

      const validData: FormData = {
        ...formData,
        personalInfo: {
          fullName: 'John Doe',
          email: 'john@example.com',
          phone: '1234567890',
        },
      };

      const errors = result.current.validateStep(FormStep.PersonalInfo, validData);

      expect(Object.keys(errors)).toHaveLength(0);
    });

    it('should return errors for step 1 with invalid data', () => {
      const { result } = renderHook(() => useFormValidation());

      const invalidData: FormData = {
        ...formData,
        personalInfo: {
          fullName: 'J',
          email: 'invalid',
          phone: '123',
        },
      };

      const errors = result.current.validateStep(FormStep.PersonalInfo, invalidData);

      expect(errors.fullName).toBeDefined();
      expect(errors.email).toBeDefined();
      expect(errors.phone).toBeDefined();
    });

    it('should validate complete step 2 with valid data', () => {
      const { result } = renderHook(() => useFormValidation());

      const validData: FormData = {
        ...formData,
        propertyInfo: {
          address: '123 Main Street, City, State',
          propertyType: 'single-family',
          bedrooms: 3,
          bathrooms: 2.5,
        },
      };

      const errors = result.current.validateStep(FormStep.PropertyInfo, validData);

      expect(Object.keys(errors)).toHaveLength(0);
    });

    it('should validate complete step 3 with valid data', () => {
      const { result } = renderHook(() => useFormValidation());

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const validData: FormData = {
        ...formData,
        trialPreferences: {
          startDate: futureDate.toISOString().split('T')[0],
          duration: 14,
          referralSource: 'google-search',
          termsAccepted: true,
        },
      };

      const errors = result.current.validateStep(FormStep.TrialPreferences, validData);

      expect(Object.keys(errors)).toHaveLength(0);
    });
  });

  describe('Form Validation', () => {
    it('should validate complete form with all valid data', () => {
      const { result } = renderHook(() => useFormValidation());

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const validData: FormData = {
        personalInfo: {
          fullName: 'John Doe',
          email: 'john@example.com',
          phone: '1234567890',
        },
        propertyInfo: {
          address: '123 Main Street, City, State',
          propertyType: 'single-family',
          bedrooms: 3,
          bathrooms: 2,
        },
        trialPreferences: {
          startDate: futureDate.toISOString().split('T')[0],
          duration: 14,
          referralSource: 'google-search',
          termsAccepted: true,
        },
      };

      const errors = result.current.validateForm(validData);

      expect(Object.keys(errors)).toHaveLength(0);
      expect(result.current.hasErrors).toBe(false);
    });

    it('should return all errors for completely invalid form', () => {
      const { result } = renderHook(() => useFormValidation());

      const errors = result.current.validateForm(formData);

      expect(Object.keys(errors).length).toBeGreaterThan(0);
      expect(result.current.hasErrors).toBe(true);
    });
  });

  describe('Error Management', () => {
    it('should clear error for specific field', () => {
      const { result } = renderHook(() => useFormValidation());

      // First validate to create an error
      act(() => {
        result.current.validateField('email', 'invalid');
      });

      // Then clear it
      act(() => {
        result.current.clearError('email');
      });

      expect(result.current.errors.email).toBeUndefined();
    });

    it('should clear all errors', () => {
      const { result } = renderHook(() => useFormValidation());

      // First validate to create errors
      act(() => {
        result.current.validateForm(formData);
      });

      expect(result.current.hasErrors).toBe(true);

      // Then clear all
      act(() => {
        result.current.clearAllErrors();
      });

      expect(result.current.hasErrors).toBe(false);
      expect(Object.keys(result.current.errors)).toHaveLength(0);
    });
  });

  describe('Touch State Management', () => {
    it('should set field as touched', () => {
      const { result } = renderHook(() => useFormValidation());

      act(() => {
        result.current.setTouched('email', true);
      });

      expect(result.current.touched.email).toBe(true);
    });

    it('should set field as untouched', () => {
      const { result } = renderHook(() => useFormValidation());

      act(() => {
        result.current.setTouched('email', true);
        result.current.setTouched('email', false);
      });

      expect(result.current.touched.email).toBe(false);
    });

    it('should track multiple touched fields', () => {
      const { result } = renderHook(() => useFormValidation());

      act(() => {
        result.current.setTouched('email', true);
        result.current.setTouched('fullName', true);
        result.current.setTouched('phone', true);
      });

      expect(result.current.touched.email).toBe(true);
      expect(result.current.touched.fullName).toBe(true);
      expect(result.current.touched.phone).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values gracefully', () => {
      const { result } = renderHook(() => useFormValidation());

      const error = result.current.validateField('email', null as unknown as string);

      expect(error).toBeDefined();
    });

    it('should handle undefined values gracefully', () => {
      const { result } = renderHook(() => useFormValidation());

      const error = result.current.validateField('email', undefined as unknown as string);

      expect(error).toBeDefined();
    });

    it('should handle whitespace-only values', () => {
      const { result } = renderHook(() => useFormValidation());

      const error = result.current.validateField('fullName', '   ');

      expect(error).toBeDefined();
    });
  });
});
