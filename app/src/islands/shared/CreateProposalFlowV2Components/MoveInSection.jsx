/**
 * MoveInSection - Adjust move-in date and reservation length
 */

/**
 * Check if weeks offered is a non-standard pattern (not every week)
 */
function isAlternatingSchedule(weeksOffered) {
  if (!weeksOffered) return false;
  const pattern = weeksOffered.toLowerCase();
  return pattern.includes('1 on') || pattern.includes('2 on') ||
         pattern.includes('1on') || pattern.includes('2on') ||
         pattern.includes('one week on') || pattern.includes('two week');
}

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
      explanation: 'You will occupy the space every other week. Prices are calculated for actual weeks of occupancy only.',
      actualWeeksPer4: 2
    };
  }

  if (pattern.includes('2 on 2 off') || pattern.includes('2on2off') ||
      pattern.includes('two weeks on') ||
      (pattern.includes('two week') && pattern.includes('two week')) ||
      (pattern.includes('2 week on') && pattern.includes('2 week off'))) {
    return {
      label: '2 weeks on / 2 weeks off',
      explanation: 'You will occupy the space for 2 weeks, then off for 2 weeks. Prices are calculated for actual weeks of occupancy only.',
      actualWeeksPer4: 2
    };
  }

  if (pattern.includes('1 on 3 off') || pattern.includes('1on3off') ||
      (pattern.includes('one week on') && pattern.includes('three week')) ||
      (pattern.includes('1 week on') && pattern.includes('3 week off'))) {
    return {
      label: '1 week on / 3 weeks off',
      explanation: 'You will occupy the space 1 week per month. Prices are calculated for actual weeks of occupancy only.',
      actualWeeksPer4: 1
    };
  }

  return null;
}

export default function MoveInSection({ data, updateData, listing, errors = {} }) {
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
          id="moveInDate"
          value={data.moveInDate ? data.moveInDate.split('T')[0] : ''}
          onChange={(e) => updateData('moveInDate', e.target.value)}
          min={getMinDate()}
          className={`form-input date-picker ${errors.moveInDate ? 'is-invalid' : ''}`}
        />
        {errors.moveInDate && (
          <div className="form-error-message">{errors.moveInDate}</div>
        )}
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

      {/* Alternating Schedule Notice */}
      {(() => {
        const weeksOffered = listing?.['Weeks offered'] || listing?.weeks_offered;
        const scheduleInfo = getWeeksOfferedDescription(weeksOffered);
        if (scheduleInfo) {
          return (
            <div className="schedule-notice" style={{
              backgroundColor: '#FFF3CD',
              border: '1px solid #FFECB5',
              borderRadius: '8px',
              padding: '12px 16px',
              marginTop: '16px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>📅</span>
                <div>
                  <div style={{ fontWeight: '600', color: '#856404', marginBottom: '4px' }}>
                    Alternating Schedule: {scheduleInfo.label}
                  </div>
                  <div style={{ fontSize: '13px', color: '#664D03' }}>
                    {scheduleInfo.explanation}
                  </div>
                  <div style={{ fontSize: '12px', color: '#664D03', marginTop: '8px', fontStyle: 'italic' }}>
                    For a {data.reservationSpan}-week reservation span, you will occupy approximately{' '}
                    <strong>{Math.ceil(scheduleInfo.actualWeeksPer4 * (data.reservationSpan / 4))} weeks</strong> total.
                  </div>
                </div>
              </div>
            </div>
          );
        }
        return null;
      })()}

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
