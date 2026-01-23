import React from 'react';
import { createRoot } from 'react-dom/client';
import ViewSplitLeasePage from './islands/pages/ViewSplitLeasePage/ViewSplitLeasePage.tsx';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

// Import CSS so Vite bundles it (required for production build)
import './styles/main.css';

// Import config to set window.ENV before Google Maps loads
import './lib/config.js';

// Force Vite to reload - Custom schedule DEBUG v9
console.log('🚀 view-split-lease entry v9 - NUCLEAR CACHE BUST - ' + Date.now());

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ViewSplitLeasePage />
    </ErrorBoundary>
  </React.StrictMode>
);
