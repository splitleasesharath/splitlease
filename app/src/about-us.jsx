import React from 'react';
import { createRoot } from 'react-dom/client';
import AboutUsPage from './islands/pages/AboutUsPage/AboutUsPage.jsx';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AboutUsPage />
    </ErrorBoundary>
  </React.StrictMode>
);
