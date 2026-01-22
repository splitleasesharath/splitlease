import React from 'react';
import { createRoot } from 'react-dom/client';
import GuestRelationshipsDashboard from './islands/pages/GuestRelationshipsDashboard/GuestRelationshipsDashboard.jsx';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

// Import CSS so Vite bundles it (required for production build)
import './styles/main.css';

// Import config to set window.ENV before any API calls
import './lib/config.js';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <GuestRelationshipsDashboard />
    </ErrorBoundary>
  </React.StrictMode>
);
