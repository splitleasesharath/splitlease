import React from 'react';
import { createRoot } from 'react-dom/client';
import PreviewSplitLeasePage from './islands/pages/PreviewSplitLeasePage.jsx';
import { ToastProvider } from './islands/shared/Toast';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <PreviewSplitLeasePage />
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
