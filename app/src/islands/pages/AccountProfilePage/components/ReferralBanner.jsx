/**
 * ReferralBanner.jsx
 *
 * Displays a referral program banner encouraging users to invite friends.
 * "Give $50, Get $50" - rewards unlock when invited friend completes first booking.
 */

import React from 'react';

// Gift icon SVG (matches Feather icons style)
function GiftIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
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

export default function ReferralBanner({ onInviteClick, userType = 'guest' }) {
  const handleClick = () => {
    if (onInviteClick) {
      onInviteClick();
    } else {
      // TODO(human): Implement referral invite flow
      // Default behavior - could open a modal, copy referral link, or navigate
      console.log('Invite friends clicked');
    }
  };

  const isHost = userType === 'host';
  const subtext = isHost
    ? 'When the referred host closes their first lease, the reward is unlocked'
    : 'When they complete their first booking, the reward is unlocked';

  return (
    <div className="referral-banner">
      <div className="referral-banner-left">
        <div className="referral-banner-icon">
          <GiftIcon />
        </div>
        <div className="referral-banner-text">
          <strong>Give $50, Get $50</strong>
          <span>{subtext}</span>
        </div>
      </div>
      <button className="referral-banner-btn" onClick={handleClick}>
        Invite Friends
      </button>
    </div>
  );
}
