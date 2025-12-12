/**
 * ProfileStrengthMeter.jsx
 *
 * Visual progress bar showing profile completion percentage.
 * Only shown in editor view.
 */

import React from 'react';

export default function ProfileStrengthMeter({ percentage = 0 }) {
  // Ensure percentage is within bounds
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  return (
    <div className="profile-strength-section">
      <div className="profile-strength-label">Profile Strength</div>
      <div className="profile-strength-bar">
        <div className="profile-strength-track">
          <div
            className="profile-strength-fill"
            style={{ width: `${clampedPercentage}%` }}
          />
        </div>
        <span className="profile-strength-percentage">{clampedPercentage}%</span>
      </div>
    </div>
  );
}
