/**
 * TransportCard.jsx
 *
 * Transportation method selection card with icon buttons.
 * Split from ScheduleCommuteCard for better separation of concerns.
 */

import React from 'react';
import { Car, Train, Bike, Footprints, Compass } from 'lucide-react';
import ProfileCard from '../shared/ProfileCard.jsx';

// Icon mapping for transportation types
const TRANSPORT_ICONS = {
  car: Car,
  public_transit: Train,
  bicycle: Bike,
  walking: Footprints,
  rideshare: Car,
  other: Compass
};

export default function TransportCard({
  transportationType,
  transportationOptions = [],
  onFieldChange,
  readOnly = false
}) {
  if (readOnly) {
    const transportOption = transportationOptions.find(opt => opt.value === transportationType);
    if (!transportationType || !transportOption) return null;

    const TransportIcon = TRANSPORT_ICONS[transportationType] || Car;

    return (
      <ProfileCard title="Transport">
        <div className="public-schedule-section">
          <p className="public-schedule-label">How I Get to NYC</p>
          <div className="public-transport-badge">
            <TransportIcon size={20} />
            <span>{transportOption.label}</span>
          </div>
        </div>
      </ProfileCard>
    );
  }

  return (
    <ProfileCard title="Transport">
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
