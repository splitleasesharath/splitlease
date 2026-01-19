/**
 * Calculate the next send time for a reminder.
 *
 * @intent Convert scheduled datetime to proper timezone-aware send time.
 * @rule All times are stored in UTC in the database.
 * @rule Display times are converted to user's local timezone.
 *
 * @param {object} params - Named parameters.
 * @param {string|Date} params.scheduledDateTime - The scheduled date/time (ISO string or Date).
 * @param {string} [params.timezone='America/New_York'] - Target timezone for display.
 * @returns {Date} The scheduled time as a Date object.
 *
 * @throws {Error} If scheduledDateTime is invalid.
 *
 * @example
 * calculateNextSendTime({ scheduledDateTime: '2026-01-20T14:00:00Z' })
 * // => Date object representing the scheduled time
 */
export function calculateNextSendTime({ scheduledDateTime, timezone = 'America/New_York' }) {
  if (!scheduledDateTime) {
    throw new Error('calculateNextSendTime: scheduledDateTime is required');
  }

  const date = scheduledDateTime instanceof Date
    ? scheduledDateTime
    : new Date(scheduledDateTime);

  if (isNaN(date.getTime())) {
    throw new Error('calculateNextSendTime: invalid scheduledDateTime format');
  }

  return date;
}

/**
 * Calculate time until a reminder is sent.
 *
 * @param {object} params - Named parameters.
 * @param {string|Date} params.scheduledDateTime - The scheduled date/time.
 * @param {Date} [params.now=new Date()] - Current time for comparison.
 * @returns {object} Time breakdown { days, hours, minutes, totalMinutes, isPast }.
 *
 * @example
 * calculateTimeUntilSend({ scheduledDateTime: '2026-01-20T14:00:00Z' })
 * // => { days: 2, hours: 5, minutes: 30, totalMinutes: 3090, isPast: false }
 */
export function calculateTimeUntilSend({ scheduledDateTime, now = new Date() }) {
  const scheduledDate = calculateNextSendTime({ scheduledDateTime });
  const diffMs = scheduledDate.getTime() - now.getTime();

  const isPast = diffMs <= 0;
  const absDiffMs = Math.abs(diffMs);

  const totalMinutes = Math.floor(absDiffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  return {
    days,
    hours,
    minutes,
    totalMinutes,
    isPast,
  };
}
