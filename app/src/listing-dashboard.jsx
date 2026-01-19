import React from 'react';
import { createRoot } from 'react-dom/client';
import ListingDashboardPage from './islands/pages/ListingDashboardPage/ListingDashboardPage.jsx';
import { ToastProvider } from './islands/shared/Toast';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

// Import CSS so Vite bundles it (required for production build)
import './styles/main.css';

// Import config to set window.ENV before Google Maps loads
import './lib/config.js';

// Mount the ListingDashboardPage component
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <ToastProvider>
          <ListingDashboardPage />
        </ToastProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
