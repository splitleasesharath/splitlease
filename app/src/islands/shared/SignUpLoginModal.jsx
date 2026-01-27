/**
 * SignUpLoginModal - Shared authentication modal component
 *
 * A comprehensive modal for login/signup matching the original Bubble design.
 * Supports multiple views: initial, login, signup-step1, signup-step2, password-reset
 *
 * Key Features:
 * - Multi-step signup with first name, last name, email, DOB, phone, password
 * - Login with passwordless option and forgot password
 * - Password reset with magic link option
 * - Route-based user type prefilling
 * - Data persistence between steps
 *
 * Usage:
 *   import SignUpLoginModal from '../shared/SignUpLoginModal.jsx';
 *
 *   <SignUpLoginModal
 *     isOpen={showModal}
 *     onClose={() => setShowModal(false)}
 *     initialView="initial" // 'initial', 'login', 'signup', 'signup-step1', 'signup-step2'
 *     onAuthSuccess={(userData) => handleSuccess(userData)}
 *     defaultUserType="guest" // 'host' or 'guest' - for route-based prefilling
 *   />
 */

import { useState, useEffect, useCallback } from 'react';
import {
  loginUser,
  signupUser,
  validateTokenAndFetchUser,
  initiateLinkedInOAuth,
  handleLinkedInOAuthCallback,
  initiateLinkedInOAuthLogin,
  initiateGoogleOAuth,
  handleGoogleOAuthCallback,
  initiateGoogleOAuthLogin
} from '../../lib/auth.js';
import { getLinkedInOAuthUserType, getGoogleOAuthUserType } from '../../lib/secureStorage.js';
import { supabase } from '../../lib/supabase.js';
import Toast, { useToast } from './Toast.jsx';

// ============================================================================
// Constants
// ============================================================================

const VIEWS = {
  // Entry point
  ENTRY: 'entry',
  // Signup flow
  USER_TYPE: 'user-type',       // Step 1: Guest/Host selection
  IDENTITY: 'identity',         // Step 2: Name, email, birthday (+ LinkedIn/Google)
  PASSWORD: 'password',         // Step 3: Password creation
  // Login flow
  LOGIN: 'login',
  // Password/Magic link flows
  PASSWORD_RESET: 'password-reset',
  RESET_SENT: 'reset-sent',
  MAGIC_LINK: 'magic-link',
  MAGIC_LINK_SENT: 'magic-link-sent',
  // Success
  SUCCESS: 'success',
  // Legacy aliases (for backward compatibility with initialView prop)
  INITIAL: 'entry',
  SIGNUP_STEP1: 'user-type',
  SIGNUP_STEP2: 'identity'
};

const USER_TYPES = {
  HOST: 'Host',
  GUEST: 'Guest'
};

// ============================================================================
// Styles - POPUP REPLICATION PROTOCOL Compliant
// ============================================================================

// Protocol Color Constants
const COLORS = {
  primaryPurple: '#31135D',      // Protocol: Primary Purple
  positivePurple: '#5B5FCF',     // Protocol: Positive/Action Purple (replaces green)
  secondaryPurple: '#6D31C2',    // Protocol: Secondary Purple (accents)
  lightPurpleBg: '#F7F2FA',      // Protocol: Light Purple Background
  emergencyRed: '#DC3545',       // Protocol: Emergency Red (outlined only)
  border: '#E7E0EC',             // Protocol: Standard border
  textPrimary: '#1a1a1a',
  textSecondary: '#49454F',      // Protocol: Ghost text color
  textMuted: '#6b7280',
  white: '#ffffff'
};

const styles = {
  // Modal & Overlay - Protocol Section 1: Core Architecture
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    zIndex: 10000
  },
  modal: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: COLORS.white,
    borderRadius: '16px',
    maxWidth: '400px',
    width: '100%',
    maxHeight: '92vh', // Protocol: 92vh max-height
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    position: 'relative',
    overflow: 'hidden'
  },
  modalContent: {
    flex: 1,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch', // Protocol: smooth mobile scroll
    padding: '16px' // Protocol: standardized spacing
  },
  // Mobile grab handle (hidden by default, shown via CSS)
  grabHandle: {
    display: 'none', // Will be shown via CSS on mobile
    width: '36px',
    height: '4px',
    backgroundColor: COLORS.border,
    borderRadius: '2px',
    margin: '8px auto 0',
    flexShrink: 0
  },
  closeBtn: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    width: '44px',
    height: '44px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: COLORS.primaryPurple, // Protocol: Primary Purple
    borderRadius: '8px',
    transition: 'background 0.2s ease',
    zIndex: 10
  },

  // Logo
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '12px'
  },
  logo: {
    width: '36px',
    height: '36px',
    objectFit: 'contain'
  },

  // Header
  header: {
    textAlign: 'center',
    marginBottom: '24px'
  },
  title: {
    fontSize: '20px',
    fontWeight: '700',
    color: COLORS.textPrimary,
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '14px',
    color: COLORS.textMuted,
    lineHeight: 1.5,
    margin: 0
  },
  subtitleAccent: {
    color: COLORS.primaryPurple, // Protocol: Primary Purple
    fontWeight: '600'
  },

  // User type cards
  userTypeCard: {
    border: `1px solid ${COLORS.border}`,
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    backgroundColor: COLORS.lightPurpleBg // Protocol: Light Purple Background
  },
  userTypeCardSelected: {
    borderColor: COLORS.positivePurple, // Protocol: Positive Purple
    backgroundColor: COLORS.lightPurpleBg,
    boxShadow: '0 8px 30px rgba(49, 19, 93, 0.15)' // Protocol purple shadow
  },
  userTypeIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '10px',
    backgroundColor: COLORS.white,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: COLORS.primaryPurple, // Protocol: Primary Purple
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
  },
  userTypeContent: {
    flex: 1
  },
  userTypeTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: '2px'
  },
  userTypeDesc: {
    fontSize: '13px',
    color: COLORS.textMuted,
    margin: 0,
    lineHeight: 1.4
  },

  // OAuth buttons container (side by side)
  oauthButtonsRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '4px'
  },

  // LinkedIn button (compact, side by side)
  linkedinBtn: {
    flex: 1,
    padding: '12px 16px',
    border: '1px solid #0a66c2',
    backgroundColor: '#0a66c2',
    borderRadius: '100px', // Protocol: pill-shaped
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  linkedinIcon: {
    width: '20px',
    height: '20px',
    backgroundColor: 'white',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    color: '#0a66c2',
    fontSize: '12px',
    flexShrink: 0
  },
  linkedinText: {
    textAlign: 'left'
  },
  linkedinPrimary: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'white'
  },
  linkedinSecondary: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.8)',
    display: 'block',
    marginTop: '2px'
  },

  // Google button (compact, side by side)
  googleBtn: {
    flex: 1,
    padding: '12px 16px',
    backgroundColor: COLORS.lightPurpleBg, // Protocol: Light Purple Background
    border: `1px solid ${COLORS.border}`,
    borderRadius: '100px', // Protocol: pill-shaped
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: COLORS.textPrimary
  },

  // LinkedIn connected state - Protocol: NO GREEN, use Positive Purple
  linkedinConnected: {
    width: '100%',
    padding: '14px 16px',
    border: `1px solid ${COLORS.positivePurple}`, // Protocol: Positive Purple
    backgroundColor: COLORS.lightPurpleBg, // Protocol: Light Purple Background
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '4px'
  },
  linkedinConnectedCheck: {
    width: '32px',
    height: '32px',
    backgroundColor: COLORS.positivePurple, // Protocol: Positive Purple (NO GREEN)
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    flexShrink: 0
  },
  linkedinConnectedInfo: {
    flex: 1
  },
  linkedinConnectedName: {
    fontSize: '14px',
    fontWeight: '600',
    color: COLORS.textPrimary
  },
  linkedinConnectedEmail: {
    fontSize: '12px',
    color: COLORS.textMuted
  },
  linkedinConnectedChange: {
    fontSize: '13px',
    color: COLORS.primaryPurple, // Protocol: Primary Purple
    cursor: 'pointer',
    textDecoration: 'none',
    fontWeight: '500',
    background: 'none',
    border: 'none',
    transition: 'opacity 0.2s ease'
  },

  // Divider
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    margin: '20px 0'
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: COLORS.border
  },
  dividerText: {
    fontSize: '13px',
    color: COLORS.textSecondary,
    fontWeight: '500'
  },

  // Form elements
  formRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px'
  },
  formGroup: {
    flex: 1,
    marginBottom: '16px'
  },
  formGroupInRow: {
    flex: 1,
    marginBottom: 0
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    color: COLORS.primaryPurple, // Protocol: Primary Purple for labels
    marginBottom: '6px'
  },
  prefillBadge: {
    fontSize: '11px',
    color: COLORS.positivePurple, // Protocol: Positive Purple (NO GREEN)
    marginLeft: '6px',
    fontWeight: '500',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${COLORS.border}`,
    borderRadius: '8px',
    fontSize: '14px',
    color: COLORS.textPrimary,
    transition: 'border-color 0.2s ease, background-color 0.2s ease',
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: COLORS.lightPurpleBg, // Protocol: Light Purple Background
    fontFamily: 'inherit'
  },
  inputFocused: {
    borderColor: COLORS.primaryPurple, // Protocol: Primary Purple
    backgroundColor: COLORS.white
  },
  inputError: {
    borderColor: COLORS.emergencyRed // Protocol: Emergency Red
  },
  inputSuccess: {
    borderColor: COLORS.positivePurple // Protocol: Positive Purple (NO GREEN)
  },
  inputPrefilled: {
    backgroundColor: COLORS.lightPurpleBg,
    borderColor: COLORS.border
  },
  helperText: {
    fontSize: '12px',
    color: COLORS.textMuted,
    marginTop: '6px',
    lineHeight: 1.4
  },

  // Select
  select: {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${COLORS.border}`,
    borderRadius: '8px',
    fontSize: '14px',
    color: COLORS.textPrimary,
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: COLORS.lightPurpleBg,
    cursor: 'pointer',
    transition: 'border-color 0.2s ease',
    fontFamily: 'inherit'
  },

  // Password field
  passwordWrapper: {
    position: 'relative'
  },
  inputWithIcon: {
    paddingRight: '44px'
  },
  togglePasswordBtn: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: COLORS.textMuted,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    transition: 'color 0.2s ease'
  },

  // Password requirements - Protocol: NO GREEN, use Positive Purple
  passwordRequirements: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: COLORS.lightPurpleBg, // Protocol: Light Purple Background
    border: `1px solid ${COLORS.border}`,
    borderRadius: '8px'
  },
  requirement: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: COLORS.textMuted,
    marginBottom: '6px'
  },
  requirementLast: {
    marginBottom: 0
  },
  requirementMet: {
    color: COLORS.positivePurple // Protocol: Positive Purple (NO GREEN)
  },
  requirementIcon: {
    width: '16px',
    height: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  // Buttons - Protocol Section 4B: pill-shaped (100px radius)
  buttonPrimary: {
    width: '100%',
    padding: '12px 24px',
    backgroundColor: COLORS.primaryPurple, // Protocol: Primary Purple
    color: 'white',
    border: 'none',
    borderRadius: '100px', // Protocol: pill-shaped
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s ease, box-shadow 0.2s ease',
    marginTop: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'inherit'
  },
  buttonPrimaryHover: {
    backgroundColor: COLORS.secondaryPurple, // Protocol: Secondary Purple for hover
    boxShadow: '0 4px 12px rgba(49, 19, 93, 0.25)'
  },
  buttonDisabled: {
    backgroundColor: COLORS.border,
    cursor: 'not-allowed',
    boxShadow: 'none'
  },
  // Ghost button - Protocol Section 4B
  buttonSecondary: {
    width: '100%',
    padding: '12px 24px',
    backgroundColor: 'transparent',
    border: `1px solid ${COLORS.border}`,
    borderRadius: '100px', // Protocol: pill-shaped
    fontSize: '14px',
    fontWeight: '500',
    color: COLORS.textSecondary,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  // Back button - Ghost style
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    width: '100%',
    background: 'transparent',
    border: `1px solid ${COLORS.border}`, // Protocol: Ghost button
    borderRadius: '100px', // Protocol: pill-shaped
    color: COLORS.textSecondary,
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    padding: '12px',
    marginTop: '8px',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease'
  },

  // Footer link
  footerLink: {
    textAlign: 'center',
    marginTop: '20px',
    paddingTop: '16px',
    borderTop: `1px solid ${COLORS.border}`,
    fontSize: '13px',
    color: COLORS.textMuted
  },
  link: {
    color: COLORS.primaryPurple, // Protocol: Primary Purple
    textDecoration: 'none',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    fontSize: 'inherit',
    fontWeight: '500',
    fontFamily: 'inherit',
    transition: 'opacity 0.2s ease'
  },
  linkText: {
    textAlign: 'center',
    marginTop: '1rem'
  },

  // Legal text
  termsText: {
    fontSize: '12px',
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: '16px',
    lineHeight: 1.5
  },

  // Success state - Protocol: NO GREEN, use Positive Purple
  successIcon: {
    width: '80px',
    height: '80px',
    background: `linear-gradient(135deg, ${COLORS.lightPurpleBg} 0%, rgba(91, 95, 207, 0.1) 100%)`,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
    color: COLORS.positivePurple // Protocol: Positive Purple (NO GREEN)
  },

  // Error box - Protocol: Emergency Red outlined only
  errorBox: {
    padding: '12px',
    backgroundColor: COLORS.white, // Protocol: white/transparent bg for danger
    border: `1px solid ${COLORS.emergencyRed}`, // Protocol: Emergency Red outlined
    borderRadius: '8px',
    marginBottom: '16px'
  },
  errorText: {
    fontSize: '13px',
    color: COLORS.emergencyRed,
    margin: 0
  },
  inlineError: {
    fontSize: '12px',
    color: COLORS.emergencyRed,
    marginTop: '6px'
  },

  // Date inputs (for birthday)
  dateInputsRow: {
    display: 'flex',
    gap: '8px'
  },
  dateSelect: {
    flex: 1,
    padding: '10px 12px',
    border: `1px solid ${COLORS.border}`,
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: COLORS.lightPurpleBg,
    cursor: 'pointer',
    fontFamily: 'inherit'
  },

  // Section label
  sectionLabel: {
    fontSize: '13px',
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: '12px'
  },

  // Required note
  requiredNote: {
    fontSize: '12px',
    color: COLORS.textMuted,
    marginBottom: '16px'
  }
};

// ============================================================================
// Helper Functions
// ============================================================================

const EyeIcon = ({ open }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const LoadingSpinner = ({ size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    style={{
      animation: 'spin 1s linear infinite',
      marginRight: '8px',
      verticalAlign: 'middle'
    }}
  >
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" />
    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" />
  </svg>
);

// Close icon (X) - Protocol: 32x32, strokeWidth 2.5
const CloseIcon = ({ size = 32 }) => (
  <svg
    className="signup-modal-close-icon"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ width: size, height: size, minWidth: size, minHeight: size, flexShrink: 0 }}
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// Feather-style icons for user type cards
const UserPlusIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <line x1="20" y1="8" x2="20" y2="14" />
    <line x1="23" y1="11" x2="17" y2="11" />
  </svg>
);

const LogInIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <polyline points="10 17 15 12 10 7" />
    <line x1="15" y1="12" x2="3" y2="12" />
  </svg>
);

const BarChartIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const HomeIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const KeyIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);

const ChevronRightIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const MailIcon = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const CheckIcon = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CheckCircleIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const CircleIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
  </svg>
);

// Google logo SVG
const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

// Split Lease logo URL
const LOGO_URL = 'https://d1muf25xaso8hp.cloudfront.net/https%3A%2F%2F50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io%2Ff1587601671931x294112149689599100%2Fsplit%2520lease%2520purple%2520circle.png?w=48&h=&auto=enhance&dpr=1&q=100&fit=max';

// Generate arrays for date selectors
const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

const getDaysInMonth = (month, year) => {
  if (!month || !year) return Array.from({ length: 31 }, (_, i) => i + 1);
  return Array.from({ length: new Date(year, month, 0).getDate() }, (_, i) => i + 1);
};

const isOver18 = (birthMonth, birthDay, birthYear) => {
  if (!birthMonth || !birthDay || !birthYear) return false;
  const today = new Date();
  const birthDate = new Date(birthYear, birthMonth - 1, birthDay);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 18;
};

// ============================================================================
// Component
// ============================================================================

export default function SignUpLoginModal({
  isOpen,
  onClose,
  initialView = 'initial',
  onAuthSuccess,
  disableClose = false,
  defaultUserType = null, // 'host' or 'guest' for route-based prefilling
  skipReload = false, // When true, don't reload page after auth success (for modal flows)
  prefillEmail = null // Email to prefill in signup form (from OAuth user not found)
}) {
  // Toast notifications (with fallback rendering when no ToastProvider)
  const { toasts, showToast, removeToast } = useToast();

  // View state
  const [currentView, setCurrentView] = useState(VIEWS.ENTRY);

  // Signup form state (persisted between steps)
  const [signupData, setSignupData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    userType: defaultUserType === 'host' ? USER_TYPES.HOST : USER_TYPES.GUEST,
    birthMonth: '',
    birthDay: '',
    birthYear: '',
    phoneNumber: '', // Kept for backend compatibility, but not collected in UI
    password: '',
    confirmPassword: ''
  });

  // Card hover states for user type cards
  const [hoveredCard, setHoveredCard] = useState(null);

  // Login form state
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  // Password reset state
  const [resetEmail, setResetEmail] = useState('');

  // UI state
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [passwordMismatch, setPasswordMismatch] = useState(false);

  // Duplicate email state (for OAuth signup flows)
  const [duplicateEmailData, setDuplicateEmailData] = useState({
    email: '',
    showModal: false
  });

  // User not found state (for OAuth login flows)
  const [userNotFoundData, setUserNotFoundData] = useState({
    email: '',
    showModal: false
  });

  // Initialize view and prefill based on props
  useEffect(() => {
    if (isOpen) {
      // Map initialView prop to internal view state
      if (initialView === 'login') {
        setCurrentView(VIEWS.LOGIN);
      } else if (initialView === 'signup' || initialView === 'signup-step1') {
        // If defaultUserType is provided, skip user type selection and go directly to identity form
        if (defaultUserType) {
          setCurrentView(VIEWS.IDENTITY);
        } else {
          setCurrentView(VIEWS.USER_TYPE);
        }
      } else if (initialView === 'signup-step2' || initialView === 'identity') {
        setCurrentView(VIEWS.IDENTITY);
      } else {
        setCurrentView(VIEWS.ENTRY);
      }
      setError('');
      setHoveredCard(null);

      // Prefill user type if provided
      if (defaultUserType) {
        setSignupData(prev => ({
          ...prev,
          userType: defaultUserType === 'host' ? USER_TYPES.HOST : USER_TYPES.GUEST
        }));
      }

      // Prefill email if provided (e.g., from OAuth user not found)
      if (prefillEmail) {
        setSignupData(prev => ({
          ...prev,
          email: prefillEmail
        }));
      }
    }
  }, [isOpen, initialView, defaultUserType, prefillEmail]);

  // Check password match in real-time
  useEffect(() => {
    if (signupData.confirmPassword && signupData.password !== signupData.confirmPassword) {
      setPasswordMismatch(true);
    } else {
      setPasswordMismatch(false);
    }
  }, [signupData.password, signupData.confirmPassword]);

  // OAuth callback detection (supports LinkedIn and Google)
  useEffect(() => {
    // Only run on initial mount
    const linkedInUserType = getLinkedInOAuthUserType();
    const googleUserType = getGoogleOAuthUserType();

    // Check if this is a signup flow callback
    if (!linkedInUserType && !googleUserType) return;

    // Check if we're returning from OAuth (look for access_token or code in URL hash)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hasAccessToken = hashParams.get('access_token');
    const urlParams = new URLSearchParams(window.location.search);
    const hasCode = urlParams.get('code');

    if (!hasAccessToken && !hasCode) return;

    // Determine which provider we're handling
    const isGoogleCallback = !!googleUserType;
    const providerName = isGoogleCallback ? 'Google' : 'LinkedIn';

    // We're returning from OAuth - handle the callback
    const handleCallback = async () => {
      setIsLoading(true);

      showToast({
        title: 'Signing up...',
        content: `Connecting your ${providerName} account`,
        type: 'info',
        duration: 3000
      });

      const result = isGoogleCallback
        ? await handleGoogleOAuthCallback()
        : await handleLinkedInOAuthCallback();

      setIsLoading(false);

      if (result.success) {
        showToast({
          title: 'Welcome to Split Lease!',
          content: 'Your account has been created successfully.',
          type: 'success',
          duration: 4000
        });

        if (onAuthSuccess) {
          onAuthSuccess(result);
        }

        // Redirect to profile page
        setTimeout(() => {
          const userId = result.data?.user_id;
          console.log('[SignUpModal] Redirecting to profile with user_id:', userId);
          console.log('[SignUpModal] Full result:', JSON.stringify(result, null, 2));
          console.log('[SignUpModal] result.data:', JSON.stringify(result.data, null, 2));
          console.log('[SignUpModal] userId is undefined?', userId === undefined);
          console.log('[SignUpModal] userId type:', typeof userId);

          if (!userId) {
            console.error('[SignUpModal] ERROR: user_id is missing from result.data!');
            console.error('[SignUpModal] This will cause a redirect to wrong page');
            return;
          }

          window.location.href = '/account-profile';
        }, 1500);
      } else if (result.isDuplicate) {
        // Show duplicate email confirmation modal
        setDuplicateEmailData({
          email: result.existingEmail,
          showModal: true
        });
      } else {
        showToast({
          title: 'Signup Failed',
          content: result.error || 'Please try again.',
          type: 'error',
          duration: 5000
        });
        setError(result.error || 'OAuth signup failed. Please try again.');
      }
    };

    handleCallback();
  }, []); // Only run once on mount

  // NOTE: OAuth LOGIN callback detection has been moved to global handler
  // See app/src/lib/oauthCallbackHandler.js
  // The global handler processes OAuth callbacks during app initialization (before React mounts)
  // and dispatches custom events that Header.jsx listens for to update UI

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && !disableClose) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      document.body.classList.add('auth-modal-open');
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
      document.body.classList.remove('auth-modal-open');
    };
  }, [isOpen, disableClose, onClose]);

  // Handle overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !disableClose) {
      onClose();
    }
  };

  // Reset all forms
  const resetForms = useCallback(() => {
    setSignupData({
      firstName: '',
      lastName: '',
      email: '',
      userType: defaultUserType === 'host' ? USER_TYPES.HOST : USER_TYPES.GUEST,
      birthMonth: '',
      birthDay: '',
      birthYear: '',
      phoneNumber: '',
      password: '',
      confirmPassword: ''
    });
    setLoginData({ email: '', password: '' });
    setResetEmail('');
    setError('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setShowLoginPassword(false);
    setPasswordMismatch(false);
  }, [defaultUserType]);

  // Navigation helpers
  const goToEntry = () => {
    setCurrentView(VIEWS.ENTRY);
    setError('');
    setHoveredCard(null);
  };

  const goToUserType = () => {
    setCurrentView(VIEWS.USER_TYPE);
    setError('');
    setHoveredCard(null);
  };

  const goToIdentity = () => {
    setCurrentView(VIEWS.IDENTITY);
    setError('');
  };

  const goToPassword = () => {
    setCurrentView(VIEWS.PASSWORD);
    setError('');
  };

  const goToLogin = () => {
    setCurrentView(VIEWS.LOGIN);
    setError('');
    // Preserve email if coming from signup
    if (signupData.email) {
      setLoginData(prev => ({ ...prev, email: signupData.email }));
    }
  };

  const goToPasswordReset = () => {
    setCurrentView(VIEWS.PASSWORD_RESET);
    setResetEmail(loginData.email); // Preserve email from login
    setError('');
  };

  const goToMagicLink = () => {
    setCurrentView(VIEWS.MAGIC_LINK);
    setResetEmail(loginData.email); // Preserve email from login
    setError('');
  };

  const showSuccess = () => {
    setCurrentView(VIEWS.SUCCESS);
  };

  // Legacy aliases for backward compatibility
  const goToSignupStep1 = goToUserType;
  const goToSignupStep2 = goToIdentity;
  const goToInitial = goToEntry;

  // Handle identity step continue (Step 2 → Step 3)
  const handleIdentityContinue = (e) => {
    e.preventDefault();
    setError('');

    // Validate identity fields
    if (!signupData.firstName.trim()) {
      setError('First name is required.');
      return;
    }
    if (!signupData.lastName.trim()) {
      setError('Last name is required.');
      return;
    }
    if (!signupData.email.trim()) {
      setError('Email is required.');
      return;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signupData.email)) {
      setError('Please enter a valid email address.');
      return;
    }

    // Validate birthday
    if (!signupData.birthMonth || !signupData.birthDay || !signupData.birthYear) {
      setError('Please enter your date of birth.');
      return;
    }

    if (!isOver18(parseInt(signupData.birthMonth), parseInt(signupData.birthDay), parseInt(signupData.birthYear))) {
      setError('You must be at least 18 years old to use Split Lease.');
      return;
    }

    goToPassword();
  };

  // Legacy alias
  const handleSignupStep1Continue = handleIdentityContinue;

  // Handle final signup submission (Step 3)
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate password
    if (!signupData.password) {
      setError('Password is required.');
      return;
    }

    if (signupData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    // Check for mix of letters and numbers
    const hasLetters = /[a-zA-Z]/.test(signupData.password);
    const hasNumbers = /[0-9]/.test(signupData.password);
    if (!hasLetters || !hasNumbers) {
      setError('Password must contain both letters and numbers.');
      return;
    }

    setIsLoading(true);

    // Show initial toast
    showToast({
      title: 'Thank you!',
      content: 'Creating your account...',
      type: 'info',
      duration: 3000
    });

    // Show second toast after a delay
    const robotsToastTimeout = setTimeout(() => {
      showToast({
        title: 'Almost there!',
        content: 'Our robots are still working...',
        type: 'info',
        duration: 3000
      });
    }, 1500);

    // Call signup with extended data
    // Note: Pass password as both password and retype since we removed confirm field
    // (password validation is done via requirements UI in renderPasswordView)
    const result = await signupUser(
      signupData.email,
      signupData.password,
      signupData.password, // Use same password for retype since we validate via requirements UI
      {
        firstName: signupData.firstName,
        lastName: signupData.lastName,
        userType: signupData.userType,
        birthDate: `${signupData.birthYear}-${String(signupData.birthMonth).padStart(2, '0')}-${String(signupData.birthDay).padStart(2, '0')}`,
        phoneNumber: signupData.phoneNumber || '' // Empty string if not provided
      }
    );

    clearTimeout(robotsToastTimeout);
    setIsLoading(false);

    if (result.success) {
      showToast({
        title: 'Welcome to Split Lease!',
        content: 'Your account has been created successfully.',
        type: 'success',
        duration: 4000
      });

      if (onAuthSuccess) {
        onAuthSuccess(result);
      }

      // Delay closing the modal to let the success toast be visible
      // The toast is rendered inside the modal, so we need to keep it open briefly
      setTimeout(() => {
        onClose();
        if (!skipReload) {
          setTimeout(() => {
            window.location.reload();
          }, 300);
        }
      }, 1500); // Show toast for 1.5 seconds before closing
    } else {
      showToast({
        title: 'Signup Failed',
        content: result.error || 'Please try again.',
        type: 'error',
        duration: 5000
      });
      setError(result.error || 'Signup failed. Please try again.');
    }
  };

  // Handle login submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Show initial toast
    showToast({
      title: 'Welcome back!',
      content: 'Logging you in...',
      type: 'info',
      duration: 3000
    });

    // Show second toast after a delay
    const robotsToastTimeout = setTimeout(() => {
      showToast({
        title: 'Almost there!',
        content: 'Our robots are still working...',
        type: 'info',
        duration: 3000
      });
    }, 1500);

    const result = await loginUser(loginData.email, loginData.password);
    console.log('[SignUpLoginModal] loginUser result:', result);

    if (result.success) {
      console.log('[SignUpLoginModal] Login successful, proceeding with post-login flow...');

      // Fetch and cache user data before reload for optimistic UI
      // This ensures the next page load has the correct user's firstName cached
      // CRITICAL: Use clearOnFailure: false to preserve the fresh session even if validation fails
      // The session was just established by login - don't let a failed user profile fetch clear it
      try {
        console.log('[SignUpLoginModal] Fetching user data...');
        await validateTokenAndFetchUser({ clearOnFailure: false });
        console.log('[SignUpLoginModal] User data fetched successfully');
      } catch (validationError) {
        console.warn('[SignUpLoginModal] User data fetch failed, continuing with login:', validationError);
        // Don't block login - the page reload will fetch fresh data
      }

      clearTimeout(robotsToastTimeout);
      setIsLoading(false);

      // Show success toast
      showToast({
        title: 'Login Successful!',
        content: 'Welcome back to Split Lease.',
        type: 'success',
        duration: 4000
      });

      console.log('[SignUpLoginModal] Calling onAuthSuccess and onClose...');
      if (onAuthSuccess) {
        onAuthSuccess(result);
      }

      // Close modal after a brief delay to let toast render
      setTimeout(() => {
        onClose();

        console.log('[SignUpLoginModal] skipReload:', skipReload);
        if (!skipReload) {
          // Delay reload to allow user to see success message and Header to update
          console.log('[SignUpLoginModal] Scheduling page reload in 1.5s...');
          setTimeout(() => {
            console.log('[SignUpLoginModal] Triggering page reload...');
            window.location.reload();
          }, 1500);
        }
      }, 500);
    } else {
      clearTimeout(robotsToastTimeout);
      setIsLoading(false);

      showToast({
        title: 'Login Failed',
        content: result.error || 'Please check your credentials.',
        type: 'error',
        duration: 5000
      });
      setError(result.error || 'Login failed. Please check your credentials.');
    }
  };

  // Handle password reset
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError('');

    if (!resetEmail.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setIsLoading(true);

    try {
      // Capture current page to return user after password reset
      const currentPath = window.location.pathname + window.location.search;
      const returnToParam = encodeURIComponent(currentPath);

      // Call the password reset workflow via Edge Function
      const { data, error: fnError } = await supabase.functions.invoke('auth-user', {
        body: {
          action: 'request_password_reset',
          payload: {
            email: resetEmail,
            redirectTo: `${window.location.origin}/reset-password?returnTo=${returnToParam}`
          }
        }
      });

      if (fnError) {
        // Don't expose error details - always show success for security
        console.error('Password reset error:', fnError);
      }

      // Navigate to confirmation view instead of showing toast
      setCurrentView(VIEWS.RESET_SENT);
    } catch (err) {
      console.error('Password reset error:', err);
      // Still navigate to confirmation view for security (prevent email enumeration)
      setCurrentView(VIEWS.RESET_SENT);
    }

    setIsLoading(false);
  };

  // Handle magic link request
  const handleMagicLink = async (e) => {
    if (e) e.preventDefault();
    const email = (currentView === VIEWS.PASSWORD_RESET || currentView === VIEWS.MAGIC_LINK) ? resetEmail : loginData.email;

    if (!email.trim()) {
      setError('Please enter your email address first.');
      return;
    }

    setIsLoading(true);
    setError('');

    // Navigate to confirmation view for security (prevents email enumeration)
    const showSuccessView = () => {
      setCurrentView(VIEWS.MAGIC_LINK_SENT);
    };

    try {
      // Step 1: Check if user exists (using Supabase directly)
      const { data: userData, error: userError } = await supabase
        .from('user')
        .select('_id, "Name - First", email, "Phone Number (as text)"')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (userError) {
        console.error('[handleMagicLink] Error checking user:', userError);
        // Don't expose error - show success for security
        showSuccessView();
        setIsLoading(false);
        return;
      }

      if (!userData) {
        // User doesn't exist - still show success view for security
        console.log('[handleMagicLink] No user found for email');
        showSuccessView();
        setIsLoading(false);
        return;
      }

      // Step 2: User exists - fetch BCC email addresses from os_slack_channels
      console.log('[handleMagicLink] Fetching BCC email addresses from os_slack_channels');

      const { data: channelData, error: channelError } = await supabase
        .schema('reference_table')
        .from('os_slack_channels')
        .select('email_address')
        .in('name', ['bots_log', 'customer_activation']);

      let bccEmails = [];
      if (!channelError && channelData) {
        bccEmails = channelData
          .map(c => c.email_address)
          .filter(e => e && e.trim() && e.includes('@'));
        console.log('[handleMagicLink] BCC emails:', bccEmails);
      } else if (channelError) {
        console.warn('[handleMagicLink] Error fetching BCC channels:', channelError);
        // Continue without BCC - don't fail the whole operation
      }

      // Step 3: Generate magic link
      console.log('[handleMagicLink] User found, generating magic link');

      const redirectTo = `${window.location.origin}/account-profile`;

      const { data: magicLinkData, error: magicLinkError } = await supabase.functions.invoke('auth-user', {
        body: {
          action: 'generate_magic_link',
          payload: {
            email: email.toLowerCase().trim(),
            redirectTo: redirectTo
          }
        }
      });

      if (magicLinkError || !magicLinkData?.success) {
        console.error('[handleMagicLink] Error generating magic link:', magicLinkError || magicLinkData);
        // Don't expose error - show success for security
        showSuccessView();
        setIsLoading(false);
        return;
      }

      const magicLink = magicLinkData.data.action_link;
      const firstName = userData['Name - First'] || 'there';

      // Step 4: Send magic link email using send-email edge function
      console.log('[handleMagicLink] Sending magic link email');

      // Build the body text with the user's first name
      const bodyText = `Hi ${firstName}. Please use the link below to log in to your Split Lease account. Once logged in, you can update your password from the profile page. Please feel free to text (937) 673-7470 with any queries.`;

      const { data: emailData, error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          action: 'send',
          payload: {
            template_id: '1757433099447x202755280527849400', // Security 2 template
            to_email: email.toLowerCase().trim(),
            variables: {
              toemail: email.toLowerCase().trim(),
              fromemail: 'tech@leasesplit.com',
              fromname: 'Split Lease',
              subject: 'Your Split Lease Magic Login Link',
              preheadertext: 'Click the link to log in without a password',
              title: 'Magic Login Link',
              bodytext: bodyText,
              buttonurl: magicLink,
              buttontext: 'Log In Now',
              bannertext1: 'SECURITY NOTICE',
              bannertext2: 'This link expires in 1 hour',
              bannertext3: "If you didn't request this, please ignore this email",
              footermessage: 'For your security, never share this link with anyone.',
              cc: '',  // No CC for user-facing emails
              bcc: ''  // BCC handled via bcc_emails array
            },
            // Dynamic BCC from os_slack_channels
            ...(bccEmails.length > 0 && { bcc_emails: bccEmails })
          }
        }
      });

      if (emailError) {
        console.error('[handleMagicLink] Error sending email:', emailError);
        // Still show success for security
      } else {
        console.log('[handleMagicLink] Magic link email sent successfully');
      }

      // Step 5: Send SMS if user has a phone number
      const rawPhone = userData['Phone Number (as text)'];
      if (rawPhone && rawPhone.trim()) {
        console.log('[handleMagicLink] User has phone number, sending SMS');

        // Format phone to E.164 (+1xxxxxxxxxx)
        const digitsOnly = rawPhone.replace(/\D/g, '');
        let formattedPhone = null;

        if (digitsOnly.length === 10) {
          // 10 digits: assume US, prepend +1
          formattedPhone = `+1${digitsOnly}`;
        } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
          // 11 digits starting with 1: prepend +
          formattedPhone = `+${digitsOnly}`;
        } else if (rawPhone.startsWith('+') && digitsOnly.length >= 10) {
          // Already has + prefix
          formattedPhone = `+${digitsOnly}`;
        }

        if (formattedPhone) {
          const smsBody = `Passwords are tricky. Please use this magic link and you can update your password right from the profile page: ${magicLink}`;

          try {
            const { data: smsData, error: smsError } = await supabase.functions.invoke('send-sms', {
              body: {
                action: 'send',
                payload: {
                  from: '+14155692985',
                  to: formattedPhone,
                  body: smsBody
                }
              }
            });

            if (smsError) {
              console.error('[handleMagicLink] Error sending SMS:', smsError);
              // Don't fail - SMS is supplementary to email
            } else {
              console.log('[handleMagicLink] Magic link SMS sent successfully');
            }
          } catch (smsErr) {
            console.error('[handleMagicLink] SMS exception:', smsErr);
            // Don't fail - SMS is supplementary
          }
        } else {
          console.log('[handleMagicLink] Could not format phone number:', rawPhone);
        }
      }

      showSuccessView();

    } catch (err) {
      console.error('[handleMagicLink] Unexpected error:', err);
      // Don't expose error - show success for security
      showSuccessView();
    }

    setIsLoading(false);
  };

  // Inject keyframe animations and mobile bottom-sheet styles
  useEffect(() => {
    const styleId = 'signup-modal-protocol-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes signupModalSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        /* Mobile bottom-sheet mode - Protocol Section 1 */
        @media (max-width: 480px) {
          .signup-modal-overlay {
            align-items: flex-end !important;
            padding: 0 !important;
          }

          .signup-modal-container {
            border-radius: 24px 24px 0 0 !important;
            max-width: 100% !important;
            max-height: 92vh !important;
            animation: signupModalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
          }

          .signup-modal-grab-handle {
            display: block !important;
          }

          .signup-modal-close-btn {
            width: 48px !important;
            height: 48px !important;
            top: 8px !important;
            right: 8px !important;
          }

          .signup-modal-close-btn svg,
          .signup-modal-close-icon {
            width: 36px !important;
            height: 36px !important;
            min-width: 36px !important;
            min-height: 36px !important;
            stroke-width: 2.5 !important;
          }
        }

        /* Protocol: Explicit icon sizing to prevent CSS conflicts */
        .signup-modal-close-icon {
          width: 32px !important;
          height: 32px !important;
          min-width: 32px !important;
          min-height: 32px !important;
          flex-shrink: 0 !important;
        }

        /* Close button hover - Protocol */
        .signup-modal-close-btn:hover {
          background: #F7F2FA !important;
        }

        /* Back button hover - Ghost style */
        .signup-modal-back-btn:hover {
          background: #F7F2FA !important;
          border-color: #31135D !important;
          color: #31135D !important;
        }

        /* Primary button hover */
        .signup-modal-btn-primary:hover:not(:disabled) {
          background: #6D31C2 !important;
        }

        /* Secondary button hover */
        .signup-modal-btn-secondary:hover {
          background: #F7F2FA !important;
          border-color: #31135D !important;
          color: #31135D !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  if (!isOpen) return null;

  // ============================================================================
  // Render Functions for Each View
  // ============================================================================

  // Entry View (Step 0) - Premium card-based selection
  const renderEntryView = () => (
    <>
      <div style={styles.logoContainer}>
        <img src={LOGO_URL} alt="Split Lease" style={styles.logo} />
      </div>

      <div style={styles.header}>
        <h1 style={styles.title}>Welcome to Split Lease</h1>
        <p style={styles.subtitle}>How can we help you today?</p>
      </div>

      {/* Card: I'm new around here */}
      <div
        style={{
          ...styles.userTypeCard,
          ...(hoveredCard === 'new' ? styles.userTypeCardSelected : {})
        }}
        onClick={goToUserType}
        onMouseEnter={() => setHoveredCard('new')}
        onMouseLeave={() => setHoveredCard(null)}
      >
        <div style={styles.userTypeIcon}>
          <UserPlusIcon size={24} />
        </div>
        <div style={styles.userTypeContent}>
          <div style={styles.userTypeTitle}>I'm new around here</div>
          <p style={styles.userTypeDesc}>Create an account to get started</p>
        </div>
      </div>

      {/* Card: Log into my account */}
      <div
        style={{
          ...styles.userTypeCard,
          ...(hoveredCard === 'login' ? styles.userTypeCardSelected : {})
        }}
        onClick={goToLogin}
        onMouseEnter={() => setHoveredCard('login')}
        onMouseLeave={() => setHoveredCard(null)}
      >
        <div style={styles.userTypeIcon}>
          <LogInIcon size={24} />
        </div>
        <div style={styles.userTypeContent}>
          <div style={styles.userTypeTitle}>Log into my account</div>
          <p style={styles.userTypeDesc}>Welcome back! Sign in to continue</p>
        </div>
      </div>

      {/* Card: Market Report */}
      <div
        style={{
          ...styles.userTypeCard,
          ...(hoveredCard === 'market' ? styles.userTypeCardSelected : {})
        }}
        onClick={goToUserType}
        onMouseEnter={() => setHoveredCard('market')}
        onMouseLeave={() => setHoveredCard(null)}
      >
        <div style={styles.userTypeIcon}>
          <BarChartIcon size={24} />
        </div>
        <div style={styles.userTypeContent}>
          <div style={styles.userTypeTitle}>Sign Up with Market Report</div>
          <p style={styles.userTypeDesc}>Get NYC rental insights and create an account</p>
        </div>
      </div>
    </>
  );

  // Legacy alias
  const renderInitialView = renderEntryView;

  // User Type View (Step 1) - Guest/Host selection
  const renderUserTypeView = () => (
    <>
      <div style={styles.logoContainer}>
        <img src={LOGO_URL} alt="Split Lease" style={styles.logo} />
      </div>

      <div style={styles.header}>
        <h1 style={styles.title}>What brings you here?</h1>
        <p style={styles.subtitle}>I'm here to...</p>
      </div>

      {/* Guest card */}
      <div
        style={{
          ...styles.userTypeCard,
          ...(hoveredCard === 'guest' || signupData.userType === USER_TYPES.GUEST ? styles.userTypeCardSelected : {})
        }}
        onClick={() => {
          setSignupData({ ...signupData, userType: USER_TYPES.GUEST });
          setTimeout(goToIdentity, 200);
        }}
        onMouseEnter={() => setHoveredCard('guest')}
        onMouseLeave={() => setHoveredCard(null)}
      >
        <div style={styles.userTypeIcon}>
          <HomeIcon size={24} />
        </div>
        <div style={styles.userTypeContent}>
          <div style={styles.userTypeTitle}>Find a place to stay</div>
          <p style={styles.userTypeDesc}>Browse flexible rentals across NYC</p>
        </div>
      </div>

      {/* Host card */}
      <div
        style={{
          ...styles.userTypeCard,
          ...(hoveredCard === 'host' || signupData.userType === USER_TYPES.HOST ? styles.userTypeCardSelected : {})
        }}
        onClick={() => {
          setSignupData({ ...signupData, userType: USER_TYPES.HOST });
          setTimeout(goToIdentity, 200);
        }}
        onMouseEnter={() => setHoveredCard('host')}
        onMouseLeave={() => setHoveredCard(null)}
      >
        <div style={styles.userTypeIcon}>
          <KeyIcon size={24} />
        </div>
        <div style={styles.userTypeContent}>
          <div style={styles.userTypeTitle}>Share my space</div>
          <p style={styles.userTypeDesc}>List your place for nightly, weekly, or monthly stays</p>
        </div>
      </div>

      <button className="signup-modal-back-btn" style={styles.backBtn} onClick={goToEntry}>
        <ArrowLeftIcon /> Back
      </button>
    </>
  );

  // Login View - Premium styling with OAuth buttons
  const renderLoginView = () => (
    <>
      <div style={styles.logoContainer}>
        <img src={LOGO_URL} alt="Split Lease" style={styles.logo} />
      </div>

      <div style={styles.header}>
        <h1 style={styles.title}>Welcome back!</h1>
        <p style={styles.subtitle}>Log in to your Split Lease account</p>
      </div>

      {/* OAuth Buttons Row (side by side) */}
      <div style={styles.oauthButtonsRow}>
        {/* LinkedIn OAuth Button */}
        <button
          type="button"
          style={styles.linkedinBtn}
          onClick={async () => {
            const result = await initiateLinkedInOAuthLogin();
            if (!result.success) {
              setError(result.error || 'Failed to start LinkedIn login');
            }
          }}
          disabled={isLoading}
        >
          <div style={styles.linkedinIcon}>in</div>
          <span style={styles.linkedinPrimary}>LinkedIn</span>
        </button>

        {/* Google OAuth Button */}
        <button
          type="button"
          style={styles.googleBtn}
          onClick={async () => {
            const result = await initiateGoogleOAuthLogin();
            if (!result.success) {
              setError(result.error || 'Failed to start Google login');
            }
          }}
          disabled={isLoading}
        >
          <GoogleLogo />
          <span>Google</span>
        </button>
      </div>

      <div style={styles.divider}>
        <div style={styles.dividerLine} />
        <span style={styles.dividerText}>or</span>
        <div style={styles.dividerLine} />
      </div>

      <form onSubmit={handleLoginSubmit}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            value={loginData.email}
            onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
            required
            placeholder="john@example.com"
            style={styles.input}
            onFocus={(e) => {
              e.target.style.borderColor = '#31135D';
              e.target.style.backgroundColor = 'white';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#E7E0EC';
              e.target.style.backgroundColor = '#F7F2FA';
            }}
          />
        </div>

        <div style={{ ...styles.formGroup, marginBottom: '8px' }}>
          <label style={styles.label}>Password</label>
          <div style={styles.passwordWrapper}>
            <input
              type={showLoginPassword ? 'text' : 'password'}
              value={loginData.password}
              onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
              required
              placeholder="Enter your password"
              style={{ ...styles.input, ...styles.inputWithIcon }}
              onFocus={(e) => {
                e.target.style.borderColor = '#31135D';
                e.target.style.backgroundColor = 'white';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#E7E0EC';
                e.target.style.backgroundColor = '#F7F2FA';
              }}
            />
            <button
              type="button"
              onClick={() => setShowLoginPassword(!showLoginPassword)}
              style={styles.togglePasswordBtn}
            >
              <EyeIcon open={showLoginPassword} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <button type="button" onClick={goToMagicLink} style={{ ...styles.link, fontSize: '13px' }}>
            Log in without password
          </button>
          <button type="button" onClick={goToPasswordReset} style={{ ...styles.link, fontSize: '13px' }}>
            Forgot password?
          </button>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <p style={styles.errorText}>{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !loginData.email || !loginData.password}
          style={{
            ...styles.buttonPrimary,
            ...(isLoading || !loginData.email || !loginData.password ? styles.buttonDisabled : {})
          }}
        >
          {isLoading ? (
            <>
              <LoadingSpinner size={18} />
              Logging in...
            </>
          ) : (
            'Log In'
          )}
        </button>

        <div style={styles.footerLink}>
          Don't have an account?{' '}
          <button type="button" onClick={goToUserType} style={styles.link}>
            Sign up
          </button>
        </div>
      </form>
    </>
  );

  // Identity View (Step 2) - Name, email, birthday with OAuth options
  const renderIdentityView = () => (
    <>
      <div style={styles.logoContainer}>
        <img src={LOGO_URL} alt="Split Lease" style={styles.logo} />
      </div>

      <div style={styles.header}>
        <h1 style={styles.title}>Nice to meet you!</h1>
        <p style={styles.subtitle}>Tell us a bit about yourself</p>
      </div>

      {/* OAuth Buttons Row (side by side) */}
      <div style={styles.oauthButtonsRow}>
        {/* LinkedIn OAuth Button */}
        <button
          type="button"
          style={styles.linkedinBtn}
          onClick={async () => {
            const result = await initiateLinkedInOAuth(signupData.userType);
            if (!result.success) {
              setError(result.error || 'Failed to start LinkedIn signup');
            }
          }}
          disabled={isLoading}
        >
          <div style={styles.linkedinIcon}>in</div>
          <span style={styles.linkedinPrimary}>LinkedIn</span>
        </button>

        {/* Google OAuth Button */}
        <button
          type="button"
          style={styles.googleBtn}
          onClick={async () => {
            const result = await initiateGoogleOAuth(signupData.userType);
            if (!result.success) {
              setError(result.error || 'Failed to start Google signup');
            }
          }}
          disabled={isLoading}
        >
          <GoogleLogo />
          <span>Google</span>
        </button>
      </div>

      <div style={styles.divider}>
        <div style={styles.dividerLine} />
        <span style={styles.dividerText}>or enter manually</span>
        <div style={styles.dividerLine} />
      </div>

      <form onSubmit={handleIdentityContinue}>
        <div style={styles.formRow}>
          <div style={styles.formGroupInRow}>
            <label style={styles.label}>First Name</label>
            <input
              type="text"
              value={signupData.firstName}
              onChange={(e) => setSignupData({ ...signupData, firstName: e.target.value })}
              required
              placeholder="John"
              style={styles.input}
              onFocus={(e) => {
                e.target.style.borderColor = '#31135D';
                e.target.style.backgroundColor = 'white';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#E7E0EC';
                e.target.style.backgroundColor = '#F7F2FA';
              }}
            />
          </div>
          <div style={styles.formGroupInRow}>
            <label style={styles.label}>Last Name</label>
            <input
              type="text"
              value={signupData.lastName}
              onChange={(e) => setSignupData({ ...signupData, lastName: e.target.value })}
              required
              placeholder="Smith"
              style={styles.input}
              onFocus={(e) => {
                e.target.style.borderColor = '#31135D';
                e.target.style.backgroundColor = 'white';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#E7E0EC';
                e.target.style.backgroundColor = '#F7F2FA';
              }}
            />
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            value={signupData.email}
            onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
            required
            placeholder="john@example.com"
            style={styles.input}
            onFocus={(e) => {
              e.target.style.borderColor = '#31135D';
              e.target.style.backgroundColor = 'white';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#E7E0EC';
              e.target.style.backgroundColor = '#F7F2FA';
            }}
          />
          <p style={styles.helperText}>We'll use this for login and important updates</p>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Birthday</label>
          <div style={styles.dateInputsRow}>
            <select
              value={signupData.birthMonth}
              onChange={(e) => setSignupData({ ...signupData, birthMonth: e.target.value })}
              style={styles.dateSelect}
            >
              <option value="">Month</option>
              {months.map((month, idx) => (
                <option key={month} value={idx + 1}>{month}</option>
              ))}
            </select>
            <select
              value={signupData.birthDay}
              onChange={(e) => setSignupData({ ...signupData, birthDay: e.target.value })}
              style={styles.dateSelect}
            >
              <option value="">Day</option>
              {getDaysInMonth(parseInt(signupData.birthMonth), parseInt(signupData.birthYear)).map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
            <select
              value={signupData.birthYear}
              onChange={(e) => setSignupData({ ...signupData, birthYear: e.target.value })}
              style={styles.dateSelect}
            >
              <option value="">Year</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <p style={styles.helperText}>Required for age verification</p>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <p style={styles.errorText}>{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          style={{
            ...styles.buttonPrimary,
            ...(isLoading ? styles.buttonDisabled : {})
          }}
        >
          Continue
        </button>

        <button type="button" className="signup-modal-back-btn" style={styles.backBtn} onClick={goToUserType}>
          <ArrowLeftIcon /> Back
        </button>
      </form>
    </>
  );

  // Legacy alias
  const renderSignupStep1 = renderIdentityView;

  // Password View (Step 3) - Password creation with requirements
  const renderPasswordView = () => {
    // Password validation state
    const hasLength = signupData.password.length >= 8;
    const hasLetters = /[a-zA-Z]/.test(signupData.password);
    const hasNumbers = /[0-9]/.test(signupData.password);
    const hasMix = hasLetters && hasNumbers;
    const isValid = hasLength && hasMix;

    return (
      <>
        <div style={styles.logoContainer}>
          <img src={LOGO_URL} alt="Split Lease" style={styles.logo} />
        </div>

        <div style={styles.header}>
          <h1 style={styles.title}>Almost there, {signupData.firstName || 'there'}!</h1>
          <p style={styles.subtitle}>Create a password to secure your account</p>
        </div>

        <form onSubmit={handleSignupSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.passwordWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={signupData.password}
                onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                required
                placeholder="Create a password"
                style={{ ...styles.input, ...styles.inputWithIcon }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#31135D';
                  e.target.style.backgroundColor = 'white';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E7E0EC';
                  e.target.style.backgroundColor = '#F7F2FA';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.togglePasswordBtn}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>

            {/* Password requirements */}
            <div style={styles.passwordRequirements}>
              <div style={{
                ...styles.requirement,
                ...(hasLength ? styles.requirementMet : {})
              }}>
                <span style={styles.requirementIcon}>
                  {hasLength ? <CheckCircleIcon size={16} /> : <CircleIcon size={16} />}
                </span>
                <span>At least 8 characters</span>
              </div>
              <div style={{
                ...styles.requirement,
                ...styles.requirementLast,
                ...(hasMix ? styles.requirementMet : {})
              }}>
                <span style={styles.requirementIcon}>
                  {hasMix ? <CheckCircleIcon size={16} /> : <CircleIcon size={16} />}
                </span>
                <span>Mix of letters and numbers</span>
              </div>
            </div>
          </div>

          {error && (
            <div style={styles.errorBox}>
              <p style={styles.errorText}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !isValid}
            style={{
              ...styles.buttonPrimary,
              ...(isLoading || !isValid ? styles.buttonDisabled : {})
            }}
          >
            {isLoading ? (
              <>
                <LoadingSpinner size={18} />
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>

          <p style={styles.termsText}>
            By creating an account, you agree to our{' '}
            <a href="/terms" target="_blank" style={{ color: '#31135D' }}>Terms of Service</a> and{' '}
            <a href="/privacy" target="_blank" style={{ color: '#31135D' }}>Privacy Policy</a>
          </p>

          <button type="button" className="signup-modal-back-btn" style={styles.backBtn} onClick={goToIdentity}>
            <ArrowLeftIcon /> Back
          </button>
        </form>
      </>
    );
  };

  // Legacy alias
  const renderSignupStep2 = renderPasswordView;

  const renderPasswordResetView = () => (
    <>
      <div style={styles.logoContainer}>
        <img src={LOGO_URL} alt="Split Lease" style={styles.logoImage} />
      </div>
      <div style={styles.header}>
        <div style={styles.headerIcon}>
          <KeyIcon />
        </div>
        <h2 style={styles.title}>Reset your password</h2>
        <p style={styles.subtitle}>Enter your email address and we'll send you a link to reset your password.</p>
      </div>

      <form onSubmit={handlePasswordReset}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Email address</label>
          <input
            type="email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            required
            placeholder="you@example.com"
            style={styles.input}
            onFocus={(e) => e.target.style.borderColor = styles.colors.primary}
            onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
          />
        </div>

        {error && (
          <div style={styles.errorBox}>
            <p style={styles.errorText}>{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !resetEmail}
          style={{
            ...styles.buttonPrimary,
            ...(isLoading || !resetEmail ? styles.buttonDisabled : {})
          }}
        >
          {isLoading ? 'Sending reset link...' : 'Send reset link'}
        </button>

        <button
          type="button"
          onClick={goToMagicLink}
          disabled={isLoading}
          style={{
            ...styles.buttonSecondary,
            marginTop: '12px'
          }}
        >
          <MailIcon /> Send me a magic login link instead
        </button>

        <button type="button" className="signup-modal-back-btn" style={styles.backBtn} onClick={goToLogin}>
          <ArrowLeftIcon /> Back to login
        </button>
      </form>
    </>
  );

  const renderMagicLinkView = () => (
    <>
      <div style={styles.logoContainer}>
        <img src={LOGO_URL} alt="Split Lease" style={styles.logoImage} />
      </div>
      <div style={styles.header}>
        <div style={styles.headerIcon}>
          <MailIcon />
        </div>
        <h2 style={styles.title}>Magic link login</h2>
        <p style={styles.subtitle}>Enter your email and we'll send you a link to sign in instantly—no password needed.</p>
      </div>

      <form onSubmit={handleMagicLink}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Email address</label>
          <input
            type="email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            required
            placeholder="you@example.com"
            style={styles.input}
            onFocus={(e) => e.target.style.borderColor = styles.colors.primary}
            onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
          />
        </div>

        {error && (
          <div style={styles.errorBox}>
            <p style={styles.errorText}>{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !resetEmail}
          style={{
            ...styles.buttonPrimary,
            ...(isLoading || !resetEmail ? styles.buttonDisabled : {})
          }}
        >
          {isLoading ? 'Sending magic link...' : 'Send magic link'}
        </button>

        <button type="button" className="signup-modal-back-btn" style={styles.backBtn} onClick={goToLogin}>
          <ArrowLeftIcon /> Back to login
        </button>
      </form>
    </>
  );

  const renderResetSentView = () => (
    <>
      <div style={styles.logoContainer}>
        <img src={LOGO_URL} alt="Split Lease" style={styles.logoImage} />
      </div>
      <div style={styles.header}>
        <div style={{ ...styles.headerIcon, backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
          <CheckCircleIcon />
        </div>
        <h2 style={styles.title}>Check your email</h2>
        <p style={styles.subtitle}>
          We've sent a password reset link to <strong>{resetEmail}</strong>.
          Click the link in the email to reset your password.
        </p>
      </div>

      <button
        type="button"
        onClick={goToLogin}
        style={styles.buttonPrimary}
      >
        Return to login
      </button>

      <p style={{ ...styles.linkText, marginTop: '16px' }}>
        Didn't receive the email?{' '}
        <button type="button" onClick={handlePasswordReset} style={styles.link} disabled={isLoading}>
          {isLoading ? 'Resending...' : 'Resend'}
        </button>
      </p>
    </>
  );

  const renderMagicLinkSentView = () => (
    <>
      <div style={styles.logoContainer}>
        <img src={LOGO_URL} alt="Split Lease" style={styles.logoImage} />
      </div>
      <div style={styles.header}>
        <div style={{ ...styles.headerIcon, backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
          <CheckCircleIcon />
        </div>
        <h2 style={styles.title}>Magic link sent!</h2>
        <p style={styles.subtitle}>
          We've sent a magic login link to <strong>{resetEmail}</strong>.
          Click the link in the email to sign in instantly.
        </p>
      </div>

      <button
        type="button"
        onClick={goToLogin}
        style={styles.buttonPrimary}
      >
        Return to login
      </button>

      <p style={{ ...styles.linkText, marginTop: '16px' }}>
        Didn't receive the email?{' '}
        <button type="button" onClick={handleMagicLink} style={styles.link} disabled={isLoading}>
          {isLoading ? 'Resending...' : 'Resend'}
        </button>
      </p>
    </>
  );

  const renderSuccessView = () => (
    <>
      <div style={styles.logoContainer}>
        <img src={LOGO_URL} alt="Split Lease" style={styles.logoImage} />
      </div>
      <div style={styles.header}>
        <div style={{ ...styles.headerIcon, backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
          <CheckCircleIcon />
        </div>
        <h2 style={styles.title}>You're all set!</h2>
        <p style={styles.subtitle}>
          Your account has been created successfully. Welcome to Split Lease!
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        style={styles.buttonPrimary}
      >
        Get started
      </button>
    </>
  );

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <>
      <div
        className="signup-modal-overlay"
        style={styles.overlay}
        onClick={handleOverlayClick}
      >
        <div
          className="signup-modal-container"
          style={styles.modal}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile grab handle - Protocol Section 1 */}
          <div className="signup-modal-grab-handle" style={styles.grabHandle} aria-hidden="true" />

          {/* Close button */}
          {!disableClose && (
            <button
              className="signup-modal-close-btn"
              style={styles.closeBtn}
              onClick={onClose}
              aria-label="Close modal"
            >
              <CloseIcon size={32} />
            </button>
          )}

          {/* Scrollable content area */}
          <div style={styles.modalContent}>
            {/* Render current view */}
            {currentView === VIEWS.ENTRY && renderEntryView()}
            {currentView === VIEWS.USER_TYPE && renderUserTypeView()}
            {currentView === VIEWS.IDENTITY && renderIdentityView()}
            {currentView === VIEWS.PASSWORD && renderPasswordView()}
            {currentView === VIEWS.LOGIN && renderLoginView()}
            {currentView === VIEWS.PASSWORD_RESET && renderPasswordResetView()}
            {currentView === VIEWS.MAGIC_LINK && renderMagicLinkView()}
            {currentView === VIEWS.RESET_SENT && renderResetSentView()}
            {currentView === VIEWS.MAGIC_LINK_SENT && renderMagicLinkSentView()}
            {currentView === VIEWS.SUCCESS && renderSuccessView()}
          </div>
        </div>
      </div>

      {/* Toast notifications (rendered here as fallback when no ToastProvider) */}
      {toasts && toasts.length > 0 && <Toast toasts={toasts} onRemove={removeToast} />}

      {/* Duplicate email confirmation modal */}
      {duplicateEmailData.showModal && (
        <div className="signup-modal-overlay" style={styles.overlay} onClick={() => setDuplicateEmailData({ email: '', showModal: false })}>
          <div className="signup-modal-container" style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className="signup-modal-grab-handle" style={styles.grabHandle} aria-hidden="true" />
            <button
              className="signup-modal-close-btn"
              style={styles.closeBtn}
              onClick={() => setDuplicateEmailData({ email: '', showModal: false })}
              aria-label="Close modal"
            >
              <CloseIcon size={32} />
            </button>

            <div style={styles.logoContainer}>
              <img src={LOGO_URL} alt="Split Lease" style={styles.logo} />
            </div>

            <div style={styles.header}>
              <h1 style={styles.title}>Account Already Exists</h1>
              <p style={styles.subtitle}>
                An account with <strong>{duplicateEmailData.email}</strong> already exists.
              </p>
            </div>

            <p style={{ ...styles.helperText, textAlign: 'center', marginBottom: '20px' }}>
              Would you like to log in to your existing account instead?
            </p>

            <button
              type="button"
              style={styles.buttonPrimary}
              onClick={() => {
                setDuplicateEmailData({ email: '', showModal: false });
                setLoginData({ ...loginData, email: duplicateEmailData.email });
                goToLogin();
              }}
            >
              Log in instead
            </button>

            <button
              type="button"
              style={{ ...styles.buttonSecondary, marginTop: '12px' }}
              onClick={() => setDuplicateEmailData({ email: '', showModal: false })}
            >
              Try a different email
            </button>
          </div>
        </div>
      )}

      {/* User not found modal (for OAuth login when account doesn't exist) */}
      {userNotFoundData.showModal && (
        <div className="signup-modal-overlay" style={styles.overlay} onClick={() => setUserNotFoundData({ email: '', showModal: false })}>
          <div className="signup-modal-container" style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className="signup-modal-grab-handle" style={styles.grabHandle} aria-hidden="true" />
            <button
              className="signup-modal-close-btn"
              style={styles.closeBtn}
              onClick={() => setUserNotFoundData({ email: '', showModal: false })}
              aria-label="Close modal"
            >
              <CloseIcon size={32} />
            </button>

            <div style={styles.logoContainer}>
              <img src={LOGO_URL} alt="Split Lease" style={styles.logo} />
            </div>

            <div style={styles.header}>
              <h1 style={styles.title}>No Account Found</h1>
              <p style={styles.subtitle}>
                We couldn't find an account with <strong>{userNotFoundData.email}</strong>.
              </p>
            </div>

            <p style={{ ...styles.helperText, textAlign: 'center', marginBottom: '20px' }}>
              Would you like to create a new account instead?
            </p>

            <button
              type="button"
              style={styles.buttonPrimary}
              onClick={() => {
                setUserNotFoundData({ email: '', showModal: false });
                // Pre-fill signup data with the email from LinkedIn
                setSignupData({ ...signupData, email: userNotFoundData.email });
                goToUserType();
              }}
            >
              Sign up instead
            </button>

            <button
              type="button"
              style={{ ...styles.buttonSecondary, marginTop: '12px' }}
              onClick={() => {
                setUserNotFoundData({ email: '', showModal: false });
                goToLogin();
              }}
            >
              Try a different login method
            </button>
          </div>
        </div>
      )}
    </>
  );
}
