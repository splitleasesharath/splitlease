/**
 * @fileoverview Zod validation schemas for SignupLogin component
 * Provides runtime validation for form data with comprehensive rules
 */

import { z } from 'zod';

/**
 * Email validation schema
 * - Standard email format (RFC 5322)
 * - Minimum length requirements
 * - Domain validation
 */
export const EmailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email format')
  .max(255, 'Email must be less than 255 characters')
  .trim()
  .toLowerCase()
  .refine(
    (email) => {
      // Check for common typos
      const commonTypos = ['gmial.com', 'gmai.com', 'yahooo.com', 'hotmial.com'];
      const parts = email.split('@');
      if (parts.length < 2 || !parts[1]) return true;
      const domain = parts[1];
      return !commonTypos.includes(domain);
    },
    {
      message: 'Possible typo in email domain. Did you mean gmail.com or yahoo.com?',
    }
  );

/**
 * Password validation schema
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one number (0-9)
 * - At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)
 */
export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .refine((password) => /[A-Z]/.test(password), {
    message: 'Password must contain at least one uppercase letter',
  })
  .refine((password) => /[a-z]/.test(password), {
    message: 'Password must contain at least one lowercase letter',
  })
  .refine((password) => /[0-9]/.test(password), {
    message: 'Password must contain at least one number',
  })
  .refine((password) => /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password), {
    message: 'Password must contain at least one special character',
  });

/**
 * Name validation schema (for firstName and lastName)
 * - Minimum 2 characters
 * - Maximum 50 characters
 * - Only letters, hyphens, and apostrophes
 */
export const NameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name must be less than 50 characters')
  .trim()
  .refine((name) => /^[a-zA-Z\-']+$/.test(name), {
    message: 'Name can only contain letters, hyphens, and apostrophes',
  });

/**
 * Signup form data schema
 * Contains all fields required for user registration
 */
export const SignupFormDataSchema = z
  .object({
    firstName: NameSchema,
    lastName: NameSchema,
    email: EmailSchema,
    password: PasswordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    termsAccepted: z.boolean().refine((val) => val === true, {
      message: 'You must accept the terms and conditions',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/**
 * Login form data schema
 * Contains fields required for user authentication
 */
export const LoginFormDataSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

/**
 * Auth mode type
 */
export const AuthModeSchema = z.enum(['signup', 'login']);

/**
 * Export types inferred from schemas for use in TypeScript
 */
export type SignupFormData = z.infer<typeof SignupFormDataSchema>;
export type LoginFormData = z.infer<typeof LoginFormDataSchema>;
export type AuthMode = z.infer<typeof AuthModeSchema>;
