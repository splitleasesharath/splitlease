/**
 * Match Reason Card Component
 *
 * Displays "Why this matches" information for SL-suggested proposals.
 * Shows match tags (Schedule, Budget, Transit, Pet OK, etc.) derived from
 * proposal and guest preference data.
 *
 * V7 Design: Light purple card with icon, title, and tag pills
 */

/**
 * Lightbulb icon for "Why this matches"
 */
const LightbulbIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 18h6" />
    <path d="M10 22h4" />
    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
  </svg>
);

/**
 * Derive match reason tags from proposal data
 * This is a heuristic approach - in the future, these could come from AI-generated data
 *
 * @param {Object} proposal - The proposal object
 * @returns {Array<{tag: string, description: string}>} Array of match reasons
 */
function deriveMatchReasons(proposal) {
  const reasons = [];
  const listing = proposal?.listing || {};

  // Schedule match - check if days selected matches common patterns
  const daysSelected = proposal['Days Selected'] || proposal.hcDaysSelected || [];
  if (Array.isArray(daysSelected) && daysSelected.length >= 4) {
    reasons.push({ tag: 'Schedule', description: 'Fits your preferred days' });
  }

  // Duration match - check reservation span
  const weeks = proposal['Reservation Span (Weeks)'] || proposal['hc reservation span (weeks)'];
  if (weeks && weeks >= 8) {
    reasons.push({ tag: 'Duration', description: 'Long-term stay available' });
  }

  // Budget - if price is reasonable (heuristic: under $200/night)
  const nightlyPrice = proposal['proposal nightly price'] || proposal['hc nightly price'];
  if (nightlyPrice && nightlyPrice <= 200) {
    reasons.push({ tag: 'Budget', description: 'Within your price range' });
  }

  // Location/Transit - if listing has transit info
  if (listing.hoodName || listing.boroughName) {
    reasons.push({ tag: 'Location', description: `${listing.hoodName || listing.boroughName}` });
  }

  // Pet friendly
  if (listing['Pets Allowed'] === true || listing.petsAllowed === true) {
    reasons.push({ tag: 'Pet OK', description: 'Allows pets' });
  }

  // Default reason if none derived
  if (reasons.length === 0) {
    reasons.push({ tag: 'Match', description: 'Recommended based on your preferences' });
  }

  return reasons;
}

/**
 * Match Reason Card for SL-suggested proposals
 * @param {Object} props
 * @param {Object} props.proposal - The proposal object
 * @param {string} [props.customReason] - Optional custom reason text
 */
export default function MatchReasonCard({ proposal, customReason }) {
  const matchReasons = deriveMatchReasons(proposal);

  return (
    <div className="match-reason-card">
      <div className="match-reason-card__header">
        <div className="match-reason-card__icon">
          <LightbulbIcon />
        </div>
        <div className="match-reason-card__content">
          <h4 className="match-reason-card__title">Why this matches</h4>
          <p className="match-reason-card__text">
            {customReason || 'A Split Lease Agent found this listing based on your preferences.'}
          </p>
        </div>
      </div>

      <div className="match-reason-card__tags">
        {matchReasons.map((reason, index) => (
          <span
            key={index}
            className="match-tag"
            title={reason.description}
          >
            {reason.tag}
          </span>
        ))}
      </div>
    </div>
  );
}
