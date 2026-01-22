/**
 * ConfirmedMeetingCard - Card component for displaying a confirmed meeting
 */

import { useMemo } from 'react';
import { formatMeetingForDisplay } from '../../../../logic/processors/meetings/filterMeetings';
import { isMeetingInPast } from '../../../../logic/rules/admin/virtualMeetingAdminRules';

export default function ConfirmedMeetingCard({
  meeting,
  onEdit,
  onReschedule,
  isLoading
}) {
  const formatted = useMemo(() => formatMeetingForDisplay(meeting), [meeting]);
  const isPast = useMemo(() => isMeetingInPast(meeting), [meeting]);

  if (!formatted) return null;

  return (
    <article className={`meeting-card meeting-card--confirmed ${isPast ? 'meeting-card--past' : ''}`}>
      {/* Header */}
      <header className="meeting-card__header">
        <div className="meeting-card__status">
          <span className="meeting-card__status-badge meeting-card__status-badge--success">
            Confirmed
          </span>
          {isPast && (
            <span className="meeting-card__status-badge meeting-card__status-badge--info">
              Completed
            </span>
          )}
        </div>
        {formatted.bookedDate && (
          <time className="meeting-card__booked-date" dateTime={formatted.bookedDate.raw}>
            {formatted.bookedDate.formatted}
          </time>
        )}
      </header>

      {/* Participants */}
      <div className="meeting-card__participants-row">
        {/* Guest */}
        <div className="meeting-card__participant meeting-card__participant--compact">
          <div className="meeting-card__avatar meeting-card__avatar--guest meeting-card__avatar--small">
            {formatted.guestName.charAt(0).toUpperCase()}
          </div>
          <div className="meeting-card__participant-info">
            <span className="meeting-card__participant-name">{formatted.guestName}</span>
            <span className="meeting-card__participant-timezone">{formatted.guestTimezone}</span>
          </div>
        </div>

        {/* Connector */}
        <div className="meeting-card__connector">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>

        {/* Host */}
        <div className="meeting-card__participant meeting-card__participant--compact">
          <div className="meeting-card__avatar meeting-card__avatar--host meeting-card__avatar--small">
            {formatted.hostName.charAt(0).toUpperCase()}
          </div>
          <div className="meeting-card__participant-info">
            <span className="meeting-card__participant-name">{formatted.hostName}</span>
            <span className="meeting-card__participant-timezone">{formatted.hostTimezone}</span>
          </div>
        </div>
      </div>

      {/* Meeting Link */}
      {formatted.meetingLink && (
        <div className="meeting-card__meeting-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 10l5 5-5 5" />
            <path d="M4 4v7a4 4 0 0 0 4 4h12" />
          </svg>
          <a
            href={formatted.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="meeting-card__link"
          >
            {formatted.meetingLink.includes('zoom') ? 'Zoom Meeting' :
             formatted.meetingLink.includes('meet.google') ? 'Google Meet' :
             'Join Meeting'}
          </a>
          <button
            className="meeting-card__copy-link"
            onClick={() => navigator.clipboard.writeText(formatted.meetingLink)}
            title="Copy link"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
        </div>
      )}

      {/* Listing Address */}
      <div className="meeting-card__listing meeting-card__listing--compact">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span>{formatted.listingAddress}</span>
      </div>

      {/* Proposal ID */}
      {formatted.proposalId && (
        <div className="meeting-card__proposal meeting-card__proposal--compact">
          <code>{formatted.proposalId}</code>
        </div>
      )}

      {/* Actions */}
      {!isPast && (
        <footer className="meeting-card__actions meeting-card__actions--compact">
          <button
            className="meeting-card__action meeting-card__action--secondary"
            onClick={onReschedule}
            disabled={isLoading}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Reschedule
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
        </footer>
      )}
    </article>
  );
}
