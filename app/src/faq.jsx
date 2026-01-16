import React from 'react';
import { createRoot } from 'react-dom/client';
import FAQPage from './islands/pages/FAQPage.jsx';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <FAQPage />
    </ErrorBoundary>
  </React.StrictMode>
);
