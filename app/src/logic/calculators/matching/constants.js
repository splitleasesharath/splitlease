/**
 * Quick Match Scoring Constants
 *
 * Defines weights, thresholds, and reference data for the matching algorithm.
 * Maximum possible score is 95 (price drop heuristic not implemented due to missing data).
 *
 * @module logic/calculators/matching/constants
 */

/**
 * Score weights for each matching criterion.
 * Total: 95 points (5 points unavailable due to missing price history data)
 */
export const MATCH_WEIGHTS = {
  BOROUGH: 25,        // Location proximity
  PRICE: 20,          // Price similarity
  SCHEDULE: 20,       // Schedule day overlap
  WEEKLY_STAY: 15,    // Support for 7-night stays
  DURATION: 10,       // Minimum nights compatibility
  HOST: 5             // Host verification proxy
  // PRICE_DROP: 5    // Not implemented (no price history tracking)
};

/**
 * NYC borough adjacency map for location scoring.
 * Adjacent boroughs receive partial score (15 points vs 25 for exact match).
 */
export const NYC_BOROUGH_ADJACENCY = {
  manhattan: ['brooklyn', 'queens', 'bronx'],
  brooklyn: ['manhattan', 'queens', 'staten island'],
  queens: ['manhattan', 'brooklyn', 'bronx'],
  bronx: ['manhattan', 'queens'],
  'staten island': ['brooklyn']
};

/**
 * Score tiers for categorizing match quality.
 * Used by formatMatchResult to assign tier labels.
 */
export const SCORE_TIERS = {
  EXCELLENT: 75,  // 75+ = excellent match
  GOOD: 50,       // 50-74 = good match
  FAIR: 25        // 25-49 = fair match, below = poor match
};

/**
 * Price proximity thresholds for scoring.
 * Each threshold maps to a score value.
 */
export const PRICE_THRESHOLDS = {
  WITHIN_10_PERCENT: 0.10,  // 20 points
  WITHIN_20_PERCENT: 0.20,  // 15 points
  WITHIN_30_PERCENT: 0.30,  // 10 points
  WITHIN_50_PERCENT: 0.50   // 5 points
};

/**
 * Minimum verification count for host to be considered "verified".
 */
export const MIN_HOST_VERIFICATIONS = 2;

/**
 * Maximum possible score with current data availability.
 */
export const MAX_POSSIBLE_SCORE = 95;

/**
 * Tier labels for display.
 */
export const TIER_LABELS = {
  EXCELLENT: 'excellent',
  GOOD: 'good',
  FAIR: 'fair',
  POOR: 'poor'
};
