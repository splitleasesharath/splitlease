/**
 * Header Island Mount Script
 *
 * Provides automatic and manual mounting capabilities for the Header component
 * following the ESM + React Islands architecture pattern.
 *
 * @module HeaderIsland
 */

import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Header, HeaderProps } from '../components/src/Header';

/**
 * Converts kebab-case data attributes to camelCase props
 * @param element - The DOM element containing data attributes
 * @returns Parsed props object
 */
function parseDataAttributes(element: HTMLElement): Partial<HeaderProps> {
  const props: Partial<HeaderProps> = {};

  // Parse logo-src -> logoSrc
  const logoSrc = element.dataset.logoSrc;
  if (logoSrc) props.logoSrc = logoSrc;

  // Parse explore-href -> exploreHref
  const exploreHref = element.dataset.exploreHref;
  if (exploreHref) props.exploreHref = exploreHref;

  // Parse class-name -> className
  const className = element.dataset.className;
  if (className) props.className = className;

  return props;
}

/**
 * Mounts the Header component as an island
 *
 * @param elementId - The ID of the DOM element to mount into
 * @param runtimeProps - Optional props to override data attributes
 * @returns The React root instance for cleanup
 *
 * @example
 * ```tsx
 * // Auto-mount from HTML
 * <div id="site-header" data-logo-src="/logo.png"></div>
 *
 * // Manual mount
 * const root = mountHeader('site-header', {
 *   logoSrc: '/custom-logo.png',
 *   exploreHref: '/search'
 * });
 *
 * // Cleanup
 * root.unmount();
 * ```
 */
export function mountHeader(
  elementId: string,
  runtimeProps?: Partial<HeaderProps>
): Root | null {
  const element = document.getElementById(elementId);

  if (!element) {
    console.error(`[Header Island] Element with id "${elementId}" not found`);
    return null;
  }

  try {
    // Parse data attributes from the element
    const dataProps = parseDataAttributes(element as HTMLElement);

    // Runtime props override data attributes
    const finalProps: HeaderProps = {
      ...dataProps,
      ...runtimeProps,
    };

    // Create React root and render
    const root = createRoot(element);
    root.render(<Header {...finalProps} />);

    return root;
  } catch (error) {
    console.error(`[Header Island] Failed to mount:`, error);
    return null;
  }
}

/**
 * Auto-mount all Header islands on page load
 * Looks for elements with data-component="header" or default mount points
 */
function autoMount() {
  // Find all elements marked for auto-mount
  const autoMountElements = document.querySelectorAll('[data-component="header"]');

  autoMountElements.forEach((element) => {
    const htmlElement = element as HTMLElement;
    const manualMount = htmlElement.dataset.manualMount === 'true';

    // Skip if manual mount is requested
    if (manualMount) return;

    // Use element ID or generate one
    let elementId = htmlElement.id;
    if (!elementId) {
      elementId = `header-island-${Math.random().toString(36).substr(2, 9)}`;
      htmlElement.id = elementId;
    }

    mountHeader(elementId);
  });

  // Also check for common mount point IDs
  const commonMountPoints = ['site-header', 'main-header', 'app-header'];
  commonMountPoints.forEach((id) => {
    const element = document.getElementById(id);
    if (element && !element.hasChildNodes()) {
      mountHeader(id);
    }
  });
}

// Auto-mount on DOMContentLoaded
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMount);
  } else {
    // DOM already loaded
    autoMount();
  }
}

// Export for manual mounting
export default mountHeader;
