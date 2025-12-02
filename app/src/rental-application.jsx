import { createRoot } from 'react-dom/client';
import RentalApplicationPage from './islands/pages/RentalApplicationPage.jsx';
import { checkAuthStatus } from './lib/auth.js';

// Import CSS for the rental application page
import './styles/components/rental-application.css';

// Check authentication status (async)
(async () => {
  const isLoggedIn = await checkAuthStatus();

  console.log('🔒 Rental Application Auth Check:', { isLoggedIn });

  if (!isLoggedIn) {
    console.log('❌ User not authenticated - will show auth modal');
  } else {
    console.log('✅ User authenticated - rendering Rental Application page');
  }

  // Always render the page - Header will show auth modal if not logged in
  createRoot(document.getElementById('rental-application-page')).render(
    <RentalApplicationPage requireAuth={true} isAuthenticated={isLoggedIn} />
  );
})();
