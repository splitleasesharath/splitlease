import React from 'react';
import { createRoot } from 'react-dom/client';
import ListWithUsPageV2 from './islands/pages/ListWithUsPageV2.jsx';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <ListWithUsPageV2 />
    </ErrorBoundary>
  </React.StrictMode>
);
