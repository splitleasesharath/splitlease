/**
 * ReviewSection - Review and confirm proposal details
 */

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

      {/* Pricing Summary */}
      <div className="pricing-section">
        <div className="price-row">
          <span className="price-label">Price per night</span>
          <span className="price-value">{formatCurrency(data.pricePerNight)}</span>
        </div>

        <div className="price-row">
          <span className="price-label">Number of reserved nights</span>
          <span className="price-value">x {data.numberOfNights}</span>
        </div>

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
