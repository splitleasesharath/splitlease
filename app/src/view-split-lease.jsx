import React from 'react';
import { createRoot } from 'react-dom/client';
import ViewSplitLeasePage from './islands/pages/ViewSplitLeasePage.jsx';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ViewSplitLeasePage />
    </ErrorBoundary>
  </React.StrictMode>
);
