/**
 * RequirementsCard.jsx
 *
 * Why Split Lease / Guest requirements section.
 * Includes "Need for Space" and "Special Needs" fields.
 */

import React from 'react';
import ProfileCard from '../shared/ProfileCard.jsx';

export default function RequirementsCard({
  needForSpace,
  specialNeeds,
  onFieldChange,
  readOnly = false
}) {
  if (readOnly) {
    return (
      <ProfileCard title="Requirements">
        <div className="public-profile-info-row">
          <span className="public-profile-label">Need for Space:</span>
          <span className="public-profile-value">
            {needForSpace || 'Not specified'}
          </span>
        </div>
        {specialNeeds && (
          <div className="public-profile-info-row">
            <span className="public-profile-label">Special Needs:</span>
            <span className="public-profile-value">{specialNeeds}</span>
          </div>
        )}
      </ProfileCard>
    );
  }

  return (
    <ProfileCard title="Why Split Lease?">
      <div className="profile-form-group">
        <label className="profile-form-label" htmlFor="needForSpace">
          Why do you need the space?
        </label>
        <textarea
          id="needForSpace"
          className="profile-form-textarea"
          value={needForSpace}
          onChange={(e) => onFieldChange('needForSpace', e.target.value)}
          placeholder="e.g., I work in the city 3 days a week and need a place to stay..."
          rows={3}
        />
      </div>

      <div className="profile-form-group">
        <label className="profile-form-label" htmlFor="specialNeeds">
          Any special requirements?
        </label>
        <textarea
          id="specialNeeds"
          className="profile-form-textarea"
          value={specialNeeds}
          onChange={(e) => onFieldChange('specialNeeds', e.target.value)}
          placeholder="e.g., I need a quiet workspace, have mild allergies to cats..."
          rows={3}
        />
      </div>
    </ProfileCard>
  );
}
