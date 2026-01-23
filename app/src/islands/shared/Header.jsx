import { useState, useEffect, useRef } from 'react';
import { redirectToLogin, loginUser, signupUser, logoutUser, validateTokenAndFetchUser, isProtectedPage, getAuthToken, getFirstName, getAvatarUrl, checkUrlForAuthError, getUserId } from '../../lib/auth.js';
import { SIGNUP_LOGIN_URL, SEARCH_URL, HOST_OVERVIEW_URL } from '../../lib/constants.js';
import { getUserType as getStoredUserType, getAuthState } from '../../lib/secureStorage.js';
import { supabase } from '../../lib/supabase.js';
import CreateDuplicateListingModal from './CreateDuplicateListingModal/CreateDuplicateListingModal.jsx';
import LoggedInAvatar from './LoggedInAvatar/LoggedInAvatar.jsx';
import SignUpLoginModal from './SignUpLoginModal.jsx';
import { useHostMenuData, getHostMenuConfig } from './Header/useHostMenuData.js';
import { useGuestMenuData, getGuestMenuConfig } from './Header/useGuestMenuData.js';
import SuggestedProposalPopup from './SuggestedProposals/SuggestedProposalPopup.jsx';
import HeaderSuggestedProposalTrigger from './SuggestedProposals/HeaderSuggestedProposalTrigger.jsx';
import { fetchPendingConfirmationCount, fetchPendingConfirmationProposals, markProposalInterested, dismissProposal } from './SuggestedProposals/suggestedProposalService.js';

export default function Header({ autoShowLogin = false }) {
  const [mobileMenuActive, setMobileMenuActive] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Auth Modal State (using new SignUpLoginModal)
  const [showAuthModal, setShowAuthModal] = useState(autoShowLogin);
  const [authModalInitialView, setAuthModalInitialView] = useState('initial'); // 'initial', 'login', 'signup'
  const [prefillEmail, setPrefillEmail] = useState(null); // Email to prefill in signup form (from OAuth user not found)
  const [defaultUserType, setDefaultUserType] = useState(null); // 'host' or 'guest' for pre-selecting user type

  // User Authentication State
  // CRITICAL: Initialize with cached data synchronously to prevent flickering
  // If we have cached firstName, we're likely logged in - show optimistic UI immediately
  const cachedFirstName = getFirstName();
  const cachedAvatarUrl = getAvatarUrl();
  const cachedUserType = getStoredUserType();
  const cachedUserId = getUserId(); // Get cached userId for suggested proposals check
  const hasCachedAuth = !!(cachedFirstName && getAuthState());

  const [currentUser, setCurrentUser] = useState(() => {
    // Return optimistic user data if we have cached auth
    if (hasCachedAuth) {
      return {
        userId: cachedUserId, // Include userId for pending proposals check
        firstName: cachedFirstName,
        profilePhoto: cachedAvatarUrl,
        userType: cachedUserType,
        _isOptimistic: true
      };
    }
    return null;
  });
  const [authChecked, setAuthChecked] = useState(hasCachedAuth); // If we have cache, consider it checked
  const [userType, setUserType] = useState(cachedUserType);

  // CreateDuplicateListingModal State
  const [showListPropertyModal, setShowListPropertyModal] = useState(false);

  // Suggested Proposal Popup State
  const [pendingProposalCount, setPendingProposalCount] = useState(0);
  const [showSuggestedPopup, setShowSuggestedPopup] = useState(false);
  const [pendingProposals, setPendingProposals] = useState([]);
  const [currentProposalIndex, setCurrentProposalIndex] = useState(0);
  const [isProcessingProposal, setIsProcessingProposal] = useState(false);
  const [isNotInterestedModalOpen, setIsNotInterestedModalOpen] = useState(false);

  // Dynamic menu data hooks for Host and Guest dropdowns
  const userId = currentUser?.userId || currentUser?.id || '';
  const isAuthenticated = !!currentUser;
  const { state: hostMenuState } = useHostMenuData(userId, isAuthenticated);
  const { state: guestMenuState } = useGuestMenuData(userId, isAuthenticated);

  // Background validation: Validate cached auth state and update with real data
  // The optimistic UI is already set synchronously in useState initializer above
  useEffect(() => {
    const token = getAuthToken();

    // Background validation function
    const performBackgroundValidation = async () => {
      // ALWAYS check for Supabase Auth session (regardless of legacy token)
      // This ensures we have the session for fallback if validation fails
      let hasSupabaseSession = false;
      let session = null;
      try {
        // CRITICAL: Supabase client may not have loaded session from localStorage yet
        // Give it a moment to initialize before checking
        // The onAuthStateChange listener will fire INITIAL_SESSION when ready
        const { data } = await supabase.auth.getSession();
        session = data?.session;
        hasSupabaseSession = !!session;

        // If no session on first check, wait briefly for Supabase to initialize
        // This handles the race condition where getSession() returns null but
        // INITIAL_SESSION fires shortly after with a valid session
        if (!hasSupabaseSession) {
          console.log('[Header] No immediate Supabase session, waiting briefly for initialization...');
          await new Promise(resolve => setTimeout(resolve, 200));
          const { data: retryData } = await supabase.auth.getSession();
          session = retryData?.session;
          hasSupabaseSession = !!session;
          if (hasSupabaseSession) {
            console.log('[Header] ✅ Found Supabase session after brief wait');
          }
        }
      } catch (err) {
        console.log('[Header] Error checking Supabase session:', err.message);
      }

      // If no auth at all, ensure we show logged-out state
      if (!token && !hasSupabaseSession && !hasCachedAuth) {
        console.log('[Header] No auth state - confirming logged-out UI');
        setAuthChecked(true);
        setCurrentUser(null);
        return;
      }

      console.log(`[Header] Auth found (legacy token: ${!!token}, Supabase session: ${hasSupabaseSession}, cached auth: ${hasCachedAuth}) - validating...`);

      // Validate token and get fresh user data
      // CRITICAL: Use clearOnFailure: false to preserve valid Supabase sessions
      // even if user profile fetch fails (e.g., network error, user not in DB yet)
      try {
        const userData = await validateTokenAndFetchUser({ clearOnFailure: false });

        if (userData) {
          // Token is valid - update with real user data
          setCurrentUser(userData);
          setUserType(getStoredUserType());
          console.log('[Header] Background validation successful:', userData.firstName);
        } else {
          // Validation failed but session may still be valid
          // Only clear UI state, not the underlying session
          console.log('[Header] Background validation returned no user data');

          // If we have a Supabase session, keep trying - don't give up
          if (hasSupabaseSession) {
            console.log('[Header] Supabase session exists - preserving auth state');
            // Set basic user info from session if available
            if (session?.user) {
              const bubbleUserId = session.user.user_metadata?.user_id || getUserId() || session.user.id;
              setCurrentUser({
                userId: bubbleUserId, // Include userId for pending proposals check
                firstName: session.user.user_metadata?.first_name || session.user.email?.split('@')[0] || 'User',
                email: session.user.email,
                _isFromSession: true
              });
            }
          } else {
            setCurrentUser(null);
            console.log('[Header] Background validation failed - clearing auth UI');

            // If on a protected page and token validation failed:
            // - If autoShowLogin is true, show the modal (don't redirect)
            // - Otherwise, redirect to home
            // IMPORTANT: Check for auth errors in URL hash first to prevent redirect loops
            // When a magic link fails, the error params remain in the URL and we should
            // let the page handle the error instead of redirecting
            if (isProtectedPage() && !autoShowLogin) {
              // Check if there's an auth error in URL - if so, let the page handle it
              const authError = checkUrlForAuthError();
              if (authError) {
                console.log('⚠️ Auth error present in URL, not redirecting to prevent loop');
                // Let the page component handle the error display
              } else {
                console.log('⚠️ Invalid token on protected page - redirecting to home');
                window.location.replace('/');
              }
            } else if (isProtectedPage() && autoShowLogin) {
              console.log('⚠️ Invalid token on protected page - auth modal will be shown');
            }
          }
        }
      } catch (error) {
        console.error('Auth validation error:', error);
        // Don't clear user if we have a session - just log the error
        if (!hasSupabaseSession) {
          setCurrentUser(null);
        }
      }

      // Mark validation as complete
      setAuthChecked(true);
    };

    // Run validation after page load to not block rendering
    if (document.readyState === 'complete') {
      performBackgroundValidation();
    } else {
      window.addEventListener('load', performBackgroundValidation, { once: true });
    }
  }, [autoShowLogin, hasCachedAuth]);

  // Listen for Supabase auth state changes (e.g., signup from another component like ViewSplitLeasePage)
  // Track if we've already handled a sign-in to prevent duplicate processing
  const signInHandledRef = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Header] Auth state changed:', event);

      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        // Prevent duplicate handling - only process the first sign-in event
        if (signInHandledRef.current) {
          console.log('[Header] Sign-in already handled, skipping duplicate event:', event);
          return;
        }
        signInHandledRef.current = true;

        // User signed in - fetch and update user data
        // CRITICAL: Use setTimeout to defer the async work and avoid deadlock with setSession()
        // If we await validateTokenAndFetchUser() synchronously, it calls getSession() which
        // can't complete until setSession() finishes, but setSession() waits for this listener
        console.log('[Header] User signed in, deferring UI update to avoid deadlock...');
        setTimeout(async () => {
          try {
            console.log('[Header] Now updating UI...');
            // CRITICAL: Use clearOnFailure: false to preserve the valid Supabase session
            // even if user profile fetch fails (network error, user not in DB, etc.)
            const userData = await validateTokenAndFetchUser({ clearOnFailure: false });
            if (userData) {
              setCurrentUser(userData);
              setUserType(getStoredUserType());
              setAuthChecked(true);
              console.log('[Header] UI updated for:', userData.firstName);
            } else {
              // Validation failed but we have a valid session - set basic info from session
              console.log('[Header] User profile fetch failed, using session data');
              if (session?.user) {
                setCurrentUser({
                  firstName: session.user.user_metadata?.first_name || session.user.email?.split('@')[0] || 'User',
                  email: session.user.email,
                  _isFromSession: true
                });
                setAuthChecked(true);
              }
            }
          } catch (error) {
            console.error('[Header] Error updating user data after sign in:', error);
          }
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        // Reset the flag when user signs out
        signInHandledRef.current = false;
        // User signed out - trigger page reload/redirect
        // Don't just clear state - the component tree change would interrupt the logout flow
        console.log('[Header] User signed out, reloading page...');
        if (isProtectedPage()) {
          window.location.href = '/';
        } else {
          window.location.reload();
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Listen for global OAuth callback results (from oauthCallbackHandler.js)
  // This handles cases where OAuth login callback is processed before React mounts
  useEffect(() => {
    const handleOAuthSuccess = (event) => {
      // OAuth login succeeded - Header's onAuthStateChange will update UI
      // No toast needed here as the page will update automatically
      console.log('[Header] OAuth login success:', event.detail);
    };

    const handleOAuthError = (event) => {
      console.log('[Header] OAuth login error:', event.detail.error);
      // Could show error toast here if needed, but typically the user
      // will see the modal with error state
    };

    const handleUserNotFound = (event) => {
      console.log('[Header] OAuth user not found:', event.detail.email);
      // Open signup modal with email prefilled
      setPrefillEmail(event.detail.email);
      setAuthModalInitialView('signup');
      setShowAuthModal(true);
    };

    window.addEventListener('oauth-login-success', handleOAuthSuccess);
    window.addEventListener('oauth-login-error', handleOAuthError);
    window.addEventListener('oauth-login-user-not-found', handleUserNotFound);

    return () => {
      window.removeEventListener('oauth-login-success', handleOAuthSuccess);
      window.removeEventListener('oauth-login-error', handleOAuthError);
      window.removeEventListener('oauth-login-user-not-found', handleUserNotFound);
    };
  }, []);

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

  // Fetch pending confirmation proposals for guest users
  useEffect(() => {
    const fetchPendingProposals = async () => {
      // Only fetch for logged-in guest users
      if (!currentUser?.userId && !currentUser?.id) return;
      if (!isGuest()) return;

      const userId = currentUser.userId || currentUser.id;
      const count = await fetchPendingConfirmationCount(userId);
      setPendingProposalCount(count);
    };

    if (currentUser && authChecked) {
      fetchPendingProposals();
    }
  }, [currentUser, authChecked, userType]);

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
    setDefaultUserType(null); // Clear any pre-selected user type
    setAuthModalInitialView('signup');
    setShowAuthModal(true);
  };

  // Handle host signup - open signup popup with host type pre-selected
  const handleHostSignupClick = () => {
    setDefaultUserType('host');
    setAuthModalInitialView('signup');
    setShowAuthModal(true);
  };

  // Handle auth modal close
  const handleAuthModalClose = () => {
    setShowAuthModal(false);
    setPrefillEmail(null); // Clear prefilled email when modal closes
    setDefaultUserType(null); // Clear pre-selected user type when modal closes
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
      console.log('✅ Logout successful');
      // If on a protected page, redirect to home instead of reloading
      if (isProtectedPage()) {
        console.log('📍 On protected page - redirecting to home');
        window.location.href = '/';
      } else {
        console.log('📍 On public page - reloading');
        window.location.reload();
      }
    } else {
      console.error('❌ Logout failed:', result.error);
    }
  };

  // Handle suggested proposal trigger click - load full proposals and show popup
  const handleSuggestedTriggerClick = async () => {
    if (showSuggestedPopup) {
      // Already open, just close
      setShowSuggestedPopup(false);
      return;
    }

    const userId = currentUser?.userId || currentUser?.id;
    if (!userId) return;

    // Fetch full proposal details when opening popup
    const proposals = await fetchPendingConfirmationProposals(userId);
    setPendingProposals(proposals);
    setCurrentProposalIndex(0);
    setShowSuggestedPopup(true);
  };

  // Handle "Interested" action on suggested proposal
  const handleProposalInterested = async () => {
    const proposal = pendingProposals[currentProposalIndex];
    if (!proposal) return;

    setIsProcessingProposal(true);
    const result = await markProposalInterested(proposal._id);
    setIsProcessingProposal(false);

    if (result.success) {
      // Remove from list and update count
      const newProposals = pendingProposals.filter((_, i) => i !== currentProposalIndex);
      setPendingProposals(newProposals);
      setPendingProposalCount(prev => Math.max(0, prev - 1));

      if (newProposals.length === 0) {
        setShowSuggestedPopup(false);
      } else if (currentProposalIndex >= newProposals.length) {
        setCurrentProposalIndex(newProposals.length - 1);
      }
    }
  };

  // Handle "Not Interested" action - opens the feedback modal
  const handleProposalRemove = () => {
    const proposal = pendingProposals[currentProposalIndex];
    if (!proposal) return;
    setIsNotInterestedModalOpen(true);
  };

  // Close Not Interested modal
  const handleCloseNotInterestedModal = () => {
    setIsNotInterestedModalOpen(false);
  };

  // Confirm Not Interested with optional feedback
  const handleConfirmNotInterested = async (feedback = null) => {
    const proposal = pendingProposals[currentProposalIndex];
    if (!proposal) return;

    setIsProcessingProposal(true);
    const result = await dismissProposal(proposal._id, feedback);
    setIsProcessingProposal(false);

    if (result.success) {
      // Close the modal
      setIsNotInterestedModalOpen(false);

      // Remove from list and update count
      const newProposals = pendingProposals.filter((_, i) => i !== currentProposalIndex);
      setPendingProposals(newProposals);
      setPendingProposalCount(prev => Math.max(0, prev - 1));

      if (newProposals.length === 0) {
        setShowSuggestedPopup(false);
      } else if (currentProposalIndex >= newProposals.length) {
        setCurrentProposalIndex(newProposals.length - 1);
      }
    }
  };

  // Navigate between proposals in popup
  const handleNextProposal = () => {
    if (currentProposalIndex < pendingProposals.length - 1) {
      setCurrentProposalIndex(prev => prev + 1);
    }
  };

  const handlePreviousProposal = () => {
    if (currentProposalIndex > 0) {
      setCurrentProposalIndex(prev => prev - 1);
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

        {/* Mobile Suggested Proposal Trigger - visible only on mobile, positioned before hamburger */}
        {currentUser && isGuest() && pendingProposalCount > 0 && window.location.pathname !== '/guest-proposals' && (
          <HeaderSuggestedProposalTrigger
            onClick={handleSuggestedTriggerClick}
            isActive={showSuggestedPopup}
            proposalCount={pendingProposalCount}
            className="mobile-sp-trigger"
          />
        )}

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
                e.stopPropagation();
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
              className={`dropdown-menu dropdown-menu-host ${activeDropdown === 'host' ? 'active' : ''}`}
              role="menu"
              aria-label="Host with Us menu"
            >
              {/* Mega Menu Layout */}
              {(() => {
                const hostMenuConfig = getHostMenuConfig(hostMenuState, handleHostSignupClick);
                const featured = hostMenuConfig.featured;

                return (
                  <div className="mega-menu-content">
                    {/* Featured Section (left side) */}
                    <div className="mega-menu-featured">
                      <div className="featured-image">
                        <img src={featured.image} alt="" />
                      </div>
                      <h3 className="featured-title">{featured.title}</h3>
                      <p className="featured-desc">{featured.desc}</p>
                      <a
                        href={featured.ctaHref}
                        className="featured-link"
                        onClick={() => {
                          setActiveDropdown(null);
                          setMobileMenuActive(false);
                        }}
                      >
                        <span>{featured.cta}</span>
                        <svg className="featured-link-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </a>
                    </div>

                    {/* Vertical Separator */}
                    <div className="menu-separator" />

                    {/* Menu Columns */}
                    <div className="mega-menu-columns">
                      {/* Column 1: First half of items */}
                      <div className="menu-column">
                        <div className="menu-column-title">Learn</div>
                        {hostMenuConfig.items.slice(0, Math.ceil(hostMenuConfig.items.length / 2)).map((item) => (
                          <a
                            key={item.id}
                            href={item.href}
                            className="dropdown-item"
                            role="menuitem"
                            onClick={item.action ? (e) => {
                              e.preventDefault();
                              setActiveDropdown(null);
                              setMobileMenuActive(false);
                              item.action();
                            } : () => {
                              setActiveDropdown(null);
                              setMobileMenuActive(false);
                            }}
                          >
                            <span className="dropdown-title">{item.title}</span>
                          </a>
                        ))}
                      </div>

                      {/* Column 2: Second half of items + CTA */}
                      <div className="menu-column">
                        <div className="menu-column-title">Get Started</div>
                        {hostMenuConfig.items.slice(Math.ceil(hostMenuConfig.items.length / 2)).map((item) => (
                          <a
                            key={item.id}
                            href={item.href}
                            className="dropdown-item"
                            role="menuitem"
                            onClick={item.action ? (e) => {
                              e.preventDefault();
                              setActiveDropdown(null);
                              setMobileMenuActive(false);
                              item.action();
                            } : () => {
                              setActiveDropdown(null);
                              setMobileMenuActive(false);
                            }}
                          >
                            <span className="dropdown-title">{item.title}</span>
                          </a>
                        ))}

                        {/* Bottom CTA */}
                        <div className="dropdown-separator" />
                        <a
                          href={hostMenuConfig.cta.href || '#'}
                          className="dropdown-cta"
                          role="menuitem"
                          onClick={hostMenuConfig.cta.action ? (e) => {
                            e.preventDefault();
                            setActiveDropdown(null);
                            setMobileMenuActive(false);
                            hostMenuConfig.cta.action();
                          } : () => {
                            setActiveDropdown(null);
                            setMobileMenuActive(false);
                          }}
                        >
                          {hostMenuConfig.cta.label}
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
          )}

          {/* Stay with Us Dropdown - Only show if not logged in OR if logged in as Guest/Split Lease */}
          {/* Hidden on mobile when suggested proposal icons are visible to reduce clutter */}
          {(!currentUser || !userType || isGuest()) && (
          <div className={`nav-dropdown${pendingProposalCount > 0 ? ' hide-on-mobile-with-suggestions' : ''}`}>
            <a
              href="#stay"
              className="nav-link dropdown-trigger"
              role="button"
              aria-expanded={activeDropdown === 'stay'}
              aria-haspopup="true"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
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
              className={`dropdown-menu dropdown-menu-guest ${activeDropdown === 'stay' ? 'active' : ''}`}
              role="menu"
              aria-label="Stay with Us menu"
            >
              {/* Mega Menu Layout */}
              {(() => {
                const guestMenuConfig = getGuestMenuConfig(guestMenuState, handleSignupClick);
                const featured = guestMenuConfig.featured;

                return (
                  <div className="mega-menu-content">
                    {/* Featured Section (left side) */}
                    <div className="mega-menu-featured">
                      <div className="featured-image">
                        <img src={featured.image} alt="" />
                      </div>
                      <h3 className="featured-title">{featured.title}</h3>
                      <p className="featured-desc">{featured.desc}</p>
                      <a
                        href={featured.ctaHref}
                        className="featured-link"
                        onClick={() => {
                          setActiveDropdown(null);
                          setMobileMenuActive(false);
                        }}
                      >
                        <span>{featured.cta}</span>
                        <svg className="featured-link-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </a>
                    </div>

                    {/* Vertical Separator */}
                    <div className="menu-separator" />

                    {/* Menu Columns */}
                    <div className="mega-menu-columns">
                      {/* Column 1: First half of items */}
                      <div className="menu-column">
                        <div className="menu-column-title">Discover</div>
                        {guestMenuConfig.items.slice(0, Math.ceil(guestMenuConfig.items.length / 2)).map((item) => (
                          <a
                            key={item.id}
                            href={item.href}
                            className="dropdown-item"
                            role="menuitem"
                            onClick={item.action ? (e) => {
                              e.preventDefault();
                              setActiveDropdown(null);
                              setMobileMenuActive(false);
                              item.action();
                            } : () => {
                              setActiveDropdown(null);
                              setMobileMenuActive(false);
                            }}
                          >
                            <span className="dropdown-title">{item.title}</span>
                          </a>
                        ))}
                      </div>

                      {/* Column 2: Second half of items + CTA */}
                      <div className="menu-column">
                        <div className="menu-column-title">Get Started</div>
                        {guestMenuConfig.items.slice(Math.ceil(guestMenuConfig.items.length / 2)).map((item) => (
                          <a
                            key={item.id}
                            href={item.href}
                            className="dropdown-item"
                            role="menuitem"
                            onClick={item.action ? (e) => {
                              e.preventDefault();
                              setActiveDropdown(null);
                              setMobileMenuActive(false);
                              item.action();
                            } : () => {
                              setActiveDropdown(null);
                              setMobileMenuActive(false);
                            }}
                          >
                            <span className="dropdown-title">{item.title}</span>
                          </a>
                        ))}

                        {/* Bottom CTA */}
                        <div className="dropdown-separator" />
                        <a
                          href={guestMenuConfig.cta.href || '#'}
                          className="dropdown-cta"
                          role="menuitem"
                          onClick={guestMenuConfig.cta.action ? (e) => {
                            e.preventDefault();
                            setActiveDropdown(null);
                            setMobileMenuActive(false);
                            guestMenuConfig.cta.action();
                          } : () => {
                            setActiveDropdown(null);
                            setMobileMenuActive(false);
                          }}
                        >
                          {guestMenuConfig.cta.label}
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
          )}
        </div>

        {/* Right Navigation - Auth Buttons */}
        <div className={`nav-right ${mobileMenuActive ? 'mobile-active' : ''}`}>
          {currentUser && isHost() ? (
            <a href={HOST_OVERVIEW_URL} className="explore-rentals-btn">
              Host Overview
            </a>
          ) : (
            <a href={SEARCH_URL} className="explore-rentals-btn">
              Explore Rentals
            </a>
          )}

          {currentUser && currentUser.firstName ? (
            /* User is logged in - show LoggedInAvatar component with full menu */
            /* Note: currentUser.userId comes from validateTokenAndFetchUser() in auth.js */
            /* The hook useLoggedInAvatarData will fetch fresh data from Supabase using this ID */
            <LoggedInAvatar
              user={{
                id: currentUser.userId || currentUser.id || '',
                name: `${currentUser.firstName} ${currentUser.lastName || ''}`.trim(),
                email: currentUser.email || '',
                userType: (() => {
                  // Normalize user type to 'HOST', 'GUEST', or 'TRIAL_HOST'
                  // Handles both legacy Bubble format and new Supabase Auth format
                  if (!userType) return 'GUEST';
                  if (userType === 'Host' || userType === 'A Host (I have a space available to rent)' || userType === 'Split Lease') return 'HOST';
                  if (userType === 'Trial Host') return 'TRIAL_HOST';
                  if (userType === 'Guest' || userType === 'A Guest (I would like to rent a space)') return 'GUEST';
                  // Fallback: check if it contains 'Host' (but not 'Trial')
                  if (userType.includes('Host') && !userType.includes('Trial')) return 'HOST';
                  if (userType.includes('Trial')) return 'TRIAL_HOST';
                  return 'GUEST';
                })(),
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
        prefillEmail={prefillEmail}
        defaultUserType={defaultUserType}
      />

      {/* CreateDuplicateListingModal */}
      {showListPropertyModal && (
        <CreateDuplicateListingModal
          isVisible={showListPropertyModal}
          onClose={() => setShowListPropertyModal(false)}
          currentUser={currentUser}
        />
      )}

      {/* Suggested Proposal Popup */}
      <SuggestedProposalPopup
        proposal={pendingProposals[currentProposalIndex]}
        currentIndex={currentProposalIndex}
        totalCount={pendingProposals.length}
        onInterested={handleProposalInterested}
        onRemove={handleProposalRemove}
        onNext={handleNextProposal}
        onPrevious={handlePreviousProposal}
        onClose={() => setShowSuggestedPopup(false)}
        isVisible={showSuggestedPopup}
        isProcessing={isProcessingProposal}
        isNotInterestedModalOpen={isNotInterestedModalOpen}
        onCloseNotInterestedModal={handleCloseNotInterestedModal}
        onConfirmNotInterested={handleConfirmNotInterested}
      />
    </header>
  );
}
