import React from 'react';
import { createRoot } from 'react-dom/client';
import SelfListingPage from './islands/pages/SelfListingPage.jsx';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <SelfListingPage />
    </ErrorBoundary>
  </React.StrictMode>
);
