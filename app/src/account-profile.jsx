/**
 * Account Profile Page - Island Hydration
 *
 * This file mounts the shared Header and Footer components as React islands
 * The page content is static HTML for maximum performance
 */

import { createRoot } from 'react-dom/client';
import Header from './islands/shared/Header.jsx';
import Footer from './islands/shared/Footer.jsx';

// Mount Header island
const headerRoot = document.getElementById('header-root');
if (headerRoot) {
  createRoot(headerRoot).render(<Header />);
}

// Mount Footer island
const footerRoot = document.getElementById('footer-root');
if (footerRoot) {
  createRoot(footerRoot).render(<Footer />);
}
