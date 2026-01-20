import React from 'react';
import { createRoot } from 'react-dom/client';
import ListWithUsPageV2 from './islands/pages/ListWithUsPageV2.jsx';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

// Import CSS so Vite bundles it (required for production build)
import './styles/main.css';

// Import config to set window.ENV before Google Maps loads
import './lib/config.js';

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <ListWithUsPageV2 />
    </ErrorBoundary>
  </React.StrictMode>
);
