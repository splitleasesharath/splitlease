import React from 'react';
import { createRoot } from 'react-dom/client';
import CareersPage from './islands/pages/CareersPage.jsx';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <CareersPage />
    </ErrorBoundary>
  </React.StrictMode>
);
