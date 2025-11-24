/**
 * DaysSelectionSection - Adjust weekly schedule selection
 * Now uses the reusable ListingScheduleSelector component with full price calculation
 */

import { useState, useEffect, useMemo } from 'react';
import ListingScheduleSelector from '../ListingScheduleSelector.jsx';
import { calculateCheckInOutDays } from '../../../lib/availabilityValidation.js';

export default function DaysSelectionSection({ data, updateData, listing, zatConfig }) {
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
    if (dayNames.length > 0) {
      // Convert day names to numbers for the calculation
      const dayNumbers = newSelectedDayObjects.map(dayObj => dayObj.dayOfWeek);

      // Use the imported function that properly handles week wrap-around
      const { checkInName, checkOutName } = calculateCheckInOutDays(dayNumbers);

      updateData('checkInDay', checkInName);
      updateData('checkOutDay', checkOutName);
    }
  };

  // Handle price change from ListingScheduleSelector
  const handlePriceChange = (priceBreakdown) => {
    if (priceBreakdown && priceBreakdown.valid) {
      // Update the price per night in the proposal data
      updateData('pricePerNight', priceBreakdown.pricePerNight);

      // Also update the totals if needed
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
        <span className="helper-icon" title="Select the days you plan to use the space each week">
          ❓
        </span>
      </h3>

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

      <div className="pricing-display" style={{ marginTop: '16px' }}>
        <p><strong>Price per Night:</strong> ${data.pricePerNight?.toFixed(2) || '0.00'}</p>
      </div>
    </div>
  );
}
