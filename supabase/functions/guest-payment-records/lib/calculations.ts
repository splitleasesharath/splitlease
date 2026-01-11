/**
 * Payment Schedule Calculation Logic for Guest Payments
 * Split Lease - Guest Payment Records Edge Function
 *
 * Ported from Bubble's CORE-create-guest-payment-records-recursive-javascript
 *
 * KEY BUSINESS RULES (different from host payments):
 * - First guest payment is scheduled 3 days BEFORE move-in date
 * - Monthly rentals: 31-day intervals between payments
 * - Nightly/Weekly rentals: 28-day (4-week) intervals
 * - Damage deposit added to first payment, but excluded from totalReservationPrice
 * - Partial periods are prorated based on rental type and week pattern
 */

import { RentalType, WeekPattern, PaymentScheduleResult } from './types.ts';

/**
 * Format a date as mm-dd-yyyy string
 * Matches Bubble's date format expectation
 */
export function formatDate(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
}

/**
 * Parse a date string handling multiple formats
 * Supports: m/dd/yy, mm/dd/yyyy, yyyy-mm-dd, ISO strings
 */
export function parseDate(dateStr: string): Date {
  if (!dateStr) {
    throw new Error('moveInDate is required');
  }

  let normalizedDate = dateStr;

  // Handle m/dd/yy or mm/dd/yyyy format
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const month = parts[0].padStart(2, '0');
      const day = parts[1].padStart(2, '0');
      let year = parts[2];

      // Handle 2-digit year (assume 21st century)
      if (year.length === 2) {
        year = '20' + year;
      }

      normalizedDate = `${year}-${month}-${day}`;
    }
  }

  const parsed = new Date(normalizedDate);

  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }

  return parsed;
}

/**
 * Round a number to 2 decimal places
 * Prevents floating point precision issues
 */
function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calculate the number of payment cycles based on rental type and duration
 */
function calculateNumberOfPaymentCycles(
  rentalType: RentalType,
  reservationSpanWeeks: number | undefined,
  reservationSpanMonths: number | undefined
): number {
  if (rentalType === 'Monthly') {
    if (!reservationSpanMonths || reservationSpanMonths <= 0) {
      throw new Error('reservationSpanMonths is required for Monthly rental type');
    }
    return Number.isInteger(reservationSpanMonths)
      ? reservationSpanMonths
      : Math.ceil(reservationSpanMonths);
  }

  // Nightly or Weekly
  if (!reservationSpanWeeks || reservationSpanWeeks <= 0) {
    throw new Error('reservationSpanWeeks is required for Nightly and Weekly rental types');
  }
  return Math.ceil(reservationSpanWeeks / 4);
}

/**
 * Calculate remaining weeks for non-Monthly rentals
 */
function calculateRemainingWeeks(
  rentalType: RentalType,
  reservationSpanWeeks: number | undefined
): number {
  if (rentalType === 'Monthly') {
    return 0;
  }
  return (reservationSpanWeeks || 0) % 4;
}

/**
 * Generate the sequence of payment dates for guest payments
 *
 * KEY DIFFERENCE FROM HOST:
 * First payment: moveInDate - 3 days (3 days BEFORE move-in)
 * Subsequent payments:
 * - Monthly: +31 days
 * - Nightly/Weekly: +28 days
 */
function generatePaymentDates(
  moveInDate: Date,
  numberOfPaymentCycles: number,
  rentalType: RentalType
): string[] {
  const paymentDates: string[] = [];

  // First guest payment is 3 days BEFORE move-in
  const firstPaymentDate = new Date(moveInDate);
  firstPaymentDate.setDate(moveInDate.getDate() - 3);

  let currentDate = new Date(firstPaymentDate);

  for (let i = 0; i < numberOfPaymentCycles; i++) {
    paymentDates.push(formatDate(currentDate));

    // Increment for next payment
    const daysToAdd = rentalType === 'Monthly' ? 31 : 28;
    currentDate.setDate(currentDate.getDate() + daysToAdd);
  }

  return paymentDates;
}

/**
 * Calculate rent for the last payment cycle based on rental type and pattern
 */
function calculateLastCycleRent(
  rentalType: RentalType,
  baseRent: number,
  remainingWeeks: number,
  weekPattern: WeekPattern,
  reservationSpanMonths: number | undefined
): number {
  if (rentalType === 'Monthly') {
    if (reservationSpanMonths && !Number.isInteger(reservationSpanMonths)) {
      const fraction = reservationSpanMonths - Math.floor(reservationSpanMonths);
      return baseRent * fraction;
    }
    return baseRent;
  }

  if (remainingWeeks === 0) {
    return baseRent;
  }

  if (rentalType === 'Nightly') {
    return baseRent * (remainingWeeks / 4);
  }

  // Weekly: depends on week pattern
  switch (weekPattern) {
    case 'Every week':
      return baseRent * (remainingWeeks / 4);

    case 'One week on, one week off':
      return remainingWeeks <= 2 ? baseRent * 0.5 : baseRent;

    case 'Two weeks on, two weeks off':
      return remainingWeeks === 1 ? baseRent * 0.5 : baseRent;

    case 'One week on, three weeks off':
      return baseRent;

    default:
      return baseRent;
  }
}

/**
 * Calculate the rent list for all payment cycles
 */
function calculateRentList(
  numberOfPaymentCycles: number,
  baseRent: number,
  rentalType: RentalType,
  remainingWeeks: number,
  weekPattern: WeekPattern,
  reservationSpanMonths: number | undefined
): number[] {
  const rentList: number[] = [];

  for (let i = 0; i < numberOfPaymentCycles; i++) {
    let cycleRent = baseRent;

    if (i === numberOfPaymentCycles - 1) {
      cycleRent = calculateLastCycleRent(
        rentalType,
        baseRent,
        remainingWeeks,
        weekPattern,
        reservationSpanMonths
      );
    }

    cycleRent = isNaN(cycleRent) ? 0 : cycleRent;
    cycleRent = roundToTwoDecimals(cycleRent);

    rentList.push(cycleRent);
  }

  return rentList;
}

/**
 * Calculate total rent list for guest payments
 *
 * KEY DIFFERENCE FROM HOST:
 * - Damage deposit is added ONLY to the FIRST payment
 * - Maintenance fee is added to every payment
 */
function calculateTotalRentList(
  rentList: number[],
  maintenanceFee: number,
  damageDeposit: number
): number[] {
  return rentList.map((rent, index) => {
    let total = rent + maintenanceFee;

    // Add damage deposit only to first payment
    if (index === 0 && damageDeposit > 0) {
      total += damageDeposit;
    }

    return roundToTwoDecimals(total);
  });
}

/**
 * Main calculation function - generates complete guest payment schedule
 *
 * This is the TypeScript port of Bubble's server script:
 * CORE-create-guest-payment-records-recursive-javascript
 *
 * KEY DIFFERENCES FROM HOST PAYMENT CALCULATION:
 * 1. First payment date: 3 days BEFORE move-in (vs 2 days AFTER for host)
 * 2. Damage deposit added to first payment
 * 3. totalReservationPrice = sum of totals MINUS damage deposit
 *    (because damage deposit is refundable and not actual rent)
 */
export function calculateGuestPaymentSchedule(
  rentalType: RentalType,
  moveInDateStr: string,
  reservationSpanWeeks: number | undefined,
  reservationSpanMonths: number | undefined,
  weekPattern: WeekPattern,
  fourWeekRent: number | undefined,
  rentPerMonth: number | undefined,
  maintenanceFee: number,
  damageDeposit: number
): PaymentScheduleResult {
  // Validate rental type
  if (!['Nightly', 'Weekly', 'Monthly'].includes(rentalType)) {
    throw new Error("rentalType is required and must be one of: 'Nightly', 'Weekly', 'Monthly'");
  }

  // Validate week pattern
  const validPatterns: WeekPattern[] = [
    'Every week',
    'One week on, one week off',
    'Two weeks on, two weeks off',
    'One week on, three weeks off',
  ];
  if (!validPatterns.includes(weekPattern)) {
    throw new Error(
      "weekPattern is required and must be one of: 'Every week', 'One week on, one week off', 'Two weeks on, two weeks off', 'One week on, three weeks off'"
    );
  }

  // Validate rent amounts
  if ((rentalType === 'Nightly' || rentalType === 'Weekly') && (!fourWeekRent || fourWeekRent <= 0)) {
    throw new Error('fourWeekRent is required for Nightly and Weekly rental types and must be a positive number');
  }

  if (rentalType === 'Monthly' && (!rentPerMonth || rentPerMonth <= 0)) {
    throw new Error('rentPerMonth is required for Monthly rental type and must be a positive number');
  }

  // Validate maintenance fee
  if (isNaN(maintenanceFee)) {
    throw new Error('maintenanceFee must be a number');
  }

  // Parse move-in date
  const moveInDate = parseDate(moveInDateStr);

  // Calculate number of payment cycles
  const numberOfPaymentCycles = calculateNumberOfPaymentCycles(
    rentalType,
    reservationSpanWeeks,
    reservationSpanMonths
  );

  // Calculate remaining weeks for partial period handling
  const remainingWeeks = calculateRemainingWeeks(rentalType, reservationSpanWeeks);

  // Generate payment dates (3 days BEFORE move-in for guest)
  const paymentDates = generatePaymentDates(moveInDate, numberOfPaymentCycles, rentalType);

  // Determine base rent
  const baseRent = rentalType === 'Monthly' ? rentPerMonth! : fourWeekRent!;

  // Calculate rent list
  const rentList = calculateRentList(
    numberOfPaymentCycles,
    baseRent,
    rentalType,
    remainingWeeks,
    weekPattern,
    reservationSpanMonths
  );

  // Calculate total rent list (including maintenance and damage deposit on first)
  const totalRentList = calculateTotalRentList(rentList, maintenanceFee, damageDeposit);

  // Calculate total reservation price
  // KEY: Subtract damage deposit because it's refundable (not actual rent)
  const totalReservationPrice = roundToTwoDecimals(
    totalRentList.reduce((sum, current) => sum + current, 0) - damageDeposit
  );

  return {
    paymentDates,
    rentList,
    totalRentList,
    totalReservationPrice,
    numberOfPaymentCycles,
  };
}
