/**
 * ErrorState Component
 * Displays error information and retry option
 */

export default function ErrorState({ error, onRetry }) {
  return (
    <div className="error-state">
      <div className="error-icon">&#9888;&#65039;</div>
      <h2>Something went wrong</h2>
      <p className="error-message">
        {error?.message || 'An unexpected error occurred'}
      </p>
      {onRetry && (
        <button onClick={onRetry} className="retry-button">
          Try Again
        </button>
      )}
    </div>
  );
}
