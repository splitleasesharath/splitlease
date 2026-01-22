/**
 * ErrorState - Error display for Quick Price page
 */

export default function ErrorState({ message, onRetry }) {
  return (
    <div className="quick-price__state quick-price__state--error">
      <svg
        className="quick-price__state-icon quick-price__state-icon--error"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        width="48"
        height="48"
      >
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <h3 className="quick-price__state-title">Something went wrong</h3>
      <p className="quick-price__state-message">{message}</p>
      {onRetry && (
        <button
          className="quick-price__state-btn"
          onClick={onRetry}
          type="button"
        >
          Try again
        </button>
      )}
    </div>
  );
}
