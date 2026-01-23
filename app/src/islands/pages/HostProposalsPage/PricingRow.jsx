/**
 * PricingRow Component (V7 Design)
 *
 * Pricing breakdown and total earnings display:
 * - Left: breakdown formula "$165/night x 4 x 12 wks"
 * - Right: "Your Earnings" label + large total "$7,920"
 *
 * Shows strikethrough comparison when counteroffer terms differ from original.
 *
 * Part of the Host Proposals V7 redesign.
 */
import React from 'react';

/**
 * PricingRow displays the pricing information
 * Shows strikethrough comparison when counteroffer pricing differs from original
 *
 * @param {Object} props
 * @param {Object} props.proposal - The proposal object
 * @param {boolean} props.isDeclined - Whether the proposal is declined (shows strikethrough)
 */
export function PricingRow({ proposal, isDeclined = false }) {
  // Check if counteroffer happened
  const isCounteroffer = proposal?.['counter offer happened'] ||
    proposal?.counterOfferHappened ||
    proposal?.counter_offer_happened;

  // Original values (guest's proposal)
  const originalNightlyRate = proposal?.['proposal nightly price'] || proposal?.proposal_nightly_price || 0;
  const originalWeeks = proposal?.['Reservation Span (Weeks)'] || proposal?.reservation_span_weeks || 0;
  const originalTotalPrice = proposal?.['Total Price for Reservation (guest)'] || proposal?.total_price_guest || 0;
  let originalDays = proposal?.['Days Selected'] || [];
  if (typeof originalDays === 'string') {
    try { originalDays = JSON.parse(originalDays); } catch { originalDays = []; }
  }
  const originalNightsPerWeek = Math.max(0, (Array.isArray(originalDays) ? originalDays.length : 0) - 1);

  // HC values (host counteroffer)
  const hcNightlyRate = proposal?.['hc nightly price'];
  const hcWeeks = proposal?.['hc reservation span (weeks)'];
  const hcTotalPrice = proposal?.['hc total price'];
  let hcDays = proposal?.['hc days selected'] || [];
  if (typeof hcDays === 'string') {
    try { hcDays = JSON.parse(hcDays); } catch { hcDays = []; }
  }
  const hcNightsPerWeek = hcDays.length > 0 ? Math.max(0, hcDays.length - 1) : null;

  // Current values (use HC if counteroffer, otherwise original/normalized)
  const nightlyRate = proposal?.nightly_rate || proposal?.price_per_night ||
    (isCounteroffer && hcNightlyRate != null ? hcNightlyRate : originalNightlyRate);
  const daysSelected = proposal?.days_selected || proposal?.Days_Selected ||
    (isCounteroffer && hcDays.length > 0 ? hcDays : originalDays);
  const nightsPerWeek = Math.max(0, (Array.isArray(daysSelected) ? daysSelected.length : 0) - 1);
  const weeks = proposal?.duration_weeks || proposal?.weeks || proposal?.total_weeks ||
    (isCounteroffer && hcWeeks != null ? hcWeeks : originalWeeks);
  const totalEarnings = proposal?.total_price || proposal?.host_earnings || proposal?.total_amount ||
    (isCounteroffer && hcTotalPrice != null ? hcTotalPrice : originalTotalPrice);

  // Comparison flags - detect which values changed
  const nightlyRateChanged = isCounteroffer && hcNightlyRate != null && hcNightlyRate !== originalNightlyRate;
  const weeksChanged = isCounteroffer && hcWeeks != null && hcWeeks !== originalWeeks;
  const nightsChanged = isCounteroffer && hcNightsPerWeek != null && hcNightsPerWeek !== originalNightsPerWeek;
  const totalChanged = isCounteroffer && hcTotalPrice != null && hcTotalPrice !== originalTotalPrice;

  // Format the breakdown with strikethrough support
  const hasBreakdown = nightlyRate > 0 || nightsPerWeek > 0 || weeks > 0;

  // Format total
  const formattedTotal = `$${Number(totalEarnings).toLocaleString()}`;
  const formattedOriginalTotal = `$${Number(originalTotalPrice).toLocaleString()}`;

  return (
    <div className="hp7-pricing-row">
      <div className="hp7-pricing-breakdown">
        {hasBreakdown ? (
          <>
            {/* Nightly rate */}
            {nightlyRate > 0 && (
              <>
                {nightlyRateChanged && (
                  <span className="hp7-strikethrough">${originalNightlyRate}/night</span>
                )}
                <span className={nightlyRateChanged ? 'hp7-changed-value' : ''}>
                  ${nightlyRate}/night
                </span>
              </>
            )}
            {nightlyRate > 0 && nightsPerWeek > 0 && <span>×</span>}

            {/* Nights per week */}
            {nightsPerWeek > 0 && (
              <>
                {nightsChanged && (
                  <span className="hp7-strikethrough">{originalNightsPerWeek}</span>
                )}
                <span className={nightsChanged ? 'hp7-changed-value' : ''}>
                  {nightsPerWeek}
                </span>
              </>
            )}
            {nightsPerWeek > 0 && weeks > 0 && <span>×</span>}

            {/* Weeks */}
            {weeks > 0 && (
              <>
                {weeksChanged && (
                  <span className="hp7-strikethrough">{originalWeeks} wks</span>
                )}
                <span className={weeksChanged ? 'hp7-changed-value' : ''}>
                  {weeks} wks
                </span>
              </>
            )}
          </>
        ) : (
          <span>Pricing details</span>
        )}
      </div>
      <div className="hp7-pricing-total-wrapper">
        <div className="hp7-pricing-total-label">
          {isDeclined ? 'Was Offered' : 'Your Earnings'}
        </div>
        <div className={`hp7-pricing-total${isDeclined ? ' declined' : ''}`}>
          {totalChanged && (
            <span className="hp7-strikethrough hp7-total-strikethrough">{formattedOriginalTotal}</span>
          )}
          <span className={totalChanged ? 'hp7-changed-value' : ''}>
            {formattedTotal}
          </span>
        </div>
      </div>
    </div>
  );
}

export default PricingRow;
