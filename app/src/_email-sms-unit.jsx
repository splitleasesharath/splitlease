import React from 'react';
import { createRoot } from 'react-dom/client';
import EmailSmsUnitPage from './islands/pages/EmailSmsUnitPage.jsx';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <EmailSmsUnitPage />
    </ErrorBoundary>
  </React.StrictMode>
);
