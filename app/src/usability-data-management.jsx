/**
 * Usability Data Management Page Entry Point
 * Internal admin tool for managing usability test data
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import UsabilityDataManagementPage from './islands/pages/UsabilityDataManagementPage/UsabilityDataManagementPage';
import './styles/usability-data-management.css';

const root = createRoot(document.getElementById('root'));
root.render(<UsabilityDataManagementPage />);
