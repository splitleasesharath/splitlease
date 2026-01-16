import React from 'react';
import { createRoot } from 'react-dom/client';
import SearchPage from './islands/pages/SearchPage.jsx';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <SearchPage />
    </ErrorBoundary>
  </React.StrictMode>
);
