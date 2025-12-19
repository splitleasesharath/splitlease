import { useState, useCallback, useEffect, useMemo } from 'react';
import { useScheduleSelector } from './useScheduleSelector.js';
import { DayButton } from './DayButton.jsx';
import { ErrorOverlay } from './ErrorOverlay.jsx';
import { PriceDisplay } from './PriceDisplay.jsx';
import '../../styles/listing-schedule-selector.css';

/**
 * ListingScheduleSelector - Main component for selecting days for a rental listing
 * @param {Object} listing - The listing object with availability and pricing
 * @param {Array} initialSelectedDays - Initially selected days
 * @param {boolean} limitToFiveNights - Whether to limit selection to 5 nights
 * @param {number} reservationSpan - Number of weeks for the reservation (default: 13)
 * @param {Object} zatConfig - ZAT price configuration object
 * @param {Function} onScheduleSave - Callback when schedule is saved
 * @param {Function} onSelectionChange - Callback when selection changes (fires immediately)
 * @param {Function} onPriceChange - Callback when price changes (fires immediately)
 * @param {boolean} showPricing - Whether to show pricing information
 */
export default function ListingScheduleSelector({
  listing,
  initialSelectedDays = [],
  limitToFiveNights = false,
  reservationSpan = 13,
  zatConfig = null,
  onScheduleSave,
  onSelectionChange,
  onPriceChange,
  showPricing = true
}) {
  const {
    selectedDays,
    allDays,
    nightsCount,
    priceBreakdown,
    errorState,
    isClickable,
    isContiguous,
    acceptableSchedule,
    checkInDay,
    checkOutDay,
    handleDayClick,
    clearError
  } = useScheduleSelector({
    listing,
    initialSelectedDays,
    limitToFiveNights,
    reservationSpan,
    zatConfig,
    onSelectionChange,
    onPriceChange
  });

  return (
    <div className="listing-schedule-selector">
      <div className="selector-header">
        <h3>Schedule</h3>
        <p className="selector-description">
          Choose consecutive days for your stay
        </p>
      </div>

      <div className="day-grid">
        {allDays.map((day) => {
          const isSelected = selectedDays.some(d => d.dayOfWeek === day.dayOfWeek);
          return (
            <DayButton
              key={day.id}
              day={day}
              isSelected={isSelected}
              isClickable={isClickable}
              onClick={handleDayClick}
            />
          );
        })}
      </div>

      <div className="selection-info">
        {selectedDays.length > 0 && (
          <>
            {selectedDays.length === 7 ? (
              <div className="info-row">
                <span className="info-value">
                  <strong>Full-time stay</strong>
                </span>
              </div>
            ) : (
              <>
                <div className="info-row">
                  <span className="info-value">
                    <strong>{selectedDays.length} days, {nightsCount} nights</strong> Selected
                  </span>
                </div>
                <div className="check-dates" style={{
                  fontSize: '12px',
                  color: '#6B7280',
                  fontWeight: 400,
                  lineHeight: '1.6'
                }}>
                  {`Check-in day is ${checkInDay?.name || ''}\nCheck-out day is ${checkOutDay?.name || ''}`}
                </div>
              </>
            )}
            {!isContiguous && (
              <div className="info-row">
                <span className="info-value error">
                  Days must be consecutive
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {showPricing && nightsCount > 0 && (
        <PriceDisplay priceBreakdown={priceBreakdown} />
      )}

      <ErrorOverlay errorState={errorState} onClose={clearError} />
    </div>
  );
}
