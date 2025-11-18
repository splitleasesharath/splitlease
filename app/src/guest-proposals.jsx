import { createRoot } from 'react-dom/client';
import GuestProposalsPage from './islands/pages/GuestProposalsPage.jsx';
import { checkAuthStatus } from './lib/auth.js';
import { SIGNUP_LOGIN_URL } from './lib/constants.js';

// Authentication guard - redirect to login if not authenticated
const isLoggedIn = checkAuthStatus();

console.log('🔒 Guest Proposals Auth Check:', { isLoggedIn });

if (!isLoggedIn) {
  // User not logged in - redirect to login page with return URL
  console.log('❌ User not authenticated - redirecting to login');
  const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `${SIGNUP_LOGIN_URL}?returnTo=${returnUrl}`;
} else {
  // User authenticated - render the page
  console.log('✅ User authenticated - rendering Guest Proposals page');
  createRoot(document.getElementById('guest-proposals-page')).render(<GuestProposalsPage />);
}
