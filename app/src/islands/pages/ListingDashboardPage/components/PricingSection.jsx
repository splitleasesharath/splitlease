import { HostScheduleSelector } from '../../../shared/HostScheduleSelector';
import NightlyPricingLegend from './NightlyPricingLegend';

export default function PricingSection({ listing, onEdit }) {
  const weeklyComp = listing?.weeklyCompensation || {};
  const nightsAvailable = listing?.nightsAvailable || [];
  const isNightly = (listing?.leaseStyle || 'Nightly').toLowerCase() === 'nightly';
  const isMonthly = (listing?.leaseStyle || '').toLowerCase() === 'monthly';

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
    <div className="listing-dashboard-section">
      {/* Section Header */}
      <div className="listing-dashboard-section__header">
        <h2 className="listing-dashboard-section__title">Pricing and Lease Style</h2>
        <button className="listing-dashboard-section__edit" onClick={onEdit}>
          edit
        </button>
      </div>

      {/* Content */}
      <div className="listing-dashboard-pricing">
        {/* Left Column - Lease Style Info */}
        <div className="listing-dashboard-pricing__left">
          <div className="listing-dashboard-pricing__info">
            <p>
              <strong>Selected Lease Style:</strong> {listing?.leaseStyle || 'Nightly'}
            </p>
            {!isMonthly && (
              <p>
                <strong>Nights / Week</strong>{' '}
                {listing?.nightsPerWeekMin || 2} to {listing?.nightsPerWeekMax || 7}
              </p>
            )}
          </div>

          {/* Host Schedule Selector - Display Only (only for nightly) */}
          {!isMonthly && (
            <div className="listing-dashboard-pricing__days">
              <p className="listing-dashboard-pricing__days-label">Nights / Week</p>
              <HostScheduleSelector
                listing={{ nightsAvailable }}
                selectedNights={nightsAvailable}
                isClickable={false}
                mode="preview"
              />
              <div className="listing-dashboard-pricing__legend">
                <span className="listing-dashboard-pricing__legend-dot listing-dashboard-pricing__legend-dot--available" />
                <span>
                  {nightsAvailable.length === 7 ? 'All nights available' : `${nightsAvailable.length} nights available`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Pricing Info */}
        <div className="listing-dashboard-pricing__right">
          {/* Monthly pricing shows just the monthly host rate */}
          {isMonthly ? (
            <div className="listing-dashboard-pricing__monthly-rate">
              <p className="listing-dashboard-pricing__monthly-rate-label">Monthly Host Rate</p>
              <p className="listing-dashboard-pricing__monthly-rate-value">
                {formatCurrency(listing?.monthlyHostRate || 0)}
                <span className="listing-dashboard-pricing__monthly-rate-period">/month</span>
              </p>
            </div>
          ) : isNightly ? (
            <NightlyPricingLegend
              weeklyCompensation={weeklyComp}
              nightsPerWeekMin={listing?.nightsPerWeekMin || 2}
              nightsPerWeekMax={listing?.nightsPerWeekMax || 7}
            />
          ) : (
            <div className="listing-dashboard-pricing__rates">
              <p><strong>Occupancy Comp./Wk</strong></p>
              {[2, 3, 4, 5, 6, 7].map((nights) => (
                <p key={nights}>
                  @<strong>{nights}</strong> nights/wk: {formatCurrency(weeklyComp[nights] || 0)}
                </p>
              ))}
            </div>
          )}

          <div className="listing-dashboard-pricing__fees">
            <p><strong>Additional Charges</strong></p>
            <p>Damage Deposit: {formatCurrency(listing?.damageDeposit || 0)}</p>
            <p>Maintenance Fee: {formatCurrency(listing?.maintenanceFee || 0)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
