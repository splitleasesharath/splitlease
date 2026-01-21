import React from 'react';
import { createRoot } from 'react-dom/client';
import FAQPage from './islands/pages/FAQPage.jsx';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

// Import CSS so Vite bundles it (required for production build)
// Order matters: main.css first (global styles), then page-specific CSS
import './styles/main.css';
import './styles/faq.css';

// Import config to set window.ENV before Google Maps loads
import './lib/config.js';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <FAQPage />
    </ErrorBoundary>
  </React.StrictMode>
);
