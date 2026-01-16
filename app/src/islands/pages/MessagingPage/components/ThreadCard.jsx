/**
 * ThreadCard Component
 *
 * Individual thread card in the sidebar.
 * Upwork-style design with rounded pill selected state.
 * Shows contact avatar, name, role badge, property, last message preview, and unread count.
 */

/**
 * Get initials from a name
 * @param {string} name - Full name
 * @returns {string} - Two letter initials
 */
function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function ThreadCard({ thread, isSelected, onClick }) {
  const initials = getInitials(thread.contact_name);

  // Determine role badge - if contact is a host or guest relative to current user
  // This is determined by the contact_role field from the API
  const contactRole = thread.contact_role; // 'host' or 'guest'

  return (
    <div
      className={`thread-card ${isSelected ? 'thread-card--selected' : ''} ${thread.unread_count > 0 ? 'thread-card--unread' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-selected={isSelected}
    >
      {/* Avatar */}
      <div className="thread-card__avatar-container">
        {thread.contact_avatar ? (
          <img
            src={thread.contact_avatar}
            alt={thread.contact_name || 'Contact'}
            className="thread-card__avatar"
            onError={(e) => {
              // Hide broken image and show placeholder
              e.target.style.display = 'none';
              e.target.nextElementSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div
          className="thread-card__avatar-placeholder"
          style={{ display: thread.contact_avatar ? 'none' : 'flex' }}
        >
          {initials}
        </div>
        {thread.is_online && (
          <span className="thread-card__online-dot" />
        )}
        {thread.is_with_splitbot && (
          <span className="thread-card__bot-badge" title="Split Bot">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5A2.5 2.5 0 0 0 7.5 18a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5a2.5 2.5 0 0 0 2.5 2.5a2.5 2.5 0 0 0 2.5-2.5a2.5 2.5 0 0 0-2.5-2.5z"/>
            </svg>
          </span>
        )}
      </div>

      {/* Content */}
      <div className="thread-card__content">
        {/* Header row: Name + Role Badge */}
        <div className="thread-card__name-row">
          <span className="thread-card__name">
            {thread.contact_name || 'Unknown Contact'}
          </span>
          {contactRole && (
            <span className={`thread-card__role-badge thread-card__role-badge--${contactRole}`}>
              {contactRole}
            </span>
          )}
        </div>

        {/* Property/Listing name */}
        {thread.property_name && (
          <span className="thread-card__property">
            <span className="thread-card__property-prefix">Split:</span> {thread.property_name}
          </span>
        )}

        {/* Message preview */}
        <p className="thread-card__preview">
          {thread.last_message_preview || 'No messages yet'}
        </p>
      </div>

      {/* Meta (time and unread count) */}
      <div className="thread-card__meta">
        <span className="thread-card__time">
          {thread.last_message_time || ''}
        </span>
        {thread.unread_count > 0 && (
          <span className="thread-card__unread" aria-label={`${thread.unread_count} unread messages`}>
            {thread.unread_count > 99 ? '99+' : thread.unread_count}
          </span>
        )}
      </div>
    </div>
  );
}
