/**
 * CompareTermsModal Component
 *
 * Side-by-side comparison of original proposal vs host counteroffer.
 * Follows Bubble spec styling and the Hollow Component pattern.
 *
 * Features:
 * - Non-dismissible overlay (no Escape key, no overlay click)
 * - Two-column comparison with day pills display
 * - Reservation details section
 * - Negotiation summary section (conditional)
 * - Three action buttons: Cancel Proposal, Close, Accept Host Terms
 * - "Check the full document" link
 * - Nested CancelProposalModal for decline flow
 */

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useCompareTermsModalLogic } from './useCompareTermsModalLogic.js';
import CancelProposalModal from './CancelProposalModal.jsx';
import './CompareTermsModal.css';

/**
 * Day abbreviations for pill display
 */
const DAY_ABBREVS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * DayPillsDisplay - Shows S M T W T F S with selected highlighting
 *
 * @param {Object} props
 * @param {number[]} props.daysSelected - Array of selected day indices (0-6)
 * @param {boolean} props.isCounteroffer - Whether this is for counteroffer column
 */
function DayPillsDisplay({ daysSelected = [], isCounteroffer = false }) {
  const selectedSet = new Set(daysSelected);

  return (
    <div className="compare-terms-days" role="group" aria-label="Selected days of the week">
      {DAY_ABBREVS.map((letter, index) => {
        const isSelected = selectedSet.has(index);
        let className = 'compare-terms-day-pill';
        if (isSelected) {
          className += isCounteroffer
            ? ' compare-terms-day-pill--selected-counteroffer'
            : ' compare-terms-day-pill--selected';
        }

        return (
          <div
            key={index}
            className={className}
            aria-label={`${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][index]}${isSelected ? ', selected' : ''}`}
          >
            {letter}
          </div>
        );
      })}
    </div>
  );
}

/**
 * NegotiationSummaryBanner - Shows last negotiation summary
 *
 * @param {Object} props
 * @param {Array} props.summaries - Array of negotiation summary objects
 */
function NegotiationSummaryBanner({ summaries = [] }) {
  if (!summaries || summaries.length === 0) return null;

  // Get the most recent summary
  const latestSummary = summaries[summaries.length - 1];
  const summaryText = latestSummary?.summary || latestSummary?.text || latestSummary;

  if (!summaryText) return null;

  return (
    <div className="compare-terms-negotiation" role="status">
      <svg
        className="compare-terms-negotiation-icon"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
      <span className="compare-terms-negotiation-text">{summaryText}</span>
    </div>
  );
}

/**
 * HouseRulesDisplay - Shows house rules badges
 *
 * @param {Object} props
 * @param {Array} props.rules - Array of house rule strings
 */
function HouseRulesDisplay({ rules = [] }) {
  if (!rules || rules.length === 0) {
    return <span className="compare-terms-no-rules">None specified</span>;
  }

  return (
    <div className="compare-terms-house-rules">
      {rules.slice(0, 5).map((rule, index) => (
        <span key={index} className="compare-terms-house-rule-badge">
          {rule}
        </span>
      ))}
      {rules.length > 5 && (
        <span className="compare-terms-house-rule-badge">+{rules.length - 5} more</span>
      )}
    </div>
  );
}

/**
 * ReservationDetailsTable - Side-by-side details comparison
 *
 * @param {Object} props
 * @param {Object} props.original - Original terms
 * @param {Object} props.counteroffer - Counteroffer terms
 * @param {boolean} props.isExpanded - Whether to show all rows or only changed ones
 */
function ReservationDetailsTable({ original, counteroffer, isExpanded = false }) {
  if (!original || !counteroffer) return null;

  const rows = [
    { label: 'Check-In Day', originalVal: original.checkInDayName, counterVal: counteroffer.checkInDayName },
    { label: 'Check-Out Day', originalVal: original.checkOutDayName, counterVal: counteroffer.checkOutDayName },
    { label: 'Price/Night', originalVal: original.nightlyPriceFormatted, counterVal: counteroffer.nightlyPriceFormatted },
    { label: 'Nights Reserved', originalVal: original.nightsReserved, counterVal: counteroffer.nightsReserved },
    { label: 'Duration', originalVal: `${original.reservationWeeks} weeks`, counterVal: `${counteroffer.reservationWeeks} weeks` },
    { label: 'Total Price', originalVal: original.totalPriceFormatted, counterVal: counteroffer.totalPriceFormatted },
    { label: 'Price/4 Weeks', originalVal: original.pricePerFourWeeksFormatted, counterVal: counteroffer.pricePerFourWeeksFormatted },
    { label: 'Nights/4 Weeks', originalVal: original.nightsPerFourWeeks, counterVal: counteroffer.nightsPerFourWeeks },
    { label: 'Maintenance Fee/4wks', originalVal: original.maintenanceFeePerFourWeeksFormatted || '$0', counterVal: counteroffer.maintenanceFeePerFourWeeksFormatted || '$0' },
    { label: 'Damage Deposit', originalVal: original.damageDepositFormatted, counterVal: counteroffer.damageDepositFormatted },
    { label: 'Initial Payment', originalVal: original.initialPaymentFormatted, counterVal: counteroffer.initialPaymentFormatted }
  ];

  // Filter to only changed rows if not expanded
  const displayRows = isExpanded
    ? rows
    : rows.filter(row => String(row.originalVal) !== String(row.counterVal));

  // Don't render if collapsed and no changes
  if (!isExpanded && displayRows.length === 0) return null;

  return (
    <div className="compare-terms-details-section">
      <h4 className="compare-terms-details-title">Reservation Details</h4>
      <div className="compare-terms-details-table">
        <div className="compare-terms-details-row compare-terms-details-row--header">
          <div className="compare-terms-details-cell"></div>
          <div className="compare-terms-details-cell">Your Terms</div>
          <div className="compare-terms-details-cell">Host Terms</div>
        </div>
        {displayRows.map((row, index) => {
          const isChanged = String(row.originalVal) !== String(row.counterVal);
          return (
            <div key={index} className="compare-terms-details-row">
              <div className="compare-terms-details-cell compare-terms-details-cell--label">
                {row.label}
              </div>
              <div className="compare-terms-details-cell">
                {row.originalVal}
              </div>
              <div className={`compare-terms-details-cell ${isChanged ? 'compare-terms-details-cell--changed' : ''}`}>
                {row.counterVal}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * CompareTermsModal Component
 *
 * @param {Object} props
 * @param {Object} props.proposal - Proposal object with original and HC terms
 * @param {Function} props.onClose - Callback when modal closes
 * @param {Function} props.onAcceptCounteroffer - Callback after successful acceptance
 */
export default function CompareTermsModal({ proposal, onClose, onAcceptCounteroffer }) {
  // Use the logic hook (Hollow Component pattern)
  const {
    isAccepting,
    isCancelling,
    isLoading,
    error,
    originalTerms,
    counterofferTerms,
    negotiationSummaries,
    houseRules,
    listingInfo,
    showCancelModal,
    isExpanded,
    handleAcceptCounteroffer,
    handleCancelProposal,
    handleCancelConfirm,
    handleClose,
    handleCloseCancelModal,
    handleToggleExpanded
  } = useCompareTermsModalLogic({
    proposal,
    onClose,
    onAcceptCounteroffer,
    onCancelProposal: () => {}
  });

  // Block Escape key dismissal
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  // Don't render if no proposal or no counteroffer
  if (!proposal || !proposal['counter offer happened']) {
    return null;
  }

  // Don't render if terms are not loaded
  if (!originalTerms || !counterofferTerms) {
    return null;
  }

  const modalContent = (
    <div
      className="compare-terms-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-terms-title"
    >
      <div className="compare-terms-modal">
        {/* Header */}
        <div className="compare-terms-header">
          <h2 id="compare-terms-title" className="compare-terms-title">
            Compare Terms
          </h2>
          <button
            className="compare-terms-close-btn"
            onClick={handleClose}
            disabled={isLoading}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="compare-terms-body">
          {/* Error Message */}
          {error && (
            <div className="compare-terms-error" role="alert">
              <span className="compare-terms-error-text">{error}</span>
            </div>
          )}

          {/* Negotiation Summary */}
          <NegotiationSummaryBanner summaries={negotiationSummaries} />

          {/* Column Headers */}
          <div className="compare-terms-columns-header">
            <div className="compare-terms-column-title compare-terms-column-title--original">
              Your Terms
            </div>
            <div className="compare-terms-column-title compare-terms-column-title--counteroffer">
              Host Terms
            </div>
          </div>

          {/* Terms Comparison Grid */}
          <div className="compare-terms-grid">
            {/* Original Terms Column */}
            <div className="compare-terms-column">
              <div className="compare-terms-row">
                <span className="compare-terms-label">Move-in Date</span>
                <span className="compare-terms-value">{originalTerms.moveInDisplay}</span>
              </div>

              <div className="compare-terms-row">
                <span className="compare-terms-label">Duration</span>
                <span className="compare-terms-value">{originalTerms.reservationWeeks} weeks</span>
              </div>

              <div className="compare-terms-row">
                <span className="compare-terms-label">Schedule</span>
                <DayPillsDisplay daysSelected={originalTerms.daysSelected} isCounteroffer={false} />
              </div>

              <div className="compare-terms-row">
                <span className="compare-terms-label">Days/Nights</span>
                <span className="compare-terms-value">
                  {originalTerms.daysSelected.length + 1} days, {originalTerms.daysSelected.length} nights
                </span>
              </div>

              <div className="compare-terms-row">
                <span className="compare-terms-label">House Rules</span>
                <HouseRulesDisplay rules={houseRules} />
              </div>
            </div>

            {/* Counteroffer Terms Column */}
            <div className="compare-terms-column">
              <div className="compare-terms-row">
                <span className="compare-terms-label">Move-in Date</span>
                <span className="compare-terms-value compare-terms-value--highlight">
                  {counterofferTerms.moveInDisplay}
                </span>
              </div>

              <div className="compare-terms-row">
                <span className="compare-terms-label">Duration</span>
                <span className={`compare-terms-value ${counterofferTerms.reservationWeeks !== originalTerms.reservationWeeks ? 'compare-terms-value--highlight' : ''}`}>
                  {counterofferTerms.reservationWeeks} weeks
                </span>
              </div>

              <div className="compare-terms-row">
                <span className="compare-terms-label">Schedule</span>
                <DayPillsDisplay daysSelected={counterofferTerms.daysSelected} isCounteroffer={true} />
              </div>

              <div className="compare-terms-row">
                <span className="compare-terms-label">Days/Nights</span>
                <span className={`compare-terms-value ${counterofferTerms.daysSelected.length !== originalTerms.daysSelected.length ? 'compare-terms-value--highlight' : ''}`}>
                  {counterofferTerms.daysSelected.length + 1} days, {counterofferTerms.daysSelected.length} nights
                </span>
              </div>

              <div className="compare-terms-row">
                <span className="compare-terms-label">House Rules</span>
                <HouseRulesDisplay rules={houseRules} />
              </div>
            </div>
          </div>

          {/* Reservation Details Table */}
          <ReservationDetailsTable
            original={originalTerms}
            counteroffer={counterofferTerms}
            isExpanded={isExpanded}
          />
        </div>

        {/* Footer */}
        <div className="compare-terms-footer">
          <div className="compare-terms-actions">
            <button
              className="compare-terms-btn compare-terms-btn--cancel"
              onClick={handleCancelProposal}
              disabled={isLoading}
            >
              Cancel Proposal
            </button>
            <button
              className="compare-terms-btn compare-terms-btn--close"
              onClick={handleClose}
              disabled={isLoading}
            >
              Close
            </button>
            <button
              className="compare-terms-btn compare-terms-btn--accept"
              onClick={handleAcceptCounteroffer}
              disabled={isLoading}
            >
              {isAccepting ? 'Processing...' : 'Accept Host Terms'}
            </button>
          </div>

          {/* Check the full document toggle */}
          <div className="compare-terms-document-link">
            <button
              type="button"
              onClick={handleToggleExpanded}
              className="compare-terms-expand-btn"
              disabled={isLoading}
            >
              {isExpanded ? 'Collapse to changes only' : 'Check the full document'}
            </button>
          </div>
        </div>
      </div>

      {/* Nested Cancel Proposal Modal */}
      {showCancelModal && (
        <CancelProposalModal
          isOpen={showCancelModal}
          proposal={proposal}
          userType="guest"
          buttonText="Decline Counteroffer"
          onClose={handleCloseCancelModal}
          onConfirm={handleCancelConfirm}
        />
      )}
    </div>
  );

  // Render via portal to escape parent CSS constraints
  return createPortal(modalContent, document.body);
}
