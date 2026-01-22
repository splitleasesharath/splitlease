/**
 * Matching Processors
 *
 * Data transformation functions for Quick Match algorithm.
 * Adapts raw data to normalized formats and formats results for display.
 *
 * @module logic/processors/matching
 */

// Data adapters
export { adaptCandidateListing } from './adaptCandidateListing.js';
export { adaptProposalForMatching } from './adaptProposalForMatching.js';

// Result formatters
export { formatMatchResult, getTier } from './formatMatchResult.js';
