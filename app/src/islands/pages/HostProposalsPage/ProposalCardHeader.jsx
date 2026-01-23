/**
 * ProposalCardHeader Component (V7 Design)
 *
 * The collapsed view of a proposal card showing:
 * - Guest circular avatar (44px)
 * - Guest name with badges (New, Verified)
 * - Meta line (schedule + duration + total earnings)
 * - Status tag with appropriate color
 * - Chevron icon that rotates when expanded
 *
 * Part of the Host Proposals V7 redesign.
 */
import React from 'react';
import { ChevronDown, CheckCircle } from 'lucide-react';
import { isNewProposal, getStatusTagConfig, getCheckInOutFromDays } from './types.js';

/**
 * Get guest avatar URL with fallback
 * @param {Object} guest - The guest object
 * @returns {string} The avatar URL
 */
function getGuestAvatar(guest) {
  if (guest?.profilePhoto) return guest.profilePhoto;
  if (guest?.avatar) return guest.avatar;
  if (guest?.photo) return guest.photo;
  if (guest?.picture_url) return guest.picture_url;
  const name = guest?.name || guest?.full_name || 'Guest';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=E9E0F7&color=6D31C2&rounded=true&size=100`;
}

/**
 * Get guest display name
 * @param {Object} guest - The guest object
 * @returns {string} The display name
 */
function getGuestName(guest) {
  return guest?.name || guest?.full_name || guest?.first_name || 'Guest';
}

/**
 * Check if guest is verified
 * @param {Object} guest - The guest object
 * @returns {boolean} True if verified
 */
function isGuestVerified(guest) {
  return guest?.id_verified || guest?.is_verified || guest?.verified || false;
}

/**
 * Format schedule range from days selected
 * Uses getCheckInOutFromDays to properly handle wrap-around schedules
 * (e.g., Thu-Fri-Sat-Sun-Mon displays as "Thu-Mon" not "Sun-Sat")
 *
 * @param {Array} daysSelected - Array of 0-indexed days
 * @returns {string} Schedule string like "Thu-Mon"
 */
function formatSchedule(daysSelected) {
  if (!Array.isArray(daysSelected) || daysSelected.length === 0) return '';

  const { checkInDay, checkOutDay } = getCheckInOutFromDays(daysSelected);

  if (!checkInDay) return '';
  if (!checkOutDay || checkInDay === checkOutDay) {
    return checkInDay.slice(0, 3);
  }

  return `${checkInDay.slice(0, 3)}-${checkOutDay.slice(0, 3)}`;
}

/**
 * Format duration in weeks
 * @param {Object} proposal - The proposal object
 * @returns {string} Duration string like "12 weeks"
 */
function formatDuration(proposal) {
  const weeks = proposal?.duration_weeks || proposal?.weeks || proposal?.total_weeks;
  if (weeks) return `${weeks} weeks`;

  // Calculate from dates if available
  const startDate = proposal?.start_date || proposal?.move_in_date;
  const endDate = proposal?.end_date || proposal?.move_out_date;
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const calcWeeks = Math.round(diffDays / 7);
    return `${calcWeeks} weeks`;
  }

  return '';
}

/**
 * Format total earnings
 * @param {Object} proposal - The proposal object
 * @returns {string} Formatted currency string
 */
function formatTotalEarnings(proposal) {
  const total = proposal?.total_price || proposal?.host_earnings || proposal?.total_amount || 0;
  return `$${Number(total).toLocaleString()}`;
}

/**
 * ProposalCardHeader displays the collapsed state of a proposal card
 *
 * @param {Object} props
 * @param {Object} props.proposal - The proposal object
 * @param {boolean} props.isExpanded - Whether the card is expanded
 * @param {Function} props.onToggle - Callback to toggle expansion
 * @param {string} props.contentId - ID of the expandable content for aria-controls
 */
export function ProposalCardHeader({ proposal, isExpanded, onToggle, contentId }) {
  const guest = proposal?.guest || proposal?.user || {};
  const guestAvatar = getGuestAvatar(guest);
  const guestName = getGuestName(guest);
  const isVerified = isGuestVerified(guest);
  const isNew = isNewProposal(proposal);
  const statusConfig = getStatusTagConfig(proposal);

  // Build meta line
  const daysSelected = proposal?.days_selected || proposal?.Days_Selected || [];
  const schedule = formatSchedule(daysSelected);
  const duration = formatDuration(proposal);
  const total = formatTotalEarnings(proposal);

  const metaParts = [schedule, duration, `${total} total`].filter(Boolean);
  const metaLine = metaParts.join(' · ');

  return (
    <div
      className="hp7-card-header"
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle?.();
        }
      }}
      aria-expanded={isExpanded}
      aria-controls={contentId}
      aria-label={`${guestName}, ${statusConfig.text}. ${isExpanded ? 'Collapse' : 'Expand'} to ${isExpanded ? 'hide' : 'view'} details`}
    >
      <img
        src={guestAvatar}
        className="hp7-guest-avatar"
        alt=""
        aria-hidden="true"
        loading="lazy"
      />

      <div className="hp7-proposal-info">
        <div className="hp7-proposal-name">
          {guestName}
          {isNew && (
            <span className="hp7-new-badge">New</span>
          )}
          {isVerified && (
            <span className="hp7-verified-badge">
              <CheckCircle size={10} aria-hidden="true" />
              Verified
            </span>
          )}
        </div>
        <div className="hp7-proposal-meta">{metaLine}</div>
      </div>

      <div className={`hp7-proposal-status ${statusConfig.variant}`} aria-label={`Status: ${statusConfig.text}`}>
        {statusConfig.text}
      </div>

      <div className="hp7-expand-icon" aria-hidden="true">
        <ChevronDown size={16} />
      </div>
    </div>
  );
}

export default ProposalCardHeader;
