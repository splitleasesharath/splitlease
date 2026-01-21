import React from 'react';
import { createRoot } from 'react-dom/client';
import SendMagicLoginLinksPage from './islands/pages/SendMagicLoginLinksPage';
import { ToastProvider } from './islands/shared/Toast';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <ToastProvider>
    <SendMagicLoginLinksPage />
  </ToastProvider>
);
