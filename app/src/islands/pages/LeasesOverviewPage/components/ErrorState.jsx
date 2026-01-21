/**
 * ErrorState - Shown when loading fails
 */

export default function ErrorState({ message, onRetry }) {
  return (
    <div className="error-state">
      <svg
        className="error-state__icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <h3 className="error-state__title">Something went wrong</h3>
      <p className="error-state__message">{message}</p>
      {onRetry && (
        <button className="error-state__btn" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
}
