# Integration Plan: Lease Dates Generation

## Overview

This plan extends the existing `lease` Edge Function implementation plan to include the **reservation date generation** logic from the Bubble workflow `CORE-create-list-of-leases-and-proposals-dates`. This functionality generates the complete list of booked dates, check-in dates, and check-out dates based on rental type, weekly schedule pattern, move-in date, and reservation span.

**Prerequisite**: The base `lease` Edge Function plan ([20260123170500-lease-edge-function-implementation-plan.md](./20260123170500-lease-edge-function-implementation-plan.md)) should be implemented first. This plan adds the date generation as a new handler/action.

---

## What This Solves

When a guest accepts a counteroffer (or a host accepts a proposal), the system needs to calculate:

1. **All booked dates** - Every date the guest has the unit reserved
2. **Check-in dates** - The dates when weekly/cycle check-ins occur
3. **Check-out dates** - The dates when weekly/cycle check-outs occur

These calculations depend on:
- **Rental type**: Nightly, Monthly, or Weekly patterns
- **Week schedule**: "Every week", "One week on, one week off", "Two weeks on, two weeks off", "One week on, three weeks off"
- **Move-in date**: The first day of the reservation
- **Reservation span**: How many weeks the lease covers
- **Check-in/check-out days**: Which day of the week transitions happen (e.g., Friday check-in, Monday check-out)
- **Nights selected**: Which days of the week are included in the reservation

---

## Key Insight: Pattern Generation

`✶ Insight ─────────────────────────────────────`
The Bubble workflow uses 4 different server scripts to handle different week patterns. The core algorithm is the same—only the **filtering logic** changes to determine which weeks are "ON" vs "OFF". We can consolidate this into a single generator with a pattern filter.

The date generation follows this flow:
1. Find the first check-in date (next occurrence of check-in day after move-in)
2. Find the first check-out date (next occurrence of check-out day after check-in)
3. Calculate move-out date based on reservation span
4. Iterate day-by-day, collecting dates that match selected days
5. Apply pattern filter to exclude "OFF" weeks for split schedules
`─────────────────────────────────────────────────`

---

## Integration Point

This functionality integrates with the `lease` Edge Function in **Phase 7** (Additional Setups) of the create workflow, specifically where `generateStays()` is called. The date generation should happen **before** stays are created so the dates can be:

1. Stored on the lease record (`List of Booked Dates`, `Check-In Dates`, `Check-Out Dates`)
2. Passed to the stays generator to populate each stay's date list
3. Synced back to Bubble for the legacy system

---

## Implementation Steps

### Step 1: Create Date Generator Module

**File:** `supabase/functions/lease/lib/dateGenerator.ts`

**Purpose:** Generate all reservation dates based on rental configuration

```typescript
/**
 * Lease Date Generator
 *
 * Generates the complete list of booked dates, check-in dates, and check-out dates
 * for a lease based on rental type, schedule pattern, and timing parameters.
 *
 * Ported from Bubble workflow: CORE-create-list-of-leases-and-proposals-dates
 */

// Day of week names for lookups
const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Input parameters for date generation
 */
export interface DateGenerationInput {
  checkInDay: string;           // Day name: "Friday", "Monday", etc.
  checkOutDay: string;          // Day name: "Monday", "Friday", etc.
  reservationSpanWeeks: number; // Total weeks of the reservation
  moveInDate: string | Date;    // The lease start date
  weeksSchedule?: string;       // "Every week", "One week on, one week off", etc.
  nightsSelected?: number[];    // Array of day indices (0-6) - optional override
}

/**
 * Output from date generation
 */
export interface DateGenerationResult {
  checkInDates: string[];       // ISO date strings of all check-in dates
  checkOutDates: string[];      // ISO date strings of all check-out dates
  allBookedDates: string[];     // ISO date strings of all reserved dates
  totalNights: number;          // Count of all booked dates
  firstCheckIn: string;         // First check-in date
  lastCheckOut: string;         // Last check-out date (move-out)
}

/**
 * Format a Date to ISO date string (YYYY-MM-DD)
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format a Date to MM/DD/YYYY for Bubble compatibility
 */
function formatDateBubble(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

/**
 * Find the next occurrence of a specific day of the week on or after a given date
 */
function getNextDayOfWeek(date: Date, dayName: string): Date {
  const resultDate = new Date(date);
  const dayIndex = DAYS_OF_WEEK.indexOf(dayName);

  if (dayIndex === -1) {
    throw new Error(`Invalid day name: ${dayName}`);
  }

  const currentDayIndex = date.getDay();
  const daysToAdd = (7 + dayIndex - currentDayIndex) % 7;

  // If we're already on that day, daysToAdd will be 0 (stay on current day)
  // Unless we want next week's occurrence, which we don't in this case
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
    case "Every week":
    case "Nightly":
    case "Monthly":
      // All weeks are ON
      return true;

    case "One week on, one week off":
      // Week 0: ON, Week 1: OFF, Week 2: ON, Week 3: OFF...
      return weekNumber % 2 === 0;

    case "Two weeks on, two weeks off":
      // Weeks 0-1: ON, Weeks 2-3: OFF, Weeks 4-5: ON...
      // Use 4-week cycle: ON ON OFF OFF
      return (weekNumber % 4) < 2;

    case "One week on, three weeks off":
      // Week 0: ON, Weeks 1-3: OFF, Week 4: ON, Weeks 5-7: OFF...
      return weekNumber % 4 === 0;

    default:
      // Unknown pattern - default to all ON
      console.warn(`Unknown weeks schedule pattern: ${pattern}, defaulting to every week`);
      return true;
  }
}

/**
 * Calculate the week number for a given date relative to the first check-in
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
 */
export function generateLeaseDates(input: DateGenerationInput): DateGenerationResult {
  const {
    checkInDay,
    checkOutDay,
    reservationSpanWeeks,
    moveInDate,
    weeksSchedule = "Every week",
    nightsSelected,
  } = input;

  // Validate inputs
  if (!checkInDay || !DAYS_OF_WEEK.includes(checkInDay)) {
    throw new Error(`Invalid checkInDay: ${checkInDay}`);
  }

  if (!checkOutDay || !DAYS_OF_WEEK.includes(checkOutDay)) {
    throw new Error(`Invalid checkOutDay: ${checkOutDay}`);
  }

  if (!reservationSpanWeeks || reservationSpanWeeks <= 0) {
    throw new Error(`reservationSpanWeeks must be a positive number: ${reservationSpanWeeks}`);
  }

  if (!moveInDate) {
    throw new Error("moveInDate is required");
  }

  // Parse move-in date
  const moveInDateObj = typeof moveInDate === 'string' ? new Date(moveInDate) : new Date(moveInDate);

  if (isNaN(moveInDateObj.getTime())) {
    throw new Error(`Invalid moveInDate: ${moveInDate}`);
  }

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
  const checkInDayIndex = DAYS_OF_WEEK.indexOf(checkInDay);
  const checkOutDayIndex = DAYS_OF_WEEK.indexOf(checkOutDay);

  let validDayIndices: number[] = [];

  // If nightsSelected is provided, use it directly
  if (nightsSelected && nightsSelected.length > 0) {
    validDayIndices = nightsSelected;
  } else {
    // Build valid days: from check-in day up to (but not including) check-out day
    if (checkOutDayIndex > checkInDayIndex) {
      // Same week: e.g., Friday(5) to Monday(1) won't work this way
      // Actually Friday(5) to Monday(1): indices 5, 6, 0 (Fri, Sat, Sun)
      // Let's recalculate properly
      for (let i = checkInDayIndex; i !== checkOutDayIndex; i = (i + 1) % 7) {
        validDayIndices.push(i);
      }
    } else {
      // Wraps around the week: check-in is after check-out in week order
      for (let i = checkInDayIndex; i !== checkOutDayIndex; i = (i + 1) % 7) {
        validDayIndices.push(i);
      }
    }
  }

  // Generate all dates
  const allDates: Date[] = [];
  const checkInDates: Date[] = [];
  const checkOutDates: Date[] = [];

  let currentDate = new Date(firstCheckInDate);

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
    lastCheckOut: checkOutDates.length > 0 ? formatDate(checkOutDates[checkOutDates.length - 1]) : formatDate(moveOutDate),
  };

  return result;
}

/**
 * Pre-normalization for proposals with exactly 7 nights selected (full week)
 *
 * When a proposal has all 7 days selected, the check-in and check-out days
 * should both be set to the day of the week that the move-in date falls on.
 *
 * This replicates Bubble Step 1: "Only when proposal's hc nights selected:count is 7"
 */
export function normalizeFullWeekProposal(
  moveInDate: string | Date,
  nightsSelectedCount: number
): { checkInDay: string; checkOutDay: string } | null {
  if (nightsSelectedCount !== 7) {
    return null; // No normalization needed
  }

  const moveIn = typeof moveInDate === 'string' ? new Date(moveInDate) : moveInDate;
  const dayIndex = moveIn.getDay();
  const dayName = DAYS_OF_WEEK[dayIndex];

  return {
    checkInDay: dayName,
    checkOutDay: dayName,
  };
}
```

**Validation:** All 4 rental patterns produce correct date lists

---

### Step 2: Create New Action Handler for Date Generation

**File:** `supabase/functions/lease/handlers/generateDates.ts`

**Purpose:** Expose date generation as a standalone action for the lease Edge Function

```typescript
/**
 * Generate Dates Handler
 *
 * Action: 'generate_dates'
 *
 * Generates the list of booked dates, check-in dates, and check-out dates
 * for a lease. Can be called:
 * 1. During lease creation (internally)
 * 2. Directly via API for date preview/calculation
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ValidationError } from '../../_shared/errors.ts';
import {
  generateLeaseDates,
  normalizeFullWeekProposal,
  DateGenerationInput,
  DateGenerationResult
} from '../lib/dateGenerator.ts';

export interface GenerateDatesPayload {
  proposalId?: string;           // If provided, fetch data from proposal
  checkInDay?: string;           // Override: Day name (e.g., "Friday")
  checkOutDay?: string;          // Override: Day name (e.g., "Monday")
  reservationSpanWeeks?: number; // Override: Total weeks
  moveInDate?: string;           // Override: ISO date string
  weeksSchedule?: string;        // Override: Schedule pattern
  nightsSelected?: number[];     // Override: Array of day indices (0-6)
  isCounteroffer?: boolean;      // Whether to use HC fields from proposal
}

export interface GenerateDatesResponse extends DateGenerationResult {
  proposalId?: string;
  normalized?: boolean;          // Whether full-week normalization was applied
}

export async function handleGenerateDates(
  payload: GenerateDatesPayload,
  _user: { id: string; email: string } | null,
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
      .select(`
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
      `)
      .eq('_id', payload.proposalId)
      .single();

    if (error || !proposal) {
      throw new ValidationError(`Proposal not found: ${payload.proposalId}`);
    }

    // Determine if we should use HC (counteroffer) fields
    const useHC = payload.isCounteroffer ?? proposal['counter offer happened'] === true;

    // Extract values based on whether it's a counteroffer
    let checkInDay: string;
    let checkOutDay: string;
    let reservationSpanWeeks: number;
    let moveInDate: string;
    let weeksSchedule: string;
    let nightsSelected: number[] | undefined;

    if (useHC) {
      checkInDay = proposal['hc check in day']?.Display || proposal['hc check in day'] || payload.checkInDay;
      checkOutDay = proposal['hc check out day']?.Display || proposal['hc check out day'] || payload.checkOutDay;
      reservationSpanWeeks = proposal['hc reservation span (weeks)'] || payload.reservationSpanWeeks;
      moveInDate = proposal['hc move in date'] || payload.moveInDate;
      weeksSchedule = proposal['hc weeks schedule']?.Display || proposal['hc weeks schedule'] || 'Every week';
      nightsSelected = proposal['hc days selected'] || proposal['hc nights selected'];
    } else {
      checkInDay = proposal['check in day']?.Display || proposal['check in day'] || payload.checkInDay;
      checkOutDay = proposal['check out day']?.Display || proposal['check out day'] || payload.checkOutDay;
      reservationSpanWeeks = proposal['Reservation Span (Weeks)'] || payload.reservationSpanWeeks;
      moveInDate = proposal['Move in range start'] || payload.moveInDate;
      weeksSchedule = proposal['week selection']?.Display || proposal['week selection'] || 'Every week';
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
    if (!payload.checkInDay || !payload.checkOutDay || !payload.reservationSpanWeeks || !payload.moveInDate) {
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
```

---

### Step 3: Update Main Router to Include New Action

**File:** `supabase/functions/lease/index.ts` (modification)

**Changes:** Add `generate_dates` to the allowed actions and route it

```typescript
// Add to ALLOWED_ACTIONS
const ALLOWED_ACTIONS = ['create', 'get', 'generate_dates'] as const;

// Add to switch statement in Deno.serve handler
case 'generate_dates': {
  console.log('[lease] Loading generate_dates handler...');
  const { handleGenerateDates } = await import("./handlers/generateDates.ts");
  result = await handleGenerateDates(payload, user, supabase);
  break;
}
```

---

### Step 4: Integrate Date Generation into Lease Creation

**File:** `supabase/functions/lease/handlers/create.ts` (modification)

**Changes:** Call date generation before stays creation and store dates on lease

Add this between Phase 6 and Phase 7 in the create handler:

```typescript
// ═══════════════════════════════════════════════════════════════
// PHASE 6B: DATE GENERATION
// ═══════════════════════════════════════════════════════════════

console.log('[lease:create] Phase 6B: Generating reservation dates...');

// Import the date generator
const { generateLeaseDates, normalizeFullWeekProposal } = await import('../lib/dateGenerator.ts');

// Get check-in/check-out days from proposal (HC if counteroffer)
let checkInDay: string;
let checkOutDay: string;

if (input.isCounteroffer) {
  checkInDay = proposalData['hc check in day']?.Display || proposalData['hc check in day'];
  checkOutDay = proposalData['hc check out day']?.Display || proposalData['hc check out day'];
} else {
  checkInDay = proposalData['check in day']?.Display || proposalData['check in day'];
  checkOutDay = proposalData['check out day']?.Display || proposalData['check out day'];
}

// Get nights selected
const nightsSelected = input.isCounteroffer
  ? (proposalData['hc days selected'] || proposalData['hc nights selected'])
  : proposalData['Days Selected'];

// Handle full-week normalization
const nightsCount = Array.isArray(nightsSelected) ? nightsSelected.length : 0;
const normalizedDays = normalizeFullWeekProposal(activeTerms.moveInDate, nightsCount);

if (normalizedDays) {
  checkInDay = normalizedDays.checkInDay;
  checkOutDay = normalizedDays.checkOutDay;
  console.log('[lease:create] Applied full-week normalization');
}

// Get weeks schedule
const weeksSchedule = input.isCounteroffer
  ? (proposalData['hc weeks schedule']?.Display || proposalData['hc weeks schedule'] || 'Every week')
  : (proposalData['week selection']?.Display || proposalData['week selection'] || 'Every week');

// Generate dates
const dateResult = generateLeaseDates({
  checkInDay,
  checkOutDay,
  reservationSpanWeeks: activeTerms.reservationWeeks,
  moveInDate: activeTerms.moveInDate,
  weeksSchedule,
  nightsSelected: Array.isArray(nightsSelected) ? nightsSelected : undefined,
});

console.log('[lease:create] Generated dates:', {
  totalNights: dateResult.totalNights,
  checkInDatesCount: dateResult.checkInDates.length,
  checkOutDatesCount: dateResult.checkOutDates.length,
});

// Update proposal with generated dates
const proposalDateUpdate = {
  'List of Booked Dates': dateResult.allBookedDates,
  'Check-In Dates': dateResult.checkInDates,
  'Check-Out Dates': dateResult.checkOutDates,
  'total nights': dateResult.totalNights,
  'Modified Date': now,
};

await supabase
  .from('proposal')
  .update(proposalDateUpdate)
  .eq('_id', input.proposalId);

// Update lease with generated dates (Step 10 from Bubble workflow)
const leaseDateUpdate = {
  'List of Booked Dates': dateResult.allBookedDates,
  'Check-In Dates': dateResult.checkInDates,
  'Check-Out Dates': dateResult.checkOutDates,
  'total nights': dateResult.totalNights,
  'Reservation Period: Start': dateResult.firstCheckIn,
  'Reservation Period: End': dateResult.lastCheckOut,
};

await supabase
  .from('bookings_leases')
  .update(leaseDateUpdate)
  .eq('_id', leaseId);

// Error handling: Notify if no dates generated (Steps 11-12 from Bubble)
if (dateResult.totalNights === 0) {
  console.error('[lease:create] WARNING: No dates generated!');

  // Trigger notification to ops team
  try {
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/slack-notify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: '#ops-alerts',
        text: `:warning: Lease date generation produced 0 dates!\nLease ID: ${leaseId}\nProposal ID: ${input.proposalId}\nWeeks Schedule: ${weeksSchedule}`,
      }),
    });
  } catch (notifyError) {
    console.warn('[lease:create] Failed to notify ops:', notifyError);
  }
}

console.log('[lease:create] Phase 6B complete: Dates generated and stored');
```

---

### Step 5: Update Stays Generator to Use Generated Dates

**File:** `supabase/functions/lease/lib/staysGenerator.ts` (modification)

**Changes:** Accept pre-generated dates instead of calculating inline

```typescript
/**
 * Generate weekly stay records for a lease
 *
 * @param supabase - Supabase client
 * @param leaseId - The lease ID
 * @param guestId - Guest user ID
 * @param hostId - Host user ID
 * @param listingId - Listing ID
 * @param dateResult - Pre-generated dates from dateGenerator
 * @param reservationWeeks - Number of weeks in reservation
 */
export async function generateStays(
  supabase: SupabaseClient,
  leaseId: string,
  guestId: string,
  hostId: string,
  listingId: string,
  dateResult: DateGenerationResult,
  reservationWeeks: number
): Promise<string[]> {
  const stayIds: string[] = [];
  const now = new Date().toISOString();

  // Calculate dates per week from the pre-generated dates
  const allDates = dateResult.allBookedDates.map(d => new Date(d));
  const checkInDates = dateResult.checkInDates.map(d => new Date(d));

  // Create one stay per check-in date
  for (let i = 0; i < checkInDates.length; i++) {
    const checkInDate = checkInDates[i];
    const nextCheckIn = checkInDates[i + 1];

    // Generate bubble-compatible ID
    const { data: stayId, error: idError } = await supabase.rpc('generate_bubble_id');
    if (idError || !stayId) {
      throw new Error(`Failed to generate stay ID: ${idError?.message}`);
    }

    // Find all booked dates for this stay period
    const stayDates = allDates.filter(d => {
      if (d < checkInDate) return false;
      if (nextCheckIn && d >= nextCheckIn) return false;
      return true;
    });

    // Determine check-in night and last night
    const checkInNight = stayDates.length > 0 ? stayDates[0] : checkInDate;
    const lastNight = stayDates.length > 0 ? stayDates[stayDates.length - 1] : checkInDate;

    const stayRecord = {
      _id: stayId,
      Lease: leaseId,
      'Week Number': i + 1,
      Guest: guestId,
      Host: hostId,
      listing: listingId,
      'Dates - List of dates in this period': stayDates.map(d => d.toISOString()),
      'Check In (night)': checkInNight.toISOString(),
      'Last Night (night)': lastNight.toISOString(),
      'Stay Status': 'Upcoming',
      'Created Date': now,
      'Modified Date': now,
    };

    const { error: insertError } = await supabase
      .from('bookings_stays')
      .insert(stayRecord);

    if (insertError) {
      throw new Error(`Failed to create stay ${i + 1}: ${insertError.message}`);
    }

    stayIds.push(stayId);
  }

  return stayIds;
}
```

---

### Step 6: Add Bubble Sync for Date Fields

**File:** `supabase/functions/lease/handlers/create.ts` (modification)

Update the Bubble sync queue items to include the date fields:

```typescript
// In the Bubble sync section, update the payload to include dates

await enqueueBubbleSync(supabase, {
  correlationId: `lease:${leaseId}`,
  items: [
    {
      sequence: 1,
      table: 'bookings_leases',
      recordId: leaseId,
      operation: 'INSERT',
      payload: {
        ...leaseRecord,
        ...leaseDateUpdate,  // Include the date fields
      },
    },
    {
      sequence: 2,
      table: 'proposal',
      recordId: input.proposalId,
      operation: 'UPDATE',
      payload: {
        ...proposalUpdate,
        ...proposalDateUpdate,  // Include the date fields
      },
    },
  ],
});
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        LEASE DATE GENERATION FLOW                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  TRIGGER: Guest accepts counteroffer OR Host accepts proposal                   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  STEP 1: Extract Parameters                                             │   │
│  │                                                                         │   │
│  │  From Proposal (or HC fields if counteroffer):                          │   │
│  │  ├─ checkInDay: "Friday"                                                │   │
│  │  ├─ checkOutDay: "Monday"                                               │   │
│  │  ├─ reservationSpanWeeks: 12                                            │   │
│  │  ├─ moveInDate: "2026-02-01"                                            │   │
│  │  ├─ weeksSchedule: "One week on, one week off"                          │   │
│  │  └─ nightsSelected: [5, 6, 0]  (Fri, Sat, Sun)                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                              │                                                  │
│                              ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  STEP 2: Full-Week Normalization (if 7 nights selected)                 │   │
│  │                                                                         │   │
│  │  IF nightsSelected.length === 7:                                        │   │
│  │    checkInDay = DAY_OF_WEEK(moveInDate)                                 │   │
│  │    checkOutDay = DAY_OF_WEEK(moveInDate)                                │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                              │                                                  │
│                              ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  STEP 3: Calculate Key Dates                                            │   │
│  │                                                                         │   │
│  │  firstCheckIn = nextOccurrence(moveInDate, checkInDay)                  │   │
│  │  firstCheckOut = nextOccurrence(firstCheckIn, checkOutDay)              │   │
│  │  moveOut = firstCheckOut + (reservationSpanWeeks - 1) * 7 days          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                              │                                                  │
│                              ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  STEP 4: Iterate Day-by-Day                                             │   │
│  │                                                                         │   │
│  │  FOR each day from firstCheckIn to moveOut:                             │   │
│  │    weekNumber = floor((day - firstCheckIn) / 7)                         │   │
│  │    IF isWeekOn(weekNumber, weeksSchedule):                              │   │
│  │      IF day matches checkInDay: add to checkInDates                     │   │
│  │      IF day matches checkOutDay: add to checkOutDates                   │   │
│  │      IF day.dayOfWeek in validDays: add to allBookedDates               │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                              │                                                  │
│                              ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  STEP 5: Store Results                                                  │   │
│  │                                                                         │   │
│  │  UPDATE proposal:                                                       │   │
│  │    - List of Booked Dates                                               │   │
│  │    - Check-In Dates                                                     │   │
│  │    - Check-Out Dates                                                    │   │
│  │    - total nights                                                       │   │
│  │                                                                         │   │
│  │  UPDATE lease:                                                          │   │
│  │    - List of Booked Dates                                               │   │
│  │    - Check-In Dates                                                     │   │
│  │    - Check-Out Dates                                                    │   │
│  │    - Reservation Period: Start                                          │   │
│  │    - Reservation Period: End                                            │   │
│  │    - total nights                                                       │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                              │                                                  │
│                              ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  STEP 6: Create Stays (using generated dates)                           │   │
│  │                                                                         │   │
│  │  FOR each checkInDate:                                                  │   │
│  │    Create bookings_stays record with:                                   │   │
│  │    - Week Number (1-indexed)                                            │   │
│  │    - Dates - List of dates in this period                               │   │
│  │    - Check In (night)                                                   │   │
│  │    - Last Night (night)                                                 │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                              │                                                  │
│                              ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  STEP 7: Error Handling                                                 │   │
│  │                                                                         │   │
│  │  IF totalNights === 0:                                                  │   │
│  │    - Log error                                                          │   │
│  │    - Notify ops team via Slack                                          │   │
│  │    - (Bubble: send magic link to user for manual fix)                   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Week Pattern Examples

### Pattern: "Every week" (Nightly/Monthly)

```
Move-in: Feb 1, 2026 (Saturday)
Check-in day: Friday
Check-out day: Monday
Span: 4 weeks
Nights selected: Fri(5), Sat(6), Sun(0)

Week 0: ON  → Feb 7 (Fri), Feb 8 (Sat), Feb 9 (Sun)  [Check-in: Feb 7, Check-out: Feb 10]
Week 1: ON  → Feb 14 (Fri), Feb 15 (Sat), Feb 16 (Sun) [Check-in: Feb 14, Check-out: Feb 17]
Week 2: ON  → Feb 21 (Fri), Feb 22 (Sat), Feb 23 (Sun) [Check-in: Feb 21, Check-out: Feb 24]
Week 3: ON  → Feb 28 (Fri), Mar 1 (Sat), Mar 2 (Sun)   [Check-in: Feb 28, Check-out: Mar 3]

Total booked dates: 12 nights
```

### Pattern: "One week on, one week off"

```
Move-in: Feb 1, 2026 (Saturday)
Check-in day: Friday
Check-out day: Monday
Span: 8 weeks
Nights selected: Fri(5), Sat(6), Sun(0)

Week 0: ON  → Feb 7, 8, 9
Week 1: OFF → (skipped)
Week 2: ON  → Feb 21, 22, 23
Week 3: OFF → (skipped)
Week 4: ON  → Mar 7, 8, 9
Week 5: OFF → (skipped)
Week 6: ON  → Mar 21, 22, 23
Week 7: OFF → (skipped)

Total booked dates: 12 nights (4 stays × 3 nights)
```

### Pattern: "Two weeks on, two weeks off"

```
Move-in: Feb 1, 2026 (Saturday)
Check-in day: Friday
Check-out day: Monday
Span: 8 weeks

Week 0: ON  → Feb 7-9
Week 1: ON  → Feb 14-16
Week 2: OFF → (skipped)
Week 3: OFF → (skipped)
Week 4: ON  → Mar 7-9
Week 5: ON  → Mar 14-16
Week 6: OFF → (skipped)
Week 7: OFF → (skipped)

Total booked dates: 12 nights (4 stays × 3 nights)
```

### Pattern: "One week on, three weeks off"

```
Move-in: Feb 1, 2026 (Saturday)
Check-in day: Friday
Check-out day: Monday
Span: 16 weeks

Week 0:  ON  → Feb 7-9
Week 1:  OFF
Week 2:  OFF
Week 3:  OFF
Week 4:  ON  → Mar 7-9
Week 5:  OFF
Week 6:  OFF
Week 7:  OFF
Week 8:  ON  → Apr 4-6
Week 9:  OFF
Week 10: OFF
Week 11: OFF
Week 12: ON  → May 2-4
Week 13: OFF
Week 14: OFF
Week 15: OFF

Total booked dates: 12 nights (4 stays × 3 nights)
```

---

## Database Fields Affected

### Proposal Table (`proposal`)

| Field | Type | Description |
|-------|------|-------------|
| `List of Booked Dates` | jsonb (date array) | All reserved dates |
| `Check-In Dates` | jsonb (date array) | Check-in dates only |
| `Check-Out Dates` | jsonb (date array) | Check-out dates only |
| `total nights` | integer | Count of booked dates |
| `hc check in day` | object/text | Check-in day of week |
| `hc check out day` | object/text | Check-out day of week |

### Lease Table (`bookings_leases`)

| Field | Type | Description |
|-------|------|-------------|
| `List of Booked Dates` | jsonb (date array) | All reserved dates |
| `Check-In Dates` | jsonb (date array) | Check-in dates only |
| `Check-Out Dates` | jsonb (date array) | Check-out dates only |
| `Reservation Period: Start` | text (date) | First check-in date |
| `Reservation Period: End` | text (date) | Last check-out date |
| `total nights` | integer | Count of booked dates |

### Stays Table (`bookings_stays`)

| Field | Type | Description |
|-------|------|-------------|
| `Dates - List of dates in this period` | jsonb (date array) | Dates for this stay |
| `Check In (night)` | text (date) | First night of stay |
| `Last Night (night)` | text (date) | Last night of stay |
| `Week Number` | integer | 1-indexed week number |

---

## Testing Checklist

### Unit Tests for dateGenerator.ts

- [ ] `generateLeaseDates()` - Every week pattern with valid inputs
- [ ] `generateLeaseDates()` - One week on, one week off pattern
- [ ] `generateLeaseDates()` - Two weeks on, two weeks off pattern
- [ ] `generateLeaseDates()` - One week on, three weeks off pattern
- [ ] `generateLeaseDates()` - Invalid checkInDay throws error
- [ ] `generateLeaseDates()` - Invalid checkOutDay throws error
- [ ] `generateLeaseDates()` - Zero reservationSpanWeeks throws error
- [ ] `generateLeaseDates()` - Invalid moveInDate throws error
- [ ] `normalizeFullWeekProposal()` - Returns null for < 7 nights
- [ ] `normalizeFullWeekProposal()` - Returns correct day for 7 nights
- [ ] `getNextDayOfWeek()` - Same day returns same day
- [ ] `getNextDayOfWeek()` - Next week's day calculated correctly
- [ ] `isWeekOn()` - Every week always returns true
- [ ] `isWeekOn()` - One on/one off alternates correctly
- [ ] `isWeekOn()` - Two on/two off alternates correctly
- [ ] `isWeekOn()` - One on/three off pattern correct

### Integration Tests

- [ ] Proposal acceptance triggers date generation
- [ ] Counteroffer acceptance uses HC fields
- [ ] Dates stored on proposal correctly
- [ ] Dates stored on lease correctly
- [ ] Stays created with correct date ranges
- [ ] Zero dates triggers ops notification
- [ ] Bubble sync queue includes date fields

### Edge Cases

- [ ] Move-in date IS the check-in day (no adjustment needed)
- [ ] Check-out day is before check-in day (wraps to next week)
- [ ] Check-in and check-out are same day (full week)
- [ ] Leap year date handling (Feb 29)
- [ ] DST transition dates
- [ ] Very long reservation (52+ weeks)
- [ ] Single week reservation

---

## Files Summary

### Files to Create

| Path | Purpose |
|------|---------|
| `supabase/functions/lease/lib/dateGenerator.ts` | Core date generation logic |
| `supabase/functions/lease/handlers/generateDates.ts` | Action handler for date generation |

### Files to Modify

| Path | Changes |
|------|---------|
| `supabase/functions/lease/index.ts` | Add `generate_dates` action route |
| `supabase/functions/lease/handlers/create.ts` | Integrate date generation into Phase 6B |
| `supabase/functions/lease/lib/staysGenerator.ts` | Use pre-generated dates |

### Reference Files (Read-Only)

| Path | Purpose |
|------|---------|
| `app/src/lib/dayUtils.js` | Day indexing conventions (0=Sunday) |
| `supabase/functions/_shared/queueSync.ts` | Bubble sync pattern |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Incorrect week pattern filtering | Medium | High | Comprehensive unit tests for each pattern |
| Date calculation edge cases (DST, leap year) | Low | Medium | Use reliable date library (date-fns) |
| Zero dates generated | Low | High | Ops notification + user magic link |
| Performance with long reservations | Low | Low | Linear algorithm O(n) where n = days |
| Bubble sync date format mismatch | Medium | Medium | Explicit date formatting functions |

---

## Relationship to Existing Plan

This plan **extends** the existing lease Edge Function plan:

```
┌────────────────────────────────────────────────────────────────────┐
│  EXISTING PLAN: 20260123170500-lease-edge-function-implementation  │
│                                                                    │
│  Phase 1: Proposal Status Update                                   │
│  Phase 2: Lease Creation                                           │
│  Phase 3: Auxiliary Setups                                         │
│  Phase 4: Multi-Channel Communications                             │
│  Phase 5: User Association                                         │
│  Phase 6: Payment Records                                          │
│  Phase 6B: DATE GENERATION ◄──── THIS PLAN                         │
│  Phase 7: Additional Setups (Stays, House Manual, etc.)            │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

The stays generator in Phase 7 will receive the dates generated in Phase 6B, ensuring consistency between the lease dates and the individual stay records.

---

**VERSION**: 1.0
**CREATED**: 2026-01-23
**AUTHOR**: Implementation Planning Architect
**PREREQUISITE**: 20260123170500-lease-edge-function-implementation-plan.md
