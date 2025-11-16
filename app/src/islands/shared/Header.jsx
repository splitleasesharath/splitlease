import { useState, useEffect } from 'react';
import { redirectToLogin, loginUser, validateTokenAndFetchUser, isProtectedPage, getAuthToken } from '../../lib/auth.js';
import { SIGNUP_LOGIN_URL, SEARCH_URL } from '../../lib/constants.js';

export default function Header() {
  const [mobileMenuActive, setMobileMenuActive] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Login Modal State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // User Authentication State
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Lazy-load token validation after page is completely loaded
  // Only runs if a token exists in localStorage
  useEffect(() => {
    const validateAuth = async () => {
      // Check if token exists first - skip validation if no token
      const token = getAuthToken();
      if (!token) {
        console.log('[Header] No token found - skipping validation');
        setAuthChecked(true);
        return;
      }

      // Token exists - wait for page to be completely loaded before validating
      if (document.readyState !== 'complete') {
        window.addEventListener('load', () => {
          performAuthValidation();
        });
      } else {
        // Page already loaded, validate immediately
        performAuthValidation();
      }
    };

    const performAuthValidation = async () => {
      try {
        const userData = await validateTokenAndFetchUser();

        if (userData) {
          // Token is valid, user is logged in
          setCurrentUser(userData);
        } else {
          // Token is invalid or not present
          setCurrentUser(null);

          // If on a protected page, redirect to home
          if (isProtectedPage()) {
            console.log('⚠️ Invalid token on protected page - redirecting to home');
            window.location.href = 'https://splitlease.app';
          }
        }
      } catch (error) {
        console.error('Auth validation error:', error);
        setCurrentUser(null);
      } finally {
        setAuthChecked(true);
      }
    };

    validateAuth();
  }, []);

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

  // Handle auth modal - open login popup
  const handleAuthClick = () => {
    setShowLoginModal(true);
    setLoginError('');
    setLoginForm({ email: '', password: '' });
  };

  // Handle login form submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    const result = await loginUser(loginForm.email, loginForm.password);

    setIsLoggingIn(false);

    if (result.success) {
      // Login successful - close modal and reload page
      setShowLoginModal(false);
      window.location.reload();
    } else {
      // Show error message
      setLoginError(result.error || 'Login failed. Please try again.');
    }
  };

  // Close modal when clicking outside
  const handleModalOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      setShowLoginModal(false);
    }
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
                href="/host-success"
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
                href="/faq.html?section=hosts"
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
                href="https://splitleasesharath.github.io/Guest-sales-why-split-lease"
                className="dropdown-item"
                role="menuitem"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="dropdown-title">Why Split Lease</span>
                <span className="dropdown-desc">Learn why guests choose Split Lease</span>
              </a>
              <a
                href="/guest-success"
                className="dropdown-item"
                role="menuitem"
              >
                <span className="dropdown-title">Success Stories</span>
                <span className="dropdown-desc">Explore other guests' feedback</span>
              </a>
              <a
                href="/faq.html?section=travelers"
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

          {currentUser && currentUser.firstName ? (
            /* User is logged in - show greeting */
            <span className="nav-link" style={{ fontWeight: '500', color: '#5B21B6' }}>
              Hello, {currentUser.firstName}
            </span>
          ) : (
            /* User is not logged in - show auth buttons */
            <>
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
            </>
          )}
        </div>
      </nav>

      {/* Login Modal */}
      {showLoginModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
          onClick={handleModalOverlayClick}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#1a202c',
                margin: 0
              }}>
                Sign In
              </h2>
              <p style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                marginTop: '0.5rem',
                marginBottom: 0
              }}>
                Enter your credentials to access your account
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLoginSubmit}>
              {/* Email Field */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Email
                </label>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  required
                  placeholder="your@email.com"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#5B21B6'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>

              {/* Password Field */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Password
                </label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  required
                  placeholder="Enter your password"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#5B21B6'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>

              {/* Error Message */}
              {loginError && (
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  marginBottom: '1rem'
                }}>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#dc2626',
                    margin: 0
                  }}>
                    {loginError}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '0.75rem',
                marginTop: '1.5rem'
              }}>
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    backgroundColor: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    fontWeight: '500',
                    color: '#374151',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    backgroundColor: isLoggingIn ? '#9333ea' : '#5B21B6',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    fontWeight: '500',
                    color: 'white',
                    cursor: isLoggingIn ? 'not-allowed' : 'pointer',
                    opacity: isLoggingIn ? 0.7 : 1
                  }}
                >
                  {isLoggingIn ? 'Signing In...' : 'Sign In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
