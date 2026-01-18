# Implementation Plan: Search Page Compact Header Expand Button

## Overview

Add an expand button to the compressed header on the search results page that allows users to re-open the filter section without scrolling back to the top. When the desktop header collapses (showing the compact indicator), users will have a clear, accessible button to expand the filters again.

## Success Criteria

- [ ] Expand button is visible in the compact header indicator
- [ ] Clicking the button sets `desktopHeaderCollapsed` to `false`
- [ ] Filter section smoothly re-expands when button is clicked
- [ ] Button has clear visual affordance (chevron/expand icon)
- [ ] Button is accessible (proper aria labels, keyboard navigable)
- [ ] Button styling integrates seamlessly with existing compact indicator design

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/pages/SearchPage.jsx` | Main search page component with compact indicator | Add expand button with click handler |
| `app/src/styles/components/search-page.css` | Compact indicator styles | Add expand button styles |

### Related Documentation

- [app/src/islands/pages/CLAUDE.md](c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\islands\pages\CLAUDE.md) - Page component patterns
- [app/src/CLAUDE.md](c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\CLAUDE.md) - Source directory overview

### Existing Patterns to Follow

- **Compact Filter Button Pattern**: The existing `.desktop-compact-filter-btn` (lines 238-261 of CSS) shows how buttons should be styled in this context - white background, subtle border, hover states, 6px/12px padding
- **SVG Icon Pattern**: Existing filter button uses inline SVG with 14x14px dimensions and currentColor for stroke
- **Flexbox Layout**: The compact indicator uses `display: flex` with `gap: 16px` and `align-items: center`
- **Auto-margin Pattern**: The filter button uses `margin-left: auto` to push itself to the right - the expand button should be positioned similarly

## Implementation Steps

### Step 1: Add Expand Button to Compact Header (SearchPage.jsx)

**Files:** `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\islands\pages\SearchPage.jsx`

**Purpose:** Add a clickable expand button that sets `desktopHeaderCollapsed` to `false`

**Details:**

1. Locate the `desktop-compact-indicator` div (lines 2270-2303)
2. Add an expand button at the end of the indicator, before the closing `</div>`
3. The button should:
   - Use a chevron-down or expand icon (suggests "show more")
   - Call `setDesktopHeaderCollapsed(false)` on click
   - Include proper aria-label for accessibility
   - Use the class `.desktop-compact-expand-btn`

**Code Change Location:** Lines 2300-2303 (after the filter button div, before closing `</div>`)

**New Code to Insert:**

```jsx
{/* Expand Button - Always visible in compact mode */}
<div className="desktop-compact-expand">
  <button
    className="desktop-compact-expand-btn"
    onClick={() => setDesktopHeaderCollapsed(false)}
    aria-label="Expand filter section"
    title="Show filters"
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  </button>
</div>
```

**Validation:**
- Dev server running at localhost:8000
- Navigate to /search
- Scroll down to collapse header
- Verify expand button appears
- Click button and verify filter section expands

### Step 2: Add Expand Button Styles (search-page.css)

**Files:** `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\styles\components\search-page.css`

**Purpose:** Style the expand button to match the existing compact indicator design

**Details:**

1. Add styles after the existing `.desktop-compact-filter-btn` styles (after line 261)
2. Position the expand button at the far right of the compact indicator
3. Match the visual style of the filter button for consistency
4. Add hover and focus states for accessibility

**New CSS to Add (after line 261, before line 263):**

```css
/* Desktop compact expand button - reopens filter section */
.desktop-compact-expand {
  margin-left: auto;
}

.desktop-compact-expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: white;
  transition: all 0.2s ease;
}

.desktop-compact-expand-btn:hover {
  background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
}

.desktop-compact-expand-btn:focus {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
}

.desktop-compact-expand-btn svg {
  width: 16px;
  height: 16px;
}
```

**Validation:**
- Check styling matches the overall design language
- Verify hover state works smoothly
- Test keyboard focus (Tab navigation)

### Step 3: Adjust Layout for Proper Button Positioning

**Files:** `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\styles\components\search-page.css`

**Purpose:** Ensure the expand button and filter button are properly positioned when both are present

**Details:**

1. The current `.desktop-compact-filters` has `margin-left: auto` which pushes it to the right
2. We need to ensure both buttons coexist properly - the filter button should NOT have `margin-left: auto` when expand button exists
3. Update the layout so expand button is always at the far right, filter button (if present) is beside it

**CSS Modification:** Update `.desktop-compact-filters` (line 234-236)

**Change from:**
```css
.desktop-compact-filters {
  margin-left: auto;
}
```

**Change to:**
```css
.desktop-compact-filters {
  /* No margin-left: auto - let expand button handle right alignment */
}
```

**Validation:**
- Test with active filters (filter button visible)
- Test without active filters (filter button hidden)
- Verify expand button always appears at far right

## Edge Cases & Error Handling

- **No Edge Cases for Click Handler**: Setting `desktopHeaderCollapsed` to `false` is a simple state change with no error conditions
- **CSS Transitions**: The existing transition on `.filter-section--collapsed` handles the smooth expansion animation
- **Mobile Viewport**: The compact indicator is hidden on mobile (media query at line 295-297), so this button will only appear on desktop

## Testing Considerations

1. **Visual Testing:**
   - Verify button appears when header collapses
   - Verify button disappears when header expands
   - Check button positioning with 0, 1, 2+ active filter tags

2. **Interaction Testing:**
   - Click expand button - filter section should re-appear
   - After expanding, scroll down again - header should collapse again
   - Test keyboard navigation (Tab to button, Enter to activate)

3. **Browser Testing:**
   - Test in Chrome, Firefox, Safari
   - Test at various viewport widths above 768px

## Rollback Strategy

If issues arise, revert two changes:
1. Remove the expand button JSX from SearchPage.jsx (lines ~2300-2308)
2. Remove the CSS styles added after line 261 in search-page.css
3. Restore `margin-left: auto` to `.desktop-compact-filters`

## Dependencies & Blockers

- None - this is a self-contained UI enhancement

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Button styling conflicts with existing styles | Low | Low | Following established patterns from filter button |
| Click handler doesn't work | Very Low | Low | Simple state setter, well-tested pattern |
| Layout breaks with both buttons | Low | Medium | Test all filter tag count scenarios |

---

## Files Referenced

| File Path | Lines | Purpose |
|-----------|-------|---------|
| `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\islands\pages\SearchPage.jsx` | 2270-2303, 591-642 | Compact indicator JSX, scroll handler logic |
| `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\styles\components\search-page.css` | 156-271, 295-321 | Compact indicator styles, mobile media query |
| `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\islands\pages\CLAUDE.md` | - | Page component documentation |
| `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\CLAUDE.md` | - | Source directory documentation |

---

**Plan Created:** 2026-01-17 14:35:00
**Status:** Ready for Implementation
