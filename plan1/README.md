# Logic Core Framework - Refactoring Plan

**Project:** Split Lease Application
**Architecture:** Logic Core Framework
**Principle:** No Fallback Mechanisms - Build for Truth
**Date:** November 22, 2025

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Documents in this Plan](#documents-in-this-plan)
3. [Quick Start](#quick-start)
4. [Key Principles](#key-principles)
5. [Migration Phases](#migration-phases)
6. [Success Metrics](#success-metrics)

---

## Overview

This plan outlines the complete refactoring of the Split Lease codebase to adopt the **Logic Core Framework**. This architectural transformation separates business logic from UI presentation, creating a maintainable, testable, and AI-native codebase.

### The Problem

Currently, the Split Lease application has business logic scattered across:
- React components (islands)
- Library utilities (src/lib)
- Mixed with UI rendering code

This makes the codebase:
- ❌ Hard to test (requires mounting React components)
- ❌ Difficult for AI to find specific logic (generic names)
- ❌ Prone to data integrity issues (defensive coding with fallbacks)
- ❌ Complex to maintain (logic mixed with presentation)

### The Solution

The Logic Core Framework separates concerns into **4 distinct pillars**:

```
┌────────────────────────────────────────────┐
│          React Islands (UI Layer)          │
│         "Hollow" - Presentation Only       │
└────────────────┬───────────────────────────┘
                 │ Receives pre-processed data
                 ↓
┌────────────────────────────────────────────┐
│       Logic Core (Business Logic Layer)    │
│                                            │
│  ┌─────────────┐  ┌──────────────┐       │
│  │ CALCULATORS │  │    RULES     │       │
│  │  Pure Math  │  │   Boolean    │       │
│  │  Functions  │  │  Predicates  │       │
│  └─────────────┘  └──────────────┘       │
│                                            │
│  ┌─────────────┐  ┌──────────────┐       │
│  │ PROCESSORS  │  │  WORKFLOWS   │       │
│  │    Data     │  │     State    │       │
│  │ Transform   │  │   Machines   │       │
│  └─────────────┘  └──────────────┘       │
└────────────────┬───────────────────────────┘
                 │ Uses infrastructure
                 ↓
┌────────────────────────────────────────────┐
│     Infrastructure Layer (src/lib)         │
│   Database, APIs, Storage, Configuration   │
└────────────────────────────────────────────┘
```

---

## Documents in this Plan

This directory contains complete documentation for the refactoring:

### 1. **COMPREHENSIVE_REFACTORING_PLAN.md** (Primary Document)
**Size:** ~40 pages
**Purpose:** Complete analysis of every file that needs refactoring

**Contents:**
- Detailed file-by-file migration plan
- Current vs target architecture
- Which pillar each function belongs to
- Priority levels and dependencies
- Migration phases (5 weeks)
- Testing strategy
- Risk mitigation
- ESLint enforcement rules
- Code examples for each pillar
- Success metrics

**Use this when:** You need complete details about what to refactor and how.

---

### 2. **QUICK_FILE_CHECKLIST.md** (Quick Reference)
**Size:** ~8 pages
**Purpose:** Fast scanning checklist of all files

**Contents:**
- HIGH/MEDIUM/LOW priority file lists
- Quick checkboxes for each file
- Which files to refactor vs keep in lib
- New files to create
- Migration phase summary
- Verification checklist

**Use this when:** You need a quick overview or want to track progress.

---

### 3. **ARCHITECTURE_TRANSFORMATION_VISUAL.md** (Visual Guide)
**Size:** ~15 pages
**Purpose:** Visual diagrams showing before/after architecture

**Contents:**
- Before/After architecture diagrams (ASCII art)
- Data flow examples (pricing, validation, data loading)
- Code comparison (before vs after)
- Testing comparison
- AI discoverability improvements
- Key transformations summary table

**Use this when:** You want to understand the architectural vision visually.

---

### 4. **CODE_TEMPLATES.md** (Implementation Guide)
**Size:** ~12 pages
**Purpose:** Copy-paste templates for each pillar type

**Contents:**
- Calculator template + real examples
- Rule template + real examples
- Processor template + real examples
- Workflow template + real examples
- Hollow Island template + real examples
- Logic Hook template + real examples
- Test templates for each type
- Complete usage example showing all pieces together

**Use this when:** You're ready to write code and need templates.

---

### 5. **README.md** (This Document)
**Purpose:** Overview and navigation guide

---

## Quick Start

### For Architects & Team Leads
1. Read: **COMPREHENSIVE_REFACTORING_PLAN.md** (Section 1-3)
2. Review: **ARCHITECTURE_TRANSFORMATION_VISUAL.md**
3. Plan: Use migration phases from comprehensive plan

### For Developers Starting Migration
1. Read: **ARCHITECTURE_TRANSFORMATION_VISUAL.md** (understand the vision)
2. Check: **QUICK_FILE_CHECKLIST.md** (see what needs to be done)
3. Use: **CODE_TEMPLATES.md** (copy templates for your work)
4. Reference: **COMPREHENSIVE_REFACTORING_PLAN.md** (detailed guidance)

### For AI Agents
1. Read: All documents in order
2. Focus: Intent-based naming conventions
3. Enforce: "No Fallback" principle in all processors
4. Follow: Templates exactly for consistency

---

## Key Principles

### 1. The Four Pillars

#### 🧮 CALCULATORS (`src/logic/calculators/`)
**Purpose:** Pure mathematical functions
**Rules:**
- Same input = same output (referentially transparent)
- No side effects, no global state
- Strict type checking - throw on invalid input
- NO fallback values (`|| 0`)
- Named parameters for clarity
- Naming: `calculate*`, `compute*`, `get*`

**Example:**
```javascript
export function calculateFourWeekRent({ nightlyRate, frequency }) {
  if (typeof nightlyRate !== 'number' || isNaN(nightlyRate)) {
    throw new Error('nightlyRate must be a number')
  }
  return nightlyRate * frequency * 4
}
```

---

#### ✅ RULES (`src/logic/rules/`)
**Purpose:** Boolean predicates (business rules)
**Rules:**
- Returns ONLY boolean (true/false)
- No side effects
- No UI concerns (no error messages)
- Naming: `is*`, `can*`, `should*`, `has*`

**Example:**
```javascript
export function isScheduleContiguous({ selectedDayIndices }) {
  // Complex logic...
  return true // or false
}
```

---

#### 🔄 PROCESSORS (`src/logic/processors/`)
**Purpose:** Data transformation with "No Fallback" enforcement
**Rules:**
- **NO FALLBACK** - throw on invalid data
- Validate critical fields
- Normalize external data to internal format
- Act as Anti-Corruption Layer
- Naming: `process*`, `parse*`, `normalize*`, `adapt*`

**Example:**
```javascript
export function processListingData({ rawListing }) {
  if (!rawListing) throw new Error('Listing data is missing')
  if (!rawListing._id) throw new Error('Missing ID')

  return {
    id: rawListing._id,
    // ... validated and normalized data
  }
}
```

---

#### 🔀 WORKFLOWS (`src/logic/workflows/`)
**Purpose:** Orchestrate multi-step operations
**Rules:**
- Compose calculators, rules, processors
- Minimal raw logic (delegate to other pillars)
- State machine patterns
- Naming: `*Workflow`

**Example:**
```javascript
export function validateScheduleWorkflow({ selectedDays, listing }) {
  const isValid = isScheduleContiguous({ selectedDayIndices: selectedDays })

  if (!isValid) {
    return { valid: false, errorCode: 'NOT_CONTIGUOUS' }
  }

  return { valid: true }
}
```

---

### 2. "No Fallback" Principle

**Definition:** Code must **fail loud** when data is missing or invalid. Never mask issues with default values.

#### ❌ BAD (Fallback Patterns)
```javascript
// Hides data integrity issues
const rent = calculateRent(price, nights) || 0
const amenities = listing.amenities || []

try {
  processData(data)
} catch (e) {
  // Silent failure - return empty object
  return {}
}
```

#### ✅ GOOD (Fail Loud)
```javascript
// Throws descriptive error
if (!price || !nights) {
  throw new Error('Missing required pricing parameters')
}

// No silent catch - let errors bubble up
const processed = processData(data) // Throws if invalid

// Processor validates and throws
if (!listing.amenities) {
  throw new Error('Listing missing amenities field')
}
```

---

### 3. Hollow Islands

React components become "hollow" - they only render and delegate:

#### ❌ BEFORE: Smart Component
```jsx
function ListingScheduleSelector({ listing }) {
  const [days, setDays] = useState([])

  // ❌ Business logic in component
  const price = calculate4WeekRent(listing.price, days.length)
  const valid = isContiguous(days)

  return <div>{/* render */}</div>
}
```

#### ✅ AFTER: Hollow Component
```jsx
function ListingScheduleSelector({
  priceBreakdown,    // Pre-calculated
  validationError,   // Pre-validated
  onDayToggle        // Delegate to parent
}) {
  // ✅ NO business logic - only rendering
  return <div>{/* render */}</div>
}
```

---

### 4. Intent-Based Naming

Functions named by **business value**, not technical implementation:

| ❌ Generic (Avoid) | ✅ Intent-Based (Use) |
|-------------------|---------------------|
| `utils.js` | `dateFormatter.js`, `currencyFormatter.js` |
| `handleData()` | `submitRentalApplication()` |
| `check(user)` | `canUserMessageHost()` |
| `calc(a, b)` | `calculateProratedRent()` |

**Benefit:** AI agents can find logic by semantic search.

---

## Migration Phases

### Phase 1: Foundation (Week 1) - CRITICAL
**Goal:** Establish structure and migrate pricing

- [ ] Create `app/src/logic/` directory structure
- [ ] Migrate pricing calculators from `priceCalculations.js`
- [ ] Update `ListingScheduleSelector.jsx`
- [ ] Write unit tests (100% coverage)

**Success:** All pricing works identically

---

### Phase 2: Scheduling Rules (Week 2) - CRITICAL
**Goal:** Extract validation logic

- [ ] Migrate `isScheduleContiguous` and scheduling rules
- [ ] Migrate scheduling calculators
- [ ] Create scheduling workflows
- [ ] Test all edge cases (wrap-around, etc.)

**Success:** All validation works correctly

---

### Phase 3: Data Processors (Week 3) - CRITICAL
**Goal:** Enforce "No Fallback"

- [ ] Create `processListingData.js` with strict validation
- [ ] Create `parseJsonArrayField.js`
- [ ] Create user/proposal processors
- [ ] Split fetchers from processors

**Success:** No defensive `if (data && data.field)` checks in UI

---

### Phase 4: Workflows & Islands (Week 4)
**Goal:** Make islands hollow

- [ ] Extract auth workflows
- [ ] Extract booking workflows
- [ ] Refactor major islands to presentation-only
- [ ] Create logic hooks

**Success:** Components only handle rendering

---

### Phase 5: External Adapters (Week 5)
**Goal:** Isolate Bubble.io integration

- [ ] Create Bubble day conversion processors
- [ ] Move external adapters to `processors/external/`
- [ ] Add strict validation

**Success:** All external API calls go through adapters

---

## Success Metrics

### Code Quality
- ✅ **100%** unit test coverage on Logic Core
- ✅ **0** instances of `|| []`, `|| {}` in Logic Core
- ✅ **0** React imports in Logic Core
- ✅ **100%** ESLint pass rate

### Architecture
- ✅ **0%** business logic in islands
- ✅ **100%** calculators are pure functions
- ✅ **100%** processors throw on invalid data
- ✅ **100%** named exports in Logic Core
- ✅ **100%** functions have JSDoc with `@intent`

### Performance
- ✅ No build time regression (< 5 seconds)
- ✅ No bundle size increase
- ✅ No runtime performance regression

---

## Next Steps

1. **Review all documents** in this directory
2. **Get team alignment** on architecture vision
3. **Set up development environment** (ESLint rules, test framework)
4. **Start Phase 1** (pricing calculators)
5. **Track progress** using the checklist

---

## Support & Questions

For questions about this refactoring plan:
1. Check the relevant document (see "Documents in this Plan" above)
2. Review code templates for implementation guidance
3. Consult the comprehensive plan for detailed explanations

---

## File Summary

| Document | Size | Purpose | When to Use |
|----------|------|---------|-------------|
| **COMPREHENSIVE_REFACTORING_PLAN.md** | 40 pages | Complete detailed plan | Need full details |
| **QUICK_FILE_CHECKLIST.md** | 8 pages | Fast reference checklist | Track progress |
| **ARCHITECTURE_TRANSFORMATION_VISUAL.md** | 15 pages | Visual before/after | Understand vision |
| **CODE_TEMPLATES.md** | 12 pages | Copy-paste templates | Write code |
| **README.md** | This file | Overview & navigation | Start here |

**Total Documentation:** ~85 pages of comprehensive guidance

---

**Let's build for truth. No fallbacks. No compromises.**
