/**
 * LoginSection - Authentication form for the simulation page
 *
 * Simple email/password login form that integrates with the existing auth system.
 * Handles authentication inline rather than redirecting to a separate login page.
 *
 * @param {Object} props
 * @param {string} props.email - Email input value
 * @param {string} props.password - Password input value
 * @param {string} props.error - Error message to display
 * @param {boolean} props.isLoading - Loading state
 * @param {Function} props.onEmailChange - Email input change handler
 * @param {Function} props.onPasswordChange - Password input change handler
 * @param {Function} props.onSubmit - Form submit handler
 */
export default function LoginSection({
  email,
  password,
  error,
  isLoading,
  onEmailChange,
  onPasswordChange,
  onSubmit
}) {
  return (
    <div className="gsim-login-section">
      <div className="gsim-login-card">
        <div className="gsim-login-header">
          <h2>Sign In to Continue</h2>
          <p>Please log in to access the guest simulation</p>
        </div>

        <form className="gsim-login-form" onSubmit={onSubmit}>
          {error && (
            <div className="gsim-login-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="gsim-input-group">
            <label htmlFor="login-email">Email</label>
            <input
              type="email"
              id="login-email"
              value={email}
              onChange={onEmailChange}
              placeholder="Enter your email"
              required
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          <div className="gsim-input-group">
            <label htmlFor="login-password">Password</label>
            <input
              type="password"
              id="login-password"
              value={password}
              onChange={onPasswordChange}
              placeholder="Enter your password"
              required
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="gsim-btn gsim-btn-primary"
            disabled={isLoading || !email || !password}
          >
            {isLoading ? (
              <>
                <span className="gsim-btn-spinner" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
