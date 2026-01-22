import React from 'react';
import { createRoot } from 'react-dom/client';
import SimulationAdminPage from './islands/pages/SimulationAdminPage';
import { ToastProvider } from './islands/shared/Toast';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <ToastProvider>
    <SimulationAdminPage />
  </ToastProvider>
);
