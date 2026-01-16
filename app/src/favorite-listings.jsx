import React from 'react';
import { createRoot } from 'react-dom/client';
import FavoriteListingsPage from './islands/pages/FavoriteListingsPage';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <FavoriteListingsPage />
    </ErrorBoundary>
  </React.StrictMode>
);
