import React from 'react';
import { createRoot } from 'react-dom/client';
import AdminThreadsPage from './islands/pages/AdminThreadsPage/AdminThreadsPage.jsx';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';
import { ToastProvider } from './islands/shared/Toast';

// Import CSS so Vite bundles it (required for production build)
import './styles/main.css';
import './styles/pages/admin-threads.css';

// Import config to set window.ENV
import './lib/config.js';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <AdminThreadsPage />
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
