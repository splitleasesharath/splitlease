/**
 * Host Schedule Selector - Public API
 *
 * Exports all components, utilities, and constants for the
 * Host Schedule Selector shared island.
 */

// Main component exports
export { default } from './HostScheduleSelector.jsx'
export { default as HostScheduleSelector } from './HostScheduleSelector.jsx'
export { default as SimpleHostScheduleSelector } from './SimpleHostScheduleSelector.jsx'

// Constants exports
export {
  ALL_NIGHTS,
  NIGHTS_MAP,
  getNightById,
  getNightByNumber,
} from './constants.js'

// Utility exports
export {
  checkContiguity,
  getNightSequence,
  autoFillSequence,
  autoCompleteToSeven,
  getNotSelectedNights,
  sortNights,
  getCheckInDay,
  getCheckOutDay,
  getStartNightNumber,
  getEndNightNumber,
  nightsToDays,
  validateSelection,
  isNightAvailable,
} from './utils.js'
