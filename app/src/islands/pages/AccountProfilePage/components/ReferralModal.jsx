/**
 * ReferralModal.jsx
 *
 * Modal for the referral program allowing users to share their referral link
 * and view their referral stats.
 */

import React, { useState } from 'react';

// Send icon (Telegram-style)
function SendIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13"></line>
      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
  );
}

// Mail icon
function MailIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
      <polyline points="22,6 12,13 2,6"></polyline>
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

export default function ReferralModal({ isOpen, onClose, referralCode = 'yourname', stats = {} }) {
  const [copied, setCopied] = useState(false);

  const referralLink = `https://splitlease.com/ref/${referralCode}`;

  const {
    friendsReferred = 0,
    rewardsClaimed = 0,
    totalRewards = 0
  } = stats;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleTelegram = () => {
    const text = encodeURIComponent(`Get $50 off your first Split Lease booking! Use my referral link: ${referralLink}`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${text}`, '_blank');
  };

  const handleEmail = () => {
    const subject = encodeURIComponent('Get $50 off your first Split Lease booking!');
    const body = encodeURIComponent(`Hey!\n\nI've been using Split Lease and thought you might like it too. Use my referral link to get $50 off your first booking:\n\n${referralLink}\n\nWhen you complete your first booking, we both get $50!`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="referral-modal-overlay" onClick={handleOverlayClick}>
      <div className="referral-modal">
        <div className="referral-modal-header">
          <h2>Give $50, Get $50</h2>
          <button className="referral-modal-close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <p className="referral-modal-subtitle">
          Give a friend $50 toward their first Split Lease booking. When they complete their first booking, you'll get $50 too.
        </p>

        <div className="referral-share-section">
          <label>Your referral link</label>
          <div className="referral-share-link">
            <input type="text" value={referralLink} readOnly />
            <button onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="referral-share-actions">
          <button className="referral-secondary-btn" onClick={handleTelegram}>
            <SendIcon /> Telegram
          </button>
          <button className="referral-secondary-btn" onClick={handleEmail}>
            <MailIcon /> Email
          </button>
        </div>

        <div className="referral-rewards">
          <div className="referral-reward-item">
            <strong>{friendsReferred}</strong>
            <span>Friends referred</span>
          </div>
          <div className="referral-reward-item">
            <strong>${rewardsClaimed}</strong>
            <span>Rewards claimed</span>
          </div>
          <div className="referral-reward-item">
            <strong>${totalRewards}</strong>
            <span>Total rewards</span>
          </div>
        </div>

        <div className="referral-modal-footer">
          <a href="/policies#referral">View referral details</a>
          <a href="/policies#terms">Terms & Conditions</a>
        </div>
      </div>
    </div>
  );
}
