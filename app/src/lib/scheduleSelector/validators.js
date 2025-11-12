import { sortDays } from './dayHelpers.js';

/**
 * Validate if a day can be selected
 */
export const validateDaySelection = (day, selectedDays, listing) => {
  // Check if already selected
  if (selectedDays.some(d => d.dayOfWeek === day.dayOfWeek)) {
    return { isValid: false, error: 'Day already selected' };
  }

  // Check maximum (7 days max)
  if (selectedDays.length >= 7) {
    return { isValid: false, error: 'Maximum 7 days can be selected' };
  }

  // Check if day is in listing's available days
  if (!listing.daysAvailable.includes(day.dayOfWeek)) {
    return { isValid: false, error: 'Day not available for this listing' };
  }

  // Check if day is marked as available
  if (!day.isAvailable) {
    return { isValid: false, error: 'This day is not available' };
  }

  // Check contiguity after adding
  const testSelection = sortDays([...selectedDays, day]);
  if (testSelection.length > 1 && !isContiguous(testSelection)) {
    return { isValid: false, error: 'Days must be consecutive' };
  }

  // Check maximum nights constraint
  if (listing.maximumNights && selectedDays.length >= listing.maximumNights) {
    return {
      isValid: false,
      error: `Maximum ${listing.maximumNights} nights allowed`
    };
  }

  return { isValid: true };
};

/**
 * Validate if a day can be removed
 */
export const validateDayRemoval = (day, selectedDays, minimumNights) => {
  const remainingDays = selectedDays.filter(d => d.dayOfWeek !== day.dayOfWeek);

  // Check minimum nights (nights = days - 1)
  const remainingNights = remainingDays.length - 1;
  if (remainingNights < minimumNights) {
    return {
      isValid: false,
      error: `Minimum ${minimumNights} nights required`
    };
  }

  // Check contiguity after removal
  if (remainingDays.length > 1 && !isContiguous(remainingDays)) {
    return {
      isValid: false,
      error: 'Removal would create non-consecutive selection'
    };
  }

  return { isValid: true };
};

/**
 * Check if days are contiguous (consecutive)
 */
export const isContiguous = (days) => {
  if (days.length <= 1) return true;

  const sorted = sortDays(days);
  const dayNumbers = sorted.map(d => d.dayOfWeek);

  // Check for normal contiguity (no week wrap)
  let normallyContiguous = true;
  for (let i = 0; i < dayNumbers.length - 1; i++) {
    if (dayNumbers[i + 1] - dayNumbers[i] !== 1) {
      normallyContiguous = false;
      break;
    }
  }

  if (normallyContiguous) return true;

  // Check for week wrap (Saturday to Sunday)
  if (dayNumbers.includes(0) && dayNumbers.includes(6)) {
    // Check if days form a contiguous sequence wrapping around the week
    const sundayIndex = dayNumbers.indexOf(0);

    // Days before Sunday should be at the end
    if (sundayIndex === 0) {
      // Sunday is first - check if remaining days are consecutive and end at Saturday
      const afterSunday = dayNumbers.slice(1);
      let consecutive = true;

      for (let i = 0; i < afterSunday.length - 1; i++) {
        if (afterSunday[i + 1] - afterSunday[i] !== 1) {
          consecutive = false;
          break;
        }
      }

      // Check if last day is Saturday (6)
      return consecutive && afterSunday[afterSunday.length - 1] === 6;
    }
  }

  return false;
};

/**
 * Validate schedule meets all requirements
 */
export const validateSchedule = (selectedDays, listing) => {
  const nightsCount = Math.max(0, selectedDays.length - 1);

  // Check minimum nights
  if (nightsCount < listing.minimumNights) {
    return {
      isValid: false,
      error: `Minimum ${listing.minimumNights} nights required`
    };
  }

  // Check maximum nights
  if (listing.maximumNights && nightsCount > listing.maximumNights) {
    return {
      isValid: false,
      error: `Maximum ${listing.maximumNights} nights allowed`
    };
  }

  // Check contiguity
  if (!isContiguous(selectedDays)) {
    return {
      isValid: false,
      error: 'Days must be consecutive'
    };
  }

  return { isValid: true };
};
