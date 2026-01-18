/**
 * NightlyRateDisplay - Shows calculated nightly rates in a clear format
 * Displays the breakdown of how nightly rates are derived from weekly compensation
 */
export function NightlyRateDisplay({ nightlyPricing, calculateNightlyRate, formatCurrency, selectedNights }) {
  if (!nightlyPricing || Object.keys(nightlyPricing).length === 0) {
    return null;
  }

  return (
    <div className="nightly-rate-display">
      <h3>Nightly Rate Breakdown</h3>
      <div className="nightly-rate-display__grid">
        {[2, 3, 4, 5].map((nights) => {
          if (selectedNights.length < nights) return null;

          const weeklyComp = nightlyPricing[nights];
          const nightlyRate = calculateNightlyRate(weeklyComp, nights);

          return (
            <div key={nights} className="nightly-rate-display__item">
              <div className="nightly-rate-display__nights">
                {nights} {nights === 1 ? 'Night' : 'Nights'} / Week
              </div>
              <div className="nightly-rate-display__calculation">
                {formatCurrency(weeklyComp)} ÷ {nights} nights
              </div>
              <div className="nightly-rate-display__result">
                = {formatCurrency(nightlyRate)}/night
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
