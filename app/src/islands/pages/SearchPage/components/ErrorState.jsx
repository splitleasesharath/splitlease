/**
 * ErrorState - Error message component
 */
export function ErrorState({ message, onRetry }) {
  return (
    <div className="error-message">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
      <h3>Unable to Load Listings</h3>
      <p>{message || 'Failed to load listings. Please try again.'}</p>
      {onRetry && (
        <button className="retry-btn" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
