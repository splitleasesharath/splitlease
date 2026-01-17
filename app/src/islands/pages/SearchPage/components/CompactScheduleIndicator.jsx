import { calculateCheckInOutFromDays } from '../../../../logic/calculators/scheduling/calculateCheckInOutFromDays.js';
import { DAY_NAMES } from '../../../../lib/dayUtils.js';

/**
 * CompactScheduleIndicator - Minimal dot-based schedule display
 * Shows when mobile header is hidden during scroll
 */
export default function CompactScheduleIndicator({ isVisible }) {
  // Get selected days from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const daysSelected = urlParams.get('days-selected') || '';

  // Parse days-selected (format: "1,2,3,4,5" where 0=Sun, 1=Mon, etc.)
  const selectedDaysArray = daysSelected
    ? daysSelected.split(',').map(d => parseInt(d, 10)).filter(d => !isNaN(d))
    : [];

  // Calculate check-in and check-out days
  const checkInOut = calculateCheckInOutFromDays(selectedDaysArray);
  const checkInText = checkInOut ? DAY_NAMES[checkInOut.checkIn] : '';
  const checkOutText = checkInOut ? DAY_NAMES[checkInOut.checkOut] : '';

  return (
    <div className={`compact-schedule-indicator ${isVisible ? 'compact-schedule-indicator--visible' : ''}`}>
      <span className="compact-schedule-text">
        {selectedDaysArray.length >= 2 ? (
          <>
            <span className="compact-label">Check-in:</span> {checkInText} • <span className="compact-label">Check-out:</span> {checkOutText}
          </>
        ) : (
          'Select days'
        )}
      </span>
      <div className="compact-schedule-dots">
        {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => (
          <div
            key={dayIndex}
            className={`compact-day-dot ${selectedDaysArray.includes(dayIndex) ? 'selected' : ''}`}
            title={DAY_NAMES[dayIndex]}
          />
        ))}
      </div>
    </div>
  );
}
