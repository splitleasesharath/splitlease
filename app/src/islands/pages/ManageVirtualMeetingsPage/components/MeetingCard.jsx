/**
 * MeetingCard - Card component for displaying a pending meeting request
 */

import { useMemo } from 'react';
import {
  formatMeetingForDisplay,
  formatRelativeTime
} from '../../../../logic/processors/meetings/filterMeetings';
import { getMeetingUrgency, getMeetingStatusInfo } from '../../../../logic/rules/admin/virtualMeetingAdminRules';

export default function MeetingCard({
  meeting,
  type = 'request',
  onConfirm,
  onEdit,
  onDelete,
  isLoading
}) {
  const formatted = useMemo(() => formatMeetingForDisplay(meeting), [meeting]);
  const urgency = useMemo(() => getMeetingUrgency(meeting), [meeting]);
  const statusInfo = useMemo(() => getMeetingStatusInfo(meeting), [meeting]);

  if (!formatted) return null;

  return (
    <article className={`meeting-card meeting-card--${type} meeting-card--urgency-${urgency}`}>
      {/* Header */}
      <header className="meeting-card__header">
        <div className="meeting-card__status">
          <span className={`meeting-card__status-badge meeting-card__status-badge--${statusInfo.color}`}>
            {statusInfo.label}
          </span>
          {urgency !== 'normal' && (
            <span className={`meeting-card__urgency-badge meeting-card__urgency-badge--${urgency}`}>
              {urgency === 'urgent' ? 'Urgent' : 'Waiting'}
            </span>
          )}
        </div>
        <time className="meeting-card__time" dateTime={meeting.created_at}>
          {formatted.formattedCreatedAt}
        </time>
      </header>

      {/* Guest Info */}
      <div className="meeting-card__participant">
        <div className="meeting-card__avatar meeting-card__avatar--guest">
          {formatted.guestName.charAt(0).toUpperCase()}
        </div>
        <div className="meeting-card__participant-info">
          <span className="meeting-card__participant-label">Guest</span>
          <span className="meeting-card__participant-name">{formatted.guestName}</span>
          <span className="meeting-card__participant-email">{formatted.guestEmail}</span>
        </div>
      </div>

      {/* Host Info */}
      <div className="meeting-card__participant">
        <div className="meeting-card__avatar meeting-card__avatar--host">
          {formatted.hostName.charAt(0).toUpperCase()}
        </div>
        <div className="meeting-card__participant-info">
          <span className="meeting-card__participant-label">Host</span>
          <span className="meeting-card__participant-name">{formatted.hostName}</span>
          <span className="meeting-card__participant-email">{formatted.hostEmail}</span>
        </div>
      </div>

      {/* Listing Info */}
      <div className="meeting-card__listing">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span>{formatted.listingAddress}</span>
      </div>

      {/* Proposal ID */}
      {formatted.proposalId && (
        <div className="meeting-card__proposal">
          <span className="meeting-card__proposal-label">Proposal:</span>
          <code className="meeting-card__proposal-id">{formatted.proposalId}</code>
        </div>
      )}

      {/* Suggested Dates */}
      {formatted.suggestedDates.length > 0 && (
        <div className="meeting-card__dates">
          <h4 className="meeting-card__dates-title">Suggested Times</h4>
          <ul className="meeting-card__dates-list">
            {formatted.suggestedDates.slice(0, 3).map((date, index) => (
              <li key={index} className="meeting-card__date-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {date.formatted}
              </li>
            ))}
            {formatted.suggestedDates.length > 3 && (
              <li className="meeting-card__date-more">
                +{formatted.suggestedDates.length - 3} more
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Actions */}
      <footer className="meeting-card__actions">
        <button
          className="meeting-card__action meeting-card__action--primary"
          onClick={onConfirm}
          disabled={isLoading}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Confirm
        </button>
        <button
          className="meeting-card__action meeting-card__action--secondary"
          onClick={onEdit}
          disabled={isLoading}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Edit
        </button>
        <button
          className="meeting-card__action meeting-card__action--danger"
          onClick={onDelete}
          disabled={isLoading}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          Delete
        </button>
      </footer>
    </article>
  );
}
