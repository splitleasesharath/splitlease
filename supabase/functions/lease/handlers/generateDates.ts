/**
 * Generate Dates Handler
 * Split Lease - Supabase Edge Functions
 *
 * Action: 'generate_dates'
 *
 * Generates the list of booked dates, check-in dates, and check-out dates
 * for a lease. Can be called:
 * 1. During lease creation (internally)
 * 2. Directly via API for date preview/calculation
 *
 * NO FALLBACK PRINCIPLE: Fails fast on invalid input.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ValidationError } from '../../_shared/errors.ts';
import {
  generateLeaseDates,
  normalizeFullWeekProposal,
  DateGenerationInput,
  DateGenerationResult,
} from '../lib/dateGenerator.ts';
import type { UserContext } from '../lib/types.ts';

export interface GenerateDatesPayload {
  /** If provided, fetch data from proposal */
  proposalId?: string;
  /** Override: Day name (e.g., "Friday") */
  checkInDay?: string;
  /** Override: Day name (e.g., "Monday") */
  checkOutDay?: string;
  /** Override: Total weeks */
  reservationSpanWeeks?: number;
  /** Override: ISO date string */
  moveInDate?: string;
  /** Override: Schedule pattern */
  weeksSchedule?: string;
  /** Override: Array of day indices (0-6) */
  nightsSelected?: number[];
  /** Whether to use HC fields from proposal */
  isCounteroffer?: boolean;
}

export interface GenerateDatesResponse extends DateGenerationResult {
  proposalId?: string;
  /** Whether full-week normalization was applied */
  normalized?: boolean;
}

/**
 * Handle generate_dates action
 *
 * Generates reservation dates either from a proposal or from direct parameters.
 * When proposalId is provided, fetches the relevant fields from the proposal
 * and uses HC (Historical Copy) fields if isCounteroffer is true.
 *
 * @param payload - Request payload with date parameters or proposalId
 * @param _user - Authenticated user context (optional, not used for this action)
 * @param supabase - Supabase client
 * @returns Generated dates response
 */
export async function handleGenerateDates(
  payload: GenerateDatesPayload,
  _user: UserContext | null,
  supabase: SupabaseClient
): Promise<GenerateDatesResponse> {
  console.log('[lease:generateDates] Generating dates...');
  console.log('[lease:generateDates] Payload:', JSON.stringify(payload, null, 2));

  let input: DateGenerationInput;
  let proposalId: string | undefined;
  let normalized = false;

  // If proposalId is provided, fetch data from the proposal
  if (payload.proposalId) {
    proposalId = payload.proposalId;

    const { data: proposal, error } = await supabase
      .from('proposal')
      .select(
        `
        _id,
        "check in day",
        "check out day",
        "Reservation Span (Weeks)",
        "Move in range start",
        "week selection",
        "Days Selected",
        "nights per week (num)",
        "hc check in day",
        "hc check out day",
        "hc reservation span (weeks)",
        "hc move in date",
        "hc weeks schedule",
        "hc days selected",
        "hc nights selected",
        "counter offer happened"
      `
      )
      .eq('_id', payload.proposalId)
      .single();

    if (error || !proposal) {
      throw new ValidationError(`Proposal not found: ${payload.proposalId}`);
    }

    // Determine if we should use HC (counteroffer) fields
    const useHC = payload.isCounteroffer ?? proposal['counter offer happened'] === true;

    console.log('[lease:generateDates] Fetched proposal, useHC:', useHC);

    // Extract values based on whether it's a counteroffer
    let checkInDay: string;
    let checkOutDay: string;
    let reservationSpanWeeks: number;
    let moveInDate: string;
    let weeksSchedule: string;
    let nightsSelected: number[] | undefined;

    if (useHC) {
      // Extract Display value from object if present, otherwise use the value directly
      const hcCheckInDay = proposal['hc check in day'];
      const hcCheckOutDay = proposal['hc check out day'];
      const hcWeeksSchedule = proposal['hc weeks schedule'];

      checkInDay =
        (typeof hcCheckInDay === 'object' && hcCheckInDay?.Display) ||
        hcCheckInDay ||
        payload.checkInDay;
      checkOutDay =
        (typeof hcCheckOutDay === 'object' && hcCheckOutDay?.Display) ||
        hcCheckOutDay ||
        payload.checkOutDay;
      reservationSpanWeeks =
        proposal['hc reservation span (weeks)'] || payload.reservationSpanWeeks;
      moveInDate = proposal['hc move in date'] || payload.moveInDate;
      weeksSchedule =
        (typeof hcWeeksSchedule === 'object' && hcWeeksSchedule?.Display) ||
        hcWeeksSchedule ||
        'Every week';
      nightsSelected = proposal['hc days selected'] || proposal['hc nights selected'];
    } else {
      // Extract Display value from object if present, otherwise use the value directly
      const checkInDayVal = proposal['check in day'];
      const checkOutDayVal = proposal['check out day'];
      const weekSelectionVal = proposal['week selection'];

      checkInDay =
        (typeof checkInDayVal === 'object' && checkInDayVal?.Display) ||
        checkInDayVal ||
        payload.checkInDay;
      checkOutDay =
        (typeof checkOutDayVal === 'object' && checkOutDayVal?.Display) ||
        checkOutDayVal ||
        payload.checkOutDay;
      reservationSpanWeeks =
        proposal['Reservation Span (Weeks)'] || payload.reservationSpanWeeks;
      moveInDate = proposal['Move in range start'] || payload.moveInDate;
      weeksSchedule =
        (typeof weekSelectionVal === 'object' && weekSelectionVal?.Display) ||
        weekSelectionVal ||
        'Every week';
      nightsSelected = proposal['Days Selected'];
    }

    // Handle full-week normalization (Step 1 from Bubble workflow)
    const nightsCount = Array.isArray(nightsSelected) ? nightsSelected.length : 0;
    const normalizedDays = normalizeFullWeekProposal(moveInDate, nightsCount);

    if (normalizedDays) {
      checkInDay = normalizedDays.checkInDay;
      checkOutDay = normalizedDays.checkOutDay;
      normalized = true;
      console.log('[lease:generateDates] Applied full-week normalization:', normalizedDays);
    }

    // Validate required fields
    if (!checkInDay) {
      throw new ValidationError('checkInDay is required but not found in proposal or payload');
    }
    if (!checkOutDay) {
      throw new ValidationError('checkOutDay is required but not found in proposal or payload');
    }
    if (!reservationSpanWeeks) {
      throw new ValidationError(
        'reservationSpanWeeks is required but not found in proposal or payload'
      );
    }
    if (!moveInDate) {
      throw new ValidationError('moveInDate is required but not found in proposal or payload');
    }

    input = {
      checkInDay,
      checkOutDay,
      reservationSpanWeeks,
      moveInDate,
      weeksSchedule,
      nightsSelected: Array.isArray(nightsSelected) ? nightsSelected : undefined,
    };
  } else {
    // Direct parameters provided
    if (
      !payload.checkInDay ||
      !payload.checkOutDay ||
      !payload.reservationSpanWeeks ||
      !payload.moveInDate
    ) {
      throw new ValidationError(
        'When proposalId is not provided, checkInDay, checkOutDay, reservationSpanWeeks, and moveInDate are required'
      );
    }

    // Handle full-week normalization
    const nightsCount = payload.nightsSelected?.length || 0;
    const normalizedDays = normalizeFullWeekProposal(payload.moveInDate, nightsCount);

    let checkInDay = payload.checkInDay;
    let checkOutDay = payload.checkOutDay;

    if (normalizedDays) {
      checkInDay = normalizedDays.checkInDay;
      checkOutDay = normalizedDays.checkOutDay;
      normalized = true;
    }

    input = {
      checkInDay,
      checkOutDay,
      reservationSpanWeeks: payload.reservationSpanWeeks,
      moveInDate: payload.moveInDate,
      weeksSchedule: payload.weeksSchedule || 'Every week',
      nightsSelected: payload.nightsSelected,
    };
  }

  console.log('[lease:generateDates] Input for generation:', JSON.stringify(input, null, 2));

  // Generate the dates
  const result = generateLeaseDates(input);

  console.log('[lease:generateDates] Generated:', {
    checkInDatesCount: result.checkInDates.length,
    checkOutDatesCount: result.checkOutDates.length,
    allBookedDatesCount: result.allBookedDates.length,
    totalNights: result.totalNights,
    firstCheckIn: result.firstCheckIn,
    lastCheckOut: result.lastCheckOut,
  });

  return {
    ...result,
    proposalId,
    normalized,
  };
}
