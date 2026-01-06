# Functional Programming Transformation Analysis

**Created**: 2026-01-06
**Status**: Analysis Complete
**Source**: "Functional Programming in Scala" by Chiusano & Bjarnason
**Scope**: Workflow Orchestration System + Edge Functions

---

## Executive Summary

This document analyzes the current workflow orchestration implementation through the lens of functional programming principles and proposes concrete transformations to align with FP best practices. The goal is not FP for its own sake, but to gain the **practical benefits**: composability, testability, explicit error handling, and reasoning about code.

---

## Part 1: Core FP Principles (From the Book)

### The Seven Pillars

| Principle | Definition | Practical Benefit |
|-----------|------------|-------------------|
| **Referential Transparency** | An expression can be replaced with its value without changing behavior | Enables local reasoning, caching, parallelization |
| **Pure Functions** | Same input → same output, no side effects | Testable without mocks, composable |
| **Immutability** | Data structures never change after creation | No race conditions, predictable state |
| **Explicit Effects** | Side effects are values that describe computations | Effects can be composed, inspected, optimized |
| **Algebraic Data Types** | Model domain with sum types (Either/Option) and product types | Exhaustive pattern matching, no null checks |
| **Composition** | Build complex functions from simple ones | Reusable primitives, DRY |
| **Type-Driven Design** | Use types to enforce correctness at compile time | Bugs caught early, self-documenting code |

### The Functional Core / Imperative Shell Pattern

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                         IMPERATIVE SHELL                                    │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  • HTTP handlers (Deno.serve)                                       │   │
│   │  • Database operations (supabase.from())                            │   │
│   │  • Queue operations (pgmq.send/read)                                │   │
│   │  • External API calls (fetch)                                       │   │
│   │  • Logging (console.log)                                            │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    │ calls                                  │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                                                                     │   │
│   │                      FUNCTIONAL CORE                                │   │
│   │                                                                     │   │
│   │  • Validation logic (pure predicates)                               │   │
│   │  • Template interpolation (pure transformation)                     │   │
│   │  • Retry calculations (pure math)                                   │   │
│   │  • State transitions (pure functions)                               │   │
│   │  • Error aggregation (pure composition)                             │   │
│   │  • Workflow step resolution (pure lookup)                           │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key Insight**: The shell performs effects, the core computes. The core is 100% testable without mocks.

---

## Part 2: Current State Analysis

### Anti-Pattern Inventory

| Anti-Pattern | Location | Severity | FP Violation |
|--------------|----------|----------|--------------|
| Side effects mixed with logic | `workflow-orchestrator/index.ts` | HIGH | Impure functions |
| Exception-based error handling | All Edge Functions | HIGH | No explicit error types |
| Void return types | `enqueueBubbleSync`, `markAsFailed` | HIGH | Lost information |
| Mutable state in loops | `bubbleSyncQueue.ts` | HIGH | Mutation |
| Implicit context threading | `handleEnqueue` | MEDIUM | Hidden dependencies |
| Defaulting with `\|\|` | `queueManager.ts` | MEDIUM | No Option type |
| Business logic in persistence | `markAsFailed` | MEDIUM | Coupled concerns |

### Current Code Structure (Problematic)

```typescript
// CURRENT: Imperative, side-effect-laden
async function handleEnqueue(supabase: any, payload: any) {
    try {
        validateRequired(workflow, "workflow");  // throws

        const { data: definition } = await supabase  // side effect
            .from("workflow_definitions")
            .select("*")
            .single();

        if (!definition) throw new ValidationError(...);  // throws

        const missing = definition.required_fields
            .filter(f => !data[f]);

        if (missing.length > 0) throw new ValidationError(...);  // throws

        await supabase.from("workflow_executions").insert(...);  // side effect
        await supabase.schema("pgmq_public").rpc("send", ...);   // side effect

        return { execution_id, status: "queued" };
    } catch (error) {
        // All errors caught here, type information lost
        return formatErrorResponse(error);
    }
}
```

**Problems**:
1. Can't test validation without database
2. Can't test business logic without catching exceptions
3. Error types are erased at catch boundary
4. Side effects interleaved with pure logic
5. No way to compose operations

---

## Part 3: The Result Type Foundation

### Introducing Result<T, E>

The foundation of FP error handling is making errors **explicit in types**:

```typescript
// supabase/functions/_shared/result.ts

/**
 * Result Type - The foundation of functional error handling
 *
 * Replaces try/catch with explicit, composable error handling.
 * Inspired by Rust's Result and Scala's Either.
 */

export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

// Constructors
export const Ok = <T>(value: T): Result<T, never> =>
  ({ ok: true, value });

export const Err = <E>(error: E): Result<never, E> =>
  ({ ok: false, error });

// Functor: Transform the success value
export const map = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> =>
  result.ok ? Ok(fn(result.value)) : result;

// Monad: Chain operations that might fail
export const flatMap = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> =>
  result.ok ? fn(result.value) : result;

// Combine multiple results
export const all = <T, E>(results: Result<T, E>[]): Result<T[], E> => {
  const values: T[] = [];
  for (const result of results) {
    if (!result.ok) return result;
    values.push(result.value);
  }
  return Ok(values);
};

// Collect all errors (don't short-circuit)
export const allErrors = <T, E>(results: Result<T, E>[]): Result<T[], E[]> => {
  const values: T[] = [];
  const errors: E[] = [];

  for (const result of results) {
    if (result.ok) {
      values.push(result.value);
    } else {
      errors.push(result.error);
    }
  }

  return errors.length > 0 ? Err(errors) : Ok(values);
};

// Convert throwing function to Result-returning
export const tryCatch = <T, E>(
  fn: () => T,
  onError: (e: unknown) => E
): Result<T, E> => {
  try {
    return Ok(fn());
  } catch (e) {
    return Err(onError(e));
  }
};

// Async version
export const tryCatchAsync = async <T, E>(
  fn: () => Promise<T>,
  onError: (e: unknown) => E
): Promise<Result<T, E>> => {
  try {
    return Ok(await fn());
  } catch (e) {
    return Err(onError(e));
  }
};

// Pattern matching helper
export const match = <T, E, R>(
  result: Result<T, E>,
  handlers: {
    ok: (value: T) => R;
    err: (error: E) => R;
  }
): R =>
  result.ok ? handlers.ok(result.value) : handlers.err(result.error);

// Provide default value on error
export const getOrElse = <T, E>(
  result: Result<T, E>,
  defaultValue: T
): T =>
  result.ok ? result.value : defaultValue;

// Transform error type
export const mapError = <T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> =>
  result.ok ? result : Err(fn(result.error));
```

### Usage Pattern

```typescript
// BEFORE: Exception-based
function validateWorkflow(name: string, data: unknown): void {
  if (!name) throw new ValidationError("Missing workflow name");
  if (!data) throw new ValidationError("Missing data");
}

// AFTER: Result-based
type ValidationError = { field: string; message: string };

const validateWorkflow = (
  name: string | undefined,
  data: unknown
): Result<{ name: string; data: Record<string, unknown> }, ValidationError[]> => {
  const errors: ValidationError[] = [];

  if (!name) {
    errors.push({ field: 'workflow', message: 'Missing workflow name' });
  }
  if (!data || typeof data !== 'object') {
    errors.push({ field: 'data', message: 'Missing or invalid data' });
  }

  return errors.length > 0
    ? Err(errors)
    : Ok({ name: name!, data: data as Record<string, unknown> });
};
```

---

## Part 4: Option Type for Nullable Values

### Introducing Option<T>

```typescript
// supabase/functions/_shared/option.ts

/**
 * Option Type - Explicit representation of optional values
 *
 * Replaces null/undefined checks with explicit, composable handling.
 */

export type Option<T> =
  | { readonly type: 'Some'; readonly value: T }
  | { readonly type: 'None' };

// Constructors
export const Some = <T>(value: T): Option<T> =>
  ({ type: 'Some', value });

export const None: Option<never> = { type: 'None' };

// Create from nullable
export const fromNullable = <T>(value: T | null | undefined): Option<T> =>
  value != null ? Some(value) : None;

// Functor
export const mapOption = <T, U>(
  option: Option<T>,
  fn: (value: T) => U
): Option<U> =>
  option.type === 'Some' ? Some(fn(option.value)) : None;

// Monad
export const flatMapOption = <T, U>(
  option: Option<T>,
  fn: (value: T) => Option<U>
): Option<U> =>
  option.type === 'Some' ? fn(option.value) : None;

// Get value or default
export const getOrElseOption = <T>(option: Option<T>, defaultValue: T): T =>
  option.type === 'Some' ? option.value : defaultValue;

// Convert to Result
export const toResult = <T, E>(option: Option<T>, error: E): Result<T, E> =>
  option.type === 'Some' ? Ok(option.value) : Err(error);
```

### Usage Pattern

```typescript
// BEFORE: Implicit null handling
const fetchPendingItems = async (supabase, batchSize) => {
  const { data, error } = await supabase.from('sync_queue').select(...);
  return data || [];  // Hides error case
};

// AFTER: Explicit Option
const fetchPendingItems = async (
  supabase: SupabaseClient,
  batchSize: number
): Promise<Result<Option<QueueItem[]>, DatabaseError>> => {
  const { data, error } = await supabase.from('sync_queue').select(...);

  if (error) {
    return Err({ code: error.code, message: error.message });
  }

  return Ok(data && data.length > 0 ? Some(data) : None);
};

// Caller handles explicitly
const result = await fetchPendingItems(supabase, 10);
if (!result.ok) {
  // Handle database error
  return;
}
if (result.value.type === 'None') {
  // No items to process - explicit!
  return;
}
const items = result.value.value;  // Guaranteed non-empty
```

---

## Part 5: Algebraic Data Types for Domain Modeling

### Workflow State Machine (ADT)

```typescript
// supabase/functions/workflow-orchestrator/lib/types.ts

/**
 * Workflow State - Algebraic Data Type
 *
 * Instead of string status with implicit transitions,
 * model the state machine explicitly in types.
 */

// Sum type for workflow states
export type WorkflowState =
  | { readonly status: 'pending' }
  | { readonly status: 'running'; readonly currentStep: number; readonly startedAt: Date }
  | { readonly status: 'completed'; readonly completedAt: Date; readonly finalContext: Context }
  | { readonly status: 'failed'; readonly failedAt: Date; readonly error: WorkflowError; readonly failedStep: number }
  | { readonly status: 'cancelled'; readonly cancelledAt: Date; readonly reason: string };

// Product type for workflow execution
export type WorkflowExecution = {
  readonly id: string;
  readonly workflowName: string;
  readonly workflowVersion: number;
  readonly state: WorkflowState;
  readonly totalSteps: number;
  readonly inputPayload: Context;
  readonly context: Context;
  readonly correlationId: string;
  readonly triggeredBy: TriggerSource;
  readonly createdAt: Date;
};

// Type-safe state transitions
export type WorkflowTransition =
  | { readonly type: 'start'; readonly startedAt: Date }
  | { readonly type: 'advance'; readonly stepResult: StepResult }
  | { readonly type: 'complete'; readonly completedAt: Date }
  | { readonly type: 'fail'; readonly error: WorkflowError; readonly failedAt: Date }
  | { readonly type: 'cancel'; readonly reason: string; readonly cancelledAt: Date };

// Pure state transition function
export const applyTransition = (
  execution: WorkflowExecution,
  transition: WorkflowTransition
): Result<WorkflowExecution, TransitionError> => {
  switch (transition.type) {
    case 'start':
      if (execution.state.status !== 'pending') {
        return Err({
          type: 'invalid_transition',
          from: execution.state.status,
          to: 'running'
        });
      }
      return Ok({
        ...execution,
        state: {
          status: 'running',
          currentStep: 0,
          startedAt: transition.startedAt
        }
      });

    case 'advance':
      if (execution.state.status !== 'running') {
        return Err({
          type: 'invalid_transition',
          from: execution.state.status,
          to: 'running'
        });
      }
      const newStep = execution.state.currentStep + 1;
      const newContext = mergeContext(execution.context, transition.stepResult);

      if (newStep >= execution.totalSteps) {
        return Ok({
          ...execution,
          context: newContext,
          state: {
            status: 'completed',
            completedAt: new Date(),
            finalContext: newContext
          }
        });
      }

      return Ok({
        ...execution,
        context: newContext,
        state: {
          ...execution.state,
          currentStep: newStep
        }
      });

    case 'fail':
      if (execution.state.status !== 'running') {
        return Err({
          type: 'invalid_transition',
          from: execution.state.status,
          to: 'failed'
        });
      }
      return Ok({
        ...execution,
        state: {
          status: 'failed',
          failedAt: transition.failedAt,
          error: transition.error,
          failedStep: execution.state.currentStep
        }
      });

    case 'cancel':
      return Ok({
        ...execution,
        state: {
          status: 'cancelled',
          cancelledAt: transition.cancelledAt,
          reason: transition.reason
        }
      });
  }
};
```

### Step Failure Policy (ADT)

```typescript
// Sum type for failure handling
export type FailurePolicy =
  | { readonly type: 'retry'; readonly maxAttempts: number; readonly backoff: BackoffStrategy }
  | { readonly type: 'continue'; readonly logError: boolean }
  | { readonly type: 'abort' };

export type BackoffStrategy =
  | { readonly type: 'fixed'; readonly delayMs: number }
  | { readonly type: 'exponential'; readonly baseMs: number; readonly maxMs: number }
  | { readonly type: 'fibonacci'; readonly baseMs: number };

// Pure backoff calculation
export const calculateBackoff = (
  strategy: BackoffStrategy,
  attempt: number
): number => {
  switch (strategy.type) {
    case 'fixed':
      return strategy.delayMs;
    case 'exponential':
      return Math.min(strategy.baseMs * Math.pow(2, attempt), strategy.maxMs);
    case 'fibonacci':
      return strategy.baseMs * fibonacci(attempt);
  }
};

// Pure retry decision
export type RetryDecision =
  | { readonly type: 'retry'; readonly delayMs: number; readonly attempt: number }
  | { readonly type: 'exhausted'; readonly totalAttempts: number }
  | { readonly type: 'skip' };

export const decideRetry = (
  policy: FailurePolicy,
  currentAttempt: number
): RetryDecision => {
  switch (policy.type) {
    case 'retry':
      if (currentAttempt >= policy.maxAttempts) {
        return { type: 'exhausted', totalAttempts: currentAttempt };
      }
      return {
        type: 'retry',
        delayMs: calculateBackoff(policy.backoff, currentAttempt),
        attempt: currentAttempt + 1
      };
    case 'continue':
      return { type: 'skip' };
    case 'abort':
      return { type: 'exhausted', totalAttempts: currentAttempt };
  }
};
```

---

## Part 6: Pure Validation Layer

### Template Variable Validation (Already Pure - Enhance)

```typescript
// supabase/functions/workflow-enqueue/lib/validation.ts

/**
 * Pure Validation Functions
 *
 * All validation logic is pure - no side effects, no exceptions.
 * Returns Result types for composable error handling.
 */

export type TemplateVariable = {
  readonly name: string;
  readonly path: string[];
  readonly isRuntimeVar: boolean;  // step_N_result variables
};

// Pure: Extract all template variables from any structure
export const extractTemplateVariables = (obj: unknown): TemplateVariable[] => {
  const variables: TemplateVariable[] = [];

  const extract = (value: unknown): void => {
    if (typeof value === 'string') {
      const regex = /\{\{\s*([\w.]+)\s*\}\}/g;
      let match;
      while ((match = regex.exec(value)) !== null) {
        const fullPath = match[1];
        const parts = fullPath.split('.');
        variables.push({
          name: fullPath,
          path: parts,
          isRuntimeVar: parts[0].startsWith('step_')
        });
      }
    } else if (Array.isArray(value)) {
      value.forEach(extract);
    } else if (typeof value === 'object' && value !== null) {
      Object.values(value).forEach(extract);
    }
  };

  extract(obj);
  return variables;
};

// Pure: Check if a variable is satisfied by context
export const isVariableSatisfied = (
  variable: TemplateVariable,
  context: Record<string, unknown>
): boolean => {
  if (variable.isRuntimeVar) return true;  // Will be populated at runtime

  let current: unknown = context;
  for (const key of variable.path) {
    if (current == null || typeof current !== 'object') return false;
    current = (current as Record<string, unknown>)[key];
  }
  return current !== undefined;
};

// Pure: Validate all variables against context
export type VariableValidationResult = {
  readonly satisfied: TemplateVariable[];
  readonly missing: TemplateVariable[];
  readonly runtime: TemplateVariable[];
};

export const validateVariables = (
  variables: TemplateVariable[],
  context: Record<string, unknown>
): VariableValidationResult => {
  const satisfied: TemplateVariable[] = [];
  const missing: TemplateVariable[] = [];
  const runtime: TemplateVariable[] = [];

  for (const variable of variables) {
    if (variable.isRuntimeVar) {
      runtime.push(variable);
    } else if (isVariableSatisfied(variable, context)) {
      satisfied.push(variable);
    } else {
      missing.push(variable);
    }
  }

  return { satisfied, missing, runtime };
};

// Pure: Convert validation result to Result type
export const toValidationResult = (
  result: VariableValidationResult
): Result<VariableValidationResult, ValidationError[]> => {
  if (result.missing.length === 0) {
    return Ok(result);
  }

  return Err(result.missing.map(v => ({
    type: 'missing_variable' as const,
    variable: v.name,
    message: `Template variable '${v.name}' not found in provided data`
  })));
};

// Composed validation pipeline
export const validateWorkflowInput = (
  definition: WorkflowDefinition,
  data: Record<string, unknown>
): Result<ValidatedInput, ValidationError[]> => {
  const errors: ValidationError[] = [];

  // Check required fields
  for (const field of definition.requiredFields) {
    if (data[field] === undefined) {
      errors.push({
        type: 'missing_required_field',
        field,
        message: `Required field '${field}' is missing`
      });
    }
  }

  // Check template variables
  const allVariables = definition.steps.flatMap(step =>
    extractTemplateVariables(step.payloadTemplate)
  );
  const varResult = validateVariables(allVariables, data);

  for (const missing of varResult.missing) {
    errors.push({
      type: 'missing_variable',
      variable: missing.name,
      message: `Template variable '${missing.name}' not found in provided data`
    });
  }

  return errors.length > 0
    ? Err(errors)
    : Ok({ definition, data, validatedVariables: varResult });
};
```

---

## Part 7: Pure Template Interpolation

### Referentially Transparent Interpolation

```typescript
// supabase/functions/workflow-orchestrator/lib/interpolate.ts

/**
 * Pure Template Interpolation
 *
 * Given a template and context, produce the interpolated result.
 * This is a pure function - same inputs always produce same outputs.
 */

// Pure: Get nested value from object
export const getNestedValue = (
  obj: Record<string, unknown>,
  path: string[]
): Option<unknown> => {
  let current: unknown = obj;

  for (const key of path) {
    if (current == null || typeof current !== 'object') {
      return None;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current !== undefined ? Some(current) : None;
};

// Pure: Interpolate a single string
export const interpolateString = (
  template: string,
  context: Record<string, unknown>
): string => {
  return template.replace(
    /\{\{\s*([\w.]+)\s*\}\}/g,
    (_, path) => {
      const value = getNestedValue(context, path.split('.'));
      return value.type === 'Some' ? String(value.value) : '';
    }
  );
};

// Pure: Recursively interpolate any structure
export const interpolate = <T>(
  template: T,
  context: Record<string, unknown>
): T => {
  if (typeof template === 'string') {
    return interpolateString(template, context) as T;
  }

  if (Array.isArray(template)) {
    return template.map(item => interpolate(item, context)) as T;
  }

  if (typeof template === 'object' && template !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(template)) {
      result[key] = interpolate(value, context);
    }
    return result as T;
  }

  return template;
};

// Property: interpolation is idempotent for fully-resolved templates
// interpolate(interpolate(t, ctx), ctx) === interpolate(t, ctx)
```

---

## Part 8: Effect Description Pattern

### Describing Effects as Data

Instead of performing side effects directly, **describe them as data** and execute separately:

```typescript
// supabase/functions/_shared/effects.ts

/**
 * Effect Description Pattern
 *
 * Instead of performing side effects, describe them as data.
 * This allows composition, inspection, and controlled execution.
 */

// Effect types - descriptions of side effects
export type Effect =
  | { readonly type: 'db_insert'; readonly table: string; readonly data: unknown }
  | { readonly type: 'db_update'; readonly table: string; readonly id: string; readonly data: unknown }
  | { readonly type: 'db_select'; readonly table: string; readonly query: QueryParams }
  | { readonly type: 'queue_send'; readonly queue: string; readonly message: unknown }
  | { readonly type: 'queue_read'; readonly queue: string; readonly count: number }
  | { readonly type: 'queue_delete'; readonly queue: string; readonly messageId: number }
  | { readonly type: 'http_call'; readonly url: string; readonly method: string; readonly body: unknown }
  | { readonly type: 'log'; readonly level: LogLevel; readonly message: string; readonly data?: unknown };

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Pure: Build a sequence of effects
export type EffectSequence = {
  readonly effects: Effect[];
};

export const sequence = (...effects: Effect[]): EffectSequence => ({
  effects
});

// Pure: Combine sequences
export const combine = (...sequences: EffectSequence[]): EffectSequence => ({
  effects: sequences.flatMap(s => s.effects)
});

// The ONLY impure part - the interpreter
export const executeEffect = async (
  effect: Effect,
  runtime: EffectRuntime
): Promise<Result<unknown, EffectError>> => {
  switch (effect.type) {
    case 'db_insert':
      return runtime.database.insert(effect.table, effect.data);
    case 'db_update':
      return runtime.database.update(effect.table, effect.id, effect.data);
    case 'db_select':
      return runtime.database.select(effect.table, effect.query);
    case 'queue_send':
      return runtime.queue.send(effect.queue, effect.message);
    case 'queue_read':
      return runtime.queue.read(effect.queue, effect.count);
    case 'queue_delete':
      return runtime.queue.delete(effect.queue, effect.messageId);
    case 'http_call':
      return runtime.http.call(effect.url, effect.method, effect.body);
    case 'log':
      runtime.logger.log(effect.level, effect.message, effect.data);
      return Ok(undefined);
  }
};

// Execute sequence, stopping on first error
export const executeSequence = async (
  seq: EffectSequence,
  runtime: EffectRuntime
): Promise<Result<unknown[], EffectError>> => {
  const results: unknown[] = [];

  for (const effect of seq.effects) {
    const result = await executeEffect(effect, runtime);
    if (!result.ok) return result;
    results.push(result.value);
  }

  return Ok(results);
};
```

### Usage in Orchestrator

```typescript
// Pure: Compute the effects needed for a step
const computeStepEffects = (
  execution: WorkflowExecution,
  step: WorkflowStep,
  stepResult: StepResult
): EffectSequence => {
  const newContext = mergeContext(execution.context, stepResult);
  const isLastStep = execution.state.status === 'running'
    && execution.state.currentStep + 1 >= execution.totalSteps;

  if (isLastStep) {
    return sequence(
      // Update execution to completed
      {
        type: 'db_update',
        table: 'workflow_executions',
        id: execution.id,
        data: {
          status: 'completed',
          context: newContext,
          completed_at: new Date().toISOString()
        }
      },
      // Log completion
      {
        type: 'log',
        level: 'info',
        message: `Workflow ${execution.id} completed`,
        data: { workflowName: execution.workflowName }
      }
    );
  }

  return sequence(
    // Enqueue next step
    {
      type: 'queue_send',
      queue: 'workflow_queue',
      message: {
        execution_id: execution.id,
        current_step: execution.state.currentStep + 1,
        context: newContext
      }
    },
    // Update execution record
    {
      type: 'db_update',
      table: 'workflow_executions',
      id: execution.id,
      data: {
        current_step: execution.state.currentStep + 1,
        context: newContext
      }
    }
  );
};

// In the shell (impure boundary)
const effects = computeStepEffects(execution, step, result);
const outcome = await executeSequence(effects, runtime);
```

---

## Part 9: Queue Operations Refactored

### Pure Queue Command Pattern

```typescript
// supabase/functions/_shared/queueCommands.ts

/**
 * Queue Commands - Pure descriptions of queue operations
 */

export type QueueCommand =
  | { readonly type: 'mark_processing'; readonly itemId: string }
  | { readonly type: 'mark_completed'; readonly itemId: string; readonly response?: unknown }
  | { readonly type: 'mark_failed'; readonly itemId: string; readonly error: QueueError; readonly retry: RetryDecision }
  | { readonly type: 'mark_skipped'; readonly itemId: string; readonly reason: string };

// Pure: Build update payload from command
export const commandToUpdate = (command: QueueCommand): QueueUpdate => {
  switch (command.type) {
    case 'mark_processing':
      return {
        status: 'processing',
        processed_at: new Date().toISOString()
      };

    case 'mark_completed':
      return {
        status: 'completed',
        bubble_response: command.response ?? null,
        processed_at: new Date().toISOString()
      };

    case 'mark_failed':
      const { retry } = command;
      return {
        status: retry.type === 'retry' ? 'pending' : 'failed',
        error_message: command.error.message,
        error_details: command.error.details,
        retry_count: retry.type === 'retry' ? retry.attempt : undefined,
        next_retry_at: retry.type === 'retry'
          ? new Date(Date.now() + retry.delayMs).toISOString()
          : null
      };

    case 'mark_skipped':
      return {
        status: 'skipped',
        error_message: command.reason
      };
  }
};

// Pure: Decide what command to issue based on processing result
export const decideQueueCommand = (
  itemId: string,
  result: ProcessingResult,
  policy: FailurePolicy,
  currentAttempt: number
): QueueCommand => {
  switch (result.type) {
    case 'success':
      return {
        type: 'mark_completed',
        itemId,
        response: result.response
      };

    case 'failure':
      const retry = decideRetry(policy, currentAttempt);
      return {
        type: 'mark_failed',
        itemId,
        error: result.error,
        retry
      };

    case 'skip':
      return {
        type: 'mark_skipped',
        itemId,
        reason: result.reason
      };
  }
};
```

---

## Part 10: Composable Enqueue Pipeline

### Refactored Enqueue Function

```typescript
// supabase/functions/workflow-enqueue/lib/pipeline.ts

/**
 * Enqueue Pipeline - Composable, pure core with thin shell
 */

// Input types
type EnqueueInput = {
  readonly workflow: string;
  readonly data: Record<string, unknown>;
  readonly correlationId?: string;
};

// Output types
type EnqueueOutput = {
  readonly executionId: string;
  readonly workflowName: string;
  readonly status: 'queued';
  readonly totalSteps: number;
};

// Error types
type EnqueueError =
  | { readonly type: 'validation'; readonly errors: ValidationError[] }
  | { readonly type: 'workflow_not_found'; readonly name: string }
  | { readonly type: 'duplicate'; readonly existingId: string; readonly status: string }
  | { readonly type: 'database'; readonly message: string }
  | { readonly type: 'queue'; readonly message: string };

// Pure: Parse and validate raw input
const parseInput = (raw: unknown): Result<EnqueueInput, EnqueueError> => {
  if (!raw || typeof raw !== 'object') {
    return Err({
      type: 'validation',
      errors: [{ type: 'invalid_input', message: 'Invalid request body' }]
    });
  }

  const { workflow, data, correlation_id } = raw as Record<string, unknown>;
  const errors: ValidationError[] = [];

  if (typeof workflow !== 'string' || !workflow) {
    errors.push({ type: 'missing_field', field: 'workflow', message: 'Workflow name is required' });
  }
  if (!data || typeof data !== 'object') {
    errors.push({ type: 'missing_field', field: 'data', message: 'Data object is required' });
  }

  return errors.length > 0
    ? Err({ type: 'validation', errors })
    : Ok({
        workflow: workflow as string,
        data: data as Record<string, unknown>,
        correlationId: correlation_id as string | undefined
      });
};

// Pure: Generate correlation ID
const generateCorrelationId = (
  existing: string | undefined,
  workflowName: string
): string =>
  existing ?? `${workflowName}:${Date.now()}:${crypto.randomUUID()}`;

// Pure: Build execution record
const buildExecutionRecord = (
  input: EnqueueInput,
  definition: WorkflowDefinition,
  correlationId: string
): WorkflowExecutionInsert => ({
  workflow_name: input.workflow,
  workflow_version: definition.version,
  status: 'pending',
  current_step: 0,
  total_steps: definition.steps.length,
  input_payload: input.data,
  context: {},
  correlation_id: correlationId,
  triggered_by: 'frontend'
});

// Pure: Build queue message
const buildQueueMessage = (
  executionId: string,
  definition: WorkflowDefinition,
  data: Record<string, unknown>
): QueueMessage => ({
  execution_id: executionId,
  workflow_name: definition.name,
  workflow_version: definition.version,
  steps: definition.steps,
  current_step: 0,
  context: data,
  visibility_timeout: definition.visibilityTimeout,
  max_retries: definition.maxRetries
});

// Pure: Build success response
const buildSuccessResponse = (
  executionId: string,
  definition: WorkflowDefinition
): EnqueueOutput => ({
  executionId,
  workflowName: definition.name,
  status: 'queued',
  totalSteps: definition.steps.length
});

// The composable pipeline (still pure - returns effects)
const enqueuePipeline = (
  input: EnqueueInput,
  definition: WorkflowDefinition,
  existingExecution: Option<{ id: string; status: string }>
): Result<EffectSequence, EnqueueError> => {
  // Check for duplicate
  if (existingExecution.type === 'Some') {
    return Err({
      type: 'duplicate',
      existingId: existingExecution.value.id,
      status: existingExecution.value.status
    });
  }

  // Validate input against definition
  const validationResult = validateWorkflowInput(definition, input.data);
  if (!validationResult.ok) {
    return Err({ type: 'validation', errors: validationResult.error });
  }

  // Build all the data
  const correlationId = generateCorrelationId(input.correlationId, input.workflow);
  const executionRecord = buildExecutionRecord(input, definition, correlationId);
  const executionId = crypto.randomUUID();  // Pure - deterministic with seed
  const queueMessage = buildQueueMessage(executionId, definition, input.data);

  // Return effect descriptions (not executed yet)
  return Ok(sequence(
    { type: 'db_insert', table: 'workflow_executions', data: { id: executionId, ...executionRecord } },
    { type: 'queue_send', queue: 'workflow_queue', message: queueMessage },
    { type: 'log', level: 'info', message: `Workflow enqueued: ${input.workflow}`, data: { executionId } }
  ));
};
```

### The Shell (Only Impure Part)

```typescript
// supabase/functions/workflow-enqueue/index.ts

/**
 * Workflow Enqueue - Imperative Shell
 *
 * This is the ONLY impure code. It:
 * 1. Receives HTTP request
 * 2. Calls pure pipeline
 * 3. Executes effects
 * 4. Returns HTTP response
 */

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Parse request (impure - I/O)
  const body = await req.json();
  const action = body.action;
  const payload = body.payload;

  if (action !== 'enqueue') {
    return jsonResponse({ success: false, error: 'Unknown action' }, 400);
  }

  // Step 1: Parse input (pure)
  const inputResult = parseInput(payload);
  if (!inputResult.ok) {
    return errorResponse(inputResult.error);
  }
  const input = inputResult.value;

  // Step 2: Fetch definition (impure - database)
  const definitionResult = await fetchWorkflowDefinition(supabase, input.workflow);
  if (!definitionResult.ok) {
    return errorResponse(definitionResult.error);
  }
  const definition = definitionResult.value;

  // Step 3: Check idempotency (impure - database)
  const correlationId = generateCorrelationId(input.correlationId, input.workflow);
  const existingResult = await checkExisting(supabase, correlationId);
  if (!existingResult.ok) {
    return errorResponse(existingResult.error);
  }

  // Step 4: Build pipeline (pure)
  const pipelineResult = enqueuePipeline(input, definition, existingResult.value);
  if (!pipelineResult.ok) {
    return errorResponse(pipelineResult.error);
  }

  // Step 5: Execute effects (impure)
  const executeResult = await executeSequence(pipelineResult.value, runtime);
  if (!executeResult.ok) {
    return errorResponse({ type: 'execution', error: executeResult.error });
  }

  // Step 6: Return success (impure - I/O)
  return jsonResponse({
    success: true,
    data: buildSuccessResponse(/* extract from effects */)
  }, 200);
});

// Helper to convert errors to HTTP responses
const errorResponse = (error: EnqueueError): Response => {
  const statusCode = match(error, {
    validation: () => 400,
    workflow_not_found: () => 404,
    duplicate: () => 200,  // Idempotent success
    database: () => 500,
    queue: () => 500
  });

  return jsonResponse({ success: false, error }, statusCode);
};
```

---

## Part 11: Testing the Functional Core

### Property-Based Testing

```typescript
// supabase/functions/workflow-enqueue/lib/__tests__/validation.test.ts

import { fc } from 'fast-check';
import { extractTemplateVariables, validateVariables, interpolate } from '../validation';

describe('extractTemplateVariables', () => {
  // Property: extraction is idempotent
  it('extracting twice yields same result', () => {
    fc.assert(
      fc.property(fc.json(), (obj) => {
        const first = extractTemplateVariables(obj);
        const second = extractTemplateVariables(obj);
        expect(first).toEqual(second);
      })
    );
  });

  // Property: all extracted variables appear in original
  it('extracted variables exist in source', () => {
    fc.assert(
      fc.property(
        fc.record({
          template: fc.string(),
          nested: fc.record({ value: fc.string() })
        }),
        (obj) => {
          const vars = extractTemplateVariables(obj);
          for (const v of vars) {
            expect(JSON.stringify(obj)).toContain(v.name);
          }
        }
      )
    );
  });
});

describe('interpolate', () => {
  // Property: interpolation with empty context is identity for non-template strings
  it('non-template strings unchanged', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => !s.includes('{{')),
        (str) => {
          expect(interpolate(str, {})).toBe(str);
        }
      )
    );
  });

  // Property: interpolation is deterministic
  it('same inputs produce same outputs', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.dictionary(fc.string(), fc.string()),
        (template, context) => {
          const first = interpolate(template, context);
          const second = interpolate(template, context);
          expect(first).toBe(second);
        }
      )
    );
  });
});

describe('validateVariables', () => {
  // Property: satisfied + missing + runtime = all variables
  it('partitions all variables', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          name: fc.string(),
          path: fc.array(fc.string()),
          isRuntimeVar: fc.boolean()
        })),
        fc.dictionary(fc.string(), fc.string()),
        (vars, context) => {
          const result = validateVariables(vars, context);
          const total = result.satisfied.length + result.missing.length + result.runtime.length;
          expect(total).toBe(vars.length);
        }
      )
    );
  });
});
```

### Unit Testing Pure Functions

```typescript
// supabase/functions/workflow-orchestrator/lib/__tests__/transitions.test.ts

import { applyTransition, WorkflowExecution, WorkflowTransition } from '../types';
import { Ok, Err } from '../../../_shared/result';

describe('applyTransition', () => {
  const pendingExecution: WorkflowExecution = {
    id: 'test-id',
    workflowName: 'test',
    workflowVersion: 1,
    state: { status: 'pending' },
    totalSteps: 3,
    inputPayload: {},
    context: {},
    correlationId: 'corr-1',
    triggeredBy: 'test',
    createdAt: new Date()
  };

  it('pending -> running is valid', () => {
    const transition: WorkflowTransition = {
      type: 'start',
      startedAt: new Date()
    };

    const result = applyTransition(pendingExecution, transition);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state.status).toBe('running');
    }
  });

  it('pending -> complete is invalid', () => {
    const transition: WorkflowTransition = {
      type: 'complete',
      completedAt: new Date()
    };

    const result = applyTransition(pendingExecution, transition);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('invalid_transition');
    }
  });

  it('running -> advance increments step', () => {
    const runningExecution = {
      ...pendingExecution,
      state: { status: 'running' as const, currentStep: 0, startedAt: new Date() }
    };

    const transition: WorkflowTransition = {
      type: 'advance',
      stepResult: { data: { key: 'value' } }
    };

    const result = applyTransition(runningExecution, transition);

    expect(result.ok).toBe(true);
    if (result.ok && result.value.state.status === 'running') {
      expect(result.value.state.currentStep).toBe(1);
    }
  });

  it('advance on last step completes workflow', () => {
    const lastStepExecution = {
      ...pendingExecution,
      state: { status: 'running' as const, currentStep: 2, startedAt: new Date() }
    };

    const transition: WorkflowTransition = {
      type: 'advance',
      stepResult: { data: {} }
    };

    const result = applyTransition(lastStepExecution, transition);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state.status).toBe('completed');
    }
  });
});
```

---

## Part 12: Migration Path

### Phase 1: Foundation (Week 1)

1. **Create shared FP utilities**
   - `_shared/result.ts` - Result type
   - `_shared/option.ts` - Option type
   - `_shared/effects.ts` - Effect descriptions

2. **Add to existing code incrementally**
   - Don't rewrite everything
   - Wrap existing functions in Result types
   - Add Option for nullable returns

### Phase 2: Pure Core Extraction (Week 2)

1. **Extract pure validation logic**
   - Move `extractTemplateVariables` to separate file
   - Add `validateWorkflowInput` pure function
   - Add property-based tests

2. **Extract pure state transitions**
   - Create `WorkflowState` ADT
   - Create `applyTransition` pure function
   - Add unit tests

### Phase 3: Effect Description (Week 3)

1. **Create effect types**
   - Define all effect variants
   - Create effect builders
   - Create effect interpreter

2. **Refactor enqueue pipeline**
   - Pure pipeline returns effects
   - Shell executes effects
   - Same behavior, better structure

### Phase 4: Orchestrator Refactor (Week 4)

1. **Refactor step execution**
   - Pure step resolution
   - Effect-based execution
   - Better error handling

2. **Refactor queue operations**
   - Command pattern for updates
   - Pure retry logic
   - Explicit Result types

---

## File References

### Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/_shared/result.ts` | Result<T, E> type and utilities |
| `supabase/functions/_shared/option.ts` | Option<T> type and utilities |
| `supabase/functions/_shared/effects.ts` | Effect description types |
| `supabase/functions/workflow-enqueue/lib/validation.ts` | Pure validation logic |
| `supabase/functions/workflow-enqueue/lib/pipeline.ts` | Pure enqueue pipeline |
| `supabase/functions/workflow-orchestrator/lib/transitions.ts` | Pure state transitions |
| `supabase/functions/workflow-orchestrator/lib/interpolate.ts` | Pure interpolation |

### Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/workflow-enqueue/index.ts` | Thin shell calling pure pipeline |
| `supabase/functions/workflow-orchestrator/index.ts` | Thin shell with effect execution |
| `supabase/functions/bubble_sync/lib/queueManager.ts` | Add Result return types |
| `supabase/functions/_shared/errors.ts` | Add error ADTs |

### Files to Reference

| File | Why |
|------|-----|
| `supabase/functions/_shared/validation.ts` | Existing validation patterns |
| `supabase/functions/bubble_sync/lib/queueManager.ts` | Current queue patterns |
| `app/src/logic/` | Four-layer architecture for frontend (similar concepts) |

---

## Summary

The transformation to functional programming involves:

1. **Result/Option types** - Make errors and absence explicit
2. **ADTs for domain** - Model workflow states as sum types
3. **Pure functions** - Extract all business logic from effects
4. **Effect descriptions** - Describe effects as data, execute separately
5. **Thin shells** - HTTP handlers only do I/O, delegate to pure core
6. **Property-based tests** - Test invariants, not just examples

The key insight from "Functional Programming in Scala" is: **Separate the description of what to do from the execution**. This gives you composability, testability, and reasoning power while still accomplishing the same practical goals.

---

**Document Version**: 1.0
**Author**: Claude Code Analysis
**Last Updated**: 2026-01-06
