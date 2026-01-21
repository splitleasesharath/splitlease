# Supabase Edge Functions Unit Testing Infrastructure

**Created**: 2026-01-21
**Status**: Ready for Implementation
**Classification**: BUILD
**Complexity**: Multi-file, infrastructure setup

---

## Overview

Establish a comprehensive unit testing infrastructure for Supabase Edge Functions using Deno's native test runner. This implementation prioritizes pure utility functions first, creating patterns that scale to handler and integration tests.

---

## Goals

| Goal | Description | Test Type |
|------|-------------|-----------|
| **A) Refactoring Confidence** | Safely modify existing code without breaking things | Unit tests on pure functions |
| **B) Regression Catching** | Safety net for bugs that slip through | Integration tests on handlers |
| **C) Living Documentation** | Tests serve as behavior documentation | Well-named, readable test cases |
| **D) CI/CD Gate** | Automated checks before deployment | Deferred to Phase 2 |

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Test Runner | Deno native (`Deno.test()`) | Zero config, built-in coverage, TypeScript native |
| Test Style | Flat `Deno.test()` with descriptive names | Simple, no extra dependencies |
| File Organization | Hybrid (unit co-located, integration separate) | Best of both worlds |
| Starting Point | Pure utilities first | Zero external dependencies, establishes patterns |
| Abbreviations | Rename `fp/` to `functional/` | Comply with new no-abbreviations rule |

---

## Directory Structure (Target State)

```
supabase/functions/
├── _shared/
│   ├── functional/                      ← RENAMED from fp/
│   │   ├── result.ts
│   │   ├── result_test.ts              ← co-located unit test
│   │   ├── pipeline.ts
│   │   ├── pipeline_test.ts
│   │   ├── orchestration.ts
│   │   ├── orchestration_test.ts
│   │   ├── errorLog.ts
│   │   └── errorLog_test.ts
│   ├── validation.ts
│   ├── validation_test.ts
│   ├── errors.ts
│   └── errors_test.ts
├── tests/                               ← NEW directory
│   ├── integration/                     ← Future: handler tests
│   │   └── .gitkeep
│   └── helpers/                         ← Test utilities
│       ├── assertions.ts                ← Custom assertions
│       └── fixtures.ts                  ← Test data factories
├── deno.json                            ← Updated with test config
└── [28 edge function directories]
```

---

## Implementation Steps

### Phase 1: Infrastructure Setup

#### Step 1.1: Rename `fp/` to `functional/`

Rename the directory and update all imports across the codebase.

**Files to modify:**
- `supabase/functions/_shared/fp/` → `supabase/functions/_shared/functional/`
- All files importing from `_shared/fp/`:
  - `supabase/functions/auth-user/index.ts`
  - `supabase/functions/auth-user/handlers/*.ts`
  - `supabase/functions/proposal/index.ts`
  - `supabase/functions/listing/index.ts`
  - Any other files with `from '../_shared/fp/'` or similar imports

**Command to find all imports:**
```bash
grep -r "from.*_shared/fp" supabase/functions/
```

#### Step 1.2: Update `deno.json` with Test Configuration

**File**: `supabase/functions/deno.json`

Add test task and configuration:

```json
{
  "tasks": {
    "test": "deno test --allow-env --allow-read",
    "test:coverage": "deno test --allow-env --allow-read --coverage=coverage",
    "test:watch": "deno test --allow-env --allow-read --watch"
  },
  "lint": {
    "include": ["./**/*.ts"],
    "exclude": ["./**/*_test.ts"],
    "rules": {
      "tags": ["recommended"],
      "include": ["ban-untagged-todo", "no-unused-vars"],
      "exclude": ["no-explicit-any"]
    }
  },
  "fmt": {
    "useTabs": false,
    "lineWidth": 100,
    "indentWidth": 2,
    "singleQuote": true,
    "proseWrap": "always"
  },
  "test": {
    "include": ["./**/*_test.ts"],
    "exclude": ["./tests/integration/**"]
  }
}
```

#### Step 1.3: Create Test Directory Structure

```bash
mkdir -p supabase/functions/tests/integration
mkdir -p supabase/functions/tests/helpers
touch supabase/functions/tests/integration/.gitkeep
```

#### Step 1.4: Create Test Helpers

**File**: `supabase/functions/tests/helpers/assertions.ts`

```typescript
/**
 * Custom assertions for Split Lease Edge Function tests.
 * Extends Deno's built-in assertions with domain-specific helpers.
 */

import { assertEquals, assertExists } from "jsr:@std/assert";
import type { Result } from "../../_shared/functional/result.ts";

/**
 * Assert that a Result is Ok and return its value.
 */
export function assertOk<T, E>(result: Result<T, E>, message?: string): T {
  if (!result.ok) {
    throw new Error(message ?? `Expected Ok, got Err: ${result.error}`);
  }
  return result.value;
}

/**
 * Assert that a Result is Err and return its error.
 */
export function assertErr<T, E>(result: Result<T, E>, message?: string): E {
  if (result.ok) {
    throw new Error(message ?? `Expected Err, got Ok: ${result.value}`);
  }
  return result.error;
}

/**
 * Assert that two Results are structurally equal.
 */
export function assertResultEquals<T, E>(
  actual: Result<T, E>,
  expected: Result<T, E>,
  message?: string
): void {
  assertEquals(actual.ok, expected.ok, message);
  if (actual.ok && expected.ok) {
    assertEquals(actual.value, expected.value, message);
  } else if (!actual.ok && !expected.ok) {
    assertEquals(actual.error, expected.error, message);
  }
}
```

**File**: `supabase/functions/tests/helpers/fixtures.ts`

```typescript
/**
 * Test data factories for Split Lease Edge Function tests.
 * Creates consistent test data without external dependencies.
 */

/**
 * Create a mock HTTP Request object.
 */
export function createMockRequest(options: {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}): Request {
  const { method = "POST", body, headers = {} } = options;

  return new Request("https://test.supabase.co/functions/v1/test", {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Create a standard action request payload.
 */
export function createActionPayload<T>(action: string, payload: T): { action: string; payload: T } {
  return { action, payload };
}

/**
 * Sample user data for auth tests.
 */
export const sampleUser = {
  id: "test-user-id-12345",
  email: "test@example.com",
  phone: "+15551234567",
} as const;

/**
 * Sample listing data for listing tests.
 */
export const sampleListing = {
  id: "test-listing-id-12345",
  title: "Test Listing",
  neighborhood: "East Village",
  borough: "Manhattan",
} as const;
```

---

### Phase 2: Pure Utility Tests

#### Step 2.1: Test `functional/result.ts`

**File**: `supabase/functions/_shared/functional/result_test.ts`

Test cases to cover:
1. `ok()` - creates success Result
2. `err()` - creates error Result
3. `isOk()` / `isErr()` - type guards
4. `map()` - transforms success value
5. `mapError()` - transforms error value
6. `chain()` / `flatMap()` - chains Results
7. `unwrap()` / `unwrapOr()` - extracts values
8. `traverse()` - converts array of Results

```typescript
import { assertEquals, assertThrows } from "jsr:@std/assert";
import { ok, err, isOk, isErr, map, mapError, chain, unwrap, unwrapOr, traverse } from "./result.ts";
import { assertOk, assertErr } from "../../tests/helpers/assertions.ts";

Deno.test("ok() wraps value in success Result", () => {
  const result = ok(42);
  assertEquals(result.ok, true);
  assertEquals(result.value, 42);
});

Deno.test("err() wraps value in error Result", () => {
  const result = err("something went wrong");
  assertEquals(result.ok, false);
  assertEquals(result.error, "something went wrong");
});

Deno.test("isOk() returns true for success Result", () => {
  assertEquals(isOk(ok(1)), true);
  assertEquals(isOk(err("fail")), false);
});

Deno.test("isErr() returns true for error Result", () => {
  assertEquals(isErr(err("fail")), true);
  assertEquals(isErr(ok(1)), false);
});

Deno.test("map() transforms success value", () => {
  const result = map(ok(5), (x) => x * 2);
  assertOk(result);
  assertEquals(result.value, 10);
});

Deno.test("map() passes through error unchanged", () => {
  const result = map(err("fail"), (x: number) => x * 2);
  assertErr(result);
  assertEquals(result.error, "fail");
});

Deno.test("mapError() transforms error value", () => {
  const result = mapError(err("fail"), (e) => `wrapped: ${e}`);
  assertErr(result);
  assertEquals(result.error, "wrapped: fail");
});

Deno.test("mapError() passes through success unchanged", () => {
  const result = mapError(ok(5), (e) => `wrapped: ${e}`);
  assertOk(result);
  assertEquals(result.value, 5);
});

Deno.test("chain() sequences successful Results", () => {
  const double = (x: number) => ok(x * 2);
  const result = chain(ok(5), double);
  assertOk(result);
  assertEquals(result.value, 10);
});

Deno.test("chain() short-circuits on error", () => {
  const double = (x: number) => ok(x * 2);
  const result = chain(err("fail"), double);
  assertErr(result);
  assertEquals(result.error, "fail");
});

Deno.test("unwrap() returns value for success", () => {
  assertEquals(unwrap(ok(42)), 42);
});

Deno.test("unwrap() throws for error", () => {
  assertThrows(() => unwrap(err("fail")));
});

Deno.test("unwrapOr() returns value for success", () => {
  assertEquals(unwrapOr(ok(42), 0), 42);
});

Deno.test("unwrapOr() returns default for error", () => {
  assertEquals(unwrapOr(err("fail"), 0), 0);
});

Deno.test("traverse() collects all successes", () => {
  const results = [ok(1), ok(2), ok(3)];
  const collected = traverse(results);
  assertOk(collected);
  assertEquals(collected.value, [1, 2, 3]);
});

Deno.test("traverse() returns first error", () => {
  const results = [ok(1), err("fail"), ok(3)];
  const collected = traverse(results);
  assertErr(collected);
  assertEquals(collected.error, "fail");
});
```

#### Step 2.2: Test `functional/pipeline.ts`

**File**: `supabase/functions/_shared/functional/pipeline_test.ts`

Test cases to cover:
1. `pipe()` - chains functions left-to-right
2. `compose()` - chains functions right-to-left
3. `tap()` - side effect without changing value
4. Fluent builder pattern

```typescript
import { assertEquals } from "jsr:@std/assert";
import { pipe, compose, tap } from "./pipeline.ts";

Deno.test("pipe() chains functions left-to-right", () => {
  const result = pipe(5)
    .pipe((x) => x * 2)
    .pipe((x) => x + 1)
    .value();
  assertEquals(result, 11); // (5 * 2) + 1
});

Deno.test("pipe() with single function", () => {
  const result = pipe(10)
    .pipe((x) => x / 2)
    .value();
  assertEquals(result, 5);
});

Deno.test("compose() chains functions right-to-left", () => {
  const addOne = (x: number) => x + 1;
  const double = (x: number) => x * 2;
  const composed = compose(addOne, double);
  assertEquals(composed(5), 11); // addOne(double(5)) = addOne(10) = 11
});

Deno.test("tap() executes side effect without changing value", () => {
  let sideEffectValue = 0;
  const result = pipe(5)
    .pipe(tap((x) => { sideEffectValue = x; }))
    .pipe((x) => x * 2)
    .value();

  assertEquals(result, 10);
  assertEquals(sideEffectValue, 5);
});
```

#### Step 2.3: Test `validation.ts`

**File**: `supabase/functions/_shared/validation_test.ts`

Test cases to cover:
1. `validateEmail()` - email format validation
2. `validatePhone()` - phone number validation
3. `validatePhoneE164()` - E.164 format validation
4. `validateRequiredFields()` - missing field detection

```typescript
import { assertEquals, assertThrows } from "jsr:@std/assert";
import {
  validateEmail,
  validatePhone,
  validatePhoneE164,
  validateRequiredFields
} from "./validation.ts";
import { ValidationError } from "./errors.ts";

// Email validation
Deno.test("validateEmail() accepts valid email", () => {
  assertEquals(validateEmail("user@example.com"), true);
});

Deno.test("validateEmail() accepts email with subdomain", () => {
  assertEquals(validateEmail("user@mail.example.com"), true);
});

Deno.test("validateEmail() rejects missing @", () => {
  assertThrows(() => validateEmail("userexample.com"), ValidationError);
});

Deno.test("validateEmail() rejects missing domain", () => {
  assertThrows(() => validateEmail("user@"), ValidationError);
});

Deno.test("validateEmail() rejects empty string", () => {
  assertThrows(() => validateEmail(""), ValidationError);
});

// Phone validation
Deno.test("validatePhone() accepts 10-digit phone", () => {
  assertEquals(validatePhone("5551234567"), true);
});

Deno.test("validatePhone() accepts phone with country code", () => {
  assertEquals(validatePhone("+15551234567"), true);
});

// E.164 format validation
Deno.test("validatePhoneE164() accepts valid E.164 format", () => {
  assertEquals(validatePhoneE164("+15551234567"), true);
});

Deno.test("validatePhoneE164() rejects missing plus sign", () => {
  assertThrows(() => validatePhoneE164("15551234567"), ValidationError);
});

Deno.test("validatePhoneE164() rejects too short", () => {
  assertThrows(() => validatePhoneE164("+1555"), ValidationError);
});

// Required fields validation
Deno.test("validateRequiredFields() passes with all fields present", () => {
  const payload = { email: "test@example.com", password: "secret" };
  assertEquals(validateRequiredFields(payload, ["email", "password"]), true);
});

Deno.test("validateRequiredFields() throws on missing field", () => {
  const payload = { email: "test@example.com" };
  assertThrows(
    () => validateRequiredFields(payload, ["email", "password"]),
    ValidationError
  );
});

Deno.test("validateRequiredFields() throws on null field", () => {
  const payload = { email: "test@example.com", password: null };
  assertThrows(
    () => validateRequiredFields(payload, ["email", "password"]),
    ValidationError
  );
});

Deno.test("validateRequiredFields() throws on empty string field", () => {
  const payload = { email: "test@example.com", password: "" };
  assertThrows(
    () => validateRequiredFields(payload, ["email", "password"]),
    ValidationError
  );
});
```

#### Step 2.4: Test `errors.ts`

**File**: `supabase/functions/_shared/errors_test.ts`

Test cases to cover:
1. Each error class instantiation
2. Error inheritance from `Error`
3. Custom properties (statusCode, etc.)

```typescript
import { assertEquals, assertInstanceOf } from "jsr:@std/assert";
import {
  ValidationError,
  AuthenticationError,
  BubbleApiError,
  SupabaseSyncError,
  OpenAIError
} from "./errors.ts";

Deno.test("ValidationError extends Error", () => {
  const error = new ValidationError("Invalid input");
  assertInstanceOf(error, Error);
  assertEquals(error.name, "ValidationError");
  assertEquals(error.message, "Invalid input");
});

Deno.test("AuthenticationError extends Error", () => {
  const error = new AuthenticationError("Not authorized");
  assertInstanceOf(error, Error);
  assertEquals(error.name, "AuthenticationError");
  assertEquals(error.message, "Not authorized");
});

Deno.test("BubbleApiError includes status and response", () => {
  const error = new BubbleApiError("API failed", 500, { error: "Internal" });
  assertInstanceOf(error, Error);
  assertEquals(error.name, "BubbleApiError");
  assertEquals(error.statusCode, 500);
  assertEquals(error.bubbleResponse, { error: "Internal" });
});

Deno.test("SupabaseSyncError includes context", () => {
  const error = new SupabaseSyncError("Sync failed", "proposal", "create");
  assertInstanceOf(error, Error);
  assertEquals(error.name, "SupabaseSyncError");
  assertEquals(error.table, "proposal");
  assertEquals(error.operation, "create");
});

Deno.test("OpenAIError includes model info", () => {
  const error = new OpenAIError("Rate limited", "gpt-4");
  assertInstanceOf(error, Error);
  assertEquals(error.name, "OpenAIError");
  assertEquals(error.model, "gpt-4");
});
```

#### Step 2.5: Test `functional/errorLog.ts`

**File**: `supabase/functions/_shared/functional/errorLog_test.ts`

Test cases to cover:
1. `createErrorLog()` - initialization
2. `addError()` - immutable error addition
3. `hasErrors()` - error presence check
4. `formatForSlack()` - Slack formatting

```typescript
import { assertEquals } from "jsr:@std/assert";
import {
  createErrorLog,
  addError,
  hasErrors,
  getErrors,
  formatForSlack
} from "./errorLog.ts";

Deno.test("createErrorLog() initializes empty log", () => {
  const log = createErrorLog("test-function", "test-action");
  assertEquals(hasErrors(log), false);
  assertEquals(getErrors(log), []);
});

Deno.test("addError() returns new log with error added", () => {
  const log = createErrorLog("test-function", "test-action");
  const error = new Error("Something went wrong");
  const logWithError = addError(log, error, "processing step");

  assertEquals(hasErrors(log), false); // Original unchanged
  assertEquals(hasErrors(logWithError), true); // New log has error
});

Deno.test("addError() preserves previous errors", () => {
  const log = createErrorLog("test-function", "test-action");
  const log1 = addError(log, new Error("First"), "step 1");
  const log2 = addError(log1, new Error("Second"), "step 2");

  assertEquals(getErrors(log2).length, 2);
});

Deno.test("formatForSlack() includes function and action", () => {
  const log = createErrorLog("auth-user", "login");
  const logWithError = addError(log, new Error("Auth failed"), "verify token");
  const formatted = formatForSlack(logWithError);

  assertEquals(formatted.includes("auth-user"), true);
  assertEquals(formatted.includes("login"), true);
  assertEquals(formatted.includes("Auth failed"), true);
});
```

---

### Phase 3: Run Tests and Verify

#### Step 3.1: Run All Tests

```bash
cd supabase/functions
deno task test
```

Expected output: All tests pass with no errors.

#### Step 3.2: Generate Coverage Report

```bash
deno task test:coverage
deno coverage coverage --lcov --output=coverage.lcov
```

---

## File References

| File | Purpose | Action |
|------|---------|--------|
| `supabase/functions/_shared/fp/` | FP utilities directory | RENAME to `functional/` |
| `supabase/functions/_shared/fp/result.ts` | Result type | ADD tests |
| `supabase/functions/_shared/fp/pipeline.ts` | Pipe/compose | ADD tests |
| `supabase/functions/_shared/fp/errorLog.ts` | Error logging | ADD tests |
| `supabase/functions/_shared/validation.ts` | Validators | ADD tests |
| `supabase/functions/_shared/errors.ts` | Error classes | ADD tests |
| `supabase/functions/deno.json` | Deno config | UPDATE with test tasks |
| `supabase/functions/tests/` | Test directory | CREATE |
| `supabase/functions/tests/helpers/assertions.ts` | Custom assertions | CREATE |
| `supabase/functions/tests/helpers/fixtures.ts` | Test fixtures | CREATE |

---

## Success Criteria

- [ ] `fp/` renamed to `functional/` with all imports updated
- [ ] `deno.json` updated with test configuration
- [ ] Test helpers created (`assertions.ts`, `fixtures.ts`)
- [ ] All pure utility tests written and passing:
  - [ ] `result_test.ts` - 15+ test cases
  - [ ] `pipeline_test.ts` - 5+ test cases
  - [ ] `validation_test.ts` - 10+ test cases
  - [ ] `errors_test.ts` - 5+ test cases
  - [ ] `errorLog_test.ts` - 5+ test cases
- [ ] `deno task test` runs successfully with 0 failures
- [ ] All tests follow naming convention: descriptive, documents behavior

---

## Future Phases (Out of Scope)

- **Phase 2**: Integration tests for Edge Function handlers
- **Phase 3**: Mock factories for Supabase, Bubble, OpenAI
- **Phase 4**: CI/CD integration with GitHub Actions
- **Phase 5**: Coverage thresholds and badges

---

## Commands Reference

```bash
# Run all tests
cd supabase/functions && deno task test

# Run tests in watch mode (development)
deno task test:watch

# Run with coverage
deno task test:coverage

# Run specific test file
deno test _shared/functional/result_test.ts

# Lint (excludes test files)
deno lint
```
