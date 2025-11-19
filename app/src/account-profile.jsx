/**
 * Account Profile Page - Entry Point
 *
 * Mounts the AccountProfilePage island component
 * Checks authentication and passes props to show auth modal if needed
 */

import { createRoot } from 'react-dom/client';
import AccountProfilePage from './islands/pages/AccountProfilePage.jsx';
import { checkAuthStatus } from './lib/auth.js';

// Check authentication status
const authStatus = checkAuthStatus();
const isLoggedIn = authStatus.isAuthenticated;

console.log('🔒 Account Profile Auth Check:', { isLoggedIn });

if (!isLoggedIn) {
  console.log('❌ User not authenticated - will show auth modal');
} else {
  console.log('✅ User authenticated - rendering Account Profile page');
}

// Always render the page - Header will show auth modal if not logged in
const container = document.getElementById('account-profile-page');
if (container) {
  const root = createRoot(container);
  root.render(<AccountProfilePage requireAuth={true} isAuthenticated={isLoggedIn} />);
}
