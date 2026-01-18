# The Functional Programming Bible
## A Practical Reference for Writing Pure, Functional Code

---

# SYSTEM PROMPT HEADER

```
<functional_programming_guidelines>
When writing code, follow these functional programming principles:

CORE RULES:
1. PURITY: Write pure functions - same inputs always produce same outputs, no side effects
2. IMMUTABILITY: Never mutate data; return new values instead of modifying existing ones
3. EXPLICIT DEPENDENCIES: Pass all dependencies as function parameters; no hidden globals
4. EFFECTS AT EDGES: Push I/O and side effects to application boundaries (Functional Core, Imperative Shell)
5. ERRORS AS VALUES: Use Result/Either types instead of throwing exceptions for expected failures
6. DECLARATIVE STYLE: Prefer map/filter/reduce over imperative loops
7. COMPOSITION: Build complex behavior by composing small, focused functions

ALWAYS:
✓ Return new objects/arrays instead of mutating (use spread: {...obj}, [...arr])
✓ Make function signatures honest - return types should reflect possible failures
✓ Keep functions small and single-purpose
✓ Use descriptive names that reveal intent
✓ Separate pure business logic from impure I/O operations

NEVER:
✗ Mutate function parameters or external state
✗ Use exceptions for control flow (validation, expected errors)
✗ Mix business logic with database/network calls in the same function
✗ Use global mutable state
✗ Create functions with hidden dependencies

ERROR HANDLING:
- Use Result<T, E>/Either types for operations that can fail
- Reserve exceptions for truly exceptional/unexpected situations
- Make error types explicit in function signatures

CODE STRUCTURE:
- Functional Core: Pure functions containing business logic (testable without mocks)
- Imperative Shell: Thin layer handling I/O (minimal logic, mostly "glue code")
</functional_programming_guidelines>
```

---

# DETAILED REFERENCE

## 1. Pure Functions & Referential Transparency

A **pure function** always produces the same output for the same input and has no side effects. An expression is **referentially transparent** if it can be replaced with its resulting value without changing program behavior.

### Identifying Pure Functions

A function is pure if it passes ALL these checks:
- ✅ Given the same arguments, always returns the same result
- ✅ Does not read or write external state (globals, databases, files)
- ✅ Does not mutate its arguments
- ✅ Does not perform I/O (network, console, filesystem)
- ✅ Does not call impure functions

### TypeScript Examples

```typescript
// ✅ PURE: Deterministic, no side effects
const calculateTotal = (items: Item[]): number =>
  items.reduce((sum, item) => sum + item.price * item.quantity, 0);

const formatCurrency = (amount: number): string =>
  `$${amount.toFixed(2)}`;

// ❌ IMPURE: Depends on external state
let taxRate = 0.08;
const calculateTax = (amount: number): number => amount * taxRate;

// ❌ IMPURE: Mutates input
const addItem = (cart: Item[], item: Item): void => {
  cart.push(item); // Mutation!
};

// ✅ PURE VERSION: Returns new array
const addItem = (cart: readonly Item[], item: Item): Item[] =>
  [...cart, item];

// ❌ IMPURE: Non-deterministic
const generateId = (): string => crypto.randomUUID();
const getCurrentTime = (): Date => new Date();

// ✅ PURE VERSION: Inject dependencies
const createEntity = (id: string, timestamp: Date, data: Data): Entity =>
  ({ id, createdAt: timestamp, ...data });
```

### Python Examples

```python
from dataclasses import dataclass
from typing import Sequence

# ✅ PURE: Same input → same output
def calculate_total(items: Sequence[dict]) -> float:
    return sum(item['price'] * item['quantity'] for item in items)

def format_currency(amount: float) -> str:
    return f"${amount:.2f}"

# ❌ IMPURE: Modifies external state
counter = 0
def impure_increment() -> int:
    global counter
    counter += 1  # Side effect!
    return counter

# ❌ IMPURE: Mutates input
def add_item_impure(cart: list, item: dict) -> None:
    cart.append(item)  # Mutation!

# ✅ PURE VERSION: Returns new list
def add_item(cart: tuple, item: dict) -> tuple:
    return (*cart, item)
```

### Benefits of Purity

| Benefit | Why It Matters |
|---------|---------------|
| **Testability** | No mocking required—just test input→output |
| **Predictability** | Debug by examining function in isolation |
| **Parallelization** | No shared state = no race conditions |
| **Memoization** | Safe to cache results |
| **Refactoring** | Replace any call with its result |

---

## 2. Immutability Patterns

### TypeScript/JavaScript

**Object.freeze (Shallow Only)**
```typescript
const config = Object.freeze({
  apiUrl: 'https://api.example.com',
  nested: { value: 1 }  // ⚠️ NOT frozen!
});
config.apiUrl = 'x';       // Silently fails (or throws in strict mode)
config.nested.value = 2;   // ⚠️ WORKS - nested objects are mutable!
```

**`as const` (Compile-Time Deep Readonly)**
```typescript
const config = {
  apiUrl: 'https://api.example.com',
  settings: { theme: 'dark' }
} as const;
// Type: { readonly apiUrl: "https://..."; readonly settings: { readonly theme: "dark" } }
config.settings.theme = 'light'; // ❌ TypeScript Error
```

**Spread Operator (Creating New Objects)**
```typescript
// Update object
const user = { name: 'Alice', age: 30 };
const updated = { ...user, age: 31 };

// Update array
const addItem = <T>(arr: readonly T[], item: T): T[] => [...arr, item];
const removeAt = <T>(arr: readonly T[], index: number): T[] =>
  arr.filter((_, i) => i !== index);
const updateAt = <T>(arr: readonly T[], index: number, item: T): T[] =>
  arr.map((x, i) => i === index ? item : x);

// Nested updates (verbose but explicit)
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
```

**Immer (For Complex Updates)**
```typescript
import { produce } from 'immer';

const nextState = produce(state, draft => {
  draft.user.preferences.theme = 'light';
  draft.items.push({ id: 4, name: 'New' });
});
// Original state unchanged, nextState is new immutable object
```

### Python

**Frozen Dataclasses**
```python
from dataclasses import dataclass, replace

@dataclass(frozen=True)
class User:
    name: str
    age: int
    email: str

user = User(name="Alice", age=30, email="alice@example.com")
user.name = "Bob"  # ❌ FrozenInstanceError

# Create modified copy
updated = replace(user, age=31)
```

**NamedTuple (Truly Immutable)**
```python
from typing import NamedTuple

class Point(NamedTuple):
    x: int
    y: int

point = Point(10, 20)
point.x = 5  # ❌ AttributeError
moved = point._replace(x=15)  # Create new instance
```

**Tuple vs List**
```python
# Prefer tuples for immutable sequences
coordinates: tuple[int, int] = (10, 20)  # Immutable
items: list[str] = ['a', 'b']            # Mutable - avoid when possible

# For frozen dataclasses with collections, use tuple not list
@dataclass(frozen=True)
class Cart:
    items: tuple[Item, ...]  # Immutable collection
```

---

## 3. Higher-Order Functions & Composition

### Higher-Order Functions

Functions that take functions as arguments or return functions.

```typescript
// Taking function as argument
const withLogging = <T, R>(fn: (arg: T) => R) => (arg: T): R => {
  console.log(`Calling with: ${arg}`);
  const result = fn(arg);
  console.log(`Result: ${result}`);
  return result;
};

const double = (n: number) => n * 2;
const loggedDouble = withLogging(double);

// Returning function (factory/closure)
const createMultiplier = (factor: number) => (n: number): number =>
  n * factor;

const double = createMultiplier(2);
const triple = createMultiplier(3);
```

```python
from functools import wraps
from typing import Callable, TypeVar

T = TypeVar('T')
R = TypeVar('R')

# Decorator pattern (HOF)
def with_logging(fn: Callable[[T], R]) -> Callable[[T], R]:
    @wraps(fn)
    def wrapper(arg: T) -> R:
        print(f"Calling with: {arg}")
        result = fn(arg)
        print(f"Result: {result}")
        return result
    return wrapper

@with_logging
def double(n: int) -> int:
    return n * 2

# Factory pattern
def create_validator(min_val: int, max_val: int) -> Callable[[int], bool]:
    def validate(value: int) -> bool:
        return min_val <= value <= max_val
    return validate

is_valid_age = create_validator(0, 120)
```

### Function Composition

**fp-ts: pipe and flow**
```typescript
import { pipe, flow } from 'fp-ts/function';

// PIPE: Apply value through functions (eager)
const result = pipe(
  5,
  n => n + 1,     // 6
  n => n * 2,     // 12
  n => `Result: ${n}`  // "Result: 12"
);

// FLOW: Compose functions into new function (lazy)
const transform = flow(
  (n: number) => n + 1,
  n => n * 2,
  n => `Result: ${n}`
);
transform(5);  // "Result: 12"

// KEY DIFFERENCE:
// pipe: takes VALUE first, applies immediately
// flow: takes FUNCTIONS only, returns new function
```

**Python: toolz**
```python
from toolz import pipe, compose, curry

def add_one(x): return x + 1
def double(x): return x * 2
def to_string(x): return f"Result: {x}"

# compose: right-to-left
transform = compose(to_string, double, add_one)
transform(5)  # "Result: 12"

# pipe: left-to-right (pass value through)
result = pipe(5, add_one, double, to_string)  # "Result: 12"

# Curry for partial application
@curry
def multiply(x: int, y: int) -> int:
    return x * y

double = multiply(2)
double(5)  # 10
```

### Point-Free Style Guidelines

**✅ USE when it improves clarity:**
```typescript
// Clear intent
const getActiveEmails = flow(
  filter((u: User) => u.active),
  map((u: User) => u.email)
);

// Named predicates
const isAdult = (u: User) => u.age >= 18;
const adults = users.filter(isAdult);
```

**❌ AVOID when it hurts readability:**
```typescript
// Too clever - nobody can read this
const process = R.pipe(
  R.converge(R.divide, [R.sum, R.length]),
  R.multiply(R.__, 100)
);

// Better: Be explicit
const calculatePercentage = (numbers: number[]): number => {
  const average = R.sum(numbers) / numbers.length;
  return average * 100;
};
```

---

## 4. Error Handling as Values (Result/Either/Option)

### Why Avoid Exceptions for Control Flow

| Problem with Exceptions | Result Pattern Solution |
|------------------------|------------------------|
| Not type-safe (TypeScript can't track thrown errors) | Errors explicit in return types |
| Hidden control flow | Errors must be explicitly propagated |
| Difficult to compose | Chainable map/flatMap/andThen |
| Callers can ignore them | Type system forces handling |

### neverthrow (TypeScript) - Recommended for Simplicity

```typescript
import { ok, err, Result, ResultAsync } from 'neverthrow';

// Basic Result type
function divide(a: number, b: number): Result<number, string> {
  if (b === 0) return err("Cannot divide by zero");
  return ok(a / b);
}

// Consuming results
const result = divide(10, 2);

// Method 1: match (most common)
const message = result.match(
  value => `Result: ${value}`,
  error => `Error: ${error}`
);

// Method 2: Type guards
if (result.isOk()) {
  console.log(result.value);  // TypeScript knows value exists
} else {
  console.log(result.error);  // TypeScript knows error exists
}

// Method 3: Default value
const value = result.unwrapOr(0);

// Chaining operations
const process = (input: number): Result<string, string> =>
  ok(input)
    .andThen(n => divide(n, 2))
    .andThen(n => divide(n, 2))
    .map(n => `Final: ${n}`);

// Async with ResultAsync
function safeFetch<T>(url: string): ResultAsync<T, Error> {
  return ResultAsync.fromPromise(
    fetch(url).then(r => r.json()),
    (e) => new Error(`Fetch failed: ${e}`)
  );
}

// Chaining async operations
const getUser = (id: string) =>
  safeFetch<User>(`/api/users/${id}`)
    .andThen(user => safeFetch<Post[]>(`/api/posts?userId=${user.id}`))
    .map(posts => posts.filter(p => p.published));

// Combining multiple Results
import { combine } from 'neverthrow';

const validateForm = (data: FormData): Result<ValidForm, string[]> => {
  return combine([
    validateEmail(data.email),
    validatePassword(data.password),
    validateAge(data.age)
  ]).map(([email, password, age]) => ({ email, password, age }));
};
```

### fp-ts Either (TypeScript) - Full FP Toolkit

```typescript
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';

// Either for sync operations
const validateAge = (age: number): E.Either<string, number> =>
  age >= 0 && age <= 150 ? E.right(age) : E.left('Invalid age');

// Chaining with pipe
const result = pipe(
  E.right({ name: 'Alice', age: 30 }),
  E.map(user => user.age),
  E.chain(age => validateAge(age)),  // flatMap equivalent
  E.map(age => age * 2)
);

// TaskEither for async (wraps Promise<Either>)
const fetchUser = (id: string): TE.TaskEither<Error, User> =>
  TE.tryCatch(
    () => fetch(`/api/users/${id}`).then(r => r.json()),
    (e) => new Error(`Fetch failed: ${e}`)
  );

// Chaining async
const getUserPosts = (id: string) => pipe(
  fetchUser(id),
  TE.chain(user => fetchPosts(user.id)),
  TE.map(posts => posts.filter(p => p.published)),
  TE.fold(
    error => T.of({ error: error.message }),
    posts => T.of({ data: posts })
  )
);
```

### Python returns Library

```python
from returns.result import Result, Success, Failure, safe
from returns.maybe import Maybe, Some, Nothing
from returns.pipeline import flow

# Basic Result usage
def divide(a: int, b: int) -> Result[float, str]:
    if b == 0:
        return Failure("Division by zero")
    return Success(a / b)

# @safe decorator - converts exceptions to Result
@safe
def parse_json(data: str) -> dict:
    import json
    return json.loads(data)

parse_json('{"key": "value"}')  # Success({'key': 'value'})
parse_json('invalid')           # Failure(JSONDecodeError(...))

# Chaining with bind
result = (
    Success(10)
    .bind(lambda x: Success(x * 2))
    .bind(lambda x: divide(x, 4))
    .map(lambda x: f"Result: {x}")
)

# Maybe for null-safety
from returns.maybe import maybe
from typing import Optional

@maybe
def get_user(user_id: int) -> Optional[User]:
    return db.find_user(user_id)  # might return None

# Chain safely
result = (
    get_user(123)
    .bind_optional(lambda u: u.email)
    .map(str.upper)
    .value_or("no-email@example.com")
)
```

### Custom Python Result (Simple Implementation)

```python
from dataclasses import dataclass
from typing import TypeVar, Generic, Union, Callable

T = TypeVar('T')
E = TypeVar('E')
U = TypeVar('U')

@dataclass(frozen=True)
class Ok(Generic[T]):
    value: T
    
    def map(self, f: Callable[[T], U]) -> 'Result[U, E]':
        return Ok(f(self.value))
    
    def bind(self, f: Callable[[T], 'Result[U, E]']) -> 'Result[U, E]':
        return f(self.value)
    
    def unwrap_or(self, default: T) -> T:
        return self.value

@dataclass(frozen=True)
class Err(Generic[E]):
    error: E
    
    def map(self, f: Callable) -> 'Result':
        return self
    
    def bind(self, f: Callable) -> 'Result':
        return self
    
    def unwrap_or(self, default: T) -> T:
        return default

Result = Union[Ok[T], Err[E]]

# Pattern matching (Python 3.10+)
def handle(result: Result[int, str]) -> str:
    match result:
        case Ok(value):
            return f"Success: {value}"
        case Err(error):
            return f"Error: {error}"
```

### Library Comparison

| Feature | neverthrow | fp-ts | returns (Python) |
|---------|-----------|-------|------------------|
| Learning Curve | Gentle | Steep | Moderate |
| Bundle Size | Small | Medium | Small |
| Result/Either | ✅ Result<T,E> | ✅ Either<E,A> | ✅ Result[T,E] |
| Option/Maybe | ❌ | ✅ Option<A> | ✅ Maybe[T] |
| Async Support | ✅ ResultAsync | ✅ TaskEither | ✅ IOResult |
| **Best For** | Simple projects | Full FP toolkit | Python FP |

---

## 5. Pure Data Transformations

### map, filter, reduce, flatMap

```typescript
const orders = [
  { id: 1, items: ['a', 'b'], amount: 100, status: 'pending' },
  { id: 2, items: ['c'], amount: 200, status: 'complete' },
  { id: 3, items: ['d', 'e', 'f'], amount: 50, status: 'pending' }
];

// MAP: Transform each element
const totals = orders.map(o => o.amount);  // [100, 200, 50]

// FILTER: Select matching elements
const pending = orders.filter(o => o.status === 'pending');

// REDUCE: Aggregate to single value
const sum = orders.reduce((acc, o) => acc + o.amount, 0);  // 350

// Building object with reduce
const byStatus = orders.reduce((acc, o) => {
  acc[o.status] = acc[o.status] || [];
  acc[o.status].push(o);
  return acc;
}, {} as Record<string, Order[]>);

// FLATMAP: Map + flatten one level
const allItems = orders.flatMap(o => o.items);  // ['a','b','c','d','e','f']

// flatMap as filter-map combo (return [] to exclude)
const pendingAmounts = orders.flatMap(o =>
  o.status === 'pending' ? [o.amount] : []
);  // [100, 50]
```

```python
from functools import reduce
from itertools import chain

orders = [
    {'id': 1, 'items': ['a', 'b'], 'amount': 100, 'status': 'pending'},
    {'id': 2, 'items': ['c'], 'amount': 200, 'status': 'complete'},
]

# List comprehensions (Pythonic)
totals = [o['amount'] for o in orders]
pending = [o for o in orders if o['status'] == 'pending']

# reduce for aggregation
total = reduce(lambda acc, o: acc + o['amount'], orders, 0)

# flatMap equivalent
all_items = [item for o in orders for item in o['items']]
# Or: list(chain.from_iterable(o['items'] for o in orders))
```

### Replacing Loops with HOFs

| Loop Pattern | HOF Replacement |
|--------------|-----------------|
| Transform each element | `map()` |
| Select matching elements | `filter()` |
| Aggregate/accumulate | `reduce()` |
| Nested loops | `flatMap()` |
| Find first match | `find()` |
| Check if any/all match | `some()` / `every()` |

```typescript
// ❌ IMPERATIVE: Loop with mutation
let result = [];
for (let i = 0; i < users.length; i++) {
  if (users[i].active) {
    result.push(users[i].name.toUpperCase());
  }
}

// ✅ DECLARATIVE: HOFs
const result = users
  .filter(u => u.active)
  .map(u => u.name.toUpperCase());
```

---

## 6. Effect Isolation & The Impure-Pure-Impure Sandwich

### The Pattern

```
┌─────────────────────────────────┐
│  IMPURE: Gather inputs          │  ← Read from DB, HTTP, config, env
├─────────────────────────────────┤
│  PURE: Transform/decide         │  ← Business logic (testable!)
├─────────────────────────────────┤
│  IMPURE: Apply outputs          │  ← Write to DB, send response, log
└─────────────────────────────────┘
```

### TypeScript Example: HTTP Handler

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

### Python Example: CLI Tool

```python
from dataclasses import dataclass
import json
import sys

@dataclass
class ProcessingResult:
    success: bool
    output: str
    errors: list[str]

# ======= FUNCTIONAL CORE =======
def process_data(data: dict, config: dict) -> ProcessingResult:
    errors = []
    
    if not data.get('items'):
        errors.append('No items to process')
    
    if config.get('strict') and errors:
        return ProcessingResult(False, '', errors)
    
    processed = {
        'count': len(data.get('items', [])),
        'total': sum(item.get('value', 0) for item in data.get('items', [])),
    }
    
    return ProcessingResult(True, json.dumps(processed), errors)

# ======= IMPERATIVE SHELL =======
def main():
    # IMPURE: Read inputs
    with open(sys.argv[1]) as f:
        data = json.load(f)
    config = {'strict': '--strict' in sys.argv}
    
    # PURE: Process
    result = process_data(data, config)
    
    # IMPURE: Output
    if result.success:
        print(result.output)
        sys.exit(0)
    else:
        print(f"Errors: {result.errors}", file=sys.stderr)
        sys.exit(1)
```

### Dependency Injection Through Parameters

```typescript
// Dependencies as first parameters (curried style)
type DbConnection = { query: (sql: string) => Promise<any[]> };

const findUserById = (db: DbConnection) => async (id: string): Promise<User | null> =>
  db.query(`SELECT * FROM users WHERE id = ?`).then(rows => rows[0] || null);

// At composition root: inject real dependency
const db = createDbConnection();
const findUser = findUserById(db);

// In tests: inject mock
const mockDb = { query: async () => [{ id: '1', name: 'Test' }] };
const findUserTest = findUserById(mockDb);
```

---

## 7. Code Organization: Functional Core, Imperative Shell

### TypeScript Project Structure

```
src/
├── core/                    # Functional Core (pure)
│   ├── domain/              # Domain types & pure functions
│   │   ├── user.ts          # User domain logic
│   │   ├── order.ts         # Order domain logic
│   │   └── index.ts         # Barrel export
│   ├── types/               # Type definitions
│   │   ├── result.ts        # Either/Result types
│   │   └── domain.ts        # Domain types
│   └── utils/               # Pure utility functions
│       └── validation.ts
│
├── shell/                   # Imperative Shell
│   ├── adapters/            # External service adapters
│   │   ├── database.ts
│   │   ├── http.ts
│   │   └── filesystem.ts
│   └── handlers/            # Request handlers
│       └── userHandler.ts
│
└── app.ts                   # Entry point (wires shell)
```

### Python Project Structure

```
src/
└── my_project/
    ├── __init__.py
    ├── core/                 # Functional Core
    │   ├── __init__.py       # Export pure functions
    │   ├── domain/
    │   │   ├── __init__.py
    │   │   ├── user.py       # Pure user functions
    │   │   └── order.py
    │   └── types/
    │       └── result.py     # Result/Either types
    │
    ├── shell/                # Imperative Shell
    │   ├── __init__.py
    │   ├── adapters/
    │   │   ├── database.py
    │   │   └── http_client.py
    │   └── handlers/
    │       └── user_handler.py
    │
    └── main.py               # Entry point
```

---

## 8. Testing Pure Functions

### Unit Tests (No Mocking Required)

```typescript
// Pure function - trivial to test
describe('calculateTotal', () => {
  it('sums item prices correctly', () => {
    const items = [
      { price: 10, quantity: 2 },
      { price: 5, quantity: 3 }
    ];
    expect(calculateTotal(items)).toBe(35);
  });

  it('returns 0 for empty array', () => {
    expect(calculateTotal([])).toBe(0);
  });
});
```

### Property-Based Testing (TypeScript: fast-check)

```typescript
import fc from 'fast-check';

describe('sort', () => {
  it('should be idempotent', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        const sorted = sort(arr);
        const sortedTwice = sort(sorted);
        expect(sorted).toEqual(sortedTwice);
      })
    );
  });

  it('should preserve length', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        expect(sort(arr)).toHaveLength(arr.length);
      })
    );
  });
});
```

### Property-Based Testing (Python: Hypothesis)

```python
from hypothesis import given, strategies as st

def reverse_list(lst: list) -> list:
    return lst[::-1]

@given(st.lists(st.integers()))
def test_reverse_twice_is_identity(lst):
    """Reversing twice returns original list"""
    assert reverse_list(reverse_list(lst)) == lst

@given(st.lists(st.integers()))
def test_reverse_preserves_length(lst):
    """Reversing preserves length"""
    assert len(reverse_list(lst)) == len(lst)
```

### Testing Result Types

```typescript
import * as E from 'fp-ts/Either';

describe('divide', () => {
  it('returns Right for valid division', () => {
    const result = divide(10, 2);
    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right).toBe(5);
    }
  });

  it('returns Left for division by zero', () => {
    const result = divide(10, 0);
    expect(E.isLeft(result)).toBe(true);
  });
});
```

---

## 9. Refactoring Toward Purity

### Step-by-Step Process

1. **Identify hotspots**: Code with high bug rates or complexity
2. **Write characterization tests**: Capture current behavior before changing
3. **Extract pure functions**: Pull business logic out of impure code
4. **Push I/O to boundaries**: Move side effects to the edges
5. **Replace loops with HOFs**: map/filter/reduce
6. **Make dependencies explicit**: Pass dependencies as parameters

### Before/After: Extracting Pure Core

```typescript
// ❌ BEFORE: Mixed concerns
async function processOrder(orderId: string) {
  const order = await db.orders.findById(orderId);  // Impure
  const user = await db.users.findById(order.userId);  // Impure
  
  // Business logic buried in I/O
  let discount = 0;
  if (user.membershipLevel === 'gold') discount = 0.1;
  if (user.membershipLevel === 'platinum') discount = 0.2;
  
  const subtotal = order.items.reduce((sum, i) => sum + i.price, 0);
  const total = subtotal * (1 - discount);
  
  await db.orders.update(orderId, { total, status: 'processed' });  // Impure
  await emailService.send(user.email, `Order total: $${total}`);  // Impure
  
  return { total };
}

// ✅ AFTER: Functional Core + Imperative Shell

// PURE: Business logic extracted
const calculateDiscount = (membershipLevel: string): number => {
  const discounts: Record<string, number> = { gold: 0.1, platinum: 0.2 };
  return discounts[membershipLevel] ?? 0;
};

const calculateOrderTotal = (items: Item[], discount: number): number => {
  const subtotal = items.reduce((sum, i) => sum + i.price, 0);
  return subtotal * (1 - discount);
};

// IMPURE: Thin shell
async function processOrder(orderId: string) {
  // Gather (impure)
  const order = await db.orders.findById(orderId);
  const user = await db.users.findById(order.userId);
  
  // Transform (pure)
  const discount = calculateDiscount(user.membershipLevel);
  const total = calculateOrderTotal(order.items, discount);
  
  // Apply (impure)
  await db.orders.update(orderId, { total, status: 'processed' });
  await emailService.send(user.email, `Order total: $${total}`);
  
  return { total };
}
```

---

## 10. Anti-Patterns to Avoid

### Over-Abstraction

```typescript
// ❌ TOO ABSTRACT: What does this even do?
const process = R.pipe(
  R.converge(R.divide, [R.sum, R.length]),
  R.multiply(R.__, 100),
  R.tap(console.log)
);

// ✅ CLEAR: Readable and maintainable
const calculateAveragePercentage = (numbers: number[]): number => {
  const average = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  return average * 100;
};
```

### Point-Free Gone Wrong

```typescript
// ❌ Unreadable point-free
const f = compose(map(prop('x')), filter(propEq('active', true)), sortBy(prop('y')));

// ✅ Named intermediate steps
const getActiveXValues = (items: Item[]) =>
  items
    .filter(item => item.active)
    .sort((a, b) => a.y - b.y)
    .map(item => item.x);
```

### Mutation Inside Map

```typescript
// ❌ HIDDEN MUTATION: map with side effects
users.map(user => {
  user.processed = true;  // Mutates original!
  return user;
});

// ✅ Return new object
users.map(user => ({ ...user, processed: true }));
```

### When NOT to Use FP

| Scenario | Recommendation |
|----------|---------------|
| Performance-critical hot paths | Benchmark; single loop may be faster than chained HOFs |
| Simple scripts | Don't over-engineer with monads |
| Team unfamiliar with FP | Introduce gradually |
| Framework expects OOP | Work with framework, not against it |

---

## 11. LLM Instruction Formatting

### Prompting for Functional Code

```
Write a function that [does X] following these constraints:
- Pure function (no side effects, no external state)
- Immutable (return new objects, don't mutate inputs)
- Use Result<T, E> for operations that can fail instead of exceptions
- Push any I/O to the caller (dependency injection via parameters)
```

### Code Review Checklist

```markdown
## Functional Purity Checklist

### Pure Functions
- [ ] Same inputs always produce same outputs
- [ ] No reading/writing global state
- [ ] No mutating function parameters
- [ ] No I/O operations (network, file, console)
- [ ] No calling impure functions

### Immutability
- [ ] Using spread operator for object/array updates
- [ ] Not using mutating methods (push, splice, sort)
- [ ] Frozen dataclasses in Python

### Error Handling
- [ ] Using Result/Either for expected failures
- [ ] Exceptions only for truly unexpected errors
- [ ] Error types explicit in signatures

### Code Structure
- [ ] Business logic separated from I/O
- [ ] Dependencies passed as parameters
- [ ] Thin imperative shell, thick functional core

### Data Transformations
- [ ] Using map/filter/reduce instead of loops
- [ ] Named predicates for complex conditions
- [ ] No excessive chaining (max 5-6 operations)
```

### Good vs Bad Code Transformations

**❌ Bad: Mixed concerns, mutation, implicit dependencies**
```typescript
let cache = {};
async function getUser(id) {
  if (cache[id]) return cache[id];
  const user = await fetch(`/users/${id}`).then(r => r.json());
  user.fetchedAt = Date.now();  // Mutation
  cache[id] = user;  // Global state
  console.log('Fetched user');  // Side effect
  return user;
}
```

**✅ Good: Separated concerns, pure logic, explicit dependencies**
```typescript
// Pure: data transformation
const enrichUser = (user: User, timestamp: number): EnrichedUser => ({
  ...user,
  fetchedAt: timestamp
});

// Impure: Shell with explicit dependencies
const createUserFetcher = (
  httpClient: HttpClient,
  cache: Cache,
  logger: Logger
) => async (id: string): Promise<Result<User, Error>> => {
  const cached = cache.get(id);
  if (cached) return ok(cached);
  
  return httpClient.get(`/users/${id}`)
    .map(user => enrichUser(user, Date.now()))
    .map(user => { cache.set(id, user); return user; })
    .mapErr(e => { logger.error('Fetch failed', e); return e; });
};
```

---

## Quick Reference Card

### TypeScript FP Essentials

```typescript
// Immutable update
const updated = { ...obj, field: newValue };
const newArr = [...arr, item];

// Result type (neverthrow)
import { ok, err, Result } from 'neverthrow';
const divide = (a: number, b: number): Result<number, string> =>
  b === 0 ? err('Div by zero') : ok(a / b);

// Composition (fp-ts)
import { pipe, flow } from 'fp-ts/function';
const result = pipe(value, fn1, fn2, fn3);
const composed = flow(fn1, fn2, fn3);

// HOFs
arr.map(x => x * 2)
arr.filter(x => x > 0)
arr.reduce((acc, x) => acc + x, 0)
arr.flatMap(x => [x, x * 2])
```

### Python FP Essentials

```python
# Immutable dataclass
from dataclasses import dataclass, replace
@dataclass(frozen=True)
class User:
    name: str
updated = replace(user, name="New")

# Result type (returns library)
from returns.result import Result, Success, Failure, safe
@safe
def parse(s: str) -> dict:
    return json.loads(s)

# Composition (toolz)
from toolz import pipe, compose
result = pipe(value, fn1, fn2, fn3)

# HOFs (prefer comprehensions)
[x * 2 for x in items]
[x for x in items if x > 0]
from functools import reduce
reduce(lambda acc, x: acc + x, items, 0)
```

---

## Summary: The 80/20 of FP

The patterns that yield **80% of FP benefits** with **20% of complexity**:

1. **Pure functions** for business logic - deterministic, testable, composable
2. **Immutable data** - spread operators, frozen dataclasses, no mutations
3. **Result types** for error handling - explicit errors, chainable operations
4. **HOFs** for data transformation - map, filter, reduce instead of loops
5. **Functional Core, Imperative Shell** - pure logic in center, I/O at edges
6. **Dependency injection** via function parameters - testable, explicit

**Avoid**: Free monads, monad transformers, excessive abstraction, point-free abuse, over-engineering simple code.

This reference provides immediately actionable patterns for writing cleaner, more maintainable, and more testable code across TypeScript and Python codebases.