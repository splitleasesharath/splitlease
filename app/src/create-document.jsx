import React from 'react';
import { createRoot } from 'react-dom/client';
import CreateDocumentPage from './islands/pages/CreateDocumentPage/CreateDocumentPage.jsx';
import { ToastProvider } from './islands/shared/Toast.jsx';
import './index.css';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <ToastProvider>
      <CreateDocumentPage />
    </ToastProvider>
  </React.StrictMode>
);
