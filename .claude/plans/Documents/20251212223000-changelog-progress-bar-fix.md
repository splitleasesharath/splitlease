# Implementation Changelog

**Plan Executed**: 20251212220000-debug-progress-bar-rental-app-status.md
**Execution Date**: 2025-12-12
**Status**: Complete

## Summary
Fixed the progress bar conditional logic in ProposalCard.jsx that was incorrectly showing Stage 2 (Rental App Submitted) and Stage 3 (Host Review) as completed when the rental application had not been submitted. The root cause was the `getStageColor()` function using `usualOrder` thresholds instead of checking actual status progression.

## Files Modified
| File | Change Type | Description |
|------|-------------|-------------|
| app/src/islands/pages/proposals/ProposalCard.jsx | Modified | Fixed getStageColor() function Stage 2 and Stage 3 logic |

## Detailed Changes

### Stage 2 (Rental App Submitted) - Lines 413-435
- **File**: `app/src/islands/pages/proposals/ProposalCard.jsx`
  - **Change**: Replaced `usualOrder >= 1` threshold with explicit status-based checks
  - **Old Logic**:
    ```javascript
    // Green when awaiting rental app
    if (!hasRentalApp ||
        normalizedStatus === 'Proposal Submitted by guest - Awaiting Rental Application' ||
        normalizedStatus === 'Proposal Submitted for guest by Split Lease - Awaiting Rental Application' ||
        normalizedStatus === 'Proposal Submitted for guest by Split Lease - Pending Confirmation') {
      return PROGRESS_COLORS.green;
    }
    // Purple when past this stage
    if (usualOrder >= 1) {  // BUG: Always true for active proposals
      return PROGRESS_COLORS.purple;
    }
    ```
  - **New Logic**:
    ```javascript
    // Green when awaiting rental app - these statuses mean rental app is NOT yet submitted
    if (normalizedStatus === 'Proposal Submitted by guest - Awaiting Rental Application' ||
        normalizedStatus === 'Proposal Submitted for guest by Split Lease - Awaiting Rental Application' ||
        normalizedStatus === 'Proposal Submitted for guest by Split Lease - Pending Confirmation' ||
        normalizedStatus === 'Pending' ||
        normalizedStatus === 'Pending Confirmation') {
      return PROGRESS_COLORS.green;
    }
    // Purple when rental app has been submitted (status moved past awaiting rental app)
    if (hasRentalApp ||
        normalizedStatus === 'Rental Application Submitted' ||
        normalizedStatus === 'Host Review' ||
        normalizedStatus.includes('Counteroffer') ||
        normalizedStatus.includes('Accepted') ||
        normalizedStatus.includes('Lease Documents') ||
        normalizedStatus.includes('Payment') ||
        normalizedStatus.includes('activated')) {
      return PROGRESS_COLORS.purple;
    }
    ```
  - **Reason**: The `!hasRentalApp` check in the OR condition was being bypassed by the `usualOrder >= 1` condition below, which is always true for active proposals
  - **Impact**: Stage 2 now correctly shows green (action needed) when rental app is not submitted, and purple (completed) only when rental app exists or status indicates it was submitted

### Stage 3 (Host Review) - Lines 437-457
- **File**: `app/src/islands/pages/proposals/ProposalCard.jsx`
  - **Change**: Replaced `usualOrder >= 3` threshold with explicit status-based checks
  - **Old Logic**:
    ```javascript
    // Purple when past this stage
    if (usualOrder >= 3) {  // BUG: True for "Awaiting Rental Application" (usualOrder=3)
      return PROGRESS_COLORS.purple;
    }
    return PROGRESS_COLORS.gray;
    ```
  - **New Logic**:
    ```javascript
    // Purple when host review is complete (proposal accepted or further along)
    if (normalizedStatus.includes('Accepted') ||
        normalizedStatus.includes('Drafting') ||
        normalizedStatus.includes('Lease Documents') ||
        normalizedStatus.includes('Payment') ||
        normalizedStatus.includes('activated')) {
      return PROGRESS_COLORS.purple;
    }
    // Gray for all other cases (including awaiting rental app)
    return PROGRESS_COLORS.gray;
    ```
  - **Reason**: Status "Proposal Submitted by guest - Awaiting Rental Application" has `usualOrder = 3`, causing Stage 3 to incorrectly show as completed
  - **Impact**: Stage 3 now correctly shows gray (not yet reached) when rental app is not submitted, and purple only when host has actually reviewed and accepted

## Database Changes
None

## Edge Function Changes
None

## Git Commits
1. `ad13215` - fix(ProposalCard): correct progress bar stage colors for rental app status

## Verification Steps Completed
- [x] Stage 2 logic now checks explicit status strings instead of usualOrder threshold
- [x] Stage 3 logic now checks explicit status strings instead of usualOrder threshold
- [x] Added 'Pending' and 'Pending Confirmation' statuses to Stage 2 green condition
- [x] Code compiles without errors
- [x] Changes committed to git

## Notes & Observations
- **Root Cause Understanding**: The `usualOrder` field in `proposalStatuses.js` is Bubble's sorting order for proposals list display, NOT an indicator of actual progress through the proposal workflow stages. Multiple statuses share the same `usualOrder` value (e.g., several statuses at usualOrder 3), making it unsuitable for stage completion logic.

- **Key Insight**: The status "Proposal Submitted by guest - Awaiting Rental Application" has:
  - `stage: 1` (correctly indicating Stage 1)
  - `usualOrder: 3` (sorting order, NOT stage indicator)

  The bug occurred because the code used `usualOrder` for stage completion checks.

- **Prevention Recommendation**: Consider adding unit tests for `getStageColor()` to verify each status returns the correct colors for each stage. For example:
  ```javascript
  test('awaiting rental app shows stage 2 as green, stage 3 as gray', () => {
    const status = 'Proposal Submitted by guest - Awaiting Rental Application';
    expect(getStageColor(0, status, 3, false, {})).toBe(PROGRESS_COLORS.purple);
    expect(getStageColor(1, status, 3, false, {})).toBe(PROGRESS_COLORS.green);
    expect(getStageColor(2, status, 3, false, {})).toBe(PROGRESS_COLORS.gray);
  });
  ```

- **Documentation Update**: Consider adding comments to `proposalStatuses.js` clarifying the difference between `stage` (visual progress stage 1-6) and `usualOrder` (Bubble sorting value).
