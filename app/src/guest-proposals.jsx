import { createRoot } from 'react-dom/client';
import GuestProposalsPage from './islands/pages/GuestProposalsPage.jsx';
import { checkAuthStatus } from './lib/auth.js';

// Import CSS for the redesigned guest-proposals page
import './styles/components/guest-proposals.css';

// Check authentication status (async)
(async () => {
  const isLoggedIn = await checkAuthStatus();

  console.log('🔒 Guest Proposals Auth Check:', { isLoggedIn });

  if (!isLoggedIn) {
    console.log('❌ User not authenticated - will show auth modal');
  } else {
    console.log('✅ User authenticated - rendering Guest Proposals page');
  }

  // Always render the page - Header will show auth modal if not logged in
  createRoot(document.getElementById('guest-proposals-page')).render(
    <GuestProposalsPage requireAuth={true} isAuthenticated={isLoggedIn} />
  );
})();
