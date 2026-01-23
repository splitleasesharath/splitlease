/**
 * DaySelector Component
 * Interactive day buttons for selecting reservation days
 */

import React from 'react';

/**
 * Convert day label to 0-based index for comparison
 */
function dayLabelToIndex(label) {
  const mapping = {
    'S': 0,    // Sunday
    'M': 1,    // Monday
    'T': 2,    // Tuesday
    'W': 3,    // Wednesday
    'Th': 4,   // Thursday
    'F': 5,    // Friday
    'Sa': 6,   // Saturday
  };
  return mapping[label] ?? -1;
}

export default function DaySelector({
  dayLabels,
  selectedDayIndices,
  onDayToggle,
  onSelectFullTime,
}) {
  return (
    <div className="form-group">
      <label>Reservation Days</label>
      <div className="days-selector">
        {dayLabels.map((dayLabel) => {
          const dayIndex = dayLabelToIndex(dayLabel);
          const isSelected = selectedDayIndices.includes(dayIndex);
          // Display label (show full label for Thu/Sat distinction)
          const displayLabel = dayLabel === 'Th' ? 'T' : dayLabel === 'Sa' ? 'S' : dayLabel;

          return (
            <button
              key={dayLabel}
              type="button"
              className={`day-btn ${isSelected ? 'selected' : ''}`}
              data-day={dayLabel}
              onClick={() => onDayToggle(dayLabel)}
              title={getDayFullName(dayLabel)}
            >
              {displayLabel}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="select-full-time"
        onClick={(e) => {
          e.preventDefault();
          onSelectFullTime();
        }}
      >
        Select Full Time
      </button>
    </div>
  );
}

/**
 * Get full day name from label
 */
function getDayFullName(label) {
  const names = {
    'S': 'Sunday',
    'M': 'Monday',
    'T': 'Tuesday',
    'W': 'Wednesday',
    'Th': 'Thursday',
    'F': 'Friday',
    'Sa': 'Saturday',
  };
  return names[label] || label;
}
