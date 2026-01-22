/**
 * DayPillsRow Component (V7 Design)
 *
 * Visual day-of-week pills showing selected NIGHTS (not days):
 * - 7 pills: S M T W T F S
 * - Selected nights get dark purple background
 * - Right side shows: "X nights" + "Thu check-in, Mon check-out"
 * - Hidden on mobile (display: none at 768px)
 *
 * For hosts, we display nights (when guest sleeps) not days (when guest is present).
 * The checkout day is NOT highlighted since the guest doesn't sleep that night.
 *
 * Part of the Host Proposals V7 redesign.
 */
import React from 'react';
import { getCheckInOutFromNights } from './types.js';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * DayPillsRow displays the visual night selection for hosts
 *
 * @param {Object} props
 * @param {Array} props.nightsSelected - Array of 0-indexed nights (0=Sunday night through 6=Saturday night)
 */
export function DayPillsRow({ nightsSelected = [] }) {
  // Normalize nights to numbers
  const normalizedNights = (nightsSelected || []).map(d => Number(d));

  // Count of nights
  const nightsCount = normalizedNights.length;

  // Get check-in/out days from nights
  const { checkInDay, checkOutDay } = getCheckInOutFromNights(normalizedNights);

  // Format check-in/out text
  const checkInShort = checkInDay ? checkInDay.slice(0, 3) : '';
  const checkOutShort = checkOutDay ? checkOutDay.slice(0, 3) : '';
  const rangeText = checkInShort && checkOutShort
    ? `${checkInShort} check-in, ${checkOutShort} check-out`
    : '';

  // Build accessible description of selected nights
  const selectedNightNames = normalizedNights.map(n => DAY_NAMES[n]).join(', ');
  const ariaDescription = nightsCount > 0
    ? `${nightsCount} ${nightsCount === 1 ? 'night' : 'nights'} selected: ${selectedNightNames}`
    : 'No nights selected';

  // Generate unique ID for this instance
  const labelId = `days-label-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="hp7-days-row" role="group" aria-label="Selected days of the week">
      <span className="hp7-days-label" id={labelId}>Days</span>
      <div className="hp7-days-pills" aria-labelledby={labelId}>
        {DAY_LETTERS.map((letter, index) => {
          const isSelected = normalizedNights.includes(index);
          const dayName = DAY_NAMES[index];
          return (
            <span
              key={index}
              className={`hp7-day-pill${isSelected ? ' selected' : ''}`}
              aria-pressed={isSelected}
              aria-label={isSelected ? `${dayName}, selected` : dayName}
            >
              {letter}
            </span>
          );
        })}
      </div>
      <div className="hp7-days-info">
        <div className="hp7-days-count">{nightsCount} days, {Math.max(0, nightsCount - 1)} nights</div>
        {rangeText && (
          <div className="hp7-days-range">{rangeText}</div>
        )}
      </div>
    </div>
  );
}

export default DayPillsRow;
