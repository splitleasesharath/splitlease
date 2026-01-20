/**
 * Device Detection Hook
 * Split Lease - Frontend
 *
 * Provides centralized device/viewport detection for responsive behavior.
 * Uses a standard mobile breakpoint of 768px matching common mobile patterns.
 *
 * Usage:
 *   import { useIsMobile, useIsDesktop } from '../hooks/useDeviceDetection';
 *
 *   function MyComponent() {
 *     const isMobile = useIsMobile();
 *     const isDesktop = useIsDesktop();
 *
 *     if (isMobile) {
 *       return <MobileLayout />;
 *     }
 *     return <DesktopLayout />;
 *   }
 */

import { useState, useEffect } from 'react';

// Standard mobile breakpoint - viewport widths <= this are considered mobile
const MOBILE_BREAKPOINT = 768;

// Tablet breakpoint for more granular detection if needed
const TABLET_BREAKPOINT = 1024;

/**
 * Hook to detect if current viewport is mobile-sized
 * @returns {boolean} True if viewport width <= 768px
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    // SSR safety: default to false if window is not available
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= MOBILE_BREAKPOINT;
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    };

    // Initial check
    checkMobile();

    // Listen for resize events
    window.addEventListener('resize', checkMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

/**
 * Hook to detect if current viewport is desktop-sized
 * Inverse of useIsMobile - viewport width > 768px
 *
 * @returns {boolean} True if viewport width > 768px
 */
export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth > MOBILE_BREAKPOINT;
  });

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth > MOBILE_BREAKPOINT);
    };

    checkDesktop();
    window.addEventListener('resize', checkDesktop);

    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  return isDesktop;
}

/**
 * Hook to detect if current viewport is tablet-sized
 * Tablet range: 769px to 1024px
 *
 * @returns {boolean} True if viewport width is between mobile and tablet breakpoints
 */
export function useIsTablet() {
  const [isTablet, setIsTablet] = useState(() => {
    if (typeof window === 'undefined') return false;
    const width = window.innerWidth;
    return width > MOBILE_BREAKPOINT && width <= TABLET_BREAKPOINT;
  });

  useEffect(() => {
    const checkTablet = () => {
      const width = window.innerWidth;
      setIsTablet(width > MOBILE_BREAKPOINT && width <= TABLET_BREAKPOINT);
    };

    checkTablet();
    window.addEventListener('resize', checkTablet);

    return () => window.removeEventListener('resize', checkTablet);
  }, []);

  return isTablet;
}

/**
 * Hook returning device type string
 * Useful for analytics or conditional rendering
 *
 * @returns {'mobile' | 'tablet' | 'desktop'} Current device type
 */
export function useDeviceType() {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  if (isMobile) return 'mobile';
  if (isTablet) return 'tablet';
  return 'desktop';
}

/**
 * Hook providing all device detection values at once
 * Useful when multiple checks are needed
 *
 * @returns {Object} Object with isMobile, isTablet, isDesktop, deviceType
 */
export function useDeviceDetection() {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();

  return {
    isMobile,
    isTablet,
    isDesktop,
    deviceType: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
    breakpoints: {
      mobile: MOBILE_BREAKPOINT,
      tablet: TABLET_BREAKPOINT
    }
  };
}

// Export constants for direct use
export { MOBILE_BREAKPOINT, TABLET_BREAKPOINT };
