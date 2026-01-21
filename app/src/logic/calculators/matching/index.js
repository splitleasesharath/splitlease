/**
 * Matching Calculators
 *
 * Pure calculation functions for Quick Match scoring algorithm.
 * Maximum possible score is 95 points (price drop heuristic not implemented).
 *
 * @module logic/calculators/matching
 */

// Master scoring functions
export { calculateMatchScore } from './calculateMatchScore.js';
export { calculateMatchHeuristics } from './calculateMatchHeuristics.js';

// Individual score calculators
export { calculateBoroughScore } from './calculateBoroughScore.js';
export { calculatePriceScore } from './calculatePriceScore.js';
export { calculatePriceProximity } from './calculatePriceProximity.js';
export { calculateScheduleOverlapScore } from './calculateScheduleOverlapScore.js';
export { calculateWeeklyStayScore } from './calculateWeeklyStayScore.js';
export { calculateDurationScore } from './calculateDurationScore.js';
export { calculateHostScore } from './calculateHostScore.js';

// Constants
export {
  MATCH_WEIGHTS,
  NYC_BOROUGH_ADJACENCY,
  SCORE_TIERS,
  PRICE_THRESHOLDS,
  MIN_HOST_VERIFICATIONS,
  MAX_POSSIBLE_SCORE,
  TIER_LABELS
} from './constants.js';
