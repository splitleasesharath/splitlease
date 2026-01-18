import React from 'react';
import { createRoot } from 'react-dom/client';
import ReferralLandingPage from './islands/pages/ReferralLandingPage.jsx';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ReferralLandingPage />
    </ErrorBoundary>
  </React.StrictMode>
);
