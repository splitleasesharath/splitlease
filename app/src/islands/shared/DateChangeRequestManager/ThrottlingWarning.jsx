/**
 * Throttling Warning Component
 * Displays rate limiting warnings when user approaches or hits request limits
 */

/**
 * @param {Object} props
 * @param {number} props.requestCount - Current number of requests
 * @param {number} props.limit - Maximum allowed requests
 * @param {boolean} props.isThrottled - Whether user is currently throttled
 */
export default function ThrottlingWarning({
  requestCount,
  limit,
  isThrottled,
}) {
  // Don't show anything if well under limit
  const warningThreshold = Math.floor(limit * 0.6); // 60% of limit
  if (requestCount < warningThreshold && !isThrottled) {
    return null;
  }

  // Calculate remaining requests
  const remainingRequests = limit - requestCount;

  // Blocked state
  if (isThrottled) {
    return (
      <div className="dcr-throttle-warning dcr-throttle-blocked">
        <div className="dcr-throttle-icon">🚫</div>
        <div className="dcr-throttle-content">
          <strong>Request Limit Reached</strong>
          <p>
            You've made {requestCount} requests in the last 24 hours.
            Please wait before submitting more requests.
          </p>
        </div>
      </div>
    );
  }

  // Warning state (approaching limit)
  return (
    <div className="dcr-throttle-warning dcr-throttle-approaching">
      <div className="dcr-throttle-icon">⚠️</div>
      <div className="dcr-throttle-content">
        <strong>Approaching Request Limit</strong>
        <p>
          You have {remainingRequests} request{remainingRequests !== 1 ? 's' : ''} remaining today.
          ({requestCount}/{limit} used)
        </p>
      </div>
    </div>
  );
}
