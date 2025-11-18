import { createRoot } from 'react-dom/client';
import GuestProposalsPage from './islands/pages/GuestProposalsPage.jsx';
import { checkAuthStatus } from './lib/auth.js';

// TEMPORARY: Authentication guard disabled for testing
// TODO: Re-enable after fixing user identification
const isLoggedIn = checkAuthStatus();

console.log('🔒 Guest Proposals Auth Check:', { isLoggedIn });

// Temporarily bypassed for testing - normally would redirect if !isLoggedIn
console.log('⚠️ AUTH GUARD TEMPORARILY DISABLED FOR TESTING');
console.log('✅ Rendering Guest Proposals page (testing mode)');
createRoot(document.getElementById('guest-proposals-page')).render(<GuestProposalsPage />);
