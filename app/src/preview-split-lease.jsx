import React from 'react';
import { createRoot } from 'react-dom/client';
import PreviewSplitLeasePage from './islands/pages/PreviewSplitLeasePage.jsx';
import { ToastProvider } from './islands/shared/Toast';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

// Import CSS so Vite bundles it (required for production build)
import './styles/main.css';

// Import config to set window.ENV before Google Maps loads
import './lib/config.js';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <PreviewSplitLeasePage />
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
