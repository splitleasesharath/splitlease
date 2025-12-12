/**
 * account-profile.jsx
 *
 * Entry point for the Account Profile page.
 * Mounts the AccountProfilePage React component to the DOM.
 *
 * ARCHITECTURE: This follows the Hollow Component Pattern.
 * The AccountProfilePage component is a React island that handles:
 * - Editor View (user viewing/editing their own profile)
 * - Public View (user viewing someone else's profile - read-only)
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import AccountProfilePage from './islands/pages/AccountProfilePage/AccountProfilePage.jsx';

// Mount the Account Profile Page
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<AccountProfilePage />);
}
