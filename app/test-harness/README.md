# React Island + UMD Test Harness

Isolated testing suite for React Island + UMD components. **100% isolated** from component projects.

## 🎯 Purpose

This test harness validates that React components built as UMD bundles:
- ✅ Build successfully without errors
- ✅ Expose correct global namespace
- ✅ Render in browser without console errors
- ✅ Work as standalone components
- ✅ Match component specifications

## 📁 Structure

```
test-harness/
├── config.json              # Project & component configuration
├── package.json             # Test dependencies
├── playwright.config.js     # Playwright configuration
├── scripts/
│   ├── validate-build.js    # UMD bundle validator
│   └── run-tests.js         # Master test runner
├── tests/
│   └── footer-umd-contract.spec.js  # Playwright tests
├── previews/
│   └── footer-preview.html  # Interactive component preview
└── .tmp/                    # Temporary test files
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd test-harness
npm install
```

### 2. Run All Tests

```bash
npm test
```

This runs:
1. Build validation (checks UMD bundle structure)
2. Playwright tests (browser-based contract tests)

### 3. Run Individual Tests

```bash
# Build validation only
npm run test:validate

# Playwright contract tests only
npx playwright test footer-umd-contract.spec.js

# Diagnostic tests only (problem detection)
npx playwright test footer-diagnostics.spec.js
```

### 4. Manual Testing (Preview)

Open `previews/footer-preview.html` in your browser:

```bash
# Windows
start previews/footer-preview.html

# macOS
open previews/footer-preview.html

# Linux
xdg-open previews/footer-preview.html
```

The preview includes:
- Interactive component rendering
- Real-time console logging
- Test status tracking
- Configuration toggles
- Callback monitoring

## 📝 Configuration

Edit `config.json` to add projects or components:

```json
{
  "projects": [
    {
      "name": "split-lease",
      "componentPath": "../split-lease/components",
      "distPath": "../split-lease/components/dist",
      "bundleName": "split-lease-components.umd.cjs",
      "globalName": "SplitLeaseComponents",
      "components": [
        {
          "name": "Footer",
          "exportName": "Footer",
          "description": "Main footer component",
          "testCases": [...]
        }
      ]
    }
  ]
}
```

## 🧪 Components Tested

### Footer Component (18 tests total)

#### Contract Tests (9 tests)
Verify component works as expected:

1. **UMD bundle exposes Footer correctly** - Validates global namespace
2. **Footer renders without errors** - No console errors on mount
3. **Default columns render** - For Hosts, For Guests, Company
4. **Referral form renders** - Radio buttons, input, share button
5. **Import form renders** - URL input, email input, submit button
6. **Footer bottom renders** - Terms link, copyright, footer note
7. **Referral callback triggers** - onReferralSubmit called with data
8. **Import callback triggers** - onImportSubmit called with data
9. **Configuration toggles work** - showReferral/showImport props

### Diagnostic Tests (8 tests)
Proactively detect potential problems:

1. **Console warnings & errors** - Detects runtime errors
2. **Accessibility violations** - Missing labels, alt text, ARIA
3. **Keyboard navigation** - Tab order, focus management
4. **Form validation** - Email/URL validation logic
5. **CSS & layout problems** - Invisible elements, overflow
6. **Performance metrics** - Load time, re-render speed, bundle size
7. **Spec compliance** - All requirements met
8. **Memory leaks** - Component stability over time

**📊 View Results:** See `DIAGNOSTIC_REPORT.md` for detailed findings
**📖 Learn More:** See `DIAGNOSTICS_GUIDE.md` for testing guide

---

### SearchScheduleSelector Component (19 tests total)

#### Contract Tests (11 tests)
Verify component works as expected:

1. **UMD bundle exposes SearchScheduleSelector correctly** - Validates global namespace
2. **Component renders without errors** - No console errors on mount
3. **Renders 7 day buttons** - S M T W T F S buttons with aria-labels
4. **Single day selection works** - Click to select/deselect
5. **Multiple day selection by clicking** - Select multiple days
6. **Clear selection button resets selection** - Clear button works
7. **Listing count displays** - Shows exact/partial matches
8. **onSelectionChange callback fires** - Callback with selected days
9. **Component configuration props work** - minDays, maxDays, requireContiguous
10. **Calendar icon renders** - 📅 emoji displays
11. **Component CSS is loaded and applied** - Styling verification

#### Diagnostic Tests (8 tests)
Proactively detect potential problems:

1. **Console warnings & errors** - Detects runtime errors
2. **Accessibility violations** - ARIA labels, keyboard nav
3. **Keyboard navigation** - Tab order, focus management
4. **Component CSS loaded** - Styling applied correctly
5. **Performance metrics** - Load time: 1.5s, Click: 189ms
6. **Selection logic validation** - Select/deselect works
7. **Memory leaks** - Component stable over time
8. **Spec violations** - All requirements met

**📊 View Results:** See `SEARCHSCHEDULESELECTOR_RESULTS.md` for detailed findings

### Manual Tests (Preview)

1. Switch referral method (text/email) - placeholder changes
2. Submit referral form - callback logged in console
3. Submit import form with valid data - callback logged
4. Test URL validation - invalid URLs rejected
5. Test email validation - invalid emails rejected
6. Toggle referral form visibility - component re-renders
7. Toggle import form visibility - component re-renders
8. Check button loading state - "Importing..." text

## 📊 Test Output

### Build Validation

```
🔍 Validating UMD bundle: split-lease-components.umd.cjs
  ✓ Bundle file exists
  ✓ Bundle size: 167.84 KB
  ✓ Global "SplitLeaseComponents" present
  ✓ Export "Footer" found
  ✓ React references present
✅ Build validation passed

📊 Component Details:
  Component: Footer
    Export: Footer
    Description: Main footer component
    Test Cases (6):
      1. Renders default columns
      2. Referral form interaction
      3. Import form validation
      ...
```

### Playwright Tests

```
Running 9 tests using 1 worker

✓ Footer UMD Contract Tests › UMD bundle exposes Footer correctly (2s)
✓ Footer UMD Contract Tests › Footer renders without errors (1s)
✓ Footer UMD Contract Tests › Footer renders default columns (1s)
✓ Footer UMD Contract Tests › Referral form renders and accepts input (1s)
✓ Footer UMD Contract Tests › Import form renders with validation (1s)
✓ Footer UMD Contract Tests › Footer bottom section renders (1s)
✓ Footer UMD Contract Tests › Referral form interaction triggers callback (2s)
✓ Footer UMD Contract Tests › Import form interaction triggers callback (2s)
✓ Footer UMD Contract Tests › Component configuration toggles work (2s)

9 passed (13s)
```

## 🔄 Adding New Components

1. Build your component in `split-lease/components`
2. Run `npm run build` in component directory
3. Add component to `config.json`:

```json
{
  "name": "NewComponent",
  "exportName": "NewComponent",
  "description": "Component description",
  "testCases": [...]
}
```

4. Create preview HTML in `previews/newcomponent-preview.html`
5. Create test file in `tests/newcomponent-umd-contract.spec.js`
6. Run `npm test`

## 🎯 Test Paradigms

This harness tests:
- **Build Integrity** - UMD bundle structure
- **API Contract** - Global namespace and exports
- **Runtime Behavior** - Component renders without errors
- **Prop Interface** - Required/optional props work
- **Callbacks** - Event handlers fire correctly
- **Validation** - Input validation works
- **State Management** - Component state updates correctly
- **Visual Rendering** - Component structure matches spec

## ✅ Isolation Guarantee

**Zero modifications to `split-lease/` directory:**
- ❌ No changes to component source code
- ❌ No changes to package.json
- ❌ No changes to vite.config.ts
- ❌ No test files added to component directory

Test harness is **completely separate** and can be deleted without affecting the project.

## 📖 Workflow

**Component Development:**
```bash
cd split-lease/components
# Edit components
npm run build
```

**Testing:**
```bash
cd test-harness
npm install  # First time only
npm test     # Run all tests
```

**Manual Preview:**
```bash
cd test-harness
open previews/footer-preview.html
```

## 🛠️ Dependencies

- **@playwright/test** - Browser automation for UMD contract tests
- **Node.js** - For build validation scripts

No dependencies added to component project.
