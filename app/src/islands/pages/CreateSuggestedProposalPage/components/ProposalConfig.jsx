/**
 * ProposalConfig - Configuration panel for proposal settings
 *
 * Uses 0-indexed days (0=Sunday through 6=Saturday)
 */

import { PROPOSAL_STATUSES } from '../../../../logic/constants/proposalStatuses.js';
import { DAY_NAMES } from '../../../../lib/dayUtils.js';

// Day button labels (single letter display, 0-indexed order starting with Sunday)
const DAY_BUTTONS = [
  { index: 0, label: 'S', title: 'Sunday' },
  { index: 1, label: 'M', title: 'Monday' },
  { index: 2, label: 'T', title: 'Tuesday' },
  { index: 3, label: 'W', title: 'Wednesday' },
  { index: 4, label: 'T', title: 'Thursday' },
  { index: 5, label: 'F', title: 'Friday' },
  { index: 6, label: 'S', title: 'Saturday' }
];

const RESERVATION_SPAN_OPTIONS = [
  { value: '', label: 'Select span' },
  { value: '6', label: '6 weeks' },
  { value: '8', label: '8 weeks' },
  { value: '12', label: '12 weeks' },
  { value: '16', label: '16 weeks' },
  { value: '26', label: '26 weeks' },
  { value: '52', label: '52 weeks' },
  { value: 'custom', label: 'Other (specify weeks)' }
];

const MOVE_IN_RANGE_OPTIONS = [
  { value: 7, label: '1 week' },
  { value: 14, label: '2 weeks' },
  { value: 21, label: '3 weeks' },
  { value: 30, label: '1 month' }
];

// Status options for suggested proposals
const STATUS_OPTIONS = [
  {
    value: PROPOSAL_STATUSES.SUGGESTED_PROPOSAL_AWAITING_RENTAL_APP.key,
    label: 'Proposal Submitted for Guest (Suggested)'
  },
  {
    value: PROPOSAL_STATUSES.HOST_REVIEW.key,
    label: 'Host Review'
  },
  {
    value: PROPOSAL_STATUSES.COUNTEROFFER_SUBMITTED_AWAITING_GUEST_REVIEW.key,
    label: 'Host Counteroffer Submitted'
  }
];

export default function ProposalConfig({
  proposalStatus,
  moveInDate,
  moveInRange,
  strictMoveIn,
  selectedDays,
  checkInDayName,
  checkOutDayName,
  nightsCount,
  reservationSpan,
  customWeeks,
  onStatusChange,
  onMoveInDateChange,
  onMoveInRangeChange,
  onStrictMoveInChange,
  onDayToggle,
  onSelectFullTime,
  onReservationSpanChange,
  onCustomWeeksChange
}) {
  // Get min date for move-in (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div className="csp-config-panel">
      {/* Proposal Status */}
      <div className="csp-config-section">
        <h3>Proposal Configuration</h3>

        <div className="csp-form-group">
          <label htmlFor="proposalStatus">Proposal Status</label>
          <select
            id="proposalStatus"
            className="csp-form-select"
            value={proposalStatus}
            onChange={onStatusChange}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="csp-form-group">
          <label htmlFor="moveInDate">Move-in From</label>
          <input
            type="date"
            id="moveInDate"
            className="csp-form-input"
            value={moveInDate}
            min={minDate}
            onChange={onMoveInDateChange}
          />
        </div>

        <div className="csp-form-group">
          <label htmlFor="moveInRange">Move-in Range</label>
          <select
            id="moveInRange"
            className="csp-form-select"
            value={moveInRange}
            onChange={onMoveInRangeChange}
          >
            {MOVE_IN_RANGE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="csp-form-group csp-checkbox-group">
          <label className="csp-checkbox-label">
            <input
              type="checkbox"
              checked={strictMoveIn}
              onChange={onStrictMoveInChange}
            />
            <span>Strict (no negotiation on exact move in)</span>
          </label>
        </div>
      </div>

      {/* Schedule Selector */}
      <div className="csp-config-section">
        <h3>Schedule Selection</h3>

        <div className="csp-days-selector">
          <label>Weekly Schedule</label>
          <div className="csp-days-buttons">
            {DAY_BUTTONS.map(day => (
              <button
                key={day.index}
                type="button"
                className={`csp-day-btn ${selectedDays.includes(day.index) ? 'active' : ''}`}
                title={day.title}
                onClick={() => onDayToggle(day.index)}
              >
                {day.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="csp-btn-link"
            onClick={onSelectFullTime}
          >
            Select Full Time
          </button>
        </div>

        {/* Check-in/Check-out Display (derived from selected days) */}
        {selectedDays.length > 0 && (
          <div className="csp-checkin-checkout-display">
            {selectedDays.length === 7 ? (
              <div className="csp-schedule-summary">
                <strong>Full-time stay</strong>
              </div>
            ) : (
              <>
                <div className="csp-schedule-summary">
                  <strong>{selectedDays.length} days, {nightsCount} nights</strong> Selected
                </div>
                <div className="csp-check-dates">
                  Check-in day is <strong>{checkInDayName || 'N/A'}</strong>
                  <br />
                  Check-out day is <strong>{checkOutDayName || 'N/A'}</strong>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Reservation Span */}
      <div className="csp-config-section">
        <h3>Reservation Span</h3>

        <div className="csp-form-group">
          <label htmlFor="reservationSpan">Reservation Span</label>
          <select
            id="reservationSpan"
            className="csp-form-select"
            value={reservationSpan}
            onChange={onReservationSpanChange}
          >
            {RESERVATION_SPAN_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {reservationSpan === 'custom' && (
          <div className="csp-form-group">
            <label htmlFor="customWeeks">Enter # of Weeks</label>
            <input
              type="number"
              id="customWeeks"
              className="csp-form-input"
              min="6"
              max="52"
              placeholder="6-52 weeks"
              value={customWeeks || ''}
              onChange={onCustomWeeksChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
