import { useState, useEffect } from 'react';
import { redirectToLogin, loginUser, signupUser, logoutUser, validateTokenAndFetchUser, isProtectedPage, getAuthToken } from '../../lib/auth.js';
import { SIGNUP_LOGIN_URL, SEARCH_URL, AUTH_STORAGE_KEYS } from '../../lib/constants.js';
import LoggedInAvatar from './LoggedInAvatar/LoggedInAvatar.jsx';

export default function Header({ autoShowLogin = false }) {
  const [mobileMenuActive, setMobileMenuActive] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Login Modal State
  const [showLoginModal, setShowLoginModal] = useState(autoShowLogin);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Signup Modal State
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [signupForm, setSignupForm] = useState({ email: '', password: '', retype: '' });
  const [signupError, setSignupError] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupRetype, setShowSignupRetype] = useState(false);

  // User Authentication State
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [userType, setUserType] = useState(null);

  // Lazy-load token validation after page is completely loaded
  // Only runs if a token exists in sessionStorage
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

          // If on a protected page and token validation failed:
          // - If autoShowLogin is true, show the modal (don't redirect)
          // - Otherwise, redirect to home
          if (isProtectedPage() && !autoShowLogin) {
            console.log('⚠️ Invalid token on protected page - redirecting to home');
            window.location.replace('/');
          } else if (isProtectedPage() && autoShowLogin) {
            console.log('⚠️ Invalid token on protected page - auth modal will be shown');
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

  // Monitor user type from localStorage for conditional header visibility
  useEffect(() => {
    // Function to read user type from localStorage
    const updateUserType = () => {
      const storedUserType = localStorage.getItem(AUTH_STORAGE_KEYS.USER_TYPE);
      setUserType(storedUserType);
    };

    // Check immediately on mount and when page loads
    if (document.readyState === 'complete') {
      updateUserType();
    } else {
      window.addEventListener('load', updateUserType);
    }

    // Update when currentUser changes (after auth validation)
    if (currentUser) {
      updateUserType();
    }

    // Listen for storage changes (in case user logs in/out in another tab)
    window.addEventListener('storage', updateUserType);

    return () => {
      window.removeEventListener('load', updateUserType);
      window.removeEventListener('storage', updateUserType);
    };
  }, [currentUser]);

  // Helper function to determine if user is a Host based on Supabase user type values
  // Possible values from database:
  // - "A Host (I have a space available to rent)"
  // - "Trial Host"
  // - "Split Lease" (internal users - show both dropdowns)
  const isHost = () => {
    if (!userType) return false;
    return userType.includes('Host') || userType === 'Split Lease';
  };

  // Helper function to determine if user is a Guest based on Supabase user type values
  // Possible values from database:
  // - "A Guest (I would like to rent a space)"
  // - "Split Lease" (internal users - show both dropdowns)
  const isGuest = () => {
    if (!userType) return false;
    return userType.includes('Guest') || userType === 'Split Lease';
  };

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
  const handleLoginClick = () => {
    setShowLoginModal(true);
    setShowSignupModal(false);
    setLoginError('');
    setLoginForm({ email: '', password: '' });
    setShowLoginPassword(false);
  };

  // Handle signup modal - open signup popup
  const handleSignupClick = () => {
    setShowSignupModal(true);
    setShowLoginModal(false);
    setSignupError('');
    setSignupForm({ email: '', password: '', retype: '' });
    setShowSignupPassword(false);
    setShowSignupRetype(false);
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

  // Handle signup form submission
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setSignupError('');
    setIsSigningUp(true);

    const result = await signupUser(signupForm.email, signupForm.password, signupForm.retype);

    setIsSigningUp(false);

    if (result.success) {
      // Signup successful - close modal, wait briefly, then reload page
      setShowSignupModal(false);
      console.log('✅ Signup successful, fetching user data...');

      // Short delay to ensure token is stored
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } else {
      // Show error message
      setSignupError(result.error || 'Signup failed. Please try again.');
    }
  };

  // Close modal when clicking outside
  const handleModalOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      setShowLoginModal(false);
      setShowSignupModal(false);
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

  // Handle logout
  const handleLogout = async () => {
    console.log('🔓 Logging out...');

    // Call logout API
    const result = await logoutUser();

    if (result.success) {
      console.log('✅ Logout successful - reloading page');
      // Reload page to reset state and show logged-out view
      window.location.reload();
    } else {
      console.error('❌ Logout failed:', result.error);
    }
  };

  return (
    <header className={`main-header ${headerVisible ? 'header-visible' : 'header-hidden'}`}>
      <nav className="nav-container">
        {/* Logo Section */}
        <div className="nav-left">
          <a href="/" className="logo">
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
          {/* Host with Us Dropdown - Only show if not logged in OR if logged in as Host */}
          {(!currentUser || isHost()) && (
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
          )}

          {/* Stay with Us Dropdown - Only show if not logged in OR if logged in as Guest */}
          {(!currentUser || isGuest()) && (
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
          )}
        </div>

        {/* Right Navigation - Auth Buttons */}
        <div className={`nav-right ${mobileMenuActive ? 'mobile-active' : ''}`}>
          <a href={SEARCH_URL} className="explore-rentals-btn">
            Explore Rentals
          </a>

          {currentUser && currentUser.firstName ? (
            /* User is logged in - show LoggedInAvatar component */
            <LoggedInAvatar
              user={{
                id: currentUser.id || '',
                name: `${currentUser.firstName} ${currentUser.lastName || ''}`.trim(),
                email: currentUser.email || '',
                userType: userType === 'A Host (I have a space available to rent)' ? 'HOST'
                  : userType === 'Trial Host' ? 'TRIAL_HOST'
                  : userType === 'A Guest (I would like to rent a space)' ? 'GUEST'
                  : 'HOST',
                avatarUrl: currentUser.profilePhoto?.startsWith('//')
                  ? `https:${currentUser.profilePhoto}`
                  : currentUser.profilePhoto,
                proposalsCount: currentUser.proposalsCount || 0,
                listingsCount: currentUser.listingsCount || 0,
                virtualMeetingsCount: currentUser.virtualMeetingsCount || 0,
                houseManualsCount: currentUser.houseManualsCount || 0,
                leasesCount: currentUser.leasesCount || 0,
                favoritesCount: currentUser.favoritesCount || 0,
                unreadMessagesCount: currentUser.unreadMessagesCount || 0,
              }}
              currentPath={window.location.pathname}
              onNavigate={(path) => {
                window.location.href = path;
              }}
              onLogout={handleLogout}
            />
          ) : (
            /* User is not logged in - show auth buttons */
            <>
              <a
                href="#"
                className="nav-link"
                onClick={(e) => {
                  e.preventDefault();
                  handleLoginClick();
                }}
              >
                Sign In
              </a>
              <a
                href="#"
                className="nav-link"
                onClick={(e) => {
                  e.preventDefault();
                  handleSignupClick();
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
                <div style={{ position: 'relative' }}>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    required
                    placeholder="Enter your password"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      paddingRight: '2.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '1rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#5B21B6'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#6b7280',
                      fontSize: '0.875rem',
                      padding: '0.25rem'
                    }}
                  >
                    {showLoginPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
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

              {/* Switch to Signup */}
              <div style={{
                marginTop: '1rem',
                textAlign: 'center'
              }}>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#6b7280',
                  margin: 0
                }}>
                  Don't have an account?{' '}
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handleSignupClick();
                    }}
                    style={{
                      color: '#5B21B6',
                      textDecoration: 'none',
                      fontWeight: '500'
                    }}
                  >
                    Sign Up
                  </a>
                </p>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Signup Modal */}
      {showSignupModal && (
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
                Sign Up
              </h2>
              <p style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                marginTop: '0.5rem',
                marginBottom: 0
              }}>
                Create your account to get started
              </p>
            </div>

            {/* Signup Form */}
            <form onSubmit={handleSignupSubmit}>
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
                  value={signupForm.email}
                  onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
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
                  Password (min 4 characters)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showSignupPassword ? 'text' : 'password'}
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    required
                    minLength={4}
                    placeholder="Enter your password"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      paddingRight: '2.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '1rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#5B21B6'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#6b7280',
                      fontSize: '0.875rem',
                      padding: '0.25rem'
                    }}
                  >
                    {showSignupPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              {/* Retype Password Field */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Retype Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showSignupRetype ? 'text' : 'password'}
                    value={signupForm.retype}
                    onChange={(e) => setSignupForm({ ...signupForm, retype: e.target.value })}
                    required
                    minLength={4}
                    placeholder="Retype your password"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      paddingRight: '2.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '1rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#5B21B6'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupRetype(!showSignupRetype)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#6b7280',
                      fontSize: '0.875rem',
                      padding: '0.25rem'
                    }}
                  >
                    {showSignupRetype ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {signupError && (
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
                    {signupError}
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
                  onClick={() => setShowSignupModal(false)}
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
                  disabled={isSigningUp}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    backgroundColor: isSigningUp ? '#9333ea' : '#5B21B6',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    fontWeight: '500',
                    color: 'white',
                    cursor: isSigningUp ? 'not-allowed' : 'pointer',
                    opacity: isSigningUp ? 0.7 : 1
                  }}
                >
                  {isSigningUp ? 'Signing Up...' : 'Sign Up'}
                </button>
              </div>

              {/* Switch to Login */}
              <div style={{
                marginTop: '1rem',
                textAlign: 'center'
              }}>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#6b7280',
                  margin: 0
                }}>
                  Already have an account?{' '}
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handleLoginClick();
                    }}
                    style={{
                      color: '#5B21B6',
                      textDecoration: 'none',
                      fontWeight: '500'
                    }}
                  >
                    Sign In
                  </a>
                </p>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
