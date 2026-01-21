/**
 * Quick Match Scoring Functions
 * Split Lease - Supabase Edge Functions
 *
 * Pure functions for calculating match scores between proposals and listings.
 *
 * Scoring System (max 95 points):
 * - Borough match: 0-25 points
 * - Price proximity: 0-20 points
 * - Schedule overlap: 0-20 points
 * - Weekly stay support: 0-15 points
 * - Duration match: 0-10 points
 * - Host verification: 0-5 points
 *
 * Note: Price drop (5 points) not implemented due to missing historical data
 */

import type {
  ListingInfo,
  HostInfo,
  ProposalDetails,
  ScoreBreakdown,
  ScoreComponent,
  MatchTier,
} from './types.ts';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const MAX_TOTAL_SCORE = 95;

const SCORE_WEIGHTS = {
  borough: 25,
  price: 20,
  schedule: 20,
  weeklyStay: 15,
  duration: 10,
  host: 5,
} as const;

/**
 * NYC Borough adjacency map
 * Adjacent boroughs get partial credit for matching
 */
const BOROUGH_ADJACENCIES: Record<string, readonly string[]> = {
  'manhattan': ['brooklyn', 'queens', 'bronx'],
  'brooklyn': ['manhattan', 'queens'],
  'queens': ['manhattan', 'brooklyn', 'bronx'],
  'bronx': ['manhattan', 'queens'],
  'staten island': [], // Staten Island is geographically isolated
};

// ─────────────────────────────────────────────────────────────
// Score Calculation Functions
// ─────────────────────────────────────────────────────────────

/**
 * Calculate complete match score and breakdown
 */
export function calculateMatchScore(
  candidateListing: ListingInfo,
  proposal: ProposalDetails,
  hostInfo: HostInfo
): { score: number; breakdown: ScoreBreakdown } {
  const breakdown: ScoreBreakdown = {
    borough: calculateBoroughScore(candidateListing, proposal),
    price: calculatePriceScore(candidateListing, proposal),
    schedule: calculateScheduleScore(candidateListing, proposal),
    weeklyStay: calculateWeeklyStayScore(candidateListing),
    duration: calculateDurationScore(candidateListing, proposal),
    host: calculateHostScore(hostInfo),
  };

  const score = Object.values(breakdown).reduce(
    (total, component) => total + component.score,
    0
  );

  return { score, breakdown };
}

/**
 * Calculate borough match score (0-25 points)
 * - Exact match: 25 points
 * - Adjacent borough: 15 points
 * - No match: 0 points
 */
export function calculateBoroughScore(
  candidateListing: ListingInfo,
  proposal: ProposalDetails
): ScoreComponent {
  const candidateBorough = normalizeBorough(candidateListing.boroughName || candidateListing.borough);
  const proposalBorough = normalizeBorough(proposal.listing.boroughName || proposal.listing.borough);

  if (!candidateBorough || !proposalBorough) {
    return {
      score: 0,
      max: SCORE_WEIGHTS.borough,
      label: 'Unknown borough',
    };
  }

  // Exact match
  if (candidateBorough === proposalBorough) {
    return {
      score: SCORE_WEIGHTS.borough,
      max: SCORE_WEIGHTS.borough,
      label: 'Same borough',
    };
  }

  // Adjacent borough check
  const adjacentBoroughs = BOROUGH_ADJACENCIES[proposalBorough] || [];
  if (adjacentBoroughs.includes(candidateBorough)) {
    return {
      score: 15,
      max: SCORE_WEIGHTS.borough,
      label: 'Adjacent borough',
    };
  }

  return {
    score: 0,
    max: SCORE_WEIGHTS.borough,
    label: 'Different borough',
  };
}

/**
 * Calculate price proximity score (0-20 points)
 * - Within 10%: 20 points
 * - Within 20%: 15 points
 * - Within 30%: 10 points
 * - Within 50%: 5 points
 * - Beyond 50%: 0 points
 */
export function calculatePriceScore(
  candidateListing: ListingInfo,
  proposal: ProposalDetails
): ScoreComponent {
  const proposalPrice = proposal.nightlyPrice;
  const nightsPerWeek = proposal.nightsPerWeek || proposal.daysSelected?.length || 4;
  const candidatePrice = getNightlyRateForFrequency(candidateListing.nightlyRates, nightsPerWeek);

  if (!proposalPrice || proposalPrice === 0 || !candidatePrice) {
    return {
      score: 0,
      max: SCORE_WEIGHTS.price,
      label: 'Price unavailable',
    };
  }

  const priceDiff = Math.abs(candidatePrice - proposalPrice);
  const proximityRatio = priceDiff / proposalPrice;

  if (proximityRatio <= 0.10) {
    return {
      score: SCORE_WEIGHTS.price,
      max: SCORE_WEIGHTS.price,
      label: `Within 10% ($${candidatePrice}/night)`,
    };
  }

  if (proximityRatio <= 0.20) {
    return {
      score: 15,
      max: SCORE_WEIGHTS.price,
      label: `Within 20% ($${candidatePrice}/night)`,
    };
  }

  if (proximityRatio <= 0.30) {
    return {
      score: 10,
      max: SCORE_WEIGHTS.price,
      label: `Within 30% ($${candidatePrice}/night)`,
    };
  }

  if (proximityRatio <= 0.50) {
    return {
      score: 5,
      max: SCORE_WEIGHTS.price,
      label: `Within 50% ($${candidatePrice}/night)`,
    };
  }

  const direction = candidatePrice > proposalPrice ? 'higher' : 'lower';
  return {
    score: 0,
    max: SCORE_WEIGHTS.price,
    label: `${Math.round(proximityRatio * 100)}% ${direction}`,
  };
}

/**
 * Calculate schedule overlap score (0-20 points)
 * Score is proportional to the overlap percentage
 */
export function calculateScheduleScore(
  candidateListing: ListingInfo,
  proposal: ProposalDetails
): ScoreComponent {
  const listingDays = candidateListing.daysAvailable || [];
  const proposalDays = proposal.daysSelected || [];

  if (proposalDays.length === 0) {
    return {
      score: 0,
      max: SCORE_WEIGHTS.schedule,
      label: 'No days specified',
    };
  }

  const listingDaySet = new Set(listingDays);
  const overlapDays = proposalDays.filter((day) => listingDaySet.has(day)).length;
  const overlapRatio = overlapDays / proposalDays.length;
  const score = Math.round(overlapRatio * SCORE_WEIGHTS.schedule);

  if (overlapRatio === 1) {
    return {
      score,
      max: SCORE_WEIGHTS.schedule,
      label: `Full overlap (${overlapDays}/${proposalDays.length} days)`,
    };
  }

  if (overlapRatio >= 0.75) {
    return {
      score,
      max: SCORE_WEIGHTS.schedule,
      label: `Strong overlap (${overlapDays}/${proposalDays.length} days)`,
    };
  }

  if (overlapRatio >= 0.5) {
    return {
      score,
      max: SCORE_WEIGHTS.schedule,
      label: `Partial overlap (${overlapDays}/${proposalDays.length} days)`,
    };
  }

  if (overlapRatio > 0) {
    return {
      score,
      max: SCORE_WEIGHTS.schedule,
      label: `Limited overlap (${overlapDays}/${proposalDays.length} days)`,
    };
  }

  return {
    score: 0,
    max: SCORE_WEIGHTS.schedule,
    label: 'No schedule overlap',
  };
}

/**
 * Calculate weekly stay support score (0-15 points)
 * Listing must have 7 days available and min nights <= 7
 */
export function calculateWeeklyStayScore(
  candidateListing: ListingInfo
): ScoreComponent {
  const minNights = candidateListing.minimumNights || 0;
  const daysAvailable = candidateListing.daysAvailable || [];

  const minNightsOk = minNights <= 7;
  const hasFullWeek = daysAvailable.length === 7;

  if (minNightsOk && hasFullWeek) {
    return {
      score: SCORE_WEIGHTS.weeklyStay,
      max: SCORE_WEIGHTS.weeklyStay,
      label: 'Supports 7-day stays',
    };
  }

  if (minNightsOk && daysAvailable.length >= 5) {
    return {
      score: 8,
      max: SCORE_WEIGHTS.weeklyStay,
      label: `${daysAvailable.length} days available`,
    };
  }

  return {
    score: 0,
    max: SCORE_WEIGHTS.weeklyStay,
    label: minNights > 7 ? `Min ${minNights} nights` : `Only ${daysAvailable.length} days`,
  };
}

/**
 * Calculate duration match score (0-10 points)
 * Listing's min nights should be within 1 of proposal's nights per week
 */
export function calculateDurationScore(
  candidateListing: ListingInfo,
  proposal: ProposalDetails
): ScoreComponent {
  const listingMinNights = candidateListing.minimumNights || 0;
  const proposalNights = proposal.nightsPerWeek || proposal.daysSelected?.length || 0;

  if (proposalNights === 0) {
    return {
      score: 0,
      max: SCORE_WEIGHTS.duration,
      label: 'Duration unavailable',
    };
  }

  const difference = Math.abs(listingMinNights - proposalNights);

  if (difference === 0) {
    return {
      score: SCORE_WEIGHTS.duration,
      max: SCORE_WEIGHTS.duration,
      label: 'Exact duration match',
    };
  }

  if (difference === 1) {
    return {
      score: 7,
      max: SCORE_WEIGHTS.duration,
      label: '1-night difference',
    };
  }

  if (difference === 2) {
    return {
      score: 3,
      max: SCORE_WEIGHTS.duration,
      label: '2-night difference',
    };
  }

  return {
    score: 0,
    max: SCORE_WEIGHTS.duration,
    label: `${difference}-night difference`,
  };
}

/**
 * Calculate host verification score (0-5 points)
 * - 3+ verifications: 5 points
 * - 2 verifications: 3 points
 * - 1 verification: 1 point
 * - 0 verifications: 0 points
 */
export function calculateHostScore(hostInfo: HostInfo): ScoreComponent {
  const verifications = [
    hostInfo.linkedInVerified,
    hostInfo.phoneVerified,
    hostInfo.userVerified,
  ].filter(Boolean).length;

  if (verifications >= 3) {
    return {
      score: SCORE_WEIGHTS.host,
      max: SCORE_WEIGHTS.host,
      label: 'Fully verified host',
    };
  }

  if (verifications === 2) {
    return {
      score: 3,
      max: SCORE_WEIGHTS.host,
      label: 'Partially verified host',
    };
  }

  if (verifications === 1) {
    return {
      score: 1,
      max: SCORE_WEIGHTS.host,
      label: 'Minimally verified host',
    };
  }

  return {
    score: 0,
    max: SCORE_WEIGHTS.host,
    label: 'Unverified host',
  };
}

// ─────────────────────────────────────────────────────────────
// Tier Classification
// ─────────────────────────────────────────────────────────────

/**
 * Determine match tier based on score
 */
export function getMatchTier(score: number): MatchTier {
  // Score ranges based on max of 95
  if (score >= 75) return 'excellent';
  if (score >= 55) return 'good';
  if (score >= 35) return 'fair';
  return 'poor';
}

/**
 * Get tier display info
 */
export function getTierInfo(tier: MatchTier): { label: string; color: string } {
  const tiers: Record<MatchTier, { label: string; color: string }> = {
    excellent: { label: 'Excellent Match', color: '#22c55e' },
    good: { label: 'Good Match', color: '#3b82f6' },
    fair: { label: 'Fair Match', color: '#f59e0b' },
    poor: { label: 'Poor Match', color: '#ef4444' },
  };
  return tiers[tier];
}

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────

/**
 * Normalize borough name for comparison
 */
function normalizeBorough(borough: string | null | undefined): string | null {
  if (!borough) return null;
  return borough.toLowerCase().trim();
}

/**
 * Get nightly rate for a specific frequency
 */
function getNightlyRateForFrequency(
  rates: ListingInfo['nightlyRates'],
  nightsPerWeek: number
): number | null {
  // Clamp to 1-7
  const nights = Math.max(1, Math.min(7, Math.round(nightsPerWeek)));

  const rateMap: Record<number, number | null> = {
    1: rates.rate1,
    2: rates.rate2,
    3: rates.rate3,
    4: rates.rate4,
    5: rates.rate5,
    6: rates.rate6,
    7: rates.rate7,
  };

  return rateMap[nights] || rates.rate4; // Default to 4-night rate
}

/**
 * Get max possible score
 */
export function getMaxScore(): number {
  return MAX_TOTAL_SCORE;
}
