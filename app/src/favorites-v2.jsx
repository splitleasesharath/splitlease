import React from 'react';
import { createRoot } from 'react-dom/client';
import FavoritesPageV2 from './islands/pages/FavoritesPageV2/FavoritesPageV2.jsx';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

// Import CSS so Vite bundles it (required for production build)
// Note: FavoritesPageV2 uses inline styles, so we only need minimal global CSS
import './styles/main.css';

// Import config to set window.ENV before Google Maps loads
import './lib/config.js';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <FavoritesPageV2 />
    </ErrorBoundary>
  </React.StrictMode>
);
