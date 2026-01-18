/**
 * DaySelectorPills.jsx
 *
 * Day selection pills for schedule preferences.
 * Supports both interactive (editor) and read-only (public) modes.
 *
 * Uses 0-indexed days (0=Sunday, 1=Monday, ..., 6=Saturday) internally.
 */

import React from 'react';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function DaySelectorPills({
  selectedDays = [],
  onChange,
  readOnly = false,
  className = ''
}) {
  const handleDayClick = (dayIndex) => {
    if (readOnly || !onChange) return;
    onChange(dayIndex);
  };

  return (
    <div className={`day-selector-pills ${className}`}>
      {DAY_LABELS.map((label, index) => {
        const isSelected = selectedDays.includes(index);

        return (
          <button
            key={index}
            type="button"
            className={`day-pill ${isSelected ? 'day-pill--selected' : ''} ${readOnly ? 'day-pill--readonly' : ''}`}
            onClick={() => handleDayClick(index)}
            disabled={readOnly}
            aria-pressed={isSelected}
            aria-label={`${DAY_LABELS[index]} ${isSelected ? 'selected' : 'not selected'}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
