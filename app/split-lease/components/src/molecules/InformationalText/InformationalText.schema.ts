import { z } from 'zod';

/**
 * Zod schema for InformationalText variant types
 */
export const InformationalTextVariantSchema = z.enum([
  'info',
  'warning',
  'success',
  'error',
]);

/**
 * Zod schema for InformationalText size types
 */
export const InformationalTextSizeSchema = z.enum(['small', 'medium', 'large']);

/**
 * Zod schema for action button configuration
 */
export const InformationalTextActionSchema = z.object({
  label: z.string().min(1, 'Action label must not be empty'),
  onClick: z.function(),
  ariaLabel: z.string().optional(),
  disabled: z.boolean().optional(),
});

/**
 * Zod schema for InformationalText component props
 * This is the single source of truth for prop validation
 */
export const InformationalTextPropsSchema = z.object({
  /** The visual style variant of the informational text */
  variant: InformationalTextVariantSchema.default('info'),

  /** The size of the informational text */
  size: InformationalTextSizeSchema.default('medium'),

  /** Optional title/heading for the message */
  title: z.string().optional(),

  /** The main content/message to display */
  children: z.any(),

  /** Optional custom icon element to override the default variant icon */
  icon: z.any().optional(),

  /** Callback function called when the dismiss button is clicked */
  onDismiss: z.function().optional(),

  /** Array of action button configurations */
  actions: z.array(InformationalTextActionSchema).optional(),

  /** Additional CSS class names to apply to the container */
  className: z.string().optional(),

  /** Test ID for automated testing */
  'data-testid': z.string().optional(),
});
