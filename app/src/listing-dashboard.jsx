import React from 'react';
import { createRoot } from 'react-dom/client';
import ListingDashboardPage from './islands/pages/ListingDashboardPage';
import { ToastProvider } from './islands/shared/Toast';

// Mount the ListingDashboardPage component
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ToastProvider>
        <ListingDashboardPage />
      </ToastProvider>
    </React.StrictMode>
  );
}
