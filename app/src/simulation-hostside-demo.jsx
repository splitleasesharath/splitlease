/**
 * Entry Point: simulation-hostside-demo.jsx
 *
 * This is the React entry point for the Host-Side Simulation Demo page.
 * Following Islands Architecture - each page is an independent React root.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import SimulationHostsideDemoPage from './islands/pages/SimulationHostsideDemoPage/SimulationHostsideDemoPage.jsx';
import './styles/global.css';

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <SimulationHostsideDemoPage />
  </React.StrictMode>
);
