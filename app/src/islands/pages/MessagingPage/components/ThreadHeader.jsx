/**
 * ThreadHeader Component
 *
 * Header above messages with contact info, status, and action icons.
 * Shows avatar, name, online status, and action buttons (video, phone, schedule, panel toggle, more).
 * On mobile, shows a back button to return to the thread list.
 */

export default function ThreadHeader({
  info,
  onBack,
  isMobile,
  showRightPanel,
  isRightPanelCollapsed,
  onToggleRightPanel,
  onAction
}) {
  if (!info) return null;

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

      {/* Left Section: Avatar + Info */}
      <div className="thread-header__left">
        {/* Avatar */}
        <img
          src={info.contact_avatar || '/assets/images/default-avatar.jpg'}
          alt={info.contact_name || 'Contact'}
          className="thread-header__avatar"
          onError={(e) => {
            e.target.src = '/assets/images/default-avatar.jpg';
          }}
        />

        {/* Info */}
        <div className="thread-header__info">
          <div className="thread-header__name-row">
            <h3 className="thread-header__name">
              {info.contact_name || 'Unknown Contact'}
            </h3>
            {info.contact_type && (
              <span className={`thread-header__badge thread-header__badge--${info.contact_type.toLowerCase()}`}>
                {info.contact_type}
              </span>
            )}
          </div>
          <span className="thread-header__status-text">
            <span className="thread-header__online-dot"></span>
            Online now
          </span>
        </div>
      </div>

      {/* Action Icons */}
      <div className="thread-header__actions">
        {/* Video Call */}
        <button
          className="thread-header__action-btn"
          onClick={() => onAction?.('video')}
          aria-label="Start video call"
          title="Video call"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        </button>

        {/* Phone Call */}
        <button
          className="thread-header__action-btn"
          onClick={() => onAction?.('phone')}
          aria-label="Start phone call"
          title="Phone call"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </button>

        {/* Schedule Meeting */}
        <button
          className="thread-header__action-btn"
          onClick={() => onAction?.('schedule')}
          aria-label="Schedule meeting"
          title="Schedule meeting"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </button>

        {/* Toggle Right Panel - Only on desktop */}
        {showRightPanel && (
          <button
            className={`thread-header__action-btn ${isRightPanelCollapsed ? '' : 'thread-header__action-btn--active'}`}
            onClick={onToggleRightPanel}
            aria-label={isRightPanelCollapsed ? 'Show details panel' : 'Hide details panel'}
            title={isRightPanelCollapsed ? 'Show details' : 'Hide details'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="15" y1="3" x2="15" y2="21" />
            </svg>
          </button>
        )}

        {/* More Options */}
        <button
          className="thread-header__action-btn"
          onClick={() => onAction?.('more')}
          aria-label="More options"
          title="More options"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
          </svg>
        </button>
      </div>
    </div>
  );
}
