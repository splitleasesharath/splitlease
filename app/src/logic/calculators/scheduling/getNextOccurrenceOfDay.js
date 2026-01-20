import { daysUntilDayOfWeek } from '../../../lib/dayUtils.js'

/**
 * Calculate the next occurrence of a specific day-of-week on or after a starting date.
 * 
 * @.claude\plans\Deprecated\Context\Option Sets\ZEP - Curation Parameters(OS).md {Date} startDate - The date to start searching from.
 * @.claude\plans\Deprecated\Context\Option Sets\ZEP - Curation Parameters(OS).md {number} targetDayOfWeek - Day index (0-6, where 0=Sunday).
 * @returns {Date} The next occurrence of the target day.
 */
export function getNextOccurrenceOfDay(startDate, targetDayOfWeek) {
  const startDay = startDate.getDay();
  const daysToAdd = daysUntilDayOfWeek(startDay, targetDayOfWeek);
  
  const resultDate = new Date(startDate);
  resultDate.setDate(startDate.getDate() + daysToAdd);
  resultDate.setHours(0, 0, 0, 0);
  
  return resultDate;
}