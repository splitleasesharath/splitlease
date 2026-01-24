/**
 * ReservationPriceBreakdown - Displays pricing and schedule details for hosts
 *
 * Shows proposal details with highlighting for changed values.
 * Host-focused: displays compensation only, not guest pricing.
 *
 * Design matches mockup: clean rows, no edit icons, "Changed" badges
 */

import { formatCurrency, formatDate, getDayName } from './types'

/**
 * Convert day index (string or number) to day name
 */
function formatDayDisplay(dayValue) {
  if (dayValue === null || dayValue === undefined) return ''

  // If it's already a day name (e.g., "Sunday"), return as-is
  if (typeof dayValue === 'string' && isNaN(parseInt(dayValue, 10))) {
    return dayValue
  }

  // Convert index to day name
  const index = typeof dayValue === 'string' ? parseInt(dayValue, 10) : dayValue

  // Try JS format first (0-6)
  const jsResult = getDayName(index)
  if (jsResult) return jsResult

  // Try Bubble format (1-7) - convert to JS format by subtracting 1
  if (index >= 1 && index <= 7) {
    const bubbleToJs = index === 7 ? 6 : index - 1
    const bubbleResult = getDayName(bubbleToJs)
    if (bubbleResult) return bubbleResult
  }

  return dayValue
}

/**
 * ReservationPriceBreakdown Component
 *
 * Host-focused breakdown showing compensation details only.
 * Matches mockup design: changed values show original struck through + new in green
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
  originalTotalCompensation,
  originalCompensationPer4Weeks,
  isVisible = true,
  originalValues
}) {
  if (!isVisible) return null

  const nightsCount = nightsSelected.length * weeksReservationSpan
  const originalNightsCount = originalValues?.nightsSelected
    ? originalValues.nightsSelected.length * (originalValues.weeksReservationSpan || 0)
    : 0

  // Helper to check if a value changed
  const hasChanged = {
    moveInDate: originalValues?.moveInDate
      ? formatDate(originalValues.moveInDate, 'short') !== formatDate(moveInDate, 'short')
      : false,
    checkInDay: originalValues?.checkInDay !== undefined
      ? formatDayDisplay(originalValues.checkInDay) !== formatDayDisplay(checkInDay)
      : false,
    checkOutDay: originalValues?.checkOutDay !== undefined
      ? formatDayDisplay(originalValues.checkOutDay) !== formatDayDisplay(checkOutDay)
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

  // Check if scheduling changed (affects pricing)
  const schedulingChanged = hasChanged.nightsSelected || hasChanged.weeksReservationSpan

  return (
    <div className="hep-breakdown">
      {/* Move-in Date */}
      <div className="hep-breakdown-row">
        <span className="hep-breakdown-label">Move-in</span>
        {hasChanged.moveInDate ? (
          <span className="hep-breakdown-value hep-breakdown-value--changed">
            <span className="hep-breakdown-original">{formatDate(originalValues.moveInDate, 'short')}</span>
            <span className="hep-breakdown-new">{formatDate(moveInDate)}</span>
          </span>
        ) : (
          <span className="hep-breakdown-value">{formatDate(moveInDate)}</span>
        )}
      </div>

      {/* Check-in */}
      <div className="hep-breakdown-row">
        <span className="hep-breakdown-label">Check-in</span>
        {hasChanged.checkInDay ? (
          <span className="hep-breakdown-value hep-breakdown-value--changed">
            <span className="hep-breakdown-original">{formatDayDisplay(originalValues.checkInDay)}</span>
            <span className="hep-breakdown-new">{formatDayDisplay(checkInDay)}</span>
          </span>
        ) : (
          <span className="hep-breakdown-value">{formatDayDisplay(checkInDay)}</span>
        )}
      </div>

      {/* Check-out */}
      <div className="hep-breakdown-row">
        <span className="hep-breakdown-label">Check-out</span>
        {hasChanged.checkOutDay ? (
          <span className="hep-breakdown-value hep-breakdown-value--changed">
            <span className="hep-breakdown-original">{formatDayDisplay(originalValues.checkOutDay)}</span>
            <span className="hep-breakdown-new">{formatDayDisplay(checkOutDay)}</span>
          </span>
        ) : (
          <span className="hep-breakdown-value">{formatDayDisplay(checkOutDay)}</span>
        )}
      </div>

      {/* Reservation Length */}
      <div className="hep-breakdown-row">
        <span className="hep-breakdown-label">
          Reservation Length
          {hasChanged.weeksReservationSpan && <span className="hep-change-badge">Changed</span>}
        </span>
        {hasChanged.weeksReservationSpan ? (
          <span className="hep-breakdown-value hep-breakdown-value--changed">
            <span className="hep-breakdown-original">{originalValues.weeksReservationSpan} wks</span>
            <span className="hep-breakdown-new">{weeksReservationSpan} weeks</span>
          </span>
        ) : (
          <span className="hep-breakdown-value">{weeksReservationSpan} weeks</span>
        )}
      </div>

      {/* Nights/week */}
      <div className="hep-breakdown-row">
        <span className="hep-breakdown-label">
          Nights/week
          {hasChanged.nightsSelected && <span className="hep-change-badge">Changed</span>}
        </span>
        {hasChanged.nightsSelected ? (
          <span className="hep-breakdown-value hep-breakdown-value--changed">
            <span className="hep-breakdown-original">{originalValues.nightsSelected.length} nights</span>
            <span className="hep-breakdown-new">{nightsSelected.length} nights</span>
          </span>
        ) : (
          <span className="hep-breakdown-value">{nightsSelected.length} nights</span>
        )}
      </div>

      {/* House Rules */}
      <div className="hep-breakdown-row">
        <span className="hep-breakdown-label">
          House Rules
          {hasChanged.houseRules && <span className="hep-change-badge">Changed</span>}
        </span>
        {hasChanged.houseRules ? (
          <span className="hep-breakdown-value hep-breakdown-value--changed">
            <span className="hep-breakdown-original">{originalValues.houseRules?.length || 0} rules</span>
            <span className="hep-breakdown-new">{houseRules.length} rules</span>
          </span>
        ) : (
          <span className="hep-breakdown-value">{houseRules.length} rules</span>
        )}
      </div>

      <hr className="hep-breakdown-divider" />

      {/* Compensation/night */}
      <div className="hep-breakdown-row">
        <span className="hep-breakdown-label">Compensation /night</span>
        <span className="hep-breakdown-value">{formatCurrency(nightlyCompensation)}</span>
      </div>

      {/* Nights reserved */}
      <div className="hep-breakdown-row">
        <span className="hep-breakdown-label">Nights reserved</span>
        {schedulingChanged ? (
          <span className="hep-breakdown-value hep-breakdown-value--changed">
            <span className="hep-breakdown-original">x {originalNightsCount}</span>
            <span className="hep-breakdown-new">x {nightsCount}</span>
          </span>
        ) : (
          <span className="hep-breakdown-value">x {nightsCount}</span>
        )}
      </div>

      <hr className="hep-breakdown-divider" />

      {/* Total Compensation */}
      <div className="hep-breakdown-row hep-breakdown-total">
        <span className="hep-breakdown-label">Total Compensation</span>
        {schedulingChanged && originalTotalCompensation !== undefined ? (
          <span className="hep-breakdown-value hep-breakdown-value--changed">
            <span className="hep-breakdown-original">{formatCurrency(originalTotalCompensation)}</span>
            <span className="hep-breakdown-new">{formatCurrency(totalCompensation)}</span>
          </span>
        ) : (
          <span className="hep-breakdown-value">{formatCurrency(totalCompensation)}</span>
        )}
      </div>
    </div>
  )
}
