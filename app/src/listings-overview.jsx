/**
 * Listings Overview Page Entry Point
 *
 * Admin-only page for viewing and managing all listings.
 * Provides filtering, inline editing, error management, and bulk price updates.
 *
 * Route: /_internal/listings-overview
 * Auth: Admin only
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import ListingsOverviewPage from './islands/pages/ListingsOverviewPage/index.jsx';

const root = createRoot(document.getElementById('root'));
root.render(<ListingsOverviewPage />);
