import React from 'react';
import { createRoot } from 'react-dom/client';
import GuestSuccessPage from './islands/pages/GuestSuccessPage.jsx';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <GuestSuccessPage />
    </ErrorBoundary>
  </React.StrictMode>
);
