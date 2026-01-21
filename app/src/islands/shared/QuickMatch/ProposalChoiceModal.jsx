/**
 * ProposalChoiceModal Component
 *
 * Confirmation modal when operator selects a match for a proposal.
 * Shows selected listing summary, match score breakdown, and notes input.
 *
 * @param {object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {function} props.onClose - Callback to close modal
 * @param {object} props.candidate - Selected candidate { listing, host, score, tier, breakdown }
 * @param {object} props.proposal - The proposal being matched
 * @param {function} props.onConfirm - Callback when match is confirmed (receives notes)
 * @param {boolean} props.isSubmitting - Whether the submission is in progress
 */
import React, { useState } from 'react';
import { ScoreBreakdown } from './ScoreBreakdown.jsx';

export function ProposalChoiceModal({
  isOpen,
  onClose,
  candidate,
  proposal,
  onConfirm,
  isSubmitting = false
}) {
  const [notes, setNotes] = useState('');

  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  // Handle backdrop click
  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  // Handle escape key
  const handleKeyDown = (event) => {
    if (event.key === 'Escape' && !isSubmitting) {
      onClose();
    }
  };

  // Handle confirmation
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm({ notes: notes.trim() });
    }
  };

  // Get tier display class
  const getTierClass = (tier) => {
    switch (tier) {
      case 'excellent': return 'qm-tier--excellent';
      case 'good': return 'qm-tier--good';
      case 'fair': return 'qm-tier--fair';
      default: return 'qm-tier--poor';
    }
  };

  const { listing, host, score, tier, breakdown, maxPossibleScore } = candidate || {};

  return (
    <div
      className="qm-modal-overlay"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="qm-modal-title"
    >
      <div className="qm-modal">
        {/* Modal Header */}
        <div className="qm-modal-header">
          <h3 id="qm-modal-title" className="qm-modal-title">
            Confirm Match Selection
          </h3>
          <button
            className="qm-modal-close"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
          >
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              width="24"
              height="24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="qm-modal-body">
          {/* Proposal Summary */}
          <div className="qm-modal-section">
            <h4 className="qm-modal-section-title">Proposal</h4>
            <div className="qm-modal-proposal-info">
              <span className="qm-modal-guest">
                {proposal?.guest?.fullName || proposal?.guest?.email || 'Guest'}
              </span>
              <span className="qm-modal-original">
                Original: {proposal?.listing?.title || 'Unknown listing'}
              </span>
            </div>
          </div>

          {/* Selected Listing */}
          <div className="qm-modal-section">
            <h4 className="qm-modal-section-title">Selected Match</h4>
            <div className="qm-modal-listing">
              <div className="qm-modal-listing-header">
                <span className="qm-modal-listing-title">
                  {listing?.title || 'Unnamed Listing'}
                </span>
                <span className={`qm-modal-tier ${getTierClass(tier)}`}>
                  {tier} ({Math.round(score)})
                </span>
              </div>
              <span className="qm-modal-listing-location">
                {listing?.hoodName && listing.hoodName}
                {listing?.boroughName && `, ${listing.boroughName}`}
              </span>
              {host && (
                <span className="qm-modal-host">
                  Host: {host.fullName || host.firstName || 'Unknown'}
                  {host.userVerified && (
                    <span className="qm-verified-badge">Verified</span>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Score Breakdown */}
          {breakdown && (
            <div className="qm-modal-section">
              <h4 className="qm-modal-section-title">Score Breakdown</h4>
              <ScoreBreakdown
                breakdown={breakdown}
                totalScore={score}
                maxPossibleScore={maxPossibleScore || 95}
                compact={false}
              />
            </div>
          )}

          {/* Notes Input */}
          <div className="qm-modal-section">
            <h4 className="qm-modal-section-title">
              Notes <span className="qm-optional">(optional)</span>
            </h4>
            <textarea
              className="qm-modal-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add any notes about why this match was selected..."
              rows={3}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="qm-modal-footer">
          <button
            type="button"
            className="qm-modal-btn qm-modal-btn--cancel"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="qm-modal-btn qm-modal-btn--confirm"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Confirm Match'}
          </button>
        </div>
      </div>
    </div>
  );
}
