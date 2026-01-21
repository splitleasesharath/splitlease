import React from 'react';
import { createRoot } from 'react-dom/client';
import MessageCurationPage from './islands/pages/MessageCurationPage';
import { ToastProvider } from './islands/shared/Toast';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <ToastProvider>
    <MessageCurationPage />
  </ToastProvider>
);
