/**
 * CandidateCard Component
 *
 * Displays a candidate listing with its match score.
 * Shows listing details, host info, and score tier.
 *
 * @param {object} props
 * @param {object} props.candidate - The candidate data { listing, host, score, breakdown, tier }
 * @param {function} props.onSelect - Callback when card is selected
 * @param {boolean} props.isSelected - Whether this card is currently selected
 */
import React from 'react';

export function CandidateCard({ candidate, onSelect, isSelected }) {
  if (!candidate) return null;

  const { listing, host, score, tier } = candidate;

  // Get tier color class
  const getTierClass = (tier) => {
    switch (tier) {
      case 'excellent': return 'qm-tier--excellent';
      case 'good': return 'qm-tier--good';
      case 'fair': return 'qm-tier--fair';
      default: return 'qm-tier--poor';
    }
  };

  // Get appropriate nightly rate display
  const getNightlyRate = () => {
    const rates = listing?.nightlyRates;
    if (!rates) return null;
    // Show rate for 4 nights as a default display
    return rates.rate4 || rates.rate3 || rates.rate5 || rates.rate2 || rates.rate7 || null;
  };

  const nightlyRate = getNightlyRate();

  return (
    <div
      className={`qm-candidate-card ${isSelected ? 'qm-candidate-card--selected' : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
    >
      {/* Score Badge */}
      <div className={`qm-score-badge ${getTierClass(tier)}`}>
        <span className="qm-score-value">{Math.round(score)}</span>
        <span className="qm-score-tier">{tier}</span>
      </div>

      {/* Listing Info */}
      <div className="qm-candidate-content">
        <h4 className="qm-candidate-title">
          {listing?.title || 'Unnamed Listing'}
        </h4>

        <div className="qm-candidate-location">
          {listing?.hoodName && (
            <span>{listing.hoodName}</span>
          )}
          {listing?.boroughName && (
            <span className="qm-candidate-borough">{listing.boroughName}</span>
          )}
        </div>

        {/* Host Info */}
        {host && (host.fullName || host.firstName) && (
          <div className="qm-candidate-host">
            <span className="qm-host-label">Host:</span>
            <span className="qm-host-name">{host.fullName || host.firstName}</span>
            {host.userVerified && (
              <span className="qm-verified-badge" title="Verified Host">Verified</span>
            )}
          </div>
        )}

        {/* Pricing */}
        {nightlyRate !== null && (
          <div className="qm-candidate-price">
            <span className="qm-price-amount">${nightlyRate}</span>
            <span className="qm-price-per">/night</span>
          </div>
        )}

        {/* Schedule Quick Info */}
        {listing?.daysAvailable && listing.daysAvailable.length > 0 && (
          <div className="qm-candidate-days">
            {listing.daysAvailable.length} days available
          </div>
        )}
      </div>

      {/* Selection indicator */}
      <div className="qm-candidate-select">
        <span className="qm-select-label">
          {isSelected ? 'Selected' : 'Select'}
        </span>
      </div>
    </div>
  );
}
