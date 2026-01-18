import React from 'react';
import { createRoot } from 'react-dom/client';
import AuthVerifyPage from './islands/pages/AuthVerifyPage/AuthVerifyPage.jsx';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthVerifyPage />
    </ErrorBoundary>
  </React.StrictMode>
);
