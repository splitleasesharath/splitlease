import React, { useState, useCallback } from 'react';
import type { Rules, CancellationPolicy, GenderPreference, RentalType } from '../types/listing.types';
import { HOUSE_RULES } from '../types/listing.types';

interface Section5Props {
  data: Rules;
  rentalType: RentalType;
  onChange: (data: Rules) => void;
  onNext: () => void;
  onBack: () => void;
  showToast: (options: { title: string; content?: string; type?: 'success' | 'error' | 'warning' | 'info' }) => void;
}

export const Section5Rules: React.FC<Section5Props> = ({ data, rentalType, onChange, onNext, onBack, showToast }) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectionMode, setSelectionMode] = useState<'individual' | 'range'>('individual');

  // Scroll to first error field
  const scrollToFirstError = useCallback((errorKeys: string[]) => {
    if (errorKeys.length === 0) return;
    const firstErrorKey = errorKeys[0];
    const element = document.getElementById(firstErrorKey);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.focus();
    }
  }, []);

  const handleChange = (field: keyof Rules, value: any) => {
    onChange({ ...data, [field]: value });
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  const toggleHouseRule = (rule: string) => {
    // If trying to add a rule and already at max, show toast and return
    if (!data.houseRules.includes(rule) && data.houseRules.length >= 12) {
      showToast({ title: 'Maximum reached', content: 'You can select up to 12 house rules', type: 'info' });
      return;
    }

    const updated = data.houseRules.includes(rule)
      ? data.houseRules.filter((r) => r !== rule)
      : [...data.houseRules, rule];
    handleChange('houseRules', updated);
  };

  const loadCommonRules = () => {
    const common = ['No Parties', 'No Smoking Inside', 'Quiet Hours', 'Wash Your Dishes', 'Lock Doors'];
    handleChange('houseRules', [...new Set([...data.houseRules, ...common])]);
  };

  const removeBlockedDate = (dateToRemove: Date) => {
    const updated = data.blockedDates.filter(
      (d) => d.toDateString() !== dateToRemove.toDateString()
    );
    handleChange('blockedDates', updated);
  };

  // Toggle a single blocked date (add if not present, remove if present)
  const toggleBlockedDate = (date: Date) => {
    const dateStr = date.toDateString();
    const isBlocked = data.blockedDates.some((d) => d.toDateString() === dateStr);

    if (isBlocked) {
      // Remove the date
      const updated = data.blockedDates.filter((d) => d.toDateString() !== dateStr);
      handleChange('blockedDates', updated);
    } else {
      // Add the date
      handleChange('blockedDates', [...data.blockedDates, date]);
    }
  };

  // Add multiple dates to blocked list (for range selection)
  const addBlockedDates = (dates: Date[]) => {
    // Filter out dates that are already blocked
    const newDates = dates.filter(
      (date) => !data.blockedDates.some((d) => d.toDateString() === date.toDateString())
    );
    handleChange('blockedDates', [...data.blockedDates, ...newDates]);
  };

  // Get all dates between two dates (inclusive)
  const getDatesBetween = (startDate: Date, endDate: Date): Date[] => {
    const dates: Date[] = [];
    let start = new Date(startDate);
    let end = new Date(endDate);

    // Ensure start is before end
    if (start > end) {
      const temp = start;
      start = end;
      end = temp;
    }

    const current = new Date(start);
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  const handleDateClick = (date: Date) => {
    if (selectionMode === 'individual') {
      // Individual mode: toggle the clicked date
      toggleBlockedDate(date);
    } else {
      // Range mode: wait for two clicks
      if (!selectedStartDate) {
        // First click: set the start of the range
        setSelectedStartDate(date);
      } else {
        // Second click: block all dates in the range
        const rangeDates = getDatesBetween(selectedStartDate, date);
        addBlockedDates(rangeDates);
        // Reset range start for next selection
        setSelectedStartDate(null);
      }
    }
  };

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(year, month, d));
    }

    return days;
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleModeChange = (mode: 'individual' | 'range') => {
    setSelectionMode(mode);
    setSelectedStartDate(null);
  };

  const isDateBlocked = (date: Date) => {
    return data.blockedDates.some(
      (blocked) => blocked.toDateString() === date.toDateString()
    );
  };

  const validateForm = (): string[] => {
    const newErrors: Record<string, string> = {};
    const errorOrder: string[] = []; // Track order of errors for scrolling

    if (!data.cancellationPolicy) {
      newErrors.cancellationPolicy = 'Cancellation policy is required';
      errorOrder.push('cancellationPolicy');
    }

    if (data.idealMinDuration < 6) {
      newErrors.idealMinDuration = 'Minimum duration must be at least 6 weeks';
      errorOrder.push('idealMinDuration');
    }

    if (data.idealMaxDuration > 52) {
      newErrors.idealMaxDuration = 'Maximum duration cannot exceed 52 weeks';
      errorOrder.push('idealMaxDuration');
    }

    if (data.idealMinDuration > data.idealMaxDuration) {
      newErrors.idealMaxDuration = 'Maximum duration must be greater than or equal to minimum';
      if (!errorOrder.includes('idealMaxDuration')) {
        errorOrder.push('idealMaxDuration');
      }
    }

    setErrors(newErrors);
    return errorOrder;
  };

  const handleNext = () => {
    const errorKeys = validateForm();
    if (errorKeys.length === 0) {
      onNext();
    } else {
      scrollToFirstError(errorKeys);
    }
  };

  const checkInTimes = ['1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM'];
  const checkOutTimes = ['10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM'];

  // Determine duration unit based on rental type
  const getDurationUnit = () => {
    if (rentalType === 'Monthly') {
      return 'months';
    }
    // For Nightly and Weekly, use weeks
    return 'weeks';
  };

  const durationUnit = getDurationUnit();

  return (
    <div className="section-container rules-section">
      <h2 className="section-title">Rules</h2>
      <p className="section-subtitle">Set house rules and preferences</p>

      {/* Cancellation Policy */}
      <div className="form-group">
        <label htmlFor="cancellationPolicy">
          Cancellation Policy<span className="required">*</span>
        </label>
        <select
          id="cancellationPolicy"
          value={data.cancellationPolicy}
          onChange={(e) => handleChange('cancellationPolicy', e.target.value as CancellationPolicy)}
          className={errors.cancellationPolicy ? 'input-error' : ''}
        >
          <option value="">Choose an option…</option>
          <option value="Standard">Standard</option>
          <option value="Additional Host Restrictions">Additional Host Restrictions</option>
        </select>
        {errors.cancellationPolicy && <span className="error-message">{errors.cancellationPolicy}</span>}
        <a
          href="https://www.split.lease/policies#cancellation-and-refund-policy"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-link"
        >
          Review Standard Policy
        </a>
      </div>

      {/* Guest Preferences */}
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="preferredGender">Preferred Gender</label>
          <select
            id="preferredGender"
            value={data.preferredGender}
            onChange={(e) => handleChange('preferredGender', e.target.value as GenderPreference)}
          >
            <option value="No Preference">No Preference</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other/Non Defined">Other/Non Defined</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="numberOfGuests"># of Guests</label>
          <select
            id="numberOfGuests"
            value={data.numberOfGuests}
            onChange={(e) => handleChange('numberOfGuests', parseInt(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Check-in/Check-out Times */}
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="checkInTime">Check In Time</label>
          <select
            id="checkInTime"
            value={data.checkInTime}
            onChange={(e) => handleChange('checkInTime', e.target.value)}
          >
            {checkInTimes.map((time) => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="checkOutTime">Check Out Time</label>
          <select
            id="checkOutTime"
            value={data.checkOutTime}
            onChange={(e) => handleChange('checkOutTime', e.target.value)}
          >
            {checkOutTimes.map((time) => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Ideal Rental Duration */}
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="idealMinDuration">
            Ideal rental duration (min {durationUnit})
            <span className="field-note"> (minimum 6 weeks)</span>
          </label>
          <input
            type="number"
            id="idealMinDuration"
            min="6"
            max="52"
            value={data.idealMinDuration}
            onChange={(e) => handleChange('idealMinDuration', parseInt(e.target.value) || 6)}
            className={errors.idealMinDuration ? 'input-error' : ''}
          />
          {errors.idealMinDuration && <span className="error-message">{errors.idealMinDuration}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="idealMaxDuration">
            Ideal rental duration (max {durationUnit})
            <span className="field-note"> (maximum 52 weeks)</span>
          </label>
          <input
            type="number"
            id="idealMaxDuration"
            min="6"
            max="52"
            value={data.idealMaxDuration}
            onChange={(e) => handleChange('idealMaxDuration', parseInt(e.target.value) || 52)}
            className={errors.idealMaxDuration ? 'input-error' : ''}
          />
          {errors.idealMaxDuration && <span className="error-message">{errors.idealMaxDuration}</span>}
        </div>
      </div>

      {/* House Rules */}
      <div className="form-group">
        <div className="label-with-action">
          <label>House Rules</label>
          <button type="button" className="btn-link" onClick={loadCommonRules}>
            load common house rules
          </button>
        </div>
        <div className="checkbox-grid">
          {HOUSE_RULES.map((rule) => (
            <label key={rule} className="checkbox-label">
              <input
                type="checkbox"
                checked={data.houseRules.includes(rule)}
                onChange={() => toggleHouseRule(rule)}
              />
              <span>{rule}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Block Dates - Dashboard Style Layout */}
      <div className="form-group block-dates-section">
        <label className="block-dates-label">Block Dates</label>
        <div className="availability-calendar-container">
          {/* Left Side - Instructions and Blocked Dates List */}
          <div className="availability-instructions">
            <p className="availability-description">Add or remove blocked dates by selecting a range or individual days.</p>

            <div className="availability-mode-toggle">
              <label className="availability-mode-option">
                <input
                  type="radio"
                  name="selectionMode"
                  checked={selectionMode === 'range'}
                  onChange={() => handleModeChange('range')}
                />
                <span>Range</span>
              </label>
              <label className="availability-mode-option">
                <input
                  type="radio"
                  name="selectionMode"
                  checked={selectionMode === 'individual'}
                  onChange={() => handleModeChange('individual')}
                />
                <span>Individual dates</span>
              </label>
            </div>

            {selectedStartDate && selectionMode === 'range' && (
              <p className="availability-range-hint">
                Range start selected: {selectedStartDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}. Click another date to complete the range.
              </p>
            )}

            <div className="availability-blocked-info">
              <p className="availability-blocked-title"><strong>Dates Blocked by You</strong></p>
              {data.blockedDates.length > 0 ? (
                <div className="availability-blocked-list">
                  {data.blockedDates.slice(0, 10).map((date, idx) => (
                    <span key={idx} className="availability-blocked-date">
                      {date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      <button
                        type="button"
                        className="availability-remove-date"
                        onClick={() => removeBlockedDate(date)}
                        title="Remove blocked date"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {data.blockedDates.length > 10 && (
                    <span className="availability-more-dates">
                      +{data.blockedDates.length - 10} more dates
                    </span>
                  )}
                </div>
              ) : (
                <p className="availability-no-blocked">
                  You don't have any future date blocked yet
                </p>
              )}
            </div>
          </div>

          {/* Right Side - Calendar */}
          <div className="availability-calendar">
            {/* Calendar Header */}
            <div className="month-navigation">
              <button type="button" onClick={goToPreviousMonth} className="nav-btn">
                ‹
              </button>
              <span className="current-month">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button type="button" onClick={goToNextMonth} className="nav-btn">
                ›
              </button>
            </div>

            {/* Day Headers */}
            <div className="calendar-day-headers">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Calendar Grid */}
            <div className="calendar-grid">
              {generateCalendarDays().map((date, index) => {
                if (!date) {
                  return <div key={index} className="calendar-day empty" />;
                }

                const isBlocked = isDateBlocked(date);
                const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                const isRangeStart = selectionMode === 'range' && selectedStartDate &&
                  date.toDateString() === selectedStartDate.toDateString();
                const isSelectable = !isPast;

                return (
                  <div
                    key={index}
                    className={`calendar-day ${isBlocked ? 'blocked' : ''} ${
                      isPast ? 'past' : ''
                    } ${isRangeStart ? 'range-start' : ''} ${
                      isSelectable ? 'selectable' : ''
                    }`}
                    onClick={() => isSelectable && handleDateClick(date)}
                    role={isSelectable ? 'button' : undefined}
                    tabIndex={isSelectable ? 0 : undefined}
                    onKeyDown={(e) => {
                      if (isSelectable && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        handleDateClick(date);
                      }
                    }}
                  >
                    {String(date.getDate()).padStart(2, '0')}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="calendar-legend">
              <div className="calendar-legend__item">
                <span className="calendar-legend__dot calendar-legend__dot--restricted" />
                <span>Restricted Weekly</span>
              </div>
              <div className="calendar-legend__item">
                <span className="calendar-legend__dot calendar-legend__dot--blocked" />
                <span>Blocked Manually</span>
              </div>
              <div className="calendar-legend__item">
                <span className="calendar-legend__dot calendar-legend__dot--available" />
                <span>Available</span>
              </div>
              <div className="calendar-legend__item">
                <span className="calendar-legend__dot calendar-legend__dot--first" />
                <span>First Available</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="section-navigation">
        <button type="button" className="btn-back" onClick={onBack}>
          Back
        </button>
        <button type="button" className="btn-next" onClick={handleNext}>
          Next
        </button>
      </div>
    </div>
  );
};
