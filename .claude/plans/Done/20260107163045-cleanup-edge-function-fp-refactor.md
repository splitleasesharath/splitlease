# Edge Function FP Orchestration Refactoring Plan

**Created**: 2026-01-07 16:30:45
**Type**: CLEANUP
**Scope**: Supabase Edge Functions Orchestration Layer
**Objective**: Refactor edge function orchestration patterns to strictly adhere to pure functional programming principles

---

## 1. Executive Summary

### What is Being Cleaned Up
The Supabase Edge Functions codebase currently uses imperative patterns in its request/response orchestration layer. While the codebase follows good practices like "NO FALLBACK PRINCIPLE" and action-based routing, it exhibits several FP violations:

1. **Mutable state** throughout request handlers (reassigning `let` variables)
2. **Side effects mixed with logic** (console logging, error collection, Slack notifications interleaved with business logic)
3. **Imperative flow control** (switch statements with mutable result accumulation)
4. **Impure orchestration functions** that combine I/O, validation, routing, and response formatting
5. **Class-based side effect handlers** (ErrorCollector class with internal state mutation)

### Why It Needs to Change
- **Testability**: Current patterns make unit testing difficult without mocking side effects
- **Predictability**: Mutable state creates potential for subtle bugs
- **Composability**: Imperative patterns prevent clean function composition
- **Maintainability**: Mixed concerns make changes risky

### Expected Outcomes
- Pure orchestration layer with isolated side effect boundaries
- Immutable data flow through the request pipeline
- Composable handler functions that can be tested in isolation
- Clear separation between pure business logic and I/O operations

---

## 2. Current State Analysis

### 2.1 Orchestration Pattern Inventory

All edge functions follow this common structure:

```typescript
// Current Pattern (all index.ts files)
Deno.serve(async (req) => {
  // 1. Handle CORS preflight
  // 2. Validate HTTP method
  // 3. Parse request body (let body = ...)
  // 4. Create error collector (let collector = ...)
  // 5. Validate action
  // 6. Get environment variables
  // 7. Authenticate user (let user = ...)
  // 8. Create Supabase clients
  // 9. Route to handler via switch (let result = ...)
  // 10. Return success response
  // CATCH: Report errors and return error response
});
```

### 2.2 Files Affected (Full Paths)

#### Entry Points (index.ts files)
| File | FP Violations | Priority |
|------|---------------|----------|
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\auth-user\index.ts` | Mutable state (6x let), switch routing, mixed side effects | HIGH |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\proposal\index.ts` | Mutable state (5x let), switch routing, mixed side effects | HIGH |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\listing\index.ts` | Mutable state (4x let), switch routing, mixed side effects | HIGH |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\messages\index.ts` | Mutable state (5x let), switch routing, mixed side effects | HIGH |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\ai-gateway\index.ts` | Mutable state (3x let), switch routing, mixed side effects | HIGH |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\bubble_sync\index.ts` | Mutable state (5x let), switch routing, mixed side effects | HIGH |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\virtual-meeting\index.ts` | Mutable state (4x let), switch routing, mixed side effects | MEDIUM |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\send-email\index.ts` | Mutable state (3x let), switch routing, mixed side effects | MEDIUM |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\send-sms\index.ts` | Mutable state, switch routing, mixed side effects | MEDIUM |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\cohost-request\index.ts` | Mutable state, switch routing, mixed side effects | MEDIUM |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\rental-application\index.ts` | Mutable state, switch routing, mixed side effects | MEDIUM |

#### Shared Utilities
| File | FP Violations | Priority |
|------|---------------|----------|
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\slack.ts` | ErrorCollector class with mutable state | HIGH |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\bubbleSync.ts` | BubbleSyncService class with stored state | MEDIUM |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\queueSync.ts` | Procedural async functions with side effects | MEDIUM |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\validation.ts` | Validation via throwing (side effect) | LOW |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\errors.ts` | Pure - no changes needed | N/A |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\cors.ts` | Pure - no changes needed | N/A |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\types.ts` | Pure - no changes needed | N/A |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\jsonUtils.ts` | Mostly pure - minor improvements | LOW |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\openai.ts` | I/O functions (acceptable - at boundary) | LOW |

#### Handler Files (Examples - pattern applies to all)
| File | FP Violations | Priority |
|------|---------------|----------|
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\proposal\actions\create.ts` | Heavy mutable state, mixed I/O, procedural flow | HIGH |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\auth-user\handlers\login.ts` | Mutable state, mixed side effects | MEDIUM |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\bubble_sync\handlers\processQueueDataApi.ts` | Mutable accumulator, procedural loops | MEDIUM |

#### Library/Calculation Files (Already Good)
| File | Status |
|------|--------|
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\proposal\lib\calculations.ts` | PURE - No changes needed |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\proposal\lib\validators.ts` | Mostly pure - minor improvements |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\proposal\lib\status.ts` | Pure - No changes needed |

### 2.3 Specific FP Violations by Category

#### Category A: Mutable State in Entry Points
**Files**: All `index.ts` files
**Pattern**:
```typescript
// VIOLATION: Mutable state
let collector: ErrorCollector | null = null;
let action = 'unknown';
let user = null;
let result;

// Later reassigned
action = body.action;
collector = createErrorCollector('proposal', body.action);
user = { id: authUser.id, email: authUser.email || "" };
result = await handleCreate(...);
```

**Count**: ~50+ instances across 11 entry points

#### Category B: Switch Statement Routing
**Files**: All `index.ts` files
**Pattern**:
```typescript
// VIOLATION: Imperative routing with mutable accumulation
switch (body.action) {
  case "create":
    result = await handleCreate(...);
    break;
  case "update":
    result = await handleUpdate(...);
    break;
  // ... etc
}
```

**Count**: 11 switch statements

#### Category C: Mixed Side Effects in Try/Catch
**Files**: All `index.ts` files
**Pattern**:
```typescript
// VIOLATION: Side effects (logging, Slack) mixed with control flow
try {
  console.log(`[proposal] ========== REQUEST ==========`);
  // ... business logic ...
  console.log(`[proposal] ========== SUCCESS ==========`);
} catch (error) {
  console.error(`[proposal] ========== ERROR ==========`);
  collector.add(error as Error, 'Fatal error');
  collector.reportToSlack();  // Side effect in catch block
  // ...
}
```

**Count**: 11 try/catch blocks with mixed side effects

#### Category D: ErrorCollector Class State
**File**: `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\slack.ts`
**Pattern**:
```typescript
// VIOLATION: Mutable internal state
export class ErrorCollector {
  private errors: CollectedError[] = [];  // Mutated via add()
  private userId?: string;  // Mutated via setContext()

  add(error: Error, context?: string): void {
    this.errors.push({ ... });  // Mutation
  }

  setContext(options: { userId?: string }): void {
    if (options.userId) this.userId = options.userId;  // Mutation
  }
}
```

#### Category E: BubbleSyncService Class State
**File**: `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\bubbleSync.ts`
**Pattern**:
```typescript
// VIOLATION: Stored configuration state
export class BubbleSyncService {
  private bubbleBaseUrl: string;
  private bubbleApiKey: string;
  private supabaseClient: SupabaseClient;

  constructor(...) {
    // State initialized once, stored for lifetime
    this.bubbleBaseUrl = bubbleBaseUrl;
    // ...
  }
}
```

#### Category F: Validation Via Throwing
**File**: `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\validation.ts`
**Pattern**:
```typescript
// VIOLATION: Side effect (throwing) for control flow
export function validateRequired(value: any, fieldName: string): void {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${fieldName} is required`);
  }
}
```

**Note**: This is a debatable violation. Some FP purists prefer Result types, but throwing is acceptable at system boundaries.

---

## 3. Target State Definition

### 3.1 Core FP Principles to Apply

| Principle | Description | Application |
|-----------|-------------|-------------|
| **Immutability** | Data never changes after creation | Use `const`, spread operators, map/filter/reduce |
| **Pure Functions** | Same input = same output, no side effects | Business logic separate from I/O |
| **Composition** | Build complex behavior from simple functions | Pipeline/compose patterns for request flow |
| **Side Effect Isolation** | I/O pushed to boundaries | Effect system or explicit boundary functions |

### 3.2 Target Architecture

```
Request Flow (FP Style)
========================

Request → parseRequest (pure) → validateRequest (pure) → routeAction (pure) →
         ↓
         executeHandler (side effect boundary)
         ↓
Response ← formatResponse (pure) ← Result<T, Error>
         ↓
         logAndReport (side effect, isolated)
```

### 3.3 Target Patterns with Code Examples

#### Pattern 1: Immutable Request Context
```typescript
// TARGET: Immutable context built via composition
interface RequestContext {
  readonly action: string;
  readonly payload: Record<string, unknown>;
  readonly user: User | null;
  readonly supabaseClient: SupabaseClient;
  readonly correlationId: string;
}

// Pure function to build context
const buildContext = (
  parsedBody: ParsedBody,
  authResult: AuthResult,
  clients: Clients
): RequestContext => ({
  action: parsedBody.action,
  payload: parsedBody.payload,
  user: authResult.user,
  supabaseClient: clients.service,
  correlationId: crypto.randomUUID(),
});
```

#### Pattern 2: Result Type for Error Handling
```typescript
// TARGET: Result type instead of try/catch for business logic
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// Pure validation returning Result
const validateAction = (action: string, allowed: string[]): Result<string, ValidationError> =>
  allowed.includes(action)
    ? { ok: true, value: action }
    : { ok: false, error: new ValidationError(`Unknown action: ${action}`) };

// Pure composition with Results
const validateRequest = (body: unknown): Result<ValidatedRequest, ValidationError> =>
  pipe(
    parseBody(body),
    chain(validateAction),
    chain(validatePayload)
  );
```

#### Pattern 3: Action Router as Pure Function
```typescript
// TARGET: Pure routing via handler map
type Handler = (ctx: RequestContext) => Promise<Result<unknown>>;

const handlers: Record<string, Handler> = {
  create: handleCreate,
  update: handleUpdate,
  get: handleGet,
};

// Pure function to get handler
const getHandler = (action: string): Result<Handler, ValidationError> => {
  const handler = handlers[action];
  return handler
    ? { ok: true, value: handler }
    : { ok: false, error: new ValidationError(`Unknown action: ${action}`) };
};
```

#### Pattern 4: Functional Error Collection
```typescript
// TARGET: Immutable error collection via functions
interface ErrorLog {
  readonly errors: ReadonlyArray<CollectedError>;
  readonly functionName: string;
  readonly action: string;
  readonly correlationId: string;
}

// Pure function to add error
const addError = (log: ErrorLog, error: Error, context?: string): ErrorLog => ({
  ...log,
  errors: [...log.errors, { error, context, timestamp: new Date().toISOString() }],
});

// Create log (pure)
const createErrorLog = (fn: string, action: string, correlationId: string): ErrorLog => ({
  errors: [],
  functionName: fn,
  action,
  correlationId,
});
```

#### Pattern 5: Side Effect Boundary
```typescript
// TARGET: Explicit side effect boundary at top level only
const serve = (
  effectHandlers: EffectHandlers,
  requestPipeline: RequestPipeline
) =>
  Deno.serve(async (req) => {
    // EFFECT BOUNDARY - all side effects happen here
    const startTime = Date.now();

    // Pure pipeline execution
    const result = await requestPipeline(req);

    // Side effects isolated at boundary
    effectHandlers.log(result, startTime);
    if (!result.ok) {
      effectHandlers.reportError(result.error);
    }

    return formatResponse(result);
  });
```

#### Pattern 6: Composable Middleware Pipeline
```typescript
// TARGET: Composable middleware
type Middleware<A, B> = (input: A) => Promise<Result<B>>;

const compose = <A, B, C>(
  f: Middleware<A, B>,
  g: Middleware<B, C>
): Middleware<A, C> =>
  async (input) => {
    const result = await f(input);
    return result.ok ? g(result.value) : result;
  };

// Build pipeline via composition
const pipeline = compose(
  compose(
    compose(parseCors, parseBody),
    validateRequest
  ),
  authenticate
);
```

### 3.4 Success Criteria

1. **Zero mutable `let` declarations** in orchestration code (index.ts files)
2. **No switch statements** for action routing (use handler maps)
3. **Pure functions** for validation, routing, and response formatting
4. **Side effects isolated** to explicit boundary functions
5. **Result type** for error propagation in business logic (exceptions only at outer boundary)
6. **Immutable data structures** throughout the pipeline
7. **Each orchestration function testable** without mocking I/O

---

## 4. File-by-File Action Plan

### 4.1 Phase 1: New Shared Utilities (Create First)

#### File: `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\fp\result.ts` (NEW)
**Purpose**: Result type and combinators for FP error handling
**Required Changes**: Create new file
**Code**:
```typescript
// Result type definition
export type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

// Constructors
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

// Combinators
export const map = <T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> =>
  result.ok ? ok(fn(result.value)) : result;

export const chain = <T, U, E>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E> =>
  result.ok ? fn(result.value) : result;

export const mapError = <T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> =>
  result.ok ? result : err(fn(result.error));

export const fromPromise = async <T>(promise: Promise<T>): Promise<Result<T, Error>> => {
  try {
    return ok(await promise);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
};

// Unwrap (only use at effect boundaries)
export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (result.ok) return result.value;
  throw result.error;
};
```
**Dependencies**: None
**Verification**: Unit tests for all combinators

---

#### File: `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\fp\pipeline.ts` (NEW)
**Purpose**: Function composition utilities
**Required Changes**: Create new file
**Code**:
```typescript
// Pipe: Left-to-right function composition
export const pipe = <A>(initial: A) => ({
  pipe: <B>(fn: (a: A) => B) => pipe(fn(initial)),
  value: () => initial,
});

// Async pipe for Result chains
export const pipeAsync = <T>(initial: Promise<T>) => ({
  pipe: <U>(fn: (value: T) => Promise<U>) => pipeAsync(initial.then(fn)),
  value: () => initial,
});

// Compose: Right-to-left function composition
export const compose = <A, B, C>(
  g: (b: B) => C,
  f: (a: A) => B
): ((a: A) => C) => (a) => g(f(a));

// ComposeAsync for async functions
export const composeAsync = <A, B, C>(
  g: (b: B) => Promise<C>,
  f: (a: A) => Promise<B>
): ((a: A) => Promise<C>) => async (a) => g(await f(a));
```
**Dependencies**: None
**Verification**: Unit tests for composition

---

#### File: `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\fp\errorLog.ts` (NEW)
**Purpose**: Immutable error logging (replaces ErrorCollector class)
**Required Changes**: Create new file
**Code**:
```typescript
interface CollectedError {
  readonly error: Error;
  readonly context?: string;
  readonly timestamp: string;
}

export interface ErrorLog {
  readonly functionName: string;
  readonly action: string;
  readonly correlationId: string;
  readonly startTime: string;
  readonly userId?: string;
  readonly errors: ReadonlyArray<CollectedError>;
}

// Pure constructor
export const createErrorLog = (
  functionName: string,
  action: string,
  correlationId: string = crypto.randomUUID().slice(0, 8)
): ErrorLog => ({
  functionName,
  action,
  correlationId,
  startTime: new Date().toISOString(),
  errors: [],
});

// Pure transformations
export const addError = (log: ErrorLog, error: Error, context?: string): ErrorLog => ({
  ...log,
  errors: [...log.errors, { error, context, timestamp: new Date().toISOString() }],
});

export const setUserId = (log: ErrorLog, userId: string): ErrorLog => ({
  ...log,
  userId,
});

export const hasErrors = (log: ErrorLog): boolean => log.errors.length > 0;

// Pure formatter
export const formatForSlack = (log: ErrorLog): string => {
  const lines: string[] = [
    `[Edge Function Error] ${log.functionName}/${log.action}`,
    '',
    `Request ID: ${log.correlationId}`,
    `Timestamp: ${log.startTime}`,
  ];

  if (log.userId) lines.push(`User ID: ${log.userId}`);
  lines.push('');

  if (log.errors.length === 1) {
    const err = log.errors[0];
    lines.push(`Error Type: ${err.error.name}`);
    lines.push(`Message: ${err.error.message}`);
    if (err.context) lines.push(`Context: ${err.context}`);
  } else {
    lines.push(`Total Errors: ${log.errors.length}`);
    log.errors.slice(0, 5).forEach((err, i) => {
      lines.push(`--- Error ${i + 1} ---`);
      lines.push(`Type: ${err.error.name}`);
      lines.push(`Message: ${err.error.message}`);
      if (err.context) lines.push(`Context: ${err.context}`);
    });
  }

  return lines.join('\n');
};
```
**Dependencies**: None
**Verification**: Unit tests for all transformations

---

#### File: `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\fp\orchestration.ts` (NEW)
**Purpose**: Shared orchestration utilities for all edge functions
**Required Changes**: Create new file
**Code**:
```typescript
import { Result, ok, err, chain } from './result.ts';
import { corsHeaders } from '../cors.ts';
import { ValidationError, AuthenticationError, formatErrorResponse, getStatusCodeFromError } from '../errors.ts';

// Types
export interface ParsedRequest {
  readonly method: string;
  readonly action: string;
  readonly payload: Record<string, unknown>;
  readonly headers: Headers;
}

export interface AuthenticatedContext<U> extends ParsedRequest {
  readonly user: U | null;
}

// Pure request parsing
export const parseRequest = async (req: Request): Promise<Result<ParsedRequest, Error>> => {
  if (req.method === 'OPTIONS') {
    return err(new CorsPreflightSignal());
  }

  if (req.method !== 'POST') {
    return err(new ValidationError('Method not allowed. Use POST.'));
  }

  try {
    const body = await req.json();
    if (!body.action) {
      return err(new ValidationError('action is required'));
    }

    return ok({
      method: req.method,
      action: body.action,
      payload: body.payload ?? {},
      headers: req.headers,
    });
  } catch (e) {
    return err(new ValidationError('Invalid JSON body'));
  }
};

// Pure action validation
export const validateAction = (
  allowed: readonly string[],
  action: string
): Result<string, ValidationError> =>
  allowed.includes(action)
    ? ok(action)
    : err(new ValidationError(`Unknown action: ${action}. Allowed: ${allowed.join(', ')}`));

// Pure handler routing
export const routeToHandler = <H>(
  handlers: Readonly<Record<string, H>>,
  action: string
): Result<H, ValidationError> => {
  const handler = handlers[action];
  return handler
    ? ok(handler)
    : err(new ValidationError(`No handler for action: ${action}`));
};

// Response formatters (pure)
export const formatSuccessResponse = <T>(data: T): Response =>
  new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

export const formatErrorResponseHttp = (error: Error): Response =>
  new Response(JSON.stringify(formatErrorResponse(error)), {
    status: getStatusCodeFromError(error),
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

export const formatCorsResponse = (): Response =>
  new Response(null, { status: 200, headers: corsHeaders });

// Signal class for CORS preflight (not an error, just control flow)
export class CorsPreflightSignal extends Error {
  constructor() {
    super('CORS_PREFLIGHT');
    this.name = 'CorsPreflightSignal';
  }
}
```
**Dependencies**: `result.ts`, `cors.ts`, `errors.ts`
**Verification**: Unit tests for parsing and formatting

---

### 4.2 Phase 2: Update Shared Slack Utility

#### File: `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\slack.ts`
**Current State**: Class-based ErrorCollector with mutable state
**Required Changes**:
1. Keep existing class for backward compatibility (deprecate)
2. Add functional alternatives that use `ErrorLog`
3. Update side effect functions to accept immutable ErrorLog

**Specific Code Changes**:

Add to end of file:
```typescript
// ─────────────────────────────────────────────────────────────
// Functional API (FP-friendly, recommended for new code)
// ─────────────────────────────────────────────────────────────

import { ErrorLog, formatForSlack, hasErrors } from './fp/errorLog.ts';

/**
 * Send error log to Slack (side effect - use at boundaries only)
 * Takes immutable ErrorLog, performs side effect
 */
export function reportErrorLog(log: ErrorLog): void {
  if (!hasErrors(log)) return;

  const message = { text: formatForSlack(log) };
  sendToSlack('database', message);
}

// ─────────────────────────────────────────────────────────────
// Deprecation Notice
// ─────────────────────────────────────────────────────────────

/**
 * @deprecated Use createErrorLog() from './fp/errorLog.ts' instead
 * This class is maintained for backward compatibility only
 */
export class ErrorCollector { ... }  // Keep existing implementation
```

**Dependencies**: New `fp/errorLog.ts`
**Verification**: Existing tests pass, new functional API tested

---

### 4.3 Phase 3: Refactor Entry Points (One-by-One)

Each entry point follows the same refactoring pattern. I'll detail `proposal/index.ts` as the template.

#### File: `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\proposal\index.ts`
**Current State**:
```typescript
// Current (209 lines, 5 let declarations, switch statement)
Deno.serve(async (req: Request) => {
  let collector: ErrorCollector | null = null;
  // ... imperative code ...
  switch (body.action) { ... }
});
```

**Required Changes**:
1. Replace mutable state with immutable context building
2. Replace switch with handler map routing
3. Extract pure functions for validation and routing
4. Move side effects to boundary

**Target State**:
```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { ValidationError, AuthenticationError } from "../_shared/errors.ts";
import {
  parseRequest,
  validateAction,
  routeToHandler,
  formatSuccessResponse,
  formatErrorResponseHttp,
  formatCorsResponse,
  CorsPreflightSignal,
} from "../_shared/fp/orchestration.ts";
import { Result, ok, err, chain } from "../_shared/fp/result.ts";
import { createErrorLog, addError, setUserId, ErrorLog } from "../_shared/fp/errorLog.ts";
import { reportErrorLog } from "../_shared/slack.ts";

import { handleCreate } from "./actions/create.ts";
import { handleUpdate } from "./actions/update.ts";
import { handleGet } from "./actions/get.ts";
import { handleSuggest } from "./actions/suggest.ts";

// ─────────────────────────────────────────────────────────────
// Configuration (immutable)
// ─────────────────────────────────────────────────────────────

const ALLOWED_ACTIONS = ["create", "update", "get", "suggest"] as const;
const PUBLIC_ACTIONS: ReadonlySet<string> = new Set(["get", "create"]);

type Action = typeof ALLOWED_ACTIONS[number];

// Handler map (immutable record)
const handlers: Readonly<Record<Action, Function>> = {
  create: handleCreate,
  update: handleUpdate,
  get: handleGet,
  suggest: handleSuggest,
};

// ─────────────────────────────────────────────────────────────
// Pure Functions
// ─────────────────────────────────────────────────────────────

interface RequestContext {
  readonly action: Action;
  readonly payload: Record<string, unknown>;
  readonly user: { id: string; email: string } | null;
  readonly serviceClient: ReturnType<typeof createClient>;
}

const isPublicAction = (action: string): boolean => PUBLIC_ACTIONS.has(action);

const getEnvConfig = (): Result<{ supabaseUrl: string; supabaseAnonKey: string; supabaseServiceKey: string }, Error> => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return err(new Error("Missing required environment variables"));
  }

  return ok({ supabaseUrl, supabaseAnonKey: supabaseAnonKey ?? '', supabaseServiceKey });
};

const authenticateUser = async (
  headers: Headers,
  config: { supabaseUrl: string; supabaseAnonKey: string },
  requireAuth: boolean
): Promise<Result<{ id: string; email: string } | null, AuthenticationError>> => {
  if (!requireAuth) return ok(null);

  const authHeader = headers.get("Authorization");
  if (!authHeader) {
    return err(new AuthenticationError("Missing Authorization header"));
  }

  const authClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user: authUser }, error: authError } = await authClient.auth.getUser();

  if (authError || !authUser) {
    return err(new AuthenticationError("Invalid or expired token"));
  }

  return ok({ id: authUser.id, email: authUser.email ?? "" });
};

// ─────────────────────────────────────────────────────────────
// Effect Boundary (Side Effects Isolated Here)
// ─────────────────────────────────────────────────────────────

console.log("[proposal] Edge Function started (FP mode)");

Deno.serve(async (req: Request) => {
  // Initialize error log (immutable data, will be transformed)
  const correlationId = crypto.randomUUID().slice(0, 8);
  let errorLog = createErrorLog('proposal', 'unknown', correlationId);

  try {
    // Parse request (side effect boundary for req.json())
    const parseResult = await parseRequest(req);

    if (!parseResult.ok) {
      if (parseResult.error instanceof CorsPreflightSignal) {
        return formatCorsResponse();
      }
      throw parseResult.error;
    }

    const { action, payload, headers } = parseResult.value;
    errorLog = { ...errorLog, action };

    // Validate action (pure)
    const actionResult = validateAction(ALLOWED_ACTIONS, action);
    if (!actionResult.ok) throw actionResult.error;

    // Get config (pure with environment read)
    const configResult = getEnvConfig();
    if (!configResult.ok) throw configResult.error;
    const config = configResult.value;

    // Authenticate (side effect boundary)
    const requireAuth = !isPublicAction(action);
    const authResult = await authenticateUser(headers, config, requireAuth);
    if (!authResult.ok) throw authResult.error;

    const user = authResult.value;
    if (user) {
      errorLog = setUserId(errorLog, user.id);
    }

    // Create service client (side effect - client creation)
    const serviceClient = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Build immutable context
    const context: RequestContext = {
      action: action as Action,
      payload,
      user,
      serviceClient,
    };

    // Route to handler (pure lookup + side effect execution)
    const handlerResult = routeToHandler(handlers, action);
    if (!handlerResult.ok) throw handlerResult.error;

    const result = await handlerResult.value(context.payload, context.user, context.serviceClient);

    return formatSuccessResponse(result);

  } catch (error) {
    errorLog = addError(errorLog, error as Error, 'Fatal error in main handler');
    reportErrorLog(errorLog);  // Side effect at boundary
    return formatErrorResponseHttp(error as Error);
  }
});
```

**Dependencies**: All new FP utilities
**Verification**:
- All existing API tests pass
- No `let` declarations in orchestration
- No switch statements
- Side effects only at explicit boundaries

---

#### Remaining Entry Points (Same Pattern)

Apply the same refactoring to:

| File | Specific Notes |
|------|----------------|
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\auth-user\index.ts` | 9 actions, complex config gathering |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\listing\index.ts` | Similar to proposal |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\messages\index.ts` | Similar to proposal |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\ai-gateway\index.ts` | Special context object for handlers |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\bubble_sync\index.ts` | Complex config, Bubble settings |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\virtual-meeting\index.ts` | Similar to proposal |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\send-email\index.ts` | Health check handler is already pure |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\send-sms\index.ts` | Similar to send-email |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\cohost-request\index.ts` | Similar to proposal |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\rental-application\index.ts` | Similar to proposal |

---

### 4.4 Phase 4: Refactor BubbleSyncService (Optional - Lower Priority)

#### File: `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\bubbleSync.ts`
**Current State**: Class with stored configuration state
**Required Changes**:
- Convert to module with pure functions that receive config as parameter
- Keep class as deprecated wrapper for backward compatibility

This is lower priority because:
1. The class is used at I/O boundaries anyway
2. It doesn't pollute the orchestration layer
3. The stored state is configuration, not mutable application state

---

## 5. Execution Order

### Phase 1: Foundation (Dependencies First)
| Order | File | Action | Verification |
|-------|------|--------|--------------|
| 1.1 | `_shared/fp/result.ts` | CREATE | Unit tests |
| 1.2 | `_shared/fp/pipeline.ts` | CREATE | Unit tests |
| 1.3 | `_shared/fp/errorLog.ts` | CREATE | Unit tests |
| 1.4 | `_shared/fp/orchestration.ts` | CREATE | Unit tests |

### Phase 2: Shared Utilities Update
| Order | File | Action | Verification |
|-------|------|--------|--------------|
| 2.1 | `_shared/slack.ts` | UPDATE (add functional API) | Existing + new tests |

### Phase 3: Entry Points (High Traffic First)
| Order | File | Action | Verification |
|-------|------|--------|--------------|
| 3.1 | `proposal/index.ts` | REFACTOR | API tests, manual test |
| 3.2 | `auth-user/index.ts` | REFACTOR | API tests, manual test |
| 3.3 | `listing/index.ts` | REFACTOR | API tests, manual test |
| 3.4 | `messages/index.ts` | REFACTOR | API tests, manual test |
| 3.5 | `ai-gateway/index.ts` | REFACTOR | API tests, manual test |
| 3.6 | `bubble_sync/index.ts` | REFACTOR | API tests, manual test |
| 3.7 | `virtual-meeting/index.ts` | REFACTOR | API tests |
| 3.8 | `send-email/index.ts` | REFACTOR | API tests |
| 3.9 | Remaining functions | REFACTOR | API tests |

### Safe Stopping Points
- **After Phase 1**: All new utilities exist, old code still works
- **After Phase 2**: Slack utility updated, old code still works
- **After each 3.x**: That specific function is refactored, others unchanged

---

## 6. Risk Assessment

### Potential Breaking Changes
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Type mismatches in handler signatures | Medium | High | TypeScript will catch at compile time |
| Error response format changes | Low | High | formatErrorResponse stays unchanged |
| CORS handling edge cases | Low | Medium | CorsPreflightSignal handles cleanly |
| Performance regression | Very Low | Low | Functional style is equally performant |

### Edge Cases to Watch
1. **CORS preflight**: Must still return 200 with headers (not throw)
2. **Optional authentication**: Some actions public, some private
3. **Error collection timing**: Must capture errors even in early failures
4. **Streaming responses**: ai-gateway stream handler needs special handling

### Rollback Considerations
- Each function can be rolled back independently
- Old ErrorCollector class kept for backward compatibility
- No database schema changes required
- Git history preserves old implementations

---

## 7. Verification Checklist

### Per-File Verification
- [ ] No `let` declarations in orchestration code
- [ ] No `switch` statements for action routing
- [ ] All validation functions are pure (return Result, don't throw)
- [ ] Side effects only at explicit boundaries
- [ ] Error logging uses immutable ErrorLog
- [ ] All existing API tests pass
- [ ] TypeScript compiles without errors

### Integration Verification
- [ ] CORS preflight returns 200
- [ ] Authentication works for protected actions
- [ ] Public actions work without auth
- [ ] Error responses have correct status codes
- [ ] Slack notifications fire on errors
- [ ] All handlers receive correct context

### Performance Verification
- [ ] Response times unchanged (within 10% tolerance)
- [ ] Memory usage unchanged
- [ ] No new memory leaks

---

## 8. Reference Appendix

### 8.1 All File Paths (Consolidated)

**New Files to Create:**
```
c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\fp\result.ts
c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\fp\pipeline.ts
c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\fp\errorLog.ts
c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\fp\orchestration.ts
```

**Files to Modify:**
```
c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\slack.ts
c:\Users\Split Lease\Documents\Split Lease\supabase\functions\auth-user\index.ts
c:\Users\Split Lease\Documents\Split Lease\supabase\functions\proposal\index.ts
c:\Users\Split Lease\Documents\Split Lease\supabase\functions\listing\index.ts
c:\Users\Split Lease\Documents\Split Lease\supabase\functions\messages\index.ts
c:\Users\Split Lease\Documents\Split Lease\supabase\functions\ai-gateway\index.ts
c:\Users\Split Lease\Documents\Split Lease\supabase\functions\bubble_sync\index.ts
c:\Users\Split Lease\Documents\Split Lease\supabase\functions\virtual-meeting\index.ts
c:\Users\Split Lease\Documents\Split Lease\supabase\functions\send-email\index.ts
c:\Users\Split Lease\Documents\Split Lease\supabase\functions\send-sms\index.ts
c:\Users\Split Lease\Documents\Split Lease\supabase\functions\cohost-request\index.ts
c:\Users\Split Lease\Documents\Split Lease\supabase\functions\rental-application\index.ts
```

**Files That Remain Unchanged (Already Pure):**
```
c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\cors.ts
c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\types.ts
c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\aiTypes.ts
c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\errors.ts
c:\Users\Split Lease\Documents\Split Lease\supabase\functions\proposal\lib\calculations.ts
c:\Users\Split Lease\Documents\Split Lease\supabase\functions\proposal\lib\status.ts
```

### 8.2 Key Code Patterns (Before/After)

**Mutable State Elimination:**
```typescript
// BEFORE
let collector: ErrorCollector | null = null;
let action = 'unknown';
// ... later
action = body.action;
collector = createErrorCollector('proposal', action);

// AFTER
const correlationId = crypto.randomUUID().slice(0, 8);
let errorLog = createErrorLog('proposal', 'unknown', correlationId);
// ... later (single reassignment using spread)
errorLog = { ...errorLog, action: body.action };
```

**Switch to Handler Map:**
```typescript
// BEFORE
switch (body.action) {
  case "create":
    result = await handleCreate(...);
    break;
  case "update":
    result = await handleUpdate(...);
    break;
  default:
    throw new ValidationError(`Unhandled action: ${body.action}`);
}

// AFTER
const handlers = { create: handleCreate, update: handleUpdate };
const handlerResult = routeToHandler(handlers, action);
if (!handlerResult.ok) throw handlerResult.error;
const result = await handlerResult.value(payload, user, serviceClient);
```

**Result Type Usage:**
```typescript
// BEFORE (throws)
function validateAction(action: string, allowed: string[]): void {
  if (!allowed.includes(action)) {
    throw new ValidationError(`Unknown action: ${action}`);
  }
}

// AFTER (returns Result)
const validateAction = (allowed: readonly string[], action: string): Result<string, ValidationError> =>
  allowed.includes(action)
    ? ok(action)
    : err(new ValidationError(`Unknown action: ${action}`));
```

### 8.3 Related Documentation
- Project CLAUDE.md: `c:\Users\Split Lease\Documents\Split Lease\.claude\CLAUDE.md`
- Supabase CLAUDE.md: `c:\Users\Split Lease\Documents\Split Lease\supabase\CLAUDE.md`
- Edge Functions Overview: `c:\Users\Split Lease\Documents\Split Lease\.claude\Documentation\largeCLAUDE.md`

---

## 9. Statistics

| Metric | Count |
|--------|-------|
| Entry points to refactor | 11 |
| New utility files to create | 4 |
| Shared utilities to update | 1 |
| `let` declarations to eliminate | ~50+ |
| `switch` statements to replace | 11 |
| Lines of new FP utility code | ~200 |
| Estimated refactoring effort | Medium (3-5 days) |

---

**Plan Status**: Ready for execution
**Author**: Claude (Cleanup Planner)
**Version**: 1.0
