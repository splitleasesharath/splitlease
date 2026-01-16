import React from 'react';
import { createRoot } from 'react-dom/client';
import HostProposalsPage from './islands/pages/HostProposalsPage.jsx';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';
import './styles/main.css';
import './styles/components/host-proposals.css';
import './styles/components/host-proposals-v7.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HostProposalsPage />
    </ErrorBoundary>
  </React.StrictMode>
);
