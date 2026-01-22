/**
 * History Section Component
 *
 * Displays activity history for the selected guest.
 * Converted from TypeScript to JavaScript following Split Lease patterns.
 */

import { History, Clock } from 'lucide-react';

export default function HistorySection({ history }) {
  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  return (
    <div className="grd-section">
      <h2 className="grd-section-title">
        <History size={20} />
        History
      </h2>

      <div className="grd-history-content">
        {history && history.length > 0 ? (
          <div className="grd-history-list">
            {history.map((entry, index) => (
              <div key={index} className="grd-history-item">
                <Clock size={14} className="grd-history-icon" />
                <span className="grd-history-text">
                  Page visited: <strong>{entry.page}</strong> on {formatDate(entry.date)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="grd-history-empty">No history available</p>
        )}
      </div>
    </div>
  );
}
