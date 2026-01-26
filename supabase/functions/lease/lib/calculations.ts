/**
 * Calculation Utilities for Lease Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * Pure functions for date and financial calculations.
 * NO FALLBACK PRINCIPLE: All calculations fail fast on invalid input.
 */

import type { ActiveTerms, ProposalData } from './types.ts';

/**
 * Calculate move-out date based on move-in and reservation span
 * Move-out = Move-in + (reservation weeks * 7 days) - 1 day
 *
 * @param moveInDate - ISO date string or Date object
 * @param reservationWeeks - Number of weeks in the reservation
 * @returns ISO date string for move-out date
 */
export function calculateMoveOutDate(
  moveInDate: string | Date,
  reservationWeeks: number
): string {
  const moveIn = typeof moveInDate === 'string' ? new Date(moveInDate) : moveInDate;

  if (isNaN(moveIn.getTime())) {
    throw new Error(`Invalid move-in date: ${moveInDate}`);
  }

  if (reservationWeeks <= 0) {
    throw new Error(`Invalid reservation weeks: ${reservationWeeks}`);
  }

  const totalDays = reservationWeeks * 7;
  const moveOut = new Date(moveIn);
  moveOut.setDate(moveOut.getDate() + totalDays - 1);

  return moveOut.toISOString();
}

/**
 * Calculate first payment date for the lease
 * This is used for lease record - actual payment dates are calculated
 * by the payment records Edge Functions.
 *
 * @param moveInDate - ISO date string or Date object
 * @returns ISO date string for first payment date (2 days after move-in)
 */
export function calculateFirstPaymentDate(moveInDate: string | Date): string {
  const moveIn = typeof moveInDate === 'string' ? new Date(moveInDate) : moveInDate;

  if (isNaN(moveIn.getTime())) {
    throw new Error(`Invalid move-in date: ${moveInDate}`);
  }

  const firstPayment = new Date(moveIn);
  firstPayment.setDate(firstPayment.getDate() + 2);

  return firstPayment.toISOString();
}

/**
 * Calculate 4-week rent from nightly price and nights per week
 * 4-week rent = nightly price * nights per week * 4
 *
 * @param nightlyPrice - Price per night
 * @param nightsPerWeek - Number of nights per week
 * @returns 4-week rent amount
 */
export function calculateFourWeekRent(
  nightlyPrice: number,
  nightsPerWeek: number
): number {
  if (nightlyPrice < 0) {
    throw new Error(`Invalid nightly price: ${nightlyPrice}`);
  }

  if (nightsPerWeek < 0 || nightsPerWeek > 7) {
    throw new Error(`Invalid nights per week: ${nightsPerWeek}`);
  }

  return nightlyPrice * nightsPerWeek * 4;
}

/**
 * Calculate total rent from 4-week rent and reservation span
 *
 * @param fourWeekRent - Rent per 4-week period
 * @param reservationWeeks - Total reservation span in weeks
 * @returns Total rent for the entire reservation
 */
export function calculateTotalRent(
  fourWeekRent: number,
  reservationWeeks: number
): number {
  if (fourWeekRent < 0) {
    throw new Error(`Invalid 4-week rent: ${fourWeekRent}`);
  }

  if (reservationWeeks <= 0) {
    throw new Error(`Invalid reservation weeks: ${reservationWeeks}`);
  }

  // Calculate proportionally based on 4-week cycles
  return fourWeekRent * (reservationWeeks / 4);
}

/**
 * Calculate total compensation from 4-week compensation and reservation span
 *
 * @param fourWeekCompensation - Compensation per 4-week period
 * @param reservationWeeks - Total reservation span in weeks
 * @returns Total compensation for the entire reservation
 */
export function calculateTotalCompensation(
  fourWeekCompensation: number,
  reservationWeeks: number
): number {
  if (fourWeekCompensation < 0) {
    throw new Error(`Invalid 4-week compensation: ${fourWeekCompensation}`);
  }

  if (reservationWeeks <= 0) {
    throw new Error(`Invalid reservation weeks: ${reservationWeeks}`);
  }

  // Calculate proportionally based on 4-week cycles
  return fourWeekCompensation * (reservationWeeks / 4);
}

/**
 * Determine which terms to use based on counteroffer status
 * If counteroffer: use HC (Historical Copy) fields
 * If no counteroffer: use original proposal fields
 *
 * @param proposal - Proposal data with both original and HC fields
 * @param isCounteroffer - Whether this is accepting a counteroffer
 * @returns Active terms to use for lease creation
 */
export function getActiveTerms(
  proposal: ProposalData,
  isCounteroffer: boolean
): ActiveTerms {
  if (isCounteroffer) {
    return {
      moveInDate: proposal['hc move in date'],
      reservationWeeks: proposal['hc reservation span (weeks)'],
      nightsPerWeek: proposal['hc nights per week'],
      nightlyPrice: proposal['hc nightly price'],
      fourWeekRent: proposal['hc 4 week rent'],
      damageDeposit: proposal['hc damage deposit'],
      cleaningFee: proposal['hc cleaning fee'],
      maintenanceFee: proposal['hc maintenance fee'],
    };
  }

  return {
    moveInDate: proposal['Move in range start'],
    reservationWeeks: proposal['Reservation Span (Weeks)'],
    nightsPerWeek: proposal['nights per week (num)'],
    nightlyPrice: proposal['proposal nightly price'],
    fourWeekRent: proposal['4 week rent'],
    damageDeposit: proposal['damage deposit'],
    cleaningFee: proposal['cleaning fee'],
    maintenanceFee: proposal['maintenance fee'],
  };
}

/**
 * Add days to a date
 *
 * @param date - Starting date
 * @param days - Number of days to add
 * @returns New date with days added
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add weeks to a date
 *
 * @param date - Starting date
 * @param weeks - Number of weeks to add
 * @returns New date with weeks added
 */
export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

/**
 * Get all dates in an interval (inclusive)
 *
 * @param start - Start date
 * @param end - End date
 * @returns Array of dates in the interval
 */
export function eachDayOfInterval(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}
