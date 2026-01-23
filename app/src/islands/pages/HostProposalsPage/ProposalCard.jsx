/**
 * ProposalCard Component
 *
 * Card displaying proposal summary in the grid view.
 */

import DayIndicator from './DayIndicator.jsx';
import { getStatusTagInfo, getNightsAsDayNames, getCheckInOutFromDays } from './types.js';
import { formatCurrency, formatDate } from './formatters.js';
import { getStatusConfig } from '../../../logic/constants/proposalStatuses.js';

/**
 * Progress stage labels for host view
 * Matches guest proposals page structure
 */
const PROGRESS_STAGES = ['Submitted', 'Application', 'Review', 'Accepted', 'Signing', 'Active'];

/**
 * Progress bar colors
 */
const PROGRESS_COLORS = {
  purple: '#6D31C2',
  green: '#1F8E16',
  red: '#DB2E2E',
  gray: '#DEDEDE',
  labelGray: '#9CA3AF'
};

/**
 * Calculate stage color based on status
 */
function getStageColor(stageIndex, usualOrder, isTerminal) {
  if (isTerminal) return PROGRESS_COLORS.red;

  // Completed stages (before current)
  if (stageIndex < usualOrder) return PROGRESS_COLORS.purple;

  // Current stage
  if (stageIndex === usualOrder) return PROGRESS_COLORS.green;

  // Future stages
  return PROGRESS_COLORS.gray;
}

/**
 * Inline Progress Tracker for proposal cards
 */
function InlineProgressTracker({ statusId }) {
  const statusConfig = getStatusConfig(statusId);
  const usualOrder = statusConfig?.usualOrder ?? 0;
  const isTerminal = usualOrder === 99;

  return (
    <div className="hp-card-progress-row">
      {PROGRESS_STAGES.map((label, index) => {
        const stageColor = getStageColor(index, usualOrder, isTerminal);
        const isLast = index === PROGRESS_STAGES.length - 1;

        return (
          <div key={index} className="hp-card-progress-step">
            <div
              className="hp-card-progress-dot"
              style={{ backgroundColor: stageColor }}
            />
            <span
              className="hp-card-progress-label"
              style={{ color: stageColor !== PROGRESS_COLORS.gray ? stageColor : PROGRESS_COLORS.labelGray }}
            >
              {label}
            </span>
            {!isLast && (
              <div
                className="hp-card-progress-line"
                style={{ backgroundColor: stageColor === PROGRESS_COLORS.purple ? PROGRESS_COLORS.purple : PROGRESS_COLORS.gray }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

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

  // Get schedule info
  // Use Nights Selected for the day indicator (shows which nights guest stays)
  // Use Days Selected for check-in/check-out text (matches guest-facing display)
  const nightsSelectedRaw = proposal['hc nights selected'] || proposal['Nights Selected (Nights list)'] || proposal.nightsSelected || proposal['Nights Selected'];
  const daysSelectedRaw = proposal['hc days selected'] || proposal['Days Selected'] || proposal.daysSelected;
  const moveInRangeStart = proposal.moveInRangeStart || proposal['Move in range start'] || proposal['Move In Range Start'] || proposal.move_in_range_start;
  const reservationSpanWeeks = proposal.reservationSpanWeeks || proposal['Reservation Span (Weeks)'] || proposal['Reservation Span (weeks)'] || proposal.reservation_span_weeks || 0;

  // Get check-in/check-out from Days Selected (matches guest-facing display)
  const { checkInDay, checkOutDay } = getCheckInOutFromDays(daysSelectedRaw);

  // Get pricing info
  // "host compensation" is the per-night HOST rate (from listing pricing tiers)
  // "Total Compensation (proposal - host)" is the total = per-night rate * nights * weeks
  const hostCompensation = proposal.hostCompensation || proposal['host compensation'] || proposal['Host Compensation'] || proposal.host_compensation || 0;
  const totalCompensation = proposal.totalCompensation || proposal['Total Compensation (proposal - host)'] || proposal['Total Compensation'] || proposal.total_compensation || 0;
  const counterOfferHappened = proposal.counterOfferHappened || proposal['Counter Offer Happened'] || proposal.counter_offer_happened || false;

  // Get active nights for the day indicator (hosts see nights, not days)
  const activeDays = getNightsAsDayNames(nightsSelectedRaw);

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
          {checkInDay} to {checkOutDay} (check-out)
        </p>

        {/* Day Indicator */}
        <DayIndicator activeDays={activeDays} />
      </div>

      {/* Progress Tracker */}
      <InlineProgressTracker statusId={statusId} />

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
