import React from 'react';
import { createRoot } from 'react-dom/client';
import QuickMatchPage from './islands/pages/QuickMatchPage.jsx';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

// Import CSS so Vite bundles it (required for production build)
import './styles/main.css';

// Import config to set window.ENV
import './lib/config.js';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QuickMatchPage />
    </ErrorBoundary>
  </React.StrictMode>
);
