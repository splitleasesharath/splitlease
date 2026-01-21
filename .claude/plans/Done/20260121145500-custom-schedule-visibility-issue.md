# Custom Schedule Input Visibility Investigation

**Created**: 2026-01-21 14:55:00
**Status**: Analysis Complete - Ready for Execution
**Type**: DEBUG

## Issue Summary

User reports that the custom schedule submission feature on the view-split-lease page is "not there anymore" despite it being previously working. Investigation reveals the feature IS implemented but may be hidden due to conditional rendering.

## Root Cause Analysis

### Feature Implementation Status: ✅ PRESENT

The custom schedule input is fully implemented in both desktop and mobile views:

| Location | Lines | Status |
|----------|-------|--------|
| Desktop UI | 1924-1986 | ✅ Present |
| Mobile UI | 2825-2887 | ✅ Present |
| State management | Lines 161-163 | ✅ Present |
| Proposal integration | Lines 746-747 | ✅ Present |
| Edge Function | `proposal/actions/create.ts:439` | ✅ Present |

### Conditional Rendering Issues

Both desktop and mobile versions are wrapped in conditionals:

**Desktop** (line 1905):
```javascript
{!isMobile && scheduleSelectorListing && (
  // ... ListingScheduleSelector component
  // ... Custom schedule input
)}
```

**Mobile** (line 2806):
```javascript
{scheduleSelectorListing && (
  // ... ListingScheduleSelector component
  // ... Custom schedule input
)}
```

### Critical Dependency

`scheduleSelectorListing` is defined at line 506:
```javascript
const scheduleSelectorListing = useMemo(() => listing ? {
  // ... mapped listing data
} : null, [listing]);
```

**This means the custom schedule input will be hidden if:**
1. `listing` is null/undefined/falsy
2. On desktop: `isMobile` is true (mobile detection issue)

## Potential Regression Scenarios

1. **Listing data loading issue**: `listing` object not loading properly
2. **Mobile detection regression**: `isMobile` incorrectly detecting desktop as mobile
3. **Race condition**: Component rendering before `listing` data arrives
4. **Data structure change**: `listing` object missing required fields causing mapping to fail

## Git History Analysis Needed

Search for commits that:
1. Modified `ViewSplitLeasePage.jsx` around the conditional rendering logic
2. Changed mobile detection (`isMobile`) implementation
3. Modified listing data fetching/loading logic
4. Changed `scheduleSelectorListing` creation logic

## Reproduction Steps

1. Navigate to: `localhost:3000/view-split-lease/[LISTING_ID]?days-selected=0,1,2,6`
2. Open browser DevTools console
3. Check for:
   - Value of `listing` object (should not be null)
   - Value of `scheduleSelectorListing` (should not be null)
   - Value of `isMobile` (should be false on desktop)
4. Look for custom schedule link below the day selector grid

## Resolution Plan

### Phase 1: Verify Current State
1. Add console logging to track:
   - `listing` object when component mounts
   - `scheduleSelectorListing` computed value
   - `isMobile` detection result
2. Test on both desktop and mobile viewports
3. Check browser console for any errors during listing data fetch

### Phase 2: Git Archaeology
1. Search git history for changes to conditional rendering around custom schedule
2. Identify commit that may have introduced the regression
3. Compare working vs broken implementation

### Phase 3: Fix Implementation
Based on findings, implement one of:

**Option A**: If `scheduleSelectorListing` is the issue
- Decouple custom schedule input from `scheduleSelectorListing` dependency
- Move custom schedule section outside the conditional or create separate conditional

**Option B**: If mobile detection is the issue
- Fix `isMobile` detection logic
- Ensure desktop view always shows the feature

**Option C**: If listing data loading is the issue
- Fix data fetching/loading logic
- Add proper loading states

### Phase 4: Restore Visibility

Proposed change to decouple custom schedule from schedule selector:

**Current structure**:
```javascript
{!isMobile && scheduleSelectorListing && (
  <div>
    <ListingScheduleSelector ... />
    {/* Custom schedule input HERE */}
  </div>
)}
```

**Proposed structure**:
```javascript
{!isMobile && scheduleSelectorListing && (
  <div>
    <ListingScheduleSelector ... />
  </div>
)}

{/* Custom schedule input - always visible when listing exists */}
{!isMobile && listing && (
  <div>
    {/* Custom schedule input */}
  </div>
)}
```

This ensures custom schedule input is visible even if `scheduleSelectorListing` has issues.

## Testing Checklist

- [ ] Desktop view shows custom schedule link below day selector
- [ ] Mobile view shows custom schedule link below day selector
- [ ] Clicking link expands textarea
- [ ] Textarea accepts input
- [ ] Proposal submission includes `customScheduleDescription` in payload
- [ ] Edge Function saves `custom_schedule_description` to database
- [ ] No console errors during listing load
- [ ] Feature works on both development and production environments

## Files to Modify

1. `app/src/islands/pages/ViewSplitLeasePage/ViewSplitLeasePage.jsx`
   - Lines 1905-1986 (desktop custom schedule section)
   - Lines 2806-2888 (mobile custom schedule section)
   - Consider decoupling from `scheduleSelectorListing` conditional

## Risk Assessment

**Risk Level**: LOW
**Impact**: HIGH (restores user-requested feature)
**Reversibility**: HIGH (simple conditional logic change)

## References

- Original implementation: Lines 1924-1986 (desktop), 2825-2887 (mobile)
- State variables: Lines 161-163
- Proposal integration: Lines 746-747
- Edge Function: `supabase/functions/proposal/actions/create.ts:439`
- Database column: `proposal.custom_schedule_description`

---

## Next Steps

1. ✅ Analysis complete - this document
2. ⏳ Execute debugging investigation (add console logs)
3. ⏳ Review git history for regression point
4. ⏳ Implement fix to restore visibility
5. ⏳ Test on both desktop and mobile
6. ⏳ Commit changes

**Priority**: HIGH - User-reported regression affecting core booking functionality
