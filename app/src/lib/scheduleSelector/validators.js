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
      error: `Maximum ${listing.maximumNights} days allowed by host`
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
      error: `Minimum ${minimumNights + 1} days required`
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
 * Based on Bubble implementation that handles week wrap-around cases
 */
export const isContiguous = (days) => {
  if (days.length <= 1) return true;

  const sorted = sortDays(days);
  const dayNumbers = sorted.map(d => d.dayOfWeek);

  // If 6 or more days selected, it's contiguous
  if (dayNumbers.length >= 6) return true;

  // Check if selection includes both Sunday (0) and Saturday (6) - wrap-around case
  const hasSunday = dayNumbers.includes(0);
  const hasSaturday = dayNumbers.includes(6);

  if (hasSunday && hasSaturday) {
    // Week wrap-around case: use inverse logic (check not-selected days)
    // If the NOT selected days are contiguous, then selected days wrap around and are contiguous
    const allDays = [0, 1, 2, 3, 4, 5, 6];
    const notSelectedDays = allDays.filter(d => !dayNumbers.includes(d));

    if (notSelectedDays.length === 0) return true; // All days selected

    // Check if not-selected days form a contiguous block
    const minNotSelected = Math.min(...notSelectedDays);
    const maxNotSelected = Math.max(...notSelectedDays);

    // Generate expected contiguous range for not-selected days
    const expectedNotSelected = [];
    for (let i = minNotSelected; i <= maxNotSelected; i++) {
      expectedNotSelected.push(i);
    }

    // If not-selected days are contiguous, then selected days wrap around properly
    const notSelectedContiguous = notSelectedDays.length === expectedNotSelected.length &&
      notSelectedDays.every((day, index) => day === expectedNotSelected[index]);

    return notSelectedContiguous;
  }

  // Normal case: no wrap-around, check standard contiguity
  let normallyContiguous = true;
  for (let i = 0; i < dayNumbers.length - 1; i++) {
    if (dayNumbers[i + 1] - dayNumbers[i] !== 1) {
      normallyContiguous = false;
      break;
    }
  }

  return normallyContiguous;
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
      error: `Minimum ${listing.minimumNights + 1} days required`
    };
  }

  // Check maximum nights
  if (listing.maximumNights && nightsCount > listing.maximumNights) {
    return {
      isValid: false,
      error: `Maximum ${listing.maximumNights + 1} days allowed`
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
