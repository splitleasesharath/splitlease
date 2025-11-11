/**
 * Day Indexing Utilities
 * Handles conversion between 0-based (JavaScript) and 1-based (Bubble API) day numbering
 *
 * IMPORTANT: Use 0-based indexing internally throughout the application
 * Only convert to 1-based when communicating with Bubble API
 *
 * 0-based (JavaScript Date.getDay()):
 *   0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
 *
 * 1-based (Bubble API):
 *   1=Sunday, 2=Monday, 3=Tuesday, 4=Wednesday, 5=Thursday, 6=Friday, 7=Saturday
 *
 * Usage:
 *   import { toBubbleDays, fromBubbleDays } from './dayUtils.js';
 *
 *   // Before sending to Bubble API:
 *   const zeroBasedDays = [1, 2, 3, 4, 5]; // Monday-Friday (0-based)
 *   const bubbleDays = toBubbleDays(zeroBasedDays); // [2, 3, 4, 5, 6]
 *
 *   // When receiving from Bubble API:
 *   const bubbleDays = [2, 3, 4, 5, 6]; // Monday-Friday (1-based from API)
 *   const zeroBasedDays = fromBubbleDays(bubbleDays); // [1, 2, 3, 4, 5]
 */

/**
 * Convert 0-based day indices to 1-based Bubble API format
 * @param {number[]} zeroBasedDays - Array of 0-based day indices (0-6)
 * @returns {number[]} Array of 1-based Bubble API day numbers (1-7)
 */
export function toBubbleDays(zeroBasedDays) {
  if (!Array.isArray(zeroBasedDays)) {
    console.error('toBubbleDays: expected array, got:', zeroBasedDays);
    return [];
  }

  return zeroBasedDays.map(day => {
    if (typeof day !== 'number' || day < 0 || day > 6) {
      console.warn(`toBubbleDays: invalid day index ${day}, skipping`);
      return null;
    }
    return day + 1;
  }).filter(day => day !== null);
}

/**
 * Convert 1-based Bubble API day numbers to 0-based indices
 * @param {number[]} bubbleDays - Array of 1-based Bubble API day numbers (1-7)
 * @returns {number[]} Array of 0-based day indices (0-6)
 */
export function fromBubbleDays(bubbleDays) {
  if (!Array.isArray(bubbleDays)) {
    console.error('fromBubbleDays: expected array, got:', bubbleDays);
    return [];
  }

  return bubbleDays.map(day => {
    if (typeof day !== 'number' || day < 1 || day > 7) {
      console.warn(`fromBubbleDays: invalid Bubble day number ${day}, skipping`);
      return null;
    }
    return day - 1;
  }).filter(day => day !== null);
}

/**
 * Convert single 0-based day to 1-based Bubble format
 * @param {number} day - 0-based day index (0-6)
 * @returns {number} 1-based Bubble API day number (1-7)
 */
export function dayToBubble(day) {
  if (typeof day !== 'number' || day < 0 || day > 6) {
    console.error(`dayToBubble: invalid day ${day}`);
    return null;
  }
  return day + 1;
}

/**
 * Convert single 1-based Bubble day to 0-based
 * @param {number} bubbleDay - 1-based Bubble API day number (1-7)
 * @returns {number} 0-based day index (0-6)
 */
export function dayFromBubble(bubbleDay) {
  if (typeof bubbleDay !== 'number' || bubbleDay < 1 || bubbleDay > 7) {
    console.error(`dayFromBubble: invalid Bubble day ${bubbleDay}`);
    return null;
  }
  return bubbleDay - 1;
}

/**
 * Validate that days array contains only valid 0-based indices
 * @param {number[]} days - Array of day indices to validate
 * @returns {boolean} True if all days are valid 0-based indices (0-6)
 */
export function isValidDaysArray(days) {
  if (!Array.isArray(days)) return false;
  return days.every(day => typeof day === 'number' && day >= 0 && day <= 6);
}

/**
 * Validate that days array contains only valid Bubble day numbers
 * @param {number[]} days - Array of Bubble day numbers to validate
 * @returns {boolean} True if all days are valid 1-based Bubble numbers (1-7)
 */
export function isValidBubbleDaysArray(days) {
  if (!Array.isArray(days)) return false;
  return days.every(day => typeof day === 'number' && day >= 1 && day <= 7);
}
