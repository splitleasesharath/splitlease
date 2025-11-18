/**
 * Verification Section Component
 *
 * Displays email, phone, and identity verification status and actions
 * Based on Bubble.io workflows:
 * - Email verification: T:Verify Email DESKTOP is clicked (Workflow 35 - 5 steps)
 * - Phone verification: T:Verify Phone is clicked (Workflow 36 - 3 steps)
 * - Edit email/phone popups
 *
 * Verification fields (from validated schema):
 * - is email confirmed (boolean)
 * - Verify - Phone (boolean)
 */

export default function VerificationSection({
  userData,
  emailVerificationSent,
  phoneVerificationSent,
  onVerifyEmail,
  onVerifyPhone,
  onEditEmail,
  onEditPhone
}) {
  const isEmailConfirmed = userData?.['is email confirmed'] || false;
  const isPhoneVerified = userData?.['Verify - Phone'] || false;
  const email = userData?.email || userData?.['email as text'] || '';
  const phone = userData?.['Phone Number (as text)'] || '';

  return (
    <div className="verification-section">
      <h2 className="section-title">Verification</h2>

      {/* Email Verification */}
      <div className="verification-item">
        <div className="verification-icon">
          {isEmailConfirmed ? (
            <span className="icon-verified">✓</span>
          ) : (
            <span className="icon-unverified">!</span>
          )}
        </div>

        <div className="verification-content">
          <div className="verification-label">Email</div>
          <div className="verification-value">
            {email || 'No email set'}
            {isEmailConfirmed && <span className="badge-verified">Verified</span>}
          </div>
        </div>

        <div className="verification-actions">
          <button
            className="btn-link"
            onClick={onEditEmail}
            disabled={!email}
          >
            Edit
          </button>

          {!isEmailConfirmed && email && (
            <button
              className={`btn-secondary ${emailVerificationSent ? 'btn-disabled' : ''}`}
              onClick={onVerifyEmail}
              disabled={emailVerificationSent}
            >
              {emailVerificationSent ? 'Verification Sent' : 'Verify Email'}
            </button>
          )}
        </div>
      </div>

      {/* Phone Verification */}
      <div className="verification-item">
        <div className="verification-icon">
          {isPhoneVerified ? (
            <span className="icon-verified">✓</span>
          ) : (
            <span className="icon-unverified">!</span>
          )}
        </div>

        <div className="verification-content">
          <div className="verification-label">Phone Number</div>
          <div className="verification-value">
            {phone || 'No phone number set'}
            {isPhoneVerified && <span className="badge-verified">Verified</span>}
          </div>
        </div>

        <div className="verification-actions">
          <button
            className="btn-link"
            onClick={onEditPhone}
            disabled={!phone}
          >
            Edit
          </button>

          {!isPhoneVerified && phone && (
            <button
              className={`btn-secondary ${phoneVerificationSent ? 'btn-disabled' : ''}`}
              onClick={onVerifyPhone}
              disabled={phoneVerificationSent}
            >
              {phoneVerificationSent ? 'SMS Sent' : 'Verify Phone'}
            </button>
          )}
        </div>
      </div>

      {/* Identity Verification (placeholder for future implementation) */}
      <div className="verification-item">
        <div className="verification-icon">
          <span className="icon-unverified">!</span>
        </div>

        <div className="verification-content">
          <div className="verification-label">Identity Verification</div>
          <div className="verification-value">Not verified</div>
        </div>

        <div className="verification-actions">
          <button className="btn-secondary" disabled>
            Coming Soon
          </button>
        </div>
      </div>

      {/* Privacy Notice */}
      {(!isEmailConfirmed || !isPhoneVerified) && (
        <div className="verification-privacy-notice">
          <p className="privacy-text">
            <strong>Privacy Notice:</strong> Your verification status is only shared with hosts. Your actual email and phone number remain private.
          </p>
        </div>
      )}
    </div>
  );
}
