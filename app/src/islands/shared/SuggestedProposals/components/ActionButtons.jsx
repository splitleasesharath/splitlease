/**
 * ActionButtons
 *
 * Primary actions for suggested proposals:
 * - "I'm Interested" - Accept the suggestion
 * - "Remove" - Dismiss the suggestion
 */

/**
 * @param {Object} props
 * @param {function} props.onInterested - Handler for interested action
 * @param {function} props.onRemove - Handler for remove action
 * @param {boolean} props.isProcessing - Whether an action is in progress
 */
export default function ActionButtons({
  onInterested,
  onRemove,
  isProcessing = false
}) {
  return (
    <div className="sp-actions">
      <button
        className="sp-action-btn sp-action-btn--primary"
        onClick={onInterested}
        disabled={isProcessing}
        type="button"
      >
        {isProcessing ? (
          <span className="sp-action-spinner" />
        ) : (
          <>
            <svg
              className="sp-action-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
            I'm Interested
          </>
        )}
      </button>

      <button
        className="sp-action-btn sp-action-btn--secondary"
        onClick={onRemove}
        disabled={isProcessing}
        type="button"
      >
        <svg
          className="sp-action-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
        Remove
      </button>
    </div>
  );
}
