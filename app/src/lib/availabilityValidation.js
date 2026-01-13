/**
 * Availability Validation Utilities
 * CRITICAL: Validates contiguous night selection for weekly schedule
 * Handles blackout dates, availability checking, and schedule validation
 *
 * Usage:
 *   import { isContiguousSelection, validateScheduleSelection } from './availabilityValidation.js';
 */

import { DAY_NAMES } from './constants.js';

/**
 * Check if selected days form a contiguous block
 * CRITICAL FUNCTION: Must be consecutive days (Mon-Fri ✓, Mon+Wed ✗)
 * Based on Bubble implementation that handles week wrap-around cases
 *
 * @param {number[]} selectedDays - Array of day indices (0=Sunday, 1=Monday, ... 6=Saturday)
 * @returns {boolean} True if days are contiguous
 *
 * @example
 * isContiguousSelection([1, 2, 3, 4, 5]) // true (Mon-Fri)
 * isContiguousSelection([1, 3, 5]) // false (Mon, Wed, Fri - not contiguous)
 * isContiguousSelection([5, 6, 0]) // true (Fri-Sun, wraps around week)
 * isContiguousSelection([6, 0, 1, 2]) // true (Sat-Tue, wraps around week)
 */
export function isContiguousSelection(selectedDays) {
  if (!selectedDays || selectedDays.length === 0) return false;
  if (selectedDays.length === 1) return true;

  // Sort the selected days
  const sorted = selectedDays.toSorted((a, b) => a - b);

  // If 6 or more days selected, it's contiguous
  if (sorted.length >= 6) return true;

  // Check for standard contiguous sequence (no wrap around)
  const isStandardContiguous = sorted.every((day, i) => i === 0 || day === sorted[i - 1] + 1);

  if (isStandardContiguous) return true;

  // Check if selection includes both Sunday (0) and Saturday (6) - wrap-around case
  const hasZero = sorted.includes(0);
  const hasSix = sorted.includes(6);

  if (hasZero && hasSix) {
    // Week wrap-around case: use inverse logic (check not-selected days)
    // If the NOT selected days are contiguous, then selected days wrap around and are contiguous
    const allDays = [0, 1, 2, 3, 4, 5, 6];
    const notSelectedDays = allDays.filter(d => !sorted.includes(d));

    if (notSelectedDays.length === 0) return true; // All days selected

    // Check if not-selected days form a contiguous block
    const minNotSelected = Math.min(...notSelectedDays);
    const maxNotSelected = Math.max(...notSelectedDays);

    // Generate expected contiguous range for not-selected days
    const expectedNotSelected = Array.from(
      { length: maxNotSelected - minNotSelected + 1 },
      (_, i) => minNotSelected + i
    );

    // If not-selected days are contiguous, then selected days wrap around properly
    const notSelectedContiguous = notSelectedDays.length === expectedNotSelected.length &&
      notSelectedDays.every((day, index) => day === expectedNotSelected[index]);

    return notSelectedContiguous;
  }

  return false;
}

/**
 * Calculate check-in and check-out days from selected days
 * Check-in is the first selected day, check-out is the day AFTER the last selected day
 * Based on SearchScheduleSelector logic for wrap-around handling
 *
 * @param {number[]} selectedDays - Array of day indices (0-based)
 * @returns {object} { checkInDay: number, checkOutDay: number, checkInName: string, checkOutName: string }
 */
export function calculateCheckInOutDays(selectedDays) {
  if (!selectedDays || selectedDays.length === 0) {
    return {
      checkInDay: null,
      checkOutDay: null,
      checkInName: null,
      checkOutName: null
    };
  }

  const sorted = [...selectedDays].sort((a, b) => a - b);

  // Handle wrap-around case (e.g., Fri, Sat, Sun, Mon)
  const hasZero = sorted.includes(0);
  const hasSix = sorted.includes(6);

  if (hasZero && hasSix) {
    // Find gap to determine actual start/end
    const gapIndex = sorted.findIndex((day, i) => i > 0 && day !== sorted[i - 1] + 1);

    if (gapIndex !== -1) {
      // Wrapped selection: check-in is after the gap (first day in wrap)
      const checkInDay = sorted[gapIndex]; // First day after gap (e.g., Sunday = 0 or Friday = 5)
      const lastSelectedDay = sorted[gapIndex - 1]; // Last day before gap (e.g., Saturday = 6 or Monday = 1)

      // Check-out is the day AFTER the last selected day
      const checkOutDay = (lastSelectedDay + 1) % 7;

      return {
        checkInDay,
        checkOutDay,
        checkInName: DAY_NAMES[checkInDay],
        checkOutName: DAY_NAMES[checkOutDay]
      };
    }
  }

  // Standard case: first selected day to day after last selected day
  const checkInDay = sorted[0];
  const lastSelectedDay = sorted[sorted.length - 1];

  // Check-out is the day AFTER the last selected day (wraps around the week if needed)
  const checkOutDay = (lastSelectedDay + 1) % 7;

  return {
    checkInDay,
    checkOutDay,
    checkInName: DAY_NAMES[checkInDay],
    checkOutName: DAY_NAMES[checkOutDay]
  };
}

/**
 * Validate schedule selection against listing requirements
 * Returns validation result with errors/warnings
 *
 * @param {number[]} selectedDays - Selected day indices
 * @param {object} listing - Listing object with availability data
 * @returns {object} Validation result
 */
export function validateScheduleSelection(selectedDays, listing) {
  // Check if days are selected
  if (!selectedDays || selectedDays.length === 0) {
    return {
      valid: false,
      errors: ['Please select at least one day'],
      warnings: [],
      showTutorial: false,
      nightsCount: 0,
      isContiguous: false
    };
  }

  const isContiguous = isContiguousSelection(selectedDays);
  
  if (!isContiguous) {
    return {
      valid: false,
      errors: ['Please check for contiguous nights to continue with your proposal'],
      warnings: [],
      showTutorial: true,
      nightsCount: selectedDays.length,
      isContiguous: false
    };
  }

  const warnings = [
    listing['Minimum Nights'] && selectedDays.length < listing['Minimum Nights']
      ? `Host prefers at least ${listing['Minimum Nights']} nights per week`
      : null,
    listing['Maximum Nights'] && selectedDays.length > listing['Maximum Nights']
      ? `Host prefers at most ${listing['Maximum Nights']} nights per week`
      : null
  ].filter(Boolean);

  const unavailableDays = listing['Days Not Available'];
  const hasUnavailableSelected = Array.isArray(unavailableDays) && selectedDays.some(day => 
    unavailableDays.includes(DAY_NAMES[day])
  );

  const errors = hasUnavailableSelected 
    ? ['Some selected days are not available for this listing'] 
    : [];

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    showTutorial: false,
    nightsCount: selectedDays.length,
    isContiguous: true
  };
}

/**
 * Check if a specific date is blocked
 *
 * @param {Date} date - Date to check
 * @param {Array} blockedDates - Array of blocked date strings
 * @returns {boolean} True if date is blocked
 */
export function isDateBlocked(date, blockedDates) {
  if (!date || !blockedDates || !Array.isArray(blockedDates)) return false;

  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format

  return blockedDates.some(blocked => {
    if (typeof blocked === 'string') {
      return blocked.split('T')[0] === dateStr;
    }
    return false;
  });
}

/**
 * Check if a date is within available range
 *
 * @param {Date} date - Date to check
 * @param {string} firstAvailable - First available date string
 * @param {string} lastAvailable - Last available date string
 * @returns {boolean} True if date is within range
 */
export function isDateInRange(date, firstAvailable, lastAvailable) {
  if (!date) return false;

  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  if (firstAvailable) {
    const firstDate = new Date(firstAvailable);
    firstDate.setHours(0, 0, 0, 0);
    if (checkDate < firstDate) return false;
  }

  if (lastAvailable) {
    const lastDate = new Date(lastAvailable);
    lastDate.setHours(0, 0, 0, 0);
    if (checkDate > lastDate) return false;
  }

  return true;
}

/**
 * Validate move-in date against listing availability
 *
 * @param {Date} moveInDate - Proposed move-in date
 * @param {object} listing - Listing object
 * @param {number[]} selectedDays - Selected days of week
 * @returns {object} Validation result
 */
export function validateMoveInDate(moveInDate, listing, selectedDays) {
  const result = {
    valid: true,
    errors: []
  };

  if (!moveInDate) {
    result.valid = false;
    result.errors.push('Please select a move-in date');
    return result;
  }

  // Check if date is in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (moveInDate < today) {
    result.valid = false;
    result.errors.push('Move-in date cannot be in the past');
    return result;
  }

  // Check if date is within available range
  if (!isDateInRange(moveInDate, listing['First Available'], listing['Last Available'])) {
    result.valid = false;
    result.errors.push('Move-in date is outside available range');
    return result;
  }

  // Check if date is blocked
  if (isDateBlocked(moveInDate, listing['Dates - Blocked'])) {
    result.valid = false;
    result.errors.push('Selected move-in date is not available');
    return result;
  }

  // Check if move-in date's day of week matches selected schedule
  if (selectedDays && selectedDays.length > 0) {
    const { checkInDay } = calculateCheckInOutDays(selectedDays);
    const moveInDayOfWeek = moveInDate.getDay();

    if (checkInDay !== null && moveInDayOfWeek !== checkInDay) {
      result.valid = false;
      result.errors.push(`Move-in date must be on a ${DAY_NAMES[checkInDay]} based on your selected schedule`);
    }
  }

  return result;
}

/**
 * Get list of blocked dates in readable format
 *
 * @param {Array} blockedDates - Array of blocked date strings
 * @param {number} limit - Maximum number to return (default: 5)
 * @returns {string[]} Array of formatted date strings
 */
export function getBlockedDatesList(blockedDates, limit = 5) {
  if (!blockedDates || !Array.isArray(blockedDates)) return [];

  return blockedDates
    .slice(0, limit)
    .map(dateStr => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    });
}

/**
 * Calculate number of nights from selected days
 * Nights = Days selected (continuous selection)
 *
 * @param {number[]} selectedDays - Selected day indices
 * @returns {number} Number of nights
 */
export function calculateNightsFromDays(selectedDays) {
  if (!selectedDays || selectedDays.length === 0) return 0;
  return selectedDays.length; // In split lease, nights = days selected
}
