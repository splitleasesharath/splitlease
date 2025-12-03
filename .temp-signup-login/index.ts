/**
 * Export SignUpLoginModal component and types
 */

export { SignUpLoginModal } from './SignUpLoginModal';
export { default } from './SignUpLoginModal';

// Export types
export type {
  SignUpLoginModalProps,
  AuthState,
  User,
  LoginFormData,
  SignupFormData,
  PasswordResetFormData,
  Referral,
  HouseManual,
  UserType,
} from './types';

// Export hooks for advanced usage
export { useAuthState, useValidation, useAuthFlow } from './hooks';

// Export shared components for customization
export {
  AuthInput,
  AuthButton,
  ErrorMessage,
  CloseButton,
} from './components/shared';
