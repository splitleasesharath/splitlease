import React from 'react';
import { createRoot } from 'react-dom/client';
import InternalTestPage from './islands/pages/InternalTestPage.jsx';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <InternalTestPage />
    </ErrorBoundary>
  </React.StrictMode>
);
