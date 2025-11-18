import { createRoot } from 'react-dom/client';
import GuestProposalsPage from './islands/pages/GuestProposalsPage.jsx';
import { checkAuthStatus } from './lib/auth.js';

// Authentication guard: Check if user is logged in
// Proposals are filtered by user email in the page component
const isLoggedIn = checkAuthStatus();

console.log('🔒 Guest Proposals Auth Check:', { isLoggedIn });

if (!isLoggedIn) {
  console.log('❌ Redirecting to index: User is not logged in');
  window.location.href = '/';
} else {
  console.log('✅ Authentication passed: Rendering Guest Proposals page');
  createRoot(document.getElementById('guest-proposals-page')).render(<GuestProposalsPage />);
}
