/**
 * SignUpTrialHost - Trial Host Signup Page Component
 *
 * A standalone signup page for Trial Host users who want to create
 * house manuals. This component is a Hollow Component - all business
 * logic is delegated to useSignUpTrialHostLogic.
 *
 * Features:
 * - Email/password signup form
 * - Fixed userType: 'Trial Host' (not selectable)
 * - Value proposition for house manual tool
 * - Redirects to /house-manual after successful signup
 *
 * Design follows Split Lease patterns:
 * - Inline styles (no styled-components)
 * - Brand colors (#31135D primary)
 * - Responsive layout
 */

import { useEffect } from 'react';
import { useSignUpTrialHostLogic } from './useSignUpTrialHostLogic.js';
import Header from '../Header.jsx';
import Footer from '../Footer.jsx';
import Toast, { useToast } from '../Toast.jsx';

// ============ STYLES ============

const styles = {
  // Page layout
  pageContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f8fafc'
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
    maxWidth: '480px',
    width: '100%',
    overflow: 'hidden'
  },

  // Header section
  headerSection: {
    background: 'linear-gradient(135deg, #31135D 0%, #522580 100%)',
    padding: '32px 32px 24px',
    textAlign: 'center',
    color: 'white'
  },
  iconWrapper: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '16px'
  },
  icon: {
    width: '64px',
    height: '64px',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '24px',
    fontWeight: '700',
    color: 'white'
  },
  subtitle: {
    margin: 0,
    fontSize: '15px',
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: '1.5'
  },

  // Form section
  formSection: {
    padding: '32px'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d3748'
  },
  required: {
    color: '#e53e3e',
    marginLeft: '2px'
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '15px',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box'
  },
  inputError: {
    borderColor: '#fc8181',
    boxShadow: '0 0 0 3px rgba(252, 129, 129, 0.15)'
  },
  inputFocus: {
    borderColor: '#31135D',
    boxShadow: '0 0 0 3px rgba(49, 19, 93, 0.1)'
  },
  errorText: {
    marginTop: '6px',
    fontSize: '13px',
    color: '#e53e3e',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  row: {
    display: 'flex',
    gap: '16px'
  },
  halfWidth: {
    flex: 1
  },

  // Submit button
  submitButton: {
    width: '100%',
    padding: '14px 24px',
    backgroundColor: '#31135D',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s, transform 0.1s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  submitButtonDisabled: {
    backgroundColor: '#a0aec0',
    cursor: 'not-allowed'
  },
  submitButtonHover: {
    backgroundColor: '#522580'
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
    animation: 'spin 0.6s linear infinite'
  },

  // Error alert
  errorAlert: {
    marginBottom: '20px',
    padding: '12px 16px',
    backgroundColor: '#fff5f5',
    border: '1px solid #fc8181',
    borderRadius: '8px',
    color: '#c53030',
    fontSize: '14px'
  },

  // Success state
  successContainer: {
    textAlign: 'center',
    padding: '40px 32px'
  },
  successIcon: {
    width: '80px',
    height: '80px',
    backgroundColor: '#c6f6d5',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px'
  },
  successTitle: {
    margin: '0 0 12px 0',
    fontSize: '24px',
    fontWeight: '700',
    color: '#22543d'
  },
  successMessage: {
    margin: '0 0 8px 0',
    fontSize: '15px',
    color: '#2d3748'
  },
  successSubMessage: {
    margin: 0,
    fontSize: '14px',
    color: '#718096'
  },

  // Footer links
  footerLinks: {
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #e2e8f0',
    textAlign: 'center'
  },
  footerText: {
    margin: 0,
    fontSize: '14px',
    color: '#718096'
  },
  loginLink: {
    color: '#31135D',
    fontWeight: '600',
    textDecoration: 'none',
    cursor: 'pointer'
  },

  // Value proposition
  valueProps: {
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: '#f0f4f8',
    borderRadius: '8px'
  },
  valuePropTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: '600',
    color: '#31135D'
  },
  valuePropList: {
    margin: 0,
    padding: '0 0 0 20px',
    fontSize: '13px',
    color: '#4a5568',
    lineHeight: '1.8'
  }
};

// ============ SUB-COMPONENTS ============

function FormInput({
  label,
  type = 'text',
  name,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  required = false,
  autoComplete
}) {
  const inputStyle = error
    ? { ...styles.input, ...styles.inputError }
    : styles.input;

  return (
    <div style={styles.formGroup}>
      <label style={styles.label} htmlFor={name}>
        {label}
        {required && <span style={styles.required}>*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        onBlur={() => onBlur && onBlur(name)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={inputStyle}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      {error && (
        <div id={`${name}-error`} style={styles.errorText} role="alert">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}
    </div>
  );
}

function SuccessMessage() {
  return (
    <div style={styles.successContainer}>
      <div style={styles.successIcon}>
        <svg width="40" height="40" viewBox="0 0 20 20" fill="#22543d">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </div>
      <h2 style={styles.successTitle}>Welcome to Split Lease!</h2>
      <p style={styles.successMessage}>Your Trial Host account has been created successfully.</p>
      <p style={styles.successSubMessage}>Redirecting you to the House Manual tool...</p>
    </div>
  );
}

function HouseManualIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

// ============ MAIN COMPONENT ============

export default function SignUpTrialHost() {
  const {
    formData,
    errors,
    isLoading,
    submitError,
    isSuccess,
    updateField,
    validateField,
    handleSubmit,
    canSubmit
  } = useSignUpTrialHostLogic();

  const { toasts, showToast, removeToast } = useToast();

  // Show toast on submit error
  useEffect(() => {
    if (submitError) {
      showToast({
        title: 'Signup Error',
        type: 'error',
        content: submitError,
        duration: 5000
      });
    }
  }, [submitError, showToast]);

  // Show success toast
  useEffect(() => {
    if (isSuccess) {
      showToast({
        title: 'Account Created!',
        type: 'success',
        content: 'Redirecting to House Manual...',
        duration: 3000
      });
    }
  }, [isSuccess, showToast]);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    await handleSubmit();
  };

  const handleLoginClick = () => {
    // Navigate to homepage and trigger login modal
    window.location.href = '/?login=true';
  };

  return (
    <div style={styles.pageContainer}>
      <Header />

      <main style={styles.mainContent}>
        <div style={styles.card}>
          {/* Header with gradient */}
          <div style={styles.headerSection}>
            <div style={styles.iconWrapper}>
              <div style={styles.icon}>
                <HouseManualIcon />
              </div>
            </div>
            <h1 style={styles.title}>Create Your House Manual</h1>
            <p style={styles.subtitle}>
              Sign up for a free Trial Host account to access the House Manual tool
            </p>
          </div>

          {/* Form or Success Message */}
          <div style={styles.formSection}>
            {isSuccess ? (
              <SuccessMessage />
            ) : (
              <form onSubmit={handleFormSubmit} noValidate>
                {/* Submit error alert */}
                {submitError && (
                  <div style={styles.errorAlert} role="alert">
                    <strong>Error:</strong> {submitError}
                  </div>
                )}

                {/* Value proposition */}
                <div style={styles.valueProps}>
                  <h3 style={styles.valuePropTitle}>What you'll get:</h3>
                  <ul style={styles.valuePropList}>
                    <li>Professional house manual templates</li>
                    <li>Easy-to-share digital guides for guests</li>
                    <li>Property management tools</li>
                    <li>Access to Split Lease marketplace</li>
                  </ul>
                </div>

                {/* Name row */}
                <div style={styles.row}>
                  <div style={styles.halfWidth}>
                    <FormInput
                      label="First Name"
                      name="firstName"
                      value={formData.firstName}
                      onChange={updateField}
                      onBlur={validateField}
                      error={errors.firstName}
                      placeholder="John"
                      required
                      autoComplete="given-name"
                    />
                  </div>
                  <div style={styles.halfWidth}>
                    <FormInput
                      label="Last Name"
                      name="lastName"
                      value={formData.lastName}
                      onChange={updateField}
                      onBlur={validateField}
                      error={errors.lastName}
                      placeholder="Doe"
                      required
                      autoComplete="family-name"
                    />
                  </div>
                </div>

                {/* Email */}
                <FormInput
                  label="Email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={updateField}
                  onBlur={validateField}
                  error={errors.email}
                  placeholder="john@example.com"
                  required
                  autoComplete="email"
                />

                {/* Phone (optional) */}
                <FormInput
                  label="Phone Number (optional)"
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={updateField}
                  onBlur={validateField}
                  error={errors.phoneNumber}
                  placeholder="(555) 123-4567"
                  autoComplete="tel"
                />

                {/* Password row */}
                <div style={styles.row}>
                  <div style={styles.halfWidth}>
                    <FormInput
                      label="Password"
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={updateField}
                      onBlur={validateField}
                      error={errors.password}
                      placeholder="Min. 4 characters"
                      required
                      autoComplete="new-password"
                    />
                  </div>
                  <div style={styles.halfWidth}>
                    <FormInput
                      label="Confirm Password"
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={updateField}
                      onBlur={validateField}
                      error={errors.confirmPassword}
                      placeholder="Confirm password"
                      required
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={!canSubmit() || isLoading}
                  style={{
                    ...styles.submitButton,
                    ...(!canSubmit() || isLoading ? styles.submitButtonDisabled : {})
                  }}
                >
                  {isLoading ? (
                    <>
                      <div style={styles.spinner} />
                      Creating Account...
                    </>
                  ) : (
                    'Create Trial Host Account'
                  )}
                </button>

                {/* Login link */}
                <div style={styles.footerLinks}>
                  <p style={styles.footerText}>
                    Already have an account?{' '}
                    <a
                      style={styles.loginLink}
                      onClick={handleLoginClick}
                      onKeyDown={(e) => e.key === 'Enter' && handleLoginClick()}
                      role="button"
                      tabIndex={0}
                    >
                      Log in
                    </a>
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {/* Toast notifications */}
      {toasts && toasts.length > 0 && <Toast toasts={toasts} onRemove={removeToast} />}

      {/* Keyframe animation for spinner */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Focus styles for accessibility */
        input:focus {
          outline: none;
          border-color: #31135D;
          box-shadow: 0 0 0 3px rgba(49, 19, 93, 0.1);
        }

        button:hover:not(:disabled) {
          background-color: #522580;
        }

        button:active:not(:disabled) {
          transform: translateY(1px);
        }

        a[role="button"]:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
