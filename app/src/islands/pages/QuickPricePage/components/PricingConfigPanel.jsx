/**
 * PricingConfigPanel - Right sidebar showing global pricing configuration
 *
 * Displays read-only pricing constants:
 * - Site markup rate
 * - Full-time discount rate
 * - Billing cycle info
 */

export default function PricingConfigPanel({ config }) {
  if (!config) {
    return (
      <div className="pricing-config-panel">
        <h2 className="pricing-config-panel__title">Pricing Config</h2>
        <p className="pricing-config-panel__loading">Loading...</p>
      </div>
    );
  }

  const formatPercent = (value) => {
    return `${(value * 100).toFixed(0)}%`;
  };

  return (
    <div className="pricing-config-panel">
      <div className="pricing-config-panel__header">
        <h2 className="pricing-config-panel__title">Pricing Config</h2>
        {config.isReadOnly && (
          <span className="pricing-config-panel__badge">Read Only</span>
        )}
      </div>

      <div className="pricing-config-panel__section">
        <h3 className="pricing-config-panel__section-title">Markup & Discounts</h3>

        <div className="pricing-config-panel__item">
          <span className="pricing-config-panel__label">Site Markup</span>
          <span className="pricing-config-panel__value pricing-config-panel__value--markup">
            +{formatPercent(config.siteMarkupRate)}
          </span>
        </div>

        <div className="pricing-config-panel__item">
          <span className="pricing-config-panel__label">Full-Time Discount</span>
          <span className="pricing-config-panel__value pricing-config-panel__value--discount">
            -{formatPercent(config.fullTimeDiscountRate)}
          </span>
        </div>
      </div>

      <div className="pricing-config-panel__section">
        <h3 className="pricing-config-panel__section-title">Thresholds</h3>

        <div className="pricing-config-panel__item">
          <span className="pricing-config-panel__label">Full-Time Threshold</span>
          <span className="pricing-config-panel__value">
            {config.fullTimeNightsThreshold} nights/week
          </span>
        </div>

        <div className="pricing-config-panel__item">
          <span className="pricing-config-panel__label">Night Range</span>
          <span className="pricing-config-panel__value">
            {config.minNights} - {config.maxNights} nights
          </span>
        </div>
      </div>

      <div className="pricing-config-panel__section">
        <h3 className="pricing-config-panel__section-title">Billing</h3>

        <div className="pricing-config-panel__item">
          <span className="pricing-config-panel__label">Billing Cycle</span>
          <span className="pricing-config-panel__value">
            {config.billingCycleWeeks} weeks
          </span>
        </div>
      </div>

      <div className="pricing-config-panel__note">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        <span>
          To modify these values, update <code>pricingConstants.js</code>
        </span>
      </div>
    </div>
  );
}
