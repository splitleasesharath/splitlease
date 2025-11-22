import './LoggedInHeaderAvatar2.css';
import { useHeaderDropdownLogic } from './useHeaderDropdownLogic.js';
import {
  processUserInitials,
  processUserDisplayName,
  processProfilePhotoUrl,
} from '../../../logic/processors/index.js';
import {
  hasProfilePhoto,
  shouldShowFullName,
} from '../../../logic/rules/index.js';

/**
 * LoggedInHeaderAvatar2 - Hollow Island User Avatar Dropdown
 *
 * A "Hollow Island" component following the Logic Core architecture.
 * This component ONLY handles visual presentation and delegates all
 * business logic to Logic Core functions and orchestration hooks.
 *
 * **Logic Core Integration:**
 * - processUserInitials: Generate avatar initials (Processor)
 * - processUserDisplayName: Format display name (Processor)
 * - processProfilePhotoUrl: Normalize photo URL (Processor)
 * - hasProfilePhoto: Check if photo exists (Rule)
 * - shouldShowFullName: Determine name display format (Rule)
 * - useHeaderDropdownLogic: Dropdown interaction orchestration (Hook)
 *
 * **NO FALLBACK Principle:**
 * All data processing is delegated to Logic Core which fails loud
 * on invalid data. This component assumes valid, pre-processed data.
 *
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.user - Current user object (required, validated by Logic Core)
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
  // Orchestration Hook - Manages dropdown state and interactions
  const {
    isOpen,
    dropdownRef,
    toggleDropdown,
    handleKeyDown,
    handleLogoutClick,
  } = useHeaderDropdownLogic({ onLogout });

  // Logic Core Processors - Transform and validate user data
  // NO FALLBACK: These throw errors if data is invalid
  const initials = processUserInitials({
    firstName: user.firstName,
    lastName: user.lastName,
  });

  const displayName = processUserDisplayName({
    firstName: user.firstName,
    lastName: user.lastName,
    showFull: shouldShowFullName({
      firstName: user.firstName,
      lastName: user.lastName,
      isMobile: false, // TODO: Could be enhanced with viewport detection
    }),
  });

  const photoUrl = processProfilePhotoUrl({
    photoUrl: user.profilePhoto,
  });

  // Logic Core Rules - Boolean predicates
  const showPhoto = hasProfilePhoto({ photoUrl });

  // Component now ONLY handles visual presentation
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
        {showPhoto ? (
          <img
            src={photoUrl}
            alt={displayName}
            className="user-avatar"
          />
        ) : (
          <div className="user-avatar-placeholder">
            {initials}
          </div>
        )}

        {/* User Name + Dropdown Arrow */}
        <span className="user-name-wrapper">
          {displayName}
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
