/**
 * ThreadCard Component
 *
 * Individual thread card in the sidebar.
 * Shows contact avatar, name, property, last message preview, and unread count.
 */

export default function ThreadCard({ thread, isSelected, onClick }) {
  // Format time display (e.g., "2:30 PM" or "Yesterday")
  const formatTime = (timestamp) => {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Today - show time
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      // Within a week - show day name
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      // Older - show date
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

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
        <img
          src={thread.contact_avatar || '/assets/images/default-avatar.svg'}
          alt={thread.contact_name || 'Contact'}
          className="thread-card__avatar"
          onError={(e) => {
            e.target.src = '/assets/images/default-avatar.svg';
          }}
        />
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
        <span className="thread-card__name">
          {thread.contact_name || 'Unknown Contact'}
        </span>
        {thread.property_name && (
          <span className="thread-card__property">{thread.property_name}</span>
        )}
        <p className="thread-card__preview">
          {thread.last_message_preview || 'No messages yet'}
        </p>
      </div>

      {/* Meta (time and unread count) */}
      <div className="thread-card__meta">
        <span className="thread-card__time">
          {formatTime(thread.last_message_time)}
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
