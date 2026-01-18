import React from 'react';
import { createRoot } from 'react-dom/client';
import HelpCenterCategoryPage from './islands/pages/HelpCenterCategoryPage.jsx';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HelpCenterCategoryPage />
    </ErrorBoundary>
  </React.StrictMode>
);
