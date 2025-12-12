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
import { loginUser, signupUser, validateTokenAndFetchUser } from '../../lib/auth.js';
import { supabase } from '../../lib/supabase.js';
import Toast, { useToast } from './Toast.jsx';

// ============================================================================
// Constants
// ============================================================================

const VIEWS = {
  INITIAL: 'initial',
  LOGIN: 'login',
  SIGNUP_STEP1: 'signup-step1',
  SIGNUP_STEP2: 'signup-step2',
  PASSWORD_RESET: 'password-reset'
};

const USER_TYPES = {
  HOST: 'Host',
  GUEST: 'Guest'
};

// ============================================================================
// Styles
// ============================================================================

const styles = {
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
    zIndex: 10000,
    animation: 'fadeIn 200ms ease-out'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '2rem',
    maxWidth: '407px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 50px 80px rgba(0, 0, 0, 0.25)',
    animation: 'slideIn 200ms ease-out',
    position: 'relative'
  },
  closeBtn: {
    position: 'absolute',
    top: '1rem',
    right: '1rem',
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '0.25rem',
    lineHeight: 1,
    zIndex: 1
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1rem'
  },
  logo: {
    width: '50px',
    height: '50px',
    backgroundColor: '#6c40f5',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '1.25rem'
  },
  header: {
    textAlign: 'center',
    marginBottom: '1.5rem'
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1A1A2E',
    margin: 0,
    marginBottom: '0.5rem'
  },
  subtitle: {
    fontSize: '1rem',
    color: '#6c40f5',
    margin: 0
  },
  helperText: {
    fontSize: '0.75rem',
    color: '#6b7280',
    marginTop: '0.25rem',
    marginBottom: 0
  },
  requiredNote: {
    fontSize: '0.75rem',
    color: '#6b7280',
    marginBottom: '1rem'
  },
  formGroup: {
    marginBottom: '1rem'
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '0.5rem'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '1rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease'
  },
  inputFocused: {
    borderColor: '#6c40f5'
  },
  inputError: {
    borderColor: '#dc2626'
  },
  inputSuccess: {
    borderColor: '#408141'
  },
  passwordWrapper: {
    position: 'relative'
  },
  inputWithIcon: {
    paddingRight: '3rem'
  },
  togglePasswordBtn: {
    position: 'absolute',
    right: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#6b7280',
    fontSize: '1.25rem',
    padding: '0.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  select: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '1rem',
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: 'white',
    cursor: 'pointer',
    transition: 'border-color 0.15s ease'
  },
  errorBox: {
    padding: '0.75rem',
    backgroundColor: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    marginBottom: '1rem'
  },
  errorText: {
    fontSize: '0.875rem',
    color: '#dc2626',
    margin: 0
  },
  inlineError: {
    fontSize: '0.75rem',
    color: '#dc2626',
    marginTop: '0.25rem'
  },
  buttonPrimary: {
    width: '100%',
    padding: '0.875rem',
    backgroundColor: '#6c40f5',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    color: 'white',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
    marginBottom: '0.75rem'
  },
  buttonSecondary: {
    width: '100%',
    padding: '0.875rem',
    backgroundColor: 'white',
    border: '2px solid #6c40f5',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    color: '#6c40f5',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    marginBottom: '0.75rem'
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
    cursor: 'not-allowed',
    opacity: 0.7
  },
  linkText: {
    textAlign: 'center',
    marginTop: '1rem'
  },
  link: {
    color: '#6c40f5',
    textDecoration: 'underline',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    fontSize: 'inherit',
    fontWeight: '500'
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '1.5rem 0',
    color: '#9CA3AF'
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#E5E7EB'
  },
  dividerText: {
    padding: '0 1rem',
    fontSize: '0.875rem'
  },
  termsText: {
    fontSize: '0.75rem',
    color: '#6b7280',
    textAlign: 'center',
    marginTop: '1rem',
    lineHeight: 1.5
  },
  goBackBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'none',
    border: 'none',
    color: '#6c40f5',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
    padding: 0,
    marginTop: '1rem'
  },
  dateInputsRow: {
    display: 'flex',
    gap: '0.5rem'
  },
  dateSelect: {
    flex: 1,
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '1rem',
    outline: 'none',
    backgroundColor: 'white',
    cursor: 'pointer'
  },
  sectionLabel: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '1rem'
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
  skipReload = false // When true, don't reload page after auth success (for modal flows)
}) {
  // Toast notifications (with fallback rendering when no ToastProvider)
  const { toasts, showToast, removeToast } = useToast();

  // View state
  const [currentView, setCurrentView] = useState(VIEWS.INITIAL);

  // Signup form state (persisted between steps)
  const [signupData, setSignupData] = useState({
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

  // Initialize view and prefill based on props
  useEffect(() => {
    if (isOpen) {
      // Map initialView prop to internal view state
      if (initialView === 'login') {
        setCurrentView(VIEWS.LOGIN);
      } else if (initialView === 'signup' || initialView === 'signup-step1') {
        setCurrentView(VIEWS.SIGNUP_STEP1);
      } else if (initialView === 'signup-step2') {
        setCurrentView(VIEWS.SIGNUP_STEP2);
      } else {
        setCurrentView(VIEWS.INITIAL);
      }
      setError('');

      // Prefill user type if provided
      if (defaultUserType) {
        setSignupData(prev => ({
          ...prev,
          userType: defaultUserType === 'host' ? USER_TYPES.HOST : USER_TYPES.GUEST
        }));
      }
    }
  }, [isOpen, initialView, defaultUserType]);

  // Check password match in real-time
  useEffect(() => {
    if (signupData.confirmPassword && signupData.password !== signupData.confirmPassword) {
      setPasswordMismatch(true);
    } else {
      setPasswordMismatch(false);
    }
  }, [signupData.password, signupData.confirmPassword]);

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
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
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
  const goToLogin = () => {
    setCurrentView(VIEWS.LOGIN);
    setError('');
    // Preserve email if coming from signup
    if (signupData.email) {
      setLoginData(prev => ({ ...prev, email: signupData.email }));
    }
  };

  const goToSignupStep1 = () => {
    setCurrentView(VIEWS.SIGNUP_STEP1);
    setError('');
  };

  const goToSignupStep2 = () => {
    setCurrentView(VIEWS.SIGNUP_STEP2);
    setError('');
  };

  const goToPasswordReset = () => {
    setCurrentView(VIEWS.PASSWORD_RESET);
    setResetEmail(loginData.email); // Preserve email from login
    setError('');
  };

  const goToInitial = () => {
    setCurrentView(VIEWS.INITIAL);
    setError('');
  };

  // Handle signup step 1 continue
  const handleSignupStep1Continue = (e) => {
    e.preventDefault();
    setError('');

    // Validate step 1
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

    goToSignupStep2();
  };

  // Handle final signup submission
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate step 2
    if (!signupData.birthMonth || !signupData.birthDay || !signupData.birthYear) {
      setError('Please enter your date of birth.');
      return;
    }

    if (!isOver18(parseInt(signupData.birthMonth), parseInt(signupData.birthDay), parseInt(signupData.birthYear))) {
      setError('You must be at least 18 years old to use Split Lease.');
      return;
    }

    if (!signupData.phoneNumber.trim()) {
      setError('Phone number is required.');
      return;
    }

    if (!signupData.password) {
      setError('Password is required.');
      return;
    }

    if (signupData.password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    if (signupData.password !== signupData.confirmPassword) {
      setError('Passwords do not match.');
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
    const result = await signupUser(
      signupData.email,
      signupData.password,
      signupData.confirmPassword,
      {
        firstName: signupData.firstName,
        lastName: signupData.lastName,
        userType: signupData.userType,
        birthDate: `${signupData.birthYear}-${String(signupData.birthMonth).padStart(2, '0')}-${String(signupData.birthDay).padStart(2, '0')}`,
        phoneNumber: signupData.phoneNumber
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

      // Always show success message to prevent email enumeration
      showToast({
        title: 'Check Your Inbox',
        content: 'If an account with that email exists, a password reset link has been sent.',
        type: 'info'
      });
      goToLogin();
    } catch (err) {
      console.error('Password reset error:', err);
      // Still show success message for security
      showToast({
        title: 'Check Your Inbox',
        content: 'If an account with that email exists, a password reset link has been sent.',
        type: 'info'
      });
      goToLogin();
    }

    setIsLoading(false);
  };

  // Handle magic link request
  const handleMagicLink = async () => {
    const email = currentView === VIEWS.PASSWORD_RESET ? resetEmail : loginData.email;

    if (!email.trim()) {
      setError('Please enter your email address first.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { data, error: fnError } = await supabase.functions.invoke('auth-user', {
        body: {
          action: 'magic-link',
          payload: { email }
        }
      });

      if (fnError || !data?.success) {
        setError('Unable to send magic link. Please try again.');
      } else {
        showToast({
          title: 'Magic Link Sent',
          content: `Check your inbox at ${email} for the login link.`,
          type: 'success'
        });
      }
    } catch (err) {
      setError('Unable to send magic link. Please try again.');
    }

    setIsLoading(false);
  };

  if (!isOpen) return null;

  // ============================================================================
  // Render Functions for Each View
  // ============================================================================

  const renderInitialView = () => (
    <>
      <div style={styles.logoContainer}>
        <div style={styles.logo}>SL</div>
      </div>
      <div style={styles.header}>
        <h2 style={styles.title}>Welcome to Split Lease!</h2>
        <p style={styles.subtitle}>Have we met before?</p>
      </div>

      <button
        style={styles.buttonSecondary}
        onClick={goToSignupStep1}
      >
        I'm new around here
      </button>

      <button
        style={styles.buttonSecondary}
        onClick={goToLogin}
      >
        Log into my account
      </button>

      <button
        style={styles.buttonPrimary}
        onClick={() => {
          // Market report signup - for now just go to signup
          goToSignupStep1();
        }}
      >
        Sign Up with Market Report
      </button>
    </>
  );

  const renderLoginView = () => (
    <>
      <div style={styles.logoContainer}>
        <div style={styles.logo}>SL</div>
      </div>
      <div style={styles.header}>
        <h2 style={styles.title}>Welcome back!</h2>
      </div>

      <div style={styles.sectionLabel}>Login</div>

      <form onSubmit={handleLoginSubmit}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Email *</label>
          <input
            type="email"
            value={loginData.email}
            onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
            required
            placeholder="example@example.com"
            style={styles.input}
            onFocus={(e) => e.target.style.borderColor = '#6c40f5'}
            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Password *</label>
          <div style={styles.passwordWrapper}>
            <input
              type={showLoginPassword ? 'text' : 'password'}
              value={loginData.password}
              onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
              required
              placeholder="Enter your password"
              style={{ ...styles.input, ...styles.inputWithIcon }}
              onFocus={(e) => e.target.style.borderColor = '#6c40f5'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
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
          {isLoading ? 'Logging in...' : 'Login'}
        </button>

        {/* Show additional options after email is entered */}
        {loginData.email && (
          <>
            <div style={styles.linkText}>
              <button type="button" onClick={handleMagicLink} style={styles.link}>
                Log in Without Password
              </button>
            </div>
            <div style={styles.linkText}>
              <button type="button" onClick={goToPasswordReset} style={styles.link}>
                Forgot Password? Reset here
              </button>
            </div>
          </>
        )}

        <div style={{ ...styles.divider }}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>or</span>
          <div style={styles.dividerLine} />
        </div>

        <div style={styles.linkText}>
          <span style={{ color: '#6b7280' }}>Don't have an account? </span>
          <button type="button" onClick={goToSignupStep1} style={styles.link}>
            Sign Up Here
          </button>
        </div>
      </form>
    </>
  );

  const renderSignupStep1 = () => (
    <>
      <div style={styles.logoContainer}>
        <div style={styles.logo}>SL</div>
      </div>
      <div style={styles.header}>
        <h2 style={styles.title}>Nice To Meet You!</h2>
      </div>

      <p style={styles.requiredNote}>*Must match your government ID</p>

      <form onSubmit={handleSignupStep1Continue}>
        <div style={styles.formGroup}>
          <label style={styles.label}>First Name *</label>
          <input
            type="text"
            value={signupData.firstName}
            onChange={(e) => setSignupData({ ...signupData, firstName: e.target.value })}
            required
            placeholder="First Name"
            style={styles.input}
            onFocus={(e) => e.target.style.borderColor = '#6c40f5'}
            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Last Name *</label>
          <input
            type="text"
            value={signupData.lastName}
            onChange={(e) => setSignupData({ ...signupData, lastName: e.target.value })}
            required
            placeholder="Last Name"
            style={styles.input}
            onFocus={(e) => e.target.style.borderColor = '#6c40f5'}
            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Email *</label>
          <input
            type="email"
            value={signupData.email}
            onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
            required
            placeholder="example@example.com"
            style={styles.input}
            onFocus={(e) => e.target.style.borderColor = '#6c40f5'}
            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
          />
          <p style={styles.helperText}>
            Your email serves as your User ID and primary communication channel
          </p>
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

        <div style={styles.linkText}>
          <span style={{ color: '#6b7280' }}>Have an account? </span>
          <button type="button" onClick={goToLogin} style={styles.link}>
            Log In
          </button>
        </div>
      </form>
    </>
  );

  const renderSignupStep2 = () => (
    <>
      <div style={styles.logoContainer}>
        <div style={styles.logo}>SL</div>
      </div>
      <div style={styles.header}>
        <h2 style={styles.title}>Hi, {signupData.firstName}!</h2>
      </div>

      <form onSubmit={handleSignupSubmit}>
        <div style={styles.formGroup}>
          <label style={styles.label}>I am signing up to be *</label>
          <select
            value={signupData.userType}
            onChange={(e) => setSignupData({ ...signupData, userType: e.target.value })}
            style={styles.select}
            onFocus={(e) => e.target.style.borderColor = '#6c40f5'}
            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
          >
            <option value={USER_TYPES.GUEST}>A Guest (I would like to rent a space)</option>
            <option value={USER_TYPES.HOST}>A Host (I have a space available to rent)</option>
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Birth Date (select month, year and day) *</label>
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
          <p style={styles.helperText}>
            To use our service, you must be 18 years old. Your date of birth will be kept confidential.
          </p>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Phone Number *</label>
          <input
            type="tel"
            value={signupData.phoneNumber}
            onChange={(e) => setSignupData({ ...signupData, phoneNumber: e.target.value })}
            required
            placeholder="(555) 555-5555"
            style={styles.input}
            onFocus={(e) => e.target.style.borderColor = '#6c40f5'}
            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Password *</label>
          <div style={styles.passwordWrapper}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={signupData.password}
              onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
              required
              minLength={4}
              placeholder="Enter your password"
              style={{ ...styles.input, ...styles.inputWithIcon }}
              onFocus={(e) => e.target.style.borderColor = '#6c40f5'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={styles.togglePasswordBtn}
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Re-enter Password *</label>
          <div style={styles.passwordWrapper}>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={signupData.confirmPassword}
              onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
              required
              minLength={4}
              placeholder="Retype your password"
              style={{
                ...styles.input,
                ...styles.inputWithIcon,
                ...(passwordMismatch ? styles.inputError : {}),
                ...(signupData.confirmPassword && !passwordMismatch && signupData.password === signupData.confirmPassword ? styles.inputSuccess : {})
              }}
              onFocus={(e) => e.target.style.borderColor = passwordMismatch ? '#dc2626' : '#6c40f5'}
              onBlur={(e) => e.target.style.borderColor = passwordMismatch ? '#dc2626' : '#d1d5db'}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.togglePasswordBtn}
            >
              <EyeIcon open={showConfirmPassword} />
            </button>
          </div>
          {passwordMismatch && (
            <p style={styles.inlineError}>The passwords don't match</p>
          )}
        </div>

        {error && (
          <div style={styles.errorBox}>
            <p style={styles.errorText}>{error}</p>
          </div>
        )}

        <p style={styles.termsText}>
          By signing up or logging in, you agree to the Split Lease{' '}
          <a href="/terms" target="_blank" style={{ color: '#6c40f5' }}>Terms of Use</a>,{' '}
          <a href="/privacy" target="_blank" style={{ color: '#6c40f5' }}>Privacy Policy</a> and{' '}
          <a href="/guidelines" target="_blank" style={{ color: '#6c40f5' }}>Community Guidelines</a>.
        </p>

        <button
          type="submit"
          disabled={isLoading || passwordMismatch}
          style={{
            ...styles.buttonPrimary,
            ...(isLoading || passwordMismatch ? styles.buttonDisabled : {})
          }}
        >
          {isLoading ? 'Creating Account...' : 'Agree and Sign Up'}
        </button>

        <button
          type="button"
          onClick={goToSignupStep1}
          style={styles.goBackBtn}
        >
          <ArrowLeftIcon /> Go Back
        </button>
      </form>
    </>
  );

  const renderPasswordResetView = () => (
    <>
      <div style={styles.logoContainer}>
        <div style={styles.logo}>SL</div>
      </div>
      <div style={styles.header}>
        <h2 style={styles.title}>Enter your email to reset your password.</h2>
      </div>

      <form onSubmit={handlePasswordReset}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Email *</label>
          <input
            type="email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            required
            placeholder="example@example.com"
            style={styles.input}
            onFocus={(e) => e.target.style.borderColor = '#6c40f5'}
            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
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
          {isLoading ? 'Sending...' : 'Reset my password'}
        </button>

        <button
          type="button"
          onClick={handleMagicLink}
          disabled={isLoading || !resetEmail}
          style={{
            ...styles.buttonSecondary,
            ...(isLoading || !resetEmail ? { opacity: 0.5, cursor: 'not-allowed' } : {})
          }}
        >
          Send me a magic login link
        </button>

        <div style={styles.linkText}>
          <button type="button" onClick={goToLogin} style={styles.link}>
            Cancel
          </button>
        </div>
      </form>
    </>
  );

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <>
      <div style={styles.overlay} onClick={handleOverlayClick}>
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
          {/* Close button */}
          {!disableClose && (
            <button style={styles.closeBtn} onClick={onClose} aria-label="Close">
              &times;
            </button>
          )}

          {/* Render current view */}
          {currentView === VIEWS.INITIAL && renderInitialView()}
          {currentView === VIEWS.LOGIN && renderLoginView()}
          {currentView === VIEWS.SIGNUP_STEP1 && renderSignupStep1()}
          {currentView === VIEWS.SIGNUP_STEP2 && renderSignupStep2()}
          {currentView === VIEWS.PASSWORD_RESET && renderPasswordResetView()}
        </div>
      </div>

      {/* Toast notifications (rendered here as fallback when no ToastProvider) */}
      {toasts && toasts.length > 0 && <Toast toasts={toasts} onRemove={removeToast} />}
    </>
  );
}
