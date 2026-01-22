/**
 * ConfirmedMeetingsSection - Displays confirmed virtual meetings
 */

import ConfirmedMeetingCard from './ConfirmedMeetingCard';

export default function ConfirmedMeetingsSection({
  meetings = [],
  onEdit,
  onReschedule,
  isLoading
}) {
  return (
    <section className="manage-vm__section">
      <header className="manage-vm__section-header">
        <h2 className="manage-vm__section-title">
          <svg
            className="manage-vm__section-icon manage-vm__section-icon--success"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          Confirmed Meetings
          <span className="manage-vm__section-count manage-vm__section-count--success">
            {meetings.length}
          </span>
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
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <p>No confirmed meetings yet</p>
          </div>
        ) : (
          <div className="manage-vm__cards-grid">
            {meetings.map(meeting => (
              <ConfirmedMeetingCard
                key={meeting._id || meeting.id}
                meeting={meeting}
                onEdit={() => onEdit(meeting)}
                onReschedule={() => onReschedule(meeting)}
                isLoading={isLoading}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
