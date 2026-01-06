# Functional Programming Refactoring Plan for Supabase Edge Functions

**Created**: 2026-01-06T16:30:00
**Classification**: CLEANUP
**Scope**: All Supabase Edge Functions in `supabase/functions/`
**Complexity**: HIGH - Multi-file architectural refactoring

---

## Executive Summary

This plan outlines a comprehensive refactoring of Supabase Edge Functions to align with functional programming (FP) principles. The current codebase has a solid foundation (NO_FALLBACK principle, pure calculation functions) but contains numerous opportunities for improvement in purity, immutability, explicit dependencies, and error handling patterns.

### Current State Overview

The codebase already follows some good practices:
- **NO_FALLBACK principle** documented and partially enforced
- **Pure calculation functions** in `proposal/lib/calculations.ts`
- **Status logic** using declarative data structures
- **Separate validation** in dedicated modules

However, significant FP violations exist:
- **Throwing exceptions** for control flow instead of Result types
- **Mutable state** in handlers (building update objects imperatively)
- **Implicit dependencies** (accessing `Deno.env` throughout functions)
- **Mixed I/O and logic** in handler functions
- **Side effects** scattered throughout business logic
- **Class-based patterns** with mutable internal state (ErrorCollector)

### Expected Outcomes

1. **Pure business logic** completely separated from I/O
2. **Result types** replacing thrown exceptions in business logic
3. **Explicit dependency injection** for all external services
4. **Immutable data transformations** using functional patterns
5. **Composable utilities** that can be easily tested and reused

---

## Current State Analysis

### 1. Files Inventory

#### Shared Utilities (`_shared/`)

| File | Lines | FP Score | Key Issues |
|------|-------|----------|------------|
| `errors.ts` | 85 | 6/10 | Exceptions as control flow; console.log side effect in `formatErrorResponse` |
| `validation.ts` | 82 | 4/10 | All functions throw exceptions; no Result types |
| `cors.ts` | 11 | 9/10 | Pure constant export - good |
| `types.ts` | 58 | 10/10 | Pure type definitions - excellent |
| `aiTypes.ts` | ~50 | 10/10 | Pure type definitions - excellent |
| `slack.ts` | 278 | 3/10 | ErrorCollector class with mutable state; direct env access; side effects |
| `queueSync.ts` | 258 | 5/10 | Mixed pure helpers and impure async functions; direct env access |
| `jsonUtils.ts` | ~30 | 8/10 | Mostly pure parsing utilities |
| `openai.ts` | ~100 | 5/10 | Implicit dependencies; async I/O mixed with logic |
| `bubbleSync.ts` | ~200 | 4/10 | Class with mutable state; mixed concerns |

#### Edge Function Routers

| File | Lines | FP Score | Key Issues |
|------|-------|----------|------------|
| `proposal/index.ts` | 210 | 4/10 | Mutable `collector`; imperative control flow; env access |
| `listing/index.ts` | 189 | 4/10 | Same pattern as proposal |
| `auth-user/index.ts` | 190 | 4/10 | Same pattern |
| `bubble_sync/index.ts` | 189 | 4/10 | Same pattern |
| `ai-gateway/index.ts` | 138 | 5/10 | Cleaner but same issues |

#### Handler Functions

| File | Lines | FP Score | Key Issues |
|------|-------|----------|------------|
| `proposal/actions/create.ts` | 563 | 3/10 | **CRITICAL**: 500+ line function; mutable data building; mixed I/O and logic |
| `proposal/actions/update.ts` | 360 | 4/10 | Mutable `updates` object; imperative conditionals |
| `proposal/actions/get.ts` | ~100 | 6/10 | Simpler but still mixed concerns |
| `listing/handlers/create.ts` | 157 | 5/10 | Better but mutable listingData |
| `auth-user/handlers/login.ts` | 137 | 5/10 | Exception-based flow; mutable assignments |
| `auth-user/handlers/signup.ts` | 333 | 3/10 | **CRITICAL**: Complex mutation; cleanup side effects |

#### Library Functions (Better Examples)

| File | Lines | FP Score | Key Issues |
|------|-------|----------|------------|
| `proposal/lib/calculations.ts` | 295 | 8/10 | **GOOD**: Mostly pure functions; some console.warn |
| `proposal/lib/status.ts` | 306 | 9/10 | **EXCELLENT**: Declarative data; pure predicates |
| `proposal/lib/validators.ts` | 416 | 4/10 | Throws exceptions; could return validation results |
| `bubble_sync/lib/queueManager.ts` | 403 | 5/10 | Some pure utilities; async I/O |
| `bubble_sync/lib/fieldMapping.ts` | ~50 | 9/10 | Pure transformations |
| `bubble_sync/lib/tableMapping.ts` | ~50 | 9/10 | Pure transformations |

### 2. Pattern Analysis

#### Anti-Pattern: Throwing Exceptions for Validation

**Current Pattern** (in `_shared/validation.ts`):
```typescript
export function validateEmail(email: string): void {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError(`Invalid email format: ${email}`);
  }
}
```

**FP Issue**: Uses exceptions for expected validation failures - not pure.

#### Anti-Pattern: Mutable State Building

**Current Pattern** (in `proposal/actions/update.ts`):
```typescript
const updates: Record<string, unknown> = {};
const updatedFields: string[] = [];

if (input.status !== undefined && input.status !== proposalData.Status) {
  updates.Status = input.status;
  updatedFields.push("status");
}
// ... 100+ more lines of conditionals mutating updates
```

**FP Issue**: Imperatively building mutable objects.

#### Anti-Pattern: Mixed I/O and Logic

**Current Pattern** (in `proposal/actions/create.ts`):
```typescript
export async function handleCreate(payload, user, supabase) {
  // 1. Validation (pure-ish, throws)
  validateCreateProposalInput(input);

  // 2. Database fetch (I/O)
  const { data: listing } = await supabase.from("listing")...

  // 3. Business logic (pure)
  const compensation = calculateCompensation(...);

  // 4. Database write (I/O)
  await supabase.from("proposal").insert(proposalData);

  // 5. More I/O mixed in
  await addUserProposal(supabase, input.guestId, proposalId, 'guest');

  // 6. Yet more I/O
  await enqueueBubbleSync(...);
}
```

**FP Issue**: 500+ lines mixing pure logic, validation, and I/O.

#### Anti-Pattern: Class with Mutable State

**Current Pattern** (in `_shared/slack.ts`):
```typescript
export class ErrorCollector {
  private errors: CollectedError[] = [];  // Mutable array

  add(error: Error, context?: string): void {
    this.errors.push({...});  // Mutation
  }
}
```

**FP Issue**: Mutable internal state; side effects.

#### Anti-Pattern: Implicit Dependencies

**Current Pattern** (throughout):
```typescript
const supabaseUrl = Deno.env.get("SUPABASE_URL");
// Used deep inside functions without explicit passing
```

**FP Issue**: Hidden dependencies make functions impure and hard to test.

### 3. Existing Good Patterns

#### Pure Calculations (`proposal/lib/calculations.ts`):
```typescript
export function calculateCompensation(
  rentalType: RentalType,
  reservationSpan: ReservationSpan,
  nightsPerWeek: number,
  // ... explicit parameters
): CompensationResult {
  // Pure calculation
  return { total_compensation: roundToTwoDecimals(totalCompensation), ... };
}
```

#### Declarative Status Rules (`proposal/lib/status.ts`):
```typescript
export const STATUS_TRANSITIONS: Record<ProposalStatusName, ProposalStatusName[]> = {
  "Host Review": [
    "Host Counteroffer Submitted / Awaiting Guest Review",
    "Proposal or Counteroffer Accepted / Drafting Lease Documents",
    // ...
  ],
  // ...
};
```

---

## Target State Definition

### Core FP Principles to Apply

1. **Pure Functions**: Business logic returns results without side effects
2. **Immutability**: Data transformations create new objects, never mutate
3. **Explicit Dependencies**: All dependencies passed as parameters
4. **Result Types**: Validation/operations return `Result<T, E>` instead of throwing
5. **Declarative Over Imperative**: Use map/filter/reduce instead of loops with mutation
6. **I/O at the Edges**: All I/O pushed to the outer shell

### Target Architecture

```
Edge Function Request
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│                    ROUTER (Impure Shell)                  │
│  - Parse request                                          │
│  - Get dependencies from environment                      │
│  - Call pure handlers with explicit deps                  │
│  - Handle Response formatting                             │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│                   HANDLER (Orchestrator)                  │
│  - Receives explicit dependencies                         │
│  - Coordinates I/O operations                             │
│  - Calls pure business logic                              │
│  - Returns Result types                                   │
└──────────────────────┬───────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  VALIDATORS  │ │ CALCULATORS  │ │ TRANSFORMERS │
│  (Pure)      │ │ (Pure)       │ │ (Pure)       │
│  Returns     │ │ Returns      │ │ Returns      │
│  Result<T,E> │ │ values       │ │ new objects  │
└──────────────┘ └──────────────┘ └──────────────┘

         │
         ▼
┌──────────────────────────────────────────────────────────┐
│                    I/O LAYER (Impure)                     │
│  - Database operations                                    │
│  - External API calls                                     │
│  - Logging/Slack                                          │
└──────────────────────────────────────────────────────────┘
```

### New Type Definitions

```typescript
// _shared/result.ts (NEW FILE)

export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export const ok = <T>(data: T): Result<T, never> =>
  ({ success: true, data });

export const err = <E>(error: E): Result<never, E> =>
  ({ success: false, error });

export const isOk = <T, E>(result: Result<T, E>): result is { success: true; data: T } =>
  result.success;

export const isErr = <T, E>(result: Result<T, E>): result is { success: false; error: E } =>
  !result.success;

// Chain operations on Results
export const map = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> =>
  result.success ? ok(fn(result.data)) : result;

export const flatMap = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> =>
  result.success ? fn(result.data) : result;

export const mapError = <T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> =>
  result.success ? result : err(fn(result.error));
```

---

## File-by-File Action Plan

### Phase 1: Foundation - New Utility Files

#### File: `supabase/functions/_shared/result.ts` (NEW)
**Required Changes**: Create new file with Result type and utilities
**Dependencies**: None
**Verification**: Unit tests pass

```typescript
// Full implementation above
```

#### File: `supabase/functions/_shared/fp-utils.ts` (NEW)
**Required Changes**: Create pure utility functions
**Dependencies**: None
**Verification**: Unit tests pass

```typescript
// Immutable object spread helper
export const merge = <T extends object>(...objects: T[]): T =>
  Object.assign({}, ...objects) as T;

// Conditional field setter (returns new object)
export const setIf = <T extends object, K extends keyof T>(
  obj: T,
  key: K,
  value: T[K] | undefined,
  condition: boolean = value !== undefined
): T =>
  condition ? { ...obj, [key]: value } : obj;

// Build object from array of conditional entries
export const buildObject = <T>(
  entries: Array<[keyof T, T[keyof T], boolean] | [keyof T, T[keyof T]]>
): Partial<T> =>
  entries.reduce((acc, entry) => {
    const [key, value, condition = true] = entry;
    return condition && value !== undefined ? { ...acc, [key]: value } : acc;
  }, {} as Partial<T>);

// Pipe functions left to right
export const pipe = <T>(...fns: Array<(arg: T) => T>) =>
  (initial: T): T => fns.reduce((acc, fn) => fn(acc), initial);

// Compose functions right to left
export const compose = <T>(...fns: Array<(arg: T) => T>) =>
  (initial: T): T => fns.reduceRight((acc, fn) => fn(acc), initial);
```

#### File: `supabase/functions/_shared/config.ts` (NEW)
**Required Changes**: Centralize environment configuration
**Dependencies**: None
**Verification**: All env vars accessible through explicit config

```typescript
export interface EdgeFunctionConfig {
  supabase: {
    url: string;
    anonKey: string;
    serviceKey: string;
  };
  bubble: {
    baseUrl: string;
    apiKey: string;
  };
  slack: {
    databaseWebhook: string | null;
    acquisitionWebhook: string | null;
    generalWebhook: string | null;
    botToken: string | null;
  };
  openai: {
    apiKey: string;
  };
}

export const loadConfig = (): Result<EdgeFunctionConfig, string> => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return err("Missing required Supabase environment variables");
  }

  return ok({
    supabase: {
      url: supabaseUrl,
      anonKey: supabaseAnonKey || "",
      serviceKey: supabaseServiceKey,
    },
    bubble: {
      baseUrl: Deno.env.get("BUBBLE_API_BASE_URL") || "",
      apiKey: Deno.env.get("BUBBLE_API_KEY") || "",
    },
    slack: {
      databaseWebhook: Deno.env.get("SLACK_WEBHOOK_DATABASE_WEBHOOK") || null,
      acquisitionWebhook: Deno.env.get("SLACK_WEBHOOK_ACQUISITION") || null,
      generalWebhook: Deno.env.get("SLACK_WEBHOOK_DB_GENERAL") || null,
      botToken: Deno.env.get("SLACK_BOT_TOKEN") || null,
    },
    openai: {
      apiKey: Deno.env.get("OPENAI_API_KEY") || "",
    },
  });
};
```

### Phase 2: Refactor Validation to Return Results

#### File: `supabase/functions/_shared/validation.ts`
**Current State**: All functions throw ValidationError
**Required Changes**: Create parallel Result-returning functions

```typescript
// ADD new Result-returning validators (keep old for backwards compatibility)
import { Result, ok, err } from './result.ts';

export interface ValidationFailure {
  field: string;
  message: string;
  value?: unknown;
}

// New Result-returning validators
export const validateEmailResult = (
  email: string
): Result<string, ValidationFailure> => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email)
    ? ok(email)
    : err({ field: 'email', message: `Invalid email format`, value: email });
};

export const validateRequiredResult = <T>(
  value: T | undefined | null,
  fieldName: string
): Result<T, ValidationFailure> =>
  value !== undefined && value !== null && value !== ''
    ? ok(value as T)
    : err({ field: fieldName, message: `${fieldName} is required` });

export const validateRequiredFieldsResult = (
  obj: Record<string, unknown>,
  requiredFields: string[]
): Result<Record<string, unknown>, ValidationFailure[]> => {
  const failures: ValidationFailure[] = [];

  for (const field of requiredFields) {
    if (!(field in obj) || obj[field] === undefined || obj[field] === null || obj[field] === '') {
      failures.push({ field, message: `Missing required field: ${field}` });
    }
  }

  return failures.length === 0 ? ok(obj) : err(failures);
};

export const validateActionResult = (
  action: string,
  allowedActions: readonly string[]
): Result<string, ValidationFailure> =>
  allowedActions.includes(action)
    ? ok(action)
    : err({
        field: 'action',
        message: `Unknown action: ${action}. Allowed: ${allowedActions.join(', ')}`,
        value: action
      });
```

**Dependencies**: `result.ts`
**Verification**: Both old throwing and new Result functions work; tests pass

### Phase 3: Refactor Proposal Validators

#### File: `supabase/functions/proposal/lib/validators.ts`
**Current State**: Functions throw ValidationError
**Required Changes**: Add Result-returning versions

```typescript
import { Result, ok, err } from '../../_shared/result.ts';
import { ValidationFailure } from '../../_shared/validation.ts';
import { CreateProposalInput, UpdateProposalInput } from './types.ts';

// Pure validation result type
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationFailure[];
}

// Pure day index validator
const isValidDayIndex = (day: number): boolean =>
  Number.isInteger(day) && day >= 0 && day <= 6;

const areValidDayIndices = (days: number[]): boolean =>
  Array.isArray(days) && days.every(isValidDayIndex);

// Pure date validator
const isValidIsoDate = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
};

// New Result-returning validator
export const validateCreateProposalInputResult = (
  input: unknown
): Result<CreateProposalInput, ValidationFailure[]> => {
  const errors: ValidationFailure[] = [];
  const data = input as Record<string, unknown>;

  // Required identifiers
  if (!data.listingId || typeof data.listingId !== 'string') {
    errors.push({ field: 'listingId', message: 'listingId is required and must be a string' });
  }
  if (!data.guestId || typeof data.guestId !== 'string') {
    errors.push({ field: 'guestId', message: 'guestId is required and must be a string' });
  }

  // Pricing validation
  if (typeof data.estimatedBookingTotal !== 'number' || data.estimatedBookingTotal < 0) {
    errors.push({ field: 'estimatedBookingTotal', message: 'estimatedBookingTotal must be a non-negative number' });
  }

  // Date validation
  if (!data.moveInStartRange || !isValidIsoDate(data.moveInStartRange as string)) {
    errors.push({ field: 'moveInStartRange', message: 'moveInStartRange must be a valid ISO date' });
  }
  if (!data.moveInEndRange || !isValidIsoDate(data.moveInEndRange as string)) {
    errors.push({ field: 'moveInEndRange', message: 'moveInEndRange must be a valid ISO date' });
  }

  // Day/Night selection
  if (!Array.isArray(data.daysSelected) || !areValidDayIndices(data.daysSelected as number[])) {
    errors.push({ field: 'daysSelected', message: 'daysSelected must be array of integers 0-6' });
  }
  if (!Array.isArray(data.nightsSelected) || !areValidDayIndices(data.nightsSelected as number[])) {
    errors.push({ field: 'nightsSelected', message: 'nightsSelected must be array of integers 0-6' });
  }

  // ... (continue for all fields)

  return errors.length === 0
    ? ok(data as unknown as CreateProposalInput)
    : err(errors);
};
```

**Dependencies**: `_shared/result.ts`, `_shared/validation.ts`
**Verification**: Tests pass for both old and new validators

### Phase 4: Refactor ErrorCollector to Functional Pattern

#### File: `supabase/functions/_shared/slack.ts`
**Current State**: Class with mutable state
**Required Changes**: Replace with immutable functional pattern

```typescript
// NEW: Immutable error collection pattern

export interface ErrorLogEntry {
  readonly error: Error;
  readonly context?: string;
  readonly timestamp: string;
}

export interface ErrorLog {
  readonly functionName: string;
  readonly action: string;
  readonly requestId: string;
  readonly startTime: string;
  readonly userId?: string;
  readonly entries: readonly ErrorLogEntry[];
}

// Pure function to create initial log
export const createErrorLog = (
  functionName: string,
  action: string
): ErrorLog => ({
  functionName,
  action,
  requestId: crypto.randomUUID().slice(0, 8),
  startTime: new Date().toISOString(),
  entries: [],
});

// Pure function to add error (returns new log)
export const addError = (
  log: ErrorLog,
  error: Error,
  context?: string
): ErrorLog => ({
  ...log,
  entries: [
    ...log.entries,
    { error, context, timestamp: new Date().toISOString() }
  ],
});

// Pure function to set user context
export const setLogUserId = (log: ErrorLog, userId: string): ErrorLog => ({
  ...log,
  userId,
});

// Pure function to format message
export const formatErrorLogMessage = (log: ErrorLog): string => {
  if (log.entries.length === 0) return '';

  const lines: string[] = [
    `[Edge Function Error] ${log.functionName}/${log.action}`,
    '',
    `Request ID: ${log.requestId}`,
    `Timestamp: ${log.startTime}`,
  ];

  if (log.userId) lines.push(`User ID: ${log.userId}`);
  lines.push('');

  if (log.entries.length === 1) {
    const entry = log.entries[0];
    lines.push(`Error Type: ${entry.error.name}`);
    lines.push(`Message: ${entry.error.message}`);
    if (entry.context) lines.push(`Context: ${entry.context}`);
  } else {
    lines.push(`Total Errors: ${log.entries.length}`);
    lines.push('');
    log.entries.slice(0, 5).forEach((entry, i) => {
      lines.push(`--- Error ${i + 1} ---`);
      lines.push(`Type: ${entry.error.name}`);
      lines.push(`Message: ${entry.error.message}`);
      if (entry.context) lines.push(`Context: ${entry.context}`);
      lines.push('');
    });
    if (log.entries.length > 5) {
      lines.push(`... and ${log.entries.length - 5} more errors`);
    }
  }

  return lines.join('\n');
};

// Impure function (isolated I/O) - only one in the module
export const sendErrorLogToSlack = (log: ErrorLog): void => {
  if (log.entries.length === 0) return;

  const webhookUrl = Deno.env.get('SLACK_WEBHOOK_DATABASE_WEBHOOK');
  if (!webhookUrl) {
    console.warn('[slack] Webhook not configured');
    return;
  }

  const message = formatErrorLogMessage(log);

  // Fire and forget
  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message }),
  }).catch(e => console.error('[slack] Send failed:', e.message));
};

// Keep old class for backwards compatibility (mark deprecated)
/** @deprecated Use createErrorLog, addError, sendErrorLogToSlack instead */
export class ErrorCollector { ... }
```

**Dependencies**: None
**Verification**: Both patterns work; no breaking changes

### Phase 5: Refactor Proposal Create Handler

This is the most complex refactoring - breaking down the 500+ line function.

#### File: `supabase/functions/proposal/actions/create.ts`
**Current State**: 563 lines, mixed I/O and logic
**Required Changes**: Extract pure logic, separate I/O

**Step 1**: Extract Pure Data Builders

```typescript
// NEW FILE: supabase/functions/proposal/lib/proposalBuilder.ts

import { CreateProposalInput, ListingData, GuestData, HostUserData } from './types.ts';
import { CompensationResult, calculateCompensation, calculateMoveOutDate, calculateComplementaryNights, calculateOrderRanking, formatPriceForDisplay, getNightlyRateForNights } from './calculations.ts';
import { determineInitialStatus, ProposalStatusName } from './status.ts';

export interface ProposalBuildContext {
  readonly input: CreateProposalInput;
  readonly listing: ListingData;
  readonly guest: GuestData;
  readonly hostUser: HostUserData;
  readonly rentalAppSubmitted: boolean;
  readonly existingProposalsCount: number;
  readonly proposalId: string;
  readonly now: Date;
}

export interface BuiltProposal {
  readonly proposalData: Readonly<Record<string, unknown>>;
  readonly compensation: CompensationResult;
  readonly status: ProposalStatusName;
  readonly orderRanking: number;
}

// Pure function to calculate all derived values
export const calculateProposalDerivedValues = (
  ctx: ProposalBuildContext
): {
  compensation: CompensationResult;
  status: ProposalStatusName;
  orderRanking: number;
  moveOutDate: Date;
  complementaryNights: number[];
} => {
  const rentalType = ((ctx.listing["rental type"] || "nightly").toLowerCase()) as RentalType;
  const nightsPerWeek = ctx.input.nightsSelected.length;
  const hostNightlyRate = getNightlyRateForNights(ctx.listing, nightsPerWeek);

  const compensation = calculateCompensation(
    rentalType,
    (ctx.input.reservationSpan || "other") as ReservationSpan,
    nightsPerWeek,
    ctx.listing["💰Weekly Host Rate"] || 0,
    hostNightlyRate,
    ctx.input.reservationSpanWeeks,
    ctx.listing["💰Monthly Host Rate"] || 0
  );

  const moveOutDate = calculateMoveOutDate(
    new Date(ctx.input.moveInStartRange),
    ctx.input.reservationSpanWeeks,
    nightsPerWeek
  );

  const complementaryNights = calculateComplementaryNights(
    ctx.listing["Nights Available (List of Nights) "] || [],
    ctx.input.nightsSelected
  );

  const orderRanking = calculateOrderRanking(ctx.existingProposalsCount);

  const status = determineInitialStatus(
    !!ctx.guest["Rental Application"],
    ctx.rentalAppSubmitted,
    ctx.input.status as ProposalStatusName | undefined
  );

  return { compensation, status, orderRanking, moveOutDate, complementaryNights };
};

// Pure function to build proposal record
export const buildProposalRecord = (ctx: ProposalBuildContext): BuiltProposal => {
  const { compensation, status, orderRanking, moveOutDate, complementaryNights } =
    calculateProposalDerivedValues(ctx);

  const historyEntry = `Proposal created on ${ctx.now.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })}`;

  const guestFlexibility = ctx.input.guestFlexibility || "Flexible";
  const preferredGender = ctx.input.preferredGender || "any";

  const proposalData = {
    _id: ctx.proposalId,
    Listing: ctx.input.listingId,
    Guest: ctx.input.guestId,
    "Host User": ctx.hostUser._id,
    "Created By": ctx.input.guestId,
    "Guest email": ctx.guest.email,
    "Guest flexibility": guestFlexibility,
    "preferred gender": preferredGender,
    "need for space": ctx.input.needForSpace || null,
    about_yourself: ctx.input.aboutMe || null,
    special_needs: ctx.input.specialNeeds || null,
    Comment: ctx.input.comment || null,
    "Move in range start": ctx.input.moveInStartRange,
    "Move in range end": ctx.input.moveInEndRange,
    "Move-out": moveOutDate.toISOString(),
    "Reservation Span": ctx.input.reservationSpan,
    "Reservation Span (Weeks)": ctx.input.reservationSpanWeeks,
    "duration in months": compensation.duration_months,
    "Days Selected": ctx.input.daysSelected,
    "Nights Selected (Nights list)": ctx.input.nightsSelected,
    "nights per week (num)": ctx.input.nightsSelected.length,
    "check in day": ctx.input.checkIn,
    "check out day": ctx.input.checkOut,
    "Complementary Nights": complementaryNights,
    "proposal nightly price": ctx.input.proposalPrice,
    "4 week rent": ctx.input.fourWeekRent || compensation.four_week_rent,
    "Total Price for Reservation (guest)": ctx.input.estimatedBookingTotal,
    "Total Compensation (proposal - host)": compensation.total_compensation,
    "host compensation": compensation.host_compensation_per_night,
    Status: status,
    "Order Ranking": orderRanking,
    History: [historyEntry],
    "Is Finalized": false,
    Deleted: false,
    "Created Date": ctx.now.toISOString(),
    "Modified Date": ctx.now.toISOString(),
    // ... (rest of fields)
  };

  return { proposalData, compensation, status, orderRanking };
};
```

**Step 2**: Extract I/O Operations

```typescript
// NEW FILE: supabase/functions/proposal/lib/proposalRepository.ts

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Result, ok, err } from '../../_shared/result.ts';
import { ListingData, GuestData, HostUserData, RentalApplicationData } from './types.ts';

export interface ProposalDependencies {
  listing: ListingData;
  guest: GuestData;
  hostUser: HostUserData;
  rentalApp: RentalApplicationData | null;
}

// Fetch all dependencies for proposal creation
export const fetchProposalDependencies = async (
  supabase: SupabaseClient,
  listingId: string,
  guestId: string
): Promise<Result<ProposalDependencies, string>> => {
  // Fetch listing
  const { data: listing, error: listingError } = await supabase
    .from("listing")
    .select(/* fields */)
    .eq("_id", listingId)
    .single();

  if (listingError || !listing) {
    return err(`Listing not found: ${listingId}`);
  }

  if (listing.Deleted === true) {
    return err(`Cannot create proposal for deleted listing: ${listingId}`);
  }

  // Fetch guest
  const { data: guest, error: guestError } = await supabase
    .from("user")
    .select(/* fields */)
    .eq("_id", guestId)
    .single();

  if (guestError || !guest) {
    return err(`Guest not found: ${guestId}`);
  }

  // Fetch host user
  const { data: hostUser, error: hostUserError } = await supabase
    .from("user")
    .select('_id, email, "Proposals List"')
    .eq("_id", listing["Host User"])
    .single();

  if (hostUserError || !hostUser) {
    return err(`Host user not found: ${listing["Host User"]}`);
  }

  // Fetch rental application (optional)
  let rentalApp: RentalApplicationData | null = null;
  if (guest["Rental Application"]) {
    const { data: app } = await supabase
      .from("rentalapplication")
      .select("_id, submitted")
      .eq("_id", guest["Rental Application"])
      .single();
    rentalApp = app;
  }

  return ok({
    listing: listing as ListingData,
    guest: guest as GuestData,
    hostUser: hostUser as HostUserData,
    rentalApp,
  });
};

// Generate proposal ID
export const generateProposalId = async (
  supabase: SupabaseClient
): Promise<Result<string, string>> => {
  const { data: proposalId, error } = await supabase.rpc('generate_bubble_id');
  if (error || !proposalId) {
    return err('Failed to generate proposal ID');
  }
  return ok(proposalId);
};

// Insert proposal record
export const insertProposal = async (
  supabase: SupabaseClient,
  proposalData: Record<string, unknown>
): Promise<Result<void, string>> => {
  const { error } = await supabase.from("proposal").insert(proposalData);
  if (error) {
    return err(`Failed to create proposal: ${error.message}`);
  }
  return ok(undefined);
};
```

**Step 3**: Refactor Main Handler

```typescript
// REFACTORED: supabase/functions/proposal/actions/create.ts

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Result, ok, err, isErr } from '../../_shared/result.ts';
import { CreateProposalInput, CreateProposalResponse, UserContext } from "../lib/types.ts";
import { validateCreateProposalInputResult } from "../lib/validators.ts";
import { buildProposalRecord, ProposalBuildContext } from '../lib/proposalBuilder.ts';
import { fetchProposalDependencies, generateProposalId, insertProposal } from '../lib/proposalRepository.ts';
import { enqueueBubbleSync, triggerQueueProcessing } from "../lib/bubbleSyncQueue.ts";
import { addUserProposal, addUserListingFavorite } from "../../_shared/junctionHelpers.ts";
import { parseJsonArray } from "../../_shared/jsonUtils.ts";

export async function handleCreate(
  payload: Record<string, unknown>,
  user: UserContext | null,
  supabase: SupabaseClient
): Promise<Result<CreateProposalResponse, string>> {
  console.log(`[proposal:create] Starting create for user: ${user?.email || 'public'}`);

  // Step 1: Validate input (pure, returns Result)
  const validationResult = validateCreateProposalInputResult(payload);
  if (isErr(validationResult)) {
    const errorMessages = validationResult.error.map(e => e.message).join('; ');
    return err(`Validation failed: ${errorMessages}`);
  }
  const input = validationResult.data;

  // Step 2: Fetch dependencies (I/O)
  const depsResult = await fetchProposalDependencies(supabase, input.listingId, input.guestId);
  if (isErr(depsResult)) {
    return depsResult;
  }
  const { listing, guest, hostUser, rentalApp } = depsResult.data;

  // Step 3: Generate ID (I/O)
  const idResult = await generateProposalId(supabase);
  if (isErr(idResult)) {
    return idResult;
  }
  const proposalId = idResult.data;

  // Step 4: Build proposal record (pure)
  const existingProposals: string[] = guest["Proposals List"] || [];
  const buildContext: ProposalBuildContext = {
    input,
    listing,
    guest,
    hostUser,
    rentalAppSubmitted: rentalApp?.submitted ?? false,
    existingProposalsCount: existingProposals.length,
    proposalId,
    now: new Date(),
  };

  const { proposalData, status, orderRanking } = buildProposalRecord(buildContext);

  // Step 5: Insert proposal (I/O)
  const insertResult = await insertProposal(supabase, proposalData);
  if (isErr(insertResult)) {
    return insertResult;
  }

  // Step 6: Update related records (I/O - fire and forget)
  await Promise.allSettled([
    updateGuestUser(supabase, input, guest, proposalId, proposalData["Modified Date"]),
    addUserProposal(supabase, input.guestId, proposalId, 'guest'),
    updateHostUser(supabase, hostUser, proposalId, proposalData["Modified Date"]),
    addUserProposal(supabase, hostUser._id, proposalId, 'host'),
    enqueueBubbleSync(supabase, { correlationId: proposalId, items: [/* ... */] }),
  ]);

  triggerQueueProcessing();

  return ok({
    proposalId,
    status,
    orderRanking,
    listingId: input.listingId,
    guestId: input.guestId,
    hostId: hostUser._id,
    createdAt: proposalData["Created Date"] as string,
  });
}
```

**Dependencies**: `result.ts`, `proposalBuilder.ts`, `proposalRepository.ts`
**Verification**: All proposal creation tests pass

### Phase 6: Refactor Update Handler with Immutable Builders

#### File: `supabase/functions/proposal/actions/update.ts`
**Current State**: Mutable `updates` object built imperatively
**Required Changes**: Use immutable object building

```typescript
// NEW FILE: supabase/functions/proposal/lib/updateBuilder.ts

import { UpdateProposalInput, ProposalData } from './types.ts';
import { buildObject } from '../../_shared/fp-utils.ts';
import { calculateComplementaryNights } from './calculations.ts';
import { parseJsonArray } from '../../_shared/jsonUtils.ts';
import { createStatusHistoryEntry, ProposalStatusName } from './status.ts';

export interface UpdateSpec {
  readonly updates: Readonly<Record<string, unknown>>;
  readonly updatedFields: readonly string[];
}

// Pure function to build update specification
export const buildProposalUpdates = (
  input: UpdateProposalInput,
  currentProposal: ProposalData,
  actor: 'guest' | 'host' | 'admin'
): UpdateSpec => {
  const now = new Date().toISOString();
  const fields: string[] = [];

  // Use buildObject for clean conditional construction
  const baseUpdates = buildObject([
    // Status transition
    ['Status', input.status, input.status !== undefined && input.status !== currentProposal.Status],

    // Pricing
    ['proposal nightly price', input.proposal_price, input.proposal_price !== undefined],

    // Dates
    ['Move in range start', input.move_in_start_range, input.move_in_start_range !== undefined],
    ['Move in range end', input.move_in_end_range, input.move_in_end_range !== undefined],

    // Day/Night selection
    ['Days Selected', input.days_selected, input.days_selected !== undefined],
    ['Nights Selected (Nights list)', input.nights_selected, input.nights_selected !== undefined],

    // Duration
    ['Reservation Span (Weeks)', input.reservation_span_weeks, input.reservation_span_weeks !== undefined],

    // Comment
    ['Comment', input.comment, input.comment !== undefined],

    // Host counteroffer fields
    ['hc nightly price', input.hc_nightly_price, input.hc_nightly_price !== undefined],
    ['counter offer happened', true, input.hc_nightly_price !== undefined],
    ['hc days selected', input.hc_days_selected, input.hc_days_selected !== undefined],
    ['hc nights selected', input.hc_nights_selected, input.hc_nights_selected !== undefined],
    ['hc move in date', input.hc_move_in_date, input.hc_move_in_date !== undefined],

    // Cancellation
    ['reason for cancellation', input.reason_for_cancellation, input.reason_for_cancellation !== undefined],

    // Always update modified date
    ['Modified Date', now, true],
  ]);

  // Track which fields were updated
  if (input.status !== undefined) fields.push('status');
  if (input.proposal_price !== undefined) fields.push('proposal_price');
  if (input.move_in_start_range !== undefined) fields.push('move_in_start_range');
  if (input.move_in_end_range !== undefined) fields.push('move_in_end_range');
  if (input.days_selected !== undefined) fields.push('days_selected');
  if (input.nights_selected !== undefined) fields.push('nights_selected');
  // ... etc

  // Handle computed fields
  let updates = { ...baseUpdates };

  // Nights count
  if (input.nights_selected !== undefined) {
    updates = {
      ...updates,
      'nights per week (num)': input.nights_selected.length,
      'Complementary Nights': calculateComplementaryNights(
        (currentProposal as Record<string, unknown>)["Days Available"] as number[] || [],
        input.nights_selected
      ),
    };
  }

  // History entry for status change
  if (input.status !== undefined && input.status !== currentProposal.Status) {
    const historyEntry = createStatusHistoryEntry(input.status as ProposalStatusName, actor);
    const currentHistory = parseJsonArray<string>(
      (currentProposal as Record<string, unknown>).History,
      "History"
    );
    updates = {
      ...updates,
      History: [...currentHistory, historyEntry],
    };
  }

  return { updates, updatedFields: fields };
};
```

### Phase 7: Refactor Router to Use Config and Result Types

#### File: `supabase/functions/proposal/index.ts`
**Current State**: Mutable collector, direct env access
**Required Changes**: Use explicit config, immutable error log

```typescript
// REFACTORED
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { loadConfig } from "../_shared/config.ts";
import { isErr } from "../_shared/result.ts";
import { createErrorLog, addError, sendErrorLogToSlack } from "../_shared/slack.ts";
import { validateActionResult, validateRequiredResult } from "../_shared/validation.ts";

import { handleCreate } from "./actions/create.ts";
import { handleUpdate } from "./actions/update.ts";
import { handleGet } from "./actions/get.ts";
import { handleSuggest } from "./actions/suggest.ts";

const ALLOWED_ACTIONS = ["create", "update", "get", "suggest"] as const;
const PUBLIC_ACTIONS = ["get", "create"] as const;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Load config (explicit dependency)
  const configResult = loadConfig();
  if (isErr(configResult)) {
    return new Response(
      JSON.stringify({ success: false, error: configResult.error }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  const config = configResult.data;

  // Parse request
  let body: { action?: string; payload?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Validate action (Result-based)
  const actionResult = validateActionResult(body.action || '', ALLOWED_ACTIONS);
  if (isErr(actionResult)) {
    return new Response(
      JSON.stringify({ success: false, error: actionResult.error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  const action = actionResult.data;

  // Initialize error log (immutable pattern)
  let errorLog = createErrorLog('proposal', action);

  try {
    const payloadResult = validateRequiredResult(body.payload, 'payload');
    if (isErr(payloadResult)) {
      return new Response(
        JSON.stringify({ success: false, error: payloadResult.error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const payload = payloadResult.data;

    // ... rest of handler logic with Result types

  } catch (error) {
    errorLog = addError(errorLog, error as Error, 'Fatal error in main handler');
    sendErrorLogToSlack(errorLog);
    // ... error response
  }
});
```

---

## Execution Order

### Priority 1: Foundation (No Breaking Changes)
1. Create `_shared/result.ts` - Result type definitions
2. Create `_shared/fp-utils.ts` - Pure utility functions
3. Create `_shared/config.ts` - Centralized configuration

### Priority 2: Add New Patterns (Parallel to Old)
4. Add Result-returning validators to `_shared/validation.ts`
5. Add Result-returning validators to `proposal/lib/validators.ts`
6. Add functional error logging pattern to `_shared/slack.ts`

### Priority 3: Extract Pure Logic
7. Create `proposal/lib/proposalBuilder.ts` - Pure proposal building
8. Create `proposal/lib/proposalRepository.ts` - I/O operations
9. Create `proposal/lib/updateBuilder.ts` - Pure update building

### Priority 4: Refactor Handlers
10. Refactor `proposal/actions/create.ts` to use new patterns
11. Refactor `proposal/actions/update.ts` to use new patterns
12. Refactor other proposal handlers

### Priority 5: Propagate to Other Functions
13. Apply same patterns to `listing/handlers/`
14. Apply same patterns to `auth-user/handlers/`
15. Apply same patterns to `bubble_sync/handlers/`
16. Apply same patterns to `ai-gateway/handlers/`

### Priority 6: Update Routers
17. Refactor all router index.ts files to use config and Result types

---

## Risk Assessment

### Potential Breaking Changes
- **LOW**: New Result types added alongside existing throw-based functions
- **MEDIUM**: Refactored handlers may have subtle behavior differences
- **HIGH**: Changing error response format could break frontend

### Mitigation Strategies
1. **Keep both patterns during transition**: Add Result-returning functions without removing throw-based ones
2. **Feature flag**: Consider environment variable to toggle between old/new patterns
3. **Comprehensive testing**: Test both happy path and error cases
4. **Gradual rollout**: Deploy to staging first, monitor for issues

### Edge Cases to Watch
- Error handling when multiple async operations fail
- JSON serialization of Result types in responses
- TypeScript type inference with Result types
- Stack trace preservation in error propagation

---

## Verification Checklist

### For Each File Change

- [ ] TypeScript compiles without errors
- [ ] Existing tests pass
- [ ] New tests added for Result types
- [ ] Manual verification of happy path
- [ ] Manual verification of error cases
- [ ] Console logs show expected flow
- [ ] Slack error reporting works
- [ ] No breaking changes to API response format

### Integration Tests

- [ ] Proposal create flow end-to-end
- [ ] Proposal update flow end-to-end
- [ ] Listing create flow end-to-end
- [ ] Auth signup flow end-to-end
- [ ] Bubble sync queue processing
- [ ] Error scenarios trigger Slack notifications

---

## Reference Appendix

### File Paths (All Modified)

**New Files:**
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\result.ts`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\fp-utils.ts`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\config.ts`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\proposal\lib\proposalBuilder.ts`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\proposal\lib\proposalRepository.ts`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\proposal\lib\updateBuilder.ts`

**Modified Files:**
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\validation.ts`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\slack.ts`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\proposal\lib\validators.ts`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\proposal\actions\create.ts`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\proposal\actions\update.ts`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\proposal\index.ts`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\listing\index.ts`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\listing\handlers\create.ts`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\auth-user\index.ts`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\auth-user\handlers\login.ts`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\auth-user\handlers\signup.ts`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\bubble_sync\index.ts`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\ai-gateway\index.ts`

### Key Pattern Examples

**Before (Throwing Exception):**
```typescript
export function validateEmail(email: string): void {
  if (!emailRegex.test(email)) {
    throw new ValidationError(`Invalid email format: ${email}`);
  }
}
```

**After (Result Type):**
```typescript
export const validateEmailResult = (email: string): Result<string, ValidationFailure> =>
  emailRegex.test(email)
    ? ok(email)
    : err({ field: 'email', message: 'Invalid email format', value: email });
```

**Before (Mutable Object Building):**
```typescript
const updates: Record<string, unknown> = {};
if (input.status !== undefined) {
  updates.Status = input.status;
}
```

**After (Immutable Building):**
```typescript
const updates = buildObject([
  ['Status', input.status, input.status !== undefined],
]);
```

**Before (Mixed I/O and Logic):**
```typescript
export async function handleCreate(payload, user, supabase) {
  validateInput(input); // throws
  const { data } = await supabase.from('x').select(); // I/O
  const result = calculate(data); // pure
  await supabase.from('y').insert(result); // I/O
}
```

**After (Separated Concerns):**
```typescript
export async function handleCreate(payload, user, supabase) {
  const validationResult = validateInputResult(payload);
  if (isErr(validationResult)) return validationResult;

  const fetchResult = await fetchDependencies(supabase, validationResult.data);
  if (isErr(fetchResult)) return fetchResult;

  const buildResult = buildRecord(fetchResult.data); // pure

  const insertResult = await insertRecord(supabase, buildResult);
  return insertResult;
}
```

---

## Relevant Documentation

- `.claude/Documentation/Backend(EDGE - Functions)/SHARED_UTILITIES.md`
- `.claude/Documentation/Backend(EDGE - Functions)/PROPOSAL.md`
- `.claude/Documentation/Backend(EDGE - Functions)/LISTING.md`
- `.claude/Documentation/Backend(EDGE - Functions)/AUTH_USER.md`
- `supabase/CLAUDE.md`

---

**VERSION**: 1.0
**ESTIMATED EFFORT**: 3-4 days
**BREAKING CHANGE RISK**: Low (additive changes)
