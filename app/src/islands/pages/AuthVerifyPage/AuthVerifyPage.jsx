/**
 * Auth Verify Page
 * Handles magic link OTP verification after user clicks email link
 *
 * Flow:
 * 1. User clicks magic link in email
 * 2. Supabase redirects to this page with token_hash and type in query params
 * 3. Page verifies the token via supabase.auth.verifyOtp()
 * 4. On success: redirects to intended destination
 * 5. On error: shows user-friendly message
 *
 * Following Hollow Component Pattern - all logic in useAuthVerifyPageLogic hook
 */

import { useAuthVerifyPageLogic } from './useAuthVerifyPageLogic.js';
import Header from '../../shared/Header.jsx';
import Footer from '../../shared/Footer.jsx';
import './AuthVerifyPage.css';

/**
 * Checkmark icon for success state
 */
const CheckIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

/**
 * Error icon for error state
 */
const ErrorIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

export default function AuthVerifyPage() {
  const {
    status,
    errorMessage,
    handleRequestNewLink,
    redirectTo
  } = useAuthVerifyPageLogic();

  return (
    <>
      <Header />
      <main className="auth-verify-page">
        <div className="auth-verify-container">
          <h1>Verify Your Login</h1>

          {/* Loading State */}
          {status === 'loading' && (
            <div className="auth-verify-loading">
              <div className="spinner"></div>
              <p>Preparing verification...</p>
            </div>
          )}

          {/* Verifying State */}
          {status === 'verifying' && (
            <div className="auth-verify-loading">
              <div className="spinner"></div>
              <p>Verifying your login...</p>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="auth-verify-success">
              <div className="success-icon">
                <CheckIcon />
              </div>
              <p className="success-message">Login verified successfully!</p>
              <p className="redirect-notice">Redirecting you now...</p>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="auth-verify-error">
              <div className="error-icon">
                <ErrorIcon />
              </div>
              <p className="error-message">{errorMessage}</p>
              <button
                type="button"
                className="btn-primary"
                onClick={handleRequestNewLink}
              >
                Back to Home
              </button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
