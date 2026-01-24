import LoggedInAvatar from '../../../shared/LoggedInAvatar/LoggedInAvatar.jsx';

/**
 * MobileFilterBar - Sticky filter button for mobile
 * Includes auth-aware elements: favorites link and LoggedInAvatar for logged-in users
 * Note: Map button moved to floating FAB at bottom of screen
 */
export default function MobileFilterBar({
  onFilterClick,
  isLoggedIn,
  currentUser,
  favoritesCount,
  onNavigate,
  onLogout,
  onOpenAuthModal,
  isHidden
}) {
  return (
    <div className={`mobile-filter-bar ${isHidden ? 'mobile-filter-bar--hidden' : ''}`}>
      <a href="/" className="mobile-logo-link" aria-label="Go to homepage">
        <img
          src="/assets/images/split-lease-purple-circle.png"
          alt="Split Lease Logo"
          className="mobile-logo-icon"
          width="28"
          height="28"
        />
      </a>
      <button className="filter-toggle-btn" onClick={onFilterClick}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
        </svg>
        <span>Filters</span>
      </button>

      {/* Mobile Header Actions - Auth-aware elements */}
      <div className="mobile-header-actions">
        {isLoggedIn && currentUser ? (
          <>
            {/* Favorites Heart with Count */}
            <a href="/favorite-listings" className="mobile-favorites-link" aria-label="My Favorite Listings">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="#5b21b6"
                stroke="none"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </a>

            {/* Logged In Avatar */}
            <LoggedInAvatar
              user={currentUser}
              currentPath="/search"
              onNavigate={onNavigate}
              onLogout={onLogout}
              size="small"
            />
          </>
        ) : (
          /* Sign In button for logged out users */
          <button
            className="mobile-signin-btn"
            onClick={onOpenAuthModal}
            aria-label="Sign In"
          >
            Sign In
          </button>
        )}
      </div>
    </div>
  );
}
