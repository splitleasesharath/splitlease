/**
 * DeleteConfirmationModal - Confirmation dialog for deleting a meeting
 */

import { useMemo } from 'react';
import { formatMeetingForDisplay } from '../../../../logic/processors/meetings/filterMeetings';

export default function DeleteConfirmationModal({
  meeting,
  onConfirm,
  onClose,
  isSubmitting
}) {
  const formatted = useMemo(() => formatMeetingForDisplay(meeting), [meeting]);

  const handleConfirm = () => {
    onConfirm(meeting._id || meeting.id);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--delete-confirm" onClick={e => e.stopPropagation()}>
        <header className="modal__header modal__header--warning">
          <div className="modal__warning-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h2 className="modal__title">Delete Meeting Request</h2>
        </header>

        <div className="modal__content">
          <p className="modal__message">
            Are you sure you want to delete this meeting request? This action cannot be undone.
          </p>

          {/* Meeting Details */}
          <div className="modal__info-card modal__info-card--danger">
            <div className="modal__info-row">
              <span className="modal__info-label">Guest:</span>
              <span className="modal__info-value">{formatted?.guestName}</span>
            </div>
            <div className="modal__info-row">
              <span className="modal__info-label">Host:</span>
              <span className="modal__info-value">{formatted?.hostName}</span>
            </div>
            <div className="modal__info-row">
              <span className="modal__info-label">Listing:</span>
              <span className="modal__info-value">{formatted?.listingAddress}</span>
            </div>
            <div className="modal__info-row">
              <span className="modal__info-label">Requested:</span>
              <span className="modal__info-value">{formatted?.formattedCreatedAt}</span>
            </div>
          </div>

          <p className="modal__warning-text">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            The guest will not be notified about this deletion.
          </p>
        </div>

        <footer className="modal__actions">
          <button
            type="button"
            className="modal__btn modal__btn--secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="modal__btn modal__btn--danger"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="modal__spinner" />
                Deleting...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Delete Meeting
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}
