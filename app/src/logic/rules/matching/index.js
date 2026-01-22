/**
 * Matching Rules
 *
 * Boolean predicate functions for Quick Match algorithm.
 * Used by calculators to determine match criteria.
 *
 * @module logic/rules/matching
 */

// Borough rules
export { isBoroughMatch } from './isBoroughMatch.js';
export { isBoroughAdjacent } from './isBoroughAdjacent.js';

// Price rules
export { isWithinBudget } from './isWithinBudget.js';

// Schedule rules
export { hasScheduleCompatibility } from './hasScheduleCompatibility.js';

// Duration rules
export { supportsWeeklyStays } from './supportsWeeklyStays.js';
export { canAccommodateDuration } from './canAccommodateDuration.js';
export { isDurationMatch } from './isDurationMatch.js';

// Host rules
export { isVerifiedHost, countHostVerifications } from './isVerifiedHost.js';
