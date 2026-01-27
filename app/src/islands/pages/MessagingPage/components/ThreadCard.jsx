/**
 * ThreadCard Component
 *
 * Individual thread card in the sidebar (Upwork style).
 * Shows contact avatar with online indicator, name with role badge,
 * property name, last message preview, timestamp, and unread count.
 *
 * Design:
 * - Left: Avatar (with initials fallback, online dot)
 * - Middle: Name + Badge, Property name, Message preview
 * - Right: Timestamp, Unread badge
 * - Selected state: Full purple pill background (not left border)
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
  const contactRole = thread.contact_role; // 'host' or 'guest'

  // Format message preview with "You:" prefix if sent by current user
  const messagePreview = thread.last_message_is_mine
    ? `You: ${thread.last_message_preview || ''}`
    : thread.last_message_preview || 'No messages yet';

  // Build accessible label for screen readers
  const ariaLabel = `Conversation with ${thread.contact_name || 'Unknown Contact'}${thread.property_name ? `, about ${thread.property_name}` : ''}${thread.unread_count > 0 ? `, ${thread.unread_count} unread messages` : ''}`;

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
      aria-label={ariaLabel}
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
        {/* Online indicator dot - bottom right of avatar */}
        {thread.is_online && (
          <span className="thread-card__online-dot" />
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
            {thread.property_name}
          </span>
        )}

        {/* Message preview */}
        <p className="thread-card__preview">
          {messagePreview}
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
