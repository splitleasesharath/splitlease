/**
 * EditDatesModal - Modal for editing suggested meeting dates
 * Allows admin to modify, add, or remove suggested date/time options
 */

import { useState, useMemo } from 'react';
import { formatMeetingForDisplay } from '../../../../logic/processors/meetings/filterMeetings';

export default function EditDatesModal({
  meeting,
  onSave,
  onClose,
  isSubmitting
}) {
  const formatted = useMemo(() => formatMeetingForDisplay(meeting), [meeting]);

  // Initialize with existing dates
  const [dates, setDates] = useState(() => {
    const existing = meeting?.suggested_dates_and_times || [];
    return existing.map(d => ({ id: crypto.randomUUID(), value: formatForInput(d) }));
  });

  const [newDate, setNewDate] = useState('');

  const handleAddDate = () => {
    if (!newDate) return;

    setDates(prev => [
      ...prev,
      { id: crypto.randomUUID(), value: newDate }
    ]);
    setNewDate('');
  };

  const handleRemoveDate = (id) => {
    setDates(prev => prev.filter(d => d.id !== id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (dates.length === 0) return;

    const isoDateStrings = dates.map(d => new Date(d.value).toISOString());
    onSave(meeting._id || meeting.id, isoDateStrings);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--edit-dates" onClick={e => e.stopPropagation()}>
        <header className="modal__header">
          <h2 className="modal__title">Edit Suggested Dates</h2>
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
          {/* Meeting Info */}
          <div className="modal__info-card modal__info-card--compact">
            <span className="modal__info-label">Guest:</span>
            <span className="modal__info-value">{formatted?.guestName}</span>
          </div>

          {/* Current Dates */}
          <div className="modal__field">
            <label className="modal__label">Suggested Date/Times</label>
            <div className="modal__dates-list">
              {dates.map((date) => (
                <div key={date.id} className="modal__date-item">
                  <input
                    type="datetime-local"
                    value={date.value}
                    onChange={(e) => {
                      setDates(prev => prev.map(d =>
                        d.id === date.id ? { ...d, value: e.target.value } : d
                      ));
                    }}
                    className="modal__input modal__input--datetime"
                  />
                  <button
                    type="button"
                    className="modal__date-remove"
                    onClick={() => handleRemoveDate(date.id)}
                    aria-label="Remove date"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}

              {dates.length === 0 && (
                <p className="modal__empty-dates">No dates added. Add at least one date.</p>
              )}
            </div>
          </div>

          {/* Add New Date */}
          <div className="modal__field">
            <label className="modal__label">Add New Date/Time</label>
            <div className="modal__add-date-row">
              <input
                type="datetime-local"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="modal__input modal__input--datetime"
                min={getMinDateTime()}
              />
              <button
                type="button"
                className="modal__btn modal__btn--add"
                onClick={handleAddDate}
                disabled={!newDate}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add
              </button>
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
              disabled={dates.length === 0 || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="modal__spinner" />
                  Saving...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  Save Changes
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
 * Format ISO date string to datetime-local input format
 */
function formatForInput(isoString) {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return date.toISOString().slice(0, 16);
  } catch {
    return '';
  }
}

/**
 * Get minimum date/time for the input (now)
 */
function getMinDateTime() {
  return new Date().toISOString().slice(0, 16);
}
