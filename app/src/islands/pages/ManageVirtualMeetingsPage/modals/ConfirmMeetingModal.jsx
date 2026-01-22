/**
 * ConfirmMeetingModal - Modal for confirming a meeting request
 * Allows admin to select a date from suggested times and provide a meeting link
 */

import { useState, useMemo } from 'react';
import { formatMeetingForDisplay } from '../../../../logic/processors/meetings/filterMeetings';

export default function ConfirmMeetingModal({
  meeting,
  onConfirm,
  onClose,
  isSubmitting
}) {
  const formatted = useMemo(() => formatMeetingForDisplay(meeting), [meeting]);

  const [selectedDate, setSelectedDate] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [linkType, setLinkType] = useState('zoom');

  const suggestedDates = formatted?.suggestedDates || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedDate) return;

    const finalLink = meetingLink || generateDefaultLink(linkType);
    onConfirm(meeting._id || meeting.id, selectedDate, finalLink);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--confirm-meeting" onClick={e => e.stopPropagation()}>
        <header className="modal__header">
          <h2 className="modal__title">Confirm Meeting</h2>
          <button
            className="modal__close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <form className="modal__content" onSubmit={handleSubmit}>
          {/* Meeting Info Summary */}
          <div className="modal__info-card">
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
          </div>

          {/* Date Selection */}
          <div className="modal__field">
            <label className="modal__label">Select Meeting Date *</label>
            <div className="modal__date-options">
              {suggestedDates.map((date, index) => (
                <label
                  key={index}
                  className={`modal__date-option ${selectedDate === date.raw ? 'modal__date-option--selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="meetingDate"
                    value={date.raw}
                    checked={selectedDate === date.raw}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="modal__date-radio"
                  />
                  <span className="modal__date-display">{date.formatted}</span>
                </label>
              ))}
            </div>
            {suggestedDates.length === 0 && (
              <p className="modal__error">No suggested dates available</p>
            )}
          </div>

          {/* Meeting Link */}
          <div className="modal__field">
            <label className="modal__label">Meeting Link</label>
            <div className="modal__link-type-row">
              <select
                value={linkType}
                onChange={(e) => setLinkType(e.target.value)}
                className="modal__select modal__select--small"
              >
                <option value="zoom">Zoom</option>
                <option value="google_meet">Google Meet</option>
                <option value="custom">Custom URL</option>
              </select>
              {linkType === 'custom' ? (
                <input
                  type="url"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="https://..."
                  className="modal__input"
                />
              ) : (
                <span className="modal__auto-generate">
                  Link will be auto-generated
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
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
              type="submit"
              className="modal__btn modal__btn--primary"
              disabled={!selectedDate || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="modal__spinner" />
                  Confirming...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Confirm Meeting
                </>
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

/**
 * Generate a default meeting link based on provider
 */
function generateDefaultLink(linkType) {
  const meetingId = crypto.randomUUID().replace(/-/g, '').substring(0, 11);

  switch (linkType) {
    case 'zoom':
      return `https://zoom.us/j/${meetingId}`;
    case 'google_meet':
      return `https://meet.google.com/${meetingId.substring(0, 3)}-${meetingId.substring(3, 7)}-${meetingId.substring(7, 10)}`;
    default:
      return '';
  }
}
