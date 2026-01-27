/**
 * parseProposalData.js
 *
 * Utility functions to parse proposal data with multi-format field name support.
 * Handles both Bubble camelCase and database snake_case formats.
 *
 * Extracted from HostEditingProposal.jsx for better separation of concerns
 * and testability.
 */

import { nightIndicesToNames, findReservationSpanByWeeks, RESERVATION_SPANS, getDayName } from './types'

/**
 * Get a date value from proposal with fallback field name support
 * @param {Object} proposal - The proposal object
 * @param {string} field - The field name to look up (camelCase)
 * @param {Date|string|null} fallback - Fallback value if field not found
 * @returns {Date} The parsed date
 */
export function getProposalDate(proposal, field, fallback = null) {
  const value = proposal?.[field] || proposal?.[field.replace(/([A-Z])/g, ' $1').trim()]
  if (!value) return fallback ? new Date(fallback) : new Date()
  return new Date(value)
}

/**
 * Get a value from proposal with fallback field name support
 * @param {Object} proposal - The proposal object
 * @param {string} field - The field name to look up (camelCase)
 * @param {*} fallback - Fallback value if field not found
 * @returns {*} The field value or fallback
 */
export function getProposalValue(proposal, field, fallback) {
  return proposal?.[field] ??
         proposal?.[field.replace(/([A-Z])/g, ' $1').trim()] ??
         fallback
}

/**
 * Extract check-in day from proposal
 * @param {Object} proposal - The proposal object
 * @returns {string} The check-in day name (e.g., 'Monday')
 */
export function extractCheckInDay(proposal) {
  const value = proposal?.['check in day'] ?? proposal?.checkInDay
  // If value is a number or numeric string (day index), convert to day name
  if (typeof value === 'number' || (typeof value === 'string' && /^\d$/.test(value))) {
    return getDayName(Number(value)) || 'Monday'
  }
  return value || 'Monday'
}

/**
 * Extract check-out day from proposal
 * @param {Object} proposal - The proposal object
 * @returns {string} The check-out day name (e.g., 'Friday')
 */
export function extractCheckOutDay(proposal) {
  const value = proposal?.['check out day'] ?? proposal?.checkOutDay
  // If value is a number or numeric string (day index), convert to day name
  if (typeof value === 'number' || (typeof value === 'string' && /^\d$/.test(value))) {
    return getDayName(Number(value)) || 'Friday'
  }
  return value || 'Friday'
}

/**
 * Extract reservation span weeks from proposal
 * @param {Object} proposal - The proposal object
 * @returns {number} The number of weeks for the reservation span
 */
export function extractReservationSpanWeeks(proposal) {
  return proposal?.['Reservation Span (Weeks)'] || proposal?.reservationSpanWeeks || 8
}

/**
 * Extract nights selected from proposal, handling multiple formats:
 * - Database: "Nights Selected (Nights list)" = [0, 5] (indices)
 * - Alternative: "nightsSelected" = ['Sunday Night', 'Friday Night'] (names)
 * @param {Object} proposal - The proposal object
 * @returns {string[]} Array of night names for component use
 */
export function extractNightsSelected(proposal) {
  // Try database format first: array of indices
  const nightIndices = proposal?.['Nights Selected (Nights list)']
  if (Array.isArray(nightIndices) && nightIndices.length > 0 && typeof nightIndices[0] === 'number') {
    return nightIndicesToNames(nightIndices)
  }
  // Try camelCase format (already names)
  const nightNames = proposal?.nightsSelected
  if (Array.isArray(nightNames) && nightNames.length > 0) {
    return nightNames
  }
  // Default fallback
  return ['Monday Night', 'Tuesday Night', 'Wednesday Night', 'Thursday Night']
}

/**
 * Extract and normalize house rules from proposal or listing
 * Handles multiple formats:
 * - Array of strings (rule names): ["No Smoking", "No Parties"]
 * - Array of IDs (Bubble format): ["1556151847445x748291628265310200"]
 * - Array of objects: [{id, name}, ...]
 * @param {Object} proposal - The proposal object
 * @param {Object} listing - The listing object (fallback source)
 * @param {Array} availableHouseRules - List of available house rules to match against
 * @returns {Array<{id: string, name: string}>} Array of house rule objects
 */
export function extractHouseRules(proposal, listing, availableHouseRules = []) {
  // Try proposal first, then listing
  const rawRules = proposal?.houseRules ||
                   proposal?.['House Rules'] ||
                   proposal?.['Features - House Rules'] ||
                   listing?.houseRules ||
                   listing?.['Features - House Rules'] ||
                   []

  if (!Array.isArray(rawRules) || rawRules.length === 0) {
    return []
  }

  // If already in correct format (objects with id and name)
  if (rawRules[0] && typeof rawRules[0] === 'object' && rawRules[0].id) {
    return rawRules
  }

  // If array of strings, try to match with availableHouseRules
  if (typeof rawRules[0] === 'string') {
    // Check if they look like Bubble IDs (long numeric strings with x)
    const looksLikeIds = rawRules[0].includes('x') && rawRules[0].length > 20

    if (looksLikeIds) {
      // Match by ID
      return rawRules
        .map(id => availableHouseRules.find(r => r.id === id))
        .filter(Boolean)
    } else {
      // Match by name (case-insensitive)
      return rawRules
        .map(name => availableHouseRules.find(r =>
          r.name?.toLowerCase() === name?.toLowerCase()
        ))
        .filter(Boolean)
    }
  }

  return []
}

/**
 * Parse all proposal data at once for comparison and initialization
 * @param {Object} proposal - The proposal object
 * @param {Object} listing - The listing object (for house rules fallback)
 * @param {Array} availableHouseRules - List of available house rules
 * @returns {Object} Parsed proposal data
 */
export function parseProposalData(proposal, listing = {}, availableHouseRules = []) {
  const weeks = extractReservationSpanWeeks(proposal)
  const reservationSpan = findReservationSpanByWeeks(weeks) ||
                          RESERVATION_SPANS.find(s => s.value === 'other')

  return {
    moveInDate: getProposalDate(proposal, 'moveInRangeStart', proposal?.['Move in range start']),
    checkInDay: extractCheckInDay(proposal),
    checkOutDay: extractCheckOutDay(proposal),
    reservationSpanWeeks: weeks,
    reservationSpan,
    nightsSelected: extractNightsSelected(proposal),
    houseRules: extractHouseRules(proposal, listing, availableHouseRules),
    daysSelected: getProposalValue(proposal, 'daysSelected', ['Monday', 'Tuesday', 'Wednesday', 'Thursday'])
  }
}

/**
 * Format a date for display
 * @param {Date} date - The date to format
 * @param {string} format - Format type: 'full' or 'short'
 * @returns {string} Formatted date string
 */
export function formatDateDisplay(date, format = 'full') {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return ''
  }

  if (format === 'short') {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date)
  }

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date)
}
