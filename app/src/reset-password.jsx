import React from 'react';
import { createRoot } from 'react-dom/client';
import ResetPasswordPage from './islands/pages/ResetPasswordPage.jsx';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ResetPasswordPage />
    </ErrorBoundary>
  </React.StrictMode>
);
