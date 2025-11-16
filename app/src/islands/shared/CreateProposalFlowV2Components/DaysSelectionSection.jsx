/**
 * DaysSelectionSection - Adjust weekly schedule selection
 */

import { useState, useEffect } from 'react';

export default function DaysSelectionSection({ data, updateData, listing }) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmCheckIn, setConfirmCheckIn] = useState(false);
  const [confirmCheckOut, setConfirmCheckOut] = useState(false);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayAbbrev = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  useEffect(() => {
    // Update check-in and check-out days when days selection changes
    if (data.daysSelected && data.daysSelected.length > 0) {
      const sortedDays = [...data.daysSelected].sort((a, b) => {
        return days.indexOf(a) - days.indexOf(b);
      });
      updateData('checkInDay', sortedDays[0]);
      updateData('checkOutDay', sortedDays[sortedDays.length - 1]);
    }
  }, [data.daysSelected]);

  const toggleDay = (day) => {
    const currentDays = data.daysSelected || [];
    let newDays;

    if (currentDays.includes(day)) {
      newDays = currentDays.filter(d => d !== day);
    } else {
      newDays = [...currentDays, day];
    }

    updateData('daysSelected', newDays);

    // Show confirmation checkboxes if days changed
    if (newDays.length > 0) {
      setShowConfirmation(true);
      setConfirmCheckIn(false);
      setConfirmCheckOut(false);
    } else {
      setShowConfirmation(false);
    }
  };

  const nightsCount = data.daysSelected?.length || 0;
  const daysCount = nightsCount > 0 ? nightsCount + 1 : 0;

  return (
    <div className="section days-selection-section">
      <h3 className="section-title">
        Please confirm your typical weekly schedule
        <span className="helper-icon" title="Select the days you plan to use the space each week">
          ❓
        </span>
      </h3>

      <div className="day-selector">
        <div className="calendar-icon">📅</div>
        {days.map((day, index) => (
          <button
            key={day}
            className={`day-button ${data.daysSelected?.includes(day) ? 'selected' : ''}`}
            onClick={() => toggleDay(day)}
          >
            {dayAbbrev[index]}
          </button>
        ))}
      </div>

      <div className="selection-summary">
        <p><strong>{daysCount} days, {nightsCount} nights Selected</strong></p>
        {data.checkInDay && <p>Check-in day is {data.checkInDay}</p>}
        {data.checkOutDay && <p>Check-out day is {data.checkOutDay}</p>}
      </div>

      {showConfirmation && (
        <div className="confirmation-checkboxes">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={confirmCheckIn}
              onChange={(e) => setConfirmCheckIn(e.target.checked)}
            />
            <span style={{ marginLeft: '8px' }}>
              *{daysCount} days, {nightsCount} nights selected
            </span>
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={confirmCheckOut}
              onChange={(e) => setConfirmCheckOut(e.target.checked)}
            />
            <span style={{ marginLeft: '8px' }}>
              *Check out day is {data.checkOutDay}
            </span>
          </label>
        </div>
      )}

      <div className="pricing-display">
        <p><strong>Price per Night:</strong> ${data.pricePerNight?.toFixed(2) || '0.00'}</p>
      </div>
    </div>
  );
}
