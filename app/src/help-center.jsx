import React from 'react';
import { createRoot } from 'react-dom/client';
import HelpCenterPage from './islands/pages/HelpCenterPage.jsx';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HelpCenterPage />
    </ErrorBoundary>
  </React.StrictMode>
);
