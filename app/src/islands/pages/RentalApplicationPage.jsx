/**
 * RentalApplicationPage - DEPRECATED
 *
 * This page has been deprecated. The rental application is now accessed
 * via the Account Profile page as a modal wizard.
 *
 * This component handles backward compatibility by redirecting users
 * to the new location.
 *
 * @see AccountProfilePage - The new home for rental application
 * @see RentalApplicationWizardModal - The modal component (now in islands/shared/)
 */

import { useEffect } from 'react';
import { getSessionId } from '../../lib/auth.js';

export default function RentalApplicationPage() {
  useEffect(() => {
    // Get the user ID for redirect
    const userId = getSessionId();

    // Preserve any query params (like proposal ID)
    const params = new URLSearchParams(window.location.search);
    const proposalId = params.get('proposal');

    // Build redirect URL
    const redirectParams = new URLSearchParams();
    redirectParams.set('section', 'rental-application');
    redirectParams.set('openRentalApp', 'true');
    if (proposalId) {
      redirectParams.set('proposal', proposalId);
    }

    if (userId) {
      window.location.replace(`/account-profile/${userId}?${redirectParams.toString()}`);
    } else {
      // Not logged in - redirect to home (route is protected anyway)
      window.location.replace('/');
    }
  }, []);

  // Show loading state while redirecting
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid #e5e7eb',
        borderTopColor: '#7c3aed',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <p style={{ marginTop: '16px', color: '#6b7280' }}>
        Redirecting to your profile...
      </p>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
