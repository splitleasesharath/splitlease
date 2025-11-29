/**
 * Proposal Card Component
 *
 * Displays detailed information about a selected proposal including:
 * - Listing details and photo
 * - Host information
 * - Schedule (days selected, nights, duration)
 * - Pricing breakdown
 * - Virtual meeting info (if scheduled)
 * - Action buttons based on status
 */

import { formatPrice, formatDate } from '../../../lib/proposals/dataTransformers.js';
import { getActionsForStatus } from '../../../logic/constants/proposalStatuses.js';

// Day abbreviations for schedule display
const DAY_ABBREVS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/**
 * Format days selected for display
 */
function formatDaysSelected(daysSelected) {
  if (!daysSelected || !Array.isArray(daysSelected)) {
    return [];
  }

  // Days from Bubble are 1-indexed (1=Sunday, 7=Saturday)
  // Convert to 0-indexed for display
  return daysSelected.map(day => {
    const jsIndex = day - 1;
    return {
      index: jsIndex,
      abbrev: DAY_ABBREVS[jsIndex] || '?',
      selected: true
    };
  });
}

/**
 * Get all days with selection status
 */
function getAllDaysWithSelection(daysSelected) {
  const selectedSet = new Set(daysSelected || []);
  return DAY_ABBREVS.map((abbrev, index) => ({
    index,
    abbrev,
    selected: selectedSet.has(index + 1) // Convert to Bubble 1-indexed
  }));
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ListingSection({ listing }) {
  if (!listing) return null;

  const photoUrl = listing.featuredPhotoUrl ||
    (listing['Features - Photos']?.[0]) ||
    null;

  const location = [listing.boroughName, listing.hoodName]
    .filter(Boolean)
    .join(', ') || 'New York';

  return (
    <div className="proposal-section listing-section">
      <div className="listing-header">
        <div>
          <h3 className="listing-title">{listing.Name || 'Listing'}</h3>
          <p className="listing-location">{location}</p>
        </div>
        <div className="listing-actions">
          <a
            href={`/view-split-lease?listingId=${listing._id}`}
            className="btn btn-secondary"
            target="_blank"
            rel="noopener noreferrer"
          >
            View Listing
          </a>
        </div>
      </div>

      {photoUrl && (
        <img
          src={photoUrl}
          alt={listing.Name || 'Listing photo'}
          className="listing-photo"
        />
      )}
    </div>
  );
}

function HostSection({ host }) {
  if (!host) return null;

  const name = host['Name - First'] || host['Name - Full'] || 'Host';
  const photo = host['Profile Photo'];

  return (
    <div className="proposal-section host-section">
      <h4>Your Host</h4>
      <div className="host-card">
        {photo ? (
          <img src={photo} alt={name} className="host-photo" />
        ) : (
          <div className="host-photo host-photo-placeholder">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="host-info">
          <div className="host-name">{name}</div>
          <div className="host-verification">
            {host['user verified?'] && (
              <span className="verify-badge">ID Verified</span>
            )}
            {host['Verify - Phone'] && (
              <span className="verify-badge">Phone Verified</span>
            )}
            {host['Verify - Linked In ID'] && (
              <span className="verify-badge">LinkedIn</span>
            )}
          </div>
          <div className="host-actions">
            <button className="btn btn-secondary">
              Send Message
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScheduleSection({ proposal }) {
  const daysSelected = proposal['Days Selected'] || proposal.hcDaysSelected || [];
  const allDays = getAllDaysWithSelection(daysSelected);
  const nightsPerWeek = proposal['nights per week (num)'] || daysSelected.length;
  const reservationWeeks = proposal['Reservation Span (Weeks)'] || proposal['hc reservation span (weeks)'] || 4;

  return (
    <div className="proposal-section schedule-section">
      <h4>Your Schedule</h4>

      <div className="schedule-days">
        {allDays.map((day) => (
          <div
            key={day.index}
            className={`day-badge ${day.selected ? 'selected' : 'unselected'}`}
          >
            {day.abbrev}
          </div>
        ))}
      </div>

      <p className="schedule-duration">
        {nightsPerWeek} nights per week for {reservationWeeks} weeks
      </p>
    </div>
  );
}

function DatesSection({ proposal }) {
  const moveInStart = proposal['Move in range start'];
  const moveInEnd = proposal['Move in range end'];
  const checkInDay = proposal['check in day'];
  const checkOutDay = proposal['check out day'];

  return (
    <div className="proposal-section dates-section">
      <h4>Move-in Window</h4>

      <div className="date-item">
        <label>Earliest:</label>
        <span>{formatDate(moveInStart) || 'Not specified'}</span>
      </div>

      <div className="date-item">
        <label>Latest:</label>
        <span>{formatDate(moveInEnd) || 'Not specified'}</span>
      </div>

      {checkInDay && (
        <div className="date-item">
          <label>Check-in Day:</label>
          <span>{DAY_ABBREVS[checkInDay - 1] || checkInDay}</span>
        </div>
      )}

      {checkOutDay && (
        <div className="date-item">
          <label>Check-out Day:</label>
          <span>{DAY_ABBREVS[checkOutDay - 1] || checkOutDay}</span>
        </div>
      )}
    </div>
  );
}

function PricingSection({ proposal }) {
  const isCounteroffer = proposal['counter offer happened'];
  const nightlyPrice = isCounteroffer
    ? proposal['hc nightly price']
    : proposal['proposal nightly price'];
  const totalPrice = isCounteroffer
    ? proposal['hc total price']
    : proposal['Total Price for Reservation (guest)'];
  const cleaningFee = proposal['cleaning fee'];
  const damageDeposit = proposal['damage deposit'];

  return (
    <div className="proposal-section pricing-section">
      <h4>Pricing</h4>

      <div className="pricing-item">
        <label>Nightly Rate:</label>
        <span className="price-value">{formatPrice(nightlyPrice) || '—'}</span>
      </div>

      {cleaningFee > 0 && (
        <div className="pricing-item">
          <label>Cleaning Fee:</label>
          <span>{formatPrice(cleaningFee)}</span>
        </div>
      )}

      {damageDeposit > 0 && (
        <div className="pricing-item">
          <label>Security Deposit:</label>
          <span>{formatPrice(damageDeposit)}</span>
        </div>
      )}

      <div className="pricing-item" style={{ borderTop: '2px solid #e5e5e5', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
        <label><strong>Total:</strong></label>
        <span className="price-value" style={{ fontSize: '1.25rem' }}>
          {formatPrice(totalPrice) || '—'}
        </span>
      </div>

      {isCounteroffer && (
        <p style={{ fontSize: '0.875rem', color: '#F59E0B', marginTop: '0.5rem' }}>
          * Prices reflect host counteroffer
        </p>
      )}
    </div>
  );
}

function VirtualMeetingSection({ virtualMeeting }) {
  if (!virtualMeeting) {
    return (
      <div className="proposal-section">
        <h4>Virtual Meeting</h4>
        <p style={{ color: '#6B7280' }}>No virtual meeting scheduled yet.</p>
        <button className="btn btn-secondary" style={{ marginTop: '0.5rem' }}>
          Request Virtual Meeting
        </button>
      </div>
    );
  }

  const bookedDate = virtualMeeting['booked date'];
  const meetingLink = virtualMeeting['meeting link'];
  const isDeclined = virtualMeeting['meeting declined'];

  if (isDeclined) {
    return (
      <div className="proposal-section">
        <h4>Virtual Meeting</h4>
        <p style={{ color: '#EF4444' }}>Meeting request was declined.</p>
        <button className="btn btn-secondary" style={{ marginTop: '0.5rem' }}>
          Request New Meeting
        </button>
      </div>
    );
  }

  return (
    <div className="proposal-section">
      <h4>Virtual Meeting</h4>

      {bookedDate ? (
        <div className="virtual-meeting-info">
          <p><strong>Scheduled:</strong> {formatDate(bookedDate)}</p>
          {meetingLink && (
            <a
              href={meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="meeting-link-button"
            >
              Join Meeting
            </a>
          )}
        </div>
      ) : (
        <p style={{ color: '#6B7280' }}>Meeting time pending confirmation.</p>
      )}
    </div>
  );
}

function ActionButtons({ proposal, statusConfig }) {
  const actions = getActionsForStatus(proposal.Status);

  if (!actions || actions.length === 0) {
    return null;
  }

  // Map action identifiers to button config
  const actionButtons = {
    submit_rental_app: { label: 'Submit Rental Application', primary: true },
    cancel_proposal: { label: 'Cancel Proposal', danger: true },
    request_vm: { label: 'Request Virtual Meeting', secondary: true },
    send_message: { label: 'Message Host', secondary: true },
    review_counteroffer: { label: 'Review Counteroffer', primary: true },
    accept_counteroffer: { label: 'Accept Counteroffer', primary: true },
    decline_counteroffer: { label: 'Decline', danger: true },
    submit_payment: { label: 'Submit Payment', primary: true },
    view_lease: { label: 'View Lease', secondary: true },
    view_listing: { label: 'View Listing', secondary: true },
    explore_rentals: { label: 'Browse Rentals', secondary: true }
  };

  return (
    <div className="proposal-section action-buttons">
      {actions.map((actionKey) => {
        const config = actionButtons[actionKey];
        if (!config) return null;

        const className = config.primary
          ? 'btn btn-primary'
          : config.danger
          ? 'btn btn-danger'
          : 'btn btn-secondary';

        return (
          <button key={actionKey} className={className}>
            {config.label}
          </button>
        );
      })}
    </div>
  );
}

function MetadataSection({ proposal }) {
  return (
    <div className="proposal-metadata">
      <p>
        Proposal ID: {proposal._id?.slice(-8) || '—'}
        {' | '}
        Created: {formatDate(proposal['Created Date']) || '—'}
        {proposal['Modified Date'] && (
          <> | Updated: {formatDate(proposal['Modified Date'])}</>
        )}
      </p>
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
  const virtualMeeting = proposal.virtualMeeting;

  return (
    <div className="proposal-card">
      {/* Listing Info */}
      <ListingSection listing={listing} />

      {/* Host Info */}
      <HostSection host={host} />

      {/* Schedule */}
      <ScheduleSection proposal={proposal} />

      {/* Dates */}
      <DatesSection proposal={proposal} />

      {/* Pricing */}
      <PricingSection proposal={proposal} />

      {/* Virtual Meeting */}
      <VirtualMeetingSection virtualMeeting={virtualMeeting} />

      {/* Action Buttons */}
      <ActionButtons proposal={proposal} statusConfig={statusConfig} />

      {/* Metadata */}
      <MetadataSection proposal={proposal} />
    </div>
  );
}
