/**
 * PriceBreakdown - Display calculated pricing
 */

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount || 0);
}

export default function PriceBreakdown({ pricing }) {
  if (!pricing) {
    return (
      <div className="csp-config-section csp-pricing-section">
        <h3>Reservation Price Breakdown</h3>
        <p className="csp-no-pricing">Select days and reservation span to see pricing</p>
      </div>
    );
  }

  return (
    <div className="csp-config-section csp-pricing-section">
      <h3>Reservation Price Breakdown</h3>

      <div className="csp-price-display">
        <div className="csp-price-row">
          <span className="csp-price-label">Number of nights:</span>
          <span className="csp-price-value">{pricing.totalNights}</span>
        </div>
        <div className="csp-price-row">
          <span className="csp-price-label">Price per night:</span>
          <span className="csp-price-value">{formatCurrency(pricing.nightlyPrice)}</span>
        </div>
        <div className="csp-price-row">
          <span className="csp-price-label">Nights per week:</span>
          <span className="csp-price-value">{pricing.nightsPerWeek}</span>
        </div>
        <div className="csp-price-row">
          <span className="csp-price-label">Number of weeks:</span>
          <span className="csp-price-value">{pricing.numberOfWeeks}</span>
        </div>
        <div className="csp-price-row csp-separator">
          <span className="csp-price-label">Price per 4 weeks:</span>
          <span className="csp-price-value">{formatCurrency(pricing.fourWeekRent)}</span>
        </div>
        <div className="csp-price-row">
          <span className="csp-price-label">Security Deposit:</span>
          <span className="csp-price-value">{formatCurrency(pricing.damageDeposit)}</span>
        </div>
        <div className="csp-price-row">
          <span className="csp-price-label">Cleaning Cost:</span>
          <span className="csp-price-value">{formatCurrency(pricing.cleaningFee)}</span>
        </div>
        <div className="csp-price-row">
          <span className="csp-price-label">Initial Payment (first month):</span>
          <span className="csp-price-value">{formatCurrency(pricing.initialPayment)}</span>
        </div>
        <div className="csp-price-row csp-total">
          <span className="csp-price-label">Total Price for Reservation:</span>
          <span className="csp-price-value">{formatCurrency(pricing.grandTotal)}</span>
        </div>
        <div className="csp-price-row csp-host">
          <span className="csp-price-label">Host Compensation:</span>
          <span className="csp-price-value">{formatCurrency(pricing.hostCompensation)}</span>
        </div>
      </div>
    </div>
  );
}
