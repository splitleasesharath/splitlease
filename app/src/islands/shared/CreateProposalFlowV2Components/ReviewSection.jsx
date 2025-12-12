/**
 * ReviewSection - Review and confirm proposal details
 */

/**
 * Get human-readable description of the weeks offered pattern
 */
function getWeeksOfferedDescription(weeksOffered) {
  if (!weeksOffered) return null;
  const pattern = weeksOffered.toLowerCase();

  if (pattern.includes('1 on 1 off') || pattern.includes('1on1off') ||
      (pattern.includes('one week on') && pattern.includes('one week off')) ||
      (pattern.includes('1 week on') && pattern.includes('1 week off'))) {
    return {
      label: '1 week on / 1 week off',
      shortLabel: '1on/1off',
      actualWeeksPer4: 2
    };
  }

  if (pattern.includes('2 on 2 off') || pattern.includes('2on2off') ||
      pattern.includes('two weeks on') ||
      (pattern.includes('two week') && pattern.includes('two week')) ||
      (pattern.includes('2 week on') && pattern.includes('2 week off'))) {
    return {
      label: '2 weeks on / 2 weeks off',
      shortLabel: '2on/2off',
      actualWeeksPer4: 2
    };
  }

  if (pattern.includes('1 on 3 off') || pattern.includes('1on3off') ||
      (pattern.includes('one week on') && pattern.includes('three week')) ||
      (pattern.includes('1 week on') && pattern.includes('3 week off'))) {
    return {
      label: '1 week on / 3 weeks off',
      shortLabel: '1on/3off',
      actualWeeksPer4: 1
    };
  }

  return null;
}

export default function ReviewSection({ data, listing, onEditUserDetails, onEditMoveIn, onEditDays }) {
  // Format currency with comma separators for thousands
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="section review-section">
      {/* Move-in and Schedule Details */}
      <div className="review-field">
        <span className="review-label">Approx Move-in</span>
        <span className="review-value">{formatDate(data.moveInDate)}</span>
        <button className="edit-link" onClick={onEditMoveIn}>edit</button>
      </div>

      <div className="review-field">
        <span className="review-label">Check-in</span>
        <span className="review-value">{data.checkInDay}</span>
        <button className="edit-link" onClick={onEditDays}>edit</button>
      </div>

      <div className="review-field">
        <span className="review-label">Check-out</span>
        <span className="review-value">{data.checkOutDay}</span>
        <button className="edit-link" onClick={onEditDays}>edit</button>
      </div>

      <div className="review-field">
        <span className="review-label">Reservation span (weeks)</span>
        <span className="review-value">{data.reservationSpan}</span>
        <button className="edit-link" onClick={onEditMoveIn}>edit</button>
      </div>

      {/* Alternating Schedule Notice */}
      {(() => {
        const weeksOffered = listing?.['Weeks offered'] || listing?.weeks_offered;
        const scheduleInfo = getWeeksOfferedDescription(weeksOffered);
        if (scheduleInfo) {
          const actualWeeks = Math.ceil(scheduleInfo.actualWeeksPer4 * (data.reservationSpan / 4));
          return (
            <div className="schedule-notice" style={{
              backgroundColor: '#FFF3CD',
              border: '1px solid #FFECB5',
              borderRadius: '8px',
              padding: '12px 16px',
              marginTop: '12px',
              marginBottom: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>📅</span>
                <div>
                  <div style={{ fontWeight: '600', color: '#856404', fontSize: '14px' }}>
                    Alternating Schedule: {scheduleInfo.label}
                  </div>
                  <div style={{ fontSize: '13px', color: '#664D03', marginTop: '4px' }}>
                    Out of {data.reservationSpan} weeks, you will occupy <strong>{actualWeeks} weeks</strong> total.
                    <br />
                    <span style={{ fontStyle: 'italic' }}>Pricing reflects actual occupancy weeks only.</span>
                  </div>
                </div>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Pricing Summary */}
      <div className="pricing-section">
        <div className="price-row">
          <span className="price-label">Price per night</span>
          <span className="price-value">{formatCurrency(data.pricePerNight)}</span>
        </div>

        <div className="price-row">
          <span className="price-label">Number of nights per week</span>
          <span className="price-value">x {data.numberOfNights}</span>
        </div>

        {/* Show actual weeks breakdown for alternating schedules */}
        {(() => {
          const weeksOffered = listing?.['Weeks offered'] || listing?.weeks_offered;
          const scheduleInfo = getWeeksOfferedDescription(weeksOffered);
          if (scheduleInfo) {
            const actualWeeks = Math.ceil(scheduleInfo.actualWeeksPer4 * (data.reservationSpan / 4));
            return (
              <div className="price-row">
                <span className="price-label">
                  Actual weeks of occupancy
                  <div style={{ fontSize: '11px', color: '#666', fontStyle: 'italic', marginTop: '2px' }}>
                    ({scheduleInfo.shortLabel} schedule)
                  </div>
                </span>
                <span className="price-value">x {actualWeeks} weeks</span>
              </div>
            );
          }
          return null;
        })()}

        <div className="divider"></div>

        <div className="price-row">
          <span className="price-label">
            Total price for reservation
            <div style={{ fontSize: '11px', color: '#666', fontStyle: 'italic', marginTop: '3px' }}>
              *excluding Maintenance Fee and Damage Deposit
            </div>
          </span>
          <span className="price-value">{formatCurrency(data.totalPrice)}</span>
        </div>

        <div className="price-row">
          <span className="price-label">Price per 4 weeks</span>
          <span className="price-value">{formatCurrency(data.pricePerFourWeeks)}</span>
        </div>

        <div className="price-row">
          <span className="price-label">
            Refundable* Damage Deposit
            <a href="/policies#damage-deposit" style={{ fontSize: '11px', marginLeft: '5px', color: '#0066cc' }}>
              *see terms of use
            </a>
          </span>
          <span className="price-value">+ {formatCurrency(data.damageDeposit)}</span>
        </div>

        <div className="price-row">
          <span className="price-label">Maintenance Fee / 4 wks</span>
          <span className="price-value">
            {data.maintenanceFee === 0 ? 'No cleaning fee' : `+ ${formatCurrency(data.maintenanceFee)}`}
          </span>
        </div>

        <div className="divider"></div>

        <div className="price-row price-highlight">
          <div>
            <div className="price-label" style={{ fontWeight: '700', fontSize: '15px' }}>
              Price for the 1st 4 weeks
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '3px' }}>
              incl. Damage Deposit + Maintenance Fees
            </div>
          </div>
          <span className="price-value" style={{ fontSize: '20px', color: '#5B2C6F', fontWeight: '700' }}>
            {formatCurrency(data.firstFourWeeksTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}
