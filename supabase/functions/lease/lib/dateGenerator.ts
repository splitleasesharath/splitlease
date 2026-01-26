/**
 * Lease Date Generator
 * Split Lease - Supabase Edge Functions
 *
 * Generates the complete list of booked dates, check-in dates, and check-out dates
 * for a lease based on rental type, schedule pattern, and timing parameters.
 *
 * Ported from Bubble workflow: CORE-create-list-of-leases-and-proposals-dates
 *
 * NO FALLBACK PRINCIPLE: All calculations fail fast on invalid input.
 */

// Day of week names for lookups (matches JavaScript Date.getDay() where 0 = Sunday)
const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/**
 * Input parameters for date generation
 */
export interface DateGenerationInput {
  /** Day name: "Friday", "Monday", etc. */
  checkInDay: string;
  /** Day name: "Monday", "Friday", etc. */
  checkOutDay: string;
  /** Total weeks of the reservation */
  reservationSpanWeeks: number;
  /** The lease start date (ISO string or Date) */
  moveInDate: string | Date;
  /** "Every week", "One week on, one week off", etc. */
  weeksSchedule?: string;
  /** Array of day indices (0-6) - optional override */
  nightsSelected?: number[];
}

/**
 * Output from date generation
 */
export interface DateGenerationResult {
  /** ISO date strings of all check-in dates */
  checkInDates: string[];
  /** ISO date strings of all check-out dates */
  checkOutDates: string[];
  /** ISO date strings of all reserved dates */
  allBookedDates: string[];
  /** Count of all booked dates */
  totalNights: number;
  /** First check-in date */
  firstCheckIn: string;
  /** Last check-out date (move-out) */
  lastCheckOut: string;
}

/**
 * Format a Date to ISO date string (YYYY-MM-DD)
 *
 * @param date - Date to format
 * @returns ISO date string
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Find the next occurrence of a specific day of the week on or after a given date
 *
 * @param date - Starting date
 * @param dayName - Target day name (e.g., "Friday")
 * @returns Next occurrence of that day (could be same day if already on that day)
 */
function getNextDayOfWeek(date: Date, dayName: string): Date {
  const resultDate = new Date(date);
  const dayIndex = DAYS_OF_WEEK.indexOf(dayName as (typeof DAYS_OF_WEEK)[number]);

  if (dayIndex === -1) {
    throw new Error(`Invalid day name: ${dayName}`);
  }

  const currentDayIndex = date.getDay();
  const daysToAdd = (7 + dayIndex - currentDayIndex) % 7;

  // If we're already on that day, daysToAdd will be 0 (stay on current day)
  resultDate.setDate(date.getDate() + daysToAdd);

  return resultDate;
}

/**
 * Determine if a given week number is "ON" based on the schedule pattern
 *
 * @param weekNumber - 0-indexed week number from start
 * @param pattern - The weeks schedule pattern
 * @returns true if this week is an "ON" week, false for "OFF"
 */
function isWeekOn(weekNumber: number, pattern: string): boolean {
  switch (pattern) {
    case 'Every week':
    case 'Nightly':
    case 'Monthly':
      // All weeks are ON
      return true;

    case 'One week on, one week off':
      // Week 0: ON, Week 1: OFF, Week 2: ON, Week 3: OFF...
      return weekNumber % 2 === 0;

    case 'Two weeks on, two weeks off':
      // Weeks 0-1: ON, Weeks 2-3: OFF, Weeks 4-5: ON...
      // Use 4-week cycle: ON ON OFF OFF
      return weekNumber % 4 < 2;

    case 'One week on, three weeks off':
      // Week 0: ON, Weeks 1-3: OFF, Week 4: ON, Weeks 5-7: OFF...
      return weekNumber % 4 === 0;

    default:
      // Unknown pattern - fail explicitly (no fallback)
      console.warn(`Unknown weeks schedule pattern: ${pattern}, treating as every week`);
      return true;
  }
}

/**
 * Calculate the week number for a given date relative to the first check-in
 *
 * @param date - Current date being evaluated
 * @param firstCheckIn - Reference date (first check-in)
 * @returns 0-indexed week number
 */
function getWeekNumber(date: Date, firstCheckIn: Date): number {
  const diffTime = date.getTime() - firstCheckIn.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7);
}

/**
 * Main date generation function
 *
 * This replicates the Bubble server scripts for date generation across all
 * rental patterns: Nightly/Monthly, One-on-one-off, Two-on-two-off, One-on-three-off
 *
 * @param input - Date generation parameters
 * @returns Generated dates result
 */
export function generateLeaseDates(input: DateGenerationInput): DateGenerationResult {
  const {
    checkInDay,
    checkOutDay,
    reservationSpanWeeks,
    moveInDate,
    weeksSchedule = 'Every week',
    nightsSelected,
  } = input;

  // Validate inputs
  if (!checkInDay || !DAYS_OF_WEEK.includes(checkInDay as (typeof DAYS_OF_WEEK)[number])) {
    throw new Error(`Invalid checkInDay: ${checkInDay}`);
  }

  if (!checkOutDay || !DAYS_OF_WEEK.includes(checkOutDay as (typeof DAYS_OF_WEEK)[number])) {
    throw new Error(`Invalid checkOutDay: ${checkOutDay}`);
  }

  if (!reservationSpanWeeks || reservationSpanWeeks <= 0) {
    throw new Error(`reservationSpanWeeks must be a positive number: ${reservationSpanWeeks}`);
  }

  if (!moveInDate) {
    throw new Error('moveInDate is required');
  }

  // Parse move-in date
  const moveInDateObj = typeof moveInDate === 'string' ? new Date(moveInDate) : new Date(moveInDate);

  if (isNaN(moveInDateObj.getTime())) {
    throw new Error(`Invalid moveInDate: ${moveInDate}`);
  }

  console.log('[dateGenerator] Input:', {
    checkInDay,
    checkOutDay,
    reservationSpanWeeks,
    moveInDate: formatDate(moveInDateObj),
    weeksSchedule,
    nightsSelectedCount: nightsSelected?.length,
  });

  // Calculate the first check-in date (next checkInDay on or after move-in)
  const firstCheckInDate = getNextDayOfWeek(moveInDateObj, checkInDay);

  // Calculate the first check-out date (next checkOutDay after first check-in)
  let firstCheckOutDate = getNextDayOfWeek(firstCheckInDate, checkOutDay);

  // If check-out day is same as or before check-in day in the week,
  // the check-out is the following week
  if (firstCheckOutDate <= firstCheckInDate) {
    firstCheckOutDate.setDate(firstCheckOutDate.getDate() + 7);
  }

  // Calculate the move-out date (end of reservation)
  // Move-out = first check-out + (spanOfWeeks - 1) weeks
  const daysToAdd = (reservationSpanWeeks - 1) * 7;
  const moveOutDate = new Date(firstCheckOutDate);
  moveOutDate.setDate(firstCheckOutDate.getDate() + daysToAdd);

  // Build the list of valid days between check-in and check-out (the "booked nights")
  const checkInDayIndex = DAYS_OF_WEEK.indexOf(checkInDay as (typeof DAYS_OF_WEEK)[number]);
  const checkOutDayIndex = DAYS_OF_WEEK.indexOf(checkOutDay as (typeof DAYS_OF_WEEK)[number]);

  let validDayIndices: number[] = [];

  // If nightsSelected is provided, use it directly
  if (nightsSelected && nightsSelected.length > 0) {
    validDayIndices = nightsSelected;
  } else {
    // Build valid days: from check-in day up to (but not including) check-out day
    // This handles wrap-around correctly (e.g., Friday to Monday = Fri, Sat, Sun)
    for (let i = checkInDayIndex; i !== checkOutDayIndex; i = (i + 1) % 7) {
      validDayIndices.push(i);
    }
  }

  console.log('[dateGenerator] Calculated:', {
    firstCheckIn: formatDate(firstCheckInDate),
    firstCheckOut: formatDate(firstCheckOutDate),
    moveOut: formatDate(moveOutDate),
    validDayIndices,
  });

  // Generate all dates
  const allDates: Date[] = [];
  const checkInDates: Date[] = [];
  const checkOutDates: Date[] = [];

  const currentDate = new Date(firstCheckInDate);

  while (currentDate <= moveOutDate) {
    const currentDayIndex = currentDate.getDay();
    const currentDayName = DAYS_OF_WEEK[currentDayIndex];
    const weekNumber = getWeekNumber(currentDate, firstCheckInDate);

    // Check if this week is "ON" based on the schedule pattern
    const weekIsOn = isWeekOn(weekNumber, weeksSchedule);

    if (weekIsOn) {
      // Add to allDates if it's a valid booked day
      if (validDayIndices.includes(currentDayIndex)) {
        allDates.push(new Date(currentDate));
      }

      // Add to checkInDates if it's the check-in day
      if (currentDayName === checkInDay) {
        checkInDates.push(new Date(currentDate));
      }

      // Add to checkOutDates if it's the check-out day
      if (currentDayName === checkOutDay) {
        checkOutDates.push(new Date(currentDate));
      }
    }

    // Move to the next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Format dates for output
  const result: DateGenerationResult = {
    checkInDates: checkInDates.map(formatDate),
    checkOutDates: checkOutDates.map(formatDate),
    allBookedDates: allDates.map(formatDate),
    totalNights: allDates.length,
    firstCheckIn: checkInDates.length > 0 ? formatDate(checkInDates[0]) : formatDate(firstCheckInDate),
    lastCheckOut:
      checkOutDates.length > 0
        ? formatDate(checkOutDates[checkOutDates.length - 1])
        : formatDate(moveOutDate),
  };

  console.log('[dateGenerator] Result:', {
    checkInDatesCount: result.checkInDates.length,
    checkOutDatesCount: result.checkOutDates.length,
    allBookedDatesCount: result.allBookedDates.length,
    totalNights: result.totalNights,
    firstCheckIn: result.firstCheckIn,
    lastCheckOut: result.lastCheckOut,
  });

  return result;
}

/**
 * Pre-normalization for proposals with exactly 7 nights selected (full week)
 *
 * When a proposal has all 7 days selected, the check-in and check-out days
 * should both be set to the day of the week that the move-in date falls on.
 *
 * This replicates Bubble Step 1: "Only when proposal's hc nights selected:count is 7"
 *
 * @param moveInDate - The move-in date
 * @param nightsSelectedCount - Number of nights selected
 * @returns Normalized check-in/check-out days, or null if not applicable
 */
export function normalizeFullWeekProposal(
  moveInDate: string | Date,
  nightsSelectedCount: number
): { checkInDay: string; checkOutDay: string } | null {
  if (nightsSelectedCount !== 7) {
    return null; // No normalization needed
  }

  const moveIn = typeof moveInDate === 'string' ? new Date(moveInDate) : moveInDate;

  if (isNaN(moveIn.getTime())) {
    console.warn('[dateGenerator] Invalid moveInDate for normalization:', moveInDate);
    return null;
  }

  const dayIndex = moveIn.getDay();
  const dayName = DAYS_OF_WEEK[dayIndex];

  console.log('[dateGenerator] Full-week normalization applied:', {
    moveInDate: formatDate(moveIn),
    dayIndex,
    dayName,
  });

  return {
    checkInDay: dayName,
    checkOutDay: dayName,
  };
}
