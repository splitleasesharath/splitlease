/**
 * Internal Emergency Page Entry Point
 * Split Lease - Islands Architecture
 *
 * Admin-only dashboard for managing guest-reported emergencies
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import InternalEmergencyPage from './islands/pages/InternalEmergencyPage/InternalEmergencyPage.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <InternalEmergencyPage />
  </React.StrictMode>
);
