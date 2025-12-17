/**
 * ProposalCard Component
 *
 * Card displaying proposal summary in the grid view.
 */

import DayIndicator from './DayIndicator.jsx';
import { getStatusTagInfo, getActiveDays } from './types.js';
import { formatCurrency, formatDate } from './formatters.js';

/**
 * Status icon SVG components
 */
function ClockIcon() {
  return (
    <svg className="status-icon" width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <path d="M7 0C3.13 0 0 3.13 0 7C0 10.87 3.13 14 7 14C10.87 14 14 10.87 14 7C14 3.13 10.87 0 7 0ZM7 12.6C3.91 12.6 1.4 10.09 1.4 7C1.4 3.91 3.91 1.4 7 1.4C10.09 1.4 12.6 3.91 12.6 7C12.6 10.09 10.09 12.6 7 12.6ZM7.35 3.5H6.3V7.7L9.94 9.87L10.5 8.96L7.35 7.14V3.5Z"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="status-icon" width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <path d="M5.25 9.45L2.8 7L1.855 7.945L5.25 11.34L12.25 4.34L11.305 3.395L5.25 9.45Z"/>
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="status-icon" width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <path d="M7 0C3.13 0 0 3.13 0 7C0 10.87 3.13 14 7 14C10.87 14 14 10.87 14 7C14 3.13 10.87 0 7 0ZM10.5 9.59L9.59 10.5L7 7.91L4.41 10.5L3.5 9.59L6.09 7L3.5 4.41L4.41 3.5L7 6.09L9.59 3.5L10.5 4.41L7.91 7L10.5 9.59Z"/>
    </svg>
  );
}

/**
 * @param {Object} props
 * @param {Object} props.proposal - Proposal data
 * @param {Function} props.onClick - Callback when card is clicked
 * @param {Function} [props.onDelete] - Callback to delete proposal
 */
export default function ProposalCard({ proposal, onClick, onDelete }) {
  const status = proposal.status || proposal.Status || {};
  const statusId = status.id || status._id || status;
  const statusInfo = getStatusTagInfo(status);

  const isCancelled = ['cancelled_by_guest', 'cancelled_by_splitlease', 'rejected_by_host'].includes(statusId);

  // Get guest info - handle both Bubble and local formats
  const guest = proposal.guest || proposal.Guest || proposal['Created By'] || {};
  const guestName = guest.firstName || guest['Name - First'] || guest['First Name'] || guest.first_name || '';

  // Get listing info
  const listing = proposal.listing || proposal.Listing || {};
  const listingDescription = listing.description || listing.Description || listing['Listing Name'] || 'Restored apartment with amenities';

  // Helper to convert Bubble day indices (1-7) or numeric strings to day names
  // Handles: numbers (1-7), numeric strings ("1"-"7"), or day name strings ("Monday")
  const bubbleDayToName = (bubbleDay) => {
    const dayNames = ['', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    if (bubbleDay === null || bubbleDay === undefined) return '';

    // If it's already a number, use it directly
    if (typeof bubbleDay === 'number') {
      return dayNames[bubbleDay] || '';
    }

    // If it's a string, check if it's a numeric string
    if (typeof bubbleDay === 'string') {
      const trimmed = bubbleDay.trim();
      const numericValue = parseInt(trimmed, 10);

      // If it parses to a valid number and matches the original string, it's a numeric string
      if (!isNaN(numericValue) && String(numericValue) === trimmed) {
        return dayNames[numericValue] || '';
      }

      // Otherwise it's already a day name string
      return trimmed;
    }

    return '';
  };

  // Get schedule info
  const checkInDayRaw = proposal.checkInDay || proposal['check in day'] || proposal['Check In Day'] || proposal.check_in_day || 'Monday';
  const checkOutDayRaw = proposal.checkOutDay || proposal['check out day'] || proposal['Check Out Day'] || proposal.check_out_day || 'Friday';
  const checkInDay = bubbleDayToName(checkInDayRaw);
  const checkOutDay = bubbleDayToName(checkOutDayRaw);
  const moveInRangeStart = proposal.moveInRangeStart || proposal['Move in range start'] || proposal['Move In Range Start'] || proposal.move_in_range_start;
  const reservationSpanWeeks = proposal.reservationSpanWeeks || proposal['Reservation Span (Weeks)'] || proposal['Reservation Span (weeks)'] || proposal.reservation_span_weeks || 0;

  // Get pricing info
  // "host compensation" is the per-night HOST rate (from listing pricing tiers)
  // "Total Compensation (proposal - host)" is the total = per-night rate * nights * weeks
  const hostCompensation = proposal.hostCompensation || proposal['host compensation'] || proposal['Host Compensation'] || proposal.host_compensation || 0;
  const totalCompensation = proposal.totalCompensation || proposal['Total Compensation (proposal - host)'] || proposal['Total Compensation'] || proposal.total_compensation || 0;
  const counterOfferHappened = proposal.counterOfferHappened || proposal['Counter Offer Happened'] || proposal.counter_offer_happened || false;

  // Get active days for the schedule
  const activeDays = getActiveDays(checkInDay, checkOutDay);

  // Guest avatar
  const guestAvatar = guest.avatar || guest.Avatar || guest['Profile Photo'] || guest['Profile Picture'];
  const avatarUrl = guestAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(guestName)}&background=random&size=40`;

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(proposal);
    }
  };

  const handleClick = () => {
    onClick(proposal);
  };

  return (
    <div className="proposal-card" onClick={handleClick}>
      {/* Header with status and avatar */}
      <div className="proposal-card-header">
        <div
          className="status-tag"
          style={{
            backgroundColor: statusInfo.backgroundColor,
            color: statusInfo.textColor
          }}
          title="Click to view details"
        >
          {statusInfo.icon === 'clock' && <ClockIcon />}
          {statusInfo.icon === 'check' && <CheckIcon />}
          {statusInfo.icon === 'x' && <XIcon />}
          <span>{statusInfo.text}</span>
        </div>
        <div className="avatar-container">
          {isCancelled && onDelete && (
            <button className="delete-button" onClick={handleDelete}>
              Delete
            </button>
          )}
          <img
            src={avatarUrl}
            alt={guestName || 'Guest'}
            className="guest-avatar"
          />
        </div>
      </div>

      {/* Card Body */}
      <div className="proposal-card-body">
        <h3 className="proposal-title">{guestName ? `${guestName}'s Proposal` : "'s Proposal"}</h3>
        <p className="listing-description">{listingDescription}</p>

        {/* Schedule Info - shows check-in to check-out range */}
        <p className="schedule-text">
          {checkInDay} to {checkOutDay}
        </p>

        {/* Day Indicator */}
        <DayIndicator activeDays={activeDays} />
      </div>

      {/* Details Section */}
      <div className="proposal-card-details">
        <div className="detail-row">
          <span>Move-in {formatDate(moveInRangeStart)}</span>
        </div>
        <div className="detail-row">
          <span>Duration <strong>{reservationSpanWeeks} weeks</strong></span>
        </div>
        <div className="detail-row compensation">
          <span className="compensation-label">Your Compensation</span>
          <span className="compensation-value">
            {totalCompensation > 0 ? (
              <strong>${formatCurrency(totalCompensation)}</strong>
            ) : (
              <span className="compensation-error">Contact Split Lease</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
