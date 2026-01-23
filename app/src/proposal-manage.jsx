/**
 * Proposal Management Page Entry Point
 *
 * Admin-only page for managing proposals across all listings.
 * Provides advanced filtering, quick proposal creation, and status management.
 *
 * Route: /_internal/proposal-manage
 * Auth: Admin only
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import ProposalManagePage from './islands/pages/ProposalManagePage/index.jsx';

const root = createRoot(document.getElementById('root'));
root.render(<ProposalManagePage />);
