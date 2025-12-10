/**
 * HostEditingProposal - Shared Island Exports
 *
 * Main component for hosts to review, edit, and counteroffer guest proposals.
 *
 * Usage:
 * ```jsx
 * import { HostEditingProposal } from 'islands/shared/HostEditingProposal'
 *
 * function MyComponent() {
 *   return (
 *     <HostEditingProposal
 *       proposal={proposalData}
 *       availableHouseRules={houseRules}
 *       onAcceptAsIs={handleAcceptAsIs}
 *       onCounteroffer={handleCounteroffer}
 *       onReject={handleReject}
 *       onCancel={handleCancel}
 *       onAlert={handleAlert}
 *     />
 *   )
 * }
 * ```
 */

// Main Component
export { HostEditingProposal } from './HostEditingProposal'

// Sub-components
export { ReservationPriceBreakdown } from './ReservationPriceBreakdown'
export { ScheduleSelector } from './ScheduleSelector'
export {
  DateInput,
  ReservationSpanDropdown,
  NumberInput,
  HouseRulesMultiSelect
} from './FormInputs'

// Types and Constants
export {
  DAYS_OF_WEEK,
  NIGHTS_CONFIG,
  RESERVATION_SPANS,
  PROPOSAL_STATUSES,
  ALERT_TYPES,
  getDayName,
  getNightName,
  nightIndicesToNames,
  nightNamesToIndices,
  getCheckInDay,
  getCheckOutDay,
  nightsToDays,
  formatCurrency,
  formatDate,
  formatDateForInput,
  addWeeks,
  findReservationSpanByWeeks
} from './types'
