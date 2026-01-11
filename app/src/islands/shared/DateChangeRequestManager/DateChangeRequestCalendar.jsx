/**
 * Date Change Request Calendar Component
 * Calendar UI showing lease dates with color coding for selection
 */

import { useState } from 'react';
import {
  generateCalendarDays,
  getPreviousMonth,
  getNextMonth,
  formatMonthYear,
  isPastDate,
  isSameDate,
  isDateInList,
  isDateInRange,
  getDayNames,
  getMonthNames,
} from './dateUtils.js';

/**
 * @param {Object} props
 * @param {(Date|string)[]} props.bookedDates - Array of currently booked dates
 * @param {Date|string} props.reservationStart - Lease start date
 * @param {Date|string} props.reservationEnd - Lease end date
 * @param {'adding' | 'removing' | 'swapping' | null} props.requestType - Current request type
 * @param {Date|null} props.dateToAdd - Selected date to add
 * @param {Date|null} props.dateToRemove - Selected date to remove
 * @param {Function} props.onDateSelect - Handler for date selection
 * @param {Object[]} [props.existingRequests=[]] - Existing pending requests
 * @param {boolean} [props.disabled=false] - Whether calendar is disabled
 */
export default function DateChangeRequestCalendar({
  bookedDates = [],
  reservationStart,
  reservationEnd,
  requestType,
  dateToAdd,
  dateToRemove,
  onDateSelect,
  existingRequests = [],
  disabled = false,
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Get dates with pending add/remove requests
  const pendingAddDates = existingRequests
    .filter((r) => r.requestStatus === 'waiting_for_answer' && r.dateAdded)
    .map((r) => new Date(r.dateAdded));

  const pendingRemoveDates = existingRequests
    .filter((r) => r.requestStatus === 'waiting_for_answer' && r.dateRemoved)
    .map((r) => new Date(r.dateRemoved));

  /**
   * Determine the status/color of a date cell
   */
  const getDateStatus = (date) => {
    // Selected for current request
    if (dateToAdd && isSameDate(date, dateToAdd)) {
      return 'selected-add';
    }
    if (dateToRemove && isSameDate(date, dateToRemove)) {
      return 'selected-remove';
    }

    // Pending requests
    if (isDateInList(date, pendingAddDates)) {
      return 'pending-add';
    }
    if (isDateInList(date, pendingRemoveDates)) {
      return 'pending-remove';
    }

    // Booked dates (part of current lease)
    if (isDateInList(date, bookedDates)) {
      return 'booked';
    }

    // Within reservation period but not booked
    if (reservationStart && reservationEnd && isDateInRange(date, reservationStart, reservationEnd)) {
      return 'available';
    }

    // Outside reservation period
    return 'outside';
  };

  /**
   * Check if a date can be selected based on request type
   */
  const isDateSelectable = (date) => {
    if (disabled || isPastDate(date)) return false;

    const status = getDateStatus(date);

    switch (requestType) {
      case 'adding':
        // Can only add dates that are available (not already booked)
        return status === 'available' || status === 'outside';

      case 'removing':
        // Can only remove dates that are booked
        return status === 'booked';

      case 'swapping':
        // Can select booked date to remove OR available date to add
        if (!dateToRemove) {
          // First selection: pick date to remove (must be booked)
          return status === 'booked';
        } else {
          // Second selection: pick date to add (must be available)
          return status === 'available' || status === 'outside';
        }

      default:
        return false;
    }
  };

  /**
   * Handle date click
   */
  const handleDateClick = (date) => {
    if (!isDateSelectable(date)) return;

    const status = getDateStatus(date);

    switch (requestType) {
      case 'adding':
        onDateSelect(date, 'add');
        break;

      case 'removing':
        onDateSelect(date, 'remove');
        break;

      case 'swapping':
        if (!dateToRemove) {
          // First click: select date to remove
          onDateSelect(date, 'remove');
        } else {
          // Second click: select date to add
          onDateSelect(date, 'add');
        }
        break;
    }
  };

  /**
   * Get CSS classes for a date cell
   */
  const getDateClasses = (date) => {
    const classes = ['dcr-calendar-date'];
    const status = getDateStatus(date);

    classes.push(`dcr-date-${status}`);

    if (isPastDate(date)) {
      classes.push('dcr-date-past');
    }

    if (isDateSelectable(date)) {
      classes.push('dcr-date-selectable');
    }

    return classes.join(' ');
  };

  // Month navigation
  const goToPreviousMonth = () => {
    setCurrentMonth(getPreviousMonth(currentMonth));
  };

  const goToNextMonth = () => {
    setCurrentMonth(getNextMonth(currentMonth));
  };

  // Generate calendar days
  const calendarDays = generateCalendarDays(currentMonth);

  return (
    <div className="dcr-calendar">
      {/* Calendar Header */}
      <div className="dcr-calendar-header">
        <button
          className="dcr-calendar-nav-btn"
          onClick={goToPreviousMonth}
          aria-label="Previous month"
        >
          ←
        </button>
        <div className="dcr-calendar-month">
          <select
            value={currentMonth.getMonth()}
            onChange={(e) =>
              setCurrentMonth(
                new Date(currentMonth.getFullYear(), parseInt(e.target.value), 1)
              )
            }
            className="dcr-month-select"
            aria-label="Select month"
          >
            {getMonthNames().map((month, i) => (
              <option key={i} value={i}>
                {month}
              </option>
            ))}
          </select>
          <span className="dcr-calendar-year">{currentMonth.getFullYear()}</span>
        </div>
        <button
          className="dcr-calendar-nav-btn"
          onClick={goToNextMonth}
          aria-label="Next month"
        >
          →
        </button>
      </div>

      {/* Day Names Header */}
      <div className="dcr-calendar-weekdays">
        {getDayNames().map((day) => (
          <div key={day} className="dcr-weekday">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="dcr-calendar-grid">
        {calendarDays.map((date, index) => (
          <div key={index} className="dcr-calendar-cell">
            {date && (
              <button
                className={getDateClasses(date)}
                onClick={() => handleDateClick(date)}
                disabled={!isDateSelectable(date)}
                aria-label={date.toDateString()}
              >
                {date.getDate()}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="dcr-calendar-legend">
        <div className="dcr-legend-item">
          <span className="dcr-legend-dot dcr-legend-booked"></span>
          <span>Booked</span>
        </div>
        <div className="dcr-legend-item">
          <span className="dcr-legend-dot dcr-legend-available"></span>
          <span>Available</span>
        </div>
        <div className="dcr-legend-item">
          <span className="dcr-legend-dot dcr-legend-selected-add"></span>
          <span>Add</span>
        </div>
        <div className="dcr-legend-item">
          <span className="dcr-legend-dot dcr-legend-selected-remove"></span>
          <span>Remove</span>
        </div>
        <div className="dcr-legend-item">
          <span className="dcr-legend-dot dcr-legend-pending"></span>
          <span>Pending</span>
        </div>
      </div>

      {/* Instructions based on request type */}
      {requestType && (
        <div className="dcr-calendar-instructions">
          {requestType === 'adding' && (
            <p>Click on an available date to add it to your lease.</p>
          )}
          {requestType === 'removing' && (
            <p>Click on a booked date (green) to remove it from your lease.</p>
          )}
          {requestType === 'swapping' && !dateToRemove && (
            <p>First, click on a booked date (green) that you want to swap out.</p>
          )}
          {requestType === 'swapping' && dateToRemove && !dateToAdd && (
            <p>Now, click on an available date to swap in.</p>
          )}
        </div>
      )}
    </div>
  );
}
