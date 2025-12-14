/**
 * ThreadHeader Component
 *
 * Header above messages with contact info and status.
 * Shows avatar, name, property name, and optional status badge.
 * On mobile, shows a back button to return to the thread list.
 */

export default function ThreadHeader({ info, onBack, isMobile }) {
  if (!info) return null;

  // Determine status type for styling
  const getStatusType = (status) => {
    if (!status) return 'default';

    const statusLower = status.toLowerCase();
    if (statusLower.includes('declined') || statusLower.includes('cancelled') || statusLower.includes('rejected')) {
      return 'negative';
    }
    if (statusLower.includes('accepted') || statusLower.includes('approved') || statusLower.includes('confirmed')) {
      return 'positive';
    }
    if (statusLower.includes('pending') || statusLower.includes('waiting')) {
      return 'pending';
    }
    return 'default';
  };

  return (
    <div className="thread-header">
      {/* Back Button (Mobile only) */}
      {isMobile && onBack && (
        <button
          className="thread-header__back"
          onClick={onBack}
          aria-label="Back to messages"
        >
          <svg viewBox="0 0 24 24">
            <path d="M15 18L9 12L15 6" />
          </svg>
        </button>
      )}

      {/* Avatar */}
      <img
        src={info.contact_avatar || '/assets/images/default-avatar.svg'}
        alt={info.contact_name || 'Contact'}
        className="thread-header__avatar"
        onError={(e) => {
          e.target.src = '/assets/images/default-avatar.svg';
        }}
      />

      {/* Info */}
      <div className="thread-header__info">
        <h3 className="thread-header__name">
          {info.contact_name || 'Unknown Contact'}
        </h3>
        {info.property_name && (
          <span className="thread-header__property">{info.property_name}</span>
        )}
      </div>

      {/* Status Badge */}
      {info.status && (
        <span className={`thread-header__status thread-header__status--${getStatusType(info.status)}`}>
          {info.status}
        </span>
      )}
    </div>
  );
}
