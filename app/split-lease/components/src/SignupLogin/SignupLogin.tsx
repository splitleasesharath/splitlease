/**
 * @fileoverview SignupLogin Component
 * Dual-mode authentication component supporting signup and login flows
 * Built with TDD, full accessibility (WCAG 2.1 AA), and performance optimization
 */

import React, { memo, useState } from 'react';
import { useSignupForm } from './hooks/useSignupForm';
import { useLoginForm } from './hooks/useLoginForm';
import { useAuthMode } from './hooks/useAuthMode';
import type { SignupLoginProps } from './SignupLogin.types';
import styles from './SignupLogin.module.css';

/**
 * SignupLogin Component
 *
 * A comprehensive authentication component that provides both signup and login functionality
 * with seamless mode switching, real-time validation, password strength indication,
 * and full accessibility support.
 *
 * @example
 * ```tsx
 * <SignupLogin
 *   mode="signup"
 *   onSignupSuccess={(data) => console.log('Signup:', data)}
 *   onLoginSuccess={(data) => console.log('Login:', data)}
 * />
 * ```
 */
const SignupLogin: React.FC<SignupLoginProps> = memo(({
  mode: initialMode = 'signup',
  className,
  onSignupSuccess,
  onLoginSuccess,
  onModeChange,
}) => {
  const { mode, toggleMode } = useAuthMode(initialMode, onModeChange);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const signupForm = useSignupForm(onSignupSuccess);
  const loginForm = useLoginForm(onLoginSuccess);

  const isSignupMode = mode === 'signup';
  const form = isSignupMode ? signupForm : loginForm;

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await form.handleSubmit();
  };

  /**
   * Toggle password visibility
   */
  const togglePasswordVisibility = (field: 'password' | 'confirmPassword') => {
    if (field === 'password') {
      setShowPassword(!showPassword);
    } else {
      setShowConfirmPassword(!showConfirmPassword);
    }
  };

  const formId = `auth-form-${mode}`;
  const titleId = `${formId}-title`;

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div className={styles.formWrapper}>
        <h1 id={titleId} className={styles.formTitle}>
          {isSignupMode ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className={styles.formSubtitle}>
          {isSignupMode
            ? 'Sign up to get started with Split Lease'
            : 'Sign in to your Split Lease account'}
        </p>

        {form.submissionError && (
          <div className={styles.submissionError} role="alert">
            <span className={styles.errorIcon}>⚠</span>
            {form.submissionError}
          </div>
        )}

        <form
          id={formId}
          className={styles.form}
          onSubmit={handleSubmit}
          aria-labelledby={titleId}
          role="form"
          noValidate
        >
          {isSignupMode ? (
            <>
              {/* Signup Form Fields */}
              <div className={styles.nameRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="firstName" className={styles.label}>
                    First Name <span className={styles.required}>*</span>
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    className={styles.input}
                    value={signupForm.formData.firstName}
                    onChange={(e) =>
                      signupForm.handleFieldChange('firstName', e.target.value)
                    }
                    onBlur={() => signupForm.handleFieldBlur('firstName')}
                    aria-required="true"
                    aria-invalid={!!signupForm.errors.firstName}
                    aria-describedby={
                      signupForm.errors.firstName ? 'firstName-error' : undefined
                    }
                    autoComplete="given-name"
                  />
                  {signupForm.errors.firstName && (
                    <span
                      id="firstName-error"
                      className={styles.errorMessage}
                      role="alert"
                    >
                      <span className={styles.errorIcon}>✕</span>
                      {signupForm.errors.firstName}
                    </span>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="lastName" className={styles.label}>
                    Last Name <span className={styles.required}>*</span>
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    className={styles.input}
                    value={signupForm.formData.lastName}
                    onChange={(e) =>
                      signupForm.handleFieldChange('lastName', e.target.value)
                    }
                    onBlur={() => signupForm.handleFieldBlur('lastName')}
                    aria-required="true"
                    aria-invalid={!!signupForm.errors.lastName}
                    aria-describedby={
                      signupForm.errors.lastName ? 'lastName-error' : undefined
                    }
                    autoComplete="family-name"
                  />
                  {signupForm.errors.lastName && (
                    <span
                      id="lastName-error"
                      className={styles.errorMessage}
                      role="alert"
                    >
                      <span className={styles.errorIcon}>✕</span>
                      {signupForm.errors.lastName}
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="email" className={styles.label}>
                  Email <span className={styles.required}>*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  className={styles.input}
                  value={signupForm.formData.email}
                  onChange={(e) =>
                    signupForm.handleFieldChange('email', e.target.value)
                  }
                  onBlur={() => signupForm.handleFieldBlur('email')}
                  aria-required="true"
                  aria-invalid={!!signupForm.errors.email}
                  aria-describedby={
                    signupForm.errors.email ? 'email-error' : undefined
                  }
                  autoComplete="email"
                />
                {signupForm.errors.email && (
                  <span id="email-error" className={styles.errorMessage} role="alert">
                    <span className={styles.errorIcon}>✕</span>
                    {signupForm.errors.email}
                  </span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="password" className={styles.label}>
                  Password <span className={styles.required}>*</span>
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className={`${styles.input} ${styles.passwordInput}`}
                    value={signupForm.formData.password}
                    onChange={(e) =>
                      signupForm.handleFieldChange('password', e.target.value)
                    }
                    onBlur={() => signupForm.handleFieldBlur('password')}
                    aria-required="true"
                    aria-invalid={!!signupForm.errors.password}
                    aria-describedby={
                      signupForm.errors.password ? 'password-error' : 'password-strength'
                    }
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => togglePasswordVisibility('password')}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {signupForm.errors.password && (
                  <span
                    id="password-error"
                    className={styles.errorMessage}
                    role="alert"
                  >
                    <span className={styles.errorIcon}>✕</span>
                    {signupForm.errors.password}
                  </span>
                )}
                {signupForm.passwordStrength && (
                  <div id="password-strength" className={styles.passwordStrength}>
                    <span className={styles.strengthLabel}>Password Strength:</span>
                    <div className={styles.strengthBar}>
                      <div
                        className={`${styles.strengthFill} ${
                          styles[`strength${signupForm.passwordStrength.strength.charAt(0).toUpperCase() + signupForm.passwordStrength.strength.slice(1)}`]
                        }`}
                      />
                    </div>
                    <span
                      className={`${styles.strengthText} ${
                        styles[`strengthText${signupForm.passwordStrength.strength.charAt(0).toUpperCase() + signupForm.passwordStrength.strength.slice(1)}`]
                      }`}
                    >
                      {signupForm.passwordStrength.strength.charAt(0).toUpperCase() +
                        signupForm.passwordStrength.strength.slice(1)}
                    </span>
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="confirmPassword" className={styles.label}>
                  Confirm Password <span className={styles.required}>*</span>
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className={`${styles.input} ${styles.passwordInput}`}
                    value={signupForm.formData.confirmPassword}
                    onChange={(e) =>
                      signupForm.handleFieldChange('confirmPassword', e.target.value)
                    }
                    onBlur={() => signupForm.handleFieldBlur('confirmPassword')}
                    aria-required="true"
                    aria-invalid={!!signupForm.errors.confirmPassword}
                    aria-describedby={
                      signupForm.errors.confirmPassword
                        ? 'confirmPassword-error'
                        : undefined
                    }
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => togglePasswordVisibility('confirmPassword')}
                    aria-label={
                      showConfirmPassword ? 'Hide password' : 'Show password'
                    }
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {signupForm.errors.confirmPassword && (
                  <span
                    id="confirmPassword-error"
                    className={styles.errorMessage}
                    role="alert"
                  >
                    <span className={styles.errorIcon}>✕</span>
                    {signupForm.errors.confirmPassword}
                  </span>
                )}
              </div>

              <div className={styles.formGroup}>
                <div className={styles.checkboxWrapper}>
                  <input
                    id="termsAccepted"
                    type="checkbox"
                    className={styles.checkbox}
                    checked={signupForm.formData.termsAccepted}
                    onChange={(e) =>
                      signupForm.handleFieldChange('termsAccepted', e.target.checked)
                    }
                    onBlur={() => signupForm.handleFieldBlur('termsAccepted')}
                    aria-required="true"
                    aria-invalid={!!signupForm.errors.termsAccepted}
                    aria-describedby={
                      signupForm.errors.termsAccepted
                        ? 'termsAccepted-error'
                        : undefined
                    }
                  />
                  <label htmlFor="termsAccepted" className={styles.checkboxLabel}>
                    I accept the <a href="/terms">Terms and Conditions</a> and{' '}
                    <a href="/privacy">Privacy Policy</a>
                  </label>
                </div>
                {signupForm.errors.termsAccepted && (
                  <span
                    id="termsAccepted-error"
                    className={styles.errorMessage}
                    role="alert"
                  >
                    <span className={styles.errorIcon}>✕</span>
                    {signupForm.errors.termsAccepted}
                  </span>
                )}
              </div>

              <button
                type="submit"
                className={styles.submitButton}
                disabled={signupForm.isSubmitting}
              >
                {signupForm.isSubmitting ? (
                  <span className={styles.submitButtonLoading}>
                    <span className={styles.spinner} />
                    Signing up...
                  </span>
                ) : (
                  'Sign Up'
                )}
              </button>
            </>
          ) : (
            <>
              {/* Login Form Fields */}
              <div className={styles.formGroup}>
                <label htmlFor="email" className={styles.label}>
                  Email <span className={styles.required}>*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  className={styles.input}
                  value={loginForm.formData.email}
                  onChange={(e) =>
                    loginForm.handleFieldChange('email', e.target.value)
                  }
                  onBlur={() => loginForm.handleFieldBlur('email')}
                  aria-required="true"
                  aria-invalid={!!loginForm.errors.email}
                  aria-describedby={
                    loginForm.errors.email ? 'email-error' : undefined
                  }
                  autoComplete="email"
                />
                {loginForm.errors.email && (
                  <span id="email-error" className={styles.errorMessage} role="alert">
                    <span className={styles.errorIcon}>✕</span>
                    {loginForm.errors.email}
                  </span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="password" className={styles.label}>
                  Password <span className={styles.required}>*</span>
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className={`${styles.input} ${styles.passwordInput}`}
                    value={loginForm.formData.password}
                    onChange={(e) =>
                      loginForm.handleFieldChange('password', e.target.value)
                    }
                    onBlur={() => loginForm.handleFieldBlur('password')}
                    aria-required="true"
                    aria-invalid={!!loginForm.errors.password}
                    aria-describedby={
                      loginForm.errors.password ? 'password-error' : undefined
                    }
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => togglePasswordVisibility('password')}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {loginForm.errors.password && (
                  <span
                    id="password-error"
                    className={styles.errorMessage}
                    role="alert"
                  >
                    <span className={styles.errorIcon}>✕</span>
                    {loginForm.errors.password}
                  </span>
                )}
              </div>

              <div className={styles.formGroup}>
                <div className={styles.checkboxWrapper}>
                  <input
                    id="rememberMe"
                    type="checkbox"
                    className={styles.checkbox}
                    checked={loginForm.formData.rememberMe}
                    onChange={(e) =>
                      loginForm.handleFieldChange('rememberMe', e.target.checked)
                    }
                  />
                  <label htmlFor="rememberMe" className={styles.checkboxLabel}>
                    Remember me
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className={styles.submitButton}
                disabled={loginForm.isSubmitting}
              >
                {loginForm.isSubmitting ? (
                  <span className={styles.submitButtonLoading}>
                    <span className={styles.spinner} />
                    Logging in...
                  </span>
                ) : (
                  'Log In'
                )}
              </button>
            </>
          )}
        </form>

        <div className={styles.modeToggle}>
          {isSignupMode ? (
            <>
              Already have an account?{' '}
              <button
                type="button"
                className={styles.modeToggleButton}
                onClick={toggleMode}
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              Don't have an account?{' '}
              <button
                type="button"
                className={styles.modeToggleButton}
                onClick={toggleMode}
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

SignupLogin.displayName = 'SignupLogin';

export default SignupLogin;
