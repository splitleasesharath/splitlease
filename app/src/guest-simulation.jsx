import React from 'react';
import { createRoot } from 'react-dom/client';
import GuestSimulationPage from './islands/pages/GuestSimulationPage/GuestSimulationPage.jsx';

const root = createRoot(document.getElementById('root'));
root.render(<GuestSimulationPage />);
