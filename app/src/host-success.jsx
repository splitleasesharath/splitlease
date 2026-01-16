import React from 'react';
import { createRoot } from 'react-dom/client';
import HostSuccessPage from './islands/pages/HostSuccessPage.jsx';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HostSuccessPage />
    </ErrorBoundary>
  </React.StrictMode>
);
