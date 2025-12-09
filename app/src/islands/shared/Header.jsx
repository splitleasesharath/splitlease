import { useState, useEffect } from 'react';
import { redirectToLogin, loginUser, signupUser, logoutUser, validateTokenAndFetchUser, isProtectedPage, getAuthToken, getFirstName, getAvatarUrl } from '../../lib/auth.js';
import { SIGNUP_LOGIN_URL, SEARCH_URL } from '../../lib/constants.js';
import { getUserType as getStoredUserType, getAuthState } from '../../lib/secureStorage.js';
import { supabase } from '../../lib/supabase.js';
import CreateDuplicateListingModal from './CreateDuplicateListingModal/CreateDuplicateListingModal.jsx';
import LoggedInAvatar from './LoggedInAvatar/LoggedInAvatar.jsx';
import SignUpLoginModal from './SignUpLoginModal.jsx';

export default function Header({ autoShowLogin = false }) {
  const [mobileMenuActive, setMobileMenuActive] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Auth Modal State (using new SignUpLoginModal)
  const [showAuthModal, setShowAuthModal] = useState(autoShowLogin);
  const [authModalInitialView, setAuthModalInitialView] = useState('initial'); // 'initial', 'login', 'signup'

  // User Authentication State
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [userType, setUserType] = useState(null);

  // CreateDuplicateListingModal State
  const [showListPropertyModal, setShowListPropertyModal] = useState(false);

  // Optimistic UI: Show cached auth state immediately, validate in background
  // Checks both legacy tokens and Supabase Auth sessions
  useEffect(() => {
    // Step 1: Synchronously check cached auth state for instant UI
    const isAuthenticated = getAuthState();
    const token = getAuthToken();

    // Also check for Supabase Auth session (for native auth users)
    const checkSupabaseAndValidate = async () => {
      let hasSupabaseSession = false;
      if (!token) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          hasSupabaseSession = !!session;
        } catch (err) {
          console.log('[Header] Error checking Supabase session:', err.message);
        }
      }

      if (!token && !hasSupabaseSession && !isAuthenticated) {
        // Not logged in - show logged-out state immediately
        console.log('[Header] No auth state - showing logged-out UI');
        setAuthChecked(true);
        return;
      }

      console.log(`[Header] Auth found (legacy token: ${!!token}, Supabase session: ${hasSupabaseSession}, cached auth: ${isAuthenticated}) - validating...`);

      // Step 2: Show optimistic logged-in state with cached data
      const cachedFirstName = getFirstName();
      const cachedAvatarUrl = getAvatarUrl();
      const cachedUserType = getStoredUserType();

      if (cachedFirstName) {
        // Set optimistic user data for immediate display
        setCurrentUser({
          firstName: cachedFirstName,
          profilePhoto: cachedAvatarUrl,
          userType: cachedUserType,
          _isOptimistic: true // Flag to indicate this is cached data
        });
        setUserType(cachedUserType);
        console.log('[Header] Showing optimistic UI for:', cachedFirstName);
      }

      // Mark as checked so UI renders (with optimistic or no data)
      setAuthChecked(true);

      // Step 3: Validate in background and update with real data
      const performBackgroundValidation = async () => {
        try {
          const userData = await validateTokenAndFetchUser();

          if (userData) {
            // Token is valid - update with real user data
            setCurrentUser(userData);
            console.log('[Header] Background validation successful:', userData.firstName);
          } else {
            // Token is invalid - clear optimistic state
            setCurrentUser(null);
            console.log('[Header] Background validation failed - clearing auth');

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
        }
      };

      // Run validation after page load to not block rendering
      if (document.readyState === 'complete') {
        performBackgroundValidation();
      } else {
        window.addEventListener('load', performBackgroundValidation, { once: true });
      }
    };

    checkSupabaseAndValidate();
  }, [autoShowLogin]);

  // Monitor user type from localStorage for conditional header visibility
  useEffect(() => {
    // Function to read user type from localStorage using secureStorage module
    // This ensures we read from the same key that auth.js writes to ('sl_user_type')
    const updateUserType = () => {
      const storedUserType = getStoredUserType();
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
    setAuthModalInitialView('login');
    setShowAuthModal(true);
  };

  // Handle signup modal - open signup popup
  const handleSignupClick = () => {
    setAuthModalInitialView('signup');
    setShowAuthModal(true);
  };

  // Handle auth modal close
  const handleAuthModalClose = () => {
    setShowAuthModal(false);
  };

  // Handle successful authentication
  const handleAuthSuccess = (result) => {
    console.log('✅ Authentication successful:', result);
    // The modal will handle the reload
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
          {/* Host with Us Dropdown - Only show if not logged in OR if logged in as Host/Trial Host/Split Lease */}
          {(!currentUser || !userType || isHost()) && (
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
                href="/list-with-us"
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
                href="/self-listing-v2"
                className="dropdown-item"
                role="menuitem"
                onClick={() => {
                  setActiveDropdown(null);
                  setMobileMenuActive(false);
                }}
              >
                <span className="dropdown-title">List Property</span>
              </a>
              <a
                href="/policies"
                className="dropdown-item"
                role="menuitem"
              >
                <span className="dropdown-title">Legal Information</span>
                <span className="dropdown-desc">Review most important policies</span>
              </a>
              <a
                href="/faq?section=hosts"
                className="dropdown-item"
                role="menuitem"
              >
                <span className="dropdown-title">FAQs</span>
                <span className="dropdown-desc">Frequently Asked Questions</span>
              </a>
              {!currentUser && (
              <a
                href="#"
                className="dropdown-item"
                role="menuitem"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveDropdown(null);
                  setMobileMenuActive(false);
                  handleSignupClick();
                }}
              >
                <span className="dropdown-title">Sign Up</span>
              </a>
              )}
            </div>
          </div>
          )}

          {/* Stay with Us Dropdown - Only show if not logged in OR if logged in as Guest/Split Lease */}
          {(!currentUser || !userType || isGuest()) && (
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
                href="/why-split-lease"
                className="dropdown-item"
                role="menuitem"
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
                href="/faq?section=travelers"
                className="dropdown-item"
                role="menuitem"
              >
                <span className="dropdown-title">FAQs</span>
                <span className="dropdown-desc">Frequently Asked Questions</span>
              </a>
              {!currentUser && (
              <a
                href="#"
                className="dropdown-item"
                role="menuitem"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveDropdown(null);
                  setMobileMenuActive(false);
                  handleSignupClick();
                }}
              >
                <span className="dropdown-title">Sign Up</span>
              </a>
              )}
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
            /* User is logged in - show LoggedInAvatar component with full menu */
            /* Note: currentUser.userId comes from validateTokenAndFetchUser() in auth.js */
            /* The hook useLoggedInAvatarData will fetch fresh data from Supabase using this ID */
            <LoggedInAvatar
              user={{
                id: currentUser.userId || currentUser.id || '',
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

      {/* Auth Modal (SignUpLoginModal) */}
      <SignUpLoginModal
        isOpen={showAuthModal}
        onClose={handleAuthModalClose}
        initialView={authModalInitialView}
        onAuthSuccess={handleAuthSuccess}
        disableClose={autoShowLogin && isProtectedPage()}
      />

      {/* CreateDuplicateListingModal */}
      {showListPropertyModal && (
        <CreateDuplicateListingModal
          isVisible={showListPropertyModal}
          onClose={() => setShowListPropertyModal(false)}
          currentUser={currentUser}
        />
      )}
    </header>
  );
}
