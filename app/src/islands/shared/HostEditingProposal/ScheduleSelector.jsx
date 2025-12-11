/**
 * ScheduleSelector - Night selection component for HostEditingProposal
 *
 * Hosts select nights, and check-in/check-out days are derived automatically.
 * Uses 0-based indexing internally (0=Sunday, 6=Saturday)
 */

import { useState, useEffect, useCallback } from 'react'
import {
  DAYS_OF_WEEK,
  NIGHTS_CONFIG,
  getCheckInDay,
  getCheckOutDay,
  nightsToDays,
  getDayName
} from './types'

/**
 * Convert 0-based night indices to night names
 */
function nightIndicesToNames(nightIndices) {
  return nightIndices.map(idx => {
    const night = NIGHTS_CONFIG.find(n => n.id === idx)
    return night?.name
  }).filter(Boolean)
}

/**
 * Convert night names to 0-based indices
 */
function nightNamesToIndices(nightNames) {
  return nightNames.map(name => {
    const night = NIGHTS_CONFIG.find(n => n.name === name)
    return night?.id
  }).filter(id => id !== undefined)
}

/**
 * ScheduleSelector Component
 *
 * @param {Object} props
 * @param {string[]} props.initialNightsSelected - Array of night names (e.g., "Sunday Night")
 * @param {string[]} props.availableNights - Array of available night names
 * @param {function} props.onChange - Callback with { checkInDay, checkOutDay, nightsSelected, daysSelected }
 * @param {boolean} props.disabled - Whether the selector is disabled
 */
export function ScheduleSelector({
  initialNightsSelected = [],
  availableNights,
  onChange,
  disabled = false
}) {
  // Convert initial nights to indices
  const initialNightIndices = nightNamesToIndices(initialNightsSelected)
  const [selectedNightIndices, setSelectedNightIndices] = useState(initialNightIndices)

  // Available night indices (all nights if not specified)
  const availableNightIndices = availableNights
    ? nightNamesToIndices(availableNights)
    : NIGHTS_CONFIG.map(n => n.id)

  // Sync with prop changes
  useEffect(() => {
    const newIndices = nightNamesToIndices(initialNightsSelected)
    setSelectedNightIndices(newIndices)
  }, [initialNightsSelected])

  // Emit changes
  const emitChange = useCallback((nightIndices) => {
    const checkInDayIndex = getCheckInDay(nightIndices)
    const checkOutDayIndex = getCheckOutDay(nightIndices)

    if (checkInDayIndex !== null && checkOutDayIndex !== null) {
      onChange({
        checkInDay: getDayName(checkInDayIndex),
        checkOutDay: getDayName(checkOutDayIndex),
        nightsSelected: nightIndicesToNames(nightIndices),
        daysSelected: nightsToDays(nightIndices).map(d => getDayName(d))
      })
    }
  }, [onChange])

  const handleNightClick = useCallback((nightIndex) => {
    if (disabled) return
    if (!availableNightIndices.includes(nightIndex)) return

    const isSelected = selectedNightIndices.includes(nightIndex)
    let newSelection

    if (isSelected) {
      // Remove night
      newSelection = selectedNightIndices.filter(id => id !== nightIndex)
    } else {
      // Add night (max 7)
      if (selectedNightIndices.length >= 7) return
      newSelection = [...selectedNightIndices, nightIndex]
    }

    setSelectedNightIndices(newSelection)
    emitChange(newSelection)
  }, [selectedNightIndices, availableNightIndices, disabled, emitChange])

  // Calculate derived values for display
  const checkInDayIndex = getCheckInDay(selectedNightIndices)
  const checkOutDayIndex = getCheckOutDay(selectedNightIndices)
  const nightsCount = selectedNightIndices.length

  return (
    <div className="hss-host-schedule-selector">
      {/* Night selector grid */}
      <div className="hss-nights-grid">
        {DAYS_OF_WEEK.map((day) => {
          // Night index corresponds to the day index (Sunday Night = 0, Monday Night = 1, etc.)
          const nightIndex = day.id
          const isSelected = selectedNightIndices.includes(nightIndex)
          const isAvailable = availableNightIndices.includes(nightIndex)

          const classes = ['hss-night-cell']
          if (isSelected) classes.push('hss-selected')
          if (!isAvailable) classes.push('hss-unavailable')
          if (disabled) classes.push('hss-disabled')

          return (
            <div
              key={day.id}
              className={classes.join(' ')}
              onClick={() => handleNightClick(nightIndex)}
              role="checkbox"
              aria-checked={isSelected}
              aria-label={`${day.name} night`}
              aria-disabled={disabled || !isAvailable}
              tabIndex={disabled || !isAvailable ? -1 : 0}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault()
                  handleNightClick(nightIndex)
                }
              }}
            >
              <span className="hss-night-letter">{day.singleLetter}</span>
            </div>
          )
        })}
      </div>

      {/* Summary of selection */}
      <div className="hss-selection-summary">
        <div className="hss-summary-item">
          <span className="hss-summary-label">Nights Selected:</span>
          <span className="hss-summary-value">
            {nightsCount} night{nightsCount !== 1 ? 's' : ''}/week
          </span>
        </div>
        {checkInDayIndex !== null && (
          <div className="hss-summary-item">
            <span className="hss-summary-label">Check-in Day:</span>
            <span className="hss-summary-value hss-checkin">
              {getDayName(checkInDayIndex)}
            </span>
          </div>
        )}
        {checkOutDayIndex !== null && (
          <div className="hss-summary-item">
            <span className="hss-summary-label">Check-out Day:</span>
            <span className="hss-summary-value hss-checkout">
              {getDayName(checkOutDayIndex)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
