/**
 * ScheduleCard.jsx
 *
 * Schedule preferences card showing day selector pills.
 * Split from ScheduleCommuteCard for better separation of concerns.
 */

import React from 'react';
import ProfileCard from '../shared/ProfileCard.jsx';
import DaySelectorPills from '../shared/DaySelectorPills.jsx';

const DAY_ABBREV = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ScheduleCard({
  selectedDays = [],
  onDayToggle,
  readOnly = false
}) {
  if (readOnly) {
    if (selectedDays.length === 0) return null;

    return (
      <ProfileCard title="Schedule">
        <div className="public-schedule-section">
          <p className="public-schedule-label">Ideal Split Schedule</p>
          <div className="public-day-selector">
            {DAY_ABBREV.map((abbrev, idx) => (
              <div
                key={idx}
                className={`public-day-pill ${selectedDays.includes(idx) ? 'public-day-pill--active' : ''}`}
              >
                {abbrev}
              </div>
            ))}
          </div>
        </div>
      </ProfileCard>
    );
  }

  return (
    <ProfileCard title="Schedule">
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
    </ProfileCard>
  );
}
