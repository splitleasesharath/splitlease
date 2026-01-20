/**
 * InfoGrid Component (V7 Design)
 *
 * 5-column info grid displaying:
 * - Move-in date
 * - Move-out date
 * - Duration (weeks)
 * - Schedule (day range)
 * - Nights per week
 *
 * Responsive: 5 cols on desktop, 2 cols on mobile
 *
 * Part of the Host Proposals V7 redesign.
 */
import React from 'react';
import { getCheckInOutFromDays } from './types.js';

/**
 * Format date for display
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted date string like "Jan 15, 2026"
 */
function formatDate(date) {
  if (!date) return 'TBD';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'TBD';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Format schedule range from days selected
 * Uses getCheckInOutFromDays to properly handle wrap-around schedules
 * (e.g., Thu-Fri-Sat-Sun-Mon displays as "Thu - Mon" not "Sun - Sat")
 *
 * @param {Array} daysSelected - Array of 0-indexed days
 * @returns {string} Schedule string like "Thu - Mon"
 */
function formatScheduleRange(daysSelected) {
  if (!Array.isArray(daysSelected) || daysSelected.length === 0) return 'TBD';

  const { checkInDay, checkOutDay } = getCheckInOutFromDays(daysSelected);

  if (!checkInDay) return 'TBD';
  if (!checkOutDay || checkInDay === checkOutDay) {
    return checkInDay.slice(0, 3);
  }

  return `${checkInDay.slice(0, 3)} - ${checkOutDay.slice(0, 3)}`;
}

/**
 * Calculate nights per week from days selected
 * @param {Array} daysSelected - Array of 0-indexed days
 * @returns {string} Nights string like "4/week"
 */
function calculateNights(daysSelected) {
  if (!Array.isArray(daysSelected) || daysSelected.length === 0) return 'TBD';
  // Nights = days - 1 (guest leaves on last day)
  const nights = Math.max(0, daysSelected.length - 1);
  return `${nights}/week`;
}

/**
 * InfoGrid displays proposal details in a grid layout
 *
 * @param {Object} props
 * @param {Object} props.proposal - The proposal object
 */
export function InfoGrid({ proposal }) {
  const moveIn = proposal?.start_date || proposal?.move_in_date;
  const moveOut = proposal?.end_date || proposal?.move_out_date;
  const weeks = proposal?.duration_weeks || proposal?.weeks || proposal?.total_weeks;
  const daysSelected = proposal?.days_selected || proposal?.Days_Selected || [];

  // Calculate duration from dates if not provided
  let duration = weeks;
  if (!duration && moveIn && moveOut) {
    const start = new Date(moveIn);
    const end = new Date(moveOut);
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    duration = Math.round(diffDays / 7);
  }

  return (
    <div className="hp7-info-grid">
      <div className="hp7-info-item">
        <div className="hp7-info-label">Move-in</div>
        <div className="hp7-info-value">{formatDate(moveIn)}</div>
      </div>
      <div className="hp7-info-item">
        <div className="hp7-info-label">Move-out</div>
        <div className="hp7-info-value">{formatDate(moveOut)}</div>
      </div>
      <div className="hp7-info-item">
        <div className="hp7-info-label">Duration</div>
        <div className="hp7-info-value">{duration ? `${duration} weeks` : 'TBD'}</div>
      </div>
      <div className="hp7-info-item">
        <div className="hp7-info-label">Schedule</div>
        <div className="hp7-info-value">{formatScheduleRange(daysSelected)}</div>
      </div>
      <div className="hp7-info-item">
        <div className="hp7-info-label">Nights</div>
        <div className="hp7-info-value">{calculateNights(daysSelected)}</div>
      </div>
    </div>
  );
}

export default InfoGrid;
