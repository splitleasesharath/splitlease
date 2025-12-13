# Implementation Plan: Add "Apply Filters" Button to Mobile Filters Menu

## Overview
Add an explicit "Apply Filters" button to the mobile filters menu on the search page to provide clear user feedback when filters are applied. Currently, filters are applied in real-time as users change selections, but mobile users have no visual confirmation that their selections have taken effect.

## Success Criteria
- [ ] "Apply Filters" button is visible at the bottom of the mobile filter panel
- [ ] Button is sticky/fixed at the bottom of the filter panel for easy access
- [ ] Clicking the button closes the filter panel and confirms filter application
- [ ] Button displays the current count of active filters (e.g., "Apply Filters (3)")
- [ ] Button is styled consistently with the Split Lease design system
- [ ] Button is only visible on mobile (hidden on desktop)

## Context & References

### Relevant Files
| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/pages/SearchPage.jsx` | Main search page component | Add "Apply Filters" button to mobile filter panel |
| `app/src/styles/components/search-page.css` | Search page CSS | Add styles for the apply button |
| `app/src/islands/pages/useSearchPageLogic.js` | Logic hook for search page | No changes needed (filters already reactive) |

### Related Documentation
- [SEARCH_QUICK_REFERENCE.md](.claude/Documentation/Pages/SEARCH_QUICK_REFERENCE.md) - Comprehensive search page documentation
- [app/src/islands/pages/CLAUDE.md] - Page component patterns
- [app/src/styles/components/CLAUDE.md] - Styling conventions

### Existing Patterns to Follow
- **Close Button Pattern**: The mobile filter panel already has a close button (`mobile-filter-close-btn`) styled as a circular button at the top-right
- **Primary Button Pattern**: Other CTA buttons use `background: #5b21b6` (purple) with white text
- **Filter Panel Structure**: Mobile filters are shown when `filterPanelActive` is `true` via the `inline-filters.active` class

## Implementation Steps

### Step 1: Add "Apply Filters" Button to SearchPage.jsx
**Files:** `app/src/islands/pages/SearchPage.jsx`
**Purpose:** Add the apply button inside the mobile filter panel

**Details:**
1. Locate the mobile filter panel section (around line 2342-2437)
2. Add a new button component after all the filter groups but before the closing `</div>` of `.inline-filters`
3. The button should:
   - Only render when `filterPanelActive` is true (mobile view)
   - Display filter count if any non-default filters are active
   - Call `setFilterPanelActive(false)` when clicked
4. Calculate active filter count based on non-default values:
   - `selectedNeighborhoods.length > 0`
   - `weekPattern !== 'every-week'`
   - `priceTier !== 'all'`
   - `sortBy !== 'recommended'`

**Code to add (around line 2436, before the closing `</div>` of inline-filters):**
```jsx
{/* Apply Filters Button - Mobile Only */}
{filterPanelActive && (
  <div className="mobile-filter-apply-container">
    <button
      className="mobile-filter-apply-btn"
      onClick={() => setFilterPanelActive(false)}
    >
      {(() => {
        // Calculate active filter count
        let count = 0;
        if (selectedNeighborhoods.length > 0) count++;
        if (weekPattern !== 'every-week') count++;
        if (priceTier !== 'all') count++;
        if (sortBy !== 'recommended') count++;
        return count > 0 ? `Apply Filters (${count})` : 'Apply Filters';
      })()}
    </button>
  </div>
)}
```

**Validation:**
- Open search page on mobile viewport (< 768px)
- Click "Filters" button to open filter panel
- Verify "Apply Filters" button appears at the bottom
- Click button to confirm it closes the panel

### Step 2: Add CSS Styles for Apply Button
**Files:** `app/src/styles/components/search-page.css`
**Purpose:** Style the apply button to be fixed at bottom of filter panel

**Details:**
1. Add styles for `.mobile-filter-apply-container` - sticky container at bottom
2. Add styles for `.mobile-filter-apply-btn` - primary CTA button styling
3. Ensure button is only visible on mobile (inside `@media (max-width: 768px)` block)
4. Add proper padding to prevent button from overlapping last filter

**CSS to add (inside the `@media (max-width: 768px)` block, after the existing `.inline-filters.active` styles around line 925):**
```css
/* Mobile Apply Filters Button Container */
.mobile-filter-apply-container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1rem;
  background: white;
  border-top: 1px solid #e5e7eb;
  z-index: 2002;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
}

/* Mobile Apply Filters Button */
.mobile-filter-apply-btn {
  width: 100%;
  padding: 1rem 1.5rem;
  background: #5b21b6;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mobile-filter-apply-btn:hover {
  background: #4c1d95;
}

.mobile-filter-apply-btn:active {
  background: #3b1578;
  transform: scale(0.98);
}

/* Add bottom padding to inline-filters to account for fixed apply button */
.inline-filters.active {
  padding-bottom: 6rem; /* Space for fixed apply button */
}
```

**Validation:**
- Inspect on mobile viewport
- Verify button is fixed at bottom of screen when filter panel is open
- Verify button has proper styling (purple background, white text, full width)
- Verify filters scroll without overlapping the button

### Step 3: Refine Button Text with Filter Count Logic
**Files:** `app/src/islands/pages/SearchPage.jsx`
**Purpose:** Extract filter count calculation into a computed value for cleaner code

**Details:**
1. Add a `useMemo` hook to calculate active filter count before the JSX return
2. Use the computed value in the button text
3. This keeps the JSX cleaner and calculation consistent

**Code to add (around line 885, after the UI state declarations):**
```jsx
// Calculate active filter count for mobile apply button
const activeFilterCount = useMemo(() => {
  let count = 0;
  if (selectedNeighborhoods.length > 0) count++;
  if (weekPattern !== 'every-week') count++;
  if (priceTier !== 'all') count++;
  if (sortBy !== 'recommended') count++;
  return count;
}, [selectedNeighborhoods, weekPattern, priceTier, sortBy]);
```

**Update button JSX to use computed value:**
```jsx
{filterPanelActive && (
  <div className="mobile-filter-apply-container">
    <button
      className="mobile-filter-apply-btn"
      onClick={() => setFilterPanelActive(false)}
    >
      {activeFilterCount > 0 ? `Apply Filters (${activeFilterCount})` : 'Apply Filters'}
    </button>
  </div>
)}
```

**Validation:**
- Change multiple filters (e.g., price tier, week pattern, neighborhoods)
- Verify button text updates to show correct count (e.g., "Apply Filters (3)")
- Reset all filters and verify button shows "Apply Filters" without count

## Edge Cases & Error Handling
- **No filters active**: Button displays "Apply Filters" without count
- **All filters active**: Button displays "Apply Filters (4)" (max count)
- **Filter panel scroll**: Bottom padding ensures last filter is not hidden behind button
- **Desktop view**: Button and container should not appear (CSS hides them)

## Testing Considerations
- Test on Chrome DevTools mobile viewport (iPhone 12 Pro, etc.)
- Test on actual mobile devices if possible
- Verify filter panel opens/closes correctly
- Verify filters are actually applied after clicking button (existing behavior should continue)
- Verify button count updates dynamically as filters change
- Verify desktop view is unaffected

## Rollback Strategy
- Revert the two files (SearchPage.jsx and search-page.css) to previous commit
- No database changes involved
- No Edge Function changes required

## Dependencies & Blockers
- None - this is a self-contained UI enhancement

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Button overlaps filter content | Low | Low | CSS padding adjustment handles this |
| z-index conflicts | Low | Medium | Use z-index 2002 (below close button at 2001) |
| Mobile-specific issues | Low | Low | Test on multiple viewport sizes |

---

## File References Summary

### Files to Modify
1. **`app/src/islands/pages/SearchPage.jsx`**
   - Full path: `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\SearchPage.jsx`
   - Add `activeFilterCount` useMemo calculation
   - Add "Apply Filters" button JSX inside the `.inline-filters` container

2. **`app/src/styles/components/search-page.css`**
   - Full path: `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\styles\components\search-page.css`
   - Add `.mobile-filter-apply-container` styles
   - Add `.mobile-filter-apply-btn` styles
   - Modify `.inline-filters.active` to add bottom padding

### Files Referenced (No Changes)
- `app/src/islands/pages/useSearchPageLogic.js` - Contains filter state management
- `.claude/Documentation/Pages/SEARCH_QUICK_REFERENCE.md` - Search page documentation

### Key Line Numbers (SearchPage.jsx)
- Filter panel state: Line 884 (`filterPanelActive`)
- Mobile filter bar: Line 2326-2332
- Inline filters container: Line 2342-2437
- Close button: Line 2344-2350

### Key Line Numbers (search-page.css)
- Mobile breakpoint starts: Line 762
- Inline filters active styles: Line 846-849
- Mobile filter close button: Line 871-922

---

**PLAN_VERSION**: 1.0
**CREATED**: 2025-12-13
**STATUS**: Ready for execution
