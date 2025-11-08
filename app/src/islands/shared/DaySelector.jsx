import { DAY_ABBREVIATIONS } from '../../lib/constants.js';

/**
 * DaySelector - Interactive day of week selector component
 *
 * Features:
 * - Interactive day badges (S M T W T F S)
 * - Toggle selection on click
 * - Support for multiple day selection
 * - Visual indication of selected/unselected state
 * - Controlled component pattern (value prop + onChange callback)
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

  return (
    <div className={`day-selector-container ${className}`}>
      {label && <label className="day-selector-label">{label}</label>}

      <div className="day-selector">
        <div className="calendar-icon">
          <img
            src="https://c.animaapp.com/meh6k861XoGXNn/img/calendar-minimalistic-svgrepo-com-202-svg.svg"
            alt="Calendar"
            width="35"
            height="35"
          />
        </div>

        {DAY_ABBREVIATIONS.map((dayAbbr, index) => {
          const isActive = selected.includes(index);

          return (
            <div
              key={index}
              className={`day-badge ${isActive ? 'active' : ''}`}
              data-day={index}
              onClick={() => handleDayClick(index)}
              role="button"
              tabIndex={0}
              aria-pressed={isActive}
              aria-label={`${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][index]}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleDayClick(index);
                }
              }}
            >
              {dayAbbr}
            </div>
          );
        })}
      </div>
    </div>
  );
}
