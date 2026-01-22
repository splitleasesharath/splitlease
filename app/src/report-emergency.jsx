/**
 * Report Emergency Page Entry Point
 * Split Lease - Islands Architecture
 *
 * Guest-facing form for reporting emergencies at their property
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import ReportEmergencyPage from './islands/pages/ReportEmergencyPage/ReportEmergencyPage.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ReportEmergencyPage />
  </React.StrictMode>
);
