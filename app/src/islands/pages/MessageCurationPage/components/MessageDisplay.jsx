/**
 * MessageDisplay - Display detailed message information
 *
 * Features:
 * - Guest info section with avatar and email
 * - Host info section with avatar and email
 * - Listing name display
 * - Originator indicator
 * - Message ID with copy-to-clipboard
 * - Message body in read-only textarea
 * - Forwarded status badge if applicable
 */

export default function MessageDisplay({
  message,
  thread,
  getUserDisplayName,
  formatDate,
  copyToClipboard,
}) {
  if (!message) {
    return null;
  }

  return (
    <div className="message-display">
      {/* Message ID */}
      <div className="message-display__field">
        <label className="message-display__label">Message ID</label>
        <div className="message-display__value message-display__value--id">
          <code>{message.id}</code>
          <button
            onClick={() => copyToClipboard(message.id)}
            className="message-display__copy-button"
            title="Copy to clipboard"
          >
            <CopyIcon />
          </button>
        </div>
      </div>

      {/* Sender Info */}
      <div className="message-display__field">
        <label className="message-display__label">Sender</label>
        <div className="message-display__value">
          <UserCard
            user={message.originator}
            senderType={message.senderType}
            getUserDisplayName={getUserDisplayName}
          />
        </div>
      </div>

      {/* Thread Participants */}
      {thread && (
        <div className="message-display__participants">
          <div className="message-display__participant">
            <label className="message-display__label">Guest</label>
            <UserCard
              user={thread.guest}
              senderType="guest"
              getUserDisplayName={getUserDisplayName}
              isOriginator={message.originatorUserId === thread.guestUserId}
            />
          </div>
          <div className="message-display__participant">
            <label className="message-display__label">Host</label>
            <UserCard
              user={thread.host}
              senderType="host"
              getUserDisplayName={getUserDisplayName}
              isOriginator={message.originatorUserId === thread.hostUserId}
            />
          </div>
        </div>
      )}

      {/* Listing */}
      {thread?.listing && (
        <div className="message-display__field">
          <label className="message-display__label">Listing</label>
          <div className="message-display__value">
            {thread.listing.name}
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="message-display__field">
        <label className="message-display__label">Sent At</label>
        <div className="message-display__value">
          {formatDate(message.createdAt)}
        </div>
      </div>

      {/* Status Badges */}
      <div className="message-display__badges">
        {message.isSplitBotWarning && (
          <span className="message-display__badge message-display__badge--warning">
            Split Bot Warning
          </span>
        )}
        {message.isForwarded && (
          <span className="message-display__badge message-display__badge--forwarded">
            Forwarded
          </span>
        )}
        <span className={`message-display__badge message-display__badge--sender message-display__badge--${message.senderType}`}>
          {message.senderType === 'guest' && 'From Guest'}
          {message.senderType === 'host' && 'From Host'}
          {message.senderType === 'splitbot' && 'From Split Bot'}
          {message.senderType === 'unknown' && 'Unknown Sender'}
        </span>
      </div>

      {/* Message Body */}
      <div className="message-display__field">
        <label className="message-display__label">Message Content</label>
        <textarea
          className="message-display__body"
          value={message.body || ''}
          readOnly
          rows={6}
        />
      </div>
    </div>
  );
}

/**
 * UserCard - Display user avatar and info
 */
function UserCard({ user, senderType, getUserDisplayName, isOriginator }) {
  if (!user) {
    return (
      <div className="user-card user-card--empty">
        <div className="user-card__avatar user-card__avatar--empty">
          ?
        </div>
        <div className="user-card__info">
          <span className="user-card__name">Unknown User</span>
        </div>
      </div>
    );
  }

  const initials = getInitials(user.firstName, user.lastName);

  return (
    <div className={`user-card user-card--${senderType} ${isOriginator ? 'user-card--originator' : ''}`}>
      <div className={`user-card__avatar user-card__avatar--${senderType}`}>
        {user.profilePhoto ? (
          <img src={user.profilePhoto} alt={getUserDisplayName(user)} />
        ) : (
          initials
        )}
      </div>
      <div className="user-card__info">
        <span className="user-card__name">
          {getUserDisplayName(user)}
          {isOriginator && <span className="user-card__originator-badge">Sender</span>}
        </span>
        <span className="user-card__email">{user.email}</span>
      </div>
    </div>
  );
}

/**
 * Get initials from first and last name
 */
function getInitials(firstName, lastName) {
  const first = (firstName || '').charAt(0).toUpperCase();
  const last = (lastName || '').charAt(0).toUpperCase();
  return first + last || '?';
}

// ===== ICONS =====

function CopyIcon() {
  return (
    <svg
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      width="16"
      height="16"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}
