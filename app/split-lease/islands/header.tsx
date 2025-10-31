/**
 * Header island mount point
 * Mounts the Header component into the DOM at specified element
 */

import { createRoot } from 'react-dom/client';
import { Header } from '../components/src/Header';
import type { HeaderProps } from '../types/components';

/**
 * Mount Header component into DOM element
 * @param elementId - ID of the element to mount into
 * @param props - Header component props
 */
export function mountHeader(elementId: string, props: HeaderProps = {}): void {
  const element = document.getElementById(elementId);

  if (!element) {
    console.error(`Element with id "${elementId}" not found`);
    return;
  }

  const root = createRoot(element);
  root.render(<Header {...props} />);
}

/**
 * Auto-mount Header if element exists on page load
 */
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const headerElement = document.getElementById('header-island');
    if (headerElement) {
      // Extract props from data attributes
      const isAuthenticated = headerElement.dataset.authenticated === 'true';
      const userName = headerElement.dataset.userName;

      mountHeader('header-island', {
        isAuthenticated,
        userName,
      });
    }
  });
}
