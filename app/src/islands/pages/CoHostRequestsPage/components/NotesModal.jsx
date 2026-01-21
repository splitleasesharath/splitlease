/**
 * NotesModal - Modal for editing admin and request notes
 *
 * Features:
 * - Edit admin notes (internal, not visible to users)
 * - Edit request notes
 * - Save changes
 */

import { useState, useEffect } from 'react';

export default function NotesModal({
  request,
  onSave,
  onClose,
  isProcessing,
}) {
  const [adminNotes, setAdminNotes] = useState('');
  const [requestNotes, setRequestNotes] = useState('');

  // Initialize from request data
  useEffect(() => {
    setAdminNotes(request.adminNotes || '');
    setRequestNotes(request.requestNotes || '');
  }, [request]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSave = () => {
    onSave(request.id, adminNotes, requestNotes);
  };

  const hasChanges =
    adminNotes !== (request.adminNotes || '') ||
    requestNotes !== (request.requestNotes || '');

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className="modal-content modal-medium">
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">Edit Notes</h2>
          <button onClick={onClose} className="modal-close-button" title="Close">
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Admin Notes */}
          <div className="notes-field">
            <label className="notes-label">
              <AdminIcon />
              Admin Notes
              <span className="notes-hint">(Internal - not visible to users)</span>
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add internal notes about this request..."
              className="notes-textarea"
              rows={4}
            />
          </div>

          {/* Request Notes */}
          <div className="notes-field">
            <label className="notes-label">
              <NotesIcon />
              Request Notes
            </label>
            <textarea
              value={requestNotes}
              onChange={(e) => setRequestNotes(e.target.value)}
              placeholder="Add notes about the request..."
              className="notes-textarea"
              rows={4}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button onClick={onClose} className="modal-action-button modal-action-cancel">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="modal-action-button modal-action-primary"
            disabled={!hasChanges || isProcessing}
          >
            {isProcessing ? 'Saving...' : 'Save Notes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== ICONS =====

function CloseIcon() {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function AdminIcon() {
  return (
    <svg className="notes-label-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function NotesIcon() {
  return (
    <svg className="notes-label-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
