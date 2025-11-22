import { useState, useRef, useEffect } from 'react';
import './LoggedInHeaderAvatar2.css';

/**
 * LoggedInHeaderAvatar2 - Minimal User Avatar Dropdown
 *
 * A simple, self-contained dropdown component for logged-in users.
 * Shows avatar/initials, user name, and provides quick access to:
 * - My Profile
 * - Log Out
 *
 * This component manages its own state and interactions, making it
 * independent from Header component infrastructure.
 *
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.user - Current user object
 * @param {string} props.user.firstName - User's first name (required)
 * @param {string} [props.user.lastName] - User's last name (optional)
 * @param {string} [props.user.profilePhoto] - Profile photo URL (optional)
 * @param {Function} props.onLogout - Async callback function for logout
 * @returns {React.ReactElement} User avatar dropdown component
 *
 * @example
 * <LoggedInHeaderAvatar2
 *   user={{
 *     firstName: 'John',
 *     lastName: 'Doe',
 *     profilePhoto: 'https://example.com/photo.jpg'
 *   }}
 *   onLogout={async () => {
 *     await logoutUser();
 *     window.location.reload();
 *   }}
 * />
 */
export default function LoggedInHeaderAvatar2({ user, onLogout }) {
  // State for controlling dropdown visibility
  const [isOpen, setIsOpen] = useState(false);

  // Ref for click-outside detection
  const dropdownRef = useRef(null);

  /**
   * Toggle dropdown open/close state
   */
  const toggleDropdown = () => {
    setIsOpen((prev) => !prev);
  };

  /**
   * Handle keyboard navigation
   * - Enter/Space: Toggle dropdown
   * - Escape: Close dropdown
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleDropdown();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  /**
   * Handle logout click
   * Prevents default link behavior and calls onLogout callback
   */
  const handleLogoutClick = async (e) => {
    e.preventDefault();
    await onLogout();
  };

  /**
   * Close dropdown when clicking outside the component
   */
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Use closest() to check if click is inside this component
      if (!e.target.closest('.logged-in-header-avatar-2')) {
        setIsOpen(false);
      }
    };

    // Attach listener when dropdown is open
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    // Cleanup listener on unmount or when dropdown closes
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen]);

  // Extract first name and initial
  const firstName = user.firstName || '';
  const initial = firstName.charAt(0).toUpperCase();

  // Normalize profile photo URL (handle protocol-relative URLs)
  const avatarUrl = user.profilePhoto?.startsWith('//')
    ? `https:${user.profilePhoto}`
    : user.profilePhoto;

  return (
    <div
      className="logged-in-header-avatar-2 nav-dropdown user-dropdown"
      ref={dropdownRef}
    >
      {/* Dropdown Trigger Button */}
      <a
        href="#user"
        className="nav-link dropdown-trigger user-trigger"
        role="button"
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={(e) => {
          e.preventDefault();
          toggleDropdown();
        }}
        onKeyDown={handleKeyDown}
      >
        {/* User Avatar or Initial Placeholder */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={firstName}
            className="user-avatar"
          />
        ) : (
          <div className="user-avatar-placeholder">
            {initial}
          </div>
        )}

        {/* User Name + Dropdown Arrow */}
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
      </a>

      {/* Dropdown Menu */}
      <div
        className={`dropdown-menu ${isOpen ? 'active' : ''}`}
        role="menu"
        aria-label="User menu"
      >
        {/* My Profile Link */}
        <a
          href="/account-profile"
          className="dropdown-item"
          role="menuitem"
        >
          <span className="dropdown-title">My Profile</span>
        </a>

        {/* Log Out Link */}
        <a
          href="#"
          className="dropdown-item"
          role="menuitem"
          onClick={handleLogoutClick}
        >
          <span className="dropdown-title">Log Out</span>
        </a>
      </div>
    </div>
  );
}
