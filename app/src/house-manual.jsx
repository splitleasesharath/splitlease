import React from 'react';
import { createRoot } from 'react-dom/client';
import HouseManualPage from './islands/pages/HouseManualPage/HouseManualPage.jsx';
import { ToastProvider } from './islands/shared/Toast';

// Import CSS so Vite bundles it (required for production build)
import './styles/main.css';

// Import config to set window.ENV before Google Maps loads
import './lib/config.js';

// Mount the HouseManualPage component
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ToastProvider>
        <HouseManualPage />
      </ToastProvider>
    </React.StrictMode>
  );
}
