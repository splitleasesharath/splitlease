import React from 'react';
import { createRoot } from 'react-dom/client';
import ViewSplitLeasePage from './islands/pages/ViewSplitLeasePage.jsx';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

// Force Vite to reload - FavoriteButton integration v3
console.log('🚀 view-split-lease entry v3 - ' + Date.now());

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ViewSplitLeasePage />
    </ErrorBoundary>
  </React.StrictMode>
);
