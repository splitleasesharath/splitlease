/**
 * Footer island mount point
 * Mounts the Footer component into the DOM at specified element
 */

import { createRoot } from 'react-dom/client';
import { Footer } from '../components/src/Footer';
import type { FooterProps } from '../types/components';

/**
 * Mount Footer component into DOM element
 * @param elementId - ID of the element to mount into
 * @param props - Footer component props
 */
export function mountFooter(elementId: string, props: FooterProps = {}): void {
  const element = document.getElementById(elementId);

  if (!element) {
    console.error(`Element with id "${elementId}" not found`);
    return;
  }

  const root = createRoot(element);
  root.render(<Footer {...props} year={props.year || new Date().getFullYear()} />);
}

/**
 * Auto-mount Footer if element exists on page load
 */
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const footerElement = document.getElementById('footer-island');
    if (footerElement) {
      // Extract props from data attributes
      const linksData = footerElement.dataset.links;
      const links = linksData ? JSON.parse(linksData) : undefined;

      mountFooter('footer-island', {
        links,
      });
    }
  });
}
