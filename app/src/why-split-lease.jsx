import React from 'react';
import { createRoot } from 'react-dom/client';
import WhySplitLeasePage from './islands/pages/WhySplitLeasePage.jsx';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <WhySplitLeasePage />
    </ErrorBoundary>
  </React.StrictMode>
);
