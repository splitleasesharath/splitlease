/**
 * TrustVerificationCard.jsx
 *
 * Trust & Verification section with status indicators and action buttons.
 * Shows email, phone, gov ID, and LinkedIn verification status.
 */

import React from 'react';
import ProfileCard from '../shared/ProfileCard.jsx';
import { Mail, Phone, ShieldCheck, Linkedin, CheckCircle } from 'lucide-react';

const VERIFICATION_ITEMS = [
  {
    key: 'email',
    title: 'Email Address',
    icon: Mail,
    verifyLabel: 'Verify',
    editLabel: null
  },
  {
    key: 'phone',
    title: 'Phone Number',
    icon: Phone,
    verifyLabel: 'Verify',
    editLabel: 'Edit'
  },
  {
    key: 'govId',
    title: 'Government ID',
    icon: ShieldCheck,
    verifyLabel: 'Verify',
    editLabel: null
  },
  {
    key: 'linkedin',
    title: 'LinkedIn',
    icon: Linkedin,
    verifyLabel: 'Connect',
    editLabel: null
  }
];

export default function TrustVerificationCard({
  verifications = {},
  emailAddress = '',
  phoneNumber = '',
  onVerifyEmail,
  onVerifyPhone,
  onVerifyGovId,
  onConnectLinkedIn,
  onEditPhone,
  readOnly = false,
  isVerifyingEmail = false
}) {
  // Map display values for items that show user data
  const displayValues = {
    email: emailAddress,
    phone: phoneNumber
  };
  // Map handlers
  const handlers = {
    email: onVerifyEmail,
    phone: onVerifyPhone,
    govId: onVerifyGovId,
    linkedin: onConnectLinkedIn
  };

  if (readOnly) {
    // In public view, just show verified items as a simple list
    const verifiedItems = VERIFICATION_ITEMS.filter(item => verifications[item.key]);

    return (
      <ProfileCard title="Trust & Verification">
        {verifiedItems.length > 0 ? (
          <div className="verification-list">
            {verifiedItems.map(item => (
              <div key={item.key} className="verification-item">
                <div className="verification-item-left">
                  <div className="verification-icon-container">
                    <item.icon size={24} />
                  </div>
                  <div className="verification-info">
                    <span className="verification-title">{item.title}</span>
                    <span className="verification-status verification-status--verified">
                      <CheckCircle size={14} />
                      Verified
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--sl-text-tertiary)', fontSize: '14px' }}>
            No verifications completed yet
          </p>
        )}
      </ProfileCard>
    );
  }

  return (
    <ProfileCard title="Trust & Verification">
      <div className="verification-list">
        {VERIFICATION_ITEMS.map(item => {
          const isVerified = verifications[item.key];
          const IconComponent = item.icon;
          const handleVerify = handlers[item.key];

          return (
            <div key={item.key} className="verification-item">
              <div className="verification-item-left">
                <div className="verification-icon-container">
                  <IconComponent size={24} />
                </div>
                <div className="verification-info">
                  <span className="verification-title">{item.title}</span>
                  {/* Show the actual value (email/phone) if available */}
                  {displayValues[item.key] && (
                    <span className="verification-value">
                      {displayValues[item.key]}
                    </span>
                  )}
                  {isVerified ? (
                    <span className="verification-status verification-status--verified">
                      <CheckCircle size={14} />
                      Verified
                    </span>
                  ) : (
                    <span className="verification-status verification-status--unverified">
                      Not verified
                    </span>
                  )}
                </div>
              </div>

              <div className="verification-item-right">
                {/* Edit button for phone (if verified) */}
                {item.key === 'phone' && isVerified && onEditPhone && (
                  <button
                    type="button"
                    className="verification-btn verification-btn--secondary"
                    onClick={onEditPhone}
                  >
                    Edit
                  </button>
                )}

                {/* Verify/Connect button (if not verified) */}
                {!isVerified && handleVerify && (
                  <button
                    type="button"
                    className="verification-btn"
                    onClick={handleVerify}
                    disabled={item.key === 'email' && isVerifyingEmail}
                  >
                    {item.key === 'email' && isVerifyingEmail ? 'Sending...' : item.verifyLabel}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ProfileCard>
  );
}
