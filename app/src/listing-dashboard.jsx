import React from 'react';
import { createRoot } from 'react-dom/client';
import ListingDashboardPage from './islands/pages/ListingDashboardPage';
import { ToastProvider } from './islands/shared/Toast';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

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
