import React from 'react';
import { createRoot } from 'react-dom/client';
import HostGuaranteePage from './islands/pages/HostGuaranteePage.jsx';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HostGuaranteePage />
    </ErrorBoundary>
  </React.StrictMode>
);
