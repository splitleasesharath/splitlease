/**
 * Schedule Co-Host Component
 * Modal for scheduling meetings with Split Lease specialists
 * Features a calendar date picker with time slot selection
 * Updated to follow POPUP_REPLICATION_PROTOCOL.md design system
 *
 * Workflow based on Bubble Schedule-Co-Host element:
 * - Creates Co-Host Request record
 * - Creates Virtual Meeting Schedules and Links record
 * - Sends confirmation notifications
 * - Supports post-meeting rating
 *
 * Design Features (per protocol):
 * - Monochromatic purple color scheme (no green/yellow)
 * - Mobile bottom sheet behavior (< 480px)
 * - Pill-shaped buttons (100px radius)
 * - Feather icons (stroke-only)
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  generateCalendarDays,
  generateTimeSlots,
  createCoHostRequest,
  submitRating,
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

// Status order mapping for progress bar (from design spec)
// Keys are lowercase for case-insensitive matching
const STATUS_ORDER = {
  'co-host requested': 1,
  'requested': 1,
  'pending': 1, // Database stores lowercase "pending" for new requests
  'co-host selected': 2,
  'google meet scheduled': 3,
  'virtual meeting finished': 4,
  'google meet finished': 4,
  'finished': 5,
  'request closed': 5,
  'closed': 5,
};

/**
 * Get the order number for a status (case-insensitive)
 */
function getStatusOrder(status) {
  if (!status) return 1;
  return STATUS_ORDER[status.toLowerCase()] || 1;
}

// Progress bar stage definitions
const COHOST_STAGES = [
  { order: 1, label: 'Requested', labelPosition: 'below' },
  { order: 2, label: 'Co-Host Selected', labelPosition: 'above' },
  { order: 3, label: 'Google Meet Scheduled', labelPosition: 'below' },
  { order: 4, label: 'Google Meet Finished', labelPosition: 'above' },
  { order: 5, label: 'Finished', labelPosition: 'below' },
];

// Toast types with colors (from workflow spec)
const TOAST_TYPES = {
  success: { color: '#22C55E', icon: '✓' },
  error: { color: '#EF4444', icon: '✕' },
  warning: { color: '#F6DA3B', icon: '⚠' },
  information: { color: '#3B82F6', icon: 'ℹ' },
};

/**
 * Toast notification component
 */
function Toast({ toast, onClose }) {
  const config = TOAST_TYPES[toast.type] || TOAST_TYPES.information;

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, toast.duration || 10000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  return (
    <div
      className="schedule-cohost-toast"
      style={{ borderLeftColor: config.color }}
    >
      <span
        className="schedule-cohost-toast-icon"
        style={{ color: config.color }}
      >
        {config.icon}
      </span>
      <div className="schedule-cohost-toast-content">
        <strong className="schedule-cohost-toast-title">{toast.title}</strong>
        {toast.content && (
          <p className="schedule-cohost-toast-message">{toast.content}</p>
        )}
      </div>
      <button
        className="schedule-cohost-toast-close"
        onClick={() => onClose(toast.id)}
        type="button"
      >
        ×
      </button>
      <div
        className="schedule-cohost-toast-progress"
        style={{
          backgroundColor: config.color,
          animationDuration: `${toast.duration || 10000}ms`,
        }}
      />
    </div>
  );
}

/**
 * Progress bar component showing 5-stage co-host request tracking
 */
function CohostProgressBar({ currentStatus }) {
  const currentStageOrder = getStatusOrder(currentStatus);

  const topLabels = COHOST_STAGES.filter((s) => s.labelPosition === 'above');
  const bottomLabels = COHOST_STAGES.filter((s) => s.labelPosition === 'below');

  return (
    <div
      className="schedule-cohost-progress"
      role="progressbar"
      aria-valuenow={currentStageOrder}
      aria-valuemin="1"
      aria-valuemax="5"
      aria-label="Co-host request progress"
    >
      {/* Top labels row */}
      <div className="schedule-cohost-progress-labels schedule-cohost-progress-labels--top">
        {COHOST_STAGES.map((stage) => (
          <span
            key={stage.order}
            className={`schedule-cohost-progress-label ${
              stage.labelPosition === 'above' && currentStageOrder >= stage.order
                ? 'schedule-cohost-progress-label--active'
                : ''
            }`}
          >
            {stage.labelPosition === 'above' ? stage.label : ''}
          </span>
        ))}
      </div>

      {/* Dots and bars row */}
      <div className="schedule-cohost-progress-track">
        {COHOST_STAGES.map((stage, index) => (
          <React.Fragment key={stage.order}>
            {index > 0 && (
              <div
                className={`schedule-cohost-progress-bar ${
                  currentStageOrder >= stage.order ? 'schedule-cohost-progress-bar--active' : ''
                }`}
              />
            )}
            <div
              className={`schedule-cohost-progress-dot ${
                currentStageOrder >= stage.order ? 'schedule-cohost-progress-dot--active' : ''
              }`}
            />
          </React.Fragment>
        ))}
      </div>

      {/* Bottom labels row */}
      <div className="schedule-cohost-progress-labels schedule-cohost-progress-labels--bottom">
        {COHOST_STAGES.map((stage) => (
          <span
            key={stage.order}
            className={`schedule-cohost-progress-label ${
              stage.labelPosition === 'below' && currentStageOrder >= stage.order
                ? 'schedule-cohost-progress-label--active'
                : ''
            }`}
          >
            {stage.labelPosition === 'below' ? stage.label : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Star rating component for post-meeting feedback
 * Supports half-star ratings (0.5 increments)
 */
function StarRating({ value, onChange, disabled }) {
  const [hoverValue, setHoverValue] = useState(0);

  const handleStarClick = (starIndex, isHalf) => {
    if (disabled) return;
    const newValue = isHalf ? starIndex - 0.5 : starIndex;
    onChange(newValue);
  };

  const handleMouseMove = (starIndex, e) => {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const isLeftHalf = e.clientX - rect.left < rect.width / 2;
    setHoverValue(isLeftHalf ? starIndex - 0.5 : starIndex);
  };

  const displayValue = hoverValue || value;

  return (
    <div className="schedule-cohost-star-rating-container">
      {[1, 2, 3, 4, 5].map((star) => {
        // Calculate fill percentage for this star
        let fillPercent = 0;
        if (displayValue >= star) {
          fillPercent = 100;
        } else if (displayValue >= star - 0.5) {
          fillPercent = 50;
        }

        return (
          <div
            key={star}
            className={`schedule-cohost-star-wrapper ${disabled ? 'schedule-cohost-star-wrapper--disabled' : ''}`}
            onMouseMove={(e) => handleMouseMove(star, e)}
            onMouseLeave={() => setHoverValue(0)}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const isLeftHalf = e.clientX - rect.left < rect.width / 2;
              handleStarClick(star, isLeftHalf);
            }}
            aria-label={`Rate ${star} out of 5 stars`}
          >
            {/* Background star (unfilled) */}
            <span className="schedule-cohost-star-bg">★</span>
            {/* Filled portion */}
            <span
              className="schedule-cohost-star-fill"
              style={{ width: `${fillPercent}%` }}
            >
              ★
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * @param {Object} props
 * @param {string} props.userId - Current user's Bubble ID
 * @param {string} props.userEmail - Current user's email
 * @param {string} props.userName - Current user's name
 * @param {string} [props.listingId] - Associated listing ID
 * @param {Object} [props.existingRequest] - Existing co-host request to view/rate
 * @param {Function} [props.onRequestSubmitted] - Callback when request is submitted
 * @param {Function} props.onClose - Callback to close the modal
 */
export default function ScheduleCohost({
  userId,
  userEmail,
  userName,
  listingId,
  existingRequest,
  onRequestSubmitted,
  onClose,
}) {
  // Stage controls which view is shown: 'request' | 'details' | 'rating'
  const [stage, setStage] = useState(existingRequest ? 'details' : 'request');

  // Co-host request state
  const [coHostRequest, setCoHostRequest] = useState(existingRequest || null);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState([]);

  // Form state
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [details, setDetails] = useState('');

  // Rating state (for post-meeting feedback)
  const [rating, setRating] = useState(0);
  const [ratingMessage, setRatingMessage] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [toasts, setToasts] = useState([]);

  // Ref for time slots section to scroll to
  const timeSlotsRef = useRef(null);

  // Prevent background scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Generate calendar days for current month
  const calendarDays = useMemo(() => {
    return generateCalendarDays(currentMonth);
  }, [currentMonth]);

  // Generate available time slots for selected date (11 AM - 10 PM EST, hourly)
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate) return [];
    return generateTimeSlots(selectedDate, 11, 22, 60);
  }, [selectedDate]);

  // Toast notification system (from workflow spec)
  const showToast = useCallback(({ title, content, type = 'information', duration = 10000 }) => {
    const id = `toast_${Date.now()}`;
    setToasts((prev) => [...prev, { id, title, content, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

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
    // Note: Don't clear time slots - user can select slots from different dates

    // Scroll to time slots section after a brief delay to allow render
    setTimeout(() => {
      if (timeSlotsRef.current) {
        timeSlotsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  // Time slot selection (max 3)
  const handleTimeSlotClick = (slot) => {
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
    // Don't use sanitizeInput here - it trims trailing spaces which prevents typing spaces
    // Only strip script tags for XSS protection, preserve whitespace for UX
    let value = e.target.value;
    value = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    if (value.length <= 1000) {
      setDetails(value);
    }
  };

  /**
   * Main submit workflow (from Bubble workflow spec)
   * Steps:
   * 1. Create Co-Host Request
   * 2. Create Virtual Meeting Schedules and Links
   * 3. Link virtual meeting to request
   * 4-5. Send internal notification email (handled by Edge Function)
   * 6. Save to user's account (handled by Edge Function)
   * 7. Send confirmation email and SMS (handled by Edge Function)
   * 8. Schedule reminder (handled by Edge Function)
   * 9-10. Reset time slots
   * 11. Show success toast
   * 12. Hide modal (or show details)
   */
  const handleSubmit = async () => {
    const validation = validateTimeSlots(selectedTimeSlots);
    if (!validation.valid) {
      showToast({ title: 'Validation Error', content: validation.error, type: 'error' });
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Creating your co-host request...');

    const result = await createCoHostRequest({
      userId,
      userEmail,
      userName,
      listingId,
      selectedTimes: selectedTimeSlots,
      subject: selectedSubjects.join(', '),
      details: details.trim(), // Trim on submit, not during typing
    });

    setIsLoading(false);
    setLoadingMessage('');

    if (result.success) {
      // Store the created request
      setCoHostRequest({
        id: result.requestId,
        virtualMeetingId: result.virtualMeetingId,
        status: 'Co-Host Requested',
        subject: selectedSubjects.join(', '),
        details,
        selectedTimes: selectedTimeSlots,
      });

      // Reset time slots (Steps 9-10)
      setSelectedTimeSlots([]);
      setSelectedDate(null);
      setSelectedSubjects([]);
      setDetails('');

      // Show success toast (Step 11)
      showToast({
        title: 'Request Submitted!',
        content: 'Your co-host request has been submitted. We\'ll reach out to confirm a time.',
        type: 'success',
        duration: 10000,
      });

      // Change to details view
      setStage('details');

      // Callback to parent
      onRequestSubmitted?.(result.requestId, result.virtualMeetingId);
    } else {
      showToast({
        title: 'Submission Failed',
        content: result.error || 'Failed to submit request. Please try again.',
        type: 'error',
      });
    }
  };

  /**
   * Submit rating workflow (from Bubble workflow spec)
   * Updates Co-Host Request with rating and closes the request
   */
  const handleSubmitRating = async () => {
    if (!coHostRequest?.id || rating === 0) {
      showToast({ title: 'Please select a rating', type: 'warning' });
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Submitting your rating...');

    const result = await submitRating(coHostRequest.id, rating, ratingMessage);

    setIsLoading(false);
    setLoadingMessage('');

    if (result.success) {
      showToast({
        title: 'Thank you!',
        content: 'Your feedback has been submitted.',
        type: 'success',
      });

      // Update local state
      setCoHostRequest((prev) => ({
        ...prev,
        status: 'Request closed',
        rating,
        ratingMessage,
      }));

      // Close after a short delay
      setTimeout(() => onClose(), 2000);
    } else {
      showToast({
        title: 'Failed to submit rating',
        content: result.error,
        type: 'error',
      });
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

  // Check if a date is the currently active/selected date
  const isSelectedDate = (date) => {
    if (!selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  // Check if a date has any time slots selected
  const hasSelectedSlots = (date) => {
    return selectedTimeSlots.some((slot) => {
      const slotDate = slot.dateTime;
      return (
        slotDate.getDate() === date.getDate() &&
        slotDate.getMonth() === date.getMonth() &&
        slotDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Format month/year for display
  const monthYearDisplay = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const canSubmit = selectedTimeSlots.length === 3 && !isLoading;
  const slotsRemaining = 3 - selectedTimeSlots.length;

  return (
    <div
      className="schedule-cohost-overlay"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-cohost-title"
    >
      <div className="schedule-cohost-modal" onClick={(e) => e.stopPropagation()}>
        {/* Mobile grab handle - visible only on mobile */}
        <div className="schedule-cohost-grab-handle" aria-hidden="true" />

        {/* Toast Notifications */}
        <div className="schedule-cohost-toasts">
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onClose={removeToast} />
          ))}
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="schedule-cohost-loading">
            <div className="schedule-cohost-spinner" />
            <p className="schedule-cohost-loading-text">{loadingMessage}</p>
          </div>
        )}

        {/* Header (per protocol structure) */}
        <header className="schedule-cohost-header">
          <div className="schedule-cohost-header-content">
            <div className="schedule-cohost-header-title">
              {/* Feather users icon - monochromatic per popup redesign protocol */}
              <svg className="schedule-cohost-icon-svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <h2 id="schedule-cohost-title" className="schedule-cohost-title">Meet with a Co-Host</h2>
            </div>
            <p className="schedule-cohost-subtitle">Get personalized guidance and support.</p>
          </div>
          {/* Close Button */}
          <button className="schedule-cohost-close" onClick={onClose} type="button" aria-label="Close modal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        {/* Request Form Stage */}
        {stage === 'request' && (
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
                  const isActive = isSelectedDate(date);
                  const hasSlots = hasSelectedSlots(date);
                  const isTodayDate = isToday(date);
                  const isClickable = !isOtherMonth && !isPast;

                  // Build class names array
                  const classNames = ['schedule-cohost-calendar-day'];
                  if (isOtherMonth) classNames.push('schedule-cohost-calendar-day--other');
                  if (isPast) classNames.push('schedule-cohost-calendar-day--past');
                  if (isActive) classNames.push('schedule-cohost-calendar-day--selected');
                  if (hasSlots) classNames.push('schedule-cohost-calendar-day--has-slots');
                  if (isTodayDate) classNames.push('schedule-cohost-calendar-day--today');

                  return (
                    <button
                      key={index}
                      type="button"
                      className={classNames.join(' ')}
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
              <div className="schedule-cohost-timeslots" ref={timeSlotsRef}>
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

                {/* Selected Time Slots Summary */}
                {selectedTimeSlots.length > 0 && (
                  <div className="schedule-cohost-selections-summary">
                    <label className="schedule-cohost-label">Your selected time slots:</label>
                    <div className="schedule-cohost-selections-list">
                      {selectedTimeSlots.map((slot, index) => (
                        <div key={slot.id} className="schedule-cohost-selection-item">
                          <span className="schedule-cohost-selection-number">#{index + 1}</span>
                          <span className="schedule-cohost-selection-datetime">{slot.displayTime}</span>
                          <button
                            type="button"
                            className="schedule-cohost-selection-remove"
                            onClick={() => handleTimeSlotClick(slot)}
                            aria-label={`Remove ${slot.displayTime}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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

        {/* Details Stage (after submission or viewing existing request) */}
        {stage === 'details' && coHostRequest && (
          <div className="schedule-cohost-details">
            {/* Progress Bar - shows current status in the workflow */}
            <CohostProgressBar currentStatus={
              coHostRequest.status
              || coHostRequest['Status - Co-Host Request']
              || 'Co-Host Requested'
            } />

            {/* Assigned Co-Host Info - shown once a co-host is selected */}
            {(coHostRequest['Co-Host selected (OS)'] || coHostRequest.cohostName) && (
              <div className="schedule-cohost-assigned-info">
                <div className="schedule-cohost-assigned-cohost">
                  <span className="schedule-cohost-assigned-label">Your Co-Host:</span>
                  <span className="schedule-cohost-assigned-value">
                    {coHostRequest['Co-Host selected (OS)'] || coHostRequest.cohostName}
                  </span>
                </div>
                {(coHostRequest['Meeting Date Time'] || coHostRequest.meetingDateTime) && (
                  <div className="schedule-cohost-assigned-meeting">
                    <span className="schedule-cohost-assigned-label">Meeting Time:</span>
                    <span className="schedule-cohost-assigned-value">
                      {coHostRequest['Meeting Date Time'] || coHostRequest.meetingDateTime}
                    </span>
                  </div>
                )}
                {(coHostRequest['Google Meet Link'] || coHostRequest.googleMeetLink) && (
                  <a
                    href={coHostRequest['Google Meet Link'] || coHostRequest.googleMeetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="schedule-cohost-meet-link"
                  >
                    Join Google Meet
                  </a>
                )}
              </div>
            )}

            {/* Meeting Times Summary */}
            <p className="schedule-cohost-success-text">Your suggested meeting times:</p>
            <div className="schedule-cohost-selected-times">
              {(() => {
                // Handle multiple data formats:
                // 1. Fresh submission: selectedTimes array of objects with displayTime
                // 2. Database load: "Dates and times suggested" array of strings
                // 3. Fallback: selectedTimeSlots from state
                const times = coHostRequest.selectedTimes
                  || coHostRequest['Dates and times suggested']
                  || selectedTimeSlots
                  || [];

                return times.map((slot, index) => {
                  // Handle both object format and string format
                  const displayText = typeof slot === 'string'
                    ? slot
                    : (slot.displayTime || slot.formattedTime || '');
                  return (
                    <div key={slot.id || index} className="schedule-cohost-selected-time">
                      #{index + 1} - {displayText}
                    </div>
                  );
                });
              })()}
            </div>

            {/* Topics/Subject - handles both legacy and new field names */}
            {(coHostRequest.subject || coHostRequest['Request notes']) && (
              <div className="schedule-cohost-details-subject">
                <strong>Request:</strong> {coHostRequest.subject || coHostRequest['Request notes']}
              </div>
            )}

            {/* Info message */}
            <p className="schedule-cohost-success-info">
              We'll reach out to confirm a time that works for everyone. You'll receive a confirmation email and SMS shortly.
            </p>

            {/* Rating Section - only visible when meeting is completed (status >= stage 4) */}
            {(getStatusOrder(coHostRequest.status || coHostRequest['Status - Co-Host Request']) >= 4) && (
              <div className="schedule-cohost-details-section">
                <h4 className="schedule-cohost-details-title">How was your meeting?</h4>
                <StarRating value={rating} onChange={setRating} disabled={isLoading} />
                <textarea
                  className="schedule-cohost-feedback-textarea"
                  value={ratingMessage}
                  onChange={(e) => setRatingMessage(sanitizeInput(e.target.value))}
                  placeholder="Anything you would like to share about your Co-Host experience? (optional)"
                  rows={3}
                  aria-label="Feedback message (optional)"
                />
                <button
                  className="schedule-cohost-submit-rating-btn"
                  onClick={handleSubmitRating}
                  disabled={rating === 0 || isLoading}
                  type="button"
                >
                  {isLoading ? 'Submitting...' : 'Submit Rating'}
                </button>
              </div>
            )}

            {/* Done Button */}
            <div className="schedule-cohost-actions">
              <button
                className="schedule-cohost-done-btn"
                onClick={onClose}
                type="button"
              >
                Done
              </button>
            </div>

            {/* Metadata - Creation date and ID */}
            <div className="schedule-cohost-metadata-centered">
              {(coHostRequest.createdDate || coHostRequest['Created Date']) && (
                <p>Created: {formatDateForDisplay(new Date(coHostRequest.createdDate || coHostRequest['Created Date']))}</p>
              )}
              {(coHostRequest.id || coHostRequest._id) && (
                <p>Unique ID: {coHostRequest.id || coHostRequest._id}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
