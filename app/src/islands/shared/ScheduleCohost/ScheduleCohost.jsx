/**
 * Schedule Co-Host Component
 * Modal for scheduling meetings with Split Lease specialists
 * Features a calendar date picker with time slot selection
 */

import { useState, useEffect, useMemo } from 'react';
import {
  generateCalendarDays,
  generateTimeSlots,
  createCoHostRequest,
  validateTimeSlots,
  sanitizeInput,
  formatDateForDisplay,
} from './cohostService';
import './ScheduleCohost.css';

// Team member data (from Co-Host/Split Lease Admins option set)
const TEAM_MEMBERS = [
  { id: 'sharath', name: 'Sharath', initial: 'S' },
  { id: 'frederick', name: 'Frederick', initial: 'F' },
  { id: 'rod', name: 'Rod', initial: 'R' },
  { id: 'igor', name: 'Igor', initial: 'I' },
];

// Subject options (from design spec)
const SUBJECT_OPTIONS = [
  'Can my Listing be private?',
  'What are the differences between the rental styles?',
  'How do I get paid?',
  'Setting up my listing',
  'Understanding pricing',
  'Other question',
];

// Days of week header
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * @param {Object} props
 * @param {string} props.userId - Current user's Bubble ID
 * @param {string} props.userEmail - Current user's email
 * @param {string} props.userName - Current user's name
 * @param {string} [props.listingId] - Associated listing ID
 * @param {Function} [props.onRequestSubmitted] - Callback when request is submitted
 * @param {Function} props.onClose - Callback to close the modal
 */
export default function ScheduleCohost({
  userId,
  userEmail,
  userName,
  listingId,
  onRequestSubmitted,
  onClose,
}) {
  const [stage, setStage] = useState('form'); // 'form' | 'submitted'

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState([]);

  // Form state
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [details, setDetails] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [requestId, setRequestId] = useState(null);

  // Generate calendar days for current month
  const calendarDays = useMemo(() => {
    return generateCalendarDays(currentMonth);
  }, [currentMonth]);

  // Generate available time slots for selected date (11 AM - 10 PM EST, hourly)
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate) return [];
    return generateTimeSlots(selectedDate, 11, 22, 60);
  }, [selectedDate]);

  // Clear messages after timeout
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Calendar navigation
  const goToPreviousMonth = () => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const goToNextMonth = () => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  // Date selection
  const handleDateClick = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Don't allow past dates
    if (date < today) return;

    // Don't allow dates not in current month
    if (date.getMonth() !== currentMonth.getMonth()) return;

    setSelectedDate(date);
    // Clear time slots when date changes
    setSelectedTimeSlots([]);
    setError(null);
  };

  // Time slot selection (max 3)
  const handleTimeSlotClick = (slot) => {
    setError(null);
    setSelectedTimeSlots((prev) => {
      const isSelected = prev.some((s) => s.id === slot.id);
      if (isSelected) {
        return prev.filter((s) => s.id !== slot.id);
      }
      if (prev.length < 3) {
        return [...prev, slot];
      }
      return prev;
    });
  };

  const handleClearTimeSlots = () => {
    setSelectedTimeSlots([]);
    setError(null);
  };

  // Subject selection (multi-select)
  const handleSubjectToggle = (subject) => {
    setSelectedSubjects((prev) => {
      if (prev.includes(subject)) {
        return prev.filter((s) => s !== subject);
      }
      return [...prev, subject];
    });
  };

  const handleDetailsChange = (e) => {
    const value = sanitizeInput(e.target.value);
    if (value.length <= 1000) {
      setDetails(value);
    }
  };

  const handleSubmit = async () => {
    const validation = validateTimeSlots(selectedTimeSlots);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Scheduling your booking...');
    setError(null);

    const result = await createCoHostRequest({
      userId,
      userEmail,
      userName,
      listingId,
      selectedTimes: selectedTimeSlots,
      subject: selectedSubjects.join(', '),
      details,
    });

    setIsLoading(false);
    setLoadingMessage('');

    if (result.success) {
      setRequestId(result.requestId);
      setSuccessMessage('Co-Host request submitted successfully!');
      setStage('submitted');
      onRequestSubmitted?.(result.requestId, result.virtualMeetingId);
    } else {
      setError(result.error || 'Failed to submit request');
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Check if a date is in the current month
  const isCurrentMonth = (date) => {
    return date.getMonth() === currentMonth.getMonth();
  };

  // Check if a date is today
  const isToday = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Check if a date is in the past
  const isPastDate = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Check if a date is selected
  const isSelectedDate = (date) => {
    if (!selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  // Format month/year for display
  const monthYearDisplay = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const canSubmit = selectedTimeSlots.length === 3 && !isLoading;
  const slotsRemaining = 3 - selectedTimeSlots.length;

  return (
    <div className="schedule-cohost-overlay" onClick={handleBackdropClick}>
      <div className="schedule-cohost-modal">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="schedule-cohost-loading">
            <div className="schedule-cohost-spinner" />
            <p className="schedule-cohost-loading-text">{loadingMessage}</p>
          </div>
        )}

        {/* Close Button */}
        <button className="schedule-cohost-close" onClick={onClose} type="button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="schedule-cohost-header">
          <div className="schedule-cohost-header-title">
            <img
              src="https://cdn.prod.website-files.com/65c82bd7eda94f81b69c8ea8/65e81c5fb2c5ee14e40bfb0c_Icon-cohost.svg"
              alt=""
              className="schedule-cohost-icon-img"
            />
            <h2 className="schedule-cohost-title">Meet with a Co-Host</h2>
          </div>
          <p className="schedule-cohost-subtitle">Get personalized guidance and support.</p>
        </div>

        {/* Alerts */}
        {successMessage && (
          <div className="schedule-cohost-alert schedule-cohost-alert--success">
            <span className="schedule-cohost-alert-icon">✓</span>
            <span>{successMessage}</span>
          </div>
        )}
        {error && (
          <div className="schedule-cohost-alert schedule-cohost-alert--error">
            <span className="schedule-cohost-alert-icon">!</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form Stage */}
        {stage === 'form' && (
          <>
            {/* Team Members Section */}
            <div className="schedule-cohost-team">
              <div className="schedule-cohost-avatars">
                {TEAM_MEMBERS.map((member, index) => (
                  <div
                    key={member.id}
                    className="schedule-cohost-avatar"
                    style={{ zIndex: TEAM_MEMBERS.length - index }}
                  >
                    {member.initial}
                  </div>
                ))}
              </div>
              <p className="schedule-cohost-team-text">
                One of our team members will join as your co-host
              </p>
            </div>

            {/* Calendar Section */}
            <div className="schedule-cohost-calendar">
              {/* Calendar Header */}
              <div className="schedule-cohost-calendar-header">
                <button
                  type="button"
                  className="schedule-cohost-calendar-nav"
                  onClick={goToPreviousMonth}
                  aria-label="Previous month"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <span className="schedule-cohost-calendar-month">{monthYearDisplay}</span>
                <button
                  type="button"
                  className="schedule-cohost-calendar-nav"
                  onClick={goToNextMonth}
                  aria-label="Next month"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>

              {/* Days of Week */}
              <div className="schedule-cohost-calendar-weekdays">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day} className="schedule-cohost-calendar-weekday">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="schedule-cohost-calendar-grid">
                {calendarDays.map((date, index) => {
                  const isOtherMonth = !isCurrentMonth(date);
                  const isPast = isPastDate(date);
                  const isSelected = isSelectedDate(date);
                  const isTodayDate = isToday(date);
                  const isClickable = !isOtherMonth && !isPast;

                  return (
                    <button
                      key={index}
                      type="button"
                      className={`schedule-cohost-calendar-day ${isOtherMonth ? 'schedule-cohost-calendar-day--other' : ''} ${isPast ? 'schedule-cohost-calendar-day--past' : ''} ${isSelected ? 'schedule-cohost-calendar-day--selected' : ''} ${isTodayDate ? 'schedule-cohost-calendar-day--today' : ''}`}
                      onClick={() => isClickable && handleDateClick(date)}
                      disabled={!isClickable}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slots Section */}
            {selectedDate && (
              <div className="schedule-cohost-timeslots">
                <div className="schedule-cohost-timeslots-header">
                  <div className="schedule-cohost-timeslots-title">
                    <label className="schedule-cohost-label">
                      Select <u>3</u> Time Slots (EST)
                    </label>
                    <span className="schedule-cohost-count">
                      {selectedTimeSlots.length}/3 selected
                    </span>
                  </div>
                  {selectedTimeSlots.length > 0 && (
                    <button
                      className="schedule-cohost-clear-btn"
                      onClick={handleClearTimeSlots}
                      type="button"
                    >
                      Clear Time Slots
                    </button>
                  )}
                </div>

                {/* Selected Date Display */}
                <div className="schedule-cohost-selected-date">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span>{formatDateForDisplay(selectedDate)}</span>
                </div>

                {/* Time Slot Grid */}
                <div className="schedule-cohost-slots-grid">
                  {availableTimeSlots.map((slot) => {
                    const isSelected = selectedTimeSlots.some((s) => s.id === slot.id);
                    const isDisabled = !isSelected && selectedTimeSlots.length >= 3;
                    return (
                      <button
                        key={slot.id}
                        className={`schedule-cohost-slot ${isSelected ? 'schedule-cohost-slot--selected' : ''} ${isDisabled ? 'schedule-cohost-slot--disabled' : ''}`}
                        onClick={() => handleTimeSlotClick(slot)}
                        disabled={isDisabled}
                        type="button"
                      >
                        {slot.formattedTime}
                      </button>
                    );
                  })}
                </div>

                <p className="schedule-cohost-timezone">
                  Times shown in Eastern Standard Time (EST)
                </p>
              </div>
            )}

            {/* Subject Selection */}
            <div className="schedule-cohost-form">
              <div className="schedule-cohost-field">
                <label className="schedule-cohost-label">What would you like help with?</label>
                <div className="schedule-cohost-subjects">
                  {SUBJECT_OPTIONS.map((subject) => (
                    <button
                      key={subject}
                      type="button"
                      className={`schedule-cohost-subject-tag ${selectedSubjects.includes(subject) ? 'schedule-cohost-subject-tag--selected' : ''}`}
                      onClick={() => handleSubjectToggle(subject)}
                    >
                      {subject}
                      {selectedSubjects.includes(subject) && (
                        <span className="schedule-cohost-subject-remove">×</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="schedule-cohost-field">
                <label className="schedule-cohost-label">Additional details (optional)</label>
                <textarea
                  className="schedule-cohost-textarea"
                  value={details}
                  onChange={handleDetailsChange}
                  placeholder="Type any details of what you want to get help with (optional)"
                  rows={4}
                />
                <span className={`schedule-cohost-charcount ${details.length > 900 ? 'schedule-cohost-charcount--warning' : ''}`}>
                  {details.length}/1000 characters
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <div className="schedule-cohost-actions">
              <button
                className="schedule-cohost-submit"
                onClick={handleSubmit}
                disabled={!canSubmit}
                type="button"
              >
                {isLoading
                  ? 'Submitting...'
                  : slotsRemaining > 0
                    ? `Select ${slotsRemaining} more slot${slotsRemaining !== 1 ? 's' : ''}`
                    : 'Submit Request'}
              </button>
              {!selectedDate && (
                <p className="schedule-cohost-hint">Please select a date from the calendar</p>
              )}
            </div>
          </>
        )}

        {/* Submitted Stage */}
        {stage === 'submitted' && (
          <div className="schedule-cohost-submitted">
            <div className="schedule-cohost-success-icon">✓</div>
            <h3 className="schedule-cohost-success-title">Your request has been submitted!</h3>
            <p className="schedule-cohost-success-text">Your suggested meeting times:</p>
            <div className="schedule-cohost-selected-times">
              {selectedTimeSlots.map((slot, index) => (
                <div key={slot.id} className="schedule-cohost-selected-time">
                  #{index + 1} - {slot.displayTime}
                </div>
              ))}
            </div>
            {selectedSubjects.length > 0 && (
              <div className="schedule-cohost-submitted-subject">
                <strong>Topics:</strong> {selectedSubjects.join(', ')}
              </div>
            )}
            <p className="schedule-cohost-success-info">
              We'll reach out to confirm a time that works for everyone.
            </p>
            <button
              className="schedule-cohost-done-btn"
              onClick={onClose}
              type="button"
            >
              Done
            </button>
          </div>
        )}

        {/* Request ID (if available) */}
        {requestId && stage === 'submitted' && (
          <div className="schedule-cohost-metadata">
            <span className="schedule-cohost-metadata-label">Request ID:</span>
            <span className="schedule-cohost-metadata-value">{requestId}</span>
          </div>
        )}
      </div>
    </div>
  );
}
