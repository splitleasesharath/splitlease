/**
 * Zod Validation Schemas for SignupTrialHost Component
 *
 * This file contains all runtime validation schemas using Zod.
 * These schemas ensure type safety and provide validation at runtime.
 *
 * @module SignupTrialHost/schema
 */

import { z } from 'zod';
import {
  ERROR_MESSAGES,
  VALIDATION_LIMITS,
  VALIDATION_REGEX,
  PROPERTY_TYPES,
  TRIAL_DURATIONS,
  REFERRAL_SOURCES,
} from './constants';

/**
 * Schema for validating full name
 */
export const fullNameSchema = z
  .string()
  .trim()
  .min(VALIDATION_LIMITS.NAME_MIN_LENGTH, ERROR_MESSAGES.NAME_TOO_SHORT)
  .max(VALIDATION_LIMITS.NAME_MAX_LENGTH, ERROR_MESSAGES.NAME_TOO_LONG)
  .regex(VALIDATION_REGEX.NAME, ERROR_MESSAGES.NAME_INVALID_CHARS);

/**
 * Schema for validating email address
 */
export const emailSchema = z
  .string()
  .trim()
  .email(ERROR_MESSAGES.EMAIL_INVALID_FORMAT)
  .regex(VALIDATION_REGEX.EMAIL, ERROR_MESSAGES.EMAIL_INVALID_FORMAT);

/**
 * Schema for validating phone number (after formatting)
 */
export const phoneSchema = z
  .string()
  .trim()
  .regex(VALIDATION_REGEX.PHONE, ERROR_MESSAGES.PHONE_INVALID_FORMAT)
  .or(
    z
      .string()
      .trim()
      .transform((val) => val.replace(/\D/g, ''))
      .pipe(z.string().regex(VALIDATION_REGEX.PHONE, ERROR_MESSAGES.PHONE_INVALID_FORMAT))
  );

/**
 * Schema for validating property address
 */
export const addressSchema = z
  .string()
  .trim()
  .min(VALIDATION_LIMITS.ADDRESS_MIN_LENGTH, ERROR_MESSAGES.ADDRESS_TOO_SHORT)
  .max(VALIDATION_LIMITS.ADDRESS_MAX_LENGTH, ERROR_MESSAGES.ADDRESS_TOO_LONG);

/**
 * Schema for validating property type
 */
export const propertyTypeSchema = z.enum(
  PROPERTY_TYPES.map((t) => t.value) as [string, ...string[]],
  {
    errorMap: () => ({ message: ERROR_MESSAGES.REQUIRED_FIELD }),
  }
);

/**
 * Schema for validating number of bedrooms
 */
export const bedroomsSchema = z.coerce
  .number({
    required_error: ERROR_MESSAGES.REQUIRED_FIELD,
    invalid_type_error: ERROR_MESSAGES.NUMBER_INVALID,
  })
  .int(ERROR_MESSAGES.NUMBER_INVALID)
  .min(VALIDATION_LIMITS.BEDROOMS_MIN, ERROR_MESSAGES.BEDROOMS_MIN)
  .max(VALIDATION_LIMITS.BEDROOMS_MAX, ERROR_MESSAGES.BEDROOMS_MAX);

/**
 * Schema for validating number of bathrooms
 */
export const bathroomsSchema = z.coerce
  .number({
    required_error: ERROR_MESSAGES.REQUIRED_FIELD,
    invalid_type_error: ERROR_MESSAGES.NUMBER_INVALID,
  })
  .min(VALIDATION_LIMITS.BATHROOMS_MIN, ERROR_MESSAGES.BATHROOMS_MIN)
  .max(VALIDATION_LIMITS.BATHROOMS_MAX, ERROR_MESSAGES.BATHROOMS_MAX)
  .multipleOf(VALIDATION_LIMITS.BATHROOMS_STEP, ERROR_MESSAGES.NUMBER_INVALID);

/**
 * Schema for validating start date (must be in the future)
 */
export const startDateSchema = z
  .string()
  .trim()
  .refine(
    (dateStr) => {
      if (!dateStr) return false;
      const date = new Date(dateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date > today;
    },
    {
      message: ERROR_MESSAGES.DATE_PAST,
    }
  );

/**
 * Schema for validating trial duration
 */
export const durationSchema = z.coerce
  .number({
    required_error: ERROR_MESSAGES.REQUIRED_FIELD,
    invalid_type_error: ERROR_MESSAGES.NUMBER_INVALID,
  })
  .refine((val) => TRIAL_DURATIONS.some((d) => d.value === val), {
    message: ERROR_MESSAGES.REQUIRED_FIELD,
  });

/**
 * Schema for validating referral source (optional)
 */
export const referralSourceSchema = z
  .enum(REFERRAL_SOURCES.map((r) => r.value) as [string, ...string[]])
  .optional();

/**
 * Schema for validating terms acceptance
 */
export const termsAcceptedSchema = z.boolean().refine((val) => val === true, {
  message: ERROR_MESSAGES.TERMS_NOT_ACCEPTED,
});

/**
 * Personal Information step schema
 */
export const personalInfoSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  phone: phoneSchema,
});

/**
 * Property Information step schema
 */
export const propertyInfoSchema = z.object({
  address: addressSchema,
  propertyType: propertyTypeSchema,
  bedrooms: bedroomsSchema,
  bathrooms: bathroomsSchema,
});

/**
 * Trial Preferences step schema
 */
export const trialPreferencesSchema = z.object({
  startDate: startDateSchema,
  duration: durationSchema,
  referralSource: referralSourceSchema,
  termsAccepted: termsAcceptedSchema,
});

/**
 * Complete form data schema (all steps combined)
 */
export const formDataSchema = z.object({
  personalInfo: personalInfoSchema,
  propertyInfo: propertyInfoSchema,
  trialPreferences: trialPreferencesSchema,
});

/**
 * Partial schema for individual field validation
 * This allows validating fields one at a time with proper error messages
 */
export const fieldSchemas = {
  // Personal Info
  fullName: fullNameSchema,
  email: emailSchema,
  phone: phoneSchema,

  // Property Info
  address: addressSchema,
  propertyType: propertyTypeSchema,
  bedrooms: bedroomsSchema,
  bathrooms: bathroomsSchema,

  // Trial Preferences
  startDate: startDateSchema,
  duration: durationSchema,
  referralSource: referralSourceSchema,
  termsAccepted: termsAcceptedSchema,
} as const;

/**
 * Step-specific schemas for multi-step validation
 */
export const stepSchemas = {
  1: personalInfoSchema,
  2: propertyInfoSchema,
  3: trialPreferencesSchema,
} as const;

/**
 * Type helper for extracting Zod schema types
 */
export type PersonalInfoData = z.infer<typeof personalInfoSchema>;
export type PropertyInfoData = z.infer<typeof propertyInfoSchema>;
export type TrialPreferencesData = z.infer<typeof trialPreferencesSchema>;
export type FormDataType = z.infer<typeof formDataSchema>;
