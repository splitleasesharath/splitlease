/**
 * ErrorState - Error message component
 */
export function ErrorState({ message, onRetry }) {
  return (
    <div className="error-message">
      <img
        src="/assets/images/filter-error-illustration.png"
        alt="Adjust filters illustration"
        style={{ width: '200px', height: 'auto', marginBottom: '16px' }}
      />
      <h3>Unable to Load Listings</h3>
      <p>{message || 'We had trouble loading listings. Please try refreshing the page or adjusting your filters.'}</p>
      {onRetry && (
        <button className="retry-btn" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
