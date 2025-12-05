# Proposal Edge Function - Comprehensive Implementation Plan

**Document Version**: 1.0
**Created**: 2025-12-05
**Status**: Planning
**Migrating From**: Bubble.io `CORE-create_proposal-NEW` workflow

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Decision: Single vs Multiple Edge Functions](#architecture-decision)
3. [Function Structure](#function-structure)
4. [Implementation Phases](#implementation-phases)
5. [Phase 1: Core Infrastructure](#phase-1-core-infrastructure)
6. [Phase 2: Create Proposal Action](#phase-2-create-proposal-action)
7. [Phase 3: Update Proposal Action](#phase-3-update-proposal-action)
8. [Phase 4: Async Workflows (Pending - Separate Edge Functions)](#phase-4-async-workflows)
9. [Database Schema Alignment](#database-schema-alignment)
10. [API Specification](#api-specification)
11. [Testing Strategy](#testing-strategy)
12. [Migration Strategy](#migration-strategy)
13. [Risk Assessment](#risk-assessment)

---

## Executive Summary

This plan outlines the migration of Bubble.io's `CORE-create_proposal-NEW` workflow (26 steps, 37 parameters) to a Supabase Edge Function. The implementation will:

- **Create proposals** with full field mapping from Bubble schema
- **Update proposals** with field-level changes and status transitions
- **Trigger async workflows** for communications, summaries, and suggestions (separate edge functions)
- **Manage threads** for guest-host communication (separate edge function)

**Total Estimated Effort**: 5 phases across the implementation

---

## Architecture Decision

### Question: Should Create and Update be in the SAME Edge Function?

#### **Recommendation: YES - Use Single Edge Function with Action-Based Routing**

#### Rationale:

| Factor | Analysis | Decision Impact |
|--------|----------|-----------------|
| **Existing Pattern** | `bubble-proxy` uses action-based routing with 10+ actions | Favor single function |
| **Shared Logic** | 70%+ code overlap (validation, calculations, user updates) | Favor single function |
| **Maintenance** | One place to update business rules | Favor single function |
| **API Consistency** | Same endpoint for related operations | Favor single function |
| **Authorization** | Different checks can be handled per-action | Neutral |
| **Performance** | No cold start penalty for frequently used actions | Favor single function |
| **Complexity** | Update has conditional logic, but manageable | Manageable |

#### Alternative Considered: Separate Functions

```
# NOT RECOMMENDED
supabase/functions/
├── proposal-create/    # Create only
├── proposal-update/    # Update only
├── proposal-comms/     # Communications
└── proposal-suggest/   # Suggestions
```

**Why Rejected**:
- Code duplication across create/update
- Harder to maintain shared validation
- More functions to deploy and monitor
- Against existing codebase patterns

#### Final Architecture:

```
supabase/functions/
├── proposal/                      # Main proposal function
│   ├── index.ts                   # Router with action dispatch
│   ├── deno.json                  # Import map
│   ├── actions/
│   │   ├── create.ts              # Create proposal (Phase 2)
│   │   ├── update.ts              # Update proposal (Phase 3)
│   │   ├── get.ts                 # Get proposal details
│   │   └── delete.ts              # Soft delete proposal
│   ├── lib/
│   │   ├── calculations.ts        # Compensation & pricing
│   │   ├── status.ts              # Status management
│   │   ├── validators.ts          # Input validation
│   │   ├── dayConversion.ts       # Bubble ↔ JS day index
│   │   └── types.ts               # TypeScript interfaces
│   └── README.md                  # Function documentation
│
├── proposal-communications/       # ASYNC - Phase 4 (Pending)
│   └── index.ts                   # Thread & notification management
│
├── proposal-suggestions/          # ASYNC - Phase 4 (Pending)
│   └── index.ts                   # Weekly match & same-address suggestions
│
└── proposal-summary/              # ASYNC - Phase 4 (Pending)
    └── index.ts                   # Host summary generation
```

---

## Function Structure

### Main Router (`proposal/index.ts`)

```typescript
import { corsHeaders } from '../_shared/cors.ts';
import { ValidationError } from '../_shared/errors.ts';
import { validateAction } from '../_shared/validation.ts';

import { handleCreate } from './actions/create.ts';
import { handleUpdate } from './actions/update.ts';
import { handleGet } from './actions/get.ts';
import { handleDelete } from './actions/delete.ts';

const ALLOWED_ACTIONS = ['create', 'update', 'get', 'delete'] as const;
const PUBLIC_ACTIONS = ['get'] as const;

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, payload } = await req.json();
    validateAction(action, [...ALLOWED_ACTIONS]);

    // Auth check (skip for public actions)
    const authHeader = req.headers.get('Authorization');
    // ... auth logic

    let result;
    switch (action) {
      case 'create':
        result = await handleCreate(payload, user);
        break;
      case 'update':
        result = await handleUpdate(payload, user);
        break;
      case 'get':
        result = await handleGet(payload);
        break;
      case 'delete':
        result = await handleDelete(payload, user);
        break;
      default:
        throw new ValidationError(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // Error handling...
  }
});
```

---

## Implementation Phases

### Phase Overview

| Phase | Scope | Priority | Dependencies |
|-------|-------|----------|--------------|
| **Phase 1** | Core Infrastructure | P0 - Critical | None |
| **Phase 2** | Create Proposal | P0 - Critical | Phase 1 |
| **Phase 3** | Update Proposal | P1 - High | Phase 2 |
| **Phase 4** | Async Workflows | P2 - Medium | Phases 2, 3 |

### Dependency Graph

```
Phase 1: Infrastructure
    │
    ▼
Phase 2: Create Proposal
    │
    ├──────────────────┐
    ▼                  ▼
Phase 3: Update    Phase 4: Async Workflows
                       │
                       ├── Communications (Pending)
                       ├── Suggestions (Pending)
                       └── Summary (Pending)
```

---

## Phase 1: Core Infrastructure

### 1.1 Directory Setup

```bash
mkdir -p supabase/functions/proposal/{actions,lib}
touch supabase/functions/proposal/index.ts
touch supabase/functions/proposal/deno.json
touch supabase/functions/proposal/README.md
```

### 1.2 Shared Type Definitions (`lib/types.ts`)

```typescript
// ============================================
// INPUT TYPES
// ============================================

export interface CreateProposalInput {
  // Required Identifiers
  listing_id: string;
  guest_id: string;

  // Required Pricing
  estimated_booking_total: number;
  guest_flexibility: string;
  preferred_gender: string;

  // Dates & Duration
  move_in_start_range: string;      // ISO date
  move_in_end_range: string;        // ISO date
  reservation_span_weeks: number;
  reservation_span: string;         // → os_stay_periods.name
  actual_weeks?: number;

  // Day/Night Selection (Bubble indexing: 1-7)
  days_selected: number[];
  nights_selected: number[];
  check_in: number;
  check_out: number;

  // Pricing Details
  proposal_price: number;
  four_week_rent?: number;
  four_week_compensation?: number;
  host_compensation?: number;

  // Guest Information
  comment?: string;
  need_for_space?: string;
  about_me?: string;
  special_needs?: string;

  // Optional Overrides
  status?: string;
  suggested_reason?: string;
  origin_proposal_id?: string;
  move_in_range_text?: string;
  flexible_move_in?: boolean;
  number_of_matches?: number;
}

export interface UpdateProposalInput {
  proposal_id: string;

  // All fields optional for partial update
  status?: string;
  proposal_price?: number;
  move_in_start_range?: string;
  move_in_end_range?: string;
  days_selected?: number[];
  nights_selected?: number[];
  reservation_span_weeks?: number;
  comment?: string;

  // Host counteroffer fields
  hc_nightly_price?: number;
  hc_days_selected?: number[];
  hc_nights_selected?: number[];
  hc_move_in_date?: string;
  hc_reservation_span_weeks?: number;
  hc_cleaning_fee?: number;
  hc_damage_deposit?: number;
  hc_total_price?: number;

  // Cancellation
  reason_for_cancellation?: string;
}

// ============================================
// OUTPUT TYPES
// ============================================

export interface ProposalResponse {
  proposal_id: string;
  status: string;
  order_ranking: number;
  listing_id: string;
  guest_id: string;
  host_id: string;
  created_at: string;
}

export interface UpdateProposalResponse {
  proposal_id: string;
  status: string;
  updated_fields: string[];
  updated_at: string;
}

// ============================================
// INTERNAL TYPES
// ============================================

export interface ListingData {
  _id: string;
  'Host / Landlord': string;
  'rental type': string;
  'Features - House Rules': string[];
  '💰Cleaning Cost / Maintenance Fee': number;
  '💰Damage Deposit': number;
  'Weeks offered': string;
  'Days Available (List of Days)': number[];
  'Nights Available (List of Nights)': number[];
  'Location - Address': Record<string, unknown>;
  'Location - slightly different address': string;
  '💰Weekly Host Rate': number;
  '💰Nightly Host Rate for 2 nights': number;
}

export interface GuestData {
  _id: string;
  email: string;
  'Rental Application': string;
  'Proposals List': string[];
  'About Me / Bio'?: string;
  'need for Space'?: string;
  'special needs'?: string;
  'Tasks Completed'?: string[];
}

export interface RentalApplicationData {
  _id: string;
  submitted: boolean;
}

export interface CompensationResult {
  total_compensation: number;
  duration_months: number;
  four_week_rent: number;
  four_week_compensation: number;
}

// ============================================
// OPTION SET TYPES
// ============================================

export type ProposalStatusName =
  | 'sl_submitted_awaiting_rental_app'
  | 'guest_submitted_awaiting_rental_app'
  | 'sl_submitted_pending_confirmation'
  | 'host_review'
  | 'host_counteroffer'
  | 'accepted_drafting_lease'
  | 'lease_docs_for_review'
  | 'lease_docs_for_signatures'
  | 'lease_signed_awaiting_payment'
  | 'payment_submitted_lease_activated'
  | 'cancelled_by_guest'
  | 'rejected_by_host'
  | 'cancelled_by_sl'
  | 'guest_ignored_suggestion';

export type RentalType = 'nightly' | 'weekly' | 'monthly';

export type ReservationSpan =
  | '1_week' | '2_weeks'
  | '1_month' | '2_months' | '3_months' | '6_months'
  | '1_year' | 'other';
```

### 1.3 Day Conversion Utilities (`lib/dayConversion.ts`)

```typescript
/**
 * CRITICAL: Day Index Conversion
 *
 * | System     | Sun | Mon | Tue | Wed | Thu | Fri | Sat |
 * |------------|-----|-----|-----|-----|-----|-----|-----|
 * | JavaScript | 0   | 1   | 2   | 3   | 4   | 5   | 6   |
 * | Bubble API | 1   | 2   | 3   | 4   | 5   | 6   | 7   |
 */

export function adaptDaysFromBubble(bubbleDays: number[]): number[] {
  return bubbleDays.map(d => d - 1);
}

export function adaptDaysToBubble(jsDays: number[]): number[] {
  return jsDays.map(d => d + 1);
}

export function adaptNightsFromBubble(bubbleNights: number[]): number[] {
  return bubbleNights.map(n => n - 1);
}

export function adaptNightsToBubble(jsNights: number[]): number[] {
  return jsNights.map(n => n + 1);
}

export function validateDayIndices(days: number[], source: 'bubble' | 'js'): boolean {
  const min = source === 'bubble' ? 1 : 0;
  const max = source === 'bubble' ? 7 : 6;
  return days.every(d => d >= min && d <= max);
}
```

### 1.4 Validation Utilities (`lib/validators.ts`)

```typescript
import { ValidationError } from '../../_shared/errors.ts';
import { CreateProposalInput, UpdateProposalInput } from './types.ts';
import { validateDayIndices } from './dayConversion.ts';

export function validateCreateProposalInput(input: CreateProposalInput): void {
  // Required fields
  if (!input.listing_id) {
    throw new ValidationError('listing_id is required');
  }
  if (!input.guest_id) {
    throw new ValidationError('guest_id is required');
  }
  if (typeof input.estimated_booking_total !== 'number') {
    throw new ValidationError('estimated_booking_total must be a number');
  }
  if (!input.guest_flexibility) {
    throw new ValidationError('guest_flexibility is required');
  }
  if (!input.preferred_gender) {
    throw new ValidationError('preferred_gender is required');
  }

  // Date validation
  if (!input.move_in_start_range) {
    throw new ValidationError('move_in_start_range is required');
  }
  if (!input.move_in_end_range) {
    throw new ValidationError('move_in_end_range is required');
  }

  const startDate = new Date(input.move_in_start_range);
  const endDate = new Date(input.move_in_end_range);
  if (isNaN(startDate.getTime())) {
    throw new ValidationError('move_in_start_range must be a valid ISO date');
  }
  if (isNaN(endDate.getTime())) {
    throw new ValidationError('move_in_end_range must be a valid ISO date');
  }
  if (startDate > endDate) {
    throw new ValidationError('move_in_start_range must be before move_in_end_range');
  }

  // Duration validation
  if (typeof input.reservation_span_weeks !== 'number' || input.reservation_span_weeks < 1) {
    throw new ValidationError('reservation_span_weeks must be a positive number');
  }

  // Day/Night selection validation (Bubble format: 1-7)
  if (!Array.isArray(input.days_selected) || input.days_selected.length === 0) {
    throw new ValidationError('days_selected must be a non-empty array');
  }
  if (!validateDayIndices(input.days_selected, 'bubble')) {
    throw new ValidationError('days_selected must contain values 1-7 (Bubble format)');
  }

  if (!Array.isArray(input.nights_selected) || input.nights_selected.length === 0) {
    throw new ValidationError('nights_selected must be a non-empty array');
  }
  if (!validateDayIndices(input.nights_selected, 'bubble')) {
    throw new ValidationError('nights_selected must contain values 1-7 (Bubble format)');
  }

  // Check-in/out validation
  if (!validateDayIndices([input.check_in], 'bubble')) {
    throw new ValidationError('check_in must be a value 1-7 (Bubble format)');
  }
  if (!validateDayIndices([input.check_out], 'bubble')) {
    throw new ValidationError('check_out must be a value 1-7 (Bubble format)');
  }

  // Pricing validation
  if (typeof input.proposal_price !== 'number' || input.proposal_price < 0) {
    throw new ValidationError('proposal_price must be a non-negative number');
  }
}

export function validateUpdateProposalInput(input: UpdateProposalInput): void {
  if (!input.proposal_id) {
    throw new ValidationError('proposal_id is required');
  }

  // Validate optional fields if provided
  if (input.days_selected !== undefined) {
    if (!Array.isArray(input.days_selected)) {
      throw new ValidationError('days_selected must be an array');
    }
    if (!validateDayIndices(input.days_selected, 'bubble')) {
      throw new ValidationError('days_selected must contain values 1-7');
    }
  }

  if (input.nights_selected !== undefined) {
    if (!Array.isArray(input.nights_selected)) {
      throw new ValidationError('nights_selected must be an array');
    }
    if (!validateDayIndices(input.nights_selected, 'bubble')) {
      throw new ValidationError('nights_selected must contain values 1-7');
    }
  }

  if (input.proposal_price !== undefined && typeof input.proposal_price !== 'number') {
    throw new ValidationError('proposal_price must be a number');
  }

  if (input.reservation_span_weeks !== undefined && typeof input.reservation_span_weeks !== 'number') {
    throw new ValidationError('reservation_span_weeks must be a number');
  }
}
```

### 1.5 Calculation Utilities (`lib/calculations.ts`)

```typescript
import { CompensationResult, RentalType, ReservationSpan } from './types.ts';

/**
 * Calculate compensation based on rental type and duration
 * Mirrors Bubble Steps 13-18
 */
export function calculateCompensation(
  rentalType: RentalType,
  reservationSpan: ReservationSpan,
  nightsPerWeek: number,
  weeklyRate: number,
  nightlyPrice: number,
  weeks: number
): CompensationResult {
  let totalCompensation = 0;
  let durationMonths = 0;
  let fourWeekRent = 0;
  let fourWeekCompensation = 0;

  switch (rentalType) {
    case 'nightly':
      // Step 13: Nightly calculation
      // Total = nightly_price * nights_per_week * total_weeks
      totalCompensation = nightlyPrice * nightsPerWeek * weeks;
      fourWeekRent = nightlyPrice * nightsPerWeek * 4;
      fourWeekCompensation = fourWeekRent; // Host gets full amount for nightly
      durationMonths = weeks / 4;
      break;

    case 'weekly':
      // Step 14: Weekly calculation
      // Total = weekly_rate * total_weeks
      totalCompensation = weeklyRate * weeks;
      fourWeekRent = weeklyRate * 4;
      fourWeekCompensation = fourWeekRent;
      durationMonths = weeks / 4;
      break;

    case 'monthly':
      if (reservationSpan !== 'other') {
        // Step 15: Monthly (standard span)
        // Duration in months = weeks / 4
        // Total = monthly_rate * months (approximated as weekly * 4 * months)
        durationMonths = weeks / 4;
        totalCompensation = weeklyRate * 4 * durationMonths;
        fourWeekRent = weeklyRate * 4;
        fourWeekCompensation = fourWeekRent;
      } else {
        // Step 16: Monthly (custom/other span)
        // Proportional calculation for non-standard durations
        durationMonths = weeks / 4;
        totalCompensation = weeklyRate * weeks;
        fourWeekRent = weeklyRate * 4;
        fourWeekCompensation = fourWeekRent;
      }
      break;

    default:
      throw new Error(`Unknown rental type: ${rentalType}`);
  }

  return {
    total_compensation: Math.round(totalCompensation * 100) / 100,
    duration_months: Math.round(durationMonths * 100) / 100,
    four_week_rent: Math.round(fourWeekRent * 100) / 100,
    four_week_compensation: Math.round(fourWeekCompensation * 100) / 100,
  };
}

/**
 * Calculate move-out date based on move-in and duration
 */
export function calculateMoveOutDate(
  moveInStart: Date,
  reservationSpanWeeks: number,
  nightsCount: number
): Date {
  // Formula from Bubble Step 1:
  // Move-out = move_in_start + days: (reservation_span_weeks - 1) * 7 + nights_count
  const daysToAdd = (reservationSpanWeeks - 1) * 7 + nightsCount;
  const moveOut = new Date(moveInStart);
  moveOut.setDate(moveOut.getDate() + daysToAdd);
  return moveOut;
}

/**
 * Calculate complementary nights (nights available but not selected)
 */
export function calculateComplementaryNights(
  availableNights: number[],
  selectedNights: number[]
): number[] {
  return availableNights.filter(night => !selectedNights.includes(night));
}

/**
 * Calculate order ranking for new proposal
 */
export function calculateOrderRanking(existingProposalsCount: number): number {
  return existingProposalsCount + 1;
}

/**
 * Format price for display (e.g., $1,029)
 */
export function formatPriceForDisplay(price: number): string {
  return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}
```

### 1.6 Status Management (`lib/status.ts`)

```typescript
import { ProposalStatusName } from './types.ts';

/**
 * Status transition rules
 * Maps current status to allowed next statuses
 */
export const STATUS_TRANSITIONS: Record<ProposalStatusName, ProposalStatusName[]> = {
  // Pre-submission states
  'sl_submitted_awaiting_rental_app': ['host_review', 'cancelled_by_sl', 'guest_ignored_suggestion'],
  'guest_submitted_awaiting_rental_app': ['host_review', 'cancelled_by_guest'],
  'sl_submitted_pending_confirmation': ['host_review', 'cancelled_by_sl'],

  // Active workflow states
  'host_review': ['host_counteroffer', 'accepted_drafting_lease', 'rejected_by_host', 'cancelled_by_guest'],
  'host_counteroffer': ['accepted_drafting_lease', 'cancelled_by_guest', 'rejected_by_host'],
  'accepted_drafting_lease': ['lease_docs_for_review', 'cancelled_by_guest', 'cancelled_by_sl'],
  'lease_docs_for_review': ['lease_docs_for_signatures', 'cancelled_by_guest', 'cancelled_by_sl'],
  'lease_docs_for_signatures': ['lease_signed_awaiting_payment', 'cancelled_by_guest', 'cancelled_by_sl'],
  'lease_signed_awaiting_payment': ['payment_submitted_lease_activated', 'cancelled_by_guest', 'cancelled_by_sl'],

  // Terminal states (no transitions out)
  'payment_submitted_lease_activated': [],
  'cancelled_by_guest': [],
  'rejected_by_host': [],
  'cancelled_by_sl': [],
  'guest_ignored_suggestion': [],
};

/**
 * Determine initial status based on rental application state
 * Mirrors Bubble Steps 5-7
 */
export function determineInitialStatus(
  hasRentalApplication: boolean,
  rentalAppSubmitted: boolean,
  overrideStatus?: ProposalStatusName
): ProposalStatusName {
  // Step 7: If status parameter provided, use it
  if (overrideStatus) {
    return overrideStatus;
  }

  // Step 5: If rental application is submitted → Host Review
  if (hasRentalApplication && rentalAppSubmitted) {
    return 'host_review';
  }

  // Step 6: If rental application NOT submitted → Awaiting Rental Application
  return 'guest_submitted_awaiting_rental_app';
}

/**
 * Validate status transition
 */
export function isValidStatusTransition(
  currentStatus: ProposalStatusName,
  newStatus: ProposalStatusName
): boolean {
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus];
  return allowedTransitions?.includes(newStatus) ?? false;
}

/**
 * Check if status is terminal (cannot transition further)
 */
export function isTerminalStatus(status: ProposalStatusName): boolean {
  return STATUS_TRANSITIONS[status]?.length === 0;
}

/**
 * Get status stage number for UI display
 */
export function getStatusStage(status: ProposalStatusName): number {
  const stageMap: Record<ProposalStatusName, number> = {
    'sl_submitted_awaiting_rental_app': 0,
    'guest_submitted_awaiting_rental_app': 0,
    'sl_submitted_pending_confirmation': 0,
    'host_review': 1,
    'host_counteroffer': 2,
    'accepted_drafting_lease': 3,
    'lease_docs_for_review': 4,
    'lease_docs_for_signatures': 5,
    'lease_signed_awaiting_payment': 6,
    'payment_submitted_lease_activated': 7,
    'cancelled_by_guest': -1,
    'rejected_by_host': -1,
    'cancelled_by_sl': -1,
    'guest_ignored_suggestion': -1,
  };
  return stageMap[status] ?? -1;
}
```

### 1.7 Config File (`proposal/deno.json`)

```json
{
  "imports": {
    "@shared/": "../_shared/",
    "@lib/": "./lib/",
    "@actions/": "./actions/"
  },
  "compilerOptions": {
    "strict": true
  }
}
```

### 1.8 Update `config.toml`

```toml
[functions.proposal]
enabled = true
verify_jwt = false
import_map = "./functions/proposal/deno.json"
entrypoint = "./functions/proposal/index.ts"
```

---

## Phase 2: Create Proposal Action

### 2.1 Create Action Handler (`actions/create.ts`)

This implements Bubble Steps 1-7 and 13-23:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ValidationError, SupabaseSyncError } from '../../_shared/errors.ts';
import {
  CreateProposalInput,
  ProposalResponse,
  ListingData,
  GuestData,
  RentalApplicationData
} from '../lib/types.ts';
import { validateCreateProposalInput } from '../lib/validators.ts';
import {
  calculateCompensation,
  calculateMoveOutDate,
  calculateComplementaryNights,
  calculateOrderRanking,
  formatPriceForDisplay
} from '../lib/calculations.ts';
import { determineInitialStatus } from '../lib/status.ts';
import { generateBubbleId } from '../../_shared/bubbleSync.ts';

export async function handleCreate(
  input: CreateProposalInput,
  user: { id: string; email: string }
): Promise<ProposalResponse> {

  // ================================================
  // VALIDATION
  // ================================================
  validateCreateProposalInput(input);

  // ================================================
  // INITIALIZE SUPABASE CLIENT
  // ================================================
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // ================================================
  // FETCH RELATED DATA
  // ================================================

  // Fetch Listing
  const { data: listing, error: listingError } = await supabase
    .from('listing')
    .select(`
      _id,
      "Host / Landlord",
      "rental type",
      "Features - House Rules",
      "💰Cleaning Cost / Maintenance Fee",
      "💰Damage Deposit",
      "Weeks offered",
      "Days Available (List of Days)",
      "Nights Available (List of Nights)",
      "Location - Address",
      "Location - slightly different address",
      "💰Weekly Host Rate",
      "💰Nightly Host Rate for 2 nights"
    `)
    .eq('_id', input.listing_id)
    .single();

  if (listingError || !listing) {
    throw new ValidationError(`Listing not found: ${input.listing_id}`);
  }

  // Fetch Guest User
  const { data: guest, error: guestError } = await supabase
    .from('user')
    .select(`
      _id,
      "email as text",
      "Rental Application",
      "Proposals List",
      "About Me / Bio",
      "need for Space",
      "special needs",
      "Tasks Completed"
    `)
    .eq('_id', input.guest_id)
    .single();

  if (guestError || !guest) {
    throw new ValidationError(`Guest not found: ${input.guest_id}`);
  }

  // Fetch Host User (via account_host)
  const { data: hostAccount, error: hostAccountError } = await supabase
    .from('account_host')
    .select('_id, User')
    .eq('_id', listing['Host / Landlord'])
    .single();

  if (hostAccountError || !hostAccount) {
    throw new ValidationError(`Host account not found: ${listing['Host / Landlord']}`);
  }

  const { data: hostUser, error: hostUserError } = await supabase
    .from('user')
    .select('_id, "email as text"')
    .eq('_id', hostAccount.User)
    .single();

  if (hostUserError || !hostUser) {
    throw new ValidationError(`Host user not found`);
  }

  // Fetch Rental Application (if exists)
  let rentalApp: RentalApplicationData | null = null;
  if (guest['Rental Application']) {
    const { data: app } = await supabase
      .from('rentalapplication')
      .select('_id, submitted')
      .eq('_id', guest['Rental Application'])
      .single();
    rentalApp = app;
  }

  // ================================================
  // CALCULATIONS
  // ================================================

  // Calculate order ranking
  const existingProposals = guest['Proposals List'] || [];
  const orderRanking = calculateOrderRanking(existingProposals.length);

  // Calculate complementary nights (Step 4)
  const complementaryNights = calculateComplementaryNights(
    listing['Nights Available (List of Nights)'] || [],
    input.nights_selected
  );

  // Calculate compensation (Steps 13-18)
  const rentalType = (listing['rental type'] || 'nightly').toLowerCase();
  const compensation = calculateCompensation(
    rentalType as 'nightly' | 'weekly' | 'monthly',
    input.reservation_span as any,
    input.nights_selected.length,
    listing['💰Weekly Host Rate'] || 0,
    input.proposal_price,
    input.reservation_span_weeks
  );

  // Calculate move-out date
  const moveOutDate = calculateMoveOutDate(
    new Date(input.move_in_start_range),
    input.reservation_span_weeks,
    input.nights_selected.length
  );

  // Determine initial status (Steps 5-7)
  const status = determineInitialStatus(
    !!rentalApp,
    rentalApp?.submitted ?? false,
    input.status as any
  );

  // ================================================
  // STEP 1: CREATE PROPOSAL RECORD
  // ================================================

  const proposalId = generateBubbleId();
  const now = new Date().toISOString();
  const historyEntry = `Proposal created on ${new Date().toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })}`;

  const proposalData = {
    _id: proposalId,

    // Core relationships
    Listing: input.listing_id,
    Guest: input.guest_id,
    'Host - Account': listing['Host / Landlord'],
    'Created By': input.guest_id,

    // Guest info
    'Guest email': guest['email as text'],
    'Guest flexibility': input.guest_flexibility,
    'preferred gender': input.preferred_gender,
    'need for space': input.need_for_space,
    'About yourself': input.about_me,
    'Special needs': input.special_needs,
    Comment: input.comment,

    // Dates
    'Move in range start': input.move_in_start_range,
    'Move in range end': input.move_in_end_range,
    'Move-out': moveOutDate.toISOString(),
    'move-in range (text)': input.move_in_range_text,

    // Duration
    'Reservation Span': input.reservation_span,
    'Reservation Span (Weeks)': input.reservation_span_weeks,
    'actual weeks during reservation span': input.actual_weeks || input.reservation_span_weeks,
    'duration in months': compensation.duration_months,

    // Day/Night selection
    'Days Selected': input.days_selected,
    'Nights Selected (Nights list)': input.nights_selected,
    'nights per week (num)': input.nights_selected.length,
    'check in day': input.check_in,
    'check out day': input.check_out,
    'Days Available': listing['Days Available (List of Days)'],
    'Complementary Nights': complementaryNights,

    // Pricing
    'proposal nightly price': input.proposal_price,
    '4 week rent': input.four_week_rent || compensation.four_week_rent,
    'Total Price for Reservation (guest)': input.estimated_booking_total,
    'Total Compensation (proposal - host)': compensation.total_compensation,
    'host compensation': input.host_compensation || compensation.total_compensation,
    '4 week compensation': input.four_week_compensation || compensation.four_week_compensation,
    'cleaning fee': listing['💰Cleaning Cost / Maintenance Fee'],
    'damage deposit': listing['💰Damage Deposit'],
    'nightly price for map (text)': formatPriceForDisplay(input.proposal_price),

    // From listing
    'rental type': listing['rental type'],
    'House Rules': listing['Features - House Rules'],
    'week selection': listing['Weeks offered'],
    'hc house rules': listing['Features - House Rules'],
    'Location - Address': listing['Location - Address'],
    'Location - Address slightly different': listing['Location - slightly different address'],

    // Status & metadata
    Status: status,
    'Order Ranking': orderRanking,
    History: [historyEntry],
    'Is Finalized': false,
    Deleted: false,

    // Related records
    'rental application': guest['Rental Application'],
    'host email': hostUser['email as text'],

    // Suggestion fields
    'suggested reason (benefits)': input.suggested_reason,
    'origin proposal of this suggestion': input.origin_proposal_id,
    'number of matches': input.number_of_matches,

    // Timestamps
    'Created Date': now,
    'Modified Date': now,
  };

  const { error: insertError } = await supabase
    .from('proposal')
    .insert(proposalData);

  if (insertError) {
    throw new SupabaseSyncError(`Failed to create proposal: ${insertError.message}`);
  }

  // ================================================
  // STEP 2: UPDATE GUEST USER
  // ================================================

  const guestUpdates: Record<string, any> = {
    'flexibility (last known)': input.guest_flexibility,
    'Recent Days Selected': input.days_selected,
    'Modified Date': now,
  };

  // Add proposal to guest's list
  const updatedGuestProposals = [...existingProposals, proposalId];
  guestUpdates['Proposals List'] = updatedGuestProposals;

  // Add listing to favorites (Step 2)
  const currentFavorites = guest['Favorited Listings'] || [];
  if (!currentFavorites.includes(input.listing_id)) {
    guestUpdates['Favorited Listings'] = [...currentFavorites, input.listing_id];
  }

  // Profile enrichment (Steps 20-22) - only if empty
  const tasksCompleted = guest['Tasks Completed'] || [];

  if (!guest['About Me / Bio'] && !tasksCompleted.includes('bio') && input.about_me) {
    guestUpdates['About Me / Bio'] = input.about_me;
  }
  if (!guest['need for Space'] && !tasksCompleted.includes('need_for_space') && input.need_for_space) {
    guestUpdates['need for Space'] = input.need_for_space;
  }
  if (!guest['special needs'] && !tasksCompleted.includes('special_needs') && input.special_needs) {
    guestUpdates['special needs'] = input.special_needs;
  }

  const { error: guestUpdateError } = await supabase
    .from('user')
    .update(guestUpdates)
    .eq('_id', input.guest_id);

  if (guestUpdateError) {
    console.error('Failed to update guest user:', guestUpdateError);
    // Non-blocking - continue
  }

  // ================================================
  // STEP 3: UPDATE HOST USER
  // ================================================

  const { data: currentHostUser } = await supabase
    .from('user')
    .select('"Proposals List"')
    .eq('_id', hostAccount.User)
    .single();

  const hostProposals = currentHostUser?.['Proposals List'] || [];

  const { error: hostUpdateError } = await supabase
    .from('user')
    .update({
      'Proposals List': [...hostProposals, proposalId],
      'Modified Date': now,
    })
    .eq('_id', hostAccount.User);

  if (hostUpdateError) {
    console.error('Failed to update host user:', hostUpdateError);
    // Non-blocking - continue
  }

  // ================================================
  // TRIGGER ASYNC WORKFLOWS (Non-blocking)
  // ================================================

  // These will be separate edge functions (Phase 4)
  // For now, we log the intent

  console.log('[ASYNC] Would trigger: proposal-communications', { proposal_id: proposalId });
  console.log('[ASYNC] Would trigger: proposal-summary', { proposal_id: proposalId });
  console.log('[ASYNC] Would trigger: proposal-suggestions', { proposal_id: proposalId });

  // TODO: Implement async calls in Phase 4
  // await triggerAsyncWorkflow('proposal-communications', { proposal_id: proposalId });
  // await triggerAsyncWorkflow('proposal-summary', { proposal_id: proposalId });
  // await triggerAsyncWorkflow('proposal-suggestions', { proposal_id: proposalId });

  // ================================================
  // RETURN RESPONSE
  // ================================================

  return {
    proposal_id: proposalId,
    status: status,
    order_ranking: orderRanking,
    listing_id: input.listing_id,
    guest_id: input.guest_id,
    host_id: hostAccount.User,
    created_at: now,
  };
}
```

### 2.2 Bubble ID Generator

Add to `_shared/bubbleSync.ts`:

```typescript
/**
 * Generate a Bubble-compatible ID
 * Format: {timestamp}x{random}
 * Example: 1733407200000x123456789
 */
export function generateBubbleId(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000000);
  return `${timestamp}x${random}`;
}
```

---

## Phase 3: Update Proposal Action

### 3.1 Update Action Handler (`actions/update.ts`)

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ValidationError, SupabaseSyncError, AuthenticationError } from '../../_shared/errors.ts';
import { UpdateProposalInput, UpdateProposalResponse } from '../lib/types.ts';
import { validateUpdateProposalInput } from '../lib/validators.ts';
import { isValidStatusTransition, isTerminalStatus } from '../lib/status.ts';
import { calculateCompensation, calculateComplementaryNights } from '../lib/calculations.ts';

export async function handleUpdate(
  input: UpdateProposalInput,
  user: { id: string; email: string }
): Promise<UpdateProposalResponse> {

  // ================================================
  // VALIDATION
  // ================================================
  validateUpdateProposalInput(input);

  // ================================================
  // INITIALIZE SUPABASE CLIENT
  // ================================================
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // ================================================
  // FETCH EXISTING PROPOSAL
  // ================================================

  const { data: proposal, error: fetchError } = await supabase
    .from('proposal')
    .select('*')
    .eq('_id', input.proposal_id)
    .single();

  if (fetchError || !proposal) {
    throw new ValidationError(`Proposal not found: ${input.proposal_id}`);
  }

  // ================================================
  // AUTHORIZATION CHECK
  // ================================================

  // User must be guest, host, or admin
  const isGuest = proposal.Guest === user.id;
  const isHost = proposal['Host - Account'] && await checkIsHost(supabase, proposal['Host - Account'], user.id);
  const isAdmin = await checkIsAdmin(supabase, user.id);

  if (!isGuest && !isHost && !isAdmin) {
    throw new AuthenticationError('You do not have permission to update this proposal');
  }

  // ================================================
  // CHECK TERMINAL STATUS
  // ================================================

  if (isTerminalStatus(proposal.Status)) {
    throw new ValidationError(`Cannot update proposal in terminal status: ${proposal.Status}`);
  }

  // ================================================
  // BUILD UPDATE OBJECT
  // ================================================

  const updates: Record<string, any> = {};
  const updatedFields: string[] = [];
  const now = new Date().toISOString();

  // Status transition
  if (input.status !== undefined && input.status !== proposal.Status) {
    if (!isValidStatusTransition(proposal.Status, input.status as any)) {
      throw new ValidationError(
        `Invalid status transition: ${proposal.Status} → ${input.status}`
      );
    }
    updates.Status = input.status;
    updatedFields.push('status');

    // Add to history
    const historyEntry = `Status changed to ${input.status} on ${new Date().toLocaleString()}`;
    updates.History = [...(proposal.History || []), historyEntry];
  }

  // Pricing updates
  if (input.proposal_price !== undefined) {
    updates['proposal nightly price'] = input.proposal_price;
    updatedFields.push('proposal_price');
  }

  // Date updates
  if (input.move_in_start_range !== undefined) {
    updates['Move in range start'] = input.move_in_start_range;
    updatedFields.push('move_in_start_range');
  }
  if (input.move_in_end_range !== undefined) {
    updates['Move in range end'] = input.move_in_end_range;
    updatedFields.push('move_in_end_range');
  }

  // Day/Night selection updates
  if (input.days_selected !== undefined) {
    updates['Days Selected'] = input.days_selected;
    updatedFields.push('days_selected');
  }
  if (input.nights_selected !== undefined) {
    updates['Nights Selected (Nights list)'] = input.nights_selected;
    updates['nights per week (num)'] = input.nights_selected.length;
    updatedFields.push('nights_selected');

    // Recalculate complementary nights
    const listingNights = proposal['Days Available'] || [];
    updates['Complementary Nights'] = calculateComplementaryNights(
      listingNights,
      input.nights_selected
    );
  }

  // Duration updates
  if (input.reservation_span_weeks !== undefined) {
    updates['Reservation Span (Weeks)'] = input.reservation_span_weeks;
    updatedFields.push('reservation_span_weeks');
  }

  // Comment updates
  if (input.comment !== undefined) {
    updates.Comment = input.comment;
    updatedFields.push('comment');
  }

  // Host counteroffer fields
  if (input.hc_nightly_price !== undefined) {
    updates['hc nightly price'] = input.hc_nightly_price;
    updates['counter offer happened'] = true;
    updatedFields.push('hc_nightly_price');
  }
  if (input.hc_days_selected !== undefined) {
    updates['hc days selected'] = input.hc_days_selected;
    updatedFields.push('hc_days_selected');
  }
  if (input.hc_nights_selected !== undefined) {
    updates['hc nights selected'] = input.hc_nights_selected;
    updates['hc nights per week'] = input.hc_nights_selected.length;
    updatedFields.push('hc_nights_selected');
  }
  if (input.hc_move_in_date !== undefined) {
    updates['hc move in date'] = input.hc_move_in_date;
    updatedFields.push('hc_move_in_date');
  }
  if (input.hc_reservation_span_weeks !== undefined) {
    updates['hc reservation span (weeks)'] = input.hc_reservation_span_weeks;
    updatedFields.push('hc_reservation_span_weeks');
  }
  if (input.hc_cleaning_fee !== undefined) {
    updates['hc cleaning fee'] = input.hc_cleaning_fee;
    updatedFields.push('hc_cleaning_fee');
  }
  if (input.hc_damage_deposit !== undefined) {
    updates['hc damage deposit'] = input.hc_damage_deposit;
    updatedFields.push('hc_damage_deposit');
  }
  if (input.hc_total_price !== undefined) {
    updates['hc total price'] = input.hc_total_price;
    updatedFields.push('hc_total_price');
  }

  // Cancellation reason
  if (input.reason_for_cancellation !== undefined) {
    updates['reason for cancellation'] = input.reason_for_cancellation;
    updatedFields.push('reason_for_cancellation');
  }

  // ================================================
  // CHECK FOR NO CHANGES
  // ================================================

  if (updatedFields.length === 0) {
    throw new ValidationError('No valid fields to update');
  }

  // ================================================
  // APPLY UPDATE
  // ================================================

  updates['Modified Date'] = now;

  const { error: updateError } = await supabase
    .from('proposal')
    .update(updates)
    .eq('_id', input.proposal_id);

  if (updateError) {
    throw new SupabaseSyncError(`Failed to update proposal: ${updateError.message}`);
  }

  // ================================================
  // TRIGGER STATUS-SPECIFIC WORKFLOWS
  // ================================================

  if (input.status) {
    // Trigger appropriate async workflow based on new status
    console.log('[ASYNC] Status changed, would trigger notifications:', {
      proposal_id: input.proposal_id,
      old_status: proposal.Status,
      new_status: input.status,
    });
  }

  // ================================================
  // RETURN RESPONSE
  // ================================================

  return {
    proposal_id: input.proposal_id,
    status: input.status || proposal.Status,
    updated_fields: updatedFields,
    updated_at: now,
  };
}

// Helper functions
async function checkIsHost(supabase: any, hostAccountId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('account_host')
    .select('User')
    .eq('_id', hostAccountId)
    .single();
  return data?.User === userId;
}

async function checkIsAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user')
    .select('"Toggle - Is Admin"')
    .eq('_id', userId)
    .single();
  return data?.['Toggle - Is Admin'] === true;
}
```

---

## Phase 4: Async Workflows (Pending - Separate Edge Functions)

These workflows are triggered AFTER proposal creation/update and run asynchronously.

### 4.1 Pending Async Edge Functions

| Function | Bubble Equivalent | Trigger | Priority |
|----------|-------------------|---------|----------|
| `proposal-communications` | Steps 8-11, 19 | After create, status change | P2 |
| `proposal-summary` | Step 24 | After create | P2 |
| `proposal-suggestions` | Steps 25-26 | After create | P3 |

### 4.2 `proposal-communications` (Pending)

**Bubble Steps Covered**: 8-11 (Thread Management), 19 (Communications)

**Actions**:
- `update-thread` - Update existing thread with CTA
- `create-thread` - Create new thread with CTA
- `send-notifications` - Email/SMS notifications

**Logic**:
```
IF thread exists AND rental_app_submitted:
    → Update thread with "See Proposal" CTA
ELIF thread exists AND NOT rental_app_submitted:
    → Update thread with "Fill Application" CTA
ELIF NO thread AND rental_app_submitted:
    → Create thread with "See Proposal" CTA
ELIF NO thread AND NOT rental_app_submitted:
    → Create thread with "Fill Application" CTA
```

**Estimated Implementation**:
- Thread management requires understanding `_message` and thread structure
- May need to integrate with existing messaging system
- **Status**: Pending - Requires thread table migration first

### 4.3 `proposal-summary` (Pending)

**Bubble Step Covered**: 24 (core-create-summary-of-proposal)

**Purpose**: Generate and send proposal summary to host

**Actions**:
- `create-summary` - Generate summary text
- `send-to-host` - Deliver via preferred channel

**Implementation Notes**:
- Could use AI Gateway for summary generation
- Needs host notification preferences
- **Status**: Pending

### 4.4 `proposal-suggestions` (Pending)

**Bubble Steps Covered**: 25-26

**Actions**:
- `suggest-weekly-match` - Find perfect weekly schedule matches
- `suggest-same-address` - Find other listings at same address

**Logic**:
```
FOR EACH listing where address matches AND availability complements:
    Create suggestion proposal with origin_proposal_id link
```

**Implementation Notes**:
- Complex query across listings
- May be computationally expensive
- Consider batch processing
- **Status**: Pending - Lower priority

### 4.5 Async Trigger Mechanism

When Phase 4 is implemented, the async workflows will be triggered via:

```typescript
// In actions/create.ts after main creation

async function triggerAsyncWorkflow(
  functionName: string,
  payload: Record<string, unknown>
): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  try {
    // Fire-and-forget async call
    fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ action: 'process', payload }),
    }).catch(err => console.error(`Async ${functionName} failed:`, err));
  } catch (error) {
    // Non-blocking - log and continue
    console.error(`Failed to trigger ${functionName}:`, error);
  }
}
```

---

## Database Schema Alignment

### Current Tables Used

| Table | Usage | RLS |
|-------|-------|-----|
| `proposal` | Main proposal storage | Disabled |
| `user` | Guest and host users | Disabled |
| `listing` | Property data | Disabled |
| `account_host` | Host account linking | Disabled |
| `rentalapplication` | Application status | Disabled |
| `os_proposal_status` | Status lookup | Public read |
| `os_days` | Day references | Public read |
| `os_nights` | Night references | Public read |
| `os_stay_periods` | Duration options | Public read |
| `os_gender_type` | Gender preferences | Public read |

### Field Mapping: Bubble → Supabase

| Bubble Field | Supabase Column | Type |
|--------------|-----------------|------|
| `listing` | `Listing` | text (FK) |
| `guest` | `Guest` | text (FK) |
| `proposal price` | `proposal nightly price` | numeric |
| `move in start range` | `Move in range start` | text |
| `move in end range` | `Move in range end` | text |
| `days selected` | `Days Selected` | jsonb[] |
| `nights selected` | `Nights Selected (Nights list)` | jsonb[] |
| `reservation span(weeks)` | `Reservation Span (Weeks)` | integer |
| `reservation span` | `Reservation Span` | text |
| `estimated booking total` | `Total Price for Reservation (guest)` | numeric |
| `guest flexibility` | `Guest flexibility` | text |
| `preferred gender` | `preferred gender` | text |
| `status` | `Status` | text (FK to os_proposal_status.name) |

---

## API Specification

### Endpoint

```
POST /functions/v1/proposal
```

### Actions

#### `create`

**Request**:
```json
{
  "action": "create",
  "payload": {
    "listing_id": "1733407200000x123456789",
    "guest_id": "1733407200000x987654321",
    "estimated_booking_total": 1500,
    "guest_flexibility": "Very flexible with dates",
    "preferred_gender": "any",
    "move_in_start_range": "2025-01-15",
    "move_in_end_range": "2025-01-31",
    "reservation_span_weeks": 4,
    "reservation_span": "1_month",
    "days_selected": [2, 3, 4, 5, 6],
    "nights_selected": [1, 2, 3, 4],
    "check_in": 2,
    "check_out": 6,
    "proposal_price": 75,
    "comment": "Looking forward to staying!",
    "need_for_space": "Remote work",
    "about_me": "Software engineer from SF"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "proposal_id": "1733407200000x111222333",
    "status": "host_review",
    "order_ranking": 3,
    "listing_id": "1733407200000x123456789",
    "guest_id": "1733407200000x987654321",
    "host_id": "1733407200000x444555666",
    "created_at": "2025-01-10T15:30:00.000Z"
  }
}
```

#### `update`

**Request**:
```json
{
  "action": "update",
  "payload": {
    "proposal_id": "1733407200000x111222333",
    "status": "host_counteroffer",
    "hc_nightly_price": 80,
    "hc_nights_selected": [1, 2, 3]
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "proposal_id": "1733407200000x111222333",
    "status": "host_counteroffer",
    "updated_fields": ["status", "hc_nightly_price", "hc_nights_selected"],
    "updated_at": "2025-01-11T10:00:00.000Z"
  }
}
```

#### `get`

**Request**:
```json
{
  "action": "get",
  "payload": {
    "proposal_id": "1733407200000x111222333"
  }
}
```

#### `delete`

**Request**:
```json
{
  "action": "delete",
  "payload": {
    "proposal_id": "1733407200000x111222333",
    "reason": "Changed plans"
  }
}
```

---

## Testing Strategy

### Unit Tests

| Test | Description |
|------|-------------|
| `validators.test.ts` | Input validation for create/update |
| `calculations.test.ts` | Compensation, dates, complementary nights |
| `status.test.ts` | Status transitions, initial status |
| `dayConversion.test.ts` | Bubble ↔ JS day conversion |

### Integration Tests

| Test | Description |
|------|-------------|
| `create.integration.ts` | Full create flow with DB |
| `update.integration.ts` | Update flow with auth checks |
| `status-transitions.ts` | All valid/invalid transitions |

### Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Invalid listing ID | 400 ValidationError |
| Invalid guest ID | 400 ValidationError |
| Duplicate proposal | Allow (no duplicate check per Bubble) |
| Terminal status update | 400 ValidationError |
| Invalid status transition | 400 ValidationError |
| Unauthorized update | 401 AuthenticationError |

---

## Migration Strategy

### Phase A: Parallel Running

1. Deploy Edge Function alongside Bubble workflow
2. Frontend calls Edge Function
3. Edge Function syncs to Supabase
4. Monitor for discrepancies

### Phase B: Cutover

1. Disable Bubble workflow triggers
2. All traffic through Edge Function
3. Bubble becomes read-only for proposals

### Phase C: Cleanup

1. Remove Bubble workflow dependencies
2. Clean up sync logic
3. Full Supabase-native operation

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data inconsistency during migration | Medium | High | Parallel running, validation checks |
| Missing business logic | Medium | High | Comprehensive Bubble workflow analysis |
| Performance degradation | Low | Medium | Query optimization, indexing |
| Thread management complexity | High | Medium | Defer to Phase 4, separate function |
| Day index confusion | High | High | Strict conversion at boundaries |

---

## Summary Checklist

### Phase 1: Core Infrastructure
- [ ] Create directory structure
- [ ] Implement type definitions
- [ ] Implement day conversion utilities
- [ ] Implement validation utilities
- [ ] Implement calculation utilities
- [ ] Implement status management
- [ ] Update config.toml

### Phase 2: Create Proposal
- [ ] Implement create action handler
- [ ] Add Bubble ID generator
- [ ] Test with sample data
- [ ] Integration tests

### Phase 3: Update Proposal
- [ ] Implement update action handler
- [ ] Add authorization checks
- [ ] Status transition validation
- [ ] Integration tests

### Phase 4: Async Workflows (Pending)
- [ ] `proposal-communications` - Thread & notifications
- [ ] `proposal-summary` - Host summary generation
- [ ] `proposal-suggestions` - Match suggestions
- [ ] Async trigger mechanism

---

**Document Status**: Complete
**Next Step**: Begin Phase 1 implementation
**Owner**: TBD
**Review Date**: TBD
