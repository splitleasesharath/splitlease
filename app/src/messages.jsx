/**
 * Messages Entry Point
 * Split Lease - Islands Architecture
 *
 * Mounts the MessagingPage component to the DOM
 * This is an independent React root following Islands Architecture
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import MessagingPage from './islands/pages/MessagingPage/MessagingPage.jsx';
import './styles/main.css';
import './styles/components/messaging.css';

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <MessagingPage />
  </React.StrictMode>
);
