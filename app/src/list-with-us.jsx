import React from 'react';
import { createRoot } from 'react-dom/client';
import ListWithUsPage from './islands/pages/ListWithUsPage.jsx';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ListWithUsPage />
    </ErrorBoundary>
  </React.StrictMode>
);
