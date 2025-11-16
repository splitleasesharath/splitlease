/**
 * MoveInSection - Adjust move-in date and reservation length
 */

export default function MoveInSection({ data, updateData, listing }) {
  const reservationOptions = [
    { value: 6, label: '6 weeks' },
    { value: 7, label: '7 weeks' },
    { value: 8, label: '8 weeks' },
    { value: 9, label: '9 weeks (~2 months)' },
    { value: 10, label: '10 weeks' },
    { value: 12, label: '12 weeks' },
    { value: 13, label: '13 weeks (3 months)' },
    { value: 16, label: '16 weeks' },
    { value: 17, label: '17 weeks (~4 months)' },
    { value: 20, label: '20 weeks' },
    { value: 22, label: '22 weeks (~5 months)' },
    { value: 26, label: '26 weeks (6 months)' }
  ];

  // Calculate minimum move-in date (2 weeks from today)
  const getMinDate = () => {
    const today = new Date();
    const twoWeeksFromNow = new Date(today);
    twoWeeksFromNow.setDate(today.getDate() + 14);
    return twoWeeksFromNow.toISOString().split('T')[0];
  };

  return (
    <div className="section move-in-section">
      <div className="form-group">
        <label className="form-label">
          Approx Move-in
          <span className="helper-icon" title="Your move in date depends on this listing's availability. Let us know if you have any move-in flexibility">
            ℹ️
          </span>
        </label>
        <div className="helper-text">
          Your move in date depends on this listing's availability. Let us know if you have any move-in flexibility
        </div>
        <input
          type="date"
          value={data.moveInDate ? data.moveInDate.split('T')[0] : ''}
          onChange={(e) => updateData('moveInDate', e.target.value)}
          min={getMinDate()}
          className="form-input date-picker"
        />
      </div>

      <div className="form-group">
        <label htmlFor="moveInRange" className="form-label">
          Move-in Range (Optional)
        </label>
        <input
          type="text"
          id="moveInRange"
          className="form-input"
          placeholder="e.g., 2-3 weeks flexibility"
          value={data.moveInRange}
          onChange={(e) => updateData('moveInRange', e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="reservationSpan" className="form-label">
          Reservation Length
        </label>
        <div className="select-wrapper">
          <span className="select-icon">🕐</span>
          <select
            id="reservationSpan"
            className="form-select"
            value={data.reservationSpan}
            onChange={(e) => updateData('reservationSpan', parseInt(e.target.value))}
          >
            {reservationOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {listing?.['Dates - Blocked'] && listing['Dates - Blocked'].length > 0 && (
        <div className="blocked-dates-notice">
          <h4>Desired Nights Restricted by Host</h4>
          <ul>
            {listing['Dates - Blocked'].slice(0, 5).map((date, index) => (
              <li key={index}>- {new Date(date).toLocaleDateString()}</li>
            ))}
          </ul>
          <p className="warning-text">
            You will have the option to either accept these restrictions or request these
            restrictions being removed during negotiations.
          </p>
        </div>
      )}
    </div>
  );
}
