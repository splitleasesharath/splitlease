import React, { useState, useRef } from 'react';
import type { Rules, CancellationPolicy, GenderPreference, RentalType } from '../types/listing.types';
import { HOUSE_RULES } from '../types/listing.types';

interface Section5Props {
  data: Rules;
  rentalType: RentalType;
  onChange: (data: Rules) => void;
  onNext: () => void;
  onBack: () => void;
}

export const Section5Rules: React.FC<Section5Props> = ({ data, rentalType, onChange, onNext, onBack }) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectionMode, setSelectionMode] = useState<'individual' | 'range'>('range');
  const [tempSelectedDates, setTempSelectedDates] = useState<Date[]>([]);
  const datePickerRef = useRef<HTMLDivElement>(null);

  const handleChange = (field: keyof Rules, value: any) => {
    onChange({ ...data, [field]: value });
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  const toggleHouseRule = (rule: string) => {
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

  const handleAddDates = () => {
    if (selectionMode === 'range') {
      if (!selectedStartDate) return;

      const endDate = selectedEndDate || selectedStartDate;
      const dates: Date[] = [];
      const currentDate = new Date(selectedStartDate);

      while (currentDate <= endDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      handleChange('blockedDates', [...data.blockedDates, ...dates]);
    } else {
      // Individual mode
      handleChange('blockedDates', [...data.blockedDates, ...tempSelectedDates]);
    }

    // Reset state
    setShowDatePicker(false);
    setSelectedStartDate(null);
    setSelectedEndDate(null);
    setTempSelectedDates([]);
  };

  const handleDateClick = (date: Date) => {
    if (selectionMode === 'range') {
      if (!selectedStartDate) {
        setSelectedStartDate(date);
      } else if (!selectedEndDate) {
        if (date >= selectedStartDate) {
          setSelectedEndDate(date);
        } else {
          setSelectedStartDate(date);
          setSelectedEndDate(null);
        }
      } else {
        setSelectedStartDate(date);
        setSelectedEndDate(null);
      }
    } else {
      // Individual mode - toggle date selection
      const dateStr = date.toDateString();
      const isSelected = tempSelectedDates.some((d) => d.toDateString() === dateStr);

      if (isSelected) {
        setTempSelectedDates(tempSelectedDates.filter((d) => d.toDateString() !== dateStr));
      } else {
        setTempSelectedDates([...tempSelectedDates, date]);
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
    setSelectedEndDate(null);
    setTempSelectedDates([]);
  };

  const isDateBlocked = (date: Date) => {
    return data.blockedDates.some(
      (blocked) => blocked.toDateString() === date.toDateString()
    );
  };

  const isDateInRange = (date: Date) => {
    if (selectionMode === 'individual') {
      return tempSelectedDates.some((d) => d.toDateString() === date.toDateString());
    }

    if (!selectedStartDate) return false;
    if (!selectedEndDate) return date.toDateString() === selectedStartDate.toDateString();
    return date >= selectedStartDate && date <= selectedEndDate;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!data.cancellationPolicy) {
      newErrors.cancellationPolicy = 'Cancellation policy is required';
    }

    if (data.idealMinDuration > data.idealMaxDuration) {
      newErrors.idealMaxDuration = 'Maximum duration must be greater than or equal to minimum';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) {
      onNext();
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
          <label htmlFor="idealMinDuration">Ideal rental duration (min {durationUnit})</label>
          <input
            type="number"
            id="idealMinDuration"
            min="2"
            max="12"
            value={data.idealMinDuration}
            onChange={(e) => handleChange('idealMinDuration', parseInt(e.target.value))}
          />
        </div>

        <div className="form-group">
          <label htmlFor="idealMaxDuration">Ideal rental duration (max {durationUnit})</label>
          <input
            type="number"
            id="idealMaxDuration"
            min="2"
            max="12"
            value={data.idealMaxDuration}
            onChange={(e) => handleChange('idealMaxDuration', parseInt(e.target.value))}
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

      {/* Block Dates */}
      <div className="form-group block-dates-section">
        <div className="block-dates-layout">
          {/* Left side - Info and Button */}
          <div className="block-dates-left">
            <label className="block-dates-label">Block Dates</label>
            <p className="block-dates-description">Select dates when your property will not be available</p>
            <button
              type="button"
              className="btn-secondary add-date-btn"
              onClick={() => setShowDatePicker(!showDatePicker)}
            >
              {showDatePicker ? 'Close Calendar' : 'Add Date'}
            </button>

            {/* Blocked dates list */}
            {data.blockedDates.length > 0 && (
              <div className="blocked-dates-list">
                <h5>Blocked Dates ({data.blockedDates.length})</h5>
                <div className="blocked-dates-items">
                  {data.blockedDates.slice(0, 5).map((date, idx) => (
                    <div key={idx} className="blocked-date-item">
                      {date.toLocaleDateString()}
                      <button
                        type="button"
                        onClick={() => removeBlockedDate(date)}
                        className="remove-date-btn"
                        title="Remove date"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {data.blockedDates.length > 5 && (
                    <p className="more-dates">+{data.blockedDates.length - 5} more</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right side - Calendar (desktop inline, mobile popup) */}
          {showDatePicker && (
            <>
              {/* Mobile overlay - only on mobile */}
              <div className="modal-overlay mobile-only" onClick={() => setShowDatePicker(false)} />

              {/* Calendar container - popup on mobile, inline on desktop */}
              <div className="date-picker-container" ref={datePickerRef}>
              <div className="date-picker-header">
                <h4>Block Dates</h4>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setShowDatePicker(false)}
                  title="Close"
                >
                  ✕
                </button>
              </div>

              {/* Selection Mode Toggle */}
              <div className="selection-mode-toggle">
                <label className="mode-option">
                  <input
                    type="radio"
                    name="selectionMode"
                    checked={selectionMode === 'range'}
                    onChange={() => handleModeChange('range')}
                  />
                  <span>Range Selection</span>
                </label>
                <label className="mode-option">
                  <input
                    type="radio"
                    name="selectionMode"
                    checked={selectionMode === 'individual'}
                    onChange={() => handleModeChange('individual')}
                  />
                  <span>Individual Dates</span>
                </label>
              </div>

              <p className="date-picker-instructions">
                {selectionMode === 'range'
                  ? 'Click a start date, then click an end date to select a range'
                  : 'Click to select individual dates'}
              </p>

              {/* Month Navigation */}
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

              {/* Selected Display */}
              {((selectionMode === 'range' && selectedStartDate) ||
                (selectionMode === 'individual' && tempSelectedDates.length > 0)) && (
                <div className="selected-range-display">
                  <strong>Selected:</strong>{' '}
                  {selectionMode === 'range' ? (
                    <>
                      {selectedStartDate?.toLocaleDateString()}
                      {selectedEndDate && ` - ${selectedEndDate.toLocaleDateString()}`}
                    </>
                  ) : (
                    `${tempSelectedDates.length} date${tempSelectedDates.length !== 1 ? 's' : ''}`
                  )}
                </div>
              )}

              {/* Calendar Grid with Day Headers */}
              <div className="calendar-container">
                <div className="calendar-day-headers">
                  <div>Sun</div>
                  <div>Mon</div>
                  <div>Tue</div>
                  <div>Wed</div>
                  <div>Thu</div>
                  <div>Fri</div>
                  <div>Sat</div>
                </div>
                <div className="calendar-grid">
                  {generateCalendarDays().map((date, index) => {
                    if (!date) {
                      return <div key={index} className="calendar-day empty" />;
                    }

                    const isBlocked = isDateBlocked(date);
                    const isInRange = isDateInRange(date);
                    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

                    return (
                      <button
                        key={index}
                        type="button"
                        className={`calendar-day ${isBlocked ? 'blocked' : ''} ${
                          isInRange ? 'in-range' : ''
                        } ${isPast ? 'past' : ''}`}
                        onClick={() => !isPast && !isBlocked && handleDateClick(date)}
                        disabled={isPast || isBlocked}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="date-picker-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowDatePicker(false);
                    setSelectedStartDate(null);
                    setSelectedEndDate(null);
                    setTempSelectedDates([]);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleAddDates}
                  disabled={
                    (selectionMode === 'range' && !selectedStartDate) ||
                    (selectionMode === 'individual' && tempSelectedDates.length === 0)
                  }
                >
                  Add Blocked Dates
                </button>
              </div>
            </div>
          </>
        )}
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
