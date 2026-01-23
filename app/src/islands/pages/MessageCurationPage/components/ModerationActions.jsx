/**
 * ModerationActions - Moderation action buttons
 *
 * Features:
 * - Forward message button (purple)
 * - Delete message button (red)
 * - Delete conversation button (red, with warning styling)
 * - Loading states during operations
 */

export default function ModerationActions({
  hasSelectedMessage,
  hasSelectedThread,
  isMessageForwarded,
  isProcessing,
  onDeleteMessage,
  onDeleteThread,
  onForwardMessage,
}) {
  return (
    <div className="moderation-actions">
      <h3 className="moderation-actions__title">Moderation Actions</h3>

      {/* Forward Message */}
      <button
        onClick={onForwardMessage}
        disabled={!hasSelectedMessage || isProcessing || isMessageForwarded}
        className="moderation-actions__button moderation-actions__button--forward"
        title={isMessageForwarded ? 'Message already forwarded' : 'Forward to support email'}
      >
        <ForwardIcon />
        {isMessageForwarded ? 'Already Forwarded' : 'Forward Message'}
      </button>

      {/* Delete Message */}
      <button
        onClick={onDeleteMessage}
        disabled={!hasSelectedMessage || isProcessing}
        className="moderation-actions__button moderation-actions__button--delete"
      >
        <DeleteIcon />
        Delete Message
      </button>

      {/* Delete Thread (All Messages) */}
      <button
        onClick={onDeleteThread}
        disabled={!hasSelectedThread || isProcessing}
        className="moderation-actions__button moderation-actions__button--delete-all"
      >
        <DeleteAllIcon />
        Delete All Messages in Thread
      </button>

      {isProcessing && (
        <div className="moderation-actions__processing">
          <span className="moderation-actions__spinner" />
          Processing...
        </div>
      )}
    </div>
  );
}

// ===== ICONS =====

function ForwardIcon() {
  return (
    <svg
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      width="18"
      height="18"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      width="18"
      height="18"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

function DeleteAllIcon() {
  return (
    <svg
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      width="18"
      height="18"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}
