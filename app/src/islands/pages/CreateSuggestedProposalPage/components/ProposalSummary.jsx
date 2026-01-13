/**
 * ProposalSummary - Summary of all proposal details before submission
 */

import { getDayName } from '../../../../lib/dayUtils.js';
import { getAddressString, getDefaultPhoto } from '../suggestedProposalService.js';

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount || 0);
}

export default function ProposalSummary({
  selectedListing,
  selectedGuest,
  selectedDays,
  checkInDayIndex,
  checkOutDayIndex,
  reservationWeeks,
  pricing
}) {
  if (!selectedListing || !selectedGuest) {
    return null;
  }

  const guestName = selectedGuest['Name - Full'] || selectedGuest['Name - First'] || 'Unknown';
  const daysDisplay = selectedDays.length > 0
    ? selectedDays.map(d => getDayName(d)).join(', ')
    : '-';

  return (
    <div className="csp-proposal-summary">
      <h3>Proposal Summary</h3>

      <div className="csp-summary-grid">
        {/* Guest Information */}
        <div className="csp-summary-section">
          <h4>Guest Information</h4>
          <div className="csp-summary-item">
            <img
              src={selectedGuest['Profile Photo'] || getDefaultPhoto()}
              alt={guestName}
              className="csp-summary-avatar"
              onError={(e) => { e.target.src = getDefaultPhoto(); }}
            />
            <div>
              <p className="csp-summary-name">{guestName}</p>
              <p className="csp-summary-detail">{selectedGuest.email || ''}</p>
              <p className="csp-summary-detail">{selectedGuest['Phone Number (as text)'] || ''}</p>
            </div>
          </div>
        </div>

        {/* Listing Information */}
        <div className="csp-summary-section">
          <h4>Listing Information</h4>
          <p className="csp-summary-name">{selectedListing.Name || 'Unnamed Listing'}</p>
          <p className="csp-summary-detail">{getAddressString(selectedListing)}</p>
          <p className="csp-summary-detail">Host: {selectedListing['host name'] || ''}</p>
        </div>

        {/* Schedule */}
        <div className="csp-summary-section">
          <h4>Schedule</h4>
          <p><strong>Check-in:</strong> {checkInDayIndex !== null ? getDayName(checkInDayIndex) : '-'}</p>
          <p><strong>Check-out:</strong> {checkOutDayIndex !== null ? getDayName(checkOutDayIndex) : '-'}</p>
          <p><strong>Days:</strong> {daysDisplay}</p>
          <p><strong>Duration:</strong> {reservationWeeks ? `${reservationWeeks} weeks` : '-'}</p>
        </div>

        {/* Pricing */}
        <div className="csp-summary-section">
          <h4>Pricing</h4>
          <p><strong>Nightly Price:</strong> {pricing ? formatCurrency(pricing.nightlyPrice) : '-'}</p>
          <p><strong>Total Price:</strong> {pricing ? formatCurrency(pricing.grandTotal) : '-'}</p>
          <p><strong>Host Compensation:</strong> {pricing ? formatCurrency(pricing.hostCompensation) : '-'}</p>
        </div>
      </div>
    </div>
  );
}
