# De-Barrel Execution Plan

**Created**: 2026-01-18
**Objective**: Systematically remove all 33 pure barrel files using the `/de-barrel` skill
**Approach**: Prioritized batches with verification after each removal

---

## Current State

| Category | Count | Action |
|----------|-------|--------|
| Pure Barrels | 33 | Remove systematically |
| Mixed Files | 10 | Manual review (possible false positives) |
| Entry Points | 2 | Keep |

**Baseline Report**: `refactor/reports/baseline-20260118.json`

---

## Execution Strategy

### Processing Order (Risk-Based)

Process barrels in order of increasing risk/complexity:

| Priority | Category | Count | Risk | Rationale |
|----------|----------|-------|------|-----------|
| 1 | Simple shared components | ~8 | LOW | Single export, few consumers |
| 2 | Page component barrels | ~10 | LOW | Contained within page directories |
| 3 | Feature module barrels | ~12 | MEDIUM | Multiple exports, more consumers |
| 4 | Logic layer barrels | 3 | MEDIUM | Core business logic, many consumers |

### Batch Size

- **Batch size**: 3-5 barrels per cycle
- **Verification**: After EACH barrel removal
- **Commit**: After each successful removal
- **Checkpoint**: Full build verification after each batch

---

## Phase 1: Simple Shared Components (Priority 1)

### Targets

These have single exports and typically 1-3 consumers:

1. `app/src/islands/shared/FavoriteButton/index.js` (2 exports)
2. `app/src/islands/shared/LoggedInAvatar/index.js` (2 exports)
3. `app/src/islands/shared/FeedbackWidget/index.js` (2 exports)
4. `app/src/islands/shared/ImportListingReviewsModal/index.js` (2 exports)
5. `app/src/islands/shared/EditListingDetails/index.js` (3 exports)
6. `app/src/islands/shared/HeaderMessagingPanel/index.js` (3 exports)
7. `app/src/islands/shared/AiSignupMarketReport/index.js` (4 exports)
8. `app/src/islands/shared/AIImportAssistantModal/index.js` (4 exports)

### Execution Steps (Per Barrel)

```
FOR EACH barrel in Priority 1:

    1. ANALYZE
       - Read barrel file content
       - Create export map (export name -> source file)
       - Find all consumers: grep -r "from.*<BarrelDir>['\"]" app/src

    2. UPDATE CONSUMERS
       - For each consumer file:
         - Replace barrel import with direct import(s)
         - Handle default vs named exports appropriately

    3. DELETE BARREL
       - rm <barrel-file-path>

    4. VERIFY
       - Run: bun run dev (check for import errors)
       - If errors: FIX immediately before proceeding

    5. COMMIT
       - git add -A
       - git commit -m "refactor(cleanup): remove <Name> barrel file"

    6. LOG PROGRESS
       - Note barrel removed
       - Update count: 33 -> 32 -> 31 -> ...
```

### Checkpoint After Phase 1

```bash
# Full verification
bun run build

# Re-run detector
python refactor/barrel_detector.py

# Expected: 33 - 8 = 25 pure barrels remaining
```

---

## Phase 2: Page Component Barrels (Priority 2)

### Targets

Page-specific component barrels (contained scope):

1. `app/src/islands/pages/FavoriteListingsPage/index.js` (4 exports)
2. `app/src/islands/pages/HostOverviewPage/components/index.js` (4 exports)
3. `app/src/islands/pages/HouseManualPage/index.js` (3 exports)
4. `app/src/islands/pages/ListingDashboardPage/index.js` (4 exports)
5. `app/src/islands/pages/ViewSplitLeasePage/components/index.js` (4 exports)
6. `app/src/islands/pages/SearchPage/components/index.js` (6 exports)
7. `app/src/islands/pages/MessagingPage/components/index.js` (14 exports)
8. `app/src/islands/pages/SelfListingPage/index.ts` (2 exports)
9. `app/src/islands/pages/SelfListingPageV2/index.ts` (1 export)
10. `app/src/islands/pages/ListingDashboardPage/components/index.js` (32 exports) - COMPLEX

### Special Handling: ListingDashboardPage/components

This barrel has **32 exports** - process with extra care:
1. Map ALL 32 exports to their source files
2. May need to update imports in multiple consumer files
3. Consider splitting into sub-batches if needed

### Checkpoint After Phase 2

```bash
bun run build
python refactor/barrel_detector.py
# Expected: 25 - 10 = 15 pure barrels remaining
```

---

## Phase 3: Feature Module Barrels (Priority 3)

### Targets

Complex shared components with multiple exports:

1. `app/src/islands/shared/CreateDuplicateListingModal/index.js` (4 exports)
2. `app/src/islands/shared/SubmitListingPhotos/index.js` (4 exports)
3. `app/src/islands/shared/RentalApplicationWizardModal/index.js` (4 exports)
4. `app/src/islands/shared/ScheduleCohost/index.js` (5 exports)
5. `app/src/islands/shared/QRCodeDashboard/components/index.js` (8 exports)
6. `app/src/islands/shared/ReminderHouseManual/components/index.js` (8 exports)
7. `app/src/islands/shared/NotificationSettingsIsland/index.js` (10 exports)
8. `app/src/islands/shared/HostReviewGuest/index.js` (11 exports)
9. `app/src/islands/shared/AITools/index.js` (16 exports)
10. `app/src/islands/shared/VirtualMeetingManager/index.js` (18 exports)
11. `app/src/islands/shared/SuggestedProposals/index.js` (20 exports)
12. `app/src/islands/shared/DateChangeRequestManager/index.js` (21 exports)

### Checkpoint After Phase 3

```bash
bun run build
python refactor/barrel_detector.py
# Expected: 15 - 12 = 3 pure barrels remaining
```

---

## Phase 4: Logic Layer Barrels (Priority 4)

### Targets

Core business logic barrels - highest consumer count:

1. `app/src/logic/constants/index.js` (3 exports)
2. `app/src/logic/index.js` (4 exports)
3. `app/src/logic/calculators/index.js` (10 exports)

### Special Considerations

These barrels are imported throughout the codebase:
- Many consumer files to update
- Critical business logic paths
- Extra verification needed

### Checkpoint After Phase 4

```bash
bun run build
python refactor/barrel_detector.py
# Expected: 0 pure barrels remaining
```

---

## Periodic Check Loop

After each barrel removal, run this check:

```
┌─────────────────────────────────────────────────────────────┐
│                    DE-BARREL CHECK LOOP                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Run detector                                            │
│     python refactor/barrel_detector.py                      │
│                                                             │
│  2. Check counts                                            │
│     - Pure barrels remaining?                               │
│     - Any new barrels introduced?                           │
│                                                             │
│  3. Verify build                                            │
│     bun run build                                           │
│                                                             │
│  4. If barrels remain:                                      │
│     - Pick next target from priority list                   │
│     - Run /de-barrel <target>                               │
│     - Loop back to step 1                                   │
│                                                             │
│  5. If no barrels remain:                                   │
│     - Run final verification                                │
│     - Generate completion report                            │
│     - DONE                                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Progress Tracking

### Progress Log Format

After each removal, update this log:

```markdown
## De-Barrel Progress Log

| # | Barrel Removed | Exports | Consumers | Status | Commit |
|---|----------------|---------|-----------|--------|--------|
| 1 | FavoriteButton/index.js | 2 | 3 | ✅ | abc123 |
| 2 | LoggedInAvatar/index.js | 2 | 2 | ✅ | def456 |
| ... | ... | ... | ... | ... | ... |
```

### Metrics to Track

- **Barrels Removed**: X / 33
- **Consumer Files Updated**: Y
- **Build Status**: PASSING / FAILING
- **Current Phase**: 1 / 2 / 3 / 4

---

## Verification Commands

```bash
# Quick check - dev server starts
bun run dev

# Full check - production build
bun run build

# Barrel count check
python refactor/barrel_detector.py

# Find broken imports (should return nothing)
grep -r "from.*index['\"]" app/src --include="*.js" --include="*.jsx" | grep -v node_modules | grep -v ".test."
```

---

## Rollback Strategy

If a removal breaks the build:

```bash
# Revert uncommitted changes
git checkout .

# If already committed, revert the commit
git revert HEAD

# Re-run detector to confirm barrel is back
python refactor/barrel_detector.py
```

---

## Completion Criteria

The de-barreling is complete when:

1. ✅ `python refactor/barrel_detector.py` shows **0 pure barrels**
2. ✅ `bun run build` passes
3. ✅ `bun run dev` starts without errors
4. ✅ All 33 barrels have been removed and committed
5. ✅ Final report generated

---

## Final Report Template

```markdown
# De-Barrel Completion Report

**Completed**: YYYY-MM-DD
**Duration**: X hours/days

## Summary

| Metric | Value |
|--------|-------|
| Barrels Removed | 33 |
| Consumer Files Updated | ~XX |
| Commits Created | 33 |
| Build Status | PASSING |

## Phases Completed

- [x] Phase 1: Simple shared components (8 barrels)
- [x] Phase 2: Page component barrels (10 barrels)
- [x] Phase 3: Feature module barrels (12 barrels)
- [x] Phase 4: Logic layer barrels (3 barrels)

## Mixed Files Status

The 10 mixed files were reviewed:
- X were false positives (multi-line exports) - also removed
- Y contain actual logic - kept as-is

## Benefits Achieved

- Sparse dependency graph for easier refactoring
- Direct imports improve code clarity
- Better tree-shaking potential
- AI-assisted refactoring now more effective
```

---

## Execution Command

To begin execution:

```
/de-barrel app/src/islands/shared/FavoriteButton/index.js
```

Then follow the periodic check loop until all barrels are removed.

---

## Files Referenced

| File | Purpose |
|------|---------|
| `refactor/barrel_detector.py` | Detection script |
| `refactor/reports/baseline-20260118.json` | Starting point baseline |
| `.claude/skills/de-barrel.md` | De-barrel skill definition |
| `.claude/plans/New/20260117-debarrel-implementation-plan.md` | Original plan with test strategy |
