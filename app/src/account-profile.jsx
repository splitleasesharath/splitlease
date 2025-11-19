/**
 * Account Profile Page - Entry Point
 *
 * Mounts the AccountProfilePage island component
 * Auth check happens INSIDE the component after mount to ensure storage APIs are ready
 */

import { createRoot } from 'react-dom/client';
import AccountProfilePage from './islands/pages/AccountProfilePage.jsx';

// Always render immediately - auth check will happen after component mounts
const container = document.getElementById('account-profile-page');
if (container) {
  const root = createRoot(container);
  root.render(<AccountProfilePage requireAuth={true} />);
}
