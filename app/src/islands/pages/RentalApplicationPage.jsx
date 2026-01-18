/**
 * Rental Application Page - REDIRECT COMPONENT
 *
 * This page redirects to the account-profile page with the rental-application section.
 * The actual rental application form is now rendered within the AccountProfilePage
 * via the RentalApplicationWizardModal.
 *
 * This standalone page exists for backward compatibility with old links/bookmarks.
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
      window.location.replace(`/account-profile?${redirectParams.toString()}`);
    } else {
      // Not logged in - redirect to home (route is protected anyway)
      window.location.replace('/');
    }
  }, []);

  // Show loading state while redirecting
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #f3f3f3',
          borderTop: '3px solid #6D31C2',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }} />
        <p style={{ color: '#666', margin: 0 }}>Redirecting to your profile...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
