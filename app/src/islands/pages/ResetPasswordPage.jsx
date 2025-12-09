/**
 * Reset Password Page
 * Handles the password reset flow after user clicks reset link in email
 *
 * Flow:
 * 1. User clicks reset link in email
 * 2. Supabase redirects to this page with tokens in URL hash
 * 3. Supabase client detects PASSWORD_RECOVERY event
 * 4. User enters new password
 * 5. Password is updated via Edge Function
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';
import { updatePassword } from '../../lib/auth.js';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import '../../styles/reset-password.css';

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('loading'); // loading, ready, success, error
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    console.log('ResetPasswordPage: Initializing...');

    // Log URL hash for debugging (don't log full token for security, just presence)
    const hasHash = !!window.location.hash;
    const hasToken = window.location.hash.includes('access_token');
    const hasType = window.location.hash.includes('type=recovery');
    console.log(`URL Check: Hash=${hasHash}, Token=${hasToken}, Type=${hasType}`);

    if (!hasHash) {
         console.warn('No URL hash found. Ensure you clicked the link from the email.');
    }

    // Listen for PASSWORD_RECOVERY event from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event);

      if (event === 'PASSWORD_RECOVERY') {
        console.log('PASSWORD_RECOVERY event received');
        setStatus('ready');
      } else if (event === 'SIGNED_IN') {
        // User might already have session from reset link
        console.log('SIGNED_IN event - user has session');
        setStatus('ready');
      }
    });

    // Check if we already have a session (in case event already fired)
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) console.error('Session check error:', error);
      console.log('Checking existing session:', session ? 'found' : 'none');

      if (session) {
        setStatus('ready');
      } else {
        // Give time for the auth state change to fire from URL hash
        const timeoutId = setTimeout(() => {
          setStatus((currentStatus) => {
            if (currentStatus === 'loading') {
              console.log('No session detected after timeout');
              // If we have the token in URL but Supabase didn't pick it up, it might be an initialization race condition
              // But we can't manually set session from hash easily without Supabase doing it.
              
              if (hasToken && hasType) {
                  setError('Verifying token... If this persists, please try clicking the link again.');
                  // Force a re-check or reload could be dangerous (loops), so just show error
                  return 'error';
              }
              
              setError('Invalid or expired reset link. Please request a new password reset.');
              return 'error';
            }
            return currentStatus;
          });
        }, 4000); // Increased timeout to 4s

        return () => clearTimeout(timeoutId);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    const result = await updatePassword(newPassword);

    if (result.success) {
      setStatus('success');
    } else {
      setError(result.error || 'Failed to update password. Please try again.');
    }

    setIsSubmitting(false);
  };

  return (
    <>
      <Header />
      <main className="reset-password-page">
        <div className="reset-password-container">
          <h1>Reset Your Password</h1>

          {status === 'loading' && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Verifying reset link...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="error-state">
              <p className="error-message">{error}</p>
              <a href="/signup-login" className="btn-primary">
                Back to Login
              </a>
            </div>
          )}

          {status === 'ready' && (
            <form onSubmit={handleSubmit} className="reset-password-form">
              {error && <p className="error-message">{error}</p>}

              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  minLength={4}
                  autoComplete="new-password"
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                className="btn-primary btn-full-width"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}

          {status === 'success' && (
            <div className="success-state">
              <div className="success-icon">&#10003;</div>
              <p className="success-message">Your password has been updated successfully!</p>
              <a href="/signup-login" className="btn-primary">
                Sign In
              </a>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
