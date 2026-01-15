/**
 * PricingPreview - Shows pricing breakdowns before saving
 * Displays a summary of the current pricing configuration
 */
export function PricingPreview({
  selectedRentalType,
  damageDeposit,
  maintenanceFee,
  nightlyPricing,
  weeklyRate,
  monthlyRate,
  formatCurrency,
  calculateNightlyRate,
  selectedNights
}) {
  return (
    <div className="pricing-preview">
      <h3>Pricing Summary</h3>

      <div className="pricing-preview__section">
        <div className="pricing-preview__label">Rental Type:</div>
        <div className="pricing-preview__value">{selectedRentalType}</div>
      </div>

      <div className="pricing-preview__section">
        <div className="pricing-preview__label">Damage Deposit:</div>
        <div className="pricing-preview__value">{formatCurrency(damageDeposit)}</div>
      </div>

      <div className="pricing-preview__section">
        <div className="pricing-preview__label">Monthly Maintenance:</div>
        <div className="pricing-preview__value">{formatCurrency(maintenanceFee)}</div>
      </div>

      {selectedRentalType === 'Nightly' && (
        <div className="pricing-preview__section">
          <div className="pricing-preview__label">Nightly Rates:</div>
          <div className="pricing-preview__rates">
            {[2, 3, 4, 5].map((nights) => {
              if (selectedNights.length < nights) return null;
              const rate = calculateNightlyRate(nightlyPricing[nights], nights);
              return (
                <div key={nights} className="pricing-preview__rate-item">
                  {nights} nights: {formatCurrency(rate)}/night
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedRentalType === 'Weekly' && (
        <div className="pricing-preview__section">
          <div className="pricing-preview__label">Weekly Rate:</div>
          <div className="pricing-preview__value">{formatCurrency(weeklyRate)}/week</div>
        </div>
      )}

      {selectedRentalType === 'Monthly' && (
        <div className="pricing-preview__section">
          <div className="pricing-preview__label">Monthly Rate:</div>
          <div className="pricing-preview__value">{formatCurrency(monthlyRate)}/month</div>
        </div>
      )}
    </div>
  );
}
