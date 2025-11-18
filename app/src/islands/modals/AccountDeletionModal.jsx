/**
 * Account Deletion Modal
 * Double-confirmation pattern (3 workflows)
 * - First click: Sets last confirm = "yes"
 * - Second click: Deletes account (IRREVERSIBLE)
 */

import { useState } from 'react';

export default function AccountDeletionModal({ onClose, onConfirmDelete }) {
  const [confirmationStep, setConfirmationStep] = useState(1);
  const [deleting, setDeleting] = useState(false);

  const handleFirstConfirm = () => {
    setConfirmationStep(2);
  };

  const handleFinalDelete = async () => {
    setDeleting(true);
    try {
      // TODO: Implement actual account deletion via Supabase
      console.log('Deleting account...');

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      alert('Account successfully deleted. You will be redirected to the home page.');

      // Navigate to index page
      window.location.href = '/';
    } catch (error) {
      alert('Error deleting account. Please try again.');
      setDeleting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-danger" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Delete Account</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {confirmationStep === 1 ? (
            <>
              <div className="warning-icon">⚠️</div>
              <h3>Are you sure you want to delete your account?</h3>
              <p className="modal-warning">
                This action cannot be undone. All your data, including proposals, messages, and profile information will be permanently deleted.
              </p>
            </>
          ) : (
            <>
              <div className="warning-icon danger">🚨</div>
              <h3>Final Confirmation</h3>
              <p className="modal-warning danger">
                <strong>This is your last chance!</strong> Click "Delete My Account" below to permanently delete your account. There is no way to recover your data after this.
              </p>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>

          {confirmationStep === 1 ? (
            <button className="btn-danger" onClick={handleFirstConfirm}>
              Yes, Delete My Account
            </button>
          ) : (
            <button
              className="btn-danger"
              onClick={handleFinalDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete My Account'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
