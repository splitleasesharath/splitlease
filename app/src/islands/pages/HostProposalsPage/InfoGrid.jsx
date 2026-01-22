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
 * Shows checkout day with "(check-out)" indicator
 *
 * @param {Array} daysSelected - Array of 0-indexed days
 * @returns {string} Schedule string like "Thu - Mon (check-out)"
 */
function formatScheduleRange(daysSelected) {
  if (!Array.isArray(daysSelected) || daysSelected.length === 0) return 'TBD';

  const { checkInDay, checkOutDay } = getCheckInOutFromDays(daysSelected);

  if (!checkInDay) return 'TBD';
  if (!checkOutDay || checkInDay === checkOutDay) {
    return checkInDay.slice(0, 3);
  }

  return `${checkInDay.slice(0, 3)} - ${checkOutDay.slice(0, 3)} (check-out)`;
}

/**
 * Get nights per week count
 * Uses nights_selected directly if available, otherwise calculates from days
 * @param {Object} proposal - The proposal object
 * @returns {string} Nights string like "4/week"
 */
function getNightsPerWeek(proposal) {
  // Try to get nights directly from the proposal
  const nightsSelected = proposal?.nights_selected || proposal?.['Nights Selected (Nights list)'] || [];
  if (Array.isArray(nightsSelected) && nightsSelected.length > 0) {
    return `${nightsSelected.length}/week`;
  }

  // Fall back to calculating from days_selected
  const daysSelected = proposal?.days_selected || proposal?.Days_Selected || [];
  if (!Array.isArray(daysSelected) || daysSelected.length === 0) return 'TBD';
  // Nights = days - 1 (guest leaves on last day)
  const nights = Math.max(0, daysSelected.length - 1);
  return `${nights}/week`;
}

/**
 * InfoGrid displays proposal details in a grid layout
 * Uses semantic definition list (dl/dt/dd) for screen reader accessibility
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
    <dl className="hp7-info-grid">
      <div className="hp7-info-item">
        <dt className="hp7-info-label">Move-in</dt>
        <dd className="hp7-info-value">{formatDate(moveIn)}</dd>
      </div>
      <div className="hp7-info-item">
        <dt className="hp7-info-label">Move-out</dt>
        <dd className="hp7-info-value">{formatDate(moveOut)}</dd>
      </div>
      <div className="hp7-info-item">
        <dt className="hp7-info-label">Duration</dt>
        <dd className="hp7-info-value">{duration ? `${duration} weeks` : 'TBD'}</dd>
      </div>
      <div className="hp7-info-item">
        <dt className="hp7-info-label">Schedule</dt>
        <dd className="hp7-info-value">{formatScheduleRange(daysSelected)}</dd>
      </div>
      <div className="hp7-info-item">
        <dt className="hp7-info-label">Nights</dt>
        <dd className="hp7-info-value">{getNightsPerWeek(proposal)}</dd>
      </div>
    </dl>
  );
}

export default InfoGrid;
