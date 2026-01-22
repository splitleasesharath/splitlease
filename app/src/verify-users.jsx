import React from 'react';
import { createRoot } from 'react-dom/client';
import VerifyUsersPage from './islands/pages/VerifyUsersPage';
import { ToastProvider } from './islands/shared/Toast';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <ToastProvider>
    <VerifyUsersPage />
  </ToastProvider>
);
