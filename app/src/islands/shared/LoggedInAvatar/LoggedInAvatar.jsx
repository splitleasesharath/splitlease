import { useState, useRef, useEffect } from 'react';
import './LoggedInAvatar.css';

/**
 * Logged In Avatar Dropdown Component
 *
 * A fully-featured dropdown menu for authenticated users with:
 * - User type conditional rendering (HOST, GUEST, TRIAL_HOST)
 * - Smart routing based on user data
 * - Notification badges (purple for most items, red for urgent Messages)
 * - Active page highlighting
 * - Click outside to close functionality
 *
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.user - Current user object
 * @param {string} props.user.id - User ID
 * @param {string} props.user.name - User's full name
 * @param {string} props.user.email - User's email
 * @param {'HOST' | 'GUEST' | 'TRIAL_HOST'} props.user.userType - User type
 * @param {string} [props.user.avatarUrl] - Optional avatar image URL
 * @param {number} props.user.proposalsCount - Count of proposals
 * @param {number} props.user.listingsCount - Count of listings
 * @param {number} props.user.virtualMeetingsCount - Count of virtual meetings
 * @param {number} props.user.houseManualsCount - Count of house manuals
 * @param {number} props.user.leasesCount - Count of leases
 * @param {number} props.user.favoritesCount - Count of favorite listings
 * @param {number} props.user.unreadMessagesCount - Count of unread messages
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
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getMenuItems = () => {
    const items = [
      {
        id: 'profile',
        label: 'My Profile',
        icon: '/icons/User.svg',
        path: '/profile',
      },
    ];

    // My Proposals - visible for HOST and TRIAL_HOST
    if (user.userType === 'HOST' || user.userType === 'TRIAL_HOST') {
      items.push({
        id: 'proposals',
        label: 'My Proposals',
        icon: '/icons/Proposals-purple.svg',
        path: '/proposals',
        badgeCount: user.proposalsCount,
        badgeColor: 'purple',
      });
    }

    // Suggested Proposal - visible for GUEST
    if (user.userType === 'GUEST') {
      items.push({
        id: 'suggested-proposal',
        label: 'Suggested Proposal',
        icon: '/icons/Proposals-purple.svg',
        path: '/guest-dashboard',
      });
    }

    // My Listings - visible for all
    items.push({
      id: 'listings',
      label: 'My Listings',
      icon: '/icons/Listing.svg',
      path: user.listingsCount > 1 ? '/host-overview' : user.listingsCount === 1 ? '/host-dashboard' : '/host-overview',
      badgeCount: user.listingsCount,
      badgeColor: 'purple',
    });

    // Virtual Meetings
    items.push({
      id: 'virtual-meetings',
      label: 'Virtual Meetings',
      icon: '/icons/virtual meeting.svg',
      path: user.userType === 'GUEST' ? '/guest-dashboard' : '/host-overview',
      badgeCount: user.virtualMeetingsCount,
      badgeColor: 'purple',
    });

    // House manuals & Visits
    items.push({
      id: 'house-manuals',
      label: 'House manuals & Visits',
      icon: '/icons/House Manual 1.svg',
      path: user.userType === 'GUEST' ? '/guest-house-manual' : user.houseManualsCount === 1 ? '/host-house-manual' : '/host-overview',
    });

    // My Leases
    items.push({
      id: 'leases',
      label: 'My Leases',
      icon: '/icons/Leases-purple.svg',
      path: user.userType === 'GUEST' ? '/guest-leases' : '/host-leases',
      badgeCount: user.leasesCount,
      badgeColor: 'purple',
    });

    // My Favorite Listings
    items.push({
      id: 'favorites',
      label: 'My Favorite Listings',
      icon: '/icons/Favorite.svg',
      path: '/favorite-listings',
      badgeCount: user.favoritesCount,
      badgeColor: 'purple',
    });

    // Messages - with RED badge for urgency
    items.push({
      id: 'messages',
      label: 'Messages',
      icon: '/icons/Message.svg',
      path: '/messaging',
      badgeCount: user.unreadMessagesCount,
      badgeColor: 'red',
    });

    // Rental Application
    items.push({
      id: 'rental-application',
      label: 'Rental Application',
      icon: '/icons/suitcase-svgrepo-com 1.svg',
      path: user.userType === 'HOST' ? '/account' : '/rental-application',
    });

    // Reviews Manager
    items.push({
      id: 'reviews',
      label: 'Reviews Manager',
      icon: '/icons/check green.svg',
      path: '/reviews-overview',
    });

    // Referral
    items.push({
      id: 'referral',
      label: 'Referral',
      icon: '/icons/Referral.svg',
      path: '/referral',
    });

    return items;
  };

  const handleMenuItemClick = (item) => {
    setIsOpen(false);
    onNavigate(item.path);
  };

  const handleSignOut = () => {
    setIsOpen(false);
    onLogout();
  };

  const isActivePath = (itemPath) => {
    return currentPath.includes(itemPath.replace('/', ''));
  };

  const menuItems = getMenuItems();

  return (
    <div className="logged-in-avatar" ref={dropdownRef}>
      <button
        className="avatar-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle user menu"
        aria-expanded={isOpen}
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.name} className="avatar-image" />
        ) : (
          <div className="avatar-placeholder">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
      </button>

      {isOpen && (
        <div className="dropdown-menu">
          <div className="menu-container">
            {menuItems.map((item) => (
              <button
                key={item.id}
                className={`menu-item ${isActivePath(item.path) ? 'active' : ''}`}
                onClick={() => handleMenuItemClick(item)}
              >
                <img src={item.icon} alt="" className="menu-icon" />
                <span className="menu-label">{item.label}</span>
                {item.badgeCount !== undefined && item.badgeCount > 0 && (
                  <span className={`notification-badge ${item.badgeColor}`}>
                    {item.badgeCount}
                  </span>
                )}
              </button>
            ))}

            <button className="menu-item sign-out" onClick={handleSignOut}>
              <img src="/icons/Log out.svg" alt="" className="menu-icon" />
              <span className="menu-label">Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
