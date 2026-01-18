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
        <label className="profile-form-label">
          How do you get to your Split Lease?
        </label>
        <div className="transport-icon-selector">
          {transportationOptions
            .filter(option => option.value) // Exclude empty placeholder option
            .map(option => {
              const IconComponent = TRANSPORT_ICONS[option.value] || Compass;
              const isSelected = transportationType === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`transport-icon-btn ${isSelected ? 'transport-icon-btn--selected' : ''}`}
                  onClick={() => onFieldChange('transportationType', option.value)}
                  title={option.label}
                >
                  <IconComponent size={24} />
                  <span className="transport-icon-label">{option.label}</span>
                </button>
              );
            })}
        </div>
      </div>
    </ProfileCard>
  );
}
