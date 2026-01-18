import React from 'react';
import { createRoot } from 'react-dom/client';
import SelfListingPageV2 from './islands/pages/SelfListingPageV2.jsx';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <SelfListingPageV2 />
    </ErrorBoundary>
  </React.StrictMode>
);
