/**
 * Date formatting and manipulation utilities
 */

import { format, parseISO, isValid, differenceInDays, addDays, isBefore, isAfter } from 'date-fns';
import { DATE_FORMATS } from './constants';

/**
 * Format a date for display
 * @param date - Date to format (Date object or ISO string)
 * @param formatString - Format string (defaults to display format)
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string,
  formatString: string = DATE_FORMATS.DISPLAY
): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) {
      return 'Invalid date';
    }
    return format(dateObj, formatString);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

/**
 * Format a date with time for display
 * @param date - Date to format (Date object or ISO string)
 * @returns Formatted date string with time
 */
export function formatDateTime(date: Date | string): string {
  return formatDate(date, DATE_FORMATS.DISPLAY_WITH_TIME);
}

/**
 * Format a date range for display
 * @param start - Start date
 * @param end - End date
 * @returns Formatted date range string
 */
export function formatDateRange(start: Date | string, end: Date | string): string {
  const startFormatted = formatDate(start);
  const endFormatted = formatDate(end);
  return `${startFormatted} - ${endFormatted}`;
}

/**
 * Calculate number of nights between two dates
 * @param checkIn - Check-in date
 * @param checkOut - Check-out date
 * @returns Number of nights
 */
export function calculateNights(checkIn: Date | string, checkOut: Date | string): number {
  try {
    const checkInDate = typeof checkIn === 'string' ? parseISO(checkIn) : checkIn;
    const checkOutDate = typeof checkOut === 'string' ? parseISO(checkOut) : checkOut;
    return Math.max(0, differenceInDays(checkOutDate, checkInDate));
  } catch (error) {
    console.error('Error calculating nights:', error);
    return 0;
  }
}

/**
 * Check if a date is in the past
 * @param date - Date to check
 * @returns True if date is in the past
 */
export function isPastDate(date: Date | string): boolean {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return isBefore(dateObj, new Date());
  } catch (error) {
    return false;
  }
}

/**
 * Check if a date is in the future
 * @param date - Date to check
 * @returns True if date is in the future
 */
export function isFutureDate(date: Date | string): boolean {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return isAfter(dateObj, new Date());
  } catch (error) {
    return false;
  }
}

/**
 * Add days to a date
 * @param date - Starting date
 * @param days - Number of days to add
 * @returns New date
 */
export function addDaysToDate(date: Date | string, days: number): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return addDays(dateObj, days);
}

/**
 * Get day of week name from date
 * @param date - Date to get day name from
 * @returns Day of week name (e.g., 'Monday')
 */
export function getDayOfWeek(date: Date | string): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'EEEE');
  } catch (error) {
    return '';
  }
}

/**
 * Get day of week index (0 = Sunday, 6 = Saturday)
 * @param date - Date to get day index from
 * @returns Day of week index
 */
export function getDayOfWeekIndex(date: Date | string): number {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return dateObj.getDay();
  } catch (error) {
    return -1;
  }
}

/**
 * Convert date to ISO string for API
 * @param date - Date to convert
 * @returns ISO string
 */
export function toISOString(date: Date | string): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return dateObj.toISOString();
  } catch (error) {
    console.error('Error converting to ISO string:', error);
    return '';
  }
}

/**
 * Validate date string
 * @param dateString - Date string to validate
 * @returns True if valid date string
 */
export function isValidDate(dateString: string): boolean {
  try {
    const date = parseISO(dateString);
    return isValid(date);
  } catch (error) {
    return false;
  }
}

/**
 * Get relative time string (e.g., "2 days ago", "in 3 hours")
 * @param date - Date to get relative time for
 * @returns Relative time string
 */
export function getRelativeTime(date: Date | string): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const now = new Date();
    const diffInDays = differenceInDays(now, dateObj);

    if (diffInDays === 0) {
      return 'Today';
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays === -1) {
      return 'Tomorrow';
    } else if (diffInDays > 1 && diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else if (diffInDays < -1 && diffInDays > -7) {
      return `In ${Math.abs(diffInDays)} days`;
    } else {
      return formatDate(dateObj);
    }
  } catch (error) {
    return '';
  }
}
