/**
 * PricingRow Component (V7 Design)
 *
 * Pricing breakdown and total earnings display:
 * - Left: breakdown formula "$165/night x 4 x 12 wks"
 * - Right: "Your Earnings" label + large total "$7,920"
 *
 * Part of the Host Proposals V7 redesign.
 */
import React from 'react';

/**
 * PricingRow displays the pricing information
 *
 * @param {Object} props
 * @param {Object} props.proposal - The proposal object
 * @param {boolean} props.isDeclined - Whether the proposal is declined (shows strikethrough)
 */
export function PricingRow({ proposal, isDeclined = false }) {
  // Extract pricing data
  const nightlyRate = proposal?.nightly_rate || proposal?.price_per_night || 0;
  const daysSelected = proposal?.days_selected || proposal?.Days_Selected || [];
  const nightsPerWeek = Math.max(0, (Array.isArray(daysSelected) ? daysSelected.length : 0) - 1);
  const weeks = proposal?.duration_weeks || proposal?.weeks || proposal?.total_weeks || 0;
  const totalEarnings = proposal?.total_price || proposal?.host_earnings || proposal?.total_amount || 0;

  // Format the breakdown
  const breakdownParts = [];
  if (nightlyRate > 0) breakdownParts.push(`$${nightlyRate}/night`);
  if (nightsPerWeek > 0) breakdownParts.push(`${nightsPerWeek}`);
  if (weeks > 0) breakdownParts.push(`${weeks} wks`);

  // Format total
  const formattedTotal = `$${Number(totalEarnings).toLocaleString()}`;

  return (
    <div className="hp7-pricing-row">
      <div className="hp7-pricing-breakdown">
        {breakdownParts.length > 0 ? (
          breakdownParts.map((part, index) => (
            <React.Fragment key={index}>
              <span>{part}</span>
              {index < breakdownParts.length - 1 && <span>×</span>}
            </React.Fragment>
          ))
        ) : (
          <span>Pricing details</span>
        )}
      </div>
      <div className="hp7-pricing-total-wrapper">
        <div className="hp7-pricing-total-label">
          {isDeclined ? 'Was Offered' : 'Your Earnings'}
        </div>
        <div className={`hp7-pricing-total${isDeclined ? ' declined' : ''}`}>
          {formattedTotal}
        </div>
      </div>
    </div>
  );
}

export default PricingRow;
