import { z } from 'zod';

/**
 * Schema for a footer link
 * Validates that each link has text and a valid URL
 */
export const FooterLinkSchema = z.object({
  text: z.string().min(1, 'Link text is required'),
  url: z.string().url('Must be a valid URL'),
});

/**
 * Schema for a footer column
 * Validates column structure with title and array of links
 */
export const FooterColumnSchema = z.object({
  title: z.string().min(1, 'Column title is required'),
  links: z.array(FooterLinkSchema).min(1, 'Column must have at least one link'),
});

/**
 * Schema for referral method type
 */
export const ReferralMethodSchema = z.enum(['text', 'email']);

/**
 * Schema for email validation
 */
export const EmailSchema = z
  .string()
  .email('Invalid email format')
  .min(1, 'Email is required');

/**
 * Schema for phone number validation (US format)
 * Accepts formats: 1234567890, 123-456-7890, (123) 456-7890, etc.
 */
export const PhoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .regex(
    /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
    'Invalid phone number format'
  );

/**
 * Schema for URL validation
 */
export const UrlSchema = z
  .string()
  .min(1, 'URL is required')
  .url('Must be a valid URL starting with http:// or https://');

/**
 * Schema for referral form data
 */
export const ReferralFormSchema = z.object({
  method: ReferralMethodSchema,
  contact: z.string().min(1, 'Contact information is required'),
});

/**
 * Schema for import form data
 */
export const ImportFormSchema = z.object({
  url: UrlSchema,
  email: EmailSchema,
});

/**
 * Main Footer props schema with runtime validation
 * All fields are optional with sensible defaults
 */
export const FooterPropsSchema = z
  .object({
    columns: z.array(FooterColumnSchema),
    showReferral: z.boolean(),
    showImport: z.boolean(),
    showAppDownload: z.boolean(),
    onReferralSubmit: z.function(),
    onImportSubmit: z.function(),
    copyrightText: z.string(),
    footerNote: z.string(),
    termsUrl: z.string().url(),
  })
  .partial();

/**
 * Schema for form validation errors
 */
export const ValidationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
});

/**
 * Validates referral contact based on method
 * @param method - The referral method (text or email)
 * @param contact - The contact information to validate
 * @returns ValidationResult with isValid flag and optional error message
 */
export function validateReferralContact(
  method: 'text' | 'email',
  contact: string
): { isValid: boolean; error?: string } {
  try {
    if (method === 'email') {
      EmailSchema.parse(contact);
    } else {
      PhoneSchema.parse(contact);
    }
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        error: error.issues[0]?.message || 'Invalid input',
      };
    }
    return { isValid: false, error: 'Validation failed' };
  }
}

/**
 * Validates import form data
 * @param url - The listing URL to validate
 * @param email - The email to validate
 * @returns ValidationResult with isValid flag and optional errors object
 */
export function validateImportForm(
  url: string,
  email: string
): {
  isValid: boolean;
  errors?: { url?: string; email?: string };
} {
  try {
    ImportFormSchema.parse({ url, email });
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: { url?: string; email?: string } = {};
      error.issues.forEach((err: z.ZodIssue) => {
        const field = err.path[0] as 'url' | 'email';
        errors[field] = err.message;
      });
      return { isValid: false, errors };
    }
    return { isValid: false, errors: { url: 'Validation failed' } };
  }
}
