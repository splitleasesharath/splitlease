import React from 'react';
import { createRoot } from 'react-dom/client';
import HostOverviewPage from './islands/pages/HostOverviewPage/HostOverviewPage.jsx';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

// Import CSS so Vite bundles it (required for production build)
import './styles/main.css';

// Import config to set window.ENV before Google Maps loads
import './lib/config.js';
import { checkAuthStatus } from './lib/auth.js';

// Import CSS for the host-overview page
import './styles/components/host-overview.css';

// Check authentication status (async)
(async () => {
  const isLoggedIn = await checkAuthStatus();

  console.log('Host Overview Auth Check:', { isLoggedIn });

  if (!isLoggedIn) {
    console.log('User not authenticated - will show auth modal');
  } else {
    console.log('User authenticated - rendering Host Overview page');
  }

  // Always render the page - Header will show auth modal if not logged in
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ErrorBoundary>
        <HostOverviewPage requireAuth={true} isAuthenticated={isLoggedIn} />
      </ErrorBoundary>
    </React.StrictMode>
  );
})();
