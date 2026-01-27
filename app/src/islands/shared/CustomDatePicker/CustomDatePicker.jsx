import { useState, useRef, useEffect, useCallback } from 'react';
import './CustomDatePicker.css';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * CustomDatePicker - A minimalistic date picker with slide-down animation
 *
 * @param {string} value - Selected date in YYYY-MM-DD format
 * @param {function} onChange - Callback when date is selected
 * @param {string} minDate - Minimum selectable date in YYYY-MM-DD format
 * @param {string} placeholder - Placeholder text for input
 */
export default function CustomDatePicker({
  value,
  onChange,
  minDate,
  placeholder = 'Select date'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const [year, month] = value.split('-').map(Number);
      return { year, month: month - 1 };
    }
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  });

  const containerRef = useRef(null);
  const dropdownRef = useRef(null);

  // Parse minDate for comparison
  const minDateObj = minDate ? new Date(minDate + 'T00:00:00') : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  // Get days in month
  const getDaysInMonth = useCallback((year, month) => {
    return new Date(year, month + 1, 0).getDate();
  }, []);

  // Get first day of month (0 = Sunday)
  const getFirstDayOfMonth = useCallback((year, month) => {
    return new Date(year, month, 1).getDay();
  }, []);

  // Check if date is disabled
  const isDateDisabled = useCallback((year, month, day) => {
    if (!minDateObj) return false;
    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);
    return date < minDateObj;
  }, [minDateObj]);

  // Check if date is today
  const isToday = useCallback((year, month, day) => {
    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);
    return date.getTime() === today.getTime();
  }, [today]);

  // Check if date is selected
  const isSelected = useCallback((year, month, day) => {
    if (!value) return false;
    const [selectedYear, selectedMonth, selectedDay] = value.split('-').map(Number);
    return year === selectedYear && month === selectedMonth - 1 && day === selectedDay;
  }, [value]);

  // Navigate months
  const goToPrevMonth = () => {
    setViewDate(prev => {
      if (prev.month === 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { ...prev, month: prev.month - 1 };
    });
  };

  const goToNextMonth = () => {
    setViewDate(prev => {
      if (prev.month === 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { ...prev, month: prev.month + 1 };
    });
  };

  // Handle date selection
  const handleDateClick = (day) => {
    const { year, month } = viewDate;
    if (isDateDisabled(year, month, day)) return;

    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const dateString = `${year}-${formattedMonth}-${formattedDay}`;

    onChange(dateString);
    setIsOpen(false);
  };

  // Format display value
  const getDisplayValue = () => {
    if (!value) return '';
    const [year, month, day] = value.split('-').map(Number);
    return `${MONTHS[month - 1]} ${day}, ${year}`;
  };

  // Generate calendar days
  const renderCalendarDays = () => {
    const { year, month } = viewDate;
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    // Empty cells for days before first of month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="custom-date-picker__day custom-date-picker__day--empty" />);
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const disabled = isDateDisabled(year, month, day);
      const selected = isSelected(year, month, day);
      const todayDate = isToday(year, month, day);

      const classNames = [
        'custom-date-picker__day',
        disabled && 'custom-date-picker__day--disabled',
        selected && 'custom-date-picker__day--selected',
        todayDate && !selected && 'custom-date-picker__day--today'
      ].filter(Boolean).join(' ');

      days.push(
        <button
          key={day}
          type="button"
          className={classNames}
          onClick={() => handleDateClick(day)}
          disabled={disabled}
          aria-label={`${MONTHS[month]} ${day}, ${year}`}
          aria-selected={selected}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  return (
    <div className="custom-date-picker" ref={containerRef}>
      <button
        type="button"
        className={`custom-date-picker__input ${isOpen ? 'custom-date-picker__input--active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span className={value ? 'custom-date-picker__value' : 'custom-date-picker__placeholder'}>
          {value ? getDisplayValue() : placeholder}
        </span>
        <svg
          className={`custom-date-picker__icon ${isOpen ? 'custom-date-picker__icon--rotated' : ''}`}
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
          style={{ width: 20, height: 20, minWidth: 20, minHeight: 20, flexShrink: 0 }}
        >
          <path
            d="M6 8L10 12L14 8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          className="custom-date-picker__dropdown"
          ref={dropdownRef}
          role="dialog"
          aria-label="Choose date"
        >
          <div className="custom-date-picker__header">
            <button
              type="button"
              className="custom-date-picker__nav"
              onClick={goToPrevMonth}
              aria-label="Previous month"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
                style={{ width: 16, height: 16, minWidth: 16, minHeight: 16, flexShrink: 0 }}
              >
                <path d="M12 14L8 10L12 6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span className="custom-date-picker__month-year">
              {MONTHS[viewDate.month]} {viewDate.year}
            </span>
            <button
              type="button"
              className="custom-date-picker__nav"
              onClick={goToNextMonth}
              aria-label="Next month"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
                style={{ width: 16, height: 16, minWidth: 16, minHeight: 16, flexShrink: 0 }}
              >
                <path d="M8 6L12 10L8 14" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <div className="custom-date-picker__weekdays">
            {DAYS_OF_WEEK.map(day => (
              <div key={day} className="custom-date-picker__weekday">{day}</div>
            ))}
          </div>

          <div className="custom-date-picker__grid">
            {renderCalendarDays()}
          </div>
        </div>
      )}
    </div>
  );
}
