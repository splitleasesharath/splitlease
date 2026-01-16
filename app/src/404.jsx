import React from 'react';
import { createRoot } from 'react-dom/client';
import NotFoundPage from './islands/pages/NotFoundPage.jsx';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';
import './styles/main.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <NotFoundPage />
    </ErrorBoundary>
  </React.StrictMode>
);
