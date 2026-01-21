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
  transportationTypes = [], // Now an array for multi-select
  transportationOptions = [],
  onTransportToggle, // New handler for toggle behavior
  readOnly = false
}) {
  console.log('[TransportCard] Rendered with transportationTypes:', transportationTypes, 'onTransportToggle:', typeof onTransportToggle);
  if (readOnly) {
    // Filter to only selected transport options
    const selectedOptions = transportationOptions.filter(opt =>
      opt.value && transportationTypes.includes(opt.value)
    );
    if (selectedOptions.length === 0) return null;

    return (
      <ProfileCard title="Transport">
        <div className="public-schedule-section">
          <p className="public-schedule-label">How I Get to NYC</p>
          <div className="public-transport-badges">
            {selectedOptions.map(option => {
              const TransportIcon = TRANSPORT_ICONS[option.value] || Car;
              return (
                <div key={option.value} className="public-transport-badge">
                  <TransportIcon size={20} />
                  <span>{option.label}</span>
                </div>
              );
            })}
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
        <p className="profile-form-hint">Select all that apply</p>
        <div className="transport-icon-selector">
          {transportationOptions
            .filter(option => option.value) // Exclude empty placeholder option
            .map(option => {
              const IconComponent = TRANSPORT_ICONS[option.value] || Compass;
              const isSelected = transportationTypes.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`transport-icon-btn ${isSelected ? 'transport-icon-btn--selected' : ''}`}
                  onClick={() => {
                    console.log('[TransportCard] Button clicked for:', option.value);
                    onTransportToggle(option.value);
                  }}
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
