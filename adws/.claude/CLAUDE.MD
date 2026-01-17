# CLAUDE.md - ADW (AI Developer Workflow) System

This file provides guidance to Claude Code when operating within the ADW ecosystem.

**UPDATED**: 2026-01-17
**SCOPE**: All ADW scripts and modules
**PRIMARY LANGUAGE**: Python

---

## Claude Code – Refactoring Rules (STRICT)

You are operating in **AGENT-SAFE REFACTORING MODE**.

### YOU MAY:
- Rename identifiers (no export signature changes)
- Extract or inline **PURE** functions only
- Introduce or remove **PURE** let-bindings
- Reorder disjoint pattern matches
- Apply proven FP laws (Functor, Monoid, etc.)
- Remove unreachable or unused code
- Replace imperative loops with `map`/`filter`/`reduce`
- Replace mutation with spread operators (`{...obj}`, `[...arr]`)
- Replace `.push()/.pop()/.splice()` with immutable alternatives
- Add `const` where `let` is never reassigned
- Extract pure calculations from impure functions

### YOU MAY NOT:
- Add features
- Fix bugs (even obvious ones)
- Change algorithms
- Add logging or console statements
- Change error handling behavior
- Introduce side effects
- Introduce mutation
- Change async/await behavior
- Change the order of side effects
- Guess developer intent
- Add comments explaining "what this should do"
- Optimize for performance (unless explicitly requested)
- Change public API signatures

### HARD REQUIREMENTS:

1. **All exported types and signatures must remain identical**
   - Function names: unchanged
   - Parameter order: unchanged
   - Return types: unchanged
   - Default values: unchanged

2. **All behavior must be unchanged**
   - Same inputs → same outputs
   - Same side effects in same order
   - Same error conditions
   - Same edge case handling

3. **All changes must pass**:
   - `tsc --noEmit` (TypeScript type check)
   - `bun run build` (production build)
   - All existing tests (if any)

4. **Changes must be small and reversible**
   - One concept per chunk
   - Git-revertible units
   - No cascading dependencies within a single chunk

### VIOLATION PROTOCOL:

If any rule is violated:

```
STOP. ROLLBACK. REPORT.
```

A change that alters behavior is **NOT** a refactor—it is a bug introduction.

---

## What "Refactor" Means in ADW

| This IS Refactoring | This is NOT Refactoring |
|---------------------|-------------------------|
| `arr.push(x)` → `[...arr, x]` | Adding validation that wasn't there |
| `for` loop → `.map()` | Fixing an off-by-one error |
| Extract pure function | Adding a new parameter |
| Rename internal variable | Changing error messages |
| Remove dead code | Adding logging |
| `let` → `const` | Changing default values |
| Inline trivial helper | Optimizing algorithm |

### The Refactoring Litmus Test

Before generating any change, ask:

1. **Will the tests still pass?** (If no → not a refactor)
2. **Will the output be identical for all inputs?** (If no → not a refactor)
3. **Am I adding new functionality?** (If yes → not a refactor)
4. **Am I fixing something that was broken?** (If yes → not a refactor)

If ANY answer disqualifies, **do not make the change**.

---

## FP Transformation Patterns (Allowed)

### Pattern 1: Mutation → Immutability

```javascript
// BEFORE (mutation)
function addItem(arr, item) {
  arr.push(item);
  return arr;
}

// AFTER (immutable) ✅ ALLOWED
function addItem(arr, item) {
  return [...arr, item];
}
```

### Pattern 2: Imperative Loop → Declarative

```javascript
// BEFORE (imperative)
function getNames(users) {
  const names = [];
  for (let i = 0; i < users.length; i++) {
    names.push(users[i].name);
  }
  return names;
}

// AFTER (declarative) ✅ ALLOWED
function getNames(users) {
  return users.map(user => user.name);
}
```

### Pattern 3: Extract Pure Calculation

```javascript
// BEFORE (mixed concerns)
async function processOrder(order) {
  const subtotal = order.items.reduce((sum, i) => sum + i.price, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;
  await saveOrder({ ...order, total });
  return total;
}

// AFTER (extracted pure calculation) ✅ ALLOWED
const calculateTotal = (items, taxRate) => {
  const subtotal = items.reduce((sum, i) => sum + i.price, 0);
  const tax = subtotal * taxRate;
  return subtotal + tax;
};

async function processOrder(order) {
  const total = calculateTotal(order.items, 0.08);
  await saveOrder({ ...order, total });
  return total;
}
```

### Pattern 4: let → const

```javascript
// BEFORE
let name = user.name;
let formatted = name.toUpperCase();

// AFTER ✅ ALLOWED
const name = user.name;
const formatted = name.toUpperCase();
```

---

## Patterns NOT Allowed

### ❌ Changing Algorithm

```javascript
// BEFORE
function findUser(users, id) {
  for (const user of users) {
    if (user.id === id) return user;
  }
  return null;
}

// ❌ NOT ALLOWED - changes from linear to hash lookup
function findUser(users, id) {
  const userMap = new Map(users.map(u => [u.id, u]));
  return userMap.get(id) || null;
}
```

### ❌ Adding Validation

```javascript
// BEFORE
function divide(a, b) {
  return a / b;
}

// ❌ NOT ALLOWED - adds new behavior
function divide(a, b) {
  if (b === 0) throw new Error("Division by zero");
  return a / b;
}
```

### ❌ Fixing Bugs

```javascript
// BEFORE (has bug: off-by-one)
function getLastItem(arr) {
  return arr[arr.length];  // Bug: should be length - 1
}

// ❌ NOT ALLOWED - this is bug fixing, not refactoring
function getLastItem(arr) {
  return arr[arr.length - 1];
}
```

---

## ADW Overview

ADW is an automated refactoring orchestration system that:

1. **Analyzes** codebase using AST-based dependency graphs
2. **Audits** for FP violations (mutation, imperative loops, etc.)
3. **Generates** refactoring chunks grouped by affected pages
4. **Validates** each chunk with type checking and builds
5. **Commits** successful changes atomically

**Primary Goal**: Make the codebase more functional/pure without changing what it does.

---

## Project Context

For broader project documentation:
- [Project CLAUDE.md](../.claude/CLAUDE.md) - Main project context
- [miniCLAUDE.md](../.claude/Documentation/miniCLAUDE.md) - Quick reference
- [largeCLAUDE.md](../.claude/Documentation/largeCLAUDE.md) - Full context

---

## Summary

**ADW refactoring is conservative by design.**

The goal is to improve code structure and purity while guaranteeing that:
- Every test that passed before still passes
- Every bug that existed before still exists
- Every feature that worked before still works

If in doubt, **don't change it**.