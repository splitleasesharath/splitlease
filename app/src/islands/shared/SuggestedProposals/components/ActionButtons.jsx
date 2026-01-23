/**
 * ActionButtons
 *
 * Primary actions for suggested proposals:
 * - "I'm Interested" - Accept the suggestion
 * - "Not Interested" - Dismiss the suggestion (opens feedback modal)
 *
 * Icons: All icons from Feather Icons (https://feathericons.com)
 * - check: I'm Interested button
 * - x: Not Interested button
 */

/**
 * @param {Object} props
 * @param {function} props.onInterested - Handler for interested action
 * @param {function} props.onRemove - Handler for not interested action (opens modal)
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
            {/* Feather: check */}
            <svg
              className="sp-action-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
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
        {/* Feather: x */}
        <svg
          className="sp-action-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        Not Interested
      </button>
    </div>
  );
}
