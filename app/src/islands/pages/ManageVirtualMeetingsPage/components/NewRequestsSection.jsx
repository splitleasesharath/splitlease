/**
 * NewRequestsSection - Displays pending meeting requests awaiting admin action
 */

import MeetingCard from './MeetingCard';

export default function NewRequestsSection({
  meetings = [],
  onConfirm,
  onEdit,
  onDelete,
  isLoading
}) {
  return (
    <section className="manage-vm__section">
      <header className="manage-vm__section-header">
        <h2 className="manage-vm__section-title">
          <svg
            className="manage-vm__section-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          New Requests
          <span className="manage-vm__section-count">{meetings.length}</span>
        </h2>
      </header>

      <div className="manage-vm__section-content">
        {meetings.length === 0 ? (
          <div className="manage-vm__empty-state">
            <svg
              className="manage-vm__empty-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <p>No pending meeting requests</p>
          </div>
        ) : (
          <div className="manage-vm__cards-grid">
            {meetings.map(meeting => (
              <MeetingCard
                key={meeting._id || meeting.id}
                meeting={meeting}
                type="request"
                onConfirm={() => onConfirm(meeting)}
                onEdit={() => onEdit(meeting)}
                onDelete={() => onDelete(meeting)}
                isLoading={isLoading}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
