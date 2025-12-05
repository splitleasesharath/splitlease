const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function PricingSection({ listing, onEdit }) {
  const weeklyComp = listing?.weeklyCompensation || {};
  const availableDays = listing?.availableDays || [];

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
            <p>
              <strong>Nights / Week</strong>{' '}
              {listing?.nightsPerWeekMin || 2} to {listing?.nightsPerWeekMax || 7}
            </p>
          </div>

          {/* Day Selector Visual */}
          <div className="listing-dashboard-pricing__days">
            <p className="listing-dashboard-pricing__days-label">Nights / Week</p>
            <div className="listing-dashboard-pricing__day-grid">
              {DAY_LABELS.map((day, index) => {
                const isAvailable = availableDays.includes(index);
                return (
                  <div
                    key={index}
                    className={`listing-dashboard-pricing__day ${isAvailable ? 'listing-dashboard-pricing__day--available' : ''}`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
            <div className="listing-dashboard-pricing__legend">
              <span className="listing-dashboard-pricing__legend-dot listing-dashboard-pricing__legend-dot--available" />
              <span>
                {availableDays.length === 7 ? 'All nights available' : `${availableDays.length} nights available`}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column - Pricing Info */}
        <div className="listing-dashboard-pricing__right">
          <div className="listing-dashboard-pricing__rates">
            <p><strong>Occupancy Comp./Wk</strong></p>
            {[2, 3, 4, 5, 6, 7].map((nights) => (
              <p key={nights}>
                @<strong>{nights}</strong> nights/wk: {formatCurrency(weeklyComp[nights] || 0)}
              </p>
            ))}
          </div>

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
