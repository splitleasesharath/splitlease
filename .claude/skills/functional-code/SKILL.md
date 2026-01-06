---
name: functional-code
description: |
  Guides writing pure, functional code following principles of immutability, explicit dependencies, and testability.
  Use when: (1) Creating new functions or business logic, (2) Refactoring code for testability, (3) Implementing data transformations,
  (4) Handling errors in APIs or edge functions, (5) Separating pure logic from I/O operations, (6) Reviewing code for functional purity.
  Enforces: pure functions, immutable data, Result/Either types for errors, map/filter/reduce over loops, Functional Core/Imperative Shell pattern.
---

# Functional Programming Guide

Write code following functional programming principles for better testability, predictability, and maintainability.

## Core Principles (7 Rules)

1. **PURITY**: Write pure functions - same inputs always produce same outputs, no side effects
2. **IMMUTABILITY**: Never mutate data; return new values instead of modifying existing ones
3. **EXPLICIT DEPENDENCIES**: Pass all dependencies as function parameters; no hidden globals
4. **EFFECTS AT EDGES**: Push I/O and side effects to application boundaries (Functional Core, Imperative Shell)
5. **ERRORS AS VALUES**: Use Result/Either types instead of throwing exceptions for expected failures
6. **DECLARATIVE STYLE**: Prefer map/filter/reduce over imperative loops
7. **COMPOSITION**: Build complex behavior by composing small, focused functions

## Quick Decision Guide

```
┌─ Writing a function? ────────────────────────────────────────┐
│                                                               │
│  Does it perform I/O (DB, HTTP, file, console)?              │
│  ├─ YES → Imperative Shell (thin, just coordinate I/O)       │
│  │         Extract pure logic to separate functions          │
│  └─ NO  → Functional Core (pure, testable)                   │
│           ↓                                                   │
│      Can it fail with expected errors?                       │
│      ├─ YES → Return Result<T, E> or Either<E, T>            │
│      └─ NO  → Return T directly                              │
│           ↓                                                   │
│      Need external data (config, time, random)?              │
│      ├─ YES → Pass as explicit parameters                    │
│      └─ NO  → Pure function, proceed                         │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## Pattern Library

### Immutability Patterns

```typescript
// ✅ Object update - spread operator
const updated = { ...user, age: 31 };

// ✅ Array operations - return new arrays
const addItem = <T>(arr: readonly T[], item: T): T[] => [...arr, item];
const removeAt = <T>(arr: readonly T[], index: number): T[] =>
  arr.filter((_, i) => i !== index);
const updateAt = <T>(arr: readonly T[], index: number, item: T): T[] =>
  arr.map((x, i) => i === index ? item : x);

// ✅ Nested updates
const updateNested = (state: State): State => ({
  ...state,
  user: {
    ...state.user,
    preferences: {
      ...state.user.preferences,
      theme: 'light'
    }
  }
});

// ❌ NEVER mutate
arr.push(item);           // NO
obj.field = value;        // NO
arr.sort();              // NO (sort mutates, use toSorted())
```

### Error Handling with Result Types

**TypeScript (neverthrow)**:
```typescript
import { ok, err, Result } from 'neverthrow';

// Define function with explicit error type
function divide(a: number, b: number): Result<number, string> {
  if (b === 0) return err("Cannot divide by zero");
  return ok(a / b);
}

// Consume results
const result = divide(10, 2);

// Method 1: match
const message = result.match(
  value => `Result: ${value}`,
  error => `Error: ${error}`
);

// Method 2: Type guards
if (result.isOk()) {
  console.log(result.value);
} else {
  console.log(result.error);
}

// Method 3: Chain operations
const process = (input: number): Result<string, string> =>
  ok(input)
    .andThen(n => divide(n, 2))
    .andThen(n => divide(n, 2))
    .map(n => `Final: ${n}`);

// Async operations
import { ResultAsync } from 'neverthrow';

function safeFetch<T>(url: string): ResultAsync<T, Error> {
  return ResultAsync.fromPromise(
    fetch(url).then(r => r.json()),
    (e) => new Error(`Fetch failed: ${e}`)
  );
}
```

**Python (returns)**:
```python
from returns.result import Result, Success, Failure, safe

def divide(a: int, b: int) -> Result[float, str]:
    if b == 0:
        return Failure("Division by zero")
    return Success(a / b)

# @safe decorator - converts exceptions to Result
@safe
def parse_json(data: str) -> dict:
    import json
    return json.loads(data)

# Chaining
result = (
    Success(10)
    .bind(lambda x: Success(x * 2))
    .bind(lambda x: divide(x, 4))
    .map(lambda x: f"Result: {x}")
)
```

### Pure Data Transformations

```typescript
const orders = [
  { id: 1, items: ['a', 'b'], amount: 100, status: 'pending' },
  { id: 2, items: ['c'], amount: 200, status: 'complete' },
];

// MAP: Transform each element
const totals = orders.map(o => o.amount);

// FILTER: Select matching elements
const pending = orders.filter(o => o.status === 'pending');

// REDUCE: Aggregate to single value
const sum = orders.reduce((acc, o) => acc + o.amount, 0);

// FLATMAP: Map + flatten
const allItems = orders.flatMap(o => o.items);

// ❌ AVOID: Imperative loops with mutation
let result = [];
for (let i = 0; i < users.length; i++) {
  if (users[i].active) {
    result.push(users[i].name.toUpperCase());
  }
}

// ✅ USE: Declarative HOFs
const result = users
  .filter(u => u.active)
  .map(u => u.name.toUpperCase());
```

### Functional Core, Imperative Shell

```
┌─────────────────────────────────┐
│  IMPURE: Gather inputs          │  ← Read from DB, HTTP, config, env
├─────────────────────────────────┤
│  PURE: Transform/decide         │  ← Business logic (testable!)
├─────────────────────────────────┤
│  IMPURE: Apply outputs          │  ← Write to DB, send response, log
└─────────────────────────────────┘
```

**Example: HTTP Handler**

```typescript
// ======= FUNCTIONAL CORE (pure, testable) =======
const validateUserUpdate = (updates: Partial<User>): ValidationResult => {
  if (updates.email && !isValidEmail(updates.email)) {
    return { valid: false, error: 'Invalid email' };
  }
  return { valid: true, error: null };
};

const mergeUserData = (
  existing: User,
  updates: Partial<User>,
  timestamp: Date
): User => ({
  ...existing,
  ...updates,
  updatedAt: timestamp
});

// ======= IMPERATIVE SHELL (thin, I/O only) =======
export const updateUserHandler = async (req: Request, res: Response) => {
  // 1. IMPURE: Gather data
  const userId = req.params.id;
  const updates = req.body;
  const existingUser = await userRepo.findById(userId);
  const currentTime = new Date();

  // 2. PURE: Business logic
  const validation = validateUserUpdate(updates);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }
  const mergedUser = mergeUserData(existingUser, updates, currentTime);

  // 3. IMPURE: Apply changes
  await userRepo.save(mergedUser);
  await auditLog.record('user_updated', userId);
  return res.json({ user: mergedUser });
};
```

### Dependency Injection Through Parameters

```typescript
// ❌ Hidden dependency (global)
const findUser = async (id: string) => {
  return await globalDb.query(`SELECT * FROM users WHERE id = ?`, [id]);
};

// ✅ Explicit dependency (parameter)
type DbConnection = { query: (sql: string, params: any[]) => Promise<any[]> };

const findUserById = (db: DbConnection) => async (id: string): Promise<User | null> =>
  db.query(`SELECT * FROM users WHERE id = ?`, [id]).then(rows => rows[0] || null);

// At composition root: inject real dependency
const db = createDbConnection();
const findUser = findUserById(db);

// In tests: inject mock
const mockDb = { query: async () => [{ id: '1', name: 'Test' }] };
const findUserTest = findUserById(mockDb);
```

## Code Review Checklist

Before submitting code, verify:

### Pure Functions
- [ ] Same inputs always produce same outputs
- [ ] No reading/writing global state
- [ ] No mutating function parameters
- [ ] No I/O operations (network, file, console) in business logic
- [ ] No calling impure functions from pure functions

### Immutability
- [ ] Using spread operator for object/array updates (`{...obj}`, `[...arr]`)
- [ ] Not using mutating methods (`push`, `splice`, `sort`, `reverse`)
- [ ] Using `as const` or `readonly` in TypeScript where appropriate
- [ ] Using frozen dataclasses in Python

### Error Handling
- [ ] Using Result/Either for expected failures (validation, not found, etc.)
- [ ] Exceptions only for truly unexpected errors (programming bugs, system failures)
- [ ] Error types explicit in function signatures

### Code Structure
- [ ] Business logic separated from I/O (Functional Core vs Imperative Shell)
- [ ] Dependencies passed as parameters (no hidden globals)
- [ ] Thin imperative shell, thick functional core

### Data Transformations
- [ ] Using map/filter/reduce instead of for loops
- [ ] Named predicates for complex conditions
- [ ] No excessive chaining (max 5-6 operations before extracting to named function)

## When to Apply FP

| Use FP | Consider Alternatives |
|--------|---------------------|
| Business logic & calculations | Performance-critical hot paths (benchmark first) |
| Data transformations | Simple scripts (don't over-engineer) |
| Validation & rules | Framework-mandated OOP patterns |
| API edge functions | Team unfamiliar with FP (introduce gradually) |
| Testable workflows | |

## Anti-Patterns to Avoid

### Over-Abstraction
```typescript
// ❌ TOO ABSTRACT: Unreadable
const process = R.pipe(
  R.converge(R.divide, [R.sum, R.length]),
  R.multiply(R.__, 100)
);

// ✅ CLEAR: Self-documenting
const calculateAveragePercentage = (numbers: number[]): number => {
  const average = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  return average * 100;
};
```

### Mutation Inside Map
```typescript
// ❌ HIDDEN MUTATION
users.map(user => {
  user.processed = true;  // Mutates original!
  return user;
});

// ✅ Return new object
users.map(user => ({ ...user, processed: true }));
```

## Deep Dive Reference

For comprehensive coverage including:
- Property-based testing strategies
- Advanced composition patterns (pipe, flow)
- Language-specific libraries (fp-ts, returns, toolz)
- Refactoring toward purity step-by-step
- Project structure for functional codebases

See: `.claude/Documentation/Architecture/The Functional Programming Bible A Practical Reference for Writing Pure, Functional Code.md`
