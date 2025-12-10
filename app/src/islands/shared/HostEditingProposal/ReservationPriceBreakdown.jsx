/**
 * ReservationPriceBreakdown - Displays pricing and schedule details
 *
 * Shows proposal details with highlighting for changed values
 */

import { formatCurrency, formatDate } from './types'

/**
 * ReservationPriceBreakdown Component
 *
 * @param {Object} props
 * @param {Date} props.moveInDate - Move-in date
 * @param {string} props.checkInDay - Check-in day name
 * @param {string} props.checkOutDay - Check-out day name
 * @param {Object} props.reservationSpan - Reservation span object
 * @param {number} props.weeksReservationSpan - Number of weeks
 * @param {Array} props.houseRules - Array of house rules
 * @param {string[]} props.nightsSelected - Array of selected night names
 * @param {number} props.nightlyCompensation - Nightly compensation amount
 * @param {number} props.nightlyPrice - Nightly price
 * @param {number} props.totalCompensation - Total compensation
 * @param {number} props.totalPrice - Total price
 * @param {number} props.hostCompensationPer4Weeks - Host compensation per 4 weeks
 * @param {number} props.pricePer4Weeks - Price per 4 weeks
 * @param {number} props.damageDeposit - Damage deposit
 * @param {number} props.cleaningFee - Cleaning/maintenance fee
 * @param {boolean} props.isVisible - Whether component is visible
 * @param {Object} props.originalValues - Original values for comparison
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
  nightlyPrice = 0,
  totalCompensation = 0,
  totalPrice = 0,
  hostCompensationPer4Weeks = 0,
  pricePer4Weeks = 0,
  damageDeposit = 0,
  cleaningFee = 0,
  isVisible = true,
  originalValues
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
          {checkInDay}
          {hasChanged.checkInDay && originalValues?.checkInDay && (
            <span className="hep-original-value">was: {originalValues.checkInDay}</span>
          )}
        </span>
      </div>

      <div className={getRowClass(hasChanged.checkOutDay)}>
        <span className="hep-breakdown-row-label">Check-out</span>
        <span className="hep-breakdown-row-value">
          {checkOutDay}
          {hasChanged.checkOutDay && originalValues?.checkOutDay && (
            <span className="hep-original-value">was: {originalValues.checkOutDay}</span>
          )}
        </span>
      </div>

      <div className={getRowClass(hasChanged.reservationSpan || hasChanged.weeksReservationSpan)}>
        <span className="hep-breakdown-row-label">Reservation Length</span>
        <span className="hep-breakdown-row-value">
          {reservationSpan?.value === 'other' ? `${weeksReservationSpan} weeks` : reservationSpan?.label}
          {(hasChanged.reservationSpan || hasChanged.weeksReservationSpan) &&
            originalValues?.reservationSpan && (
              <span className="hep-original-value">
                was: {originalValues.reservationSpan?.value === 'other'
                  ? `${originalValues.weeksReservationSpan} weeks`
                  : originalValues.reservationSpan?.label}
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
          {hasChanged.nightsSelected && originalValues?.nightsSelected && (
            <span className="hep-original-value">
              was: {originalValues.nightsSelected.length} nights/week
            </span>
          )}
        </span>
      </div>

      <div className={getRowClass(hasChanged.weeksReservationSpan)}>
        <span className="hep-breakdown-row-label">Actual Weeks Used</span>
        <span className="hep-breakdown-row-value">
          {weeksReservationSpan}
          {hasChanged.weeksReservationSpan && originalValues?.weeksReservationSpan && (
            <span className="hep-original-value">
              was: {originalValues.weeksReservationSpan}
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

      <div className="hep-breakdown-row">
        <span className="hep-breakdown-row-label">Price per night</span>
        <span className="hep-breakdown-row-value">
          {formatCurrency(nightlyPrice)}
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

      <div className={getRowClass(schedulingChanged)}>
        <span className="hep-breakdown-row-label">Total Compensation</span>
        <span className="hep-breakdown-row-value">
          {formatCurrency(totalCompensation)}
        </span>
      </div>

      <div className={getRowClass(schedulingChanged)}>
        <span className="hep-breakdown-row-label">Total Price</span>
        <span className="hep-breakdown-row-value">
          {formatCurrency(totalPrice)}
        </span>
      </div>

      <div className={`hep-breakdown-row hep-breakdown-row-highlight${schedulingChanged ? ' hep-breakdown-row-changed' : ''}`}>
        <span className="hep-breakdown-row-label">Compensation / 4 weeks</span>
        <span className="hep-breakdown-row-value">
          {formatCurrency(hostCompensationPer4Weeks)}
        </span>
      </div>

      <div className={`hep-breakdown-row hep-breakdown-row-highlight${schedulingChanged ? ' hep-breakdown-row-changed' : ''}`}>
        <span className="hep-breakdown-row-label">Price per 4 weeks</span>
        <span className="hep-breakdown-row-value">
          {formatCurrency(pricePer4Weeks)}
        </span>
      </div>

      <div className="hep-breakdown-row">
        <span className="hep-breakdown-row-label">Refundable Damage Deposit</span>
        <span className="hep-breakdown-row-value">
          {formatCurrency(damageDeposit)}
        </span>
      </div>

      <div className="hep-breakdown-row">
        <span className="hep-breakdown-row-label">Maintenance Fee</span>
        <span className="hep-breakdown-row-value">
          {formatCurrency(cleaningFee)}
        </span>
      </div>

      <p className="hep-breakdown-footnote">
        *Refundable Damage Deposit is collected before move-in and returned after
        checkout if no damages occur.
      </p>
    </div>
  )
}
