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
        </div>
      </div>

      {/* Action Icons */}
      <div className="thread-header__actions">
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
      </div>
    </div>
  );
}
