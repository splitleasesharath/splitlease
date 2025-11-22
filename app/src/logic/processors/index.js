/**
 * Logic Core - Processors Index
 * Data transformation functions ("Truth" layer).
 * NO FALLBACK - throws explicit errors for invalid data.
 * Guarantees data shape before it reaches the UI.
 */

// External Adapters (Anti-Corruption Layer for Bubble API)
export { adaptDaysToBubble } from './external/adaptDaysToBubble.js'
export { adaptDaysFromBubble } from './external/adaptDaysFromBubble.js'
export { adaptDayToBubble } from './external/adaptDayToBubble.js'
export { adaptDayFromBubble } from './external/adaptDayFromBubble.js'

// Listing Processors
export { parseJsonArrayField, parseJsonArrayFieldOptional } from './listing/parseJsonArrayField.js'
export { extractListingCoordinates } from './listing/extractListingCoordinates.js'

// Display Processors
export { formatHostName } from './display/formatHostName.js'
