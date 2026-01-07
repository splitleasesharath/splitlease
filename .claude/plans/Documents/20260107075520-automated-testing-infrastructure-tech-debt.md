# Automated Testing Infrastructure - Technical Debt

**Created**: 2026-01-07
**Status**: Pending Implementation
**Priority**: High
**Estimated Effort**: 16-32 hours initial setup + ongoing maintenance

---

## Overview

The Split Lease codebase currently has **zero automated test coverage** despite having:
- 27 HTML pages with React islands
- 7 active Supabase Edge Functions
- Complex business logic in four-layer architecture (calculators, rules, processors, workflows)
- Critical day-indexing logic that must remain 0-based
- External API integrations (Bubble.io, OpenAI, Google Maps, Twilio)

This creates significant **regression risk** during refactoring, feature development, and dependency updates.

---

## Current State Analysis

### ✅ Existing Quality Controls
- ESLint configuration (`app/eslint.config.js`)
- Deno linting for Edge Functions (`supabase/functions/deno.json`)
- TypeScript configuration (`app/tsconfig.json` with `noEmit: true`)
- Route registry validation (manual)

### ❌ Missing Quality Controls
- Unit tests for business logic
- Integration tests for Edge Functions
- End-to-end tests for critical user flows
- Type checking in CI/CD
- Build validation in CI/CD
- Bundle size monitoring
- Dependency security audits
- Dead code detection
- Accessibility testing
- Visual regression testing

---

## Recommended Testing Infrastructure

### 🏗️ Foundation (Priority 1 - Quick Wins)

#### 1. TypeScript Type Checking
**Effort**: 5 minutes
**Impact**: High - catches type errors before runtime

```json
// Add to app/package.json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "type-check:watch": "tsc --noEmit --watch"
  }
}

// Add to root package.json
{
  "scripts": {
    "type-check": "cd app && bun run type-check"
  }
}
```

**Why**: Your `tsconfig.json` already has `noEmit: true` and includes `src/`. This immediately catches:
- Missing imports
- Type mismatches
- Undefined property access
- Function signature violations

---

#### 2. Build Validation
**Effort**: 5 minutes
**Impact**: High - ensures production builds succeed

```json
// Add to app/package.json
{
  "scripts": {
    "validate": "bun run lint:check && bun run type-check && bun run build"
  }
}

// Add to root package.json
{
  "scripts": {
    "validate": "cd app && bun run validate"
  }
}
```

**Why**: Catches:
- Broken imports
- Missing dependencies
- Build-time errors
- Route registry inconsistencies
- Asset path issues

---

#### 3. Route Registry Validation
**Effort**: 30 minutes
**Impact**: Medium - prevents broken routes in production

Create `app/scripts/validate-routes.js`:
```javascript
/**
 * Validates that routes.config.js matches actual HTML files
 * Catches: missing files, incorrect paths, broken aliases
 */
import { routes } from '../src/routes.config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const errors = [];
const warnings = [];

// Validate each route
routes.forEach(route => {
  const htmlPath = path.resolve(__dirname, '../public', route.file);

  if (!fs.existsSync(htmlPath)) {
    errors.push(`❌ Route "${route.path}" references missing file: ${route.file}`);
  }

  // Validate JSX entry point exists
  if (route.entry) {
    const entryPath = path.resolve(__dirname, '../src', route.entry);
    if (!fs.existsSync(entryPath)) {
      errors.push(`❌ Route "${route.path}" references missing entry: ${route.entry}`);
    }
  }

  // Check for duplicate paths
  const duplicates = routes.filter(r => r.path === route.path);
  if (duplicates.length > 1) {
    warnings.push(`⚠️  Duplicate path detected: ${route.path}`);
  }
});

// Validate Vite build inputs match routes
const viteConfigPath = path.resolve(__dirname, '../vite.config.js');
const viteConfig = fs.readFileSync(viteConfigPath, 'utf-8');
const htmlFiles = routes.map(r => r.file);

htmlFiles.forEach(file => {
  if (!viteConfig.includes(file)) {
    warnings.push(`⚠️  File ${file} not found in vite.config.js inputs`);
  }
});

// Report results
if (warnings.length > 0) {
  console.log('\n⚠️  WARNINGS:\n');
  warnings.forEach(w => console.log(w));
}

if (errors.length > 0) {
  console.error('\n❌ VALIDATION FAILED:\n');
  errors.forEach(e => console.error(e));
  process.exit(1);
}

console.log(`\n✅ Route validation passed: ${routes.length} routes validated`);
```

Add to `app/package.json`:
```json
{
  "scripts": {
    "test:routes": "node scripts/validate-routes.js"
  }
}
```

**Why**: Your routing system is registry-based. This prevents:
- Routes pointing to non-existent HTML files
- Missing JSX entry points
- Duplicate route paths
- Vite config drift from route registry

---

#### 4. Deno Edge Function Checks
**Effort**: 5 minutes
**Impact**: Medium - catches Edge Function issues

```json
// Add to root package.json
{
  "scripts": {
    "lint:edge": "deno lint supabase/functions/",
    "fmt:edge": "deno fmt --check supabase/functions/",
    "check:edge": "bun run lint:edge && bun run fmt:edge"
  }
}
```

**Why**: Formalizes Deno linting/formatting as a pre-commit check. Catches:
- Unused variables
- Missing return types
- Formatting inconsistencies
- Import issues

---

### 🧪 Unit Testing (Priority 2)

#### 5. Bun Test Runner for Business Logic
**Effort**: 8-16 hours (initial test writing)
**Impact**: High - prevents regressions in core logic

```json
// Add to app/package.json
{
  "scripts": {
    "test": "bun test",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage"
  }
}
```

**Test Targets** (in order of priority):

##### A. Day Indexing Logic (CRITICAL)
**File**: `app/src/lib/dayUtils.js`
**Why**: Day indexing is 0-based (0=Sunday). Any deviation breaks scheduling.

Example test file: `app/src/lib/__tests__/dayUtils.test.js`
```javascript
import { describe, test, expect } from 'bun:test';
import {
  getDayIndex,
  getDayName,
  getNextDayIndex,
  isPastDay,
  formatDayRange
} from '../dayUtils.js';

describe('dayUtils - Day Indexing (0-based)', () => {
  test('getDayIndex returns correct 0-based indices', () => {
    expect(getDayIndex('Sunday')).toBe(0);
    expect(getDayIndex('Monday')).toBe(1);
    expect(getDayIndex('Saturday')).toBe(6);
  });

  test('getDayName returns correct names from indices', () => {
    expect(getDayName(0)).toBe('Sunday');
    expect(getDayName(1)).toBe('Monday');
    expect(getDayName(6)).toBe('Saturday');
  });

  test('getNextDayIndex wraps around correctly', () => {
    expect(getNextDayIndex(5)).toBe(6); // Friday -> Saturday
    expect(getNextDayIndex(6)).toBe(0); // Saturday -> Sunday
  });

  test('isPastDay handles edge cases', () => {
    const today = new Date().getDay(); // 0-6
    expect(isPastDay((today - 1 + 7) % 7)).toBe(true);
    expect(isPastDay((today + 1) % 7)).toBe(false);
  });
});
```

##### B. Pricing Calculators (HIGH)
**Files**: `app/src/logic/calculators/pricing/*.js`

Example: `app/src/logic/calculators/pricing/__tests__/calculateTotalCost.test.js`
```javascript
import { describe, test, expect } from 'bun:test';
import { calculateTotalCost } from '../calculateTotalCost.js';

describe('calculateTotalCost', () => {
  test('calculates single night stay correctly', () => {
    const result = calculateTotalCost({
      dailyRate: 100,
      numberOfNights: 1,
      cleaningFee: 50,
      serviceFeeRate: 0.10
    });

    expect(result.subtotal).toBe(100);
    expect(result.cleaningFee).toBe(50);
    expect(result.serviceFee).toBe(15); // 10% of (100 + 50)
    expect(result.total).toBe(165);
  });

  test('applies multi-night discount correctly', () => {
    const result = calculateTotalCost({
      dailyRate: 100,
      numberOfNights: 7,
      cleaningFee: 50,
      serviceFeeRate: 0.10,
      weeklyDiscountRate: 0.10 // 10% off for 7+ nights
    });

    const expectedSubtotal = 100 * 7 * 0.9; // 630
    expect(result.subtotal).toBe(expectedSubtotal);
  });

  test('handles zero-night edge case', () => {
    expect(() => calculateTotalCost({
      dailyRate: 100,
      numberOfNights: 0,
      cleaningFee: 50
    })).toThrow('numberOfNights must be at least 1');
  });
});
```

##### C. Scheduling Calculators (HIGH)
**Files**: `app/src/logic/calculators/scheduling/*.js`

Key tests:
- `calculateNextAvailableCheckIn.test.js` - Critical for booking flow
- `shiftMoveInDateIfPast.test.js` - Prevents past-date bookings
- `getAvailabilityMatrix.test.js` - Complex scheduling logic

##### D. Business Rules (MEDIUM)
**Files**: `app/src/logic/rules/*.js`

Example: `app/src/logic/rules/__tests__/proposalRules.test.js`
```javascript
import { describe, test, expect } from 'bun:test';
import { canSubmitProposal, isProposalEditable, shouldShowCancelButton } from '../proposalRules.js';

describe('Proposal Business Rules', () => {
  test('canSubmitProposal allows submission when all conditions met', () => {
    const proposal = {
      moveInDate: '2026-02-01',
      moveOutDate: '2026-02-08',
      guestCount: 2,
      agreedToTerms: true
    };
    const listing = {
      minNights: 1,
      maxGuests: 4,
      isActive: true
    };

    expect(canSubmitProposal(proposal, listing)).toBe(true);
  });

  test('canSubmitProposal rejects when guest count exceeds max', () => {
    const proposal = { guestCount: 5, agreedToTerms: true };
    const listing = { maxGuests: 4, isActive: true };

    expect(canSubmitProposal(proposal, listing)).toBe(false);
  });

  test('isProposalEditable returns true for pending proposals', () => {
    expect(isProposalEditable({ status: 'pending' })).toBe(true);
    expect(isProposalEditable({ status: 'accepted' })).toBe(false);
    expect(isProposalEditable({ status: 'declined' })).toBe(false);
  });
});
```

##### E. Data Processors (MEDIUM)
**Files**: `app/src/logic/processors/*.js`

Example: `app/src/logic/processors/__tests__/proposalProcessor.test.js`
```javascript
import { describe, test, expect } from 'bun:test';
import { formatProposalForSubmission, adaptProposalFromSupabase } from '../proposalProcessor.js';

describe('Proposal Data Processors', () => {
  test('formatProposalForSubmission converts form data to API payload', () => {
    const formData = {
      listingId: '123',
      moveInDate: '2026-02-01',
      moveOutDate: '2026-02-08',
      guestCount: 2,
      message: 'Looking forward to staying!'
    };

    const result = formatProposalForSubmission(formData);

    expect(result).toEqual({
      listing_id: '123',
      move_in_date: '2026-02-01',
      move_out_date: '2026-02-08',
      guest_count: 2,
      message: 'Looking forward to staying!'
    });
  });

  test('adaptProposalFromSupabase converts snake_case to camelCase', () => {
    const dbProposal = {
      proposal_id: '456',
      listing_id: '123',
      move_in_date: '2026-02-01',
      move_out_date: '2026-02-08',
      guest_count: 2
    };

    const result = adaptProposalFromSupabase(dbProposal);

    expect(result).toEqual({
      proposalId: '456',
      listingId: '123',
      moveInDate: '2026-02-01',
      moveOutDate: '2026-02-08',
      guestCount: 2
    });
  });
});
```

##### F. Workflows (LOW)
**Files**: `app/src/logic/workflows/*.js`

**Note**: Workflows orchestrate multiple layers. Test via integration tests instead of unit tests.

---

#### 6. Edge Function Unit Tests (Deno)
**Effort**: 6-12 hours
**Impact**: Medium - prevents Edge Function regressions

```json
// Add to root package.json
{
  "scripts": {
    "test:edge": "deno test --allow-env --allow-net --allow-read supabase/functions/"
  }
}
```

**Test Targets**:

##### A. Action Validation (HIGH)
All Edge Functions use `{ action, payload }` pattern. Test action routing:

Example: `supabase/functions/proposal/__tests__/actions_test.ts`
```typescript
import { assertEquals, assertRejects } from "https://deno.land/std@0.208.0/assert/mod.ts";

Deno.test("proposal - rejects unknown action", async () => {
  const request = new Request("https://example.com", {
    method: "POST",
    body: JSON.stringify({ action: "unknown_action", payload: {} })
  });

  const response = await handleProposal(request);
  assertEquals(response.status, 400);

  const json = await response.json();
  assertEquals(json.error, "Unknown action: unknown_action");
});

Deno.test("proposal - create action validates required fields", async () => {
  const request = new Request("https://example.com", {
    method: "POST",
    body: JSON.stringify({
      action: "create",
      payload: {
        // Missing required fields: listing_id, move_in_date, etc.
      }
    })
  });

  const response = await handleProposal(request);
  assertEquals(response.status, 400);
});
```

##### B. Data Transformation (MEDIUM)
Test adapters and formatters:

Example: `supabase/functions/_shared/__tests__/bubbleAdapter_test.ts`
```typescript
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { adaptProposalForBubble, adaptListingFromBubble } from "../bubbleAdapter.ts";

Deno.test("adaptProposalForBubble converts Supabase format to Bubble format", () => {
  const supabaseProposal = {
    proposal_id: "123",
    listing_id: "456",
    move_in_date: "2026-02-01",
    move_out_date: "2026-02-08"
  };

  const result = adaptProposalForBubble(supabaseProposal);

  assertEquals(result, {
    ProposalID: "123",
    ListingID: "456",
    MoveInDate: "2026-02-01",
    MoveOutDate: "2026-02-08"
  });
});
```

##### C. Error Handling (LOW)
Test error response formatting from `_shared/errors.ts`

---

### 🔗 Integration Testing (Priority 3)

#### 7. Playwright End-to-End Tests
**Effort**: 8-16 hours
**Impact**: High - catches real-world user flow issues

You already have Playwright installed (`package.json` devDependencies)!

```json
// Add to root package.json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:headed": "playwright test --headed"
  },
  "devDependencies": {
    "@playwright/test": "^1.57.0"
  }
}
```

Create `playwright.config.js`:
```javascript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:8000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],

  webServer: {
    command: 'cd app && bun run dev',
    url: 'http://localhost:8000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

**Critical User Flows to Test**:

##### A. Search & Listing Detail (HIGH)
`tests/e2e/search-flow.spec.js`:
```javascript
import { test, expect } from '@playwright/test';

test.describe('Search Flow', () => {
  test('user can search listings and view details', async ({ page }) => {
    // Navigate to search page
    await page.goto('/search');
    await expect(page).toHaveTitle(/Search/);

    // Fill search form
    await page.fill('[data-testid="location-input"]', 'Brooklyn');
    await page.selectOption('[data-testid="borough-select"]', 'Brooklyn');
    await page.fill('[data-testid="move-in-date"]', '2026-02-01');
    await page.fill('[data-testid="move-out-date"]', '2026-02-08');
    await page.click('[data-testid="search-button"]');

    // Wait for results to load
    await page.waitForSelector('[data-testid="listing-card"]');
    const listingCards = page.locator('[data-testid="listing-card"]');
    await expect(listingCards).toHaveCountGreaterThan(0);

    // Click first listing
    await listingCards.first().click();

    // Verify listing detail page loaded
    await expect(page).toHaveURL(/\/view-split-lease\/\d+/);
    await expect(page.locator('[data-testid="listing-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="listing-price"]')).toBeVisible();
    await expect(page.locator('[data-testid="listing-description"]')).toBeVisible();
  });
});
```

##### B. Proposal Submission (HIGH)
`tests/e2e/proposal-flow.spec.js`:
```javascript
import { test, expect } from '@playwright/test';

test.describe('Proposal Submission Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('/');
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'testpassword');
    await page.click('[data-testid="submit-login"]');
    await page.waitForURL('/');
  });

  test('authenticated user can submit proposal', async ({ page }) => {
    // Navigate to listing
    await page.goto('/view-split-lease/123');

    // Click "Submit Proposal" button
    await page.click('[data-testid="submit-proposal-button"]');

    // Fill proposal form
    await page.fill('[data-testid="move-in-date"]', '2026-02-01');
    await page.fill('[data-testid="move-out-date"]', '2026-02-08');
    await page.selectOption('[data-testid="guest-count"]', '2');
    await page.fill('[data-testid="proposal-message"]', 'Looking forward to staying!');
    await page.check('[data-testid="terms-checkbox"]');

    // Submit proposal
    await page.click('[data-testid="submit-proposal"]');

    // Verify success
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Proposal submitted');
  });

  test('unauthenticated user is prompted to login', async ({ page }) => {
    // Logout first
    await page.click('[data-testid="logout-button"]');

    // Navigate to listing
    await page.goto('/view-split-lease/123');

    // Click "Submit Proposal" button
    await page.click('[data-testid="submit-proposal-button"]');

    // Verify redirect to login
    await expect(page).toHaveURL(/\?redirect=/);
  });
});
```

##### C. Authentication Flow (MEDIUM)
`tests/e2e/auth-flow.spec.js`:
```javascript
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('user can sign up with email/password', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="signup-button"]');

    await page.fill('[data-testid="email-input"]', 'newuser@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePass123!');
    await page.fill('[data-testid="confirm-password"]', 'SecurePass123!');
    await page.click('[data-testid="submit-signup"]');

    // Verify success (may need email verification)
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('user can login with magic link', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="login-button"]');
    await page.click('[data-testid="magic-link-tab"]');

    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.click('[data-testid="send-magic-link"]');

    // Verify confirmation message
    await expect(page.locator('[data-testid="magic-link-sent"]')).toBeVisible();
  });
});
```

##### D. Host Listing Management (MEDIUM)
`tests/e2e/host-listing-flow.spec.js`:
```javascript
import { test, expect } from '@playwright/test';

test.describe('Host Listing Management', () => {
  test('host can create new listing', async ({ page }) => {
    // Login as host
    await page.goto('/');
    // ... login steps ...

    // Navigate to listing dashboard
    await page.goto('/listing-dashboard');
    await page.click('[data-testid="create-listing-button"]');

    // Fill listing form
    await page.fill('[data-testid="listing-title"]', 'Cozy Brooklyn Apartment');
    await page.selectOption('[data-testid="borough"]', 'Brooklyn');
    await page.fill('[data-testid="address"]', '123 Main St');
    await page.fill('[data-testid="daily-rate"]', '150');
    // ... more fields ...

    // Submit listing
    await page.click('[data-testid="submit-listing"]');

    // Verify success
    await expect(page).toHaveURL('/listing-dashboard');
    await expect(page.locator('[data-testid="listing-card"]').last()).toContainText('Cozy Brooklyn Apartment');
  });

  test('host can edit existing listing', async ({ page }) => {
    await page.goto('/listing-dashboard');

    // Click edit on first listing
    await page.click('[data-testid="listing-card"]:first-child [data-testid="edit-button"]');

    // Modify listing
    await page.fill('[data-testid="daily-rate"]', '175');
    await page.click('[data-testid="save-listing"]');

    // Verify update
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });
});
```

---

### 📊 Advanced Checks (Priority 4)

#### 8. Bundle Size Monitoring
**Effort**: 1 hour
**Impact**: Low - prevents bundle bloat

```bash
cd app && bun add -D rollup-plugin-visualizer
```

Update `app/vite.config.js`:
```javascript
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    process.env.ANALYZE && visualizer({
      open: true,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true
    }),
    // ... existing plugins
  ]
});
```

Add to `app/package.json`:
```json
{
  "scripts": {
    "analyze": "ANALYZE=true bun run build"
  }
}
```

**Usage**: `bun run analyze` generates interactive bundle visualization at `dist/stats.html`

**Why**: Islands architecture means each page is independent. Monitor:
- Per-page bundle sizes
- Shared chunk sizes
- Duplicate dependencies across islands

---

#### 9. Dependency Security Scanning
**Effort**: 5 minutes
**Impact**: Medium - catches known vulnerabilities

```json
// Add to root package.json
{
  "scripts": {
    "audit": "cd app && bun audit",
    "audit:fix": "cd app && bun audit --fix",
    "outdated": "cd app && bun outdated"
  }
}
```

**Why**: Detects:
- Known CVEs in dependencies
- Outdated packages with security patches
- Transitive dependency vulnerabilities

**Run before**: Deployments, dependency updates

---

#### 10. Dead Code Detection
**Effort**: 1 hour
**Impact**: Low - finds unused exports and files

```bash
cd app && bun add -D knip
```

Create `app/knip.json`:
```json
{
  "entry": [
    "src/*.jsx",
    "scripts/*.js"
  ],
  "project": [
    "src/**/*.{js,jsx}"
  ],
  "ignore": [
    "dist/**",
    "node_modules/**"
  ],
  "ignoreDependencies": [
    "vite",
    "react",
    "react-dom"
  ]
}
```

Add to `app/package.json`:
```json
{
  "scripts": {
    "unused": "knip"
  }
}
```

**Why**: Finds:
- Unused exports
- Unreferenced files
- Unused dependencies
- Duplicate code

---

#### 11. Accessibility Testing
**Effort**: 2-4 hours
**Impact**: Medium - ensures WCAG compliance

```bash
bun add -D @axe-core/playwright
```

Add to E2E tests (`tests/e2e/accessibility.spec.js`):
```javascript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('search page has no accessibility violations', async ({ page }) => {
    await page.goto('/search');

    const results = await new AxeBuilder({ page }).analyze();

    expect(results.violations).toEqual([]);
  });

  test('listing detail page is keyboard navigable', async ({ page }) => {
    await page.goto('/view-split-lease/123');

    // Tab through interactive elements
    await page.keyboard.press('Tab'); // Focus on first button
    const focusedElement = await page.evaluate(() => document.activeElement.tagName);
    expect(focusedElement).toBe('BUTTON');
  });
});
```

**Why**: Catches:
- Missing alt text
- Poor color contrast
- Missing ARIA labels
- Keyboard navigation issues

---

#### 12. Visual Regression Testing
**Effort**: 4-8 hours
**Impact**: Low - catches unintended UI changes

Use Playwright's built-in screenshot comparison:

```javascript
// tests/e2e/visual.spec.js
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('homepage matches snapshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      maxDiffPixels: 100 // Allow minor differences
    });
  });

  test('search results match snapshot', async ({ page }) => {
    await page.goto('/search?borough=Brooklyn');
    await page.waitForSelector('[data-testid="listing-card"]');

    await expect(page).toHaveScreenshot('search-results.png');
  });
});
```

**Why**: Detects:
- Unintended CSS changes
- Layout shifts
- Missing images
- Font rendering issues

---

## CI/CD Integration

### GitHub Actions Workflow
Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  frontend-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      # Install dependencies
      - name: Install frontend dependencies
        run: cd app && bun install --frozen-lockfile

      # Linting
      - name: Run ESLint
        run: bun run lint:check

      # Type checking
      - name: Type check
        run: bun run type-check

      # Route validation
      - name: Validate routes
        run: cd app && bun run test:routes

      # Unit tests
      - name: Run unit tests
        run: cd app && bun test

      # Build validation
      - name: Build application
        run: cd app && bun run build

      # Upload build artifacts
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: app/dist/

  edge-function-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - uses: actions/checkout@v4

      - uses: denoland/setup-deno@v1
        with:
          deno-version: v1.x

      # Linting
      - name: Lint Edge Functions
        run: deno lint supabase/functions/

      # Format check
      - name: Check formatting
        run: deno fmt --check supabase/functions/

      # Unit tests
      - name: Run Edge Function tests
        run: deno test --allow-env --allow-net --allow-read supabase/functions/

  e2e-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Install Playwright browsers
        run: bunx playwright install --with-deps

      - name: Run E2E tests
        run: bun run test:e2e
        env:
          CI: true

      - name: Upload Playwright report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/

  security-audit:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1

      - name: Security audit
        run: cd app && bun audit

      - name: Check for outdated dependencies
        run: cd app && bun outdated
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
**Effort**: 2-4 hours
**Tasks**:
- ✅ Add type checking scripts
- ✅ Add build validation scripts
- ✅ Create route validation script
- ✅ Add Edge Function linting scripts
- ✅ Set up CI/CD workflow (basic)

**Deliverables**:
- Type check passes in CI
- Build succeeds in CI
- Routes validated in CI
- Edge Functions linted in CI

---

### Phase 2: Unit Tests (Week 2-3)
**Effort**: 16-24 hours
**Tasks**:
- ✅ Set up Bun test runner
- ✅ Write day indexing tests (CRITICAL)
- ✅ Write pricing calculator tests
- ✅ Write scheduling calculator tests
- ✅ Write business rule tests
- ✅ Write data processor tests
- ✅ Set up Deno test runner for Edge Functions
- ✅ Write Edge Function action validation tests
- ✅ Write Edge Function adapter tests

**Deliverables**:
- 80%+ coverage on `app/src/logic/` directory
- 60%+ coverage on Edge Function business logic
- Unit tests pass in CI

---

### Phase 3: Integration Tests (Week 4-5)
**Effort**: 12-20 hours
**Tasks**:
- ✅ Set up Playwright
- ✅ Write search flow tests
- ✅ Write proposal submission tests
- ✅ Write authentication flow tests
- ✅ Write host listing management tests
- ✅ Add E2E tests to CI

**Deliverables**:
- 5+ critical user flows covered
- E2E tests pass in CI
- Screenshot/video artifacts on failure

---

### Phase 4: Advanced Checks (Week 6+)
**Effort**: 8-12 hours
**Tasks**:
- ✅ Add bundle size monitoring
- ✅ Add security audit automation
- ✅ Add dead code detection
- ✅ Add accessibility testing
- ✅ Add visual regression testing (optional)

**Deliverables**:
- Bundle size tracked per deployment
- Security vulnerabilities caught in CI
- Accessibility violations detected

---

## Maintenance & Ongoing Practices

### Pre-Commit Checklist
```bash
# Run before every commit
bun run lint:check      # ESLint
bun run type-check      # TypeScript
cd app && bun test      # Unit tests
bun run test:routes     # Route validation
```

### Pre-Deploy Checklist
```bash
# Run before every deployment
bun run validate        # Full validation suite
bun run test:e2e        # E2E tests
bun run audit           # Security audit
bun run analyze         # Bundle size check
```

### Weekly Maintenance
```bash
# Run weekly
bun run outdated        # Check for dependency updates
bun run unused          # Check for dead code
bun run test:coverage   # Review coverage reports
```

---

## Metrics & Goals

### Coverage Targets
| Area | Target | Priority |
|------|--------|----------|
| Day indexing logic | 100% | Critical |
| Pricing calculators | 90%+ | High |
| Scheduling calculators | 90%+ | High |
| Business rules | 80%+ | High |
| Data processors | 80%+ | Medium |
| Edge Function actions | 80%+ | Medium |
| Critical user flows (E2E) | 100% | High |

### Success Criteria
- ✅ Zero production bugs caused by day-indexing errors
- ✅ All pricing calculations have regression tests
- ✅ All critical user flows covered by E2E tests
- ✅ Type errors caught before reaching production
- ✅ Build failures detected in CI, not production
- ✅ Security vulnerabilities flagged before deployment

---

## Estimated Total Effort

| Phase | Hours | Priority |
|-------|-------|----------|
| Foundation | 2-4 | P1 |
| Unit Tests | 16-24 | P2 |
| Integration Tests | 12-20 | P3 |
| Advanced Checks | 8-12 | P4 |
| **Total** | **38-60** | - |

**Recommended Approach**: Implement in phases over 6 weeks (1-2 hours per day)

---

## Related Files

### Frontend
- [app/package.json](../../app/package.json) - Add test scripts
- [app/tsconfig.json](../../app/tsconfig.json) - TypeScript config
- [app/eslint.config.js](../../app/eslint.config.js) - ESLint config
- [app/vite.config.js](../../app/vite.config.js) - Build config
- [app/src/routes.config.js](../../app/src/routes.config.js) - Route registry
- [app/src/lib/dayUtils.js](../../app/src/lib/dayUtils.js) - Day indexing (critical)
- [app/src/logic/calculators/](../../app/src/logic/calculators/) - Test priority 1
- [app/src/logic/rules/](../../app/src/logic/rules/) - Test priority 2
- [app/src/logic/processors/](../../app/src/logic/processors/) - Test priority 3

### Edge Functions
- [supabase/functions/deno.json](../../supabase/functions/deno.json) - Deno config
- [supabase/functions/proposal/](../../supabase/functions/proposal/) - Proposal Edge Function
- [supabase/functions/listing/](../../supabase/functions/listing/) - Listing Edge Function
- [supabase/functions/_shared/](../../supabase/functions/_shared/) - Shared utilities

### CI/CD
- [.github/workflows/](../../.github/workflows/) - GitHub Actions (to be created)

---

**Document Status**: Ready for implementation
**Next Steps**: Begin Phase 1 (Foundation) - Add type checking, build validation, and route validation scripts
