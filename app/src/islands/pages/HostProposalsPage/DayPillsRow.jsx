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

  return (
    <div className="hp7-days-row">
      <span className="hp7-days-label">Nights</span>
      <div className="hp7-days-pills">
        {DAY_LETTERS.map((letter, index) => (
          <div
            key={index}
            className={`hp7-day-pill${normalizedNights.includes(index) ? ' selected' : ''}`}
          >
            {letter}
          </div>
        ))}
      </div>
      <div className="hp7-days-info">
        <div className="hp7-days-count">
          {nightsCount} {nightsCount === 1 ? 'night' : 'nights'}
        </div>
        {rangeText && (
          <div className="hp7-days-range">{rangeText}</div>
        )}
      </div>
    </div>
  );
}

export default DayPillsRow;
