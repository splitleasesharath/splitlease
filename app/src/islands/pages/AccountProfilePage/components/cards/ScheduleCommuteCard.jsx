/**
 * ScheduleCommuteCard.jsx
 *
 * Schedule preferences and transportation method.
 * Shows day selector pills and transportation dropdown.
 *
 * Public View: Shows visual day pills and transport badge (per design).
 */

import React from 'react';
import { Car, Train, Bike, Footprints, Compass } from 'lucide-react';
import ProfileCard from '../shared/ProfileCard.jsx';
import DaySelectorPills from '../shared/DaySelectorPills.jsx';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_ABBREV = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Icon mapping for transportation types
const TRANSPORT_ICONS = {
  car: Car,
  public_transit: Train,
  bicycle: Bike,
  walking: Footprints,
  rideshare: Car,
  other: Compass
};

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
    const transportOption = transportationOptions.find(opt => opt.value === transportationType);
    const TransportIcon = TRANSPORT_ICONS[transportationType] || Car;

    return (
      <ProfileCard title="Schedule & Commute">
        {/* Day Pills Section */}
        {selectedDays.length > 0 && (
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
        )}

        {/* Transport Badge Section */}
        {transportationType && transportOption && (
          <div className="public-schedule-section">
            <p className="public-schedule-label">How I Get to NYC</p>
            <div className="public-transport-badge">
              <TransportIcon size={20} />
              <span>{transportOption.label}</span>
            </div>
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
