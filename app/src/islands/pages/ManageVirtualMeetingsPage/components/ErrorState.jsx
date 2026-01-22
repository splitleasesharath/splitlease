/**
 * ErrorState - Full page error display with retry option
 */

export default function ErrorState({ message, onRetry }) {
  return (
    <div className="manage-vm__error-state">
      <svg
        className="manage-vm__error-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <h3 className="manage-vm__error-title">Unable to load meetings</h3>
      <p className="manage-vm__error-message">{message}</p>
      {onRetry && (
        <button
          className="manage-vm__error-retry"
          onClick={onRetry}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Try Again
        </button>
      )}
    </div>
  );
}
