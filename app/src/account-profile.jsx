/**
 * Account Profile Page - Entry Point
 *
 * Mounts the AccountProfilePage island component
 */

import { createRoot } from 'react-dom/client';
import AccountProfilePage from './islands/pages/AccountProfilePage.jsx';

const container = document.getElementById('account-profile-page');
if (container) {
  const root = createRoot(container);
  root.render(<AccountProfilePage />);
}
