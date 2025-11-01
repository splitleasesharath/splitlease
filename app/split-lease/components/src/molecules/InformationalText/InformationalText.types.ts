import { z } from 'zod';
import {
  InformationalTextPropsSchema,
  InformationalTextVariantSchema,
  InformationalTextSizeSchema,
  InformationalTextActionSchema,
} from './InformationalText.schema';

/**
 * Variant type for InformationalText component
 * Defines the visual and semantic type of the message
 */
export type InformationalTextVariant = z.infer<
  typeof InformationalTextVariantSchema
>;

/**
 * Size type for InformationalText component
 * Defines the sizing scale of the component
 */
export type InformationalTextSize = z.infer<
  typeof InformationalTextSizeSchema
>;

/**
 * Action button configuration for InformationalText component
 * Defines the structure for action buttons within the component
 */
export type InformationalTextAction = z.infer<
  typeof InformationalTextActionSchema
>;

/**
 * Base props inferred from Zod schema
 */
type InformationalTextBaseProps = z.infer<typeof InformationalTextPropsSchema>;

/**
 * Props interface for InformationalText component
 * Makes variant and size optional since they have default values
 */
export type InformationalTextProps = Omit<
  InformationalTextBaseProps,
  'variant' | 'size'
> & {
  variant?: InformationalTextVariant;
  size?: InformationalTextSize;
};
