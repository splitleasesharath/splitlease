import { calculateCheckInOutFromDays } from '../../../../logic/calculators/scheduling/calculateCheckInOutFromDays.js';

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

  // Day names for display
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Calculate check-in and check-out days (only when we have at least 2 days)
  const hasEnoughDays = selectedDaysArray.length >= 2;
  const checkInOut = hasEnoughDays ? calculateCheckInOutFromDays(selectedDaysArray) : null;
  const checkInText = checkInOut ? dayNames[checkInOut.checkIn] : '';
  const checkOutText = checkInOut ? dayNames[checkInOut.checkOut] : '';

  return (
    <div className={`compact-schedule-indicator ${isVisible ? 'compact-schedule-indicator--visible' : ''}`}>
      <span className="compact-schedule-text">
        {hasEnoughDays ? (
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
            title={dayNames[dayIndex]}
          />
        ))}
      </div>
    </div>
  );
}
