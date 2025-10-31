/**
 * Shared component prop types and interfaces
 */

import type { Listing, SchedulePattern, Proposal } from './models';

/**
 * Base component props that all components may receive
 */
export interface BaseComponentProps {
  className?: string;
  testId?: string;
}

/**
 * Props for Header component
 */
export interface HeaderProps extends BaseComponentProps {
  isAuthenticated?: boolean;
  userName?: string;
  onLogin?: () => void;
  onLogout?: () => void;
  onNavigate?: (path: string) => void;
}

/**
 * Props for Footer component
 */
export interface FooterProps extends BaseComponentProps {
  year?: number;
  links?: Array<{
    label: string;
    href: string;
  }>;
}

/**
 * Props for SearchScheduleSelector component
 */
export interface SearchScheduleSelectorProps extends BaseComponentProps {
  value?: SchedulePattern;
  onChange?: (schedule: SchedulePattern) => void;
  disabled?: boolean;
}

/**
 * Props for ListingImageGrid component
 */
export interface ListingImageGridProps extends BaseComponentProps {
  images: Array<{
    url: string;
    alt: string;
    isPrimary?: boolean;
  }>;
  onImageClick?: (index: number) => void;
  maxImages?: number;
}

/**
 * Props for ProposalMenu component
 */
export interface ProposalMenuProps extends BaseComponentProps {
  listing: Listing;
  onSubmitProposal?: (proposal: Omit<Proposal, 'id' | 'createdAt' | 'updatedAt'>) => void;
  isAuthenticated?: boolean;
  userId?: string;
}

/**
 * Common button variants
 */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

/**
 * Common button sizes
 */
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Props for a generic button component
 */
export interface ButtonProps extends BaseComponentProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  children: React.ReactNode;
}

/**
 * Props for input components
 */
export interface InputProps extends BaseComponentProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  value?: string | number;
  defaultValue?: string | number;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  label?: string;
  helperText?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
}

/**
 * Props for modal/dialog components
 */
export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
}

/**
 * Props for loading spinner components
 */
export interface SpinnerProps extends BaseComponentProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  text?: string;
}

/**
 * Props for toast/notification components
 */
export interface ToastProps extends BaseComponentProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose?: () => void;
}

/**
 * Props for card components
 */
export interface CardProps extends BaseComponentProps {
  children: React.ReactNode;
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  clickable?: boolean;
  onClick?: () => void;
}
