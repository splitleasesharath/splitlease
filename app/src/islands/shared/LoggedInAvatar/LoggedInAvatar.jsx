import { useState, useRef, useEffect } from 'react';
import './LoggedInAvatar.css';
import { useLoggedInAvatarData, getMenuVisibility, NORMALIZED_USER_TYPES } from './useLoggedInAvatarData.js';
import ReferralModal from '../../pages/AccountProfilePage/components/ReferralModal.jsx';
import HeaderMessagingPanel from '../HeaderMessagingPanel/HeaderMessagingPanel.jsx';

/**
 * Logged In Avatar Dropdown Component
 *
 * A fully-featured dropdown menu for authenticated users with:
 * - User type conditional rendering (HOST, GUEST, TRIAL_HOST)
 * - Smart routing based on user data
 * - Notification badges (purple for most items, red for urgent Messages)
 * - Active page highlighting
 * - Click outside to close functionality
 * - Dynamic menu visibility based on Supabase data
 *
 * Menu Visibility Rules (from Bubble.io conditionals):
 * 1. My Profile - ALWAYS visible
 * 2. My Proposals - ALWAYS visible (all users)
 * 3. Proposals Suggested - GUEST only AND has proposals with "suggested by SL" status
 * 4. My Listings - HOST and TRIAL_HOST only
 * 5. Virtual Meetings - When user HAS proposals (proposalsCount > 0)
 * 6. House Manuals & Visits - GUEST: visits < 1, HOST: house manuals = 0
 * 7. My Leases - Only when user has leases (leasesCount > 0)
 *
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.user - Current user object
 * @param {string} props.user.id - User ID (Bubble _id)
 * @param {string} props.user.name - User's full name
 * @param {string} props.user.email - User's email
 * @param {'HOST' | 'GUEST' | 'TRIAL_HOST'} props.user.userType - User type (fallback if data not loaded)
 * @param {string} [props.user.avatarUrl] - Optional avatar image URL
 * @param {number} props.user.proposalsCount - Count of proposals (fallback)
 * @param {number} props.user.listingsCount - Count of listings (fallback)
 * @param {number} props.user.virtualMeetingsCount - Count of virtual meetings (fallback)
 * @param {number} props.user.houseManualsCount - Count of house manuals (fallback)
 * @param {number} props.user.leasesCount - Count of leases (fallback)
 * @param {number} props.user.favoritesCount - Count of favorite listings (fallback)
 * @param {number} props.user.unreadMessagesCount - Count of unread messages (fallback)
 * @param {string} props.currentPath - Current page path for active highlighting
 * @param {Function} props.onNavigate - Callback when user clicks menu item (receives path)
 * @param {Function} props.onLogout - Callback when user clicks Sign Out
 * @returns {React.ReactElement} Logged in avatar dropdown component
 */
export default function LoggedInAvatar({
  user,
  currentPath,
  onNavigate,
  onLogout,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [showMessagingPanel, setShowMessagingPanel] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 900 : false);
  const dropdownRef = useRef(null);

  // Fetch user data from Supabase for menu conditionals
  // Pass the userType from props as a fallback in case Supabase query doesn't return it
  const { data: supabaseData, loading: dataLoading } = useLoggedInAvatarData(user.id, user.userType);

  // Get menu visibility based on Supabase data
  const menuVisibility = getMenuVisibility(supabaseData, currentPath);

  // Use Supabase data if loaded, otherwise fall back to props
  const effectiveUserType = dataLoading ? user.userType : supabaseData.userType;
  const effectiveProposalsCount = dataLoading ? (user.proposalsCount || 0) : supabaseData.proposalsCount;
  const effectiveListingsCount = dataLoading ? (user.listingsCount || 0) : supabaseData.listingsCount;
  const effectiveVirtualMeetingsCount = dataLoading ? (user.virtualMeetingsCount || 0) : supabaseData.virtualMeetingsCount;
  const effectiveHouseManualsCount = dataLoading ? (user.houseManualsCount || 0) : supabaseData.houseManualsCount;
  const effectiveLeasesCount = dataLoading ? (user.leasesCount || 0) : supabaseData.leasesCount;
  const effectiveFavoritesCount = dataLoading ? (user.favoritesCount || 0) : supabaseData.favoritesCount;
  const effectiveUnreadMessagesCount = dataLoading ? (user.unreadMessagesCount || 0) : supabaseData.unreadMessagesCount;
  const effectiveFirstListingId = dataLoading ? null : supabaseData.firstListingId;
  const effectiveThreadsCount = dataLoading ? 0 : (supabaseData.threadsCount || 0);
  const effectiveLastSuggestedProposalId = dataLoading ? null : supabaseData.lastSuggestedProposalId;

  // Handle resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 900;
      setIsMobile(mobile);
      // Close messaging panel if transitioning to mobile while open
      if (mobile && showMessagingPanel) {
        setShowMessagingPanel(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showMessagingPanel]);

  // Debug logging
  useEffect(() => {
    const instanceId = Math.random().toString(36).substring(7);
    console.log('🎭 LoggedInAvatar mounted with user:', user, 'Instance ID:', instanceId);

    // Track ALL clicks globally to detect double-clicks
    let lastClickTime = 0;
    const globalClickHandler = (e) => {
      const now = e.timeStamp;
      const timeSinceLastClick = now - lastClickTime;
      if (e.target.closest('.logged-in-avatar')) {
        console.log('🌍 Global click on avatar:', {
          timeSinceLastClick: timeSinceLastClick.toFixed(2) + 'ms',
          target: e.target.tagName,
          className: e.target.className,
        });
      }
      lastClickTime = now;
    };
    document.addEventListener('click', globalClickHandler, true);

    return () => {
      document.removeEventListener('click', globalClickHandler, true);
    };
  }, []);

  // Load Lottie player script for animated menu icons
  useEffect(() => {
    // Check if already loaded
    if (document.querySelector('script[src*="lottie-player"]')) return;

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    console.log('🔄 LoggedInAvatar dropdown state changed:', isOpen);

    // Check if dropdown is actually in DOM
    if (isOpen) {
      setTimeout(() => {
        const dropdown = document.querySelector('.logged-in-avatar .dropdown-menu');
        console.log('🔍 Dropdown DOM check:', {
          exists: !!dropdown,
          visible: dropdown ? window.getComputedStyle(dropdown).display : 'N/A',
          position: dropdown ? window.getComputedStyle(dropdown).position : 'N/A',
          zIndex: dropdown ? window.getComputedStyle(dropdown).zIndex : 'N/A',
        });
      }, 10);
    }
  }, [isOpen]);

  // Log menu visibility when data loads
  useEffect(() => {
    if (!dataLoading) {
      console.log('📋 Menu visibility based on Supabase data:', {
        userType: supabaseData.userType,
        proposalsCount: supabaseData.proposalsCount,
        visitsCount: supabaseData.visitsCount,
        houseManualsCount: supabaseData.houseManualsCount,
        visibility: menuVisibility
      });
    }
  }, [dataLoading, supabaseData, menuVisibility]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedElement = event.target;
      const avatarContainer = clickedElement.closest('.logged-in-avatar');

      console.log('🔍 Click detected:', {
        target: clickedElement.tagName,
        className: clickedElement.className,
        foundAvatarContainer: !!avatarContainer,
      });

      // Use closest() like the header does - check if click is inside the avatar component
      if (!avatarContainer) {
        console.log('🚫 Clicked outside - closing dropdown');
        setIsOpen(false);
      } else {
        console.log('✅ Clicked inside avatar - keeping dropdown open');
      }
    };

    if (isOpen) {
      // Use requestAnimationFrame to ensure we attach AFTER current click event completes
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.addEventListener('click', handleClickOutside);
        });
      });

      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen]);

  const getMenuItems = () => {
    const items = [];

    // 1. My Profile - ALWAYS visible
    if (menuVisibility.myProfile) {
      items.push({
        id: 'profile',
        label: 'My Profile',
        icon: '/assets/icons/user-bubble-purple.svg',
        path: `/account-profile/${user.id}`,
      });
    }

    // 2. My Proposals - Visible for all users
    //    - Guests see their submitted proposals
    //    - Hosts see proposals received from guests
    if (menuVisibility.myProposals) {
      items.push({
        id: 'proposals',
        label: 'My Proposals',
        icon: '/assets/icons/file-text-purple.svg',
        path: effectiveUserType === NORMALIZED_USER_TYPES.GUEST
          ? '/guest-proposals'
          : '/host-proposals',
        badgeCount: effectiveProposalsCount,
        badgeColor: 'purple',
      });
    }

    // 3. Proposals Suggested - REMOVED
    //    Now shown via HeaderSuggestedProposalTrigger in mobile header instead of dropdown menu

    // 4. My Listings - HOST and TRIAL_HOST only
    if (menuVisibility.myListings) {
      // When user has exactly 1 listing, go directly to listing-dashboard with the ID
      let listingsPath = '/host-overview';
      if (effectiveListingsCount === 1 && effectiveFirstListingId) {
        listingsPath = `/listing-dashboard?id=${effectiveFirstListingId}`;
      }

      items.push({
        id: 'listings',
        label: 'My Listings',
        icon: '/assets/icons/list-purple.svg',
        path: listingsPath,
        badgeCount: effectiveListingsCount,
        badgeColor: 'purple',
      });
    }

    // 5. Virtual Meetings - When user HAS proposals (proposalsCount > 0)
    if (menuVisibility.virtualMeetings) {
      items.push({
        id: 'virtual-meetings',
        label: 'Virtual Meetings',
        icon: '/assets/icons/video-purple.svg',
        path: effectiveUserType === NORMALIZED_USER_TYPES.GUEST
          ? '/guest-dashboard'
          : '/host-overview',
        badgeCount: effectiveVirtualMeetingsCount,
        badgeColor: 'purple',
      });
    }

    // 6. House Manuals & Visits - Context-aware visibility
    if (menuVisibility.houseManualsAndVisits) {
      items.push({
        id: 'house-manuals',
        label: 'House manuals & Visits',
        icon: '/assets/icons/book-open-purple.svg',
        path: effectiveUserType === NORMALIZED_USER_TYPES.GUEST
          ? '/guest-house-manual'
          : effectiveHouseManualsCount === 1
            ? '/host-house-manual'
            : '/host-overview',
      });
    }

    // 7. My Leases - Only when user has leases (leasesCount > 0)
    if (menuVisibility.myLeases) {
      items.push({
        id: 'leases',
        label: 'My Leases',
        icon: '/assets/icons/key-purple.svg',
        path: effectiveUserType === NORMALIZED_USER_TYPES.GUEST
          ? '/guest-leases'
          : '/host-leases',
        badgeCount: effectiveLeasesCount,
        badgeColor: 'purple',
      });
    }

    // 8. My Favorite Listings - GUEST only when favoritesCount > 0
    if (menuVisibility.myFavoriteListings) {
      items.push({
        id: 'favorites',
        label: 'My Favorite Listings',
        icon: '/assets/icons/heart-purple.svg',
        path: '/favorite-listings',
        badgeCount: effectiveFavoritesCount,
        badgeColor: 'purple',
      });
    }

    // 9. Messages - Always visible, with RED badge for urgency
    if (menuVisibility.messages) {
      items.push({
        id: 'messages',
        label: 'Messages',
        icon: '/assets/icons/message-circle-purple.svg',
        path: '/messages',
        badgeCount: effectiveUnreadMessagesCount,
        badgeColor: 'red',
      });
    }

    // 10. Rental Application - GUEST only
    if (menuVisibility.rentalApplication) {
      items.push({
        id: 'rental-application',
        label: 'Rental Application',
        icon: '/assets/icons/clipboard-purple.svg',
        path: effectiveUserType === NORMALIZED_USER_TYPES.HOST
          ? '/account'
          : `/account-profile?section=rental-application`,
      });
    }

    // 11. Reviews Manager - Always visible
    if (menuVisibility.reviewsManager) {
      items.push({
        id: 'reviews',
        label: 'Reviews Manager',
        icon: '/assets/icons/star-purple.png',
        path: '/reviews-overview',
      });
    }

    // 12. Referral - Always visible
    if (menuVisibility.referral) {
      items.push({
        id: 'referral',
        label: 'Referral',
        icon: '/assets/icons/gift-purple.svg',
        path: '/referral',
      });
    }

    return items;
  };

  const handleMenuItemClick = (item) => {
    setIsOpen(false);
    onNavigate(item.path);
  };

  const handleSignOut = async () => {
    setIsOpen(false);
    await onLogout();
  };

  const isActivePath = (itemPath) => {
    // Items without a path (e.g., Referral modal) are never "active"
    if (!itemPath) return false;

    // Normalize paths for comparison (remove query params and hash)
    const normalizedCurrentPath = currentPath.split('?')[0].split('#')[0];
    const normalizedItemPath = itemPath.split('?')[0].split('#')[0];

    // Check if current path matches or starts with the item path
    return normalizedCurrentPath === normalizedItemPath ||
           normalizedCurrentPath.startsWith(normalizedItemPath + '/');
  };

  const menuItems = getMenuItems();

  // Extract first name from full name
  const firstName = user.name.split(' ')[0];

  // Check if on a page with light header for styling
  const isSearchPage = currentPath.includes('search');
  const isLightHeaderPage = currentPath.includes('favorite-listings') || currentPath.includes('listing-dashboard');

  // Hide messaging icon on the messages page (redundant since user is already there)
  const isMessagesPage = currentPath.includes('/messages');

  return (
    <div className={`logged-in-avatar ${isSearchPage ? 'on-search-page' : ''} ${isLightHeaderPage ? 'on-light-header' : ''}`} ref={dropdownRef}>
      {/* Messaging icon - only shows when user has message threads AND not on messages page */}
      {effectiveThreadsCount > 0 && !isMessagesPage && (
        <div className="header-messages-wrapper">
          <button
            className="header-messages-icon"
            aria-label={`Messages${effectiveUnreadMessagesCount > 0 ? ` (${effectiveUnreadMessagesCount} unread)` : ''}`}
            aria-expanded={showMessagingPanel}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();

              if (isMobile) {
                // Mobile: Navigate to full messaging page
                onNavigate('/messages');
              } else {
                // Desktop: Toggle messaging panel
                setShowMessagingPanel(!showMessagingPanel);
                // Close avatar dropdown if open
                if (isOpen) setIsOpen(false);
              }
            }}
          >
            {/* Envelope/Mail icon */}
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M22 6L12 13L2 6" />
            </svg>
            {effectiveUnreadMessagesCount > 0 && (
              <span className="messages-badge">
                {effectiveUnreadMessagesCount > 9 ? '9+' : effectiveUnreadMessagesCount}
              </span>
            )}
          </button>

          {/* Messaging Panel - Desktop only */}
          {showMessagingPanel && !isMobile && (
            <HeaderMessagingPanel
              isOpen={showMessagingPanel}
              onClose={() => setShowMessagingPanel(false)}
              userBubbleId={user.id}
              userName={firstName}
              userAvatar={user.avatarUrl}
            />
          )}
        </div>
      )}
      <button
        className="avatar-button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('👆 Avatar button clicked!', {
            currentState: isOpen,
            newState: !isOpen,
            eventType: e.type,
            isTrusted: e.isTrusted,
            timeStamp: e.timeStamp,
            target: e.target.tagName,
            currentTarget: e.currentTarget.tagName,
            eventPhase: e.eventPhase,
          });
          // Close messaging panel when opening dropdown menu
          if (showMessagingPanel) setShowMessagingPanel(false);
          setIsOpen(!isOpen);
        }}
        aria-label="Toggle user menu"
        aria-expanded={isOpen}
      >
        <img
          src={user.avatarUrl || '/assets/images/default-avatar.jpg'}
          alt={user.name}
          className="avatar-image"
          onError={(e) => {
            e.target.src = '/assets/images/default-avatar.jpg';
          }}
        />
        <span className="user-name-wrapper">
          {firstName}
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
        </span>
      </button>

      {isOpen && (
        <div className="dropdown-menu">
          {console.log('✨ Dropdown menu is rendering! Menu items count:', menuItems.length)}
          <div className="menu-container">
            {dataLoading && (
              <div className="menu-loading" style={{ padding: '8px 15px', fontSize: '14px', color: '#6b7280' }}>
                Loading menu...
              </div>
            )}
            {menuItems.map((item) => (
              <button
                key={item.id}
                className={`menu-item ${isActivePath(item.path) ? 'active' : ''}`}
                onClick={() => handleMenuItemClick(item)}
              >
                {item.lottieUrl ? (
                  <lottie-player
                    src={item.lottieUrl}
                    background="transparent"
                    speed="1"
                    style={{ width: '20px', height: '20px' }}
                    loop
                    autoplay
                    className="menu-icon"
                  ></lottie-player>
                ) : (
                  <img src={item.icon} alt="" className="menu-icon" />
                )}
                <span className="menu-label">{item.label}</span>
                {item.badgeCount !== undefined && item.badgeCount > 0 && (
                  <span className={`notification-badge ${item.badgeColor}`}>
                    {item.badgeCount}
                  </span>
                )}
              </button>
            ))}

            <button className="menu-item sign-out" onClick={handleSignOut}>
              <img src="/assets/icons/log-out-purple.svg" alt="" className="menu-icon" />
              <span className="menu-label">Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
