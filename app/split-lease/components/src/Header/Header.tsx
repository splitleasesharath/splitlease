import React, { useCallback, useEffect, useRef } from 'react';
import './Header.css';

export interface HeaderProps {
  logoSrc?: string;
  exploreHref?: string;
  className?: string;
}

const Header: React.FC<HeaderProps> = ({
  logoSrc = 'shared/images/logo.png',
  exploreHref = 'search/index.html',
  className,
}) => {
  const navRef = useRef<HTMLElement | null>(null);

  const toggleMobileMenu = useCallback(() => {
    const root = navRef.current;
    if (!root) return;
    const hamburger = root.querySelector('.hamburger-menu');
    const navCenter = root.querySelector('.nav-center');
    const navRight = root.querySelector('.nav-right');
    if (hamburger) hamburger.classList.toggle('active');
    if (navCenter) navCenter.classList.toggle('mobile-active');
    if (navRight) navRight.classList.toggle('mobile-active');
  }, []);

  const openAuth = useCallback(() => {
    window.location.href = 'https://app.split.lease/signup-login';
  }, []);

  useEffect(() => {
    const root = navRef.current;
    if (!root) return;
    const dropdowns = Array.from(root.querySelectorAll('.nav-dropdown')) as HTMLElement[];

    const cleanupFns: Array<() => void> = [];

    dropdowns.forEach((dropdown) => {
      const trigger = dropdown.querySelector('.dropdown-trigger') as HTMLElement | null;
      const menu = dropdown.querySelector('.dropdown-menu') as HTMLElement | null;
      if (!trigger || !menu) return;
      let isOpen = false;

      const onClick = (e: Event) => {
        e.preventDefault();
        isOpen = !isOpen;
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

      const onTriggerKey = (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          trigger.click();
        } else if (e.key === 'ArrowDown' && dropdown.classList.contains('active')) {
          e.preventDefault();
          const firstItem = dropdown.querySelector('.dropdown-item') as HTMLElement | null;
          firstItem?.focus();
        }
      };
      trigger.addEventListener('keydown', onTriggerKey);
      cleanupFns.push(() => trigger.removeEventListener('keydown', onTriggerKey));

      const items = Array.from(dropdown.querySelectorAll('.dropdown-item')) as HTMLElement[];
      items.forEach((item, index) => {
        const onItemKey = (e: KeyboardEvent) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            const next = items[index + 1] || items[0];
            next.focus();
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prev = items[index - 1] || trigger;
            (prev as HTMLElement).focus();
          } else if (e.key === 'Escape') {
            dropdown.classList.remove('active');
            trigger.focus();
          }
        };
        item.addEventListener('keydown', onItemKey);
        cleanupFns.push(() => item.removeEventListener('keydown', onItemKey));
      });
    });

    const onDocClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.nav-dropdown')) {
        dropdowns.forEach((dropdown) => {
          dropdown.classList.remove('active');
          const menu = dropdown.querySelector('.dropdown-menu') as HTMLElement | null;
          if (menu) {
            menu.style.opacity = '0';
            menu.style.visibility = 'hidden';
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

  useEffect(() => {
    // Smooth scroll for on-page anchors, offset by header height
    const handler = (e: Event) => {
      const anchor = e.currentTarget as HTMLAnchorElement;
      const href = anchor.getAttribute('href') || '';
      if (href === '#signin' || href === '#signup') return; // allow auth links handler
      if (href.startsWith('#')) {
        e.preventDefault();
        const id = href.substring(1);
        const target = document.getElementById(id);
        const headerEl = document.querySelector('.main-header') as HTMLElement | null;
        const headerHeight = headerEl ? headerEl.offsetHeight : 0;
        if (target) {
          const top = target.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }
    };
    const anchors = Array.from(document.querySelectorAll('a[href^="#"]')) as HTMLAnchorElement[];
    anchors.forEach((a) => a.addEventListener('click', handler));
    return () => anchors.forEach((a) => a.removeEventListener('click', handler));
  }, []);

  return (
    <header className={`main-header${className ? ' ' + className : ''}`} ref={(el) => (navRef.current = el)}>
      <nav className="nav-container">
        <div className="nav-left">
          <a href="https://splitlease.app" className="logo">
            <img src={logoSrc} alt="Split Lease" className="logo-image" />
            <span className="logo-text">Split Lease</span>
          </a>
        </div>
        <button className="hamburger-menu" aria-label="Toggle navigation menu" onClick={toggleMobileMenu}>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>
        <div className="nav-center">
          <div className="nav-dropdown">
            <a href="#host" className="nav-link dropdown-trigger" role="button" aria-expanded="false" aria-haspopup="true">
              <span className="mobile-text">Host</span>
              <span className="desktop-text">Host with Us</span>
              <svg className="dropdown-arrow" width="12" height="8" viewBox="0 0 12 8" fill="none" aria-hidden="true">
                <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </a>
            <div className="dropdown-menu" role="menu" aria-label="Host with Us menu">
              <a href="https://app.split.lease/host-step-by-step-guide-to-list" className="dropdown-item" role="menuitem">
                <span className="dropdown-title">Why List with Us</span>
                <span className="dropdown-desc">New to Split Lease? Learn more about hosting</span>
              </a>
              <a href="https://app.split.lease/success-stories-guest" className="dropdown-item" role="menuitem">
                <span className="dropdown-title">Success Stories</span>
                <span className="dropdown-desc">Explore other hosts' feedback</span>
              </a>
              <a href="https://app.split.lease/signup-login" className="dropdown-item" role="menuitem">
                <span className="dropdown-title">List Property</span>
              </a>
              <a href="https://app.split.lease/policies/cancellation-and-refund-policy" className="dropdown-item" role="menuitem">
                <span className="dropdown-title">Legal Information</span>
                <span className="dropdown-desc">Review most important policies</span>
              </a>
              <a href="https://app.split.lease/faq" className="dropdown-item" role="menuitem">
                <span className="dropdown-title">FAQs</span>
                <span className="dropdown-desc">Frequently Asked Questions</span>
              </a>
              <a href="https://app.split.lease/signup-login" className="dropdown-item" role="menuitem">
                <span className="dropdown-title">Sign Up</span>
              </a>
            </div>
          </div>
          <div className="nav-dropdown">
            <a href="#stay" className="nav-link dropdown-trigger" role="button" aria-expanded="false" aria-haspopup="true">
              <span className="mobile-text">Guest</span>
              <span className="desktop-text">Stay with Us</span>
              <svg className="dropdown-arrow" width="12" height="8" viewBox="0 0 12 8" fill="none" aria-hidden="true">
                <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </a>
            <div className="dropdown-menu" role="menu" aria-label="Stay with Us menu">
              <a href={exploreHref} className="dropdown-item" role="menuitem">
                <span className="dropdown-title">Explore Rentals</span>
                <span className="dropdown-desc">See available listings!</span>
              </a>
              <a href="https://app.split.lease/success-stories-guest" className="dropdown-item" role="menuitem">
                <span className="dropdown-title">Success Stories</span>
                <span className="dropdown-desc">Explore other guests' feedback</span>
              </a>
              <a href="https://app.split.lease/faq" className="dropdown-item" role="menuitem">
                <span className="dropdown-title">FAQs</span>
                <span className="dropdown-desc">Frequently Asked Questions</span>
              </a>
              <a href="https://app.split.lease/signup-login" className="dropdown-item" role="menuitem">
                <span className="dropdown-title">Sign Up</span>
              </a>
            </div>
          </div>
        </div>
        <div className="nav-right">
          <a href={exploreHref} className="explore-rentals-btn">Explore Rentals</a>
          <a href="#signin" className="nav-link" onClick={(e) => { e.preventDefault(); openAuth(); }}>Sign In</a>
          <span className="divider">|</span>
          <a href="#signup" className="nav-link" onClick={(e) => { e.preventDefault(); openAuth(); }}>Sign Up</a>
        </div>
      </nav>
    </header>
  );
};

export default Header;


