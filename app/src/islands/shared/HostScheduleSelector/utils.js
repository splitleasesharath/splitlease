/**
 * Utility functions for the Host Schedule Selector component
 * Includes contiguity checking, sequencing, and calculations
 *
 * Day indices use JavaScript's 0-based standard (matching Date.getDay()):
 * 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
 */

import { getNightById, getNightByDayIndex, ALL_NIGHTS } from './constants.js'

/**
 * Check if selected nights form a contiguous block
 * Returns true if nights are consecutive (no gaps)
 * @param {import('./types.js').NightId[]} selectedNights
 * @returns {import('./types.js').ContiguityResult}
 */
export function checkContiguity(selectedNights) {
  if (selectedNights.length <= 1) {
    return { isContiguous: true }
  }

  // Convert to day indices (0-6) and sort
  const numbers = selectedNights
    .map((id) => getNightById(id).dayIndex)
    .sort((a, b) => a - b)

  // Check for gaps
  const gaps = []
  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i] !== numbers[i - 1] + 1) {
      gaps.push(i)
    }
  }

  return {
    isContiguous: gaps.length === 0,
    gaps,
  }
}

/**
 * Get sequence of nights between two nights (inclusive)
 * Handles both ascending and descending sequences
 * @param {import('./types.js').NightId} startNightId
 * @param {import('./types.js').NightId} endNightId
 * @returns {import('./types.js').NightId[]}
 */
export function getNightSequence(startNightId, endNightId) {
  const startNight = getNightById(startNightId)
  const endNight = getNightById(endNightId)

  const startIdx = startNight.dayIndex
  const endIdx = endNight.dayIndex

  const sequence = []

  if (startIdx <= endIdx) {
    // Ascending order
    for (let i = startIdx; i <= endIdx; i++) {
      sequence.push(getNightByDayIndex(i).id)
    }
  } else {
    // Descending order
    for (let i = startIdx; i >= endIdx; i--) {
      sequence.push(getNightByDayIndex(i).id)
    }
  }

  return sequence
}

/**
 * Auto-fill nights between two selections to create a contiguous block
 * This implements the "sequence filling" logic from Workflow 9
 * @param {import('./types.js').NightId[]} currentlySelected
 * @param {import('./types.js').NightId} newNightId
 * @returns {import('./types.js').NightId[]}
 */
export function autoFillSequence(currentlySelected, newNightId) {
  if (currentlySelected.length === 0) {
    return [newNightId]
  }

  if (currentlySelected.length === 1) {
    const firstNight = getNightById(currentlySelected[0])
    const newNight = getNightById(newNightId)

    // Get sequence between the two nights
    const sequence = getNightSequence(firstNight.id, newNight.id)
    return sequence
  }

  // If more than 1 already selected, just add the new one
  return [...currentlySelected, newNightId]
}

/**
 * Auto-complete to 7 nights when 6 are selected
 * Finds the missing night and adds it
 * @param {import('./types.js').NightId[]} selectedNights
 * @returns {import('./types.js').NightId[]}
 */
export function autoCompleteToSeven(selectedNights) {
  if (selectedNights.length !== 6) {
    return selectedNights
  }

  const allNightIds = ALL_NIGHTS.map((n) => n.id)
  const missingNight = allNightIds.find((id) => !selectedNights.includes(id))

  if (missingNight) {
    return [...selectedNights, missingNight]
  }

  return selectedNights
}

/**
 * Get nights that are NOT selected
 * @param {import('./types.js').NightId[]} selectedNights
 * @returns {import('./types.js').NightId[]}
 */
export function getNotSelectedNights(selectedNights) {
  return ALL_NIGHTS.map((n) => n.id).filter((id) => !selectedNights.includes(id))
}

/**
 * Sort nights by their day index (0-6)
 * @param {import('./types.js').NightId[]} nights
 * @returns {import('./types.js').NightId[]}
 */
export function sortNights(nights) {
  return [...nights].sort((a, b) => {
    const nightA = getNightById(a)
    const nightB = getNightById(b)
    return nightA.dayIndex - nightB.dayIndex
  })
}

/**
 * Get check-in day from selected nights
 * Check-in day is the first day NOT in the selected nights
 * @param {import('./types.js').NightId[]} selectedNights
 * @param {import('./types.js').NightId[]} notSelectedNights
 * @returns {import('./types.js').DayId | null}
 */
export function getCheckInDay(selectedNights, notSelectedNights) {
  if (notSelectedNights.length === 0) {
    return null
  }

  // Sort not-selected nights to get the first one
  const sorted = sortNights(notSelectedNights)
  const firstNotSelected = getNightById(sorted[0])

  // Handle corner case when Sunday is selected
  if (!notSelectedNights.includes('sunday')) {
    // Special logic for Sunday corner case
    const firstSelected = sortNights(selectedNights)[0]
    return getNightById(firstSelected).associatedCheckin
  }

  return firstNotSelected.associatedCheckin
}

/**
 * Get check-out day from selected nights
 * Check-out day is the day after the last selected night
 * @param {import('./types.js').NightId[]} selectedNights
 * @param {import('./types.js').NightId[]} notSelectedNights
 * @returns {import('./types.js').DayId | null}
 */
export function getCheckOutDay(selectedNights, notSelectedNights) {
  if (notSelectedNights.length === 0) {
    return null
  }

  // Handle corner case when Sunday is NOT in not-selected nights
  if (!notSelectedNights.includes('sunday')) {
    // Special logic for Sunday corner case
    const lastSelected = sortNights(selectedNights).slice(-1)[0]
    return getNightById(lastSelected).associatedCheckout
  }

  const sorted = sortNights(notSelectedNights)
  const firstNotSelected = getNightById(sorted[0])
  return firstNotSelected.associatedCheckout
}

/**
 * Get start night day index (0-6 index of first selected night)
 * @param {import('./types.js').NightId[]} selectedNights
 * @param {import('./types.js').NightId[]} notSelectedNights
 * @returns {number | null}
 */
export function getStartNightNumber(selectedNights, notSelectedNights) {
  if (selectedNights.length === 0) {
    return null
  }

  const sorted = sortNights(selectedNights)

  // Handle corner case when Sunday is NOT in not-selected nights
  if (!notSelectedNights.includes('sunday')) {
    // If Sunday is selected, it might wrap around
    // 0-6 indexing: low = 0-2 (Sun-Tue), high = 4-6 (Thu-Sat)
    const hasLowNumbers = sorted.some((id) => getNightById(id).dayIndex <= 2)
    const hasHighNumbers = sorted.some((id) => getNightById(id).dayIndex >= 4)

    if (hasLowNumbers && hasHighNumbers) {
      // Wraps around Sunday, start is the first low number
      const lowNumbers = sorted.filter((id) => getNightById(id).dayIndex <= 2)
      return getNightById(lowNumbers[0]).dayIndex
    }
  }

  return getNightById(sorted[0]).dayIndex
}

/**
 * Get end night day index (0-6 index of last selected night)
 * @param {import('./types.js').NightId[]} selectedNights
 * @param {import('./types.js').NightId[]} notSelectedNights
 * @returns {number | null}
 */
export function getEndNightNumber(selectedNights, notSelectedNights) {
  if (selectedNights.length === 0) {
    return null
  }

  const sorted = sortNights(selectedNights)

  // Handle corner case when Sunday is NOT in not-selected nights
  if (!notSelectedNights.includes('sunday')) {
    // If Sunday is selected, it might wrap around
    // 0-6 indexing: low = 0-2 (Sun-Tue), high = 4-6 (Thu-Sat)
    const hasLowNumbers = sorted.some((id) => getNightById(id).dayIndex <= 2)
    const hasHighNumbers = sorted.some((id) => getNightById(id).dayIndex >= 4)

    if (hasLowNumbers && hasHighNumbers) {
      // Wraps around Sunday, end is the last high number
      const highNumbers = sorted.filter((id) => getNightById(id).dayIndex >= 4)
      return getNightById(highNumbers[highNumbers.length - 1]).dayIndex
    }
  }

  return getNightById(sorted[sorted.length - 1]).dayIndex
}

/**
 * Convert night IDs to day IDs
 * @param {import('./types.js').NightId[]} nightIds
 * @returns {import('./types.js').DayId[]}
 */
export function nightsToDays(nightIds) {
  return nightIds.map((id) => getNightById(id).sameDay)
}

/**
 * Validate selection based on business rules
 * @param {import('./types.js').NightId[]} selectedNights
 * @param {Object} options
 * @param {number} [options.minNights=0]
 * @param {number} [options.maxNights=7]
 * @param {boolean} [options.enforceContiguous=false]
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateSelection(selectedNights, options = {}) {
  const { minNights = 0, maxNights = 7, enforceContiguous = false } = options

  if (selectedNights.length < minNights) {
    return {
      valid: false,
      error: `Minimum ${minNights} night${minNights !== 1 ? 's' : ''} required`,
    }
  }

  if (selectedNights.length > maxNights) {
    return {
      valid: false,
      error: `Maximum ${maxNights} night${maxNights !== 1 ? 's' : ''} allowed`,
    }
  }

  if (enforceContiguous) {
    const { isContiguous } = checkContiguity(selectedNights)
    if (!isContiguous) {
      return {
        valid: false,
        error: 'Selected nights must be contiguous (consecutive)',
      }
    }
  }

  return { valid: true }
}

/**
 * Check if a night is available in the listing
 * @param {import('./types.js').NightId} nightId
 * @param {import('./types.js').NightId[]} availableNights
 * @returns {boolean}
 */
export function isNightAvailable(nightId, availableNights) {
  return availableNights.includes(nightId)
}
