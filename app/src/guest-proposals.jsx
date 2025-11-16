import { createRoot } from 'react-dom/client';
import GuestProposalsPage from './islands/pages/GuestProposalsPage.jsx';
import { checkAuthStatus, getUserType } from './lib/auth.js';

// Authentication guard: Check if user is logged in and is a guest
const isLoggedIn = checkAuthStatus();
const userType = getUserType();

console.log('🔒 Guest Proposals Auth Check:', { isLoggedIn, userType });

if (!isLoggedIn || userType !== 'Guest') {
  console.log('❌ Redirecting to index: User is not logged in or not a guest');
  window.location.href = '/';
} else {
  console.log('✅ Authentication passed: Rendering Guest Proposals page');
  createRoot(document.getElementById('guest-proposals-page')).render(<GuestProposalsPage />);
}
