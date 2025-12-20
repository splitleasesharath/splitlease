/**
 * ReservationPriceBreakdown - Displays pricing and schedule details for hosts
 *
 * Shows proposal details with highlighting for changed values.
 * Host-focused: displays compensation only, not guest pricing.
 */

import { formatCurrency, formatDate, getDayName } from './types'

/**
 * Convert day index (string or number) to day name
 * Handles both "0" (string) and 0 (number) formats from database
 */
function formatDayDisplay(dayValue) {
  if (dayValue === null || dayValue === undefined) return ''

  // If it's already a day name (e.g., "Sunday"), return as-is
  if (typeof dayValue === 'string' && isNaN(parseInt(dayValue, 10))) {
    return dayValue
  }

  // Convert index to day name
  const index = typeof dayValue === 'string' ? parseInt(dayValue, 10) : dayValue
  return getDayName(index) || dayValue
}

/**
 * Edit icon button for editable fields
 */
function EditButton({ onClick, label }) {
  return (
    <button
      type="button"
      className="hep-breakdown-edit-btn"
      onClick={onClick}
      title={`Edit ${label}`}
      aria-label={`Edit ${label}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )
}

/**
 * ReservationPriceBreakdown Component
 *
 * Host-focused breakdown showing compensation details only.
 * Guest pricing (price per night, total price, etc.) is intentionally excluded.
 *
 * @param {Object} props
 * @param {Date} props.moveInDate - Move-in date
 * @param {string|number} props.checkInDay - Check-in day (name or 0-based index)
 * @param {string|number} props.checkOutDay - Check-out day (name or 0-based index)
 * @param {Object} props.reservationSpan - Reservation span object
 * @param {number} props.weeksReservationSpan - Number of weeks
 * @param {Array} props.houseRules - Array of house rules
 * @param {string[]} props.nightsSelected - Array of selected night names
 * @param {number} props.nightlyCompensation - Nightly compensation amount
 * @param {number} props.totalCompensation - Total compensation
 * @param {number} props.hostCompensationPer4Weeks - Host compensation per 4 weeks
 * @param {boolean} props.isVisible - Whether component is visible
 * @param {Object} props.originalValues - Original values for comparison
 * @param {function} props.onEditField - Callback when edit button clicked (field: string) => void
 */
export function ReservationPriceBreakdown({
  moveInDate,
  checkInDay,
  checkOutDay,
  reservationSpan,
  weeksReservationSpan,
  houseRules = [],
  nightsSelected = [],
  nightlyCompensation = 0,
  totalCompensation = 0,
  hostCompensationPer4Weeks = 0,
  isVisible = true,
  originalValues,
  onEditField
}) {
  if (!isVisible) return null

  const nightsCount = nightsSelected.length * weeksReservationSpan

  // Helper to check if a value changed
  const hasChanged = {
    moveInDate: originalValues?.moveInDate
      ? formatDate(originalValues.moveInDate, 'short') !== formatDate(moveInDate, 'short')
      : false,
    checkInDay: originalValues?.checkInDay
      ? originalValues.checkInDay !== checkInDay
      : false,
    checkOutDay: originalValues?.checkOutDay
      ? originalValues.checkOutDay !== checkOutDay
      : false,
    reservationSpan: originalValues?.reservationSpan
      ? originalValues.reservationSpan?.value !== reservationSpan?.value
      : false,
    weeksReservationSpan: originalValues?.weeksReservationSpan
      ? originalValues.weeksReservationSpan !== weeksReservationSpan
      : false,
    houseRules: originalValues?.houseRules
      ? (() => {
          const origIds = new Set((originalValues.houseRules || []).map(r => r.id))
          const newIds = new Set((houseRules || []).map(r => r.id))
          return origIds.size !== newIds.size ||
                 [...origIds].some(id => !newIds.has(id))
        })()
      : false,
    nightsSelected: originalValues?.nightsSelected
      ? (() => {
          const origNights = new Set(originalValues.nightsSelected || [])
          const newNights = new Set(nightsSelected || [])
          return origNights.size !== newNights.size ||
                 [...origNights].some(n => !newNights.has(n))
        })()
      : false
  }

  // Check if any schedule-related field changed (affects pricing)
  const schedulingChanged = hasChanged.nightsSelected || hasChanged.weeksReservationSpan

  // Helper to get row class with change highlight
  const getRowClass = (changed) => {
    return `hep-breakdown-row${changed ? ' hep-breakdown-row-changed' : ''}`
  }

  // Check if any changes exist
  const anyChanges = originalValues && Object.values(hasChanged).some(Boolean)

  return (
    <div className="hep-breakdown-container">
      <h3 className="hep-breakdown-title">Proposal Details</h3>

      {/* Show change indicator if any changes exist */}
      {anyChanges && (
        <div className="hep-changes-indicator">
          <span className="hep-changes-badge">Modified</span>
          <span className="hep-changes-text">Changed items are highlighted</span>
        </div>
      )}

      <div className={getRowClass(hasChanged.moveInDate)}>
        <span className="hep-breakdown-row-label">Move-in</span>
        <span className="hep-breakdown-row-value">
          {formatDate(moveInDate)}
          {onEditField && <EditButton onClick={() => onEditField('moveInDate')} label="move-in date" />}
          {hasChanged.moveInDate && originalValues?.moveInDate && (
            <span className="hep-original-value">
              was: {formatDate(originalValues.moveInDate, 'short')}
            </span>
          )}
        </span>
      </div>

      <div className={getRowClass(hasChanged.checkInDay)}>
        <span className="hep-breakdown-row-label">Check-in</span>
        <span className="hep-breakdown-row-value">
          {formatDayDisplay(checkInDay)}
          {onEditField && <EditButton onClick={() => onEditField('schedule')} label="schedule" />}
          {hasChanged.checkInDay && originalValues?.checkInDay && (
            <span className="hep-original-value">was: {formatDayDisplay(originalValues.checkInDay)}</span>
          )}
        </span>
      </div>

      <div className={getRowClass(hasChanged.checkOutDay)}>
        <span className="hep-breakdown-row-label">Check-out</span>
        <span className="hep-breakdown-row-value">
          {formatDayDisplay(checkOutDay)}
          {onEditField && <EditButton onClick={() => onEditField('schedule')} label="schedule" />}
          {hasChanged.checkOutDay && originalValues?.checkOutDay && (
            <span className="hep-original-value">was: {formatDayDisplay(originalValues.checkOutDay)}</span>
          )}
        </span>
      </div>

      <div className={getRowClass(hasChanged.reservationSpan || hasChanged.weeksReservationSpan)}>
        <span className="hep-breakdown-row-label">Reservation Length</span>
        <span className="hep-breakdown-row-value">
          {weeksReservationSpan} weeks
          {onEditField && <EditButton onClick={() => onEditField('reservationSpan')} label="reservation length" />}
          {(hasChanged.reservationSpan || hasChanged.weeksReservationSpan) &&
            originalValues?.weeksReservationSpan && (
              <span className="hep-original-value">
                was: {originalValues.weeksReservationSpan} weeks
              </span>
            )}
        </span>
      </div>

      <div className={getRowClass(hasChanged.houseRules)}>
        <span className="hep-breakdown-row-label">Your House Rules</span>
        <span className="hep-breakdown-row-value">
          {houseRules.length > 0
            ? houseRules.map(rule => rule.name || rule.Display || rule).join(', ')
            : 'None specified'}
          {onEditField && <EditButton onClick={() => onEditField('houseRules')} label="house rules" />}
          {hasChanged.houseRules && originalValues?.houseRules && (
            <span className="hep-original-value">
              was: {originalValues.houseRules.length > 0
                ? originalValues.houseRules.map(r => r.name || r.Display || r).join(', ')
                : 'None'}
            </span>
          )}
        </span>
      </div>

      <div className={getRowClass(hasChanged.nightsSelected)}>
        <span className="hep-breakdown-row-label">Weekly Pattern</span>
        <span className="hep-breakdown-row-value">
          {nightsSelected.length} nights/week
          {onEditField && <EditButton onClick={() => onEditField('schedule')} label="weekly pattern" />}
          {hasChanged.nightsSelected && originalValues?.nightsSelected && (
            <span className="hep-original-value">
              was: {originalValues.nightsSelected.length} nights/week
            </span>
          )}
        </span>
      </div>

      <div className={getRowClass(schedulingChanged)}>
        <span className="hep-breakdown-row-label">Nights reserved</span>
        <span className="hep-breakdown-row-value">
          {nightsCount}
          {schedulingChanged && originalValues?.nightsSelected && originalValues?.weeksReservationSpan && (
            <span className="hep-original-value">
              was: {originalValues.nightsSelected.length * originalValues.weeksReservationSpan}
            </span>
          )}
        </span>
      </div>

      <div className="hep-breakdown-row">
        <span className="hep-breakdown-row-label">Compensation/night</span>
        <span className="hep-breakdown-row-value">
          {formatCurrency(nightlyCompensation)}
        </span>
      </div>

      <div className={getRowClass(schedulingChanged)}>
        <span className="hep-breakdown-row-label">Total Compensation</span>
        <span className="hep-breakdown-row-value">
          {formatCurrency(totalCompensation)}
        </span>
      </div>

      <div className={`hep-breakdown-row hep-breakdown-row-highlight${schedulingChanged ? ' hep-breakdown-row-changed' : ''}`}>
        <span className="hep-breakdown-row-label">Compensation / 4 weeks</span>
        <span className="hep-breakdown-row-value">
          {formatCurrency(hostCompensationPer4Weeks)}
        </span>
      </div>
    </div>
  )
}
