/**
 * AccessDenied Component
 *
 * Displays when the user doesn't have permission to view the house manual.
 *
 * @param {Object} props
 * @param {string} props.reason - Reason for access denial
 * @param {boolean} props.isAuthenticated - Whether user is logged in
 */
const AccessDenied = ({ reason, isAuthenticated }) => {
  return (
    <div className="vrhm-access-denied">
      <div className="vrhm-access-denied__icon" aria-hidden="true">
        &#128274;
      </div>
      <h2 className="vrhm-access-denied__title">Access Denied</h2>
      <p className="vrhm-access-denied__message">{reason}</p>

      {!isAuthenticated && (
        <div>
          <a href="/login" className="vrhm-button-primary">
            Log In to Continue
          </a>
          <p className="vrhm-access-denied__login-hint">
            You must be logged in as the guest to view this house manual.
          </p>
        </div>
      )}

      {isAuthenticated && (
        <p className="vrhm-access-denied__login-hint">
          This house manual is only accessible to the assigned guest.
        </p>
      )}
    </div>
  );
};

export default AccessDenied;
