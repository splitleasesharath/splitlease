/**
 * Header Component
 *
 * A fully accessible, performant navigation header built with ESM + React Islands architecture.
 * Implements WCAG 2.1 AA compliance, keyboard navigation, and responsive design.
 *
 * @module Header
 */

import React, { useCallback, useEffect, useRef, memo } from 'react';
import styles from './Header.module.css';

/**
 * Props for the Header component
 *
 * @interface HeaderProps
 * @property {string} [logoSrc] - URL for the logo image (defaults to 'shared/images/logo.png')
 * @property {string} [exploreHref] - URL for the explore/search functionality (defaults to 'search/index.html')
 * @property {string} [className] - Additional CSS class names to apply to the header
 *
 * @example
 * ```tsx
 * <Header
 *   logoSrc="/assets/logo.png"
 *   exploreHref="/search"
 *   className="site-header"
 * />
 * ```
 */
export interface HeaderProps {
  /** URL for the logo image */
  logoSrc?: string;
  /** URL for the explore/search functionality */
  exploreHref?: string;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Header Component
 *
 * Main navigation header with dropdown menus, mobile support, and full accessibility.
 * Features:
 * - Keyboard navigation (Tab, Arrow keys, Enter, Escape)
 * - Screen reader support with proper ARIA attributes
 * - Responsive mobile/desktop layouts
 * - Hover and click interactions for dropdown menus
 * - Smooth scroll with header offset for anchor links
 * - Performance optimized with React.memo
 *
 * @param {HeaderProps} props - Component props
 * @returns {React.ReactElement} Rendered header component
 */
const Header: React.FC<HeaderProps> = memo(({
  logoSrc = 'shared/images/logo.png',
  exploreHref = 'search/index.html',
  className = '',
}) => {
  const navRef = useRef<HTMLElement | null>(null);

  /**
   * Toggles the mobile menu visibility
   * Adds/removes 'active' class on hamburger and nav sections
   */
  const toggleMobileMenu = useCallback(() => {
    const root = navRef.current;
    if (!root) return;

    const hamburger = root.querySelector(`.${styles.hamburgerMenu}`);
    const navCenter = root.querySelector(`.${styles.navCenter}`);
    const navRight = root.querySelector(`.${styles.navRight}`);

    if (hamburger) hamburger.classList.toggle('active');
    if (navCenter) navCenter.classList.toggle('mobile-active');
    if (navRight) navRight.classList.toggle('mobile-active');
  }, []);

  /**
   * Navigates to the authentication page
   * Redirects to the Split Lease signup/login page
   */
  const openAuth = useCallback(() => {
    window.location.href = 'https://app.split.lease/signup-login';
  }, []);

  /**
   * Sets up dropdown menu interactions
   * Handles click, hover, and keyboard navigation
   */
  useEffect(() => {
    const root = navRef.current;
    if (!root) return;

    const dropdowns = Array.from(root.querySelectorAll(`.${styles.navDropdown}`)) as HTMLElement[];
    const cleanupFns: Array<() => void> = [];

    dropdowns.forEach((dropdown) => {
      const trigger = dropdown.querySelector(`.${styles.dropdownTrigger}`) as HTMLElement | null;
      const menu = dropdown.querySelector(`.${styles.dropdownMenu}`) as HTMLElement | null;

      if (!trigger || !menu) return;

      let isOpen = false;

      // Click handler for dropdown toggle
      const onClick = (e: Event) => {
        e.preventDefault();
        isOpen = !isOpen;

        // Update ARIA attribute
        trigger.setAttribute('aria-expanded', String(isOpen));

        if (isOpen) {
          dropdown.classList.add('active');
          menu.style.opacity = '1';
          menu.style.visibility = 'visible';
        } else {
          dropdown.classList.remove('active');
          menu.style.opacity = '0';
          menu.style.visibility = 'hidden';
        }
      };
      trigger.addEventListener('click', onClick);
      cleanupFns.push(() => trigger.removeEventListener('click', onClick));

      // Hover handlers
      const onEnter = () => dropdown.classList.add('hover');
      const onLeave = () => {
        dropdown.classList.remove('hover');
        if (!isOpen) {
          dropdown.classList.remove('active');
          menu.style.opacity = '0';
          menu.style.visibility = 'hidden';
        }
      };
      dropdown.addEventListener('mouseenter', onEnter);
      dropdown.addEventListener('mouseleave', onLeave);
      cleanupFns.push(() => dropdown.removeEventListener('mouseenter', onEnter));
      cleanupFns.push(() => dropdown.removeEventListener('mouseleave', onLeave));

      // Keyboard navigation for trigger
      const onTriggerKey = (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          trigger.click();
        } else if (e.key === 'ArrowDown' && dropdown.classList.contains('active')) {
          e.preventDefault();
          const firstItem = dropdown.querySelector(`.${styles.dropdownItem}`) as HTMLElement | null;
          firstItem?.focus();
        }
      };
      trigger.addEventListener('keydown', onTriggerKey);
      cleanupFns.push(() => trigger.removeEventListener('keydown', onTriggerKey));

      // Keyboard navigation for dropdown items
      const items = Array.from(dropdown.querySelectorAll(`.${styles.dropdownItem}`)) as HTMLElement[];
      items.forEach((item, index) => {
        const onItemKey = (e: KeyboardEvent) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            const next = items[index + 1] || items[0];
            next?.focus();
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prev = items[index - 1] || trigger;
            (prev as HTMLElement).focus();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            dropdown.classList.remove('active');
            menu.style.opacity = '0';
            menu.style.visibility = 'hidden';
            trigger.setAttribute('aria-expanded', 'false');
            trigger.focus();
            isOpen = false;
          }
        };
        item.addEventListener('keydown', onItemKey);
        cleanupFns.push(() => item.removeEventListener('keydown', onItemKey));
      });
    });

    // Close dropdowns on outside click
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`.${styles.navDropdown}`)) {
        dropdowns.forEach((dropdown) => {
          dropdown.classList.remove('active');
          const menu = dropdown.querySelector(`.${styles.dropdownMenu}`) as HTMLElement | null;
          const trigger = dropdown.querySelector(`.${styles.dropdownTrigger}`) as HTMLElement | null;
          if (menu) {
            menu.style.opacity = '0';
            menu.style.visibility = 'hidden';
          }
          if (trigger) {
            trigger.setAttribute('aria-expanded', 'false');
          }
        });
      }
    };
    document.addEventListener('click', onDocClick);
    cleanupFns.push(() => document.removeEventListener('click', onDocClick));

    return () => {
      cleanupFns.forEach((fn) => fn());
    };
  }, []);

  /**
   * Sets up smooth scrolling for anchor links
   * Offsets scroll by header height + 20px
   */
  useEffect(() => {
    const handler = (e: Event) => {
      const anchor = e.currentTarget as HTMLAnchorElement;
      const href = anchor.getAttribute('href') || '';

      // Allow auth links to be handled by their own handlers
      if (href === '#signin' || href === '#signup') return;

      if (href.startsWith('#')) {
        e.preventDefault();
        const id = href.substring(1);
        const target = document.getElementById(id);
        const headerEl = document.querySelector(`.${styles.mainHeader}`) as HTMLElement | null;
        const headerHeight = headerEl ? headerEl.offsetHeight : 0;

        if (target && window.scrollTo) {
          const top = target.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }
    };

    const anchors = Array.from(document.querySelectorAll('a[href^="#"]')) as HTMLAnchorElement[];
    anchors.forEach((a) => a.addEventListener('click', handler));

    return () => anchors.forEach((a) => a.removeEventListener('click', handler));
  }, []);

  // Combine className prop with base class
  const headerClassName = className
    ? `${styles.mainHeader} ${className}`
    : styles.mainHeader;

  return (
    <header className={headerClassName} ref={(el) => (navRef.current = el)} role="banner">
      <nav className={styles.navContainer} role="navigation">
        <div className={styles.navLeft}>
          <a href="https://splitlease.app" className={styles.logo}>
            <img src={logoSrc} alt="Split Lease" className={styles.logoImage} />
            <span className={styles.logoText}>Split Lease</span>
          </a>
        </div>

        <button
          className={styles.hamburgerMenu}
          aria-label="Toggle navigation menu"
          onClick={toggleMobileMenu}
        >
          <span className={styles.hamburgerLine}></span>
          <span className={styles.hamburgerLine}></span>
          <span className={styles.hamburgerLine}></span>
        </button>

        <div className={styles.navCenter}>
          {/* Host Dropdown */}
          <div className={styles.navDropdown}>
            <a
              href="#host"
              className={`${styles.navLink} ${styles.dropdownTrigger}`}
              role="button"
              aria-expanded="false"
              aria-haspopup="true"
            >
              <span className={styles.mobileText}>Host</span>
              <span className={styles.desktopText}>Host with Us</span>
              <svg
                className={styles.dropdownArrow}
                width="12"
                height="8"
                viewBox="0 0 12 8"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M1 1.5L6 6.5L11 1.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </a>
            <div className={styles.dropdownMenu} role="menu" aria-label="Host with Us menu">
              <a
                href="https://app.split.lease/host-step-by-step-guide-to-list"
                className={styles.dropdownItem}
                role="menuitem"
              >
                <span className={styles.dropdownTitle}>Why List with Us</span>
                <span className={styles.dropdownDesc}>New to Split Lease? Learn more about hosting</span>
              </a>
              <a
                href="https://app.split.lease/success-stories-guest"
                className={styles.dropdownItem}
                role="menuitem"
              >
                <span className={styles.dropdownTitle}>Success Stories</span>
                <span className={styles.dropdownDesc}>Explore other hosts' feedback</span>
              </a>
              <a
                href="https://app.split.lease/signup-login"
                className={styles.dropdownItem}
                role="menuitem"
              >
                <span className={styles.dropdownTitle}>List Property</span>
              </a>
              <a
                href="https://app.split.lease/policies/cancellation-and-refund-policy"
                className={styles.dropdownItem}
                role="menuitem"
              >
                <span className={styles.dropdownTitle}>Legal Information</span>
                <span className={styles.dropdownDesc}>Review most important policies</span>
              </a>
              <a
                href="https://app.split.lease/faq"
                className={styles.dropdownItem}
                role="menuitem"
              >
                <span className={styles.dropdownTitle}>FAQs</span>
                <span className={styles.dropdownDesc}>Frequently Asked Questions</span>
              </a>
              <a
                href="https://app.split.lease/signup-login"
                className={styles.dropdownItem}
                role="menuitem"
              >
                <span className={styles.dropdownTitle}>Sign Up</span>
              </a>
            </div>
          </div>

          {/* Guest Dropdown */}
          <div className={styles.navDropdown}>
            <a
              href="#stay"
              className={`${styles.navLink} ${styles.dropdownTrigger}`}
              role="button"
              aria-expanded="false"
              aria-haspopup="true"
            >
              <span className={styles.mobileText}>Guest</span>
              <span className={styles.desktopText}>Stay with Us</span>
              <svg
                className={styles.dropdownArrow}
                width="12"
                height="8"
                viewBox="0 0 12 8"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M1 1.5L6 6.5L11 1.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </a>
            <div className={styles.dropdownMenu} role="menu" aria-label="Stay with Us menu">
              <a href={exploreHref} className={styles.dropdownItem} role="menuitem">
                <span className={styles.dropdownTitle}>Explore Rentals</span>
                <span className={styles.dropdownDesc}>See available listings!</span>
              </a>
              <a
                href="https://app.split.lease/success-stories-guest"
                className={styles.dropdownItem}
                role="menuitem"
              >
                <span className={styles.dropdownTitle}>Success Stories</span>
                <span className={styles.dropdownDesc}>Explore other guests' feedback</span>
              </a>
              <a
                href="https://app.split.lease/faq"
                className={styles.dropdownItem}
                role="menuitem"
              >
                <span className={styles.dropdownTitle}>FAQs</span>
                <span className={styles.dropdownDesc}>Frequently Asked Questions</span>
              </a>
              <a
                href="https://app.split.lease/signup-login"
                className={styles.dropdownItem}
                role="menuitem"
              >
                <span className={styles.dropdownTitle}>Sign Up</span>
              </a>
            </div>
          </div>
        </div>

        <div className={styles.navRight}>
          <a href={exploreHref} className={styles.exploreRentalsBtn}>
            Explore Rentals
          </a>
          <a
            href="#signin"
            className={styles.navLink}
            onClick={(e) => {
              e.preventDefault();
              openAuth();
            }}
          >
            Sign In
          </a>
          <span className={styles.divider}>|</span>
          <a
            href="#signup"
            className={styles.navLink}
            onClick={(e) => {
              e.preventDefault();
              openAuth();
            }}
          >
            Sign Up
          </a>
        </div>
      </nav>
    </header>
  );
});

Header.displayName = 'Header';

export default Header;
