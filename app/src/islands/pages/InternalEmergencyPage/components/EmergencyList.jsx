/**
 * Emergency List Component
 * Split Lease - Internal Emergency Dashboard
 *
 * Displays a list of emergencies in the sidebar
 */

import React from 'react';

const STATUS_COLORS = {
  REPORTED: '#dc3545',
  ASSIGNED: '#fd7e14',
  IN_PROGRESS: '#0d6efd',
  RESOLVED: '#198754',
  CLOSED: '#6c757d',
};

const STATUS_LABELS = {
  REPORTED: 'Reported',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export default function EmergencyList({
  emergencies,
  selectedEmergency,
  onSelectEmergency,
}) {
  if (!emergencies || emergencies.length === 0) {
    return (
      <div className="emergency-list emergency-list--empty">
        <p>No emergencies found.</p>
      </div>
    );
  }

  return (
    <div className="emergency-list">
      <h2 className="emergency-list__title">
        Emergencies ({emergencies.length})
      </h2>

      <ul className="emergency-list__items">
        {emergencies.map((emergency) => {
          const isSelected = selectedEmergency?.id === emergency.id;
          const guestName = emergency.reportedBy
            ? `${emergency.reportedBy.firstName || ''} ${emergency.reportedBy.lastName || ''}`.trim() || emergency.reportedBy.email
            : 'Unknown Guest';

          return (
            <li key={emergency.id} className="emergency-list__item">
              <button
                className={`emergency-card ${isSelected ? 'emergency-card--selected' : ''}`}
                onClick={() => onSelectEmergency(emergency)}
                type="button"
              >
                <div className="emergency-card__header">
                  <span
                    className="emergency-card__status"
                    style={{ backgroundColor: STATUS_COLORS[emergency.status] || '#6c757d' }}
                  >
                    {STATUS_LABELS[emergency.status] || emergency.status}
                  </span>
                  <span className="emergency-card__time">
                    {formatTimeAgo(emergency.created_at)}
                  </span>
                </div>

                <h3 className="emergency-card__type">
                  {emergency.emergency_type}
                </h3>

                <p className="emergency-card__description">
                  {truncateText(emergency.description, 80)}
                </p>

                <div className="emergency-card__footer">
                  <span className="emergency-card__guest">
                    {guestName}
                  </span>
                  {emergency.proposal?.agreementNumber && (
                    <span className="emergency-card__agreement">
                      #{emergency.proposal.agreementNumber}
                    </span>
                  )}
                </div>

                {emergency.assignedTo && (
                  <div className="emergency-card__assigned">
                    Assigned to: {emergency.assignedTo.firstName || emergency.assignedTo.email}
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Truncate text to a maximum length
 */
function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Format timestamp as time ago
 */
function formatTimeAgo(timestamp) {
  if (!timestamp) return '';

  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
