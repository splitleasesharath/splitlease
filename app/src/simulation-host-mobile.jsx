/**
 * Simulation Host Mobile - React Entry Point
 *
 * Islands Architecture: This file mounts the SimulationHostMobilePage
 * component as an independent React root.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import SimulationHostMobilePage from './islands/pages/SimulationHostMobilePage.jsx';

const root = createRoot(document.getElementById('root'));
root.render(<SimulationHostMobilePage />);
