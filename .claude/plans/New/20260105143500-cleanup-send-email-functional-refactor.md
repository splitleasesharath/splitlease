# Cleanup Plan: send-email Edge Function Functional Refactor

**Plan ID**: 20260105143500-cleanup-send-email-functional-refactor
**Created**: 2026-01-05
**Status**: PENDING
**Estimated Effort**: Medium (2-3 hours)

---

## 1. Executive Summary

### What is being cleaned up
Refactoring the `send-email` Supabase Edge Function from imperative, side-effect-laden code to a functional programming architecture with clear separation of pure functions and effects.

### Why
- **Testability**: Current code cannot be unit tested without mocking Deno.env and fetch
- **Hidden Dependencies**: Environment variables accessed inside functions (4 calls inside handleSend)
- **Mixed Concerns**: 173-line handler mixes validation, DB access, API calls, and logging
- **Scattered Side Effects**: console.log statements throughout business logic
- **Composability**: No structured error handling for pipeline composition

### Scope and Boundaries
- **IN SCOPE**: All 5 files in `supabase/functions/send-email/`
- **OUT OF SCOPE**: `_shared/` utilities (already well-structured), database schema, external API contracts

### Expected Outcomes
1. 80%+ of code is pure and unit-testable without mocking
2. All side effects isolated in clearly marked effect boundary modules
3. Result type enables composable error handling
4. Dependency injection via config objects (no hidden env access)
5. External API contract unchanged (request/response format identical)

---

## 2. Current State Analysis

### File Inventory

| File | Lines | Pure | Effectful | Notes |
|------|-------|------|-----------|-------|
| `index.ts` | 167 | ~20% | ~80% | Entry point, CORS, routing, error collection |
| `handlers/send.ts` | 173 | ~30% | ~70% | PRIMARY TARGET - monolithic handler |
| `lib/sendgridClient.ts` | 132 | ~60% | ~40% | buildSendGridRequestBody pure, rest effectful |
| `lib/templateProcessor.ts` | 156 | 100% | 0% | Already pure - NO CHANGES |
| `lib/types.ts` | 65 | 100% | 0% | Type definitions only |

### Current Problems in `handlers/send.ts`

#### Problem 1: Hidden Dependencies (lines 49-65)
```typescript
// Current: Environment variables accessed INSIDE function
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
const sendgridEmailEndpoint = Deno.env.get('SENDGRID_EMAIL_ENDPOINT');

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}
```
**Issue**: Cannot test without mocking Deno.env. Configuration validation mixed with business logic.

#### Problem 2: Monolithic Function (173 lines in single function)
```typescript
export async function handleSend(payload: Record<string, unknown>): Promise<SendEmailResult> {
  // Line 27-35: Logging
  // Line 33-34: Validation
  // Line 49-65: Config loading
  // Line 67-77: Create Supabase client
  // Line 79-104: Database fetch
  // Line 106-136: Variable building + placeholder validation
  // Line 139-157: SendGrid API call
  // Line 159-172: Response building
}
```
**Issue**: Single responsibility violation. Testing requires mocking everything.

#### Problem 3: Scattered console.log (15 occurrences)
```typescript
console.log('[send-email:send] ========== SEND EMAIL ==========');
console.log('[send-email:send] Payload:', JSON.stringify({...}));
console.log('[send-email:send] Step 1/3: Fetching template...');
// ... 12 more console.log calls
```
**Issue**: Side effects mixed throughout. Cannot disable logging in tests.

#### Problem 4: Imperative Error Handling (throw statements)
```typescript
if (templateError || !template) {
  throw new Error(`Template not found: ${template_id}`);
}
```
**Issue**: Control flow via exceptions. Cannot compose operations in a pipeline.

### Dependency Map

```
index.ts
├── _shared/cors.ts (corsHeaders)
├── _shared/errors.ts (ValidationError, AuthenticationError, formatErrorResponse, getStatusCodeFromError)
├── _shared/validation.ts (validateRequired, validateAction)
├── _shared/slack.ts (createErrorCollector, ErrorCollector)
└── handlers/send.ts (handleSend)
    ├── _shared/validation.ts (validateRequiredFields, validateEmail)
    ├── lib/types.ts (SendEmailPayload, EmailTemplate, SendEmailResult)
    ├── lib/templateProcessor.ts (processTemplateJson, validatePlaceholders)
    └── lib/sendgridClient.ts (sendEmailRaw, isSuccessResponse)
        └── lib/types.ts (SendGridMailRequest, SendGridResponse)
```

### Statistics
- **Total Lines**: 693 (5 files)
- **Pure Lines**: ~300 (43%)
- **Effectful Lines**: ~393 (57%)
- **console.log Statements**: 27 total
- **Deno.env.get Calls**: 6 total (4 in send.ts, 2 in index.ts)
- **throw Statements**: 10 total

---

## 3. Target State Definition

### Target Architecture

```
send-email/
├── index.ts                    # Entry point - wires config, creates handler (MODIFIED)
├── handlers/
│   └── send.ts                 # Orchestration only - ~50 lines (MODIFIED)
├── lib/
│   ├── types.ts                # Existing types + Result type (MODIFIED)
│   ├── result.ts               # NEW: Result type utilities
│   ├── config.ts               # NEW: Pure config parser
│   ├── validators.ts           # NEW: Pure payload validation
│   ├── variables.ts            # NEW: Pure variable builder
│   ├── templateProcessor.ts    # UNCHANGED (already pure)
│   └── sendgridClient.ts       # Remove console.log (MODIFIED)
├── effects/
│   ├── database.ts             # NEW: Effectful template fetcher
│   ├── sendgrid.ts             # NEW: Effectful email sender
│   └── logging.ts              # NEW: Logging effect wrapper
└── deno.json                   # UNCHANGED
```

### Target Pattern: Dependency Injection

```typescript
// TARGET: Config parsed ONCE at startup, injected into handler
interface EmailConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  sendgridApiKey: string;
  sendgridEndpoint: string;
}

// Handler receives all dependencies as parameters
function createSendHandler(config: EmailConfig, deps: SendDeps) {
  return async (payload: unknown): Promise<Result<SendEmailResult, SendError>> => {
    // Pure orchestration - no hidden dependencies
  };
}
```

### Target Pattern: Result Type

```typescript
// TARGET: Result type for composable error handling
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

// Usage:
const configResult = parseConfig(env);  // Result<EmailConfig, string[]>
if (!configResult.ok) return err(new ConfigError(configResult.error));

const templateResult = await deps.fetchTemplate(templateId);  // Result<Template, DbError>
if (!templateResult.ok) return err(templateResult.error);
```

### Target Pattern: Effect Boundaries

```typescript
// TARGET: Effects clearly separated from pure logic
// effects/database.ts - the ONLY place DB calls happen
export async function fetchTemplate(
  client: SupabaseClient,
  templateId: string
): Promise<Result<EmailTemplate, DatabaseError>> {
  const { data, error } = await client
    .from('zat_email_html_template_eg_sendbasicemailwf_')
    .select(...)
    .eq('_id', templateId)
    .single();

  if (error) return err(new DatabaseError(error.message, error));
  if (!data) return err(new DatabaseError(`Template not found: ${templateId}`));
  return ok(data as EmailTemplate);
}
```

### Success Criteria

1. [ ] `handlers/send.ts` is under 60 lines
2. [ ] Zero `Deno.env.get` calls inside handler or lib functions
3. [ ] Zero `console.log` calls inside lib functions
4. [ ] All lib functions return Result type (no throw)
5. [ ] Effects module functions are the ONLY place with side effects
6. [ ] External API contract unchanged (same request/response JSON)
7. [ ] Can unit test validators, config parser, variable builder without mocking

---

## 4. File-by-File Action Plan

### NEW FILE: lib/result.ts

**Purpose**: Result type utilities for composable error handling

**Dependencies**: None (pure utility)

**Code**:
```typescript
/**
 * Result Type Utilities
 * Split Lease - send-email Edge Function
 *
 * Provides composable error handling without exceptions
 */

// Core Result type
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// Constructors
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// Type guards
export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok;
}

export function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return !result.ok;
}

// Unwrap with default
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return result.ok ? result.value : defaultValue;
}

// Map over success value
export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result;
}

// Chain operations (flatMap)
export function flatMap<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  return result.ok ? fn(result.value) : result;
}

// Map over error
export function mapError<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  return result.ok ? result : err(fn(result.error));
}

// Match pattern
export function match<T, E, R>(
  result: Result<T, E>,
  handlers: { ok: (value: T) => R; err: (error: E) => R }
): R {
  return result.ok ? handlers.ok(result.value) : handlers.err(result.error);
}

// Convert Promise<T> to Promise<Result<T, Error>>
export async function fromPromise<T>(
  promise: Promise<T>
): Promise<Result<T, Error>> {
  try {
    return ok(await promise);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}
```

**Verification**: Import and use in validators.ts - no runtime needed

---

### NEW FILE: lib/config.ts

**Purpose**: Pure configuration parsing with validation

**Dependencies**: `lib/result.ts`, `lib/types.ts`

**Code**:
```typescript
/**
 * Configuration Parser
 * Split Lease - send-email Edge Function
 *
 * Pure function to parse and validate environment variables
 */

import { Result, ok, err } from './result.ts';

// Environment interface (what we read from Deno.env)
export interface EnvReader {
  get(key: string): string | undefined;
}

// Validated configuration
export interface EmailConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  sendgridApiKey: string;
  sendgridEndpoint: string;
}

// Configuration for defaults
export interface EmailDefaults {
  fromEmail: string;
  fromName: string;
  defaultSubject: string;
}

export const DEFAULT_EMAIL_SETTINGS: EmailDefaults = {
  fromEmail: 'noreply@splitlease.com',
  fromName: 'Split Lease',
  defaultSubject: 'Message from Split Lease',
};

/**
 * Parse and validate email configuration from environment
 * PURE FUNCTION: Takes env reader, returns Result
 */
export function parseConfig(env: EnvReader): Result<EmailConfig, string[]> {
  const missing: string[] = [];

  const supabaseUrl = env.get('SUPABASE_URL');
  const supabaseServiceKey = env.get('SUPABASE_SERVICE_ROLE_KEY');
  const sendgridApiKey = env.get('SENDGRID_API_KEY');
  const sendgridEndpoint = env.get('SENDGRID_EMAIL_ENDPOINT');

  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!sendgridApiKey) missing.push('SENDGRID_API_KEY');
  if (!sendgridEndpoint) missing.push('SENDGRID_EMAIL_ENDPOINT');

  if (missing.length > 0) {
    return err(missing);
  }

  return ok({
    supabaseUrl: supabaseUrl!,
    supabaseServiceKey: supabaseServiceKey!,
    sendgridApiKey: sendgridApiKey!,
    sendgridEndpoint: sendgridEndpoint!,
  });
}

/**
 * Check if required secrets are configured (for health check)
 * PURE FUNCTION: Returns health status object
 */
export function getHealthStatus(env: EnvReader): {
  status: 'healthy' | 'unhealthy (missing secrets)';
  secrets: Record<string, boolean>;
} {
  const sendgridApiKeyConfigured = !!env.get('SENDGRID_API_KEY');
  const sendgridEndpointConfigured = !!env.get('SENDGRID_EMAIL_ENDPOINT');
  const allConfigured = sendgridApiKeyConfigured && sendgridEndpointConfigured;

  return {
    status: allConfigured ? 'healthy' : 'unhealthy (missing secrets)',
    secrets: {
      SENDGRID_API_KEY: sendgridApiKeyConfigured,
      SENDGRID_EMAIL_ENDPOINT: sendgridEndpointConfigured,
    },
  };
}
```

**Verification**: Unit test with mock EnvReader

---

### NEW FILE: lib/validators.ts

**Purpose**: Pure payload validation returning Results

**Dependencies**: `lib/result.ts`, `lib/types.ts`

**Code**:
```typescript
/**
 * Payload Validators
 * Split Lease - send-email Edge Function
 *
 * Pure validation functions returning Result types
 */

import { Result, ok, err } from './result.ts';
import type { SendEmailPayload } from './types.ts';

// Validation error type
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate email format
 * PURE FUNCTION
 */
export function validateEmailFormat(email: string): Result<string, ValidationError> {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(email)) {
    return err({ field: 'email', message: `Invalid email format: ${email}` });
  }

  return ok(email);
}

/**
 * Validate required fields exist
 * PURE FUNCTION
 */
export function validateRequired<T>(
  value: T | undefined | null,
  fieldName: string
): Result<T, ValidationError> {
  if (value === undefined || value === null || value === '') {
    return err({ field: fieldName, message: `${fieldName} is required` });
  }
  return ok(value);
}

/**
 * Validate send email payload
 * PURE FUNCTION: Validates structure and returns typed payload or errors
 */
export function validateSendPayload(
  payload: Record<string, unknown>
): Result<SendEmailPayload, ValidationError[]> {
  const errors: ValidationError[] = [];

  // Check required fields
  if (!payload.template_id) {
    errors.push({ field: 'template_id', message: 'template_id is required' });
  }
  if (!payload.to_email) {
    errors.push({ field: 'to_email', message: 'to_email is required' });
  }
  if (!payload.variables) {
    errors.push({ field: 'variables', message: 'variables is required' });
  }

  // Validate email format if provided
  if (payload.to_email && typeof payload.to_email === 'string') {
    const emailResult = validateEmailFormat(payload.to_email);
    if (!emailResult.ok) {
      errors.push(emailResult.error);
    }
  }

  // Validate from_email format if provided
  if (payload.from_email && typeof payload.from_email === 'string') {
    const fromEmailResult = validateEmailFormat(payload.from_email);
    if (!fromEmailResult.ok) {
      errors.push({ ...fromEmailResult.error, field: 'from_email' });
    }
  }

  if (errors.length > 0) {
    return err(errors);
  }

  return ok({
    template_id: payload.template_id as string,
    to_email: payload.to_email as string,
    to_name: payload.to_name as string | undefined,
    from_email: payload.from_email as string | undefined,
    from_name: payload.from_name as string | undefined,
    subject: payload.subject as string | undefined,
    variables: payload.variables as Record<string, string>,
  });
}
```

**Verification**: Unit test with various payloads

---

### NEW FILE: lib/variables.ts

**Purpose**: Pure variable building for template processing

**Dependencies**: `lib/types.ts`, `lib/config.ts`

**Code**:
```typescript
/**
 * Variable Builder
 * Split Lease - send-email Edge Function
 *
 * Pure function to build template variables from payload
 */

import type { SendEmailPayload } from './types.ts';
import type { EmailDefaults } from './config.ts';

/**
 * Build complete variables object for template processing
 * PURE FUNCTION: Merges payload variables with defaults
 */
export function buildEmailVariables(
  payload: SendEmailPayload,
  defaults: EmailDefaults
): Record<string, string> {
  const allVariables: Record<string, string> = {
    ...payload.variables,
    to_email: payload.to_email,
    from_email: payload.from_email || defaults.fromEmail,
    from_name: payload.from_name || defaults.fromName,
    subject: payload.subject || payload.variables.subject || defaults.defaultSubject,
  };

  // Add to_name if provided
  if (payload.to_name) {
    allVariables.to_name = payload.to_name;
  }

  return allVariables;
}

/**
 * Redact sensitive info from payload for logging
 * PURE FUNCTION
 */
export function redactPayloadForLogging(
  payload: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...payload,
    variables: '(redacted)',
  };
}
```

**Verification**: Unit test with various payloads and defaults

---

### NEW FILE: effects/database.ts

**Purpose**: Effectful database operations with Result returns

**Dependencies**: `lib/result.ts`, `lib/types.ts`, `lib/config.ts`, `@supabase/supabase-js`

**Code**:
```typescript
/**
 * Database Effects
 * Split Lease - send-email Edge Function
 *
 * EFFECTFUL: All database operations isolated here
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Result, ok, err } from '../lib/result.ts';
import type { EmailConfig } from '../lib/config.ts';
import type { EmailTemplate } from '../lib/types.ts';

// Database-specific error
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * Create Supabase client for reference_table schema
 * EFFECT: Creates stateful client object
 */
export function createSupabaseClient(config: EmailConfig): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'reference_table',
    },
  });
}

/**
 * Fetch email template from database
 * EFFECT: Performs database query
 */
export async function fetchTemplate(
  client: SupabaseClient,
  templateId: string
): Promise<Result<EmailTemplate, DatabaseError>> {
  const { data, error } = await client
    .from('zat_email_html_template_eg_sendbasicemailwf_')
    .select('_id, "Name", "Email Template JSON", "Description", "Email Reference", "Logo", "Placeholder"')
    .eq('_id', templateId)
    .single();

  if (error) {
    return err(new DatabaseError(
      `Template fetch failed: ${error.message}`,
      error.code,
      error
    ));
  }

  if (!data) {
    return err(new DatabaseError(`Template not found: ${templateId}`));
  }

  const template = data as EmailTemplate;

  if (!template['Email Template JSON']) {
    return err(new DatabaseError(
      `Template ${templateId} has no content (Email Template JSON is empty)`
    ));
  }

  return ok(template);
}
```

**Verification**: Integration test with test database

---

### NEW FILE: effects/sendgrid.ts

**Purpose**: Effectful SendGrid API operations with Result returns

**Dependencies**: `lib/result.ts`, `lib/types.ts`, `lib/config.ts`

**Code**:
```typescript
/**
 * SendGrid Effects
 * Split Lease - send-email Edge Function
 *
 * EFFECTFUL: All SendGrid API operations isolated here
 */

import { Result, ok, err } from '../lib/result.ts';
import type { EmailConfig } from '../lib/config.ts';
import type { SendGridResponse } from '../lib/types.ts';

// SendGrid-specific error
export class SendGridError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly response?: unknown
  ) {
    super(message);
    this.name = 'SendGridError';
  }
}

/**
 * Send email via SendGrid API
 * EFFECT: Performs HTTP request to external API
 */
export async function sendEmail(
  config: EmailConfig,
  requestBody: Record<string, unknown>
): Promise<Result<SendGridResponse, SendGridError>> {
  const response = await fetch(config.sendgridEndpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.sendgridApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const result: SendGridResponse = {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers.entries()),
  };

  // Parse response body
  if (!response.ok) {
    try {
      result.body = await response.json();
    } catch {
      result.body = await response.text();
    }

    const errorMessage = typeof result.body === 'object'
      ? JSON.stringify(result.body)
      : String(result.body);

    return err(new SendGridError(
      `SendGrid API error (${result.statusCode}): ${errorMessage}`,
      result.statusCode,
      result.body
    ));
  }

  // Get message ID from headers if available
  const messageId = response.headers.get('x-message-id');
  if (messageId) {
    result.body = { messageId };
  }

  return ok(result);
}

/**
 * Check if SendGrid response indicates success
 * PURE FUNCTION (kept here for co-location with send)
 */
export function isSuccessResponse(response: SendGridResponse): boolean {
  return response.statusCode === 202 || response.statusCode === 200;
}
```

**Verification**: Integration test with SendGrid test mode

---

### NEW FILE: effects/logging.ts

**Purpose**: Centralized logging effect wrapper

**Dependencies**: None

**Code**:
```typescript
/**
 * Logging Effects
 * Split Lease - send-email Edge Function
 *
 * EFFECTFUL: All console operations isolated here
 */

// Logger interface for dependency injection
export interface Logger {
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
  step(step: string, total: number, message: string): void;
  separator(label: string): void;
}

/**
 * Create console logger with prefix
 * EFFECT: Creates logger that writes to console
 */
export function createLogger(prefix: string): Logger {
  const formatPrefix = `[${prefix}]`;

  return {
    info(message: string, data?: unknown) {
      if (data !== undefined) {
        console.log(`${formatPrefix} ${message}`, data);
      } else {
        console.log(`${formatPrefix} ${message}`);
      }
    },

    warn(message: string, data?: unknown) {
      if (data !== undefined) {
        console.warn(`${formatPrefix} ${message}`, data);
      } else {
        console.warn(`${formatPrefix} ${message}`);
      }
    },

    error(message: string, data?: unknown) {
      if (data !== undefined) {
        console.error(`${formatPrefix} ${message}`, data);
      } else {
        console.error(`${formatPrefix} ${message}`);
      }
    },

    step(step: number, total: number, message: string) {
      console.log(`${formatPrefix} Step ${step}/${total}: ${message}`);
    },

    separator(label: string) {
      console.log(`${formatPrefix} ========== ${label} ==========`);
    },
  };
}

/**
 * Create no-op logger for testing
 * PURE: Returns logger that does nothing
 */
export function createNoOpLogger(): Logger {
  return {
    info() {},
    warn() {},
    error() {},
    step() {},
    separator() {},
  };
}
```

**Verification**: Unit test with createNoOpLogger

---

### MODIFY FILE: lib/types.ts

**Current State**: Type definitions (65 lines)

**Required Changes**: Add error types for each domain

**Code to Add** (append to file):
```typescript
// ─────────────────────────────────────────────────────────────
// Error Types for Result-based handling
// ─────────────────────────────────────────────────────────────

// Union type for all send operation errors
export type SendError =
  | { type: 'validation'; errors: Array<{ field: string; message: string }> }
  | { type: 'config'; missing: string[] }
  | { type: 'database'; message: string; code?: string }
  | { type: 'template'; message: string }
  | { type: 'sendgrid'; message: string; statusCode: number }
  | { type: 'parse'; message: string };

// Helper to create typed errors
export const SendErrors = {
  validation: (errors: Array<{ field: string; message: string }>): SendError =>
    ({ type: 'validation', errors }),
  config: (missing: string[]): SendError =>
    ({ type: 'config', missing }),
  database: (message: string, code?: string): SendError =>
    ({ type: 'database', message, code }),
  template: (message: string): SendError =>
    ({ type: 'template', message }),
  sendgrid: (message: string, statusCode: number): SendError =>
    ({ type: 'sendgrid', message, statusCode }),
  parse: (message: string): SendError =>
    ({ type: 'parse', message }),
};
```

**Verification**: TypeScript compilation check

---

### MODIFY FILE: lib/sendgridClient.ts

**Current State**: 132 lines with console.log statements

**Required Changes**:
1. Remove all console.log statements
2. Keep only pure functions (buildSendGridRequestBody, isSuccessResponse)
3. Remove sendEmail and sendEmailRaw (moved to effects/sendgrid.ts)

**New Content** (complete replacement):
```typescript
/**
 * SendGrid Request Builder
 * Split Lease - send-email Edge Function
 *
 * PURE FUNCTIONS ONLY - no side effects
 */

import type { SendGridMailRequest, SendGridResponse } from './types.ts';

/**
 * Build SendGrid mail request body
 * PURE FUNCTION
 */
export function buildSendGridRequestBody(params: {
  toEmail: string;
  toName?: string;
  fromEmail: string;
  fromName?: string;
  subject: string;
  htmlContent: string;
}): SendGridMailRequest {
  const { toEmail, toName, fromEmail, fromName, subject, htmlContent } = params;

  return {
    personalizations: [
      {
        to: [
          {
            email: toEmail,
            ...(toName && { name: toName }),
          },
        ],
        subject: subject,
      },
    ],
    from: {
      email: fromEmail,
      ...(fromName && { name: fromName }),
    },
    content: [
      {
        type: 'text/html',
        value: htmlContent,
      },
    ],
  };
}

/**
 * Check if SendGrid response indicates success
 * PURE FUNCTION
 */
export function isSuccessResponse(response: SendGridResponse): boolean {
  return response.statusCode === 202 || response.statusCode === 200;
}
```

**Verification**: TypeScript compilation, import in effects/sendgrid.ts

---

### MODIFY FILE: handlers/send.ts

**Current State**: 173 lines monolithic handler

**Required Changes**: Complete rewrite as pure orchestration

**New Content** (complete replacement):
```typescript
/**
 * Send Email Handler
 * Split Lease - send-email Edge Function
 *
 * Pure orchestration of the email sending pipeline.
 * All effects are injected via dependencies.
 */

import type { SendEmailPayload, SendEmailResult, SendError } from '../lib/types.ts';
import type { EmailConfig, EmailDefaults } from '../lib/config.ts';
import type { Logger } from '../effects/logging.ts';
import { Result, ok, err } from '../lib/result.ts';
import { validateSendPayload } from '../lib/validators.ts';
import { buildEmailVariables, redactPayloadForLogging } from '../lib/variables.ts';
import { processTemplateJson, validatePlaceholders } from '../lib/templateProcessor.ts';
import { SendErrors } from '../lib/types.ts';

// Effect interfaces for dependency injection
export interface SendDeps {
  fetchTemplate: (templateId: string) => Promise<Result<{
    Name?: string;
    'Email Template JSON': string
  }, Error>>;
  sendEmail: (body: Record<string, unknown>) => Promise<Result<{
    messageId?: string
  }, Error>>;
  logger: Logger;
}

/**
 * Create send handler with injected dependencies
 * Returns a handler function that orchestrates the pipeline
 */
export function createSendHandler(
  config: EmailConfig,
  defaults: EmailDefaults,
  deps: SendDeps
) {
  return async function handleSend(
    payload: Record<string, unknown>
  ): Promise<Result<SendEmailResult, SendError>> {
    const { logger, fetchTemplate, sendEmail } = deps;

    logger.separator('SEND EMAIL');
    logger.info('Payload:', redactPayloadForLogging(payload));

    // Step 1: Validate payload
    const validationResult = validateSendPayload(payload);
    if (!validationResult.ok) {
      return err(SendErrors.validation(validationResult.error));
    }
    const validPayload = validationResult.value;

    // Step 2: Fetch template
    logger.step(1, 3, 'Fetching template...');
    logger.info('Looking up template_id:', validPayload.template_id);

    const templateResult = await fetchTemplate(validPayload.template_id);
    if (!templateResult.ok) {
      return err(SendErrors.database(templateResult.error.message));
    }
    const template = templateResult.value;
    logger.info('Template found:', template.Name || validPayload.template_id);

    // Step 3: Process template placeholders
    logger.step(2, 3, 'Processing template placeholders...');

    const allVariables = buildEmailVariables(validPayload, defaults);
    logger.info('Placeholder replacements:', JSON.stringify(allVariables, null, 2));

    // Validate placeholders (warning only)
    const templateJson = template['Email Template JSON'];
    const missingPlaceholders = validatePlaceholders(templateJson, allVariables);
    if (missingPlaceholders.length > 0) {
      logger.warn('Missing placeholder values:', missingPlaceholders.join(', '));
    }

    // Process the template
    const processedJsonString = processTemplateJson(templateJson, allVariables);
    logger.info('Template processed successfully');

    // Parse JSON
    let sendGridBody: Record<string, unknown>;
    try {
      sendGridBody = JSON.parse(processedJsonString);
    } catch (parseError) {
      return err(SendErrors.parse(
        `Template ${validPayload.template_id} produced invalid JSON after placeholder processing`
      ));
    }

    // Step 4: Send via SendGrid
    logger.step(3, 3, 'Sending via SendGrid...');

    const sendResult = await sendEmail(sendGridBody);
    if (!sendResult.ok) {
      return err(SendErrors.sendgrid(sendResult.error.message, 500));
    }

    logger.separator('SUCCESS');

    return ok({
      message_id: sendResult.value.messageId,
      template_id: validPayload.template_id,
      to_email: validPayload.to_email,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });
  };
}
```

**Verification**:
- TypeScript compilation
- Integration with modified index.ts

---

### MODIFY FILE: index.ts

**Current State**: 167 lines with inline health check

**Required Changes**:
1. Parse config at startup using parseConfig()
2. Create handler with createSendHandler()
3. Wire dependencies together
4. Use getHealthStatus() for health check

**New Content** (complete replacement):
```typescript
/**
 * Send Email Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * Main router for email operations:
 * - send: Send templated email via SendGrid
 *
 * Authorization: Bearer token in Authorization header
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  ValidationError,
  AuthenticationError,
  formatErrorResponse,
  getStatusCodeFromError,
} from "../_shared/errors.ts";
import { validateRequired, validateAction } from "../_shared/validation.ts";
import { createErrorCollector, ErrorCollector } from "../_shared/slack.ts";

import { parseConfig, getHealthStatus, DEFAULT_EMAIL_SETTINGS } from "./lib/config.ts";
import { createSendHandler } from "./handlers/send.ts";
import { createLogger } from "./effects/logging.ts";
import { createSupabaseClient, fetchTemplate } from "./effects/database.ts";
import { sendEmail } from "./effects/sendgrid.ts";
import type { SendError } from "./lib/types.ts";

// ─────────────────────────────────────────────────────────────
// Configuration - parsed ONCE at startup
// ─────────────────────────────────────────────────────────────

const ALLOWED_ACTIONS = ["send", "health"] as const;
type Action = (typeof ALLOWED_ACTIONS)[number];

interface RequestBody {
  action: Action;
  payload: Record<string, unknown>;
}

// Parse configuration at startup
const configResult = parseConfig(Deno.env);

// Create logger
const logger = createLogger('send-email');

logger.info('Edge Function started');

// ─────────────────────────────────────────────────────────────
// Health Check Handler
// ─────────────────────────────────────────────────────────────

function handleHealth(): { status: string; timestamp: string; actions: string[]; secrets: Record<string, boolean> } {
  const healthStatus = getHealthStatus(Deno.env);

  return {
    ...healthStatus,
    timestamp: new Date().toISOString(),
    actions: [...ALLOWED_ACTIONS],
  };
}

// ─────────────────────────────────────────────────────────────
// Convert SendError to HTTP Error
// ─────────────────────────────────────────────────────────────

function sendErrorToHttpError(error: SendError): Error {
  switch (error.type) {
    case 'validation':
      return new ValidationError(error.errors.map(e => e.message).join('; '));
    case 'config':
      return new Error(`Missing configuration: ${error.missing.join(', ')}`);
    case 'database':
      return new Error(error.message);
    case 'template':
      return new Error(error.message);
    case 'sendgrid':
      return new Error(error.message);
    case 'parse':
      return new Error(error.message);
  }
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  logger.separator('REQUEST');
  logger.info(`Method: ${req.method}`);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  // Only POST allowed
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Error collector for consolidated error reporting
  let collector: ErrorCollector | null = null;

  try {
    // ─────────────────────────────────────────────────────────
    // 1. Parse and validate request
    // ─────────────────────────────────────────────────────────

    const body: RequestBody = await req.json();

    validateRequired(body.action, "action");
    validateAction(body.action, [...ALLOWED_ACTIONS]);

    logger.info(`Action: ${body.action}`);

    // Create error collector after we know the action
    collector = createErrorCollector('send-email', body.action);

    // ─────────────────────────────────────────────────────────
    // 2. Check authorization for send action
    // ─────────────────────────────────────────────────────────

    if (body.action === 'send') {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new AuthenticationError("Missing or invalid Authorization header. Use Bearer token.");
      }

      const token = authHeader.replace("Bearer ", "");
      if (!token) {
        throw new AuthenticationError("Empty Bearer token");
      }

      logger.info('Authorization header present');
    }

    // ─────────────────────────────────────────────────────────
    // 3. Route to handler
    // ─────────────────────────────────────────────────────────

    let result;

    switch (body.action) {
      case "send": {
        validateRequired(body.payload, "payload");

        // Check config at request time (allows for runtime config changes)
        if (!configResult.ok) {
          throw new Error(`Missing environment variables: ${configResult.error.join(', ')}`);
        }
        const config = configResult.value;

        // Create Supabase client
        const supabase = createSupabaseClient(config);

        // Create handler with injected dependencies
        const handleSend = createSendHandler(
          config,
          DEFAULT_EMAIL_SETTINGS,
          {
            fetchTemplate: (templateId) => fetchTemplate(supabase, templateId),
            sendEmail: (body) => sendEmail(config, body),
            logger: createLogger('send-email:send'),
          }
        );

        const sendResult = await handleSend(body.payload);

        if (!sendResult.ok) {
          throw sendErrorToHttpError(sendResult.error);
        }

        result = sendResult.value;
        break;
      }

      case "health":
        result = handleHealth();
        break;

      default:
        throw new ValidationError(`Unhandled action: ${body.action}`);
    }

    logger.separator('SUCCESS');

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.separator('ERROR');
    logger.error('', error);

    // Report to Slack
    if (collector) {
      collector.add(error as Error, 'Fatal error in main handler');
      collector.reportToSlack();
    }

    const statusCode = getStatusCodeFromError(error as Error);
    const errorResponse = formatErrorResponse(error as Error);

    return new Response(JSON.stringify(errorResponse), {
      status: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

**Verification**:
- TypeScript compilation
- Test send action with real template
- Test health action

---

## 5. Execution Order

### Phase 1: Foundation (No Dependencies)
Order matters - each step must complete before next.

| Step | File | Action | Depends On |
|------|------|--------|------------|
| 1.1 | `lib/result.ts` | CREATE | Nothing |
| 1.2 | `lib/types.ts` | APPEND | Nothing |
| 1.3 | `effects/logging.ts` | CREATE | Nothing |

### Phase 2: Pure Logic Layer
Can be done in parallel after Phase 1.

| Step | File | Action | Depends On |
|------|------|--------|------------|
| 2.1 | `lib/config.ts` | CREATE | result.ts |
| 2.2 | `lib/validators.ts` | CREATE | result.ts, types.ts |
| 2.3 | `lib/variables.ts` | CREATE | types.ts, config.ts |
| 2.4 | `lib/sendgridClient.ts` | MODIFY | types.ts |

### Phase 3: Effect Layer
Can be done in parallel after Phase 2.

| Step | File | Action | Depends On |
|------|------|--------|------------|
| 3.1 | `effects/database.ts` | CREATE | result.ts, types.ts, config.ts |
| 3.2 | `effects/sendgrid.ts` | CREATE | result.ts, types.ts, config.ts |

### Phase 4: Integration Layer
Sequential - each depends on previous.

| Step | File | Action | Depends On |
|------|------|--------|------------|
| 4.1 | `handlers/send.ts` | MODIFY | All Phase 2-3 files |
| 4.2 | `index.ts` | MODIFY | handlers/send.ts, all Phase 2-3 files |

### Phase 5: Verification

| Step | Action |
|------|--------|
| 5.1 | TypeScript compilation (`deno check index.ts`) |
| 5.2 | Deploy to local (`supabase functions serve send-email`) |
| 5.3 | Test health action |
| 5.4 | Test send action with valid template |
| 5.5 | Test send action with invalid payload (validation error) |
| 5.6 | Test send action with missing template (database error) |

### Safe Stopping Points

- **After Phase 1**: Foundation is in place, can be tested in isolation
- **After Phase 2**: All pure functions ready, can be unit tested
- **After Phase 3**: Effects ready, can be integration tested
- **After Phase 4**: Full refactor complete

---

## 6. Risk Assessment

### High Risk: Breaking Existing Functionality

**Risk**: External API contract changes break callers
**Mitigation**:
- Request/response format is explicitly preserved
- Add integration test comparing old vs new response
- Keep original files as `.backup` until verified

### Medium Risk: Missing Import Statements

**Risk**: New file structure introduces circular dependencies
**Mitigation**:
- Dependency map in Section 2 shows no cycles
- effects/ depends on lib/, never reverse
- handlers/ depends on both, never depended on

### Medium Risk: Type Mismatches

**Risk**: SendError type doesn't cover all error cases
**Mitigation**:
- Exhaustive switch in sendErrorToHttpError
- TypeScript will catch missing cases

### Low Risk: Performance Regression

**Risk**: Additional abstraction layers slow down requests
**Mitigation**:
- All abstractions are zero-cost at runtime
- Result type is just an object literal
- Logger is same console.log calls, just wrapped

### Low Risk: Deployment Issues

**Risk**: New files not included in deployment
**Mitigation**:
- All files in same `send-email/` directory
- Deno imports by relative path, auto-included

---

## 7. Verification Checklist

### Pre-Implementation

- [ ] Backup current files: `cp -r send-email send-email.backup`
- [ ] Ensure local Supabase is running: `supabase status`
- [ ] Have test template ID ready for manual testing

### Post-Implementation

#### Compilation
- [ ] `deno check supabase/functions/send-email/index.ts` passes
- [ ] No TypeScript errors in any new files

#### Unit Tests (if adding)
- [ ] `lib/result.ts`: ok(), err(), map(), flatMap() work correctly
- [ ] `lib/config.ts`: parseConfig() returns errors for missing vars
- [ ] `lib/validators.ts`: validateSendPayload() catches all invalid cases
- [ ] `lib/variables.ts`: buildEmailVariables() merges correctly

#### Integration Tests
- [ ] Health action returns same format as before
- [ ] Send action with valid payload succeeds
- [ ] Send action with invalid email returns 400
- [ ] Send action with missing template returns appropriate error
- [ ] Send action with invalid template JSON returns parse error

#### Code Quality
- [ ] handlers/send.ts is under 60 lines
- [ ] Zero Deno.env.get calls in lib/ files
- [ ] Zero console.log calls in lib/ files
- [ ] All new functions have JSDoc comments

---

## 8. Reference Appendix

### All File Paths (Consolidated)

**Existing Files (to modify)**:
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\send-email\index.ts`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\send-email\handlers\send.ts`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\send-email\lib\types.ts`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\send-email\lib\sendgridClient.ts`

**Existing Files (no changes)**:
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\send-email\lib\templateProcessor.ts`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\send-email\deno.json`

**New Files (to create)**:
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\send-email\lib\result.ts`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\send-email\lib\config.ts`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\send-email\lib\validators.ts`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\send-email\lib\variables.ts`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\send-email\effects\database.ts`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\send-email\effects\sendgrid.ts`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\send-email\effects\logging.ts`

**Shared Files (referenced, not modified)**:
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\cors.ts`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\errors.ts`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\validation.ts`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\slack.ts`

### Key Pattern Examples

**Before: Hidden Dependency**
```typescript
// BEFORE: Environment access inside function
export async function handleSend(payload) {
  const apiKey = Deno.env.get('SENDGRID_API_KEY'); // Hidden!
  // ...
}
```

**After: Dependency Injection**
```typescript
// AFTER: Config injected at startup
const config = parseConfig(Deno.env);
const handler = createSendHandler(config, defaults, deps);
```

**Before: Imperative Error**
```typescript
// BEFORE: Throw interrupts control flow
if (templateError) {
  throw new Error(`Template not found: ${templateId}`);
}
```

**After: Result Type**
```typescript
// AFTER: Result enables composition
const templateResult = await fetchTemplate(templateId);
if (!templateResult.ok) {
  return err(SendErrors.database(templateResult.error.message));
}
const template = templateResult.value;
```

**Before: Scattered Logging**
```typescript
// BEFORE: console.log mixed with logic
console.log('[send-email:send] Step 1/3: Fetching template...');
const { data, error } = await supabase.from(...);
console.log('[send-email:send] Query result - data:', data ? 'found' : 'null');
```

**After: Injected Logger**
```typescript
// AFTER: Logger injected as dependency
logger.step(1, 3, 'Fetching template...');
const templateResult = await deps.fetchTemplate(templateId);
logger.info('Template found:', templateResult.value.Name);
```

---

## Post-Implementation

After implementing this plan:
1. Move this file to `.claude/plans/Done/`
2. Remind about manual deployment: `supabase functions deploy send-email`
3. Git commit the changes

---

**DOCUMENT_VERSION**: 1.0
**LAST_UPDATED**: 2026-01-05
**AUTHOR**: Claude Code (cleanup-planner)
