/**
 * Proposal Card Component
 *
 * Displays detailed information about a selected proposal in a two-column layout:
 * - Left column: Listing details, schedule, duration, move-in info
 * - Right column: Listing photo with host overlay
 * - Bottom: Pricing bar and progress tracker
 *
 * Design matches Bubble's MyProposals page layout.
 */

import { useState } from 'react';
import { formatPrice, formatDate } from '../../../lib/proposals/dataTransformers.js';

// Day abbreviations for schedule display (single letter like Bubble)
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Get check-in/out day range text (e.g., "Friday to Monday")
 * Handles both text day names (from Supabase) and numeric indices (legacy Bubble format)
 */
function getCheckInOutRange(proposal) {
  const checkInDay = proposal['check in day'];
  const checkOutDay = proposal['check out day'];

  if (!checkInDay || !checkOutDay) return null;

  // Handle both formats:
  // - Text format from Supabase: "Monday", "Friday", etc.
  // - Numeric format from legacy Bubble: 1=Sunday, 7=Saturday
  let checkInName, checkOutName;

  if (typeof checkInDay === 'string') {
    // Already a day name string
    checkInName = checkInDay;
  } else if (typeof checkInDay === 'number') {
    // Convert from Bubble 1-indexed to day name
    checkInName = DAY_NAMES[checkInDay - 1] || '';
  } else {
    checkInName = '';
  }

  if (typeof checkOutDay === 'string') {
    // Already a day name string
    checkOutName = checkOutDay;
  } else if (typeof checkOutDay === 'number') {
    // Convert from Bubble 1-indexed to day name
    checkOutName = DAY_NAMES[checkOutDay - 1] || '';
  } else {
    checkOutName = '';
  }

  return `${checkInName} to ${checkOutName}`;
}

/**
 * Get all days with selection status
 * Handles both text day names (from Supabase) and numeric indices (legacy Bubble format)
 */
function getAllDaysWithSelection(daysSelected) {
  const days = daysSelected || [];

  // Determine if we're dealing with text day names or numeric indices
  const isTextFormat = days.length > 0 && typeof days[0] === 'string';

  if (isTextFormat) {
    // Text format: ["Monday", "Tuesday", "Wednesday", etc.]
    const selectedSet = new Set(days);
    return DAY_LETTERS.map((letter, index) => ({
      index,
      letter,
      selected: selectedSet.has(DAY_NAMES[index])
    }));
  } else {
    // Numeric format: Bubble 1-indexed [2, 3, 4, 5, 6] for Mon-Fri
    const selectedSet = new Set(days);
    return DAY_LETTERS.map((letter, index) => ({
      index,
      letter,
      selected: selectedSet.has(index + 1) // Convert to Bubble 1-indexed
    }));
  }
}

// ============================================================================
// PROGRESS TRACKER (inline version matching Bubble's horizontal timeline)
// ============================================================================

const PROGRESS_STAGES = [
  { id: 1, label: 'Proposal Submitted' },
  { id: 2, label: 'Rental App Submitted' },
  { id: 3, label: 'Host Review' },
  { id: 4, label: 'Review Documents' },
  { id: 5, label: 'Lease Documents' },
  { id: 6, label: 'Initial Payment' }
];

function InlineProgressTracker({ currentStageIndex = 0 }) {
  return (
    <div className="inline-progress-tracker">
      <div className="progress-line-container">
        {PROGRESS_STAGES.map((stage, index) => (
          <div key={stage.id} className="progress-node-wrapper">
            {/* Connector line before node (except first) */}
            {index > 0 && (
              <div className={`progress-connector ${index <= currentStageIndex ? 'active' : ''}`} />
            )}
            {/* Node circle */}
            <div className={`progress-node ${index <= currentStageIndex ? 'active' : ''}`} />
          </div>
        ))}
      </div>
      <div className="progress-labels">
        {PROGRESS_STAGES.map((stage, index) => (
          <div
            key={stage.id}
            className={`progress-label ${index <= currentStageIndex ? 'active' : ''}`}
          >
            {stage.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ProposalCard({ proposal, transformedProposal, statusConfig }) {
  if (!proposal) {
    return null;
  }

  const listing = proposal.listing;
  const host = listing?.host;

  // Extract data
  const listingName = listing?.Name || 'Listing';
  const location = [listing?.hoodName, listing?.boroughName]
    .filter(Boolean)
    .join(', ') || 'New York';

  const photoUrl = listing?.featuredPhotoUrl ||
    (listing?.['Features - Photos']?.[0]) ||
    null;

  const hostName = host?.['Name - First'] || host?.['Name - Full'] || 'Host';
  const hostPhoto = host?.['Profile Photo'];

  // Schedule info
  const daysSelected = proposal['Days Selected'] || proposal.hcDaysSelected || [];
  const allDays = getAllDaysWithSelection(daysSelected);
  const nightsPerWeek = proposal['nights per week (num)'] || daysSelected.length;
  const reservationWeeks = proposal['Reservation Span (Weeks)'] || proposal['hc reservation span (weeks)'] || 4;
  const checkInOutRange = getCheckInOutRange(proposal);

  // Pricing
  const isCounteroffer = proposal['counter offer happened'];
  const nightlyPrice = isCounteroffer
    ? proposal['hc nightly price']
    : proposal['proposal nightly price'];
  const totalPrice = isCounteroffer
    ? proposal['hc total price']
    : proposal['Total Price for Reservation (guest)'];
  const cleaningFee = proposal['cleaning fee'] || 0;
  const damageDeposit = proposal['damage deposit'] || 0;

  // Move-in date
  const moveInStart = proposal['Move in range start'];
  const anticipatedMoveIn = formatDate(moveInStart);

  // Check-in/out times
  const checkInTime = listing?.['Check in time'] || '2:00 pm';
  const checkOutTime = listing?.['Check Out time'] || '11:00 am';

  // House rules - use resolved names from query layer
  const houseRules = listing?.houseRules || [];
  const hasHouseRules = Array.isArray(houseRules) && houseRules.length > 0;

  // House rules toggle state
  const [showHouseRules, setShowHouseRules] = useState(false);

  // Progress stage (simplified - in real implementation, derive from status)
  const currentStageIndex = 3; // Example: at "Review Documents" stage

  return (
    <div className="proposal-card-v2">
      {/* Main two-column content */}
      <div className="proposal-content-row">
        {/* Left column - Listing details */}
        <div className="proposal-left-column">
          <h3 className="listing-title-v2">{listingName}</h3>
          <p className="listing-location-v2">{location}</p>

          {/* Action buttons row */}
          <div className="listing-actions-row">
            <a
              href={`/view-split-lease/${listing?._id}`}
              className="btn-action btn-primary-v2"
              target="_blank"
              rel="noopener noreferrer"
            >
              View Listing
            </a>
            <button className="btn-action btn-map">
              View Map
            </button>
          </div>

          {/* Schedule info */}
          <div className="schedule-info-block">
            {checkInOutRange && (
              <div className="schedule-text primary">{checkInOutRange}</div>
            )}
            <div className="schedule-text">
              <span className="label">Duration</span> {reservationWeeks} Weeks
            </div>
          </div>

          {/* Day selector badges */}
          <div className="day-badges-row">
            {allDays.map((day) => (
              <div
                key={day.index}
                className={`day-badge-v2 ${day.selected ? 'selected' : ''}`}
              >
                {day.letter}
              </div>
            ))}
          </div>

          {/* Check-in/out times */}
          <div className="checkin-times">
            Check-in {checkInTime} Check-out {checkOutTime}
          </div>

          {/* Anticipated move-in */}
          <div className="movein-date">
            <span className="label">Anticipated Move-in</span> {anticipatedMoveIn || 'TBD'}
          </div>

          {/* House rules section - only show if listing has rules */}
          {hasHouseRules && (
            <div className="house-rules-section">
              <button
                type="button"
                className="house-rules-toggle"
                onClick={() => setShowHouseRules(!showHouseRules)}
              >
                {showHouseRules ? 'Hide House Rules' : 'See House Rules'}
              </button>

              {showHouseRules && (
                <div className="house-rules-grid">
                  {houseRules.map((rule, index) => (
                    <div key={index} className="house-rule-badge">
                      {rule}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column - Photo with host overlay */}
        <div className="proposal-right-column">
          <div
            className="listing-photo-container"
            style={{ backgroundImage: photoUrl ? `url(${photoUrl})` : 'none' }}
          >
            {/* Host overlay */}
            <div className="host-overlay">
              {hostPhoto ? (
                <img src={hostPhoto} alt={hostName} className="host-avatar" />
              ) : (
                <div className="host-avatar host-avatar-placeholder">
                  {hostName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="host-name-badge">{hostName}</div>
              <button className="btn-host btn-host-profile">Host Profile</button>
              <button className="btn-host btn-host-message">Send a Message</button>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing bar */}
      <div className="pricing-bar">
        <div className="pricing-details">
          <span className="pricing-total">Total {formatPrice(totalPrice)}</span>
          <span className="pricing-fee">Maintenance Fee: {formatPrice(cleaningFee)}</span>
          <span className="pricing-deposit">Damage deposit {formatPrice(damageDeposit)}</span>
        </div>
        <div className="pricing-nightly">
          {formatPrice(nightlyPrice)} / night
        </div>
        <button className="btn-delete-proposal">Delete Proposal</button>
      </div>

      {/* Progress tracker */}
      <InlineProgressTracker currentStageIndex={currentStageIndex} />
    </div>
  );
}
