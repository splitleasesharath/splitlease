/**
 * Footer Component Exports
 *
 * Exports the Footer component and all related types, schemas, and hooks
 * for use in the SplitLease application.
 */

// Main component export
export { Footer, default } from './Footer';

// Type exports
export type {
  FooterProps,
  FooterLink,
  FooterColumn,
  ReferralMethod,
  ReferralFormData,
  ImportFormData,
  ValidationError,
  ReferralFormState,
  ImportFormState,
  UseFooterReferralReturn,
  UseFooterImportReturn,
} from './Footer.types';

// Schema exports for runtime validation
export {
  FooterLinkSchema,
  FooterColumnSchema,
  FooterPropsSchema,
  ReferralMethodSchema,
  ReferralFormSchema,
  ImportFormSchema,
  EmailSchema,
  PhoneSchema,
  UrlSchema,
  ValidationErrorSchema,
  validateReferralContact,
  validateImportForm,
} from './Footer.schema';

// Custom hooks exports (for reusability in other components)
export { useFooterReferral } from './hooks/useFooterReferral';
export { useFooterImport } from './hooks/useFooterImport';
