/**
 * ProposalConfirmationModal Component
 * Modal for confirming proposal creation
 */

import React from 'react';

/**
 * Convert day indices to readable labels
 */
function formatDaysList(dayIndices) {
  const dayLabels = ['S', 'M', 'T', 'W', 'Th', 'F', 'Sa'];
  return dayIndices.map(i => dayLabels[i]).join(', ');
}

export default function ProposalConfirmationModal({
  listing,
  guest,
  moveInDate,
  selectedDayIndices,
  reservationWeeks,
  pricing,
  notes,
  onNotesChange,
  loading,
  onConfirm,
  onCancel,
}) {
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div className="modal active" onClick={handleBackdropClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Create Proposal</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onCancel}
          >
            &times;
          </button>
        </div>
        <div className="modal-body">
          <div className="modal-form">
            <div className="form-group">
              <label>Listing ID:</label>
              <span>{listing?.uniqueId || listing?.id || '-'}</span>
            </div>
            <div className="form-group">
              <label>Guest Email:</label>
              <span>{guest?.email || '-'}</span>
            </div>
            <div className="form-group">
              <label>Move-in Date:</label>
              <span>{moveInDate || 'Not selected'}</span>
            </div>
            <div className="form-group">
              <label>Selected Days:</label>
              <span>{formatDaysList(selectedDayIndices) || 'None'}</span>
            </div>
            <div className="form-group">
              <label>Reservation Span:</label>
              <span>{reservationWeeks} weeks</span>
            </div>
            <div className="form-group">
              <label>Total Price:</label>
              <span>${pricing.totalPrice || 0}</span>
            </div>
            <div className="form-group">
              <label htmlFor="additionalNotes">Additional Notes:</label>
              <textarea
                id="additionalNotes"
                className="text-input"
                rows={4}
                placeholder="Enter any additional notes..."
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`btn btn-purple ${loading ? 'loading' : ''}`}
            onClick={onConfirm}
            disabled={loading}
          >
            Create Proposal
          </button>
        </div>
      </div>
    </div>
  );
}
