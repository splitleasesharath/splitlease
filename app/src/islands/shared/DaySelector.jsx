import { DAY_ABBREVIATIONS, DAY_NAMES } from '../../lib/constants.js';

/**
 * DaySelector - Interactive day of week selector component with gradient design
 *
 * PORTED FROM ORIGINAL: Matches the beautiful purple gradient card design
 * from input/search/components/ScheduleSelector/SearchScheduleSelector.styles.ts
 *
 * Features:
 * - Purple gradient card wrapper (135deg, #667eea to #764ba2)
 * - Interactive day badges (S M T W T F S)
 * - Check-in/Check-out display
 * - Clear selection button
 * - Visual indication of selected/unselected state
 *
 * Day numbering (matching constants.js):
 * - Sunday = 0, Monday = 1, Tuesday = 2, Wednesday = 3, Thursday = 4, Friday = 5, Saturday = 6
 *
 * @param {Object} props
 * @param {number[]} props.selected - Array of selected day numbers (0-6, where 0=Sunday)
 * @param {Function} props.onChange - Callback function: (selectedDays: number[]) => void
 * @param {string} [props.label] - Optional label text to display above selector
 * @param {string} [props.className] - Optional additional CSS classes
 * @returns {JSX.Element}
 */
export default function DaySelector(props) {
  const { selected = [], onChange, label, className = '' } = props;

  const handleDayClick = (dayIndex) => {
    if (!onChange) return;

    const isSelected = selected.includes(dayIndex);
    let newSelected;

    if (isSelected) {
      // Remove day if already selected
      newSelected = selected.filter(day => day !== dayIndex);
    } else {
      // Add day if not selected, then sort
      newSelected = [...selected, dayIndex].sort((a, b) => a - b);
    }

    onChange(newSelected);
  };

  const handleClearSelection = () => {
    if (onChange) {
      onChange([]);
    }
  };

  // Calculate check-in and check-out days
  const getCheckInCheckOut = () => {
    if (selected.length === 0) {
      return { checkIn: null, checkOut: null };
    }

    const sortedDays = [...selected].sort((a, b) => a - b);
    const checkIn = DAY_NAMES[sortedDays[0]];
    const checkOut = DAY_NAMES[sortedDays[sortedDays.length - 1]];

    return { checkIn, checkOut };
  };

  const { checkIn, checkOut } = getCheckInCheckOut();

  return (
    <div className={`day-selector-wrapper ${className}`}>
      {label && <label className="day-selector-label">{label}</label>}

      {/* Purple Gradient Card - Ported from original */}
      <div className="schedule-selector-card">
        <div className="schedule-selector-row">
          {/* Calendar Icon */}
          <div className="calendar-icon">
            📅
          </div>

          {/* Days Grid */}
          <div className="days-grid">
            {DAY_ABBREVIATIONS.map((dayAbbr, index) => {
              const isActive = selected.includes(index);

              return (
                <button
                  key={index}
                  className={`day-cell ${isActive ? 'selected' : ''}`}
                  data-day={index}
                  onClick={() => handleDayClick(index)}
                  type="button"
                  aria-pressed={isActive}
                  aria-label={DAY_NAMES[index]}
                >
                  {dayAbbr}
                </button>
              );
            })}
          </div>
        </div>

        {/* Check-in/Check-out Display - Ported from original */}
        {selected.length > 0 && (
          <div className="info-container">
            <div className="info-text">
              Check-in: <strong>{checkIn}</strong> • Check-out: <strong>{checkOut}</strong>
            </div>
            <button
              className="reset-button"
              onClick={handleClearSelection}
              type="button"
            >
              Clear selection
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
