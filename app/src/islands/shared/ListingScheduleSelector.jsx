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
    clearSelection,
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

  const handleSave = () => {
    if (!acceptableSchedule) {
      return;
    }

    onScheduleSave?.(selectedDays);
  };

  return (
    <div className="listing-schedule-selector">
      <div className="selector-header">
        <h3>Select Your Days</h3>
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
            <div className="info-row">
              <span className="info-label">Days Selected:</span>
              <span className="info-value">
                {selectedDays.length === 7
                  ? 'Full-time'
                  : `${selectedDays.length} days, ${nightsCount} nights`}
              </span>
            </div>
            {selectedDays.length < 7 && checkInDay && (
              <div className="info-row">
                <span className="info-label">Check-in Day:</span>
                <span className="info-value">{checkInDay.name}</span>
              </div>
            )}
            {selectedDays.length < 7 && selectedDays.length > 0 && (
              <div className="info-row">
                <span className="info-label">Check-out Day:</span>
                <span className="info-value">{selectedDays[selectedDays.length - 1].name}</span>
              </div>
            )}
            {!isContiguous && (
              <div className="info-row">
                <span className="info-label"></span>
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

      <div className="selector-actions">
        <button
          className="btn-secondary"
          onClick={clearSelection}
          disabled={selectedDays.length === 0}
        >
          Clear Selection
        </button>
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={!acceptableSchedule}
        >
          Save Schedule
        </button>
      </div>

      <ErrorOverlay errorState={errorState} onClose={clearError} />
    </div>
  );
}
