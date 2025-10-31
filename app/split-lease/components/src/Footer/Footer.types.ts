import { z } from 'zod';
import {
  FooterLinkSchema,
  FooterColumnSchema,
  FooterPropsSchema,
  ReferralMethodSchema,
  ReferralFormSchema,
  ImportFormSchema,
  ValidationErrorSchema,
} from './Footer.schema';

/**
 * Type for a footer link
 * Inferred from Zod schema for single source of truth
 */
export type FooterLink = z.infer<typeof FooterLinkSchema>;

/**
 * Type for a footer column
 * Inferred from Zod schema for single source of truth
 */
export type FooterColumn = z.infer<typeof FooterColumnSchema>;

/**
 * Type for referral method (text or email)
 * Inferred from Zod schema for single source of truth
 */
export type ReferralMethod = z.infer<typeof ReferralMethodSchema>;

/**
 * Type for referral form data
 * Inferred from Zod schema for single source of truth
 */
export type ReferralFormData = z.infer<typeof ReferralFormSchema>;

/**
 * Type for import form data
 * Inferred from Zod schema for single source of truth
 */
export type ImportFormData = z.infer<typeof ImportFormSchema>;

/**
 * Type for validation errors
 * Inferred from Zod schema for single source of truth
 */
export type ValidationError = z.infer<typeof ValidationErrorSchema>;

/**
 * Main Footer component props
 * Inferred from Zod schema for single source of truth
 */
export type FooterProps = z.infer<typeof FooterPropsSchema>;

/**
 * State for referral form
 */
export interface ReferralFormState {
  method: ReferralMethod;
  contact: string;
  isSubmitting: boolean;
  error: string | null;
  successMessage: string | null;
}

/**
 * State for import form
 */
export interface ImportFormState {
  url: string;
  email: string;
  isSubmitting: boolean;
  errors: {
    url?: string;
    email?: string;
  };
  successMessage: string | null;
}

/**
 * Return type for useFooterReferral hook
 */
export interface UseFooterReferralReturn {
  method: ReferralMethod;
  contact: string;
  isSubmitting: boolean;
  error: string | null;
  successMessage: string | null;
  placeholder: string;
  setMethod: (method: ReferralMethod) => void;
  setContact: (contact: string) => void;
  handleSubmit: () => Promise<void>;
  clearError: () => void;
}

/**
 * Return type for useFooterImport hook
 */
export interface UseFooterImportReturn {
  url: string;
  email: string;
  isSubmitting: boolean;
  errors: {
    url?: string;
    email?: string;
  };
  successMessage: string | null;
  setUrl: (url: string) => void;
  setEmail: (email: string) => void;
  handleSubmit: () => Promise<void>;
  clearErrors: () => void;
}
