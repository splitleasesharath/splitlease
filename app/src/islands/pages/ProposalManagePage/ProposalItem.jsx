/**
 * Proposal Item Component
 *
 * Displays a single proposal card with all details:
 * - Guest information
 * - Listing information
 * - Host information
 * - Pricing breakdown
 * - Reservation details (dates, schedule)
 * - Status dropdown
 * - Action buttons
 *
 * Uses native HTML elements (no react-select dependency)
 */

import { format } from 'date-fns';
import { PROPOSAL_STATUSES, DAYS_OF_WEEK } from './constants.js';

/**
 * Format currency value
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount || 0);
}

/**
 * Format date value
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  if (!date) return 'N/A';
  try {
    return format(new Date(date), 'M/d/yyyy');
  } catch {
    return 'N/A';
  }
}

/**
 * ProposalItem component
 * @param {Object} props
 * @param {Object} props.proposal - Proposal data
 * @param {Function} props.onStatusChange - Handler for status changes
 * @param {Function} props.onAction - Handler for action buttons
 */
export default function ProposalItem({ proposal, onStatusChange, onAction }) {
  const { guest, host, listing, pricing, reservation } = proposal;

  return (
    <div className="pm-proposal-item">
      <div className="pm-proposal-grid">
        {/* Guest Section */}
        <div className="pm-section pm-guest-section">
          <h3 className="pm-section-title">Guest Information</h3>
          <div className="pm-user-info">
            {guest?.profilePhoto && (
              <img
                src={guest.profilePhoto}
                alt={guest.fullName || 'Guest'}
                className="pm-profile-photo"
              />
            )}
            <div className="pm-user-details">
              <p className="pm-user-name">
                {guest?.firstName} {guest?.lastName}
                {guest?.isUsabilityTester && (
                  <span className="pm-badge pm-usability-tester">Usability Tester</span>
                )}
                {guest?.isVerified && (
                  <span className="pm-badge pm-verified">Verified</span>
                )}
              </p>
              <p className="pm-user-contact">{guest?.email || 'No email'}</p>
              <p className="pm-user-contact">{guest?.phoneNumber || 'No phone'}</p>
            </div>
          </div>
          {guest?.aboutMe && (
            <div className="pm-guest-bio">
              <p className="pm-bio-label">About:</p>
              <p className="pm-bio-text">{guest.aboutMe}</p>
            </div>
          )}
          {proposal.guestNeedForSpace && (
            <div className="pm-guest-bio">
              <p className="pm-bio-label">Need for Space:</p>
              <p className="pm-bio-text">{proposal.guestNeedForSpace}</p>
            </div>
          )}
        </div>

        {/* Listing Section */}
        <div className="pm-section pm-listing-section">
          <h3 className="pm-section-title">Listing Information</h3>
          <div className="pm-listing-info">
            <p className="pm-listing-name">{listing?.name || 'Unknown Listing'}</p>
            <p className="pm-listing-address">{listing?.address || 'No address'}</p>
            <p className="pm-listing-id">ID: {listing?._id || 'N/A'}</p>
            <p className="pm-listing-type">Type: {listing?.rentalType || 'N/A'}</p>
            {listing?.coverPhoto && (
              <div className="pm-listing-photos">
                <img
                  src={listing.coverPhoto}
                  alt={listing.name || 'Listing'}
                  className="pm-listing-photo"
                />
              </div>
            )}
          </div>
        </div>

        {/* Host Section */}
        <div className="pm-section pm-host-section">
          <h3 className="pm-section-title">Host Information</h3>
          <div className="pm-user-info">
            {host?.profilePhoto && (
              <img
                src={host.profilePhoto}
                alt={host.fullName || 'Host'}
                className="pm-profile-photo"
              />
            )}
            <div className="pm-user-details">
              <p className="pm-user-name">
                {host?.firstName || 'Unknown'} {host?.lastName || 'Host'}
                {host?.isUsabilityTester && (
                  <span className="pm-badge pm-usability-tester">Usability Tester</span>
                )}
              </p>
              <p className="pm-user-contact">{host?.email || 'No email'}</p>
              <p className="pm-user-contact">{host?.phoneNumber || 'No phone'}</p>
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="pm-section pm-pricing-section">
          <h3 className="pm-section-title">Pricing</h3>
          <div className="pm-pricing-grid">
            <div className="pm-pricing-item">
              <span className="pm-pricing-label">Nightly Price:</span>
              <span className="pm-pricing-value">{formatCurrency(pricing?.nightlyPrice)}</span>
            </div>
            <div className="pm-pricing-item">
              <span className="pm-pricing-label">Total Reservation:</span>
              <span className="pm-pricing-value">{formatCurrency(pricing?.totalReservationPrice)}</span>
            </div>
            <div className="pm-pricing-item">
              <span className="pm-pricing-label">4-Week Rent:</span>
              <span className="pm-pricing-value">{formatCurrency(pricing?.pricePerFourWeeks)}</span>
            </div>
            <div className="pm-pricing-item">
              <span className="pm-pricing-label">Host Compensation:</span>
              <span className="pm-pricing-value">{formatCurrency(pricing?.hostCompensation)}</span>
            </div>
            <div className="pm-pricing-item">
              <span className="pm-pricing-label">Total Compensation:</span>
              <span className="pm-pricing-value">{formatCurrency(pricing?.totalCompensation)}</span>
            </div>
            <div className="pm-pricing-item">
              <span className="pm-pricing-label">Damage Deposit:</span>
              <span className="pm-pricing-value">{formatCurrency(listing?.damageDeposit)}</span>
            </div>
            <div className="pm-pricing-item">
              <span className="pm-pricing-label">Cleaning Cost:</span>
              <span className="pm-pricing-value">{formatCurrency(listing?.cleaningCost)}</span>
            </div>
          </div>
        </div>

        {/* Reservation Details */}
        <div className="pm-section pm-reservation-section">
          <h3 className="pm-section-title">Reservation Details</h3>
          <div className="pm-reservation-info">
            <div className="pm-info-item">
              <span className="pm-info-label">Move-in Date:</span>
              <span className="pm-info-value">{formatDate(reservation?.moveInDate)}</span>
            </div>
            <div className="pm-info-item">
              <span className="pm-info-label">Reservation Span:</span>
              <span className="pm-info-value">{reservation?.reservationSpanWeeks || 0} weeks</span>
            </div>
            <div className="pm-weekly-schedule">
              <span className="pm-info-label">Weekly Schedule:</span>
              <div className="pm-days-grid">
                {DAYS_OF_WEEK.map((day, index) => (
                  <div
                    key={index}
                    className={`pm-day-cell ${reservation?.weeklySchedule?.[index] ? 'active' : ''}`}
                  >
                    {day}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Proposal Status */}
        <div className="pm-section pm-status-section">
          <h3 className="pm-section-title">Proposal Status</h3>
          <select
            className="pm-status-select"
            value={proposal.status}
            onChange={(e) => onStatusChange(proposal._id, e.target.value)}
          >
            {PROPOSAL_STATUSES.map((status, index) => (
              <option key={index} value={status}>
                {status || '(empty)'}
              </option>
            ))}
          </select>
          <div className="pm-proposal-meta">
            <p className="pm-meta-item">
              <span className="pm-meta-label">Proposal ID:</span>
              <span className="pm-meta-value pm-id-value">{proposal._id}</span>
            </p>
            <p className="pm-meta-item">
              <span className="pm-meta-label">Created:</span>
              <span className="pm-meta-value">{formatDate(proposal.createdDate)}</span>
            </p>
            <p className="pm-meta-item">
              <span className="pm-meta-label">Modified:</span>
              <span className="pm-meta-value">{formatDate(proposal.modifiedDate)}</span>
            </p>
          </div>
        </div>

        {/* Guest Comment */}
        {proposal.comment && (
          <div className="pm-section pm-comment-section">
            <h3 className="pm-section-title">Guest Comment</h3>
            <p className="pm-comment-text">{proposal.comment}</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="pm-action-buttons">
        <button
          className="pm-btn pm-btn-link"
          onClick={() => onAction('viewListing', proposal)}
        >
          View listing
        </button>
        <button
          className="pm-btn pm-btn-primary"
          onClick={() => onAction('modifyAsHost', proposal)}
        >
          Modify Terms as Host
        </button>
        <button
          className="pm-btn pm-btn-primary"
          onClick={() => onAction('modifyAsGuest', proposal)}
        >
          Modify Terms as Guest
        </button>
        <button
          className="pm-btn pm-btn-secondary"
          onClick={() => onAction('sendReminderGuest', proposal)}
        >
          Send reminder to guest
        </button>
        <button
          className="pm-btn pm-btn-secondary"
          onClick={() => onAction('sendReminderHost', proposal)}
        >
          Send reminder to host
        </button>
        <button
          className="pm-btn pm-btn-danger"
          onClick={() => onAction('cancelProposal', proposal)}
        >
          Cancel Proposal by SplitLease
        </button>
      </div>
    </div>
  );
}
