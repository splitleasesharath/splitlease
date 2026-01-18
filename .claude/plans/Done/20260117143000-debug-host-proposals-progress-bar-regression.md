# Debug Analysis: Host Proposals Progress Bar Regression

**Created**: 2026-01-17 14:30:00
**Status**: Analysis Complete - Pending Implementation
**Severity**: High
**Affected Area**: HostProposalsPage / ProposalDetailsModal / Progress Bar

## 1. System Context (From Onboarding)

### 1.1 Architecture Understanding
- **Architecture Pattern**: Islands Architecture with Hollow Components
- **Tech Stack**: React 18, Supabase Edge Functions, Vite bundler
- **Data Flow**: Proposal status comes from Supabase (replica of Bubble data) -> `getStatusConfig()` extracts `usualOrder` -> `getProgressSteps()` calculates step states -> Progress bar renders based on completed/current state

### 1.2 Domain Context
- **Feature Purpose**: Show hosts the current progress of each proposal through the booking funnel
- **Related Documentation**:
  - `app/src/logic/constants/proposalStatuses.js` - Unified status system with `usualOrder` values
  - `app/src/islands/pages/HostProposalsPage/types.js` - Local status definitions and `PROGRESS_THRESHOLDS`
- **Data Model**:
  - Proposals have a `Status` field that maps to predefined status strings
  - Each status has a `usualOrder` value (0-7) representing progress through the funnel
  - Reference table: `os_proposal_status` with `sort_order` values

### 1.3 Relevant Conventions
- **Key Patterns**:
  - `usualOrder` values: 0=Awaiting Rental App, 1=Host Review, 2=Counteroffer, 3=Accepted, 4-7=Lease flow
  - Progress bar shows 5 steps: Proposal Submitted -> Rental App -> Host Review -> Lease Docs -> Initial Payment
- **Layer Boundaries**: Business logic in `logic/constants/`, UI rendering in `islands/pages/`
- **Shared Utilities**: `getStatusConfig()`, `getUsualOrder()`, `isTerminalStatus()` from proposalStatuses.js

### 1.4 Entry Points and Dependencies
- **User/Request Entry Point**: Host clicks on a proposal card -> ProposalDetailsModal opens
- **Critical Path**: `statusConfig = getStatusConfig(statusKey)` -> `usualOrder = statusConfig.usualOrder` -> `getProgressSteps()` -> render circles and lines
- **Dependencies**:
  - `app/src/logic/constants/proposalStatuses.js` - status configuration
  - `app/src/styles/components/host-proposals.css` - progress bar styling

## 2. Problem Statement

When a proposal's status is "Host Review" (usualOrder = 1):
- **Expected**: Progress bar shows Step 1 (purple), Step 2 (purple), Step 3 (GREEN - current), with purple connecting lines to step 3
- **Actual**: Progress bar shows Step 1 (purple), Step 2 (purple), Step 3 (GREY - not highlighted), grey connecting line to step 3

The issue is that the "current" step (Host Review = step 3) is not being highlighted in green, and the connecting line to the current step is grey instead of purple.

## 3. Reproduction Context

- **Environment**: Host Proposals Page, production and development
- **Steps to reproduce**:
  1. Log in as a host
  2. Navigate to Host Proposals page
  3. Click on a proposal that has "Host Review" status (usualOrder = 1)
  4. Observe the progress bar in the Proposal Status section
- **Expected behavior**: Host Review circle (step 3) should be green, line connecting step 2 to step 3 should be purple
- **Actual behavior**: Host Review circle is grey, connecting line is grey
- **Error messages/logs**: None (visual regression only)

## 4. Investigation Summary

### 4.1 Files Examined
| File | Relevance |
|------|-----------|
| `app/src/islands/pages/HostProposalsPage/ProposalDetailsModal.jsx` | **PRIMARY** - Contains progress bar logic |
| `app/src/islands/pages/HostProposalsPage/types.js` | Contains `PROGRESS_THRESHOLDS` and status helpers |
| `app/src/logic/constants/proposalStatuses.js` | Unified status system with `usualOrder` values |
| `app/src/styles/components/host-proposals.css` | CSS for progress bar (`.progress-step.current`, `.progress-step.completed`) |

### 4.2 Execution Flow Trace

**Current (Broken) Code Flow:**
1. Status "Host Review" maps to `usualOrder = 1`
2. `getProgressSteps()` is called:
   - `proposalSubmitted.completed = true` (always)
   - `rentalApp.completed = usualOrder >= 1 = TRUE`
   - `hostReview.completed = usualOrder >= 3 = FALSE` (because 1 < 3)
   - `hostReview.current = isHostReviewCurrent` where `isHostReviewCurrent = statusConfig.key === 'Host Review'`
   - But **there is NO special styling for `current` steps anymore!**
3. `getLastCompletedStep()` returns `'rentalApp'` (last completed step)
4. Only step 2 (Rental App) gets the green highlight via `isLastCompleted('rentalApp')`
5. Step 3 (Host Review) gets class `current` but **CSS `.progress-step.current` sets background to #BFBFBF (grey)**, not green!
6. `getLineClass(rentalApp, hostReview)` requires `prevStep.completed && nextStep.completed` - since `hostReview.completed = false`, line stays grey

**The Bug:**
- The current code highlights the "last completed" step in green, NOT the "current" step
- The `current` CSS class sets the circle to grey (#BFBFBF), which is for "in progress" styling
- The working fix used `isHighlighted()` which prioritized the CURRENT step over the last completed step
- The line logic requires BOTH steps to be completed, but should fill when reaching the current step

### 4.3 Git History Analysis

**Key Commits Chronologically:**

1. **Commit 774dee91** (Thu Jan 8 12:25:28 2026) - **THE FIX**
   - "fix(progress-bar): Highlight current step instead of last completed"
   - Changed `getLastCompletedStep()` to `getHighlightedStep()`
   - Added logic: current step gets priority over last completed
   - Changed `hostReview.current = usualOrder >= 1 && usualOrder < 3`
   - Renamed `isLastCompleted()` to `isHighlighted()`

2. **Commit 1ff11315** (Thu Jan 8 12:54:17 2026) - **LINE FIX**
   - "fix(progress-bar): Fill line leading to current step"
   - Changed `getLineClass()` to fill when `prevStep.completed && (nextStep.completed || nextStep.current)`

3. **Commit 76e9bd27** (Thu Jan 15 08:08:33 2026) - **THE REGRESSION**
   - "docs(audit): Add comprehensive code refactoring plan for app/"
   - Despite being labeled as "docs", this commit **REVERTED the ProposalDetailsModal.jsx changes**
   - Reverted `getHighlightedStep()` back to `getLastCompletedStep()`
   - Reverted `isHighlighted()` back to `isLastCompleted()`
   - Reverted the line logic back to requiring both steps completed
   - Removed the `hostReview.current = usualOrder >= 1 && usualOrder < 3` logic

## 5. Hypotheses

### Hypothesis 1: Accidental Revert in "docs(audit)" Commit (Likelihood: 99%)

**Theory**: Commit `76e9bd27` unintentionally reverted working code. The commit message says "docs(audit): Add comprehensive code refactoring plan" but it actually modified `ProposalDetailsModal.jsx` and reverted the progress bar fixes from commits `774dee91` and `1ff11315`.

**Supporting Evidence**:
- Git diff of `76e9bd27` shows explicit revert of the working code
- The reverted patterns exactly match the current broken code
- Commit message doesn't mention ProposalDetailsModal changes
- The diff shows old comments being restored (reference table documentation was reverted)

**Contradicting Evidence**: None

**Verification Steps**:
1. Compare current `ProposalDetailsModal.jsx` with state after `1ff11315` - should show differences in `getProgressSteps()`, `getHighlightedStep()`, and `getLineClass()`
2. Apply changes from `774dee91` and `1ff11315` - should fix the issue

**Potential Fix**: Re-apply the changes from commits `774dee91` and `1ff11315`

**Convention Check**: This is a clear violation of the commit message convention - a "docs" commit should not modify application code.

### Hypothesis 2: CSS Class Priority Issue (Likelihood: 1%)

**Theory**: The `.current` CSS class styling might be overriding the inline `backgroundColor: '#065F46'` style.

**Supporting Evidence**: The CSS defines `.progress-step.current .step-circle { background-color: #BFBFBF; }`

**Contradicting Evidence**:
- Inline styles have higher specificity than CSS classes
- The code uses `style={isLastCompleted('hostReview') ? { backgroundColor: '#065F46' } : undefined}`
- The issue is that `isLastCompleted('hostReview')` returns `false`, so no inline style is applied

**Verification Steps**: Check browser dev tools to see which style is being applied

**Potential Fix**: N/A - this is not the root cause

## 6. Recommended Action Plan

### Priority 1 (The Fix - Restore Working Code)

Re-apply the changes from commits `774dee91` and `1ff11315` to `ProposalDetailsModal.jsx`:

**Changes to `getProgressSteps()` function (around line 180):**
```javascript
const getProgressSteps = () => {
  // Determine current step based on usualOrder ranges
  // usualOrder 0: At "Proposal Submitted" / "Awaiting Rental App"
  // usualOrder 1-2: At "Host Review" (includes counteroffer)
  // usualOrder 3-4: At "Lease Docs" phase
  // usualOrder 5-6: At "Lease Docs" / "Awaiting Payment"
  // usualOrder 7: At "Initial Payment" / Complete

  return {
    proposalSubmitted: {
      completed: true, // Always completed once proposal exists
      current: usualOrder === 0 // Current when awaiting rental app
    },
    rentalApp: {
      completed: usualOrder >= 1, // Completed once rental app submitted
      current: false // This is a transitional step, not a "waiting" step
    },
    hostReview: {
      completed: usualOrder >= 3, // Completed when accepted
      current: usualOrder >= 1 && usualOrder < 3 // Current during Host Review & Counteroffer
    },
    leaseDocs: {
      completed: usualOrder >= 6, // Completed when awaiting payment
      current: usualOrder >= 3 && usualOrder < 6 // Current during lease doc phases
    },
    initialPayment: {
      completed: usualOrder >= 7, // Completed when lease activated
      current: usualOrder === 6 // Current when awaiting payment
    }
  };
};
```

**Replace `getLastCompletedStep()` with `getHighlightedStep()` (around line 219):**
```javascript
/**
 * Determine which step should show the green highlight
 * Priority: current step > last completed step
 */
const getHighlightedStep = () => {
  // First check for current step (where we are now)
  if (progress.initialPayment.current) return 'initialPayment';
  if (progress.leaseDocs.current) return 'leaseDocs';
  if (progress.hostReview.current) return 'hostReview';
  if (progress.proposalSubmitted.current) return 'proposalSubmitted';

  // Fallback to last completed step
  if (progress.initialPayment.completed) return 'initialPayment';
  if (progress.leaseDocs.completed) return 'leaseDocs';
  if (progress.hostReview.completed) return 'hostReview';
  if (progress.rentalApp.completed) return 'rentalApp';
  if (progress.proposalSubmitted.completed) return 'proposalSubmitted';
  return null;
};

const highlightedStep = getHighlightedStep();
```

**Rename `isLastCompleted()` to `isHighlighted()` (around line 282):**
```javascript
/**
 * Check if a step should be shown in green (highlighted step = current or last completed)
 */
const isHighlighted = (stepName) => {
  return !isCancelled && highlightedStep === stepName;
};
```

**Update `getLineClass()` to fill line to current step (around line 290):**
```javascript
/**
 * Get CSS class for a progress line (between two steps)
 * Line is completed (purple) if:
 * - Both adjacent steps are completed, OR
 * - Previous step is completed AND next step is current (we've reached it)
 */
const getLineClass = (prevStep, nextStep) => {
  if (isCancelled) return 'cancelled';
  // Line fills when we've moved past it (prev completed) AND reached the next step (completed OR current)
  if (prevStep.completed && (nextStep.completed || nextStep.current)) return 'completed';
  return '';
};
```

**Update all render calls from `isLastCompleted()` to `isHighlighted()` (around lines 628-664):**
Replace all 5 occurrences:
- `isLastCompleted('proposalSubmitted')` -> `isHighlighted('proposalSubmitted')`
- `isLastCompleted('rentalApp')` -> `isHighlighted('rentalApp')`
- `isLastCompleted('hostReview')` -> `isHighlighted('hostReview')`
- `isLastCompleted('leaseDocs')` -> `isHighlighted('leaseDocs')`
- `isLastCompleted('initialPayment')` -> `isHighlighted('initialPayment')`

### Priority 2 (If Priority 1 Fails)

If re-applying the fix doesn't work, check:
1. Browser CSS specificity issues (inline styles vs class styles)
2. Whether `usualOrder` is being properly extracted from the status
3. Add console.log debugging to verify `usualOrder`, `progress`, and `highlightedStep` values

### Priority 3 (Deeper Investigation)

If both priorities fail:
1. Check if the proposalStatuses.js file was also affected by the revert
2. Verify the status key matching is working correctly
3. Check for any CSS build/caching issues

## 7. Prevention Recommendations

1. **Enforce commit message conventions**: The "docs" prefix should NEVER include code changes. Add a pre-commit hook to validate that "docs:" commits only touch `.md` files.

2. **Code review for "docs" commits**: Even documentation commits should be reviewed to catch accidental code changes.

3. **Add visual regression tests**: Screenshot-based tests for the progress bar at each status level would have caught this immediately.

4. **Add unit tests for `getProgressSteps()`**: Test that returns correct `current` state for each `usualOrder` value.

5. **Reference the fix commits in documentation**: Add a comment in ProposalDetailsModal.jsx referencing the original fix commits so future developers know not to revert them.

## 8. Related Files Reference

| File | Line Numbers | Change Required |
|------|--------------|-----------------|
| `app/src/islands/pages/HostProposalsPage/ProposalDetailsModal.jsx` | 180-211 | Restore `getProgressSteps()` with `current` logic |
| `app/src/islands/pages/HostProposalsPage/ProposalDetailsModal.jsx` | 219-228 | Replace `getLastCompletedStep()` with `getHighlightedStep()` |
| `app/src/islands/pages/HostProposalsPage/ProposalDetailsModal.jsx` | 282-286 | Rename `isLastCompleted()` to `isHighlighted()` |
| `app/src/islands/pages/HostProposalsPage/ProposalDetailsModal.jsx` | 290-296 | Update `getLineClass()` to include `|| nextStep.current` |
| `app/src/islands/pages/HostProposalsPage/ProposalDetailsModal.jsx` | 628, 637, 646, 655, 664 | Replace `isLastCompleted()` calls with `isHighlighted()` |

---

## Summary

**Root Cause**: Commit `76e9bd27` (labeled as "docs(audit)") accidentally reverted the progress bar fix from commits `774dee91` and `1ff11315`.

**Top Hypothesis**: The "docs" commit included unintended changes that reverted:
1. The logic that highlights the CURRENT step (where we are now) instead of just the last completed step
2. The line fill logic that shows progression TO the current step

**Fix**: Re-apply the exact changes from commits `774dee91` and `1ff11315` to restore the working behavior.

**Breaking Commit**: `76e9bd27` (Thu Jan 15 08:08:33 2026)
**Working State Before**: After `1ff11315` (Thu Jan 8 12:54:17 2026)
