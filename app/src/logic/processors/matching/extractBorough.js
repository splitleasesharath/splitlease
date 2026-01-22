/**
 * Extract and normalize borough name from listing or proposal objects.
 *
 * @intent Centralize borough field extraction to handle multiple API formats.
 * @rule Checks boroughName, borough, and 'Location - Borough' field names.
 * @rule Returns normalized lowercase, trimmed string or null.
 *
 * @param {object} params - Named parameters.
 * @param {object} params.source - Object containing borough data (listing, proposal.listing, etc).
 * @returns {string|null} Normalized borough name or null if not found.
 *
 * @example
 * extractBorough({ source: { boroughName: 'Manhattan' } })
 * // => 'manhattan'
 *
 * extractBorough({ source: { 'Location - Borough': 'Brooklyn' } })
 * // => 'brooklyn'
 *
 * extractBorough({ source: null })
 * // => null
 */
export function extractBorough({ source }) {
  if (!source || typeof source !== 'object') {
    return null;
  }

  const rawBorough =
    source.boroughName ||
    source.borough ||
    source['Location - Borough'] ||
    null;

  if (!rawBorough || typeof rawBorough !== 'string') {
    return null;
  }

  return rawBorough.toLowerCase().trim();
}

/**
 * Extract borough from a candidate listing.
 *
 * @param {object} candidateListing - Candidate listing object.
 * @returns {string|null} Normalized borough name or null.
 */
export function extractCandidateBorough(candidateListing) {
  return extractBorough({ source: candidateListing });
}

/**
 * Extract borough from a proposal's nested listing.
 *
 * @param {object} proposal - Proposal object with nested listing.
 * @returns {string|null} Normalized borough name or null.
 */
export function extractProposalBorough(proposal) {
  return extractBorough({ source: proposal?.listing });
}
