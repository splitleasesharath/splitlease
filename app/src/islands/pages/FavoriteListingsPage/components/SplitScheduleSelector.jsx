/**
 * SplitScheduleSelector Component
 * Weekly calendar selector matching Bubble.io design
 * Allows users to select check-in/check-out days with visual calendar
 */

import { useState, useEffect } from 'react';
import './SplitScheduleSelector.css';

const SplitScheduleSelector = ({
  onScheduleChange,
  initialCheckIn,
  initialCheckOut
}) => {
  const daysLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const daysFullNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const [selectedDays, setSelectedDays] = useState([]);
  const [checkInDate, setCheckInDate] = useState(null);
  const [checkOutDate, setCheckOutDate] = useState(null);

  // Initialize with default dates (Monday to Thursday of next week)
  useEffect(() => {
    if (initialCheckIn && initialCheckOut) {
      const checkIn = new Date(initialCheckIn);
      const checkOut = new Date(initialCheckOut);
      setCheckInDate(checkIn);
      setCheckOutDate(checkOut);
      calculateSelectedDays(checkIn, checkOut);
    } else {
      // Default: Next Monday to Thursday
      const today = new Date();
      const nextMonday = new Date(today);
      nextMonday.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7) || 7);

      const nextThursday = new Date(nextMonday);
      nextThursday.setDate(nextMonday.getDate() + 3);

      setCheckInDate(nextMonday);
      setCheckOutDate(nextThursday);
      calculateSelectedDays(nextMonday, nextThursday);
    }
  }, [initialCheckIn, initialCheckOut]);

  const calculateSelectedDays = (checkIn, checkOut) => {
    const days = [];
    const current = new Date(checkIn);

    while (current < checkOut) {
      days.push(current.getDay());
      current.setDate(current.getDate() + 1);
    }

    // Remove duplicates
    const uniqueDays = Array.from(new Set(days)).sort((a, b) => a - b);
    setSelectedDays(uniqueDays);

    // Calculate nights
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    // Notify parent
    onScheduleChange({
      checkIn: checkIn.toISOString().split('T')[0],
      checkOut: checkOut.toISOString().split('T')[0],
      nights,
      daysOfWeek: uniqueDays
    });
  };

  const handleDayClick = (dayIndex) => {
    // Toggle day selection
    let newSelectedDays;

    if (selectedDays.includes(dayIndex)) {
      newSelectedDays = selectedDays.filter(d => d !== dayIndex);
    } else {
      newSelectedDays = [...selectedDays, dayIndex].sort((a, b) => a - b);
    }

    setSelectedDays(newSelectedDays);

    // Calculate new check-in and check-out dates based on selected days
    if (newSelectedDays.length > 0) {
      const today = new Date();
      const firstDay = newSelectedDays[0];
      const lastDay = newSelectedDays[newSelectedDays.length - 1];

      // Find next occurrence of first selected day
      const daysUntilFirst = (firstDay + 7 - today.getDay()) % 7 || 7;
      const newCheckIn = new Date(today);
      newCheckIn.setDate(today.getDate() + daysUntilFirst);

      // Calculate check-out (day after last selected day)
      const daysDiff = lastDay >= firstDay ? lastDay - firstDay : (7 - firstDay) + lastDay;
      const newCheckOut = new Date(newCheckIn);
      newCheckOut.setDate(newCheckIn.getDate() + daysDiff + 1);

      setCheckInDate(newCheckIn);
      setCheckOutDate(newCheckOut);

      const nights = Math.ceil((newCheckOut.getTime() - newCheckIn.getTime()) / (1000 * 60 * 60 * 24));

      onScheduleChange({
        checkIn: newCheckIn.toISOString().split('T')[0],
        checkOut: newCheckOut.toISOString().split('T')[0],
        nights,
        daysOfWeek: newSelectedDays
      });
    }
  };

  const formatDateDisplay = (date) => {
    if (!date) return '';
    const dayName = daysFullNames[date.getDay()];
    return dayName;
  };

  return (
    <div className="split-schedule-selector">
      <div className="schedule-header">
        <h3 className="schedule-title">Select Split Schedule</h3>
      </div>

      {/* Weekly Calendar */}
      <div className="weekly-calendar">
        <div className="calendar-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </div>

        <div className="days-selector">
          {daysLabels.map((day, index) => (
            <button
              key={index}
              className={`day-button ${selectedDays.includes(index) ? 'selected' : ''}`}
              onClick={() => handleDayClick(index)}
              title={daysFullNames[index]}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* Check-In / Check-Out Display */}
      <div className="schedule-dates">
        <div className="date-display">
          <span className="date-label">Check-In:</span>
          <span className="date-value">{formatDateDisplay(checkInDate)}</span>
        </div>
        <div className="date-display">
          <span className="date-label">Check-Out:</span>
          <span className="date-value">{formatDateDisplay(checkOutDate)}</span>
        </div>
      </div>
    </div>
  );
};

export default SplitScheduleSelector;
