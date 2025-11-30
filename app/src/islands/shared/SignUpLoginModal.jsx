/**
 * SignUpLoginModal - Shared authentication modal component
 *
 * A reusable modal for login/signup that can be used across the app.
 * Uses the existing auth functions from lib/auth.js.
 *
 * Usage:
 *   import SignUpLoginModal from '../shared/SignUpLoginModal.jsx';
 *
 *   <SignUpLoginModal
 *     isOpen={showModal}
 *     onClose={() => setShowModal(false)}
 *     initialView="login" // or "signup"
 *     onAuthSuccess={(userData) => handleSuccess(userData)}
 *     defaultUserType="host" // optional: pre-select user type for signup
 *     showUserTypeSelector={true} // optional: show user type selector in signup
 *     skipReload={false} // optional: skip page reload after auth (for flows that continue)
 *   />
 */

import { useState, useEffect, useCallback } from 'react';
import { loginUser, signupUser } from '../../lib/auth.js';

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
    maxWidth: '400px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    animation: 'slideIn 200ms ease-out'
  },
  header: {
    marginBottom: '1.5rem'
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1a202c',
    margin: 0
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginTop: '0.5rem',
    marginBottom: 0
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
    borderColor: '#5B21B6'
  },
  passwordWrapper: {
    position: 'relative'
  },
  inputWithIcon: {
    paddingRight: '2.5rem'
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
    fontSize: '0.875rem',
    padding: '0.25rem'
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
  buttonRow: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '1.5rem'
  },
  cancelBtn: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: 'white',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '500',
    color: '#374151',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease'
  },
  submitBtn: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: '#5B21B6',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '500',
    color: 'white',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease'
  },
  submitBtnDisabled: {
    backgroundColor: '#9333ea',
    cursor: 'not-allowed',
    opacity: 0.7
  },
  switchText: {
    marginTop: '1rem',
    textAlign: 'center'
  },
  switchParagraph: {
    fontSize: '0.875rem',
    color: '#6b7280',
    margin: 0
  },
  switchLink: {
    color: '#5B21B6',
    textDecoration: 'none',
    fontWeight: '500',
    cursor: 'pointer'
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
    lineHeight: 1
  },
  userTypeSelector: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '1rem'
  },
  userTypeOption: {
    flex: 1,
    padding: '1rem',
    border: '2px solid #d1d5db',
    borderRadius: '8px',
    backgroundColor: 'white',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.15s ease'
  },
  userTypeOptionSelected: {
    borderColor: '#5B21B6',
    backgroundColor: '#f5f3ff'
  },
  userTypeIcon: {
    fontSize: '1.5rem',
    marginBottom: '0.5rem'
  },
  userTypeLabel: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
    margin: 0
  },
  userTypeDescription: {
    fontSize: '0.75rem',
    color: '#6b7280',
    margin: '0.25rem 0 0 0'
  }
};

// ============================================================================
// Component
// ============================================================================

// User type values matching Supabase "Type - User Current" field
const USER_TYPE_VALUES = {
  guest: 'A Guest (I would like to rent a space)',
  host: 'A Host (I have a space available to rent)'
};

export default function SignUpLoginModal({
  isOpen,
  onClose,
  initialView = 'login',
  onAuthSuccess,
  disableClose = false,
  defaultUserType = null,
  showUserTypeSelector = false,
  skipReload = false
}) {
  // View state: 'login' or 'signup'
  const [currentView, setCurrentView] = useState(initialView);

  // Login form state
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Signup form state
  const [signupForm, setSignupForm] = useState({ email: '', password: '', retype: '' });
  const [signupError, setSignupError] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupRetype, setShowSignupRetype] = useState(false);

  // User type state for signup
  const [selectedUserType, setSelectedUserType] = useState(defaultUserType || 'guest');

  // Reset form state when modal opens/closes or view changes
  useEffect(() => {
    if (isOpen) {
      setCurrentView(initialView);
      setSelectedUserType(defaultUserType || 'guest');
      resetForms();
    }
  }, [isOpen, initialView, defaultUserType]);

  const resetForms = useCallback(() => {
    setLoginForm({ email: '', password: '' });
    setLoginError('');
    setShowLoginPassword(false);
    setSignupForm({ email: '', password: '', retype: '' });
    setSignupError('');
    setShowSignupPassword(false);
    setShowSignupRetype(false);
  }, []);

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

  // Switch to login view
  const handleShowLogin = () => {
    setCurrentView('login');
    setLoginError('');
    setLoginForm({ email: '', password: '' });
    setShowLoginPassword(false);
  };

  // Switch to signup view
  const handleShowSignup = () => {
    setCurrentView('signup');
    setSignupError('');
    setSignupForm({ email: '', password: '', retype: '' });
    setShowSignupPassword(false);
    setShowSignupRetype(false);
  };

  // Handle login submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    const result = await loginUser(loginForm.email, loginForm.password);

    setIsLoggingIn(false);

    if (result.success) {
      // Login successful
      if (onAuthSuccess) {
        onAuthSuccess(result);
      }
      onClose();
      if (!skipReload) {
        window.location.reload();
      }
    } else {
      setLoginError(result.error || 'Login failed. Please try again.');
    }
  };

  // Handle signup submission
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setSignupError('');
    setIsSigningUp(true);

    // Build options with user type if selector is shown or default is provided
    const signupOptions = {};
    if (showUserTypeSelector || defaultUserType) {
      signupOptions.userType = USER_TYPE_VALUES[selectedUserType];
    }

    const result = await signupUser(
      signupForm.email,
      signupForm.password,
      signupForm.retype,
      signupOptions
    );

    setIsSigningUp(false);

    if (result.success) {
      // Signup successful
      if (onAuthSuccess) {
        onAuthSuccess(result);
      }
      onClose();
      if (!skipReload) {
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } else {
      setSignupError(result.error || 'Signup failed. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={handleOverlayClick}>
      <div style={{ ...styles.modal, position: 'relative' }} onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        {!disableClose && (
          <button style={styles.closeBtn} onClick={onClose} aria-label="Close">
            &times;
          </button>
        )}

        {currentView === 'login' ? (
          // LOGIN VIEW
          <>
            <div style={styles.header}>
              <h2 style={styles.title}>Sign In</h2>
              <p style={styles.subtitle}>Enter your credentials to access your account</p>
            </div>

            <form onSubmit={handleLoginSubmit}>
              {/* Email */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Email</label>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  required
                  placeholder="your@email.com"
                  style={styles.input}
                  onFocus={(e) => e.target.style.borderColor = '#5B21B6'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>

              {/* Password */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Password</label>
                <div style={styles.passwordWrapper}>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    required
                    placeholder="Enter your password"
                    style={{ ...styles.input, ...styles.inputWithIcon }}
                    onFocus={(e) => e.target.style.borderColor = '#5B21B6'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    style={styles.togglePasswordBtn}
                  >
                    {showLoginPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {loginError && (
                <div style={styles.errorBox}>
                  <p style={styles.errorText}>{loginError}</p>
                </div>
              )}

              {/* Buttons */}
              <div style={styles.buttonRow}>
                {!disableClose && (
                  <button type="button" onClick={onClose} style={styles.cancelBtn}>
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  style={{
                    ...styles.submitBtn,
                    ...(isLoggingIn ? styles.submitBtnDisabled : {}),
                    flex: disableClose ? 'none' : 1,
                    width: disableClose ? '100%' : 'auto'
                  }}
                >
                  {isLoggingIn ? 'Signing In...' : 'Sign In'}
                </button>
              </div>

              {/* Switch to signup */}
              <div style={styles.switchText}>
                <p style={styles.switchParagraph}>
                  Don't have an account?{' '}
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handleShowSignup();
                    }}
                    style={styles.switchLink}
                  >
                    Sign Up
                  </a>
                </p>
              </div>
            </form>
          </>
        ) : (
          // SIGNUP VIEW
          <>
            <div style={styles.header}>
              <h2 style={styles.title}>Sign Up</h2>
              <p style={styles.subtitle}>Create your account to get started</p>
            </div>

            <form onSubmit={handleSignupSubmit}>
              {/* User Type Selector */}
              {showUserTypeSelector && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>I am...</label>
                  <div style={styles.userTypeSelector}>
                    <button
                      type="button"
                      onClick={() => setSelectedUserType('guest')}
                      style={{
                        ...styles.userTypeOption,
                        ...(selectedUserType === 'guest' ? styles.userTypeOptionSelected : {})
                      }}
                    >
                      <div style={styles.userTypeIcon}>🏠</div>
                      <p style={styles.userTypeLabel}>A Guest</p>
                      <p style={styles.userTypeDescription}>Looking to rent</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedUserType('host')}
                      style={{
                        ...styles.userTypeOption,
                        ...(selectedUserType === 'host' ? styles.userTypeOptionSelected : {})
                      }}
                    >
                      <div style={styles.userTypeIcon}>🔑</div>
                      <p style={styles.userTypeLabel}>A Host</p>
                      <p style={styles.userTypeDescription}>Listing my space</p>
                    </button>
                  </div>
                </div>
              )}

              {/* Email */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Email</label>
                <input
                  type="email"
                  value={signupForm.email}
                  onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                  required
                  placeholder="your@email.com"
                  style={styles.input}
                  onFocus={(e) => e.target.style.borderColor = '#5B21B6'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>

              {/* Password */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Password (min 4 characters)</label>
                <div style={styles.passwordWrapper}>
                  <input
                    type={showSignupPassword ? 'text' : 'password'}
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    required
                    minLength={4}
                    placeholder="Enter your password"
                    style={{ ...styles.input, ...styles.inputWithIcon }}
                    onFocus={(e) => e.target.style.borderColor = '#5B21B6'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    style={styles.togglePasswordBtn}
                  >
                    {showSignupPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Retype Password */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Retype Password</label>
                <div style={styles.passwordWrapper}>
                  <input
                    type={showSignupRetype ? 'text' : 'password'}
                    value={signupForm.retype}
                    onChange={(e) => setSignupForm({ ...signupForm, retype: e.target.value })}
                    required
                    minLength={4}
                    placeholder="Retype your password"
                    style={{ ...styles.input, ...styles.inputWithIcon }}
                    onFocus={(e) => e.target.style.borderColor = '#5B21B6'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupRetype(!showSignupRetype)}
                    style={styles.togglePasswordBtn}
                  >
                    {showSignupRetype ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {signupError && (
                <div style={styles.errorBox}>
                  <p style={styles.errorText}>{signupError}</p>
                </div>
              )}

              {/* Buttons */}
              <div style={styles.buttonRow}>
                {!disableClose && (
                  <button type="button" onClick={onClose} style={styles.cancelBtn}>
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSigningUp}
                  style={{
                    ...styles.submitBtn,
                    ...(isSigningUp ? styles.submitBtnDisabled : {}),
                    flex: disableClose ? 'none' : 1,
                    width: disableClose ? '100%' : 'auto'
                  }}
                >
                  {isSigningUp ? 'Signing Up...' : 'Sign Up'}
                </button>
              </div>

              {/* Switch to login */}
              <div style={styles.switchText}>
                <p style={styles.switchParagraph}>
                  Already have an account?{' '}
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handleShowLogin();
                    }}
                    style={styles.switchLink}
                  >
                    Sign In
                  </a>
                </p>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
