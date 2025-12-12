/**
 * ScheduleCommuteCard.jsx
 *
 * Schedule preferences and transportation method.
 * Shows day selector pills and transportation dropdown.
 */

import React from 'react';
import ProfileCard from '../shared/ProfileCard.jsx';
import DaySelectorPills from '../shared/DaySelectorPills.jsx';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ScheduleCommuteCard({
  selectedDays = [],
  transportationType,
  transportationOptions = [],
  onDayToggle,
  onFieldChange,
  readOnly = false
}) {
  // Get selected day names for display
  const selectedDayNames = selectedDays
    .sort((a, b) => a - b)
    .map(idx => DAY_NAMES[idx])
    .join(', ');

  if (readOnly) {
    return (
      <ProfileCard title="Schedule & Commute">
        <div className="public-profile-info-row">
          <span className="public-profile-label">Preferred Days:</span>
          <span className="public-profile-value">
            {selectedDayNames || 'Not specified'}
          </span>
        </div>
        {transportationType && (
          <div className="public-profile-info-row">
            <span className="public-profile-label">Transportation:</span>
            <span className="public-profile-value">
              {transportationOptions.find(opt => opt.value === transportationType)?.label || transportationType}
            </span>
          </div>
        )}
      </ProfileCard>
    );
  }

  return (
    <ProfileCard title="Schedule & Commute">
      <div className="profile-form-group">
        <label className="profile-form-label">
          Which days do you typically need a place?
        </label>
        <DaySelectorPills
          selectedDays={selectedDays}
          onChange={onDayToggle}
          readOnly={false}
        />
      </div>

      <div className="profile-form-group">
        <label className="profile-form-label" htmlFor="transportationType">
          How will you commute?
        </label>
        <select
          id="transportationType"
          className="profile-form-select"
          value={transportationType}
          onChange={(e) => onFieldChange('transportationType', e.target.value)}
        >
          {transportationOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </ProfileCard>
  );
}
