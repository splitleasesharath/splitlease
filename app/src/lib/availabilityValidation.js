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
 *
 * @param {number[]} selectedDays - Array of day indices (0=Sunday, 1=Monday, ... 6=Saturday)
 * @returns {boolean} True if days are contiguous
 *
 * @example
 * isContiguousSelection([1, 2, 3, 4, 5]) // true (Mon-Fri)
 * isContiguousSelection([1, 3, 5]) // false (Mon, Wed, Fri - not contiguous)
 * isContiguousSelection([5, 6, 0]) // true (Fri-Sun, wraps around week)
 */
export function isContiguousSelection(selectedDays) {
  if (!selectedDays || selectedDays.length === 0) return false;
  if (selectedDays.length === 1) return true;

  // Sort the selected days
  const sorted = [...selectedDays].sort((a, b) => a - b);

  // Check for standard contiguous sequence (no wrap around)
  let isStandardContiguous = true;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) {
      isStandardContiguous = false;
      break;
    }
  }

  if (isStandardContiguous) return true;

  // Check for wrap-around contiguous sequence (e.g., Fri-Sat-Sun)
  // Pattern: [0, 1, ..., n, ..., 5, 6] where there's a gap in the middle
  const hasZero = sorted.includes(0);
  const hasSix = sorted.includes(6);

  if (hasZero && hasSix) {
    // Find the gap
    let gapStart = -1;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] !== sorted[i - 1] + 1) {
        gapStart = i;
        break;
      }
    }

    if (gapStart === -1) return false;

    // Check if the sequence wraps properly
    // Left side should end at a day close to 6, right side should start at 0
    const leftSide = sorted.slice(0, gapStart);
    const rightSide = sorted.slice(gapStart);

    // Right side should start from 0 and be contiguous
    if (rightSide[0] !== 0) return false;
    for (let i = 1; i < rightSide.length; i++) {
      if (rightSide[i] !== rightSide[i - 1] + 1) return false;
    }

    // Left side should end at 6 and be contiguous
    if (leftSide[leftSide.length - 1] !== 6) return false;
    for (let i = 1; i < leftSide.length; i++) {
      if (leftSide[i] !== leftSide[i - 1] + 1) return false;
    }

    return true;
  }

  return false;
}

/**
 * Calculate check-in and check-out days from selected days
 * Check-in is the first day, check-out is the day after the last day
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

  // Handle wrap-around case
  const hasZero = sorted.includes(0);
  const hasSix = sorted.includes(6);

  if (hasZero && hasSix) {
    // Find gap to determine actual start/end
    let gapIndex = -1;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] !== sorted[i - 1] + 1) {
        gapIndex = i;
        break;
      }
    }

    if (gapIndex !== -1) {
      // Wrapped selection: check-in is after the gap, check-out is before
      const checkInDay = sorted[gapIndex]; // First day after gap (should be 0)
      const checkOutDay = (sorted[gapIndex - 1] + 1) % 7; // Day after last day before gap

      return {
        checkInDay,
        checkOutDay,
        checkInName: DAY_NAMES[checkInDay],
        checkOutName: DAY_NAMES[checkOutDay]
      };
    }
  }

  // Standard case: first to last + 1
  const checkInDay = sorted[0];
  const checkOutDay = (sorted[sorted.length - 1] + 1) % 7;

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
  const result = {
    valid: true,
    errors: [],
    warnings: [],
    showTutorial: false,
    nightsCount: selectedDays.length,
    isContiguous: false
  };

  // Check if days are selected
  if (!selectedDays || selectedDays.length === 0) {
    result.valid = false;
    result.errors.push('Please select at least one day');
    return result;
  }

  // Check contiguous requirement (CRITICAL)
  result.isContiguous = isContiguousSelection(selectedDays);
  if (!result.isContiguous) {
    result.valid = false;
    result.showTutorial = true;
    result.errors.push('Please check for contiguous nights to continue with your proposal');
    return result;
  }

  // Check against minimum nights
  if (listing['Minimum Nights'] && selectedDays.length < listing['Minimum Nights']) {
    result.warnings.push(`Host prefers at least ${listing['Minimum Nights']} nights per week`);
  }

  // Check against maximum nights
  if (listing['Maximum Nights'] && selectedDays.length > listing['Maximum Nights']) {
    result.warnings.push(`Host prefers at most ${listing['Maximum Nights']} nights per week`);
  }

  // Check against Days Not Available
  if (listing['Days Not Available'] && Array.isArray(listing['Days Not Available'])) {
    const unavailableDays = listing['Days Not Available'];
    const unavailableSelected = selectedDays.filter(day => {
      const dayName = DAY_NAMES[day];
      return unavailableDays.includes(dayName);
    });

    if (unavailableSelected.length > 0) {
      result.valid = false;
      result.errors.push('Some selected days are not available for this listing');
    }
  }

  return result;
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
