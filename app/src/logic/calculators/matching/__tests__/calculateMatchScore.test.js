/**
 * Tests for Quick Match Scoring Algorithm
 *
 * These tests verify the matching heuristics using sample data.
 * Can be run with Vitest, Jest, or Node.js native test runner.
 *
 * To run with Vitest:
 *   bunx vitest run app/src/logic/calculators/matching/__tests__/calculateMatchScore.test.js
 *
 * To run with Node (native test runner, Node 18+):
 *   node --test app/src/logic/calculators/matching/__tests__/calculateMatchScore.test.js
 */

import { describe, it, expect } from 'vitest';

// Calculators
import { calculateMatchScore } from '../calculateMatchScore.js';
import { calculateBoroughScore } from '../calculateBoroughScore.js';
import { calculatePriceScore } from '../calculatePriceScore.js';
import { calculateScheduleOverlapScore } from '../calculateScheduleOverlapScore.js';
import { calculateWeeklyStayScore } from '../calculateWeeklyStayScore.js';
import { calculateDurationScore } from '../calculateDurationScore.js';
import { calculateHostScore } from '../calculateHostScore.js';
import { calculatePriceProximity } from '../calculatePriceProximity.js';

// Rules
import { isBoroughMatch } from '../../../rules/matching/isBoroughMatch.js';
import { isBoroughAdjacent } from '../../../rules/matching/isBoroughAdjacent.js';
import { hasScheduleCompatibility } from '../../../rules/matching/hasScheduleCompatibility.js';
import { supportsWeeklyStays } from '../../../rules/matching/supportsWeeklyStays.js';
import { isDurationMatch } from '../../../rules/matching/isDurationMatch.js';
import { isVerifiedHost, countHostVerifications } from '../../../rules/matching/isVerifiedHost.js';

// Constants
import { MATCH_WEIGHTS, MAX_POSSIBLE_SCORE } from '../constants.js';

// ============================================================================
// Test Data
// ============================================================================

const perfectMatchListing = {
  _id: 'listing-perfect',
  boroughName: 'Manhattan',
  'Location - Borough': 'Manhattan',
  '💰Nightly Host Rate for 4 nights': 100,
  'Schedule days available': [0, 1, 2, 3, 4, 5, 6],
  'Minimum Nights': 4
};

const perfectMatchProposal = {
  _id: 'proposal-1',
  nightlyPrice: 100,
  nightsPerWeek: 4,
  daysSelected: [1, 2, 3, 4],
  listing: {
    boroughName: 'Manhattan'
  }
};

const perfectMatchHost = {
  'Verify - Linked In ID': true,
  'Verify - Phone': true,
  'user verified?': true
};

// ============================================================================
// Borough Tests
// ============================================================================

describe('Borough Matching', () => {
  describe('isBoroughAdjacent', () => {
    it('returns true for Manhattan-Brooklyn (adjacent)', () => {
      expect(isBoroughAdjacent({ borough1: 'Manhattan', borough2: 'Brooklyn' })).toBe(true);
    });

    it('returns true for Brooklyn-Manhattan (adjacent, reverse)', () => {
      expect(isBoroughAdjacent({ borough1: 'Brooklyn', borough2: 'Manhattan' })).toBe(true);
    });

    it('returns false for Manhattan-Staten Island (not adjacent)', () => {
      expect(isBoroughAdjacent({ borough1: 'Manhattan', borough2: 'Staten Island' })).toBe(false);
    });

    it('handles case insensitivity', () => {
      expect(isBoroughAdjacent({ borough1: 'MANHATTAN', borough2: 'brooklyn' })).toBe(true);
    });

    it('returns false for null inputs', () => {
      expect(isBoroughAdjacent({ borough1: null, borough2: 'Manhattan' })).toBe(false);
    });
  });

  describe('isBoroughMatch', () => {
    it('returns true for exact match', () => {
      expect(isBoroughMatch({ candidateBorough: 'Manhattan', proposalBorough: 'Manhattan' })).toBe(true);
    });

    it('returns true for adjacent boroughs', () => {
      expect(isBoroughMatch({ candidateBorough: 'Brooklyn', proposalBorough: 'Manhattan' })).toBe(true);
    });

    it('returns false for non-adjacent boroughs', () => {
      expect(isBoroughMatch({ candidateBorough: 'Staten Island', proposalBorough: 'Bronx' })).toBe(false);
    });
  });

  describe('calculateBoroughScore', () => {
    it('returns 25 for exact borough match', () => {
      const score = calculateBoroughScore({
        candidateListing: { boroughName: 'Manhattan' },
        proposal: { listing: { boroughName: 'Manhattan' } }
      });
      expect(score).toBe(MATCH_WEIGHTS.BOROUGH);
    });

    it('returns 15 for adjacent borough', () => {
      const score = calculateBoroughScore({
        candidateListing: { boroughName: 'Brooklyn' },
        proposal: { listing: { boroughName: 'Manhattan' } }
      });
      expect(score).toBe(15);
    });

    it('returns 0 for non-adjacent borough', () => {
      const score = calculateBoroughScore({
        candidateListing: { boroughName: 'Staten Island' },
        proposal: { listing: { boroughName: 'Bronx' } }
      });
      expect(score).toBe(0);
    });
  });
});

// ============================================================================
// Price Tests
// ============================================================================

describe('Price Matching', () => {
  describe('calculatePriceProximity', () => {
    it('returns 0 for exact price match', () => {
      const proximity = calculatePriceProximity({
        candidateNightlyRate: 100,
        proposalNightlyRate: 100
      });
      expect(proximity).toBe(0);
    });

    it('returns 0.10 for 10% higher price', () => {
      const proximity = calculatePriceProximity({
        candidateNightlyRate: 110,
        proposalNightlyRate: 100
      });
      expect(proximity).toBeCloseTo(0.10);
    });

    it('returns 0.15 for 15% lower price (absolute value)', () => {
      const proximity = calculatePriceProximity({
        candidateNightlyRate: 85,
        proposalNightlyRate: 100
      });
      expect(proximity).toBeCloseTo(0.15);
    });

    it('throws for zero proposal rate', () => {
      expect(() => calculatePriceProximity({
        candidateNightlyRate: 100,
        proposalNightlyRate: 0
      })).toThrow();
    });
  });

  describe('calculatePriceScore', () => {
    it('returns 20 for within 10% price difference', () => {
      const score = calculatePriceScore({
        candidateListing: { '💰Nightly Host Rate for 4 nights': 105 },
        proposal: { nightlyPrice: 100, nightsPerWeek: 4 }
      });
      expect(score).toBe(MATCH_WEIGHTS.PRICE);
    });

    it('returns 15 for within 20% price difference', () => {
      const score = calculatePriceScore({
        candidateListing: { '💰Nightly Host Rate for 4 nights': 115 },
        proposal: { nightlyPrice: 100, nightsPerWeek: 4 }
      });
      expect(score).toBe(15);
    });

    it('returns 10 for within 30% price difference', () => {
      const score = calculatePriceScore({
        candidateListing: { '💰Nightly Host Rate for 4 nights': 125 },
        proposal: { nightlyPrice: 100, nightsPerWeek: 4 }
      });
      expect(score).toBe(10);
    });

    it('returns 0 for over 50% price difference', () => {
      const score = calculatePriceScore({
        candidateListing: { '💰Nightly Host Rate for 4 nights': 160 },
        proposal: { nightlyPrice: 100, nightsPerWeek: 4 }
      });
      expect(score).toBe(0);
    });
  });
});

// ============================================================================
// Schedule Tests
// ============================================================================

describe('Schedule Matching', () => {
  describe('hasScheduleCompatibility', () => {
    it('returns full overlap for matching days', () => {
      const result = hasScheduleCompatibility({
        candidateListing: { 'Schedule days available': [1, 2, 3, 4, 5] },
        proposal: { daysSelected: [1, 2, 3] }
      });
      expect(result.compatible).toBe(true);
      expect(result.overlapDays).toBe(3);
      expect(result.requestedDays).toBe(3);
    });

    it('returns partial overlap for some matching days', () => {
      const result = hasScheduleCompatibility({
        candidateListing: { 'Schedule days available': [1, 2, 5, 6] },
        proposal: { daysSelected: [1, 2, 3, 4] }
      });
      expect(result.compatible).toBe(true);
      expect(result.overlapDays).toBe(2);
      expect(result.requestedDays).toBe(4);
    });

    it('returns no overlap for non-matching days', () => {
      const result = hasScheduleCompatibility({
        candidateListing: { 'Schedule days available': [5, 6] },
        proposal: { daysSelected: [1, 2, 3] }
      });
      expect(result.compatible).toBe(false);
      expect(result.overlapDays).toBe(0);
    });
  });

  describe('calculateScheduleOverlapScore', () => {
    it('returns 20 for 100% overlap', () => {
      const score = calculateScheduleOverlapScore({
        candidateListing: { 'Schedule days available': [1, 2, 3, 4, 5] },
        proposal: { daysSelected: [1, 2, 3, 4] }
      });
      expect(score).toBe(MATCH_WEIGHTS.SCHEDULE);
    });

    it('returns 10 for 50% overlap', () => {
      const score = calculateScheduleOverlapScore({
        candidateListing: { 'Schedule days available': [1, 2] },
        proposal: { daysSelected: [1, 2, 3, 4] }
      });
      expect(score).toBe(10);
    });

    it('returns 0 for no overlap', () => {
      const score = calculateScheduleOverlapScore({
        candidateListing: { 'Schedule days available': [5, 6] },
        proposal: { daysSelected: [1, 2, 3] }
      });
      expect(score).toBe(0);
    });
  });
});

// ============================================================================
// Weekly Stay Tests
// ============================================================================

describe('Weekly Stay Support', () => {
  describe('supportsWeeklyStays', () => {
    it('returns true for 7-day availability with min nights <= 7', () => {
      expect(supportsWeeklyStays({
        listing: {
          'Schedule days available': [0, 1, 2, 3, 4, 5, 6],
          'Minimum Nights': 3
        }
      })).toBe(true);
    });

    it('returns false for less than 7 days available', () => {
      expect(supportsWeeklyStays({
        listing: {
          'Schedule days available': [1, 2, 3, 4, 5],
          'Minimum Nights': 2
        }
      })).toBe(false);
    });

    it('returns false for min nights > 7', () => {
      expect(supportsWeeklyStays({
        listing: {
          'Schedule days available': [0, 1, 2, 3, 4, 5, 6],
          'Minimum Nights': 10
        }
      })).toBe(false);
    });
  });

  describe('calculateWeeklyStayScore', () => {
    it('returns 15 when weekly stays supported', () => {
      const score = calculateWeeklyStayScore({
        candidateListing: {
          'Schedule days available': [0, 1, 2, 3, 4, 5, 6],
          'Minimum Nights': 4
        }
      });
      expect(score).toBe(MATCH_WEIGHTS.WEEKLY_STAY);
    });

    it('returns 0 when weekly stays not supported', () => {
      const score = calculateWeeklyStayScore({
        candidateListing: {
          'Schedule days available': [1, 2, 3, 4],
          'Minimum Nights': 2
        }
      });
      expect(score).toBe(0);
    });
  });
});

// ============================================================================
// Duration Tests
// ============================================================================

describe('Duration Matching', () => {
  describe('isDurationMatch', () => {
    it('returns true for exact match', () => {
      expect(isDurationMatch({
        listing: { 'Minimum Nights': 4 },
        proposal: { nightsPerWeek: 4 }
      })).toBe(true);
    });

    it('returns true for within tolerance', () => {
      expect(isDurationMatch({
        listing: { 'Minimum Nights': 4 },
        proposal: { nightsPerWeek: 5 },
        tolerance: 1
      })).toBe(true);
    });

    it('returns false for outside tolerance', () => {
      expect(isDurationMatch({
        listing: { 'Minimum Nights': 2 },
        proposal: { nightsPerWeek: 6 },
        tolerance: 1
      })).toBe(false);
    });
  });

  describe('calculateDurationScore', () => {
    it('returns 10 for duration match', () => {
      const score = calculateDurationScore({
        candidateListing: { 'Minimum Nights': 4 },
        proposal: { nightsPerWeek: 4 }
      });
      expect(score).toBe(MATCH_WEIGHTS.DURATION);
    });

    it('returns 0 for duration mismatch', () => {
      const score = calculateDurationScore({
        candidateListing: { 'Minimum Nights': 2 },
        proposal: { nightsPerWeek: 7 }
      });
      expect(score).toBe(0);
    });
  });
});

// ============================================================================
// Host Verification Tests
// ============================================================================

describe('Host Verification', () => {
  describe('countHostVerifications', () => {
    it('counts all verifications', () => {
      expect(countHostVerifications({
        host: {
          'Verify - Linked In ID': true,
          'Verify - Phone': true,
          'user verified?': true
        }
      })).toBe(3);
    });

    it('counts partial verifications', () => {
      expect(countHostVerifications({
        host: {
          'Verify - Linked In ID': true,
          'Verify - Phone': false,
          'user verified?': true
        }
      })).toBe(2);
    });

    it('returns 0 for no verifications', () => {
      expect(countHostVerifications({
        host: {
          'Verify - Linked In ID': false,
          'Verify - Phone': false,
          'user verified?': false
        }
      })).toBe(0);
    });
  });

  describe('isVerifiedHost', () => {
    it('returns true for 2+ verifications (default threshold)', () => {
      expect(isVerifiedHost({
        host: {
          'Verify - Linked In ID': true,
          'Verify - Phone': true,
          'user verified?': false
        }
      })).toBe(true);
    });

    it('returns false for 1 verification', () => {
      expect(isVerifiedHost({
        host: {
          'Verify - Linked In ID': true,
          'Verify - Phone': false,
          'user verified?': false
        }
      })).toBe(false);
    });
  });

  describe('calculateHostScore', () => {
    it('returns 5 for 3 verifications', () => {
      const score = calculateHostScore({
        hostData: {
          'Verify - Linked In ID': true,
          'Verify - Phone': true,
          'user verified?': true
        }
      });
      expect(score).toBe(MATCH_WEIGHTS.HOST);
    });

    it('returns 3 for 2 verifications', () => {
      const score = calculateHostScore({
        hostData: {
          'Verify - Linked In ID': true,
          'Verify - Phone': true,
          'user verified?': false
        }
      });
      expect(score).toBe(3);
    });

    it('returns 1 for 1 verification', () => {
      const score = calculateHostScore({
        hostData: {
          'Verify - Linked In ID': true,
          'Verify - Phone': false,
          'user verified?': false
        }
      });
      expect(score).toBe(1);
    });

    it('returns 0 for no verifications', () => {
      const score = calculateHostScore({
        hostData: {
          'Verify - Linked In ID': false,
          'Verify - Phone': false,
          'user verified?': false
        }
      });
      expect(score).toBe(0);
    });
  });
});

// ============================================================================
// Master Score Tests
// ============================================================================

describe('calculateMatchScore', () => {
  it('calculates perfect match score', () => {
    const result = calculateMatchScore({
      candidateListing: perfectMatchListing,
      proposal: perfectMatchProposal,
      hostData: perfectMatchHost
    });

    expect(result.totalScore).toBe(MAX_POSSIBLE_SCORE);
    expect(result.maxPossibleScore).toBe(MAX_POSSIBLE_SCORE);
    expect(result.breakdown.boroughMatch).toBe(25);
    expect(result.breakdown.priceProximity).toBe(20);
    expect(result.breakdown.scheduleOverlap).toBe(20);
    expect(result.breakdown.weeklyStaySupport).toBe(15);
    expect(result.breakdown.durationMatch).toBe(10);
    expect(result.breakdown.hostVerified).toBe(5);
    expect(result.breakdown.priceDrop).toBe(0);
  });

  it('calculates partial match score', () => {
    const result = calculateMatchScore({
      candidateListing: {
        boroughName: 'Queens',
        '💰Nightly Host Rate for 5 nights': 145,
        'Schedule days available': [1, 2, 3, 4],
        'Minimum Nights': 3
      },
      proposal: {
        nightlyPrice: 120,
        nightsPerWeek: 5,
        daysSelected: [1, 2, 3, 4, 5],
        listing: { boroughName: 'Brooklyn' }
      },
      hostData: {
        'Verify - Linked In ID': true,
        'Verify - Phone': false,
        'user verified?': false
      }
    });

    // Brooklyn-Queens are adjacent = 15
    expect(result.breakdown.boroughMatch).toBe(15);
    // 145 vs 120 = 20.8% difference = 10 points
    expect(result.breakdown.priceProximity).toBe(10);
    // 4/5 days overlap = 80% = 16 points
    expect(result.breakdown.scheduleOverlap).toBe(16);
    // Only 4 days available = 0
    expect(result.breakdown.weeklyStaySupport).toBe(0);
    // Min 3 vs proposal 5 = difference 2 > tolerance 1 = 0
    expect(result.breakdown.durationMatch).toBe(0);
    // 1 verification = 1 point
    expect(result.breakdown.hostVerified).toBe(1);

    expect(result.totalScore).toBe(42);
  });

  it('calculates poor match score', () => {
    const result = calculateMatchScore({
      candidateListing: {
        boroughName: 'Staten Island',
        '💰Nightly Host Rate for 7 nights': 300,
        'Schedule days available': [5, 6],
        'Minimum Nights': 2
      },
      proposal: {
        nightlyPrice: 200,
        nightsPerWeek: 7,
        daysSelected: [0, 1, 2, 3, 4, 5, 6],
        listing: { boroughName: 'Manhattan' }
      },
      hostData: {}
    });

    // Staten Island not adjacent to Manhattan = 0
    expect(result.breakdown.boroughMatch).toBe(0);
    // 300 vs 200 = 50% difference = 5 points
    expect(result.breakdown.priceProximity).toBe(5);
    // 2/7 days overlap = 28.5% = 6 points
    expect(result.breakdown.scheduleOverlap).toBe(6);
    // Only 2 days available = 0
    expect(result.breakdown.weeklyStaySupport).toBe(0);
    // Min 2 vs proposal 7 = difference 5 > tolerance = 0
    expect(result.breakdown.durationMatch).toBe(0);
    // No verifications = 0
    expect(result.breakdown.hostVerified).toBe(0);

    expect(result.totalScore).toBe(11);
  });

  it('handles null inputs gracefully', () => {
    const result = calculateMatchScore({
      candidateListing: null,
      proposal: null,
      hostData: null
    });

    expect(result.totalScore).toBe(0);
  });
});
