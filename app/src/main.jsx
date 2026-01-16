import React from 'react';
import { createRoot } from 'react-dom/client';
import HomePage from './islands/pages/HomePage.jsx';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HomePage />
    </ErrorBoundary>
  </React.StrictMode>
);
