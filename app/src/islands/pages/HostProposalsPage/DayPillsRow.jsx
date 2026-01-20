/**
 * DayPillsRow Component (V7 Design)
 *
 * Visual day-of-week pills showing selected schedule:
 * - 7 pills: S M T W T F S
 * - Selected days get dark purple background
 * - Right side shows: "X days, Y nights" + "Mon check-in, Fri check-out"
 * - Hidden on mobile (display: none at 768px)
 *
 * Part of the Host Proposals V7 redesign.
 */
import React from 'react';
import { getCheckInOutFromDays } from './types.js';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * DayPillsRow displays the visual day selection
 *
 * @param {Object} props
 * @param {Array} props.daysSelected - Array of 0-indexed days (0=Sunday through 6=Saturday)
 */
export function DayPillsRow({ daysSelected = [] }) {
  // Normalize days to numbers
  const normalizedDays = (daysSelected || []).map(d => Number(d));

  // Calculate counts
  const daysCount = normalizedDays.length;
  const nightsCount = Math.max(0, daysCount - 1);

  // Get check-in/out days
  const { checkInDay, checkOutDay } = getCheckInOutFromDays(normalizedDays);

  // Format check-in/out text
  const checkInShort = checkInDay ? checkInDay.slice(0, 3) : '';
  const checkOutShort = checkOutDay ? checkOutDay.slice(0, 3) : '';
  const rangeText = checkInShort && checkOutShort
    ? `${checkInShort} check-in, ${checkOutShort} check-out`
    : '';

  return (
    <div className="hp7-days-row">
      <span className="hp7-days-label">Days</span>
      <div className="hp7-days-pills">
        {DAY_LETTERS.map((letter, index) => (
          <div
            key={index}
            className={`hp7-day-pill${normalizedDays.includes(index) ? ' selected' : ''}`}
          >
            {letter}
          </div>
        ))}
      </div>
      <div className="hp7-days-info">
        <div className="hp7-days-count">
          {daysCount} {daysCount === 1 ? 'day' : 'days'}, {nightsCount} {nightsCount === 1 ? 'night' : 'nights'}
        </div>
        {rangeText && (
          <div className="hp7-days-range">{rangeText}</div>
        )}
      </div>
    </div>
  );
}

export default DayPillsRow;
