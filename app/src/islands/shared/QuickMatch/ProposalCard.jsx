/**
 * ProposalCard Component
 *
 * Displays the guest's proposal details in a card format.
 * Shows guest info, original listing, requested days, and pricing.
 *
 * @param {object} props
 * @param {object} props.proposal - The proposal data from the Edge Function
 * @param {boolean} props.isLoading - Loading state
 */
import React from 'react';

export function ProposalCard({ proposal, isLoading }) {
  if (isLoading) {
    return (
      <div className="qm-proposal-card qm-proposal-card--loading">
        <div className="qm-skeleton qm-skeleton--title"></div>
        <div className="qm-skeleton qm-skeleton--text"></div>
        <div className="qm-skeleton qm-skeleton--text"></div>
        <div className="qm-skeleton qm-skeleton--text qm-skeleton--short"></div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="qm-proposal-card qm-proposal-card--empty">
        <p>No proposal selected. Add a proposal_id to the URL.</p>
      </div>
    );
  }

  const { guest, listing, daysSelected, nightsPerWeek, nightlyPrice, status, moveInStart, moveInEnd } = proposal;

  // Format days for display
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const selectedDaysDisplay = daysSelected && daysSelected.length > 0
    ? daysSelected.map(d => dayNames[d] || d).join(', ')
    : 'Not specified';

  // Format dates
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not specified';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="qm-proposal-card">
      {/* Guest Info */}
      <div className="qm-proposal-section">
        <h4 className="qm-proposal-section-title">Guest</h4>
        <div className="qm-proposal-guest">
          <span className="qm-guest-name">{guest?.fullName || guest?.email || 'Unknown Guest'}</span>
          {guest?.email && (
            <span className="qm-guest-email">{guest.email}</span>
          )}
        </div>
      </div>

      {/* Original Listing */}
      <div className="qm-proposal-section">
        <h4 className="qm-proposal-section-title">Original Listing</h4>
        <div className="qm-proposal-listing">
          <span className="qm-listing-title">{listing?.title || 'Unknown Listing'}</span>
          {listing?.hoodName && (
            <span className="qm-listing-location">
              {listing.hoodName}{listing.boroughName && `, ${listing.boroughName}`}
            </span>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <div className="qm-proposal-section">
        <h4 className="qm-proposal-section-title">Status</h4>
        <span className={`qm-status-badge qm-status-badge--${(status || 'pending').toLowerCase()}`}>
          {status || 'Pending'}
        </span>
      </div>

      {/* Schedule Details */}
      <div className="qm-proposal-section">
        <h4 className="qm-proposal-section-title">Requested Schedule</h4>
        <div className="qm-proposal-details">
          <div className="qm-detail-row">
            <span className="qm-detail-label">Days:</span>
            <span className="qm-detail-value">{selectedDaysDisplay}</span>
          </div>
          <div className="qm-detail-row">
            <span className="qm-detail-label">Nights/Week:</span>
            <span className="qm-detail-value">{nightsPerWeek || 'Not specified'}</span>
          </div>
        </div>
      </div>

      {/* Move-in Range */}
      <div className="qm-proposal-section">
        <h4 className="qm-proposal-section-title">Move-in Range</h4>
        <div className="qm-proposal-details">
          <div className="qm-detail-row">
            <span className="qm-detail-label">From:</span>
            <span className="qm-detail-value">{formatDate(moveInStart)}</span>
          </div>
          <div className="qm-detail-row">
            <span className="qm-detail-label">To:</span>
            <span className="qm-detail-value">{formatDate(moveInEnd)}</span>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="qm-proposal-section">
        <h4 className="qm-proposal-section-title">Pricing</h4>
        <div className="qm-proposal-pricing">
          <span className="qm-price-value">
            ${nightlyPrice ? nightlyPrice.toFixed(0) : '0'}
          </span>
          <span className="qm-price-unit">/night</span>
        </div>
      </div>
    </div>
  );
}
