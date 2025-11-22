/**
 * Logic Core - Rules Index
 * Boolean predicates that enforce business rules.
 * Pure functions that return strict booleans (no side effects).
 */

// Scheduling Rules
export { isScheduleContiguous } from './scheduling/isScheduleContiguous.js'
export { isDateBlocked } from './scheduling/isDateBlocked.js'
export { isDateInRange } from './scheduling/isDateInRange.js'

// Pricing Rules
export { isValidDayCountForPricing } from './pricing/isValidDayCountForPricing.js'

// Auth Rules
export { isSessionValid } from './auth/isSessionValid.js'
export { isProtectedPage } from './auth/isProtectedPage.js'

// Search Rules
export { isValidPriceTier } from './search/isValidPriceTier.js'
export { isValidWeekPattern } from './search/isValidWeekPattern.js'
export { isValidSortOption } from './search/isValidSortOption.js'

// Proposal Rules
export { determineProposalStage } from './proposals/determineProposalStage.js'
export { canEditProposal } from './proposals/canEditProposal.js'
export { canCancelProposal } from './proposals/canCancelProposal.js'
export { canAcceptProposal } from './proposals/canAcceptProposal.js'

// User Rules
export { isHost } from './users/isHost.js'
export { isGuest } from './users/isGuest.js'
