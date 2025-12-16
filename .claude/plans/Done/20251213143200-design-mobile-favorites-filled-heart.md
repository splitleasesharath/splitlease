# Design Implementation Plan: Mobile Favorites Filled Heart Icon

## 1. Overview

- **Description**: Update the mobile favorites icon in the SearchPage header to display a filled heart instead of an outline heart, and remove the favorites count badge for a cleaner mobile look
- **User's Vision**: Replace the current outline/stroke heart with a filled purple heart, remove the numeric badge showing favorites count, keep only the heart icon for visual simplicity on mobile
- **Scope Boundaries**:
  - IS included: Mobile favorites link styling changes in MobileFilterBar component
  - IS included: CSS updates for mobile favorites link
  - IS NOT included: Desktop favorites styling (should remain unchanged)
  - IS NOT included: Any functionality changes to favorites feature

## 2. Reference Analysis

### Current Implementation (Lines 109-125 of SearchPage.jsx)
```jsx
<a href="/favorite-listings" className="mobile-favorites-link" aria-label="My Favorite Listings">
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"              // Currently no fill - outline only
    stroke="currentColor"    // Uses stroke for outline
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
  {favoritesCount > 0 && (
    <span className="mobile-favorites-badge">{favoritesCount}</span>
  )}
</a>
```

### Current CSS (Lines 806-853 of search-page.css)
```css
.mobile-favorites-link {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #f3e8ff;        // Light purple background
  color: #5b21b6;             // Purple color
  text-decoration: none;
  transition: all 0.2s ease;
}

.mobile-favorites-link svg {
  stroke: #5b21b6;           // Purple stroke
  fill: none;                // No fill - outline only
  transition: fill 0.2s ease;
}

.mobile-favorites-link:hover svg {
  fill: rgba(91, 33, 182, 0.15);  // Light fill on hover
}

.mobile-favorites-badge {
  position: absolute;
  top: -3px;
  right: -3px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #5b21b6;
  color: white;
  font-size: 10px;
  font-weight: 600;
  border-radius: 8px;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
```

### Key Visual Characteristics Identified
- [FROM REFERENCE] Heart icon currently uses stroke-only rendering (outline)
- [FROM REFERENCE] Container has light purple background (#f3e8ff) with purple icon (#5b21b6)
- [FROM REFERENCE] Badge positioned at top-right corner, showing when count > 0
- [FROM CODEBASE] Theme purple color is #5b21b6 (used consistently throughout)
- [FROM CODEBASE] Desktop favorites link (`.favorites-link`) has different styling and should not be affected

## 3. Existing Codebase Integration

### Relevant Existing Components
- **SearchPage.jsx**: Contains MobileFilterBar component with the mobile favorites link (lines 109-125)
- **search-page.css**: Contains `.mobile-favorites-link` and `.mobile-favorites-badge` styles (lines 806-853)

### Existing Styling Patterns to Follow
- Theme purple: #5b21b6 (used for buttons, badges, accents)
- Light purple background: #f3e8ff (used for highlighted/active states)
- Transition timing: `all 0.2s ease` (consistent across mobile interactions)
- Border-radius for circular elements: 50%
- Icon sizes in mobile header: 22px x 22px

### Files That Will Be Affected
1. `app/src/islands/pages/SearchPage.jsx` - JSX changes to SVG attributes and removal of badge
2. `app/src/styles/components/search-page.css` - CSS updates for filled heart styling

### Utilities and Helpers Available
- No additional utilities needed - this is a pure styling change

## 4. Component Specifications

### Mobile Favorites Link (Updated)

**Purpose**: Provide a visual link to the favorites page in the mobile header

**Visual Specifications**:

| Property | Current Value | New Value |
|----------|---------------|-----------|
| SVG fill | `none` | `#5b21b6` (theme purple) |
| SVG stroke | `currentColor` (#5b21b6) | `none` (remove stroke) |
| SVG strokeWidth | `2` | Remove attribute |
| SVG strokeLinecap | `round` | Remove attribute |
| SVG strokeLinejoin | `round` | Remove attribute |
| Badge | Rendered when count > 0 | Remove entirely |

**CSS Changes**:

| Selector | Property | Current Value | New Value |
|----------|----------|---------------|-----------|
| `.mobile-favorites-link svg` | fill | `none` | `#5b21b6` |
| `.mobile-favorites-link svg` | stroke | `#5b21b6` | `none` |
| `.mobile-favorites-link:hover svg` | fill | `rgba(91, 33, 182, 0.15)` | `#4c1d95` (darker purple on hover) |
| `.mobile-favorites-badge` | - | - | Remove entire rule block |

**Props/Variants**:
- Default state: Filled purple heart
- Hover state: Darker purple fill (#4c1d95)
- Active/tap state: Slight scale (0.95) + darker fill (inherited from existing)

**Accessibility**:
- Keep existing `aria-label="My Favorite Listings"`
- Heart icon remains visually recognizable as favorites indicator
- Color contrast meets WCAG AA (purple on light purple background)

## 5. Layout & Composition

**No changes to layout** - The heart icon remains in the same position within `.mobile-header-actions`

**Responsive Behavior**:
- These changes apply ONLY within the `@media (max-width: 768px)` media query
- Desktop favorites link (`.favorites-link` in `.map-header-actions`) remains unchanged

## 6. Interactions & Animations

**Existing Interactions (Keep)**:
- Tap/click navigates to `/favorite-listings`
- `transition: all 0.2s ease` on container

**Updated Hover State**:
- Heart fill color transitions from `#5b21b6` to `#4c1d95` (darker purple)
- Duration: 0.2s (matches existing transition)
- Easing: ease

**Existing Scale Effect (Keep)**:
- `.mobile-favorites-link:hover` has `transform: scale(1.05)` - keep this

## 7. Assets Required

**No new assets required** - Using the existing SVG path, just changing fill/stroke attributes

## 8. Implementation Sequence

### Step 1: Update SearchPage.jsx SVG Attributes
**File**: `app/src/islands/pages/SearchPage.jsx`
**Lines**: 109-125

Change from:
```jsx
<svg
  width="22"
  height="22"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="2"
  strokeLinecap="round"
  strokeLinejoin="round"
>
```

Change to:
```jsx
<svg
  width="22"
  height="22"
  viewBox="0 0 24 24"
  fill="#5b21b6"
  stroke="none"
>
```

### Step 2: Remove Badge JSX
**File**: `app/src/islands/pages/SearchPage.jsx`
**Lines**: 122-124

Remove:
```jsx
{favoritesCount > 0 && (
  <span className="mobile-favorites-badge">{favoritesCount}</span>
)}
```

### Step 3: Update CSS for Mobile Favorites Link
**File**: `app/src/styles/components/search-page.css`
**Lines**: 825-833 (within `@media (max-width: 768px)` block)

Change from:
```css
.mobile-favorites-link svg {
  stroke: #5b21b6;
  fill: none;
  transition: fill 0.2s ease;
}

.mobile-favorites-link:hover svg {
  fill: rgba(91, 33, 182, 0.15);
}
```

Change to:
```css
.mobile-favorites-link svg {
  fill: #5b21b6;
  stroke: none;
  transition: fill 0.2s ease;
}

.mobile-favorites-link:hover svg {
  fill: #4c1d95;
}
```

### Step 4: Remove Mobile Favorites Badge CSS
**File**: `app/src/styles/components/search-page.css`
**Lines**: 835-853 (within `@media (max-width: 768px)` block)

Remove the entire `.mobile-favorites-badge` rule block:
```css
/* Remove this entire block */
.mobile-favorites-badge {
  position: absolute;
  top: -3px;
  right: -3px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #5b21b6;
  color: white;
  font-size: 10px;
  font-weight: 600;
  border-radius: 8px;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
```

## 9. Assumptions & Clarifications Needed

### Assumptions Made
- [SUGGESTED] Using `#4c1d95` for hover state (darker variant of theme purple) - this matches the hover color used elsewhere in the codebase (e.g., `.mobile-signin-btn:hover`)
- [SUGGESTED] Keeping the existing scale effect on hover (1.05) for consistency with current behavior
- [FROM CODEBASE] Desktop favorites link styling should remain completely unchanged

### No Clarifications Needed
- The user's request is clear: filled heart, no badge, purple color matching theme

---

## Files Referenced

| File | Path | Lines Affected |
|------|------|----------------|
| SearchPage.jsx | `app/src/islands/pages/SearchPage.jsx` | 109-125 |
| search-page.css | `app/src/styles/components/search-page.css` | 825-853 |

---

**Plan Status**: Ready for execution
**Estimated Changes**: 2 files, ~25 lines modified/removed
**Risk Level**: Low (isolated mobile-only styling change)
