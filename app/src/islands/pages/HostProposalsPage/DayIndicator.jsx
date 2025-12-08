/**
 * DayIndicator Component
 *
 * Visual indicator showing which days of the week are active
 * in a proposal's schedule.
 */

import { DAYS } from './types.js';

/**
 * @param {Object} props
 * @param {string[]} props.activeDays - Array of active day names
 * @param {'small' | 'medium' | 'large'} [props.size='small'] - Size variant
 */
export default function DayIndicator({ activeDays = [], size = 'small' }) {
  return (
    <div className={`day-indicator day-indicator--${size}`}>
      {DAYS.map((day, index) => {
        const isActive = activeDays.includes(day.full);
        return (
          <div
            key={index}
            className={`day-box ${isActive ? 'active' : ''}`}
            title={day.full}
          >
            {size !== 'small' && <span className="day-label">{day.short}</span>}
          </div>
        );
      })}
    </div>
  );
}
