/**
 * Type definitions for the Sign Up & Login Modal component
 * Converted from Bubble.io reusable element
 */

export interface SignUpLoginModalProps {
  /** Controls whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Pre-fill email field with default value */
  defaultEmail?: string;
  /** Track the source page type */
  fromPageType?: string;
  /** House manual data object */
  houseManual?: HouseManual;
  /** Referral data object */
  referral?: Referral;
  /** Disable the close button */
  disableClose?: boolean;
  /** Indicates if user is from trial host flow */
  fromTrialHost?: boolean;
  /** NYU user flag */
  isNYU?: boolean;
  /** Callback on successful authentication */
  onAuthSuccess?: (user: User) => void;
}

export interface AuthState {
  /** Current view being displayed */
  showingToggle: 'login' | 'signup' | 'reset' | 'welcome' | 'passwordless';
  /** Controls listing claim flow */
  claimListing: boolean;
  /** Tracks which input field is active */
  currentInputFilling: number | null;
  /** Pre-filled email value */
  defaultEmail: string;
  /** Controls whether close button is disabled */
  disableClose: boolean;
  /** Indicates if user is from trial host flow */
  fromTrialHost: boolean;
  /** Source page type */
  fromPageType: string;
  /** House manual object */
  houseManual: HouseManual | null;
  /** Locks login functionality */
  lockLogin: boolean;
  /** NYU user flag */
  isNYU: boolean;
  /** Referral data */
  referral: Referral | null;
  /** Conditional user action flag */
  shouldTheUser: boolean;
  /** Signup validation error messages */
  signupErrorText: string;
  /** Controls listing image display */
  toggleListingPicture: string;
  /** Selected user type */
  userTypeSelection: UserType | null;
}

export interface HouseManual {
  id: string;
  name: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Referral {
  id: string;
  cashbackPoints: number;
  cesScore: number;
  referrantName?: string;
  code?: string;
}

export interface UserType {
  id: string;
  name: string;
  description?: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType?: UserType;
  createdAt?: Date;
  isVerified?: boolean;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  birthDate: string; // Format: YYYY-MM-DD
  phoneNumber: string;
  accountType: 'guest' | 'host';
  referralCode?: string;
}

export interface PasswordResetFormData {
  email: string;
}

export interface ValidationRules {
  email?: boolean;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  match?: string;
  custom?: (value: string) => string | null;
}

export interface ValidationErrors {
  [key: string]: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  message?: string;
}

export interface AuthError {
  message: string;
  field?: string;
  code?: string;
}
