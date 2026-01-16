/**
 * Book Time Slot Calendar Component
 * Allows users to select up to 3 time slots from a calendar in EST timezone
 */

import { useState, useEffect } from 'react';
import {
  generateTimeSlots,
  generateCalendarDays,
  getPreviousMonth,
  getNextMonth,
  formatTimeEST,
  getMonthNames,
  getDayNames,
  isPastDate,
  isSameDateTime,
  isSameDate,
} from './dateUtils.js';
import './BookTimeSlot.css';

/**
 * @param {Object} props
 * @param {number} [props.initialStartTime=8] - Starting hour (24-hour format)
 * @param {number} [props.initialEndTime=20] - Ending hour (24-hour format)
 * @param {number} [props.interval=30] - Interval in minutes
 * @param {number} [props.maxSelections=3] - Maximum time slots that can be selected
 * @param {Function} [props.onSelectionChange] - Callback when selections change
 * @param {string} [props.timezone='America/New_York'] - Timezone
 * @param {Date[]} [props.disabledDates=[]] - Dates that cannot be selected
 * @param {Date[]} [props.selectedSlots=[]] - Pre-selected time slots
 */
export default function BookTimeSlot({
  initialStartTime = 8,
  initialEndTime = 20,
  interval = 30,
  maxSelections = 3,
  onSelectionChange,
  timezone = 'America/New_York',
  disabledDates = [],
  selectedSlots = [],
}) {
  const [state, setState] = useState({
    clearTimeSlots: false,
    timesSelected: selectedSlots,
    endTime: initialEndTime,
    internalEditing: false,
    interval: interval,
    lastLogicalDate: null,
    requestingCoh: false,
    startTime: initialStartTime,
  });

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [isGridCollapsed, setIsGridCollapsed] = useState(false);

  // Notify parent of selection changes
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(state.timesSelected);
    }
  }, [state.timesSelected, onSelectionChange]);

  // Auto-collapse grid when max selections reached
  useEffect(() => {
    if (state.timesSelected.length >= maxSelections) {
      setIsGridCollapsed(true);
    }
  }, [state.timesSelected.length, maxSelections]);

  // Handle date selection (shows time slots inline)
  const handleDateSelect = (date) => {
    if (isPastDate(date)) return;

    setSelectedDate(date);
    const slots = generateTimeSlots(date, state.startTime, state.endTime, state.interval);
    setAvailableTimeSlots(slots);
    setShowTimePicker(true);
  };

  // Handle time slot selection (toggle selection)
  const handleTimeSlotSelect = (timeSlot) => {
    const alreadySelected = state.timesSelected.some((slot) =>
      isSameDateTime(slot, timeSlot)
    );

    if (alreadySelected) {
      // Remove if already selected
      setState((prev) => ({
        ...prev,
        timesSelected: prev.timesSelected.filter((slot) => !isSameDateTime(slot, timeSlot)),
      }));
    } else if (state.timesSelected.length < maxSelections) {
      // Add if under limit
      setState((prev) => ({
        ...prev,
        timesSelected: [...prev.timesSelected, timeSlot],
        internalEditing: true,
        lastLogicalDate: timeSlot,
      }));
    }
  };

  // Remove a selected slot
  const handleRemoveSlot = (index) => {
    setState((prev) => ({
      ...prev,
      timesSelected: prev.timesSelected.filter((_, i) => i !== index),
    }));
  };

  // Clear all selections
  const handleClearTimeSlots = () => {
    setState((prev) => ({
      ...prev,
      timesSelected: [],
      clearTimeSlots: false,
      internalEditing: false,
    }));
  };

  // Month navigation
  const goToPreviousMonth = () => {
    setCurrentMonth(getPreviousMonth(currentMonth));
  };

  const goToNextMonth = () => {
    setCurrentMonth(getNextMonth(currentMonth));
  };

  // Toggle grid collapse state
  const toggleGridCollapse = () => {
    setIsGridCollapsed((prev) => !prev);
  };

  // Check if a date is disabled
  const isDateDisabled = (date) => {
    if (isPastDate(date)) return true;
    if (disabledDates.some((disabledDate) => isSameDateTime(date, disabledDate))) return true;

    // Disable dates when max selections reached, unless the date already has selected slots
    // (user should still be able to click to view/deselect existing slots)
    if (state.timesSelected.length >= maxSelections) {
      const hasExistingSlots = state.timesSelected.some((slot) => isSameDate(slot, date));
      if (!hasExistingSlots) return true;
    }

    return false;
  };

  // Check if a date is currently being viewed (time picker shown for this date)
  const isDateActive = (date) => {
    return selectedDate && isSameDate(date, selectedDate);
  };

  // Check if a date has any selected time slots
  const dateHasSelectedSlots = (date) => {
    return state.timesSelected.some((slot) => isSameDate(slot, date));
  };

  // Get CSS classes for a date button
  const getDateButtonClasses = (date) => {
    const classes = ['vm-date-button'];

    if (isDateActive(date)) {
      classes.push('vm-date-button-active');
    }

    if (dateHasSelectedSlots(date)) {
      classes.push('vm-date-button-has-slots');
    }

    return classes.join(' ');
  };

  return (
    <div className="vm-book-time-slot-container">
      {/* Calendar Section */}
      <div className="vm-select-date-section">
        <div className="vm-calendar-header">
          <button
            onClick={goToPreviousMonth}
            aria-label="Previous month"
            className="vm-calendar-nav-btn"
          >
            &larr;
          </button>
          <select
            value={currentMonth.getMonth()}
            onChange={(e) =>
              setCurrentMonth(
                new Date(currentMonth.getFullYear(), parseInt(e.target.value), 1)
              )
            }
            aria-label="Select month"
            className="vm-month-select"
          >
            {getMonthNames().map((month, i) => (
              <option key={i} value={i}>
                {month}
              </option>
            ))}
          </select>
          <button
            onClick={goToNextMonth}
            aria-label="Next month"
            className="vm-calendar-nav-btn"
          >
            &rarr;
          </button>
        </div>

        <div className="vm-days-of-week">
          {getDayNames().map((day) => (
            <div key={day} className="vm-day-header">
              {day}
            </div>
          ))}
        </div>

        <div className="vm-calendar-grid">
          {generateCalendarDays(currentMonth).map((date, index) => (
            <div key={index} className="vm-calendar-cell">
              {date && (
                <button
                  onClick={() => handleDateSelect(date)}
                  disabled={isDateDisabled(date)}
                  className={getDateButtonClasses(date)}
                  aria-label={`Select ${date.toDateString()}`}
                >
                  {date.getDate()}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Time Slot Selection Section */}
      <div className="vm-select-time-section">
        <h3 className="vm-select-time-title">Select {maxSelections} Time Slots (EST)</h3>

        {/* Selected slots display */}
        <div className="vm-selected-slots">
          {state.timesSelected.length === 0 ? (
            <div className="vm-empty-slots">
              Click on a date to select time slots
            </div>
          ) : (
            state.timesSelected.map((slot, index) => (
              <div key={index} className="vm-slot-badge">
                {formatTimeEST(slot, 'MMM d, h:mm a')}
                <button
                  className="vm-remove-slot-btn"
                  onClick={() => handleRemoveSlot(index)}
                  aria-label="Remove time slot"
                >
                  &times;
                </button>
              </div>
            ))
          )}
        </div>

        {/* Clear button */}
        <button
          onClick={handleClearTimeSlots}
          disabled={state.timesSelected.length === 0}
          className="vm-clear-button"
        >
          Clear Time Slots
        </button>

        {/* Current date info - only show when remaining > 0 */}
        {maxSelections - state.timesSelected.length > 0 && (
          <div className="vm-current-date-info">
            Select {maxSelections - state.timesSelected.length} more time slot
            {maxSelections - state.timesSelected.length !== 1 ? 's' : ''} (EST)
          </div>
        )}
      </div>

      {/* Inline Time Slots Section - with collapse support */}
      {showTimePicker && selectedDate && (
        <div className={`vm-inline-time-slots ${isGridCollapsed ? 'vm-inline-time-slots--collapsed' : ''}`}>
          <div className="vm-time-picker-header-container">
            <h3 className="vm-time-picker-header">
              {isGridCollapsed
                ? `${state.timesSelected.length} time slot${state.timesSelected.length !== 1 ? 's' : ''} selected`
                : `Select Time for ${selectedDate.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}`
              }
            </h3>
            <button
              className="vm-grid-toggle-btn"
              onClick={toggleGridCollapse}
              aria-label={isGridCollapsed ? 'Expand time slots' : 'Collapse time slots'}
              aria-expanded={!isGridCollapsed}
              type="button"
            >
              <span className="vm-grid-toggle-arrow">{isGridCollapsed ? '\u25BC' : '\u25B2'}</span>
            </button>
          </div>
          {!isGridCollapsed && (
            <div className="vm-time-slots-list">
              {availableTimeSlots.map((timeSlot, index) => {
                const isSelected = state.timesSelected.some((slot) =>
                  isSameDateTime(slot, timeSlot)
                );
                const isDisabled = isPastDate(timeSlot);
                const isAtLimit = !isSelected && state.timesSelected.length >= maxSelections;

                return (
                  <button
                    key={index}
                    onClick={() => handleTimeSlotSelect(timeSlot)}
                    disabled={isDisabled || isAtLimit}
                    className={`vm-time-slot-button ${isSelected ? 'vm-time-slot-selected' : ''}`}
                  >
                    {formatTimeEST(timeSlot, 'h:mm a')}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
