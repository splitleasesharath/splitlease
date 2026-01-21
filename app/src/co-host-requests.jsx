import React from 'react';
import { createRoot } from 'react-dom/client';
import CoHostRequestsPage from './islands/pages/CoHostRequestsPage';
import { ToastProvider } from './islands/shared/Toast';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <ToastProvider>
    <CoHostRequestsPage />
  </ToastProvider>
);
