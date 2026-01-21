import React from 'react';
import { createRoot } from 'react-dom/client';
import ModifyListingsPage from './islands/pages/ModifyListingsPage';
import { ToastProvider } from './islands/shared/Toast';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <ToastProvider>
    <ModifyListingsPage />
  </ToastProvider>
);
