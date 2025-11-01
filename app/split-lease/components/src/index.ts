/**
 * SplitLease Component Library
 *
 * Barrel export for all components following Atomic Design principles.
 *
 * Usage:
 *   import { Button, SearchBar, Header } from '@components'
 */

// ============================================================================
// Existing Components
// ============================================================================
export { default as SearchScheduleSelector } from './SearchScheduleSelector';
export { Footer } from './Footer';
export { Header } from './Header';

export { SignupLogin } from './SignupLogin';
export type {
  SignupLoginProps,
  SignupFormData,
  LoginFormData,
  AuthMode,
  ValidationErrors,
  PasswordStrength,
  PasswordStrengthResult,
} from './SignupLogin';
export {
  SignupFormDataSchema,
  LoginFormDataSchema,
  AuthModeSchema,
  EmailSchema,
  PasswordSchema,
  NameSchema,
  useSignupForm,
  useLoginForm,
  useAuthMode,
  calculatePasswordStrength,
} from './SignupLogin';

export { ListingImageGrid } from './ListingImageGrid';
export type { ListingImage, ListingImageGridProps } from './ListingImageGrid';

export { ProposalMenu } from './ProposalMenu';
export type {
  WeekDay,
  PricingInfo,
  ReservationSpanOption,
  HostPreferences,
  ProposalMenuProps,
  ProposalData,
} from './ProposalMenu';

// ============================================================================
// Atomic Components
// ============================================================================
// TODO: Export atomic components as they are created
// export { Button } from './atomic/Button';
// export { Input } from './atomic/Input';
// export { Icon } from './atomic/Icon';
// export { Text } from './atomic/Text';

// ============================================================================
// Molecular Components
// ============================================================================
// TODO: Export molecular components as they are created
// export { SearchBar } from './molecules/SearchBar';
// export { FormField } from './molecules/FormField';
// export { ListingCard } from './molecules/ListingCard';

// ============================================================================
// Organism Components
// ============================================================================
// TODO: Export organism components as they are created
// export { ListingGrid } from './organisms/ListingGrid';
// export { BookingForm } from './organisms/BookingForm';

// ============================================================================
// Template Components
// ============================================================================
// TODO: Export template components as they are created
// export { MainLayout } from './templates/MainLayout';
// export { DashboardLayout } from './templates/DashboardLayout';

// Component library version
export const version = '0.1.0';


