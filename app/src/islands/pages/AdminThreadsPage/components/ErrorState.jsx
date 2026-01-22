/**
 * ErrorState - Display error message with retry option
 */

import { AlertTriangle } from 'lucide-react';

export default function ErrorState({ message, onRetry }) {
  return (
    <div className="admin-threads__error">
      <AlertTriangle size={48} className="admin-threads__error-icon" />
      <h3 className="admin-threads__error-title">Something went wrong</h3>
      <p className="admin-threads__error-message">{message}</p>
      {onRetry && (
        <button
          className="admin-threads__error-btn"
          onClick={onRetry}
        >
          Try Again
        </button>
      )}
    </div>
  );
}
