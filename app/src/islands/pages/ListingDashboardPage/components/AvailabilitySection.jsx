import { useState } from 'react';

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

export default function AvailabilitySection({ listing, onEdit }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dateSelectionMode, setDateSelectionMode] = useState('individual'); // 'range' or 'individual'

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

    // Previous month padding
    const prevMonth = new Date(year, month, 0);
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push({
        day: prevMonth.getDate() - i,
        isCurrentMonth: false,
        isPast: true,
      });
    }

    // Current month days
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        isPast: false,
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

  const calendarDays = getCalendarDays();

  return (
    <div className="listing-dashboard-availability">
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
                readOnly
              />
              <span>-</span>
              <input
                type="number"
                value={listing?.leaseTermMax || 52}
                min={6}
                max={52}
                readOnly
              />
            </div>
          </div>

          {/* Earliest Available Date */}
          <div className="listing-dashboard-availability__field">
            <label>What is the earliest date someone could rent from you?</label>
            <input
              type="text"
              value={formatDate(listing?.earliestAvailableDate)}
              readOnly
              className="listing-dashboard-availability__date-input"
            />
          </div>

          {/* Check In/Out Times */}
          <div className="listing-dashboard-availability__times">
            <div className="listing-dashboard-availability__time-field">
              <label>Check In Time</label>
              <select value={listing?.checkInTime || '1:00 pm'} disabled>
                <option value="1:00 pm">1:00 pm</option>
                <option value="2:00 pm">2:00 pm</option>
                <option value="3:00 pm">3:00 pm</option>
                <option value="4:00 pm">4:00 pm</option>
              </select>
            </div>
            <div className="listing-dashboard-availability__time-field">
              <label>Check Out Time</label>
              <select value={listing?.checkOutTime || '1:00 pm'} disabled>
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
                  onChange={() => setDateSelectionMode('range')}
                />
                Range
              </label>
              <label>
                <input
                  type="radio"
                  name="dateMode"
                  value="individual"
                  checked={dateSelectionMode === 'individual'}
                  onChange={() => setDateSelectionMode('individual')}
                />
                Individual dates
              </label>
            </div>

            <div className="listing-dashboard-availability__info">
              <p><strong>Nights Available per week</strong></p>
              <p><strong>Dates Blocked by You</strong></p>
              <p className="listing-dashboard-availability__no-blocked">
                You don't have any future date blocked yet
              </p>
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
              {calendarDays.map((dayInfo, index) => (
                <div
                  key={index}
                  className={`listing-dashboard-availability__calendar-day ${
                    !dayInfo.isCurrentMonth ? 'listing-dashboard-availability__calendar-day--other-month' : ''
                  } ${dayInfo.isPast ? 'listing-dashboard-availability__calendar-day--past' : ''}`}
                >
                  {String(dayInfo.day).padStart(2, '0')}
                </div>
              ))}
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
