import React from 'react';
import { createRoot } from 'react-dom/client';
import PoliciesPage from './islands/pages/PoliciesPage.jsx';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <PoliciesPage />
    </ErrorBoundary>
  </React.StrictMode>
);
