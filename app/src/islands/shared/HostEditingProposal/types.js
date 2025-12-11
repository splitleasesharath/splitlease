/**
 * HostEditingProposal Types and Constants
 *
 * Aligned with existing codebase patterns:
 * - 0-based day indexing (0=Sunday, 6=Saturday) internally
 * - 1-based (1=Sunday, 7=Saturday) for Bubble API
 */

// ============================================================================
// Days of Week - Using 0-based indexing (matches JS Date.getDay())
// ============================================================================

export const DAYS_OF_WEEK = [
  { id: 0, name: 'Sunday', shortName: 'Sun', singleLetter: 'S', bubbleNumber: 1 },
  { id: 1, name: 'Monday', shortName: 'Mon', singleLetter: 'M', bubbleNumber: 2 },
  { id: 2, name: 'Tuesday', shortName: 'Tue', singleLetter: 'T', bubbleNumber: 3 },
  { id: 3, name: 'Wednesday', shortName: 'Wed', singleLetter: 'W', bubbleNumber: 4 },
  { id: 4, name: 'Thursday', shortName: 'Thu', singleLetter: 'T', bubbleNumber: 5 },
  { id: 5, name: 'Friday', shortName: 'Fri', singleLetter: 'F', bubbleNumber: 6 },
  { id: 6, name: 'Saturday', shortName: 'Sat', singleLetter: 'S', bubbleNumber: 7 }
]

// Map night names to their corresponding check-in/check-out days (0-based)
export const NIGHTS_CONFIG = [
  { id: 0, name: 'Sunday Night', checkInDay: 0, checkOutDay: 1 },
  { id: 1, name: 'Monday Night', checkInDay: 1, checkOutDay: 2 },
  { id: 2, name: 'Tuesday Night', checkInDay: 2, checkOutDay: 3 },
  { id: 3, name: 'Wednesday Night', checkInDay: 3, checkOutDay: 4 },
  { id: 4, name: 'Thursday Night', checkInDay: 4, checkOutDay: 5 },
  { id: 5, name: 'Friday Night', checkInDay: 5, checkOutDay: 6 },
  { id: 6, name: 'Saturday Night', checkInDay: 6, checkOutDay: 0 }
]

// ============================================================================
// Reservation Spans
// ============================================================================

export const RESERVATION_SPANS = [
  { value: '6-weeks', label: '6 weeks', weeks: 6, months: 1.5, days: 42 },
  { value: '7-weeks', label: '7 weeks', weeks: 7, months: 1.75, days: 49 },
  { value: '8-weeks', label: '8 weeks', weeks: 8, months: 2, days: 56 },
  { value: '9-weeks', label: '9 weeks (~2 months)', weeks: 9, months: 2, days: 63 },
  { value: '10-weeks', label: '10 weeks', weeks: 10, months: 2.5, days: 70 },
  { value: '12-weeks', label: '12 weeks', weeks: 12, months: 3, days: 84 },
  { value: '13-weeks', label: '13 weeks (3 months)', weeks: 13, months: 3, days: 91 },
  { value: '16-weeks', label: '16 weeks', weeks: 16, months: 4, days: 112 },
  { value: '17-weeks', label: '17 weeks (~4 months)', weeks: 17, months: 4, days: 119 },
  { value: 'other', label: 'Other', weeks: 0, months: 0, days: 0 }
]

// ============================================================================
// Proposal Statuses
// ============================================================================

export const PROPOSAL_STATUSES = {
  proposal_submitted_for_review: { status: 'proposal_submitted_for_review', displayText: 'Proposal Submitted for Review', usualOrder: 0 },
  proposal_submitted_by_guest: { status: 'proposal_submitted_by_guest', displayText: 'Proposal Submitted by Guest', usualOrder: 1 },
  host_review: { status: 'host_review', displayText: 'Host Review', usualOrder: 2 },
  host_counteroffer_submitted: { status: 'host_counteroffer_submitted', displayText: 'Host Counteroffer Submitted', usualOrder: 3 },
  proposal_accepted: { status: 'proposal_accepted', displayText: 'Proposal or Counteroffer Accepted', usualOrder: 4 },
  lease_documents_sent_to_guest: { status: 'lease_documents_sent_to_guest', displayText: 'Lease Documents Sent to Guest', usualOrder: 5 },
  lease_documents_sent_to_host: { status: 'lease_documents_sent_to_host', displayText: 'Lease Documents Sent to Host', usualOrder: 6 },
  lease_documents_signed: { status: 'lease_documents_signed', displayText: 'Lease Documents Signed', usualOrder: 7 },
  initial_payment_submitted: { status: 'initial_payment_submitted', displayText: 'Initial Payment Submitted', usualOrder: 8 },
  proposal_cancelled_by_guest: { status: 'proposal_cancelled_by_guest', displayText: 'Proposal Cancelled by Guest', usualOrder: 9 },
  proposal_rejected_by_host: { status: 'proposal_rejected_by_host', displayText: 'Proposal Rejected by Host', usualOrder: 10 },
  proposal_cancelled_by_system: { status: 'proposal_cancelled_by_system', displayText: 'Proposal Cancelled by System', usualOrder: 11 },
  guest_ignored_suggestion: { status: 'guest_ignored_suggestion', displayText: 'Guest Ignored Suggestion', usualOrder: 12 }
}

// ============================================================================
// Alert Types
// ============================================================================

export const ALERT_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFORMATION: 'information'
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get day name from 0-based index
 * @param {number} dayIndex - 0-based day index (0=Sunday, 6=Saturday)
 * @returns {string} Day name
 */
export function getDayName(dayIndex) {
  const day = DAYS_OF_WEEK.find(d => d.id === dayIndex)
  return day?.name || ''
}

/**
 * Get night name from 0-based index
 * @param {number} nightIndex - 0-based night index
 * @returns {string} Night name (e.g., "Sunday Night")
 */
export function getNightName(nightIndex) {
  const night = NIGHTS_CONFIG.find(n => n.id === nightIndex)
  return night?.name || ''
}

/**
 * Convert night indices to night names
 * @param {number[]} nightIndices - Array of 0-based night indices
 * @returns {string[]} Array of night names
 */
export function nightIndicesToNames(nightIndices) {
  return nightIndices.map(i => getNightName(i)).filter(Boolean)
}

/**
 * Convert night names to indices
 * @param {string[]} nightNames - Array of night names
 * @returns {number[]} Array of 0-based night indices
 */
export function nightNamesToIndices(nightNames) {
  return nightNames.map(name => {
    const night = NIGHTS_CONFIG.find(n => n.name === name)
    return night?.id
  }).filter(id => id !== undefined)
}

/**
 * Get check-in day from selected nights (first night's check-in)
 * @param {number[]} selectedNights - Array of 0-based night indices
 * @returns {number|null} 0-based day index for check-in
 */
export function getCheckInDay(selectedNights) {
  if (!selectedNights || selectedNights.length === 0) return null
  const sortedNights = [...selectedNights].sort((a, b) => a - b)
  const firstNight = NIGHTS_CONFIG.find(n => n.id === sortedNights[0])
  return firstNight?.checkInDay ?? null
}

/**
 * Get check-out day from selected nights (last night's check-out)
 * @param {number[]} selectedNights - Array of 0-based night indices
 * @returns {number|null} 0-based day index for check-out
 */
export function getCheckOutDay(selectedNights) {
  if (!selectedNights || selectedNights.length === 0) return null
  const sortedNights = [...selectedNights].sort((a, b) => a - b)
  const lastNight = NIGHTS_CONFIG.find(n => n.id === sortedNights[sortedNights.length - 1])
  return lastNight?.checkOutDay ?? null
}

/**
 * Get days from selected nights
 * @param {number[]} selectedNights - Array of 0-based night indices
 * @returns {number[]} Array of 0-based day indices
 */
export function nightsToDays(selectedNights) {
  return selectedNights.map(nightIndex => {
    const night = NIGHTS_CONFIG.find(n => n.id === nightIndex)
    return night?.checkInDay
  }).filter(day => day !== undefined)
}

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '$0.00'
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

/**
 * Format date
 * @param {Date} date - Date to format
 * @param {string} format - 'full' or 'short'
 * @returns {string} Formatted date string
 */
export function formatDate(date, format = 'full') {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return ''

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

/**
 * Format date for input element (YYYY-MM-DD)
 * @param {Date} date - Date to format
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function formatDateForInput(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return ''
  return date.toISOString().split('T')[0]
}

/**
 * Add weeks to a date
 * @param {Date} date - Starting date
 * @param {number} weeks - Number of weeks to add
 * @returns {Date} New date
 */
export function addWeeks(date, weeks) {
  if (!date || !(date instanceof Date)) return new Date()
  const result = new Date(date)
  result.setDate(result.getDate() + (weeks * 7))
  return result
}

/**
 * Find reservation span by weeks
 * @param {number} weeks - Number of weeks
 * @returns {Object|null} Reservation span object
 */
export function findReservationSpanByWeeks(weeks) {
  return RESERVATION_SPANS.find(s => s.weeks === weeks) || null
}
