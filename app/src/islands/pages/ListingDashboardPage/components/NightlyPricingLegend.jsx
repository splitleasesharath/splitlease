/**
 * NightlyPricingLegend - Display-only nightly pricing with gradient legend
 *
 * Shows the nightly rates in a visual gradient format similar to SelfListingPageV2,
 * but read-only (no slider controls).
 *
 * @param {Object} props
 * @param {Object} props.weeklyCompensation - Object with night counts (2-7) as keys and total weekly amounts as values
 * @param {number} props.nightsPerWeekMin - Minimum nights per week (default 2)
 * @param {number} props.nightsPerWeekMax - Maximum nights per week (default 7)
 */
export default function NightlyPricingLegend({
  weeklyCompensation = {},
  nightsPerWeekMin = 2,
  nightsPerWeekMax = 7
}) {
  // Calculate per-night rates from weekly compensation
  // For each night count, divide total by nights to get per-night rate
  const getNightlyRate = (nights) => {
    const total = weeklyCompensation[nights] || 0;
    return Math.round(total / nights);
  };

  // Get the range of nights to display (from min to max)
  const nightsRange = [];
  for (let i = nightsPerWeekMin; i <= nightsPerWeekMax; i++) {
    nightsRange.push(i);
  }

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="ld-nightly-legend">
      <div className="ld-nightly-legend__header">Weekly Total by Occupancy</div>

      {/* Gradient Palette Display */}
      <div className="ld-nightly-legend__palette-container">
        <div className="ld-nightly-legend__palette-row">
          {nightsRange.map((nights, index) => {
            const total = weeklyCompensation[nights] || 0;
            const perNight = getNightlyRate(nights);
            // Calculate gradient class (n1 = darkest, higher = lighter)
            const gradientIndex = index + 1;
            return (
              <div
                key={nights}
                className={`ld-nightly-legend__swatch ld-nightly-legend__swatch--n${gradientIndex}`}
              >
                <span className="ld-nightly-legend__swatch-nights">{nights} nights</span>
                <span className="ld-nightly-legend__swatch-total">{formatCurrency(total)}</span>
                <span className="ld-nightly-legend__swatch-rate">{formatCurrency(perNight)}/nt</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Formula explanation */}
      <div className="ld-nightly-legend__hint">
        Weekly total based on selected number of nights
      </div>
    </div>
  );
}
