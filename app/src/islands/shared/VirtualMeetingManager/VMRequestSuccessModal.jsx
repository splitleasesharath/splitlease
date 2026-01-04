/**
 * VMRequestSuccessModal.jsx
 *
 * Success popup shown after a virtual meeting is requested.
 * Includes a referral invite button that opens the full ReferralModal.
 */

import React, { useState } from 'react';
import ReferralModal from '../../pages/AccountProfilePage/components/ReferralModal.jsx';

// Checkmark circle icon
function CheckCircleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  );
}

// Gift icon for referral
function GiftIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 12 20 22 4 22 4 12"></polyline>
      <rect x="2" y="7" width="20" height="5"></rect>
      <line x1="12" y1="22" x2="12" y2="7"></line>
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
    </svg>
  );
}

// Close icon
function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}

export default function VMRequestSuccessModal({
  isOpen,
  onClose,
  hostName = 'the host',
  referralCode = 'user',
  referrerName = '',
  userType = 'guest'
}) {
  const [showReferralModal, setShowReferralModal] = useState(false);

  const handleInviteClick = () => {
    setShowReferralModal(true);
  };

  const handleReferralClose = () => {
    setShowReferralModal(false);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  // Show ReferralModal instead when invite is clicked
  if (showReferralModal) {
    return (
      <ReferralModal
        isOpen={true}
        onClose={handleReferralClose}
        referralCode={referralCode}
        userType={userType}
        referrerName={referrerName}
      />
    );
  }

  return (
    <div className="vm-success-modal-overlay" onClick={handleOverlayClick}>
      <div className="vm-success-modal">
        {/* Close button */}
        <button className="vm-success-modal-close" onClick={onClose}>
          <CloseIcon />
        </button>

        {/* Success content */}
        <div className="vm-success-modal-content">
          <div className="vm-success-modal-icon">
            <CheckCircleIcon />
          </div>

          <h2 className="vm-success-modal-title">Meeting Request Sent!</h2>

          <p className="vm-success-modal-message">
            Your virtual meeting request has been sent to {hostName}.
            They'll review your proposed times and get back to you soon.
          </p>

          <button className="vm-success-modal-btn" onClick={onClose}>
            Got it
          </button>
        </div>

        {/* Referral section */}
        <div className="vm-success-modal-referral">
          <div className="vm-success-modal-referral-icon">
            <GiftIcon />
          </div>
          <div className="vm-success-modal-referral-content">
            <strong>Give $50, Get $50</strong>
            <span>Share Split Lease with friends and earn rewards</span>
          </div>
          <button
            className="vm-success-modal-referral-btn"
            onClick={handleInviteClick}
          >
            Invite Friends
          </button>
        </div>
      </div>
    </div>
  );
}
