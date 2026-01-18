import { useState, useCallback, useMemo } from 'react';
import { useListingDashboard } from '../context/ListingDashboardContext';

// Calendar navigation icons
const ChevronLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 18-6-6 6-6" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Helper to format date as YYYY-MM-DD
const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to get all dates between two dates (inclusive)
const getDatesBetween = (startDate, endDate) => {
  const dates = [];
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
    dates.push(formatDateKey(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

// Format date for date input (YYYY-MM-DD)
const formatDateForInput = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

export default function AvailabilitySection() {
  const { listing, handleEditSection, handleBlockedDatesChange, handleAvailabilityChange } = useListingDashboard();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dateSelectionMode, setDateSelectionMode] = useState('individual'); // 'range' or 'individual'

  // State for blocked dates - initialize from listing
  const [blockedDates, setBlockedDates] = useState(() => {
    return listing?.blockedDates || [];
  });

  // State for range selection (stores the first click while waiting for second)
  const [rangeStart, setRangeStart] = useState(null);

  // State for showing all blocked dates
  const [showAllBlockedDates, setShowAllBlockedDates] = useState(false);

  // State for showing past blocked dates (collapsed by default)
  const [showPastBlockedDates, setShowPastBlockedDates] = useState(false);

  // Format date for display
  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  // Get calendar days for current month
  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days = [];

    // Today reference for past-date comparison (moved before previous month loop)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Previous month padding
    const prevMonth = new Date(year, month, 0);
    const prevMonthYear = prevMonth.getFullYear();
    const prevMonthMonth = prevMonth.getMonth();
    for (let i = startPadding - 1; i >= 0; i--) {
      const dayNum = prevMonth.getDate() - i;
      const date = new Date(prevMonthYear, prevMonthMonth, dayNum);
      days.push({
        day: dayNum,
        isCurrentMonth: false,
        isPast: date < today,
        date: date,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({
        day: i,
        isCurrentMonth: true,
        isPast: date < today,
        date: date,
      });
    }

    // Next month padding
    const remaining = 42 - days.length; // 6 rows * 7 days
    const nextMonthYear = month === 11 ? year + 1 : year;
    const nextMonthMonth = month === 11 ? 0 : month + 1;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(nextMonthYear, nextMonthMonth, i);
      days.push({
        day: i,
        isCurrentMonth: false,
        isPast: false,
        date: date,
      });
    }

    return days;
  };

  const navigateMonth = (direction) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  // Check if a date is blocked
  const isDateBlocked = useCallback((date) => {
    if (!date) return false;
    const dateKey = formatDateKey(date);
    return blockedDates.includes(dateKey);
  }, [blockedDates]);

  // Toggle a blocked date (add if not present, remove if present)
  const toggleBlockedDate = useCallback((dateKey) => {
    setBlockedDates((prev) => {
      const newBlockedDates = prev.includes(dateKey)
        ? prev.filter((d) => d !== dateKey)
        : [...prev, dateKey];

      // Notify parent component of the change
      if (handleBlockedDatesChange) {
        handleBlockedDatesChange(newBlockedDates);
      }

      return newBlockedDates;
    });
  }, [handleBlockedDatesChange]);

  // Add multiple dates to blocked list
  const addBlockedDates = useCallback((datesToAdd) => {
    setBlockedDates((prev) => {
      // Filter out dates that are already blocked
      const newDates = datesToAdd.filter((d) => !prev.includes(d));
      const newBlockedDates = [...prev, ...newDates];

      // Notify parent component of the change
      if (handleBlockedDatesChange) {
        handleBlockedDatesChange(newBlockedDates);
      }

      return newBlockedDates;
    });
  }, [handleBlockedDatesChange]);

  // Handle date click
  const handleDateClick = useCallback((dayInfo) => {
    console.log('📅 Date clicked:', dayInfo, 'isOverflow:', !dayInfo.isCurrentMonth);

    // Don't allow clicking on past dates or dates without valid Date objects
    if (dayInfo.isPast || !dayInfo.date) {
      console.log('📅 Click ignored: past date or missing date object');
      return;
    }

    const dateKey = formatDateKey(dayInfo.date);
    console.log('📅 Date key:', dateKey, 'Mode:', dateSelectionMode);

    if (dateSelectionMode === 'individual') {
      // Individual mode: toggle the clicked date
      console.log('📅 Individual mode: toggling date', dateKey);
      toggleBlockedDate(dateKey);
    } else {
      // Range mode: wait for two clicks
      if (!rangeStart) {
        // First click: set the start of the range
        console.log('📅 Range mode: setting start date', dayInfo.date);
        setRangeStart(dayInfo.date);
      } else {
        // Second click: block all dates in the range
        const rangeDates = getDatesBetween(rangeStart, dayInfo.date);
        console.log('📅 Range mode: blocking dates', rangeDates);
        addBlockedDates(rangeDates);
        // Reset range start for next selection
        setRangeStart(null);
      }
    }
  }, [dateSelectionMode, rangeStart, toggleBlockedDate, addBlockedDates]);

  // Check if a date is within the pending range (when rangeStart is set)
  const isInPendingRange = useCallback((date) => {
    if (!rangeStart || !date || dateSelectionMode !== 'range') return false;
    const dateKey = formatDateKey(date);
    const startKey = formatDateKey(rangeStart);
    return dateKey === startKey;
  }, [rangeStart, dateSelectionMode]);

  // Get future blocked dates for display
  const allFutureBlockedDates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = formatDateKey(today);

    return blockedDates
      .filter((dateKey) => dateKey >= todayKey)
      .sort();
  }, [blockedDates]);

  // Get past blocked dates (for expandable history section)
  const pastBlockedDates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = formatDateKey(today);

    return blockedDates
      .filter((dateKey) => dateKey < todayKey)
      .sort()
      .reverse(); // Most recent past dates first
  }, [blockedDates]);

  // Dates to display (limited or all based on showAllBlockedDates)
  const displayedBlockedDates = useMemo(() => {
    if (showAllBlockedDates) {
      return allFutureBlockedDates;
    }
    return allFutureBlockedDates.slice(0, 10);
  }, [allFutureBlockedDates, showAllBlockedDates]);

  const hasMoreDates = allFutureBlockedDates.length > 10;

  // Reset range start when switching modes
  const handleModeChange = (mode) => {
    setDateSelectionMode(mode);
    setRangeStart(null);
  };

  const calendarDays = getCalendarDays();

  return (
    <div id="availability" className="listing-dashboard-availability">
      {/* First Availability Section - Settings */}
      <div className="listing-dashboard-section">
        <div className="listing-dashboard-section__header">
          <h2 className="listing-dashboard-section__title">Listing Availability</h2>
        </div>

        <div className="listing-dashboard-availability__settings">
          {/* Lease Term */}
          <div className="listing-dashboard-availability__field">
            <label>What is the ideal Lease Term? (Enter between 6 and 52 weeks.)</label>
            <div className="listing-dashboard-availability__range-inputs">
              <input
                type="number"
                value={listing?.leaseTermMin || 6}
                min={6}
                max={52}
                onChange={(e) => {
                  const val = Math.min(52, Math.max(6, parseInt(e.target.value) || 6));
                  handleAvailabilityChange?.('leaseTermMin', val);
                }}
              />
              <span>-</span>
              <input
                type="number"
                value={listing?.leaseTermMax || 52}
                min={6}
                max={52}
                onChange={(e) => {
                  const val = Math.min(52, Math.max(6, parseInt(e.target.value) || 52));
                  handleAvailabilityChange?.('leaseTermMax', val);
                }}
              />
            </div>
          </div>

          {/* Earliest Available Date */}
          <div className="listing-dashboard-availability__field">
            <label>What is the earliest date someone could rent from you?</label>
            <input
              type="date"
              value={formatDateForInput(listing?.earliestAvailableDate)}
              className="listing-dashboard-availability__date-input"
              onChange={(e) => handleAvailabilityChange?.('earliestAvailableDate', e.target.value)}
            />
          </div>

          {/* Check In/Out Times */}
          <div className="listing-dashboard-availability__times">
            <div className="listing-dashboard-availability__time-field">
              <label>Check In Time</label>
              <select
                value={listing?.checkInTime || '1:00 pm'}
                onChange={(e) => handleAvailabilityChange?.('checkInTime', e.target.value)}
              >
                <option value="12:00 pm">12:00 pm</option>
                <option value="1:00 pm">1:00 pm</option>
                <option value="2:00 pm">2:00 pm</option>
                <option value="3:00 pm">3:00 pm</option>
                <option value="4:00 pm">4:00 pm</option>
                <option value="5:00 pm">5:00 pm</option>
              </select>
            </div>
            <div className="listing-dashboard-availability__time-field">
              <label>Check Out Time</label>
              <select
                value={listing?.checkOutTime || '11:00 am'}
                onChange={(e) => handleAvailabilityChange?.('checkOutTime', e.target.value)}
              >
                <option value="9:00 am">9:00 am</option>
                <option value="10:00 am">10:00 am</option>
                <option value="11:00 am">11:00 am</option>
                <option value="12:00 pm">12:00 pm</option>
                <option value="1:00 pm">1:00 pm</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Second Availability Section - Calendar */}
      <div className="listing-dashboard-section">
        <div className="listing-dashboard-section__header">
          <h2 className="listing-dashboard-section__title">Listing Availability</h2>
        </div>

        <div className="listing-dashboard-availability__calendar-container">
          {/* Left Side - Instructions */}
          <div className="listing-dashboard-availability__instructions">
            <p>Add or remove blocked dates by selecting a range or individual days.</p>

            <div className="listing-dashboard-availability__mode-toggle">
              <label>
                <input
                  type="radio"
                  name="dateMode"
                  value="range"
                  checked={dateSelectionMode === 'range'}
                  onChange={() => handleModeChange('range')}
                />
                Range
              </label>
              <label>
                <input
                  type="radio"
                  name="dateMode"
                  value="individual"
                  checked={dateSelectionMode === 'individual'}
                  onChange={() => handleModeChange('individual')}
                />
                Individual dates
              </label>
            </div>

            {rangeStart && dateSelectionMode === 'range' && (
              <p className="listing-dashboard-availability__range-hint">
                Range start selected: {formatDate(rangeStart)}. Click another date to complete the range.
              </p>
            )}

            <div className="listing-dashboard-availability__info">
              <p><strong>Dates Blocked by You</strong></p>
              {allFutureBlockedDates.length > 0 ? (
                <div className="listing-dashboard-availability__blocked-list">
                  {displayedBlockedDates.map((dateKey) => (
                    <span key={dateKey} className="listing-dashboard-availability__blocked-date">
                      {new Date(dateKey + 'T00:00:00').toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      <button
                        type="button"
                        className="listing-dashboard-availability__remove-date"
                        onClick={() => toggleBlockedDate(dateKey)}
                        title="Remove blocked date"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {hasMoreDates && !showAllBlockedDates && (
                    <button
                      type="button"
                      className="listing-dashboard-availability__more-dates-btn"
                      onClick={() => setShowAllBlockedDates(true)}
                    >
                      +{allFutureBlockedDates.length - 10} more dates
                    </button>
                  )}
                  {showAllBlockedDates && hasMoreDates && (
                    <button
                      type="button"
                      className="listing-dashboard-availability__more-dates-btn"
                      onClick={() => setShowAllBlockedDates(false)}
                    >
                      Show less
                    </button>
                  )}
                </div>
              ) : (
                <p className="listing-dashboard-availability__no-blocked">
                  You don't have any future date blocked yet
                </p>
              )}

              {/* Past blocked dates - expandable section */}
              {pastBlockedDates.length > 0 && (
                <div className="listing-dashboard-availability__past-dates">
                  <button
                    type="button"
                    className="listing-dashboard-availability__past-dates-toggle"
                    onClick={() => setShowPastBlockedDates(!showPastBlockedDates)}
                  >
                    <span>{showPastBlockedDates ? '▼' : '▶'}</span>
                    <span>Past blocked dates ({pastBlockedDates.length})</span>
                  </button>
                  {showPastBlockedDates && (
                    <div className="listing-dashboard-availability__blocked-list listing-dashboard-availability__blocked-list--past">
                      {pastBlockedDates.map((dateKey) => (
                        <span key={dateKey} className="listing-dashboard-availability__blocked-date listing-dashboard-availability__blocked-date--past">
                          {new Date(dateKey + 'T00:00:00').toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Calendar */}
          <div className="listing-dashboard-availability__calendar">
            {/* Calendar Header */}
            <div className="listing-dashboard-availability__calendar-header">
              <button onClick={() => navigateMonth(-1)}>
                <ChevronLeftIcon />
              </button>
              <span>{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
              <button onClick={() => navigateMonth(1)}>
                <ChevronRightIcon />
              </button>
            </div>

            {/* Day Headers */}
            <div className="listing-dashboard-availability__day-headers">
              {DAY_HEADERS.map((day) => (
                <div key={day} className="listing-dashboard-availability__day-header">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="listing-dashboard-availability__calendar-grid">
              {calendarDays.map((dayInfo, index) => {
                const isBlocked = dayInfo.date && isDateBlocked(dayInfo.date);
                const isRangeStartDate = isInPendingRange(dayInfo.date);
                const isSelectable = !dayInfo.isPast && dayInfo.date;

                return (
                  <div
                    key={index}
                    className={`listing-dashboard-availability__calendar-day ${
                      !dayInfo.isCurrentMonth ? 'listing-dashboard-availability__calendar-day--other-month' : ''
                    } ${dayInfo.isPast ? 'listing-dashboard-availability__calendar-day--past' : ''
                    } ${isBlocked ? 'listing-dashboard-availability__calendar-day--blocked' : ''
                    } ${isRangeStartDate ? 'listing-dashboard-availability__calendar-day--range-start' : ''
                    } ${isSelectable ? 'listing-dashboard-availability__calendar-day--selectable' : ''}`}
                    onClick={() => handleDateClick(dayInfo)}
                    role={isSelectable ? 'button' : undefined}
                    tabIndex={isSelectable ? 0 : undefined}
                    onKeyDown={(e) => {
                      if (isSelectable && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        handleDateClick(dayInfo);
                      }
                    }}
                  >
                    {String(dayInfo.day).padStart(2, '0')}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="listing-dashboard-availability__legend">
              <div className="listing-dashboard-availability__legend-item">
                <span className="listing-dashboard-availability__legend-dot listing-dashboard-availability__legend-dot--restricted" />
                <span>Restricted Weekly</span>
              </div>
              <div className="listing-dashboard-availability__legend-item">
                <span className="listing-dashboard-availability__legend-dot listing-dashboard-availability__legend-dot--blocked" />
                <span>Blocked Manually</span>
              </div>
              <div className="listing-dashboard-availability__legend-item">
                <span className="listing-dashboard-availability__legend-dot listing-dashboard-availability__legend-dot--available" />
                <span>Available</span>
              </div>
              <div className="listing-dashboard-availability__legend-item">
                <span className="listing-dashboard-availability__legend-dot listing-dashboard-availability__legend-dot--first" />
                <span>First Available</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
