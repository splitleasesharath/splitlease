/**
 * DaysSelectionSection - Adjust weekly schedule selection
 * Now uses the reusable ListingScheduleSelector component with full price calculation
 */

import { useState, useEffect, useMemo } from 'react';
import ListingScheduleSelector from '../ListingScheduleSelector.jsx';
import { DAY_NAMES } from '../../../lib/dayUtils.js';

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
      explanation: 'Prices shown reflect actual weeks of occupancy only.',
      actualWeeksPer4: 2
    };
  }

  if (pattern.includes('2 on 2 off') || pattern.includes('2on2off') ||
      pattern.includes('two weeks on') ||
      (pattern.includes('two week') && pattern.includes('two week')) ||
      (pattern.includes('2 week on') && pattern.includes('2 week off'))) {
    return {
      label: '2 weeks on / 2 weeks off',
      explanation: 'Prices shown reflect actual weeks of occupancy only.',
      actualWeeksPer4: 2
    };
  }

  if (pattern.includes('1 on 3 off') || pattern.includes('1on3off') ||
      (pattern.includes('one week on') && pattern.includes('three week')) ||
      (pattern.includes('1 week on') && pattern.includes('3 week off'))) {
    return {
      label: '1 week on / 3 weeks off',
      explanation: 'Prices shown reflect actual weeks of occupancy only.',
      actualWeeksPer4: 1
    };
  }

  return null;
}

/**
 * Calculate check-in and check-out days from selected day numbers
 * Check-in = first selected day, Check-out = last selected day (NOT day after)
 * This matches the ListingScheduleSelector behavior
 */
const calculateCheckInCheckOutFromNumbers = (dayNumbers) => {
  if (!dayNumbers || dayNumbers.length === 0) {
    return { checkInName: null, checkOutName: null };
  }

  const sorted = [...dayNumbers].sort((a, b) => a - b);

  // Check for wrap-around case (both Saturday and Sunday present)
  const hasSaturday = sorted.includes(6);
  const hasSunday = sorted.includes(0);

  if (hasSaturday && hasSunday && dayNumbers.length < 7) {
    // Find the gap in the selection to determine wrap-around
    let gapIndex = -1;
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i + 1] - sorted[i] > 1) {
        gapIndex = i + 1;
        break;
      }
    }

    if (gapIndex !== -1) {
      // Wrap-around case: check-in is the first day after the gap
      // check-out is the last day before the gap
      const checkInDayNumber = sorted[gapIndex];
      const checkOutDayNumber = sorted[gapIndex - 1];
      return {
        checkInName: DAY_NAMES[checkInDayNumber],
        checkOutName: DAY_NAMES[checkOutDayNumber]
      };
    }
  }

  // Standard case: check-in = first day, check-out = last selected day
  const checkInDayNumber = sorted[0];
  const checkOutDayNumber = sorted[sorted.length - 1];

  return {
    checkInName: DAY_NAMES[checkInDayNumber],
    checkOutName: DAY_NAMES[checkOutDayNumber]
  };
};

export default function DaysSelectionSection({ data, updateData, listing, zatConfig, errors = {} }) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Convert day names to day objects for ListingScheduleSelector
  const dayNamesToObjects = (dayNames) => {
    if (!dayNames || !Array.isArray(dayNames)) return [];
    return dayNames.map(name => {
      const dayOfWeek = days.indexOf(name);
      return {
        id: `day-${dayOfWeek}`,
        dayOfWeek,
        name,
        abbreviation: name.substring(0, 3),
        isSelected: true
      };
    });
  };

  // Convert day objects to day names
  const dayObjectsToNames = (dayObjects) => {
    if (!dayObjects || !Array.isArray(dayObjects)) return [];
    return dayObjects.map(dayObj => days[dayObj.dayOfWeek]);
  };

  // Convert day names to numbers for listing availability
  const convertDayNamesToNumbers = (dayNames) => {
    if (!dayNames || !Array.isArray(dayNames)) return [0, 1, 2, 3, 4, 5, 6];
    const dayNameMap = {
      'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
      'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };
    const numbers = dayNames.map(name => dayNameMap[name]).filter(num => num !== undefined);
    return numbers.length > 0 ? numbers : [0, 1, 2, 3, 4, 5, 6];
  };

  // Prepare listing data for ListingScheduleSelector component
  const scheduleSelectorListing = useMemo(() => {
    if (!listing) return null;

    return {
      id: listing._id,
      firstAvailable: new Date(listing[' First Available'] || Date.now()),
      lastAvailable: new Date(listing['Last Available'] || Date.now()),
      numberOfNightsAvailable: listing['# of nights available'] || 7,
      active: listing.Active,
      approved: listing.Approved,
      datesBlocked: listing['Dates - Blocked'] || [],
      complete: listing.Complete,
      confirmedAvailability: listing.confirmedAvailability,
      checkInTime: listing['NEW Date Check-in Time'] || '3:00 pm',
      checkOutTime: listing['NEW Date Check-out Time'] || '11:00 am',
      nightsAvailableList: [],
      nightsAvailableNumbers: listing['Nights Available (numbers)'] || [0, 1, 2, 3, 4, 5, 6],
      nightsNotAvailable: [],
      minimumNights: listing['Minimum Nights'] || 2,
      maximumNights: listing['Maximum Nights'] || 7,
      daysAvailable: convertDayNamesToNumbers(listing['Days Available (List of Days)']),
      daysNotAvailable: [],
      // Pricing fields for calculation
      'rental type': listing['rental type'] || 'Nightly',
      'Weeks offered': listing['Weeks offered'] || 'Every week',
      '💰Unit Markup': listing['💰Unit Markup'] || 0,
      '💰Nightly Host Rate for 2 nights': listing['💰Nightly Host Rate for 2 nights'],
      '💰Nightly Host Rate for 3 nights': listing['💰Nightly Host Rate for 3 nights'],
      '💰Nightly Host Rate for 4 nights': listing['💰Nightly Host Rate for 4 nights'],
      '💰Nightly Host Rate for 5 nights': listing['💰Nightly Host Rate for 5 nights'],
      '💰Nightly Host Rate for 7 nights': listing['💰Nightly Host Rate for 7 nights'],
      '💰Weekly Host Rate': listing['💰Weekly Host Rate'],
      '💰Monthly Host Rate': listing['💰Monthly Host Rate'],
      '💰Price Override': listing['💰Price Override'],
      '💰Cleaning Cost / Maintenance Fee': listing['💰Cleaning Cost / Maintenance Fee'],
      '💰Damage Deposit': listing['💰Damage Deposit']
    };
  }, [listing]);

  // Initialize selected days from data
  const initialSelectedDays = useMemo(() => {
    return dayNamesToObjects(data.daysSelected || []);
  }, []);

  // Handle schedule selection change
  const handleScheduleChange = (newSelectedDayObjects) => {
    const dayNames = dayObjectsToNames(newSelectedDayObjects);
    updateData('daysSelected', dayNames);

    // Update check-in and check-out days using the correct calculation
    // Check-out = last selected day (NOT day after) to match ListingScheduleSelector
    if (dayNames.length > 0) {
      // Convert day names to numbers for the calculation
      const dayNumbers = newSelectedDayObjects.map(dayObj => dayObj.dayOfWeek);

      // Use the local function that correctly sets checkout to last selected day
      const { checkInName, checkOutName } = calculateCheckInCheckOutFromNumbers(dayNumbers);

      updateData('checkInDay', checkInName);
      updateData('checkOutDay', checkOutName);
    }
  };

  // Handle price change from ListingScheduleSelector
  const handlePriceChange = (priceBreakdown) => {
    if (priceBreakdown && priceBreakdown.valid) {
      // Pass the full pricing breakdown object to trigger proper updates
      // This allows CreateProposalFlowV2 to recalculate numberOfNights and firstFourWeeksTotal
      updateData('pricingBreakdown', priceBreakdown);

      // Also update individual fields for direct display
      updateData('pricePerNight', priceBreakdown.pricePerNight);
      updateData('pricePerFourWeeks', priceBreakdown.fourWeekRent);
      updateData('totalPrice', priceBreakdown.reservationTotal);
    }
  };

  if (!scheduleSelectorListing) {
    return (
      <div className="section days-selection-section">
        <p>Loading schedule selector...</p>
      </div>
    );
  }

  return (
    <div className="section days-selection-section">
      <h3 className="section-title">
        Please confirm your typical weekly schedule
      </h3>

      <div id="daysSelected">
        <ListingScheduleSelector
          listing={scheduleSelectorListing}
          initialSelectedDays={initialSelectedDays}
          limitToFiveNights={false}
          reservationSpan={data.reservationSpan || 13}
          zatConfig={zatConfig}
          onSelectionChange={handleScheduleChange}
          onPriceChange={handlePriceChange}
          showPricing={true}
        />
        {errors.daysSelected && (
          <div className="form-error-message" style={{ marginTop: '8px' }}>{errors.daysSelected}</div>
        )}
      </div>

      {/* Alternating Schedule Notice */}
      {(() => {
        const weeksOffered = listing?.['Weeks offered'] || listing?.weeks_offered;
        const scheduleInfo = getWeeksOfferedDescription(weeksOffered);
        if (scheduleInfo) {
          return (
            <div className="schedule-notice" style={{
              backgroundColor: '#E8F4FD',
              border: '1px solid #B8DAFF',
              borderRadius: '8px',
              padding: '10px 14px',
              marginTop: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>📅</span>
                <div style={{ fontSize: '13px', color: '#004085' }}>
                  <strong>Schedule:</strong> {scheduleInfo.label} — {scheduleInfo.explanation}
                </div>
              </div>
            </div>
          );
        }
        return null;
      })()}

      <div className="pricing-display" style={{ marginTop: '16px' }}>
        <p><strong>Price per Night:</strong> ${data.pricePerNight?.toFixed(2) || '0.00'}</p>
      </div>
    </div>
  );
}
