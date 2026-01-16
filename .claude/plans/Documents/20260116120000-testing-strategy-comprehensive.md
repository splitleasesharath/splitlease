# Split Lease Testing Strategy

> **Document Purpose**: Comprehensive testing strategy to reduce regressions as the codebase scales.
> **Created**: 2026-01-16
> **Status**: Planning → Ready for Implementation

---

## Executive Summary

Split Lease has **two core layers requiring protection**:

| Layer | Location | Risk if Untested |
|-------|----------|------------------|
| **React Frontend** | `app/` | Broken UI, incorrect pricing display, broken user flows |
| **Supabase Backend** | `supabase/` | Data corruption, failed transactions, sync failures |

**Philosophy**: **Stability over novelty**. We need deterministic "boring" tests to catch regressions instantly on every commit. The goal is a reliable Green/Red signal on every PR.

### Testing Tools Available

| Tool | Purpose | When to Use |
|------|---------|-------------|
| **Vitest** | Unit tests (frontend) | Every commit — fast, deterministic |
| **Deno Test** | Unit tests (backend) | Every commit — fast, deterministic |
| **Playwright** | E2E tests | Merge to main — critical paths |
| **adws** | Visual regression, exploration | Major refactors, spot checks |

---

## Current State Assessment

### What Exists Today

| Area | Status | Files |
|------|--------|-------|
| **ESLint** | ✅ Configured | `app/eslint.config.js` |
| **Unit Tests** | ❌ None in production | - |
| **Integration Tests** | ❌ None | - |
| **E2E Tests** | ⚠️ Playwright installed, unused | `package.json` |
| **Historical Tests** | 📦 132 tests in `Input/guest-proposals/` | Jest-based reference |

### Codebase Architecture (Testing-Friendly)

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (app/)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  src/logic/  ←── HIGHLY TESTABLE (Pure Functions)              │
│  ├── calculators/ (9 files)  → Pure math: calculate*, get*     │
│  ├── rules/ (22 files)       → Boolean: is*, can*, should*     │
│  ├── processors/ (14 files)  → Transform: adapt*, format*      │
│  └── workflows/ (12 files)   → Orchestration: *Workflow        │
│                                                                 │
│  src/islands/  ←── HOLLOW COMPONENT PATTERN                    │
│  ├── pages/ComponentPage.jsx      → Only JSX (no logic)        │
│  └── pages/useComponentLogic.js   → All logic (testable!)      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (supabase/)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  functions/  ←── ACTION-BASED PATTERN { action, payload }      │
│  ├── proposal/lib/validators.ts   → 200+ lines validation      │
│  ├── proposal/lib/calculations.ts → Backend pricing            │
│  ├── _shared/validation.ts        → Email, phone validators    │
│  └── 17 Edge Functions total                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Testing Pyramid (Split Lease Specific)

```
                      ┌─────────────────┐
                      │   E2E Tests     │  ← 10% (Critical Happy Paths)
                      │   (Playwright)  │     Guest Booking, Host Listing
                      └────────┬────────┘
                               │
                      ┌────────┴────────┐
                      │  Integration    │  ← 20% (Workflows + Edge Functions)
                      │  Tests          │     API calls with mocked Supabase
                      └────────┬────────┘
                               │
            ┌──────────────────┴──────────────────┐
            │           Unit Tests                │  ← 70% (Pure Functions)
            │  Calculators | Rules | Processors   │     Fast, deterministic
            └─────────────────────────────────────┘
```

---

## Layer 1: Frontend Testing

### 1.1 Unit Tests (Vitest) — **P0 PRIORITY**

**Target**: `app/src/logic/`

Your pricing calculators and scheduling logic are pure JavaScript functions. **If these break, you lose money or double-book.**

#### Files to Test (Priority Order)

| Category | Files | Why Critical |
|----------|-------|--------------|
| **Calculators** | `calculatePricingBreakdown.js`, `calculateNightsFromDays.js`, `calculateFourWeekRent.js` | Revenue calculations — bugs cost money |
| **Day Conversion** | `adaptDaysFromBubble.js`, `adaptDaysToBubble.js` | 0-indexed (JS) ↔ 1-indexed (Bubble) — regression minefield |
| **Rules** | `canAcceptProposal.js`, `canCancelProposal.js`, `canEditProposal.js` | Control UI states & permissions |
| **Validation** | `isValidPriceTier.js`, `isDateBlocked.js`, `isScheduleContiguous.js` | Data integrity gates |

#### Expected Outcome

- **300+ tests** covering pure functions
- **80%+ coverage** on `src/logic/`
- **Run time**: < 30 seconds
- **Execution**: Every commit, every PR

#### Setup Action

```bash
cd app
bun add -D vitest @vitest/coverage-v8
```

#### Sample Test Structure

```javascript
// app/src/logic/calculators/__tests__/calculatePricingBreakdown.test.js
import { describe, it, expect } from 'vitest';
import { calculatePricingBreakdown } from '../pricing/calculatePricingBreakdown';

describe('calculatePricingBreakdown', () => {
  it('calculates correct total for weekly stay', () => {
    const result = calculatePricingBreakdown({
      nightlyRate: 100,
      nights: 7,
      cleaningFee: 50,
      serviceFee: 0.12
    });

    expect(result.subtotal).toBe(700);
    expect(result.cleaningFee).toBe(50);
    expect(result.serviceFee).toBe(90); // 12% of 750
    expect(result.total).toBe(840);
  });

  it('handles edge case of single night', () => {
    // Test edge cases
  });

  it('throws on negative nights', () => {
    expect(() => calculatePricingBreakdown({ nights: -1 }))
      .toThrow('Nights must be positive');
  });
});
```

---

### 1.2 Component Tests (React Testing Library) — **P1 PRIORITY**

**Target**: `app/src/islands/`

Your "islands" architecture is perfect for isolation. Test components without spinning up the whole app.

#### Hollow Component Testing Pattern

```
┌─────────────────────────────────┐
│  ProposalPage.jsx               │  ← Test: Does it render states?
│    └── useProposalPageLogic.js  │  ← Test: Does logic work correctly?
└─────────────────────────────────┘
```

**Strategy**: Test the **hooks** separately from components.

#### Priority Components

| Component | What to Test |
|-----------|--------------|
| `SearchPage` | Loading, Error, Success states; filter interactions |
| `ListingDetailPage` | Data display, availability calendar |
| `CreateProposalPage` | Form validation, submission flow |
| `ProposalDetailPage` | State transitions (pending → accepted) |

#### Setup Action

```bash
cd app
bun add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

---

## Layer 2: Backend Testing (Supabase Edge Functions)

### 2.1 Deno Tests — **P0 PRIORITY**

**Target**: `supabase/functions/`

Since Edge Functions use Deno, use the native `Deno.test` runner.

#### Files to Test (Priority Order)

| Function | Files | Why Critical |
|----------|-------|--------------|
| **Proposal Validation** | `proposal/lib/validators.ts` | 200+ lines — untested = dangerous |
| **Pricing Calculations** | `proposal/lib/calculations.ts` | Backend pricing must match frontend |
| **Shared Validation** | `_shared/validation.ts` | Email, phone validation |
| **AI Gateway** | `ai-gateway/index.ts` | Must handle garbage AI responses gracefully |
| **Webhooks** | `stripe/`, `slack/` | Payment & notification integrity |

#### Sample Test Structure

```typescript
// supabase/functions/proposal/lib/__tests__/validators.test.ts
import { assertEquals, assertThrows } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { validateCreateProposalInput } from "../validators.ts";

Deno.test("validateCreateProposalInput - valid input passes", () => {
  const input = {
    listing_id: "abc-123",
    guest_id: "user-456",
    start_date: "2026-02-01",
    nights: [1, 2, 3],
  };

  const result = validateCreateProposalInput(input);
  assertEquals(result.valid, true);
});

Deno.test("validateCreateProposalInput - invalid day index throws", () => {
  const input = {
    listing_id: "abc-123",
    nights: [0, 7, 8], // 7 and 8 are invalid (must be 0-6)
  };

  assertThrows(
    () => validateCreateProposalInput(input),
    Error,
    "Day indices must be 0-6"
  );
});
```

#### Setup Action

```bash
# Run from project root
deno test supabase/functions/
```

---

## Layer 3: E2E Testing (Playwright)

### 3.1 Deterministic Happy Path Tests — **P1 PRIORITY**

**Need**: A "Green/Red" signal that always passes if the code is good.

**Problem with current `adws` approach**: Agent-based testing can be non-deterministic (flaky). Use `adws` for spot checks and major refactors, but rely on Playwright for daily CI.

#### Critical Happy Paths (Start with 3-5)

| Test | User Journey | Catches |
|------|--------------|---------|
| **Guest Booking** | Sign Up → Search → View Listing → Create Proposal | Core booking flow |
| **Host Listing** | Sign Up → Create Listing → Publish | Listing creation |
| **Proposal Accept** | Host Login → View Proposals → Accept | State transitions |
| **Authentication** | Login → Dashboard → Logout | Auth flows |
| **Search Filters** | Apply filters → Results update | Search functionality |

#### Page Object Model Structure

```
app/
├── e2e/
│   ├── pages/
│   │   ├── SearchPage.ts
│   │   ├── ListingDetailPage.ts
│   │   ├── ProposalPage.ts
│   │   └── AuthPage.ts
│   ├── fixtures/
│   │   └── test-users.ts
│   └── tests/
│       ├── guest-booking.spec.ts
│       ├── host-listing.spec.ts
│       └── auth.spec.ts
└── playwright.config.ts
```

#### Sample E2E Test

```typescript
// app/e2e/tests/guest-booking.spec.ts
import { test, expect } from '@playwright/test';
import { SearchPage } from '../pages/SearchPage';
import { ListingDetailPage } from '../pages/ListingDetailPage';

test.describe('Guest Booking Flow', () => {
  test('guest can search and request booking', async ({ page }) => {
    const searchPage = new SearchPage(page);

    // Navigate to search
    await searchPage.goto();

    // Apply filters
    await searchPage.setLocation('Manhattan');
    await searchPage.setPriceRange(100, 200);
    await searchPage.search();

    // Verify results
    await expect(searchPage.results).toHaveCount.greaterThan(0);

    // Click first listing
    await searchPage.clickFirstListing();

    // Verify listing detail page
    const listingPage = new ListingDetailPage(page);
    await expect(listingPage.bookButton).toBeVisible();
  });
});
```

---

## CI Pipeline Design

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  # ═══════════════════════════════════════════════════════════
  # FAST CHECKS (Every PR) — ~3 minutes
  # ═══════════════════════════════════════════════════════════
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: cd app && bun install
      - run: cd app && bun run lint

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: cd app && bun install
      - run: cd app && bun run test
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  edge-function-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: denoland/setup-deno@v1
      - run: deno test supabase/functions/

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: cd app && bun install
      - run: cd app && bun run build

  # ═══════════════════════════════════════════════════════════
  # SLOW CHECKS (Merge to Main only) — ~10 minutes
  # ═══════════════════════════════════════════════════════════
  e2e-tests:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: cd app && bun install
      - run: bunx playwright install --with-deps
      - run: cd app && bun run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: app/playwright-report/
```

### Pipeline Summary

| Stage | Trigger | Duration | Purpose |
|-------|---------|----------|---------|
| Lint | Every PR | ~30s | Code style |
| Unit Tests | Every PR | ~2min | Logic correctness |
| Edge Function Tests | Every PR | ~1min | Backend logic |
| Build | Every PR | ~2min | Compilation check |
| E2E Tests | Merge to main | ~10min | Critical paths |

---

## High-Risk Regression Areas

Based on codebase analysis, these areas have the highest regression risk:

### 1. Day Indexing Conversion (CRITICAL)

```
JavaScript (Frontend): 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
Bubble (Backend):      1=Sun, 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri, 7=Sat
```

**Files**: `adaptDaysFromBubble.js`, `adaptDaysToBubble.js`

**Test Focus**: Edge cases at week boundaries, empty arrays, invalid indices.

### 2. Pricing Calculations (REVENUE CRITICAL)

**Frontend Files**:
- `calculatePricingBreakdown.js`
- `calculateFourWeekRent.js`
- `getNightlyRateByFrequency.js`

**Backend Files**:
- `proposal/lib/calculations.ts`

**Test Focus**: Fee extraction, tier selection, rounding behavior, edge cases.

### 3. Proposal State Transitions

**Files**: `canAcceptProposal.js`, `canCancelProposal.js`, `canEditProposal.js`

**Test Focus**: All state combinations, timing conditions, permission checks.

### 4. FK Constraint Handling (Database Updates)

**Pattern**: Send only changed fields to avoid FK validation on unchanged nulls.

**Test Focus**: Update operations with partial data, null FK fields.

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)

| Task | Owner | Status |
|------|-------|--------|
| Install Vitest in `app/` | - | ⬜ TODO |
| Configure `vitest.config.ts` | - | ⬜ TODO |
| Write 10 tests for `calculatePricingBreakdown.js` | - | ⬜ TODO |
| Write 5 tests for day conversion functions | - | ⬜ TODO |
| Add `deno test` script for Edge Functions | - | ⬜ TODO |

### Phase 2: Coverage Expansion (Week 2-3)

| Task | Owner | Status |
|------|-------|--------|
| Test all files in `src/logic/calculators/` | - | ⬜ TODO |
| Test all files in `src/logic/rules/` | - | ⬜ TODO |
| Test `proposal/lib/validators.ts` | - | ⬜ TODO |
| Test `proposal/lib/calculations.ts` | - | ⬜ TODO |

### Phase 3: E2E Setup (Week 3-4)

| Task | Owner | Status |
|------|-------|--------|
| Configure Playwright | - | ⬜ TODO |
| Create Page Object Models | - | ⬜ TODO |
| Write Guest Booking E2E test | - | ⬜ TODO |
| Write Host Listing E2E test | - | ⬜ TODO |

### Phase 4: CI Integration (Week 4)

| Task | Owner | Status |
|------|-------|--------|
| Create GitHub Actions workflow | - | ⬜ TODO |
| Add coverage reporting | - | ⬜ TODO |
| Configure branch protection rules | - | ⬜ TODO |

---

## Role of `adws` in Testing Strategy

`adws` is a testing automation tool alongside Vitest/Playwright, not a layer requiring protection.

**Best suited for**:
- Visual regression testing (screenshot comparisons)
- Exploratory testing of new features
- Complex multi-step user journey validation
- Spot checks during major refactors

**Complement with deterministic tests**:
- Use Vitest/Playwright for daily CI (deterministic Green/Red)
- Use `adws` for deeper validation when needed

---

## Key Files Reference

### Frontend Testing

| Purpose | File Path |
|---------|-----------|
| Test config | `app/vitest.config.ts` (to create) |
| Test setup | `app/src/test/setup.ts` (to create) |
| Calculators | `app/src/logic/calculators/` |
| Rules | `app/src/logic/rules/` |
| Processors | `app/src/logic/processors/` |
| Workflows | `app/src/logic/workflows/` |

### Backend Testing

| Purpose | File Path |
|---------|-----------|
| Deno config | `supabase/functions/deno.json` |
| Validators | `supabase/functions/proposal/lib/validators.ts` |
| Calculations | `supabase/functions/proposal/lib/calculations.ts` |
| Shared utils | `supabase/functions/_shared/` |

### E2E Testing

| Purpose | File Path |
|---------|-----------|
| Playwright config | `app/playwright.config.ts` (to create) |
| Page objects | `app/e2e/pages/` (to create) |
| Test specs | `app/e2e/tests/` (to create) |

### Existing Plans

| Plan | Description |
|------|-------------|
| `ralph-plans/P0-01-vitest-rtl-setup.md` | Vitest + RTL setup guide |
| `ralph-plans/P3-01-*.md` | Page Object Model plan |

---

## Success Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| Unit test coverage (`src/logic/`) | 80% | 4 weeks |
| Edge Function test coverage | 60% | 4 weeks |
| E2E happy path tests | 5 tests | 4 weeks |
| CI pipeline pass rate | 95% | Ongoing |
| Time to detect regression | < 10 min | Ongoing |

---

## Next Steps

1. **Immediate**: Execute `ralph-plans/P0-01` — Set up Vitest for `app/`
2. **This Week**: Write first 20 unit tests for pricing/day conversion
3. **Next Week**: Set up Playwright with 1 smoke test
4. **Month 1**: Full CI pipeline operational

---

*Document maintained in `.claude/plans/Documents/`. Update as implementation progresses.*
