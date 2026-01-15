# Functional Programming Refactor Testing Strategy
**Date**: 2026-01-11
**Status**: Planning Phase
**Branch**: `development-tac`
**Scope**: Full application (29 pages/islands)

---

## Executive Summary

This document outlines a comprehensive testing strategy for verifying a **pure functional programming (FP) refactor** of the Split Lease application. The refactor converts imperative code to pure functional patterns across all 29 pages while maintaining **identical UI/UX** behavior.

**Key Requirements**:
- **Scope**: All 29 pages (full application)
- **Expected Outcome**: Identical UI/UX, different code structure
- **Time Budget**: 1-2 days setup, ongoing maintenance
- **Confidence Level**: 95-99% (1-5% false negatives acceptable)
- **Deployment**: Preview branches, test staging before production merge
- **Environment**: Mostly identical dev/production with same Supabase data

**Recommended Strategy**: Three-tier testing pyramid
1. **Tier 1**: Pure Function Unit Tests (foundation)
2. **Tier 2**: Automated User Journey Replay with Claude for Chrome
3. **Tier 3**: Network Traffic Analysis

---

## Testing Approaches Analysis

### Your Original Approaches

#### Approach 1: Comprehensive Documentation Baseline
**Description**: Create a document systematically capturing visual appearance and functional behavior of all pages in the baseline version.

**Pros**:
- Comprehensive understanding of system behavior
- Serves as living documentation for team
- Low technical complexity
- Captures business logic and edge cases

**Cons**:
- Extremely time-consuming (8-16 hours for 29 pages)
- High maintenance burden
- Human error in documentation
- No automation

**Verdict**: ❌ **Not recommended** as primary approach due to time constraints.

---

#### Approach 2: Dual-Environment Manual Testing
**Description**: Test the refactored code in dev environment and compare manually against live environment.

**Pros**:
- Quick initial setup (2-4 hours)
- Simple to understand and execute
- Direct comparison reveals obvious differences

**Cons**:
- Manual effort doesn't scale to 29 pages
- Prone to human error
- No regression test suite for future changes
- Slow to execute

**Verdict**: ⚠️ **Useful as supplement** for spot-checking critical flows, but insufficient as primary strategy.

---

### Proposed Approaches

#### Approach 3: Automated User Journey Replay with Claude for Chrome ⭐

**Description**: Leverage Claude for Chrome's workflow recording feature to capture critical user journeys on baseline, then automatically replay them on the refactored branch with differential analysis.

**Mechanism**:
1. **Record Phase** (baseline):
   - Use Claude for Chrome's "Record a workflow" feature
   - Capture all critical user journeys
   - Claude learns interaction steps automatically

2. **Replay Phase** (refactored branch):
   - Replay recorded workflows on `development-tac`
   - Capture: DOM snapshots, network requests, console logs, screenshots

3. **Analysis Phase**:
   - Automated diff comparison
   - Network traffic patterns (same API calls)
   - Console output (no new errors)
   - DOM state (structural equivalence)
   - Visual screenshots (pixel-wise comparison with tolerance)

**Implementation**:
```bash
# 1. Record baseline workflow
claude chrome record "Create Proposal Journey"
# Captures: login → search listing → view listing → create proposal → submit

# 2. Replay on refactored branch
claude chrome replay "Create Proposal Journey" --branch development-tac --capture-all

# 3. Automated comparison
claude chrome compare-workflows --baseline main --test development-tac
```

**Pros**:
- ✅ Leverages newest Claude for Chrome features (Dec 2025 release)
- ✅ Automated execution and comparison
- ✅ Multi-layered verification (DOM + network + console + visual)
- ✅ Reusable test suite
- ✅ Moderate setup time (4-6 hours) fits budget
- ✅ Perfect for user journey verification
- ✅ Low maintenance
- ✅ Islands-compatible

**Cons**:
- ⚠️ Beta software (potential bugs)
- ⚠️ Dynamic content may cause false positives
- ⚠️ Not FP-specific (doesn't test pure functions in isolation)

**Verdict**: ✅ **HIGHLY RECOMMENDED** as primary E2E testing approach.

**Priority**: **HIGH**
**Time Investment**: 4-6 hours setup, 10-20 min ongoing

---

#### Approach 4: Pure Function Unit Testing with Property-Based Verification ⭐⭐

**Description**: Create comprehensive unit tests for all logic layer modules using property-based testing to verify functional equivalents.

**Mechanism**:
1. **Identify Pure Functions** in logic layer:
   - **Calculators**: `calculateFourWeekRent()`, `calculateNightlyRateByFrequency()`, `getNightlyRate()`
   - **Rules**: `canUserEditProposal()`, `isProposalActive()`, `shouldShowAvailability()`
   - **Processors**: `adaptDaysFromBubble()`, `formatProposalForDisplay()`, `extractListingAddress()`
   - **Workflows**: Orchestration logic converted to pure functions

2. **Create Input/Output Test Cases**:
   - Capture production data samples
   - For each function: `(input) => expectedOutput`
   - Use Vitest with snapshot testing

3. **Property-Based Testing**:
   ```javascript
   // Example: Day adapter round-trips correctly
   property("Day adapter round-trips correctly", (bubbleDays) => {
     const jsDays = adaptDaysFromBubble(bubbleDays);
     const backToBubble = adaptDaysToBubble(jsDays);
     return deepEqual(bubbleDays, backToBubble);
   });
   ```

4. **Snapshot Testing**:
   ```javascript
   test("calculateFourWeekRent produces identical results", () => {
     const testCases = loadProductionSamples("rent_calculations");
     testCases.forEach(input => {
       expect(calculateFourWeekRent(input)).toMatchSnapshot();
     });
   });
   ```

**Implementation Steps**:
1. Install: `bun add -d fast-check`
2. Create test files: `logic/**/*.test.js`
3. Generate test cases from production data: `scripts/generate-test-cases.js`
4. Run tests: `bun test`
5. Integrate into CI: Add test step to GitHub Actions

**Pros**:
- ✅ **Specifically designed for functional programming refactors**
- ✅ Very high reliability (pure functions are deterministic)
- ✅ Fast execution (entire suite runs in seconds)
- ✅ Pinpoints exact function with regression
- ✅ Property-based testing explores edge cases
- ✅ Vitest already configured
- ✅ Low maintenance
- ✅ Perfect for logic layer (57 files)

**Cons**:
- ⚠️ Setup time (12-16 hours for comprehensive tests)
- ⚠️ Doesn't test UI or integration
- ⚠️ Requires production data samples

**Verdict**: ✅ **HIGHLY RECOMMENDED** as complementary approach. **Most important for FP refactor**.

**Priority**: **CRITICAL**
**Time Investment**: 12-16 hours setup, 5-10 min ongoing

---

#### Approach 5: Visual Regression Testing with Playwright Snapshots

**Description**: Use Playwright to capture visual snapshots of all 29 pages in baseline and refactored versions, automatically detecting visual differences.

**Mechanism**:
1. Configure `playwright.config.ts` for visual regression
2. Capture baseline snapshots (main branch)
3. Run tests on refactored branch (development-tac)
4. Playwright compares pixel-by-pixel, generates diff images

**Implementation**:
```javascript
// tests/visual-regression.spec.js
const pages = [
  { path: "/", name: "homepage" },
  { path: "/search", name: "search" },
  { path: "/view-split-lease/123", name: "listing-detail" },
  // ... all 29 pages
];

pages.forEach(({ path, name }) => {
  test(`${name} visual regression`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(`${name}.png`, {
      fullPage: true,
      threshold: 0.001 // 0.1% tolerance
    });
  });
});
```

**Pros**:
- ✅ Pixel-perfect visual verification
- ✅ Comprehensive coverage (all 29 pages)
- ✅ Automated comparison
- ✅ Playwright already in dependencies
- ✅ Islands-compatible

**Cons**:
- ⚠️ High false positive rate (dynamic content, animations)
- ⚠️ Maintenance burden (baselines need updating)
- ⚠️ Doesn't test functional behavior
- ⚠️ Flakiness in CI environments
- ⚠️ Not FP-specific

**Verdict**: ⚠️ **RECOMMENDED with caveats**. Lower priority than Approaches 3 & 4.

**Priority**: **MEDIUM-LOW**
**Time Investment**: 6-8 hours setup, 20-30 min ongoing

---

#### Approach 6: Differential Network Traffic Analysis

**Description**: Capture and compare network traffic (API calls, responses, timing) between baseline and refactored versions.

**Mechanism**:
1. **Network Traffic Capture**:
   - Use Playwright's network interception
   - Record: method, URL, headers, body, response, timing

2. **Traffic Pattern Comparison**:
   - Baseline: Capture from main branch
   - Refactored: Capture from development-tac
   - Compare: same endpoints, same payloads, same ordering

3. **Semantic Equivalence**:
   - Normalize dynamic values (timestamps, UUIDs)
   - Structural comparison (JSON schema validation)

**Implementation**:
```javascript
// tests/network-regression.spec.js
test('proposal creation network traffic', async ({ page }) => {
  const requests = [];

  page.on('request', request => {
    requests.push({
      url: request.url(),
      method: request.method(),
      postData: request.postData()
    });
  });

  // Execute user journey
  await page.goto('/create-proposal');
  await page.fill('[name="rent"]', '1500');
  await page.click('button[type="submit"]');

  // Compare against baseline
  expect(normalizeTraffic(requests)).toEqual(normalizeTraffic(baseline));
});
```

**Pros**:
- ✅ Low setup complexity (4-6 hours)
- ✅ High reliability for API contract verification
- ✅ Fast execution
- ✅ Pinpoints backend integration issues
- ✅ Low maintenance
- ✅ Perfect for Supabase Edge Function calls

**Cons**:
- ⚠️ Doesn't test UI or client-side logic
- ⚠️ Dynamic data requires normalization
- ⚠️ Incomplete coverage
- ⚠️ Not FP-specific

**Verdict**: ✅ **RECOMMENDED** as complementary approach.

**Priority**: **MEDIUM**
**Time Investment**: 4-6 hours setup, 5 min ongoing

---

## Recommended Three-Tier Testing Strategy

### Tier 1: Pure Function Unit Tests (Approach 4) ⭐⭐
**Priority**: **CRITICAL**

**Coverage**:
- All 57 logic files (calculators, rules, processors, workflows)
- Property-based testing for invariants
- Snapshot testing for output equivalence
- Production data samples for realistic scenarios

**Why This Is Foundation**:
- Pure functions are the essence of FP refactor
- Testing them in isolation provides highest confidence at lowest cost
- Deterministic outputs eliminate flakiness
- Fast execution enables continuous verification

**Expected Outcome**: 95-99% confidence that logic layer refactor is correct.

---

### Tier 2: Automated User Journey Replay (Approach 3) ⭐
**Priority**: **HIGH**

**Coverage**:
10-15 critical user journeys:
1. User registration and login
2. Search and filter listings
3. View listing details
4. Create proposal
5. Edit/cancel proposal
6. Send message
7. Edit account profile
8. Submit rental application
9. Self-listing creation (multi-step form)
10. Favorite listings
11. Virtual meeting scheduling
12. Password reset
13. Map interactions
14. Modal interactions (all 13 modals)
15. Form validation flows

**Why This Is High Priority**:
- Verifies end-to-end integration
- Catches issues between islands
- Tests critical user paths
- Leverages Claude for Chrome's newest capabilities
- Automated feedback loop (Boris Cherny's principle)

**Expected Outcome**: 90-95% confidence that user-facing behavior is identical.

---

### Tier 3: Network Traffic Analysis (Approach 6)
**Priority**: **MEDIUM**

**Coverage**:
- All Supabase Edge Function calls
- Bubble API proxy calls
- Authentication flows
- Form submissions

**Why This Is Important**:
- Safety net for API integration regressions
- Verifies backend contracts unchanged
- Fast execution
- Catches issues not visible in UI

**Expected Outcome**: 95% confidence that backend integrations are unchanged.

---

## Implementation Timeline (1-2 Days)

### Day 1: Setup Foundation (8 hours)

#### Morning (4 hours)
**Hour 1**: Set up Vitest test infrastructure
- Install `fast-check`: `bun add -d fast-check`
- Create test setup: `app/src/test/setup.js`
- Configure Vitest: `app/vitest.config.js`

**Hour 2-3**: Write unit tests for critical logic
- Day converters: `logic/processors/external/adaptDays*.test.js`
- Pricing calculators: `logic/calculators/*.test.js`
- Proposal rules: `logic/rules/proposals/*.test.js`

**Hour 4**: Extract production data samples
- Create script: `scripts/generate-test-cases.js`
- Query Supabase for sample data (anonymized if needed)
- Save to: `app/src/test/fixtures/`

#### Afternoon (4 hours)
**Hour 5-6**: Record 10-15 critical user journeys
- Set up Claude for Chrome integration
- Record each journey manually once
- Save workflow definitions

**Hour 7**: Set up network traffic capture
- Create Playwright config: `playwright.config.ts`
- Create network capture utility: `tests/utils/network-capture.js`
- Create test template: `tests/network-baseline-capture.spec.js`

**Hour 8**: Capture baseline network logs
- Run on main branch
- Save to: `tests/network-logs/baseline/`

---

### Day 2: Expand Coverage & Validation (8 hours)

#### Morning (4 hours)
**Hour 9-10**: Write unit tests for remaining logic
- Rules: `logic/rules/**/*.test.js`
- Processors: `logic/processors/**/*.test.js`
- Workflows: `logic/workflows/**/*.test.js`

**Hour 11**: Add property-based tests
- Implement invariants for key functions
- Day converter round-trips
- Pricing calculation constraints

**Hour 12**: Run initial test suite on baseline
- `bun test --update-snapshots`
- Establish baselines for snapshot tests
- Verify all tests pass on main branch

#### Afternoon (4 hours)
**Hour 13-14**: Set up CI integration
- Update `.github/workflows/claude.yml`
- Add test job to run on PR
- Configure test reporting

**Hour 15**: Create test execution script
- Script: `scripts/run-all-tests.sh`
- Documentation: `tests/README.md`
- Quick reference guide

**Hour 16**: Buffer for adjustments
- Troubleshoot any issues
- Optimize test execution
- Document edge cases

---

## Execution Workflow

### Phase 1: Pre-Refactor (Baseline Capture)
```bash
# Switch to baseline branch
git checkout main

# 1. Capture unit test baselines
bun test --update-snapshots

# 2. Record user journeys with Claude for Chrome
claude chrome record "Critical User Journeys"
# Follow prompts to execute each journey manually once

# 3. Capture network traffic baselines
bun playwright test tests/network-baseline-capture.spec.js

# 4. Commit baselines
git add tests/
git commit -m "Add test baselines for FP refactor verification"
```

---

### Phase 2: During Refactor (Continuous Verification)
```bash
# Switch to refactor branch
git checkout development-tac

# Run tests frequently (after each logical chunk)
bun test                    # Run unit tests (< 5 seconds)
bun test:watch              # Run in watch mode during development

# Every few hours, run E2E verification
claude chrome replay-all    # Replay all recorded journeys
bun playwright test tests/network-regression.spec.js
```

**Recommended Refactor Order**:
1. **Calculators first** (pure math, easiest to verify)
2. **Rules second** (boolean predicates)
3. **Processors third** (data transformations)
4. **Workflows fourth** (orchestration)
5. **Page logic last** (usePageLogic hooks)

---

### Phase 3: Pre-Merge (Final Validation)
```bash
# Comprehensive test suite
bun test:all                                    # All unit tests
claude chrome replay-all --capture-screenshots # All user journeys
bun playwright test                            # All network + visual tests

# Generate test report
bun test:report

# Review failures
# - Unit test failures: Logic regression (fix in logic layer)
# - Journey replay failures: Integration issue (fix in page logic)
# - Network failures: API contract broken (fix in Edge Functions)

# If all pass, create PR
gh pr create --base main --head development-tac \
  --title "Functional Programming Refactor" \
  --body "$(cat .claude/plans/Documents/$(date +%Y%m%d%H%M%S)-fp-refactor-test-report.md)"
```

---

## Risk Mitigation & Known Gotchas

### 1. Day Indexing Convention (CRITICAL ⚠️)
**Risk**: JS uses 0-6 (Sunday=0), Bubble uses 1-7 (Sunday=1). FP refactor may break converters.

**Mitigation**:
- High-priority unit tests for `adaptDaysFromBubble()` and `adaptDaysToBubble()`
- Property-based test: `adaptDaysToBubble(adaptDaysFromBubble(x)) === x`
- Test with production data samples

**Test Priority**: **CRITICAL - Test First**

---

### 2. Impure Function Masquerading as Pure
**Risk**: Function appears pure but has hidden side effects (DOM manipulation, API calls, localStorage).

**Mitigation**:
- Network traffic analysis catches unexpected API calls
- Claude for Chrome console monitoring catches DOM manipulation
- Code review checklist: Verify all I/O is in workflow layer

**Detection Method**: Network traffic + console logs

---

### 3. State Management Refactor Side Effects
**Risk**: Converting `useState` to functional patterns may introduce timing bugs.

**Mitigation**:
- User journey replay catches state-related regressions
- Pay attention to form state (proposal creation, self-listing)
- Test multi-step forms thoroughly (SelfListingPage has 7 sections)

**Test Priority**: **HIGH - Multi-step forms**

---

### 4. Islands Isolation Assumption
**Risk**: Assuming islands are independent, but some share state via localStorage or URL params.

**Mitigation**:
- Test cross-island flows (search → view listing → create proposal)
- Verify localStorage persistence unchanged
- Test URL parameter handling (search filters, listing IDs)

**Files to Watch**:
- `app/src/lib/urlParams.js`
- `app/src/lib/secureStorage.js`

---

### 5. Async Operations and Race Conditions
**Risk**: FP refactor may change async operation ordering, causing race conditions.

**Mitigation**:
- Network traffic analysis catches request ordering changes
- Pay attention to dependent API calls (auth → fetch user data)
- Test message threading (real-time updates)

**Test Priority**: **HIGH - Authentication flow, messaging**

---

### 6. Third-Party Integration Changes
**Risk**: FP refactor may affect Google Maps, Supabase client, or Bubble proxy integrations.

**Mitigation**:
- Network traffic analysis covers Supabase and Bubble
- User journey replay covers Google Maps (search, view listing)
- Manual spot-check of map interactions

**Test Priority**: **MEDIUM - Map interactions, API calls**

---

### 7. False Positives from Dynamic Content
**Risk**: Timestamps, UUIDs, session tokens cause test failures even when behavior is correct.

**Mitigation**:
- Normalize dynamic values in network traffic comparison
- Configure visual regression thresholds (0.1% tolerance)
- Use data-testid attributes for stable element selection

**Implementation**: Create normalization utility: `tests/utils/normalize.js`

---

## Success Criteria

The FP refactor is considered **verified and ready for production** when:

### Tier 1: Unit Tests (Must Pass 100%)
- ✅ All 57 logic layer functions produce identical outputs for production data samples
- ✅ Property-based tests pass for all invariants
- ✅ Snapshot tests match baseline for all calculators, rules, processors

### Tier 2: User Journeys (Must Pass 95%+)
- ✅ 10-15 critical user journeys replay successfully
- ✅ DOM snapshots structurally equivalent (allowing for dynamic IDs)
- ✅ Console logs show no new errors or warnings
- ✅ Network traffic patterns identical (same API calls, same payloads)
- ⚠️ Up to 5% failures acceptable IF:
  - Failures are due to known dynamic content (timestamps, UUIDs)
  - Manual verification confirms behavior is identical

### Tier 3: Network Traffic (Must Pass 95%+)
- ✅ All Supabase Edge Function calls have identical payloads
- ✅ Response structures unchanged
- ✅ No new API errors (4xx, 5xx responses)
- ⚠️ Timing differences acceptable (performance may improve/degrade slightly)

### Manual Spot-Check (Final Validation)
- ✅ Critical flows manually tested in preview environment:
  - User can create proposal successfully
  - Search returns correct results
  - Messages send/receive correctly
  - Payment flow works (if applicable)
- ✅ No console errors in browser DevTools
- ✅ Performance is acceptable (no severe degradation)

---

## Trade-Off Analysis Matrix

| Approach | Setup Time | Maintenance | Reliability | Coverage | Speed | Complexity | FP-Specific | Islands-Compatible | Cost |
|----------|-----------|-------------|-------------|----------|-------|------------|-------------|-------------------|------|
| **1. Documentation Baseline** | 8-16 hrs | High | Medium | High | Slow | Low | No | Yes | Low |
| **2. Dual-Environment Manual** | 2-4 hrs | Medium | Medium | Medium | Slow | Low | No | Yes | Low |
| **3. Claude for Chrome Replay** | 4-6 hrs | Low | High | High | Fast | Medium | No | Yes | Low |
| **4. Pure Function Unit Tests** | 12-16 hrs | Low | Very High | Medium | Very Fast | Medium | **Yes** | Yes | Low |
| **5. Playwright Visual Regression** | 6-8 hrs | Medium | High | High | Fast | Medium | No | Yes | Low |
| **6. Network Traffic Analysis** | 4-6 hrs | Low | High | Medium | Fast | Low | No | Yes | Low |

---

## Additional Resources

### Boris Cherny's Verification-Driven Development
- **Key Principle**: Give Claude a way to verify its work through automated feedback loops
- **Application**: All three tiers provide automated verification
  - Tier 1: Fast unit test feedback (seconds)
  - Tier 2: E2E journey feedback (minutes)
  - Tier 3: API contract feedback (minutes)

**Source**: [Boris Cherny's Claude Code Workflow That 5× Developer Productivity](https://www.theautomated.co/p/boris-cherny-s-claude-code-workflow-that-5-developer-productivity)

### Claude for Chrome Capabilities
- **Recording Workflows**: Teach Claude user journeys by recording once
- **Scheduled Tasks**: Run regression tests on recurring schedule
- **Multi-tab Workflows**: Test complex flows across multiple pages
- **Console Monitoring**: Real-time error tracking
- **Network Inspection**: API call verification

**Source**: [Use Claude Code with Chrome (beta)](https://code.claude.com/docs/en/chrome)

### Visual Regression Testing Best Practices
- **Modular Snapshots**: Focus on specific UI components
- **Visual Stability**: Ensure complete asset loading before capture
- **Consistent Environments**: CI/CD pipeline execution in Docker/VM
- **Fine-tuned Thresholds**: Configure tolerance for antialiasing
- **AI-Powered Detection**: Modern tools distinguish bugs from harmless variations

**Source**: [The UI Visual Regression Testing Best Practices Playbook](https://medium.com/@ss-tech/the-ui-visual-regression-testing-best-practices-playbook-dc27db61ebe0)

---

## Important Files Reference

### Logic Layer (57 files - Primary Refactor Targets)

#### Calculators (Pure Math Functions)
- `app/src/logic/calculators/calculateFourWeekRent.js`
- `app/src/logic/calculators/calculateNightlyRateByFrequency.js`
- `app/src/logic/calculators/getNightlyRate.js`

#### Rules (Boolean Predicates)
- `app/src/logic/rules/proposals/canUserEditProposal.js`
- `app/src/logic/rules/proposals/isProposalActive.js`
- `app/src/logic/rules/scheduling/shouldShowAvailability.js`
- `app/src/logic/rules/auth/*.js` (22 rule modules total)

#### Processors (Data Transformations)
- `app/src/logic/processors/external/adaptDaysFromBubble.js` ⚠️ CRITICAL
- `app/src/logic/processors/external/adaptDaysToBubble.js` ⚠️ CRITICAL
- `app/src/logic/processors/display/formatProposalForDisplay.js`
- `app/src/logic/processors/listing/extractListingAddress.js`
- (14 processor modules total)

#### Workflows (Orchestration)
- `app/src/logic/workflows/proposals/*.js`
- `app/src/logic/workflows/auth/*.js`
- `app/src/logic/workflows/scheduling/*.js`
- (12 workflow modules total)

### Page Logic (Hollow Components Pattern)
- `app/src/islands/pages/*/use*PageLogic.js` (23 pages)
- Examples:
  - `app/src/islands/pages/SearchPage/useSearchPageLogic.js`
  - `app/src/islands/pages/ViewSplitLeasePage/useViewSplitLeasePageLogic.js`
  - `app/src/islands/pages/CreateProposalPage/useCreateProposalPageLogic.js`

### Entry Points (29 Independent Islands)
- `app/src/*.jsx` (29 entry point files)
- Each creates independent React root
- No shared global state between islands

### State Management
- `app/src/lib/urlParams.js` - URL parameter handling
- `app/src/lib/secureStorage.js` - Encrypted localStorage wrapper
- `app/src/islands/pages/SelfListingPage/store/useListingStore.ts` - Zustand store

### API Integration
- `app/src/lib/supabase.js` - Supabase client initialization
- `app/src/lib/bubbleAPI.js` - Bubble API proxy client
- `supabase/functions/*/index.ts` - 9 Edge Functions

### Configuration
- `app/vite.config.js` - Build configuration (289 lines)
- `app/routes.config.js` - Route Registry (single source of truth)
- `app/tailwind.config.js` - Tailwind CSS configuration
- `app/eslint.config.js` - Linting rules

### Testing Infrastructure (To Be Created)
- `app/vitest.config.js` - Vitest configuration (to be created)
- `playwright.config.ts` - Playwright configuration (to be created)
- `tests/visual-regression.spec.js` - Visual regression tests
- `tests/network-regression.spec.js` - Network traffic tests
- `app/src/logic/**/*.test.js` - Unit tests for logic layer
- `scripts/generate-test-cases.js` - Test data generation script
- `tests/utils/network-capture.js` - Network capture utility
- `tests/utils/normalize.js` - Dynamic value normalization

### Critical User Journeys (To Be Recorded)
1. Authentication: Login, signup, password reset
2. Search: Filter listings, view results
3. Listing Detail: View listing, check availability, map interaction
4. Proposal: Create, edit, cancel, view details
5. Messaging: Send message, view thread
6. Account: Edit profile, update preferences
7. Self-Listing: Multi-step form (7 sections)
8. Favorites: Add/remove favorites
9. Virtual Meeting: Schedule meeting, join meeting
10. Rental Application: Submit application form

---

## Next Actions

### Immediate Next Steps (Before Refactor Begins)
1. ✅ **Review this document** with team for alignment
2. ✅ **Estimate actual time** for setup based on team familiarity
3. ✅ **Identify critical user journeys** from analytics (if available)
4. ✅ **Set up test infrastructure** (Day 1 morning)
5. ✅ **Capture baselines** before any refactoring (Day 1 afternoon)

### During Refactor
1. **Run unit tests continuously** (`bun test:watch`)
2. **Commit frequently** with descriptive messages
3. **Run E2E tests every few hours** (catch integration issues early)
4. **Document any deviations** from original plan

### Post-Refactor
1. **Run comprehensive test suite** (all three tiers)
2. **Review test failures** and fix regressions
3. **Manual spot-check** critical flows in preview environment
4. **Create PR** with test report
5. **Deploy to preview branch** for stakeholder review
6. **Merge to production** after approval

---

## Questions for Further Clarification

1. **Common User Journeys**: You mentioned having "most common user journeys" documented. Where can we find this documentation?
2. **Analytics Access**: Do you have Google Analytics, Mixpanel, or similar to identify highest-traffic flows?
3. **Production Data Access**: Can we safely query production Supabase for test samples, or should we use dev database?
4. **Test Execution Environment**: Should tests run in CI (GitHub Actions) or locally only?
5. **Failure Threshold**: What constitutes "acceptable" for the 1-5% false negatives? (e.g., known flaky tests, dynamic content)

---

## Document Metadata
- **Author**: Claude Code (Sonnet 4.5)
- **Created**: 2026-01-11 15:23:43
- **Last Updated**: 2026-01-11 15:23:43
- **Status**: Planning Phase - Awaiting Approval
- **Next Phase**: Implementation (Day 1 setup)
- **Related Branch**: `development-tac`
- **Estimated Completion**: 2 days (16 hours)
