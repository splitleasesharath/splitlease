import React from 'react';
import { createRoot } from 'react-dom/client';
import CreateSuggestedProposalPage from './islands/pages/CreateSuggestedProposalPage/CreateSuggestedProposalPage.jsx';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <CreateSuggestedProposalPage />
    </ErrorBoundary>
  </React.StrictMode>
);
