# P0-01: Vitest + React Testing Library Setup

**Priority**: P0 - Foundation  
**Estimated Time**: 2-4 hours  
**Prerequisites**: None  
**Status**: NOT STARTED

## Implementation Tracker

### Phase 1: Installation & Configuration
- [ ] IMPLEMENTED: Install testing dependencies (vitest, RTL, jest-dom, happy-dom, msw)
- [ ] IMPLEMENTED: Create `app/vitest.config.ts` with path aliases
- [ ] IMPLEMENTED: Create `app/test-setup.ts` with browser mocks
- [ ] IMPLEMENTED: Add test scripts to `app/package.json`
- [ ] IMPLEMENTED: Verify vitest version with `bunx vitest --version`

### Phase 2: Global Mocks & Utilities
- [ ] IMPLEMENTED: Mock window.matchMedia (for responsive components)
- [ ] IMPLEMENTED: Mock IntersectionObserver (for GoogleMap.jsx)
- [ ] IMPLEMENTED: Mock localStorage (for secureStorage, SelfListingPage drafts)
- [ ] IMPLEMENTED: Mock window.scrollTo (for modal focus)
- [ ] IMPLEMENTED: Mock Google Maps API (for GoogleMap.jsx)
- [ ] IMPLEMENTED: Setup @testing-library/jest-dom matchers

### Phase 3: Verification
- [ ] IMPLEMENTED: Create `app/src/lib/__tests__/dayUtils.test.js`
- [ ] IMPLEMENTED: Run `bun test` - 11/11 tests pass
- [ ] IMPLEMENTED: Run `bun test:watch` - watch mode works
- [ ] IMPLEMENTED: Run `bun test:ui` - browser UI opens
- [ ] IMPLEMENTED: Run `bun test:coverage` - coverage report generated
- [ ] IMPLEMENTED: Verify dayUtils.js shows 100% coverage

**IMPLEMENTATION STATUS**: ⬜ NOT IMPLEMENTED

---

## Step 1: Install Dependencies

```bash
cd app
bun add -D vitest @vitest/ui @testing-library/react @testing-library/user-event @testing-library/jest-dom happy-dom msw
```

**Verification**: Check `app/package.json` devDependencies contains all packages.

---

## Step 2: Create vitest.config.ts

Create `app/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'test-utilities/', '**/*.test.{js,jsx,ts,tsx}'],
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    include: ['**/*.test.{js,jsx,ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      logic: path.resolve(__dirname, 'src/logic'),
      lib: path.resolve(__dirname, 'src/lib'),
      islands: path.resolve(__dirname, 'src/islands'),
      styles: path.resolve(__dirname, 'src/styles'),
      'test-utilities': path.resolve(__dirname, 'test-utilities'),
    },
  },
});
```

---

## Step 3: Create test-setup.ts

Create `app/test-setup.ts`:

```typescript
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

window.scrollTo = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock Google Maps
global.google = {
  maps: {
    Map: vi.fn(() => ({ setCenter: vi.fn(), setZoom: vi.fn() })),
    Marker: vi.fn(() => ({ setMap: vi.fn() })),
    LatLng: vi.fn((lat, lng) => ({ lat, lng })),
  },
} as any;
```

---

## Step 4: Add Test Scripts

Add to `app/package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## Step 5: Create Sample Test

Create `app/src/lib/__tests__/dayUtils.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { DAY_NAMES, getDayName, getDayIndex } from '../dayUtils';

describe('dayUtils', () => {
  describe('DAY_NAMES', () => {
    it('should have 7 days starting with Sunday', () => {
      expect(DAY_NAMES).toHaveLength(7);
      expect(DAY_NAMES[0]).toBe('Sunday');
      expect(DAY_NAMES[6]).toBe('Saturday');
    });
  });

  describe('getDayName', () => {
    it('should return correct day name for valid index', () => {
      expect(getDayName(0)).toBe('Sunday');
      expect(getDayName(3)).toBe('Wednesday');
      expect(getDayName(6)).toBe('Saturday');
    });
  });

  describe('getDayIndex', () => {
    it('should return correct index for valid day name', () => {
      expect(getDayIndex('Sunday')).toBe(0);
      expect(getDayIndex('Wednesday')).toBe(3);
      expect(getDayIndex('Saturday')).toBe(6);
    });

    it('should be case-insensitive', () => {
      expect(getDayIndex('sunday')).toBe(0);
      expect(getDayIndex('MONDAY')).toBe(1);
    });
  });
});
```

---

## Step 6: Run Tests

```bash
cd app
bun test          # Should pass 11 tests
bun test:ui       # Opens browser UI
bun test:coverage # Generates coverage/index.html
```

---

## Completion Checklist

- [ ] All dependencies installed
- [ ] vitest.config.ts created with aliases
- [ ] test-setup.ts created with mocks
- [ ] Test scripts added to package.json
- [ ] dayUtils.test.js passes 11/11 tests
- [ ] `bun test:ui` opens browser
- [ ] Coverage report shows 100% for dayUtils.js

**MARK AS**: ✅ IMPLEMENTED when all checkboxes complete.

---

## Next Steps

After implementation:
1. Move to P0-02: test-file-colocation
2. Move to P0-03: mocking-supabase-msw
3. Move to P0-04: mocking-auth-context

---

## Split Lease Context

**Why This Matters**:
- Islands Architecture requires testing 27 HTML pages independently
- Hollow Components pattern: test logic hooks separately from UI
- Four-layer logic (calculators → rules → processors → workflows) needs unit tests
- Day indexing (0=Sunday) is critical for scheduling features

**Files Enabled**:
- `app/src/lib/dayUtils.js` ✅ (tested)
- `app/src/logic/calculators/**` (ready to test)
- `app/src/logic/rules/**` (ready to test)
- All other files need P0-03, P0-04 first
