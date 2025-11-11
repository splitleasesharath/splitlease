import { useState, useEffect } from 'react';
import { redirectToLogin } from '../../lib/auth.js';
import { SIGNUP_LOGIN_URL, SEARCH_URL } from '../../lib/constants.js';

export default function Header() {
  const [mobileMenuActive, setMobileMenuActive] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Handle scroll behavior - hide header on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down & past 100px
        setHeaderVisible(false);
      } else {
        // Scrolling up
        setHeaderVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollY]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.nav-dropdown')) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuActive(!mobileMenuActive);
  };

  // Toggle dropdown menu
  const toggleDropdown = (dropdownName) => {
    setActiveDropdown(activeDropdown === dropdownName ? null : dropdownName);
  };

  // Handle auth modal (redirect to Split Lease login)
  const handleAuthClick = () => {
    window.location.href = SIGNUP_LOGIN_URL;
  };

  // Handle keyboard navigation for dropdowns
  const handleDropdownKeyDown = (e, dropdownName) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleDropdown(dropdownName);
    } else if (e.key === 'Escape') {
      setActiveDropdown(null);
    }
  };

  return (
    <header className={`main-header ${headerVisible ? 'header-visible' : 'header-hidden'}`}>
      <nav className="nav-container">
        {/* Logo Section */}
        <div className="nav-left">
          <a href="https://splitlease.app" className="logo">
            <img src="/assets/images/logo.png" alt="Split Lease" className="logo-image" />
            <span className="logo-text">Split Lease</span>
          </a>
        </div>

        {/* Mobile Hamburger Menu */}
        <button
          className={`hamburger-menu ${mobileMenuActive ? 'active' : ''}`}
          aria-label="Toggle navigation menu"
          onClick={toggleMobileMenu}
        >
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>

        {/* Center Navigation with Dropdowns */}
        <div className={`nav-center ${mobileMenuActive ? 'mobile-active' : ''}`}>
          {/* Host with Us Dropdown */}
          <div className="nav-dropdown">
            <a
              href="#host"
              className="nav-link dropdown-trigger"
              role="button"
              aria-expanded={activeDropdown === 'host'}
              aria-haspopup="true"
              onClick={(e) => {
                e.preventDefault();
                toggleDropdown('host');
              }}
              onKeyDown={(e) => handleDropdownKeyDown(e, 'host')}
            >
              <span className="mobile-text">Host</span>
              <span className="desktop-text">Host with Us</span>
              <svg
                className="dropdown-arrow"
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
            <div
              className={`dropdown-menu ${activeDropdown === 'host' ? 'active' : ''}`}
              role="menu"
              aria-label="Host with Us menu"
            >
              <a
                href="/list-with-us.html"
                className="dropdown-item"
                role="menuitem"
              >
                <span className="dropdown-title">Why List with Us</span>
                <span className="dropdown-desc">New to Split Lease? Learn more about hosting</span>
              </a>
              <a
                href="https://app.split.lease/success-stories-guest"
                className="dropdown-item"
                role="menuitem"
              >
                <span className="dropdown-title">Success Stories</span>
                <span className="dropdown-desc">Explore other hosts' feedback</span>
              </a>
              <a
                href={SIGNUP_LOGIN_URL}
                className="dropdown-item"
                role="menuitem"
              >
                <span className="dropdown-title">List Property</span>
              </a>
              <a
                href="/policies.html"
                className="dropdown-item"
                role="menuitem"
              >
                <span className="dropdown-title">Legal Information</span>
                <span className="dropdown-desc">Review most important policies</span>
              </a>
              <a
                href="/faq.html"
                className="dropdown-item"
                role="menuitem"
              >
                <span className="dropdown-title">FAQs</span>
                <span className="dropdown-desc">Frequently Asked Questions</span>
              </a>
              <a
                href={SIGNUP_LOGIN_URL}
                className="dropdown-item"
                role="menuitem"
              >
                <span className="dropdown-title">Sign Up</span>
              </a>
            </div>
          </div>

          {/* Stay with Us Dropdown */}
          <div className="nav-dropdown">
            <a
              href="#stay"
              className="nav-link dropdown-trigger"
              role="button"
              aria-expanded={activeDropdown === 'stay'}
              aria-haspopup="true"
              onClick={(e) => {
                e.preventDefault();
                toggleDropdown('stay');
              }}
              onKeyDown={(e) => handleDropdownKeyDown(e, 'stay')}
            >
              <span className="mobile-text">Guest</span>
              <span className="desktop-text">Stay with Us</span>
              <svg
                className="dropdown-arrow"
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
            <div
              className={`dropdown-menu ${activeDropdown === 'stay' ? 'active' : ''}`}
              role="menu"
              aria-label="Stay with Us menu"
            >
              <a
                href={SEARCH_URL}
                className="dropdown-item"
                role="menuitem"
              >
                <span className="dropdown-title">Explore Rentals</span>
                <span className="dropdown-desc">See available listings!</span>
              </a>
              <a
                href="https://app.split.lease/success-stories-guest"
                className="dropdown-item"
                role="menuitem"
              >
                <span className="dropdown-title">Success Stories</span>
                <span className="dropdown-desc">Explore other guests' feedback</span>
              </a>
              <a
                href="/faq.html"
                className="dropdown-item"
                role="menuitem"
              >
                <span className="dropdown-title">FAQs</span>
                <span className="dropdown-desc">Frequently Asked Questions</span>
              </a>
              <a
                href={SIGNUP_LOGIN_URL}
                className="dropdown-item"
                role="menuitem"
              >
                <span className="dropdown-title">Sign Up</span>
              </a>
            </div>
          </div>
        </div>

        {/* Right Navigation - Auth Buttons */}
        <div className={`nav-right ${mobileMenuActive ? 'mobile-active' : ''}`}>
          <a href={SEARCH_URL} className="explore-rentals-btn">
            Explore Rentals
          </a>
          <a
            href="#"
            className="nav-link"
            onClick={(e) => {
              e.preventDefault();
              handleAuthClick();
            }}
          >
            Sign In
          </a>
          <span className="divider">|</span>
          <a
            href="#"
            className="nav-link"
            onClick={(e) => {
              e.preventDefault();
              handleAuthClick();
            }}
          >
            Sign Up
          </a>
        </div>
      </nav>
    </header>
  );
}
