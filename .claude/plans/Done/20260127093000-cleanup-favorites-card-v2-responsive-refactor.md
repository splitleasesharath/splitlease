# FavoritesCardV2 Responsive Refactor & Technical Debt Cleanup

**Plan ID**: 20260127093000
**Type**: CLEANUP
**Status**: Ready for Execution
**Created**: 2026-01-27

---

## 1. Executive Summary

### What is being cleaned up
Refactoring the `FavoritesCardV2` component and `FavoriteListingsPage.css` to improve mobile responsiveness, remove legacy V1 technical debt, and optimize render performance.

### Why
1. **Orphaned V1 code**: `FavoritesCard.jsx` and `FavoritesCard.css` are completely unused but still exist in the codebase
2. **CSS !important pollution**: The page CSS contains 11 `!important` declarations that were only needed to override V1 style conflicts
3. **Fixed inline styles**: `FavoritesCardV2` uses hardcoded pixel values (240px, 24px, 18px, 22px) that don't adapt to mobile viewports
4. **Missing React.memo**: With 21 useState hooks in the parent page, every state change re-renders all cards
5. **Touch accessibility**: Action buttons don't meet 44px minimum touch target requirement
6. **Desktop hover effects on mobile**: Hover animations trigger incorrectly on touch devices

### Expected outcomes
- Clean codebase with no orphaned V1 files
- CSS without `!important` overrides (proper specificity)
- Responsive card component adapting to 3 breakpoints (desktop > 768px, mobile <= 768px, small mobile <= 480px)
- Memoized card component preventing unnecessary re-renders
- Touch-friendly buttons meeting WCAG accessibility guidelines
- Proper touch device detection to disable hover effects

---

## 2. Current State Analysis

### File Inventory

| File | Path | Status | Size |
|------|------|--------|------|
| FavoritesCardV2.jsx | `app/src/islands/pages/FavoriteListingsPage/components/FavoritesCardV2.jsx` | MODIFY | 466 lines |
| FavoriteListingsPage.css | `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.css` | MODIFY | 717 lines |
| FavoritesCard.jsx | `app/src/islands/pages/FavoriteListingsPage/components/FavoritesCard.jsx` | DELETE | 272 lines |
| FavoritesCard.css | `app/src/islands/pages/FavoriteListingsPage/components/FavoritesCard.css` | DELETE | 298 lines |
| useDeviceDetection.js | `app/src/hooks/useDeviceDetection.js` | MODIFY | 153 lines |

### Orphaned V1 Files Verification

Grep search for `FavoritesCard[^V]` (excluding FavoritesCardV2) found **zero imports** in any JavaScript/JSX file:
- `FavoritesCard.jsx` is never imported
- `FavoritesCard.css` is only imported by its own component file
- The parent page `FavoriteListingsPage.jsx` uses only `FavoritesCardV2` (line 19)

```javascript
// Line 19 in FavoriteListingsPage.jsx
import FavoritesCardV2 from './components/FavoritesCardV2.jsx';
```

### CSS !important Declarations (Current Problem)

Found in `FavoriteListingsPage.css`:

| Line | Declaration | Purpose (original) |
|------|-------------|-------------------|
| 64 | `padding-top: 0 !important;` | Override global .favorites-page padding |
| 146 | `display: grid !important;` | Force two-column layout |
| 147 | `grid-template-columns: 1fr 400px !important;` | Force map width |
| 148 | `gap: 24px !important;` | Force layout gap |
| 163 | `width: 400px !important;` | Force map column width |
| 167 | `margin-top: 70px !important;` | Align map with first card |
| 179 | `padding: 0 !important;` | Reset card wrapper padding |
| 180 | `margin: 0 !important;` | Reset card wrapper margin |
| 181 | `box-shadow: none !important;` | Remove conflicting shadow |
| 182 | `border-radius: 24px !important;` | Force card radius |
| 183 | `background: transparent !important;` | Transparent wrapper |
| 459 | `grid-template-columns: 1fr !important;` | Single column on tablet |

All these `!important` declarations were added to protect against V1 `FavoritesCard.css` style conflicts. With V1 deleted, they become unnecessary.

### FavoritesCardV2 Inline Style Analysis

The component uses 100% inline styles with fixed pixel values:

```javascript
// Line 194 - Card container reset
card: {
  all: 'unset', // RESET EVERYTHING
  ...
}

// Line 212 - Image section (FIXED)
imageSection: {
  height: isGrid ? '240px' : 'auto',  // <- Fixed, not responsive
  width: isGrid ? '100%' : '280px',
  minWidth: isGrid ? 'auto' : '280px',
}

// Line 261 - Card content padding (FIXED)
cardContent: {
  padding: '24px',  // <- Fixed, not responsive
  ...
}

// Line 275-277 - Typography (FIXED)
cardTitle: {
  fontSize: '18px',  // <- Fixed, not responsive
  ...
}

// Line 344-347 - Price value (FIXED)
priceValue: {
  fontSize: '22px',  // <- Fixed, not responsive
  ...
}

// Line 354-362 - Action button (UNDERSIZED)
actionBtn: {
  padding: '12px 24px',  // <- Only 36px height, needs 44px
  ...
}
```

### Parent Page Hook Count

`FavoriteListingsPage.jsx` has **21 useState hooks** (lines 193-260):
- listings, viewMode, isLoading, error, userId
- isLoggedIn, currentUser, favoritedListingIds
- proposalsByListingId, isContactModalOpen, isInfoModalOpen
- selectedListing, infoModalTriggerRef, isProposalModalOpen
- selectedListingForProposal, zatConfig, moveInDate, selectedDayObjects
- reservationSpan, priceBreakdown, pendingProposalData, etc.

Any state change causes all `FavoritesCardV2` instances to re-render without memoization.

### Touch Target Analysis

The action button style (lines 354-362):
```javascript
actionBtn: {
  padding: '12px 24px',
  borderRadius: '12px',
  fontSize: '14px',
  fontWeight: 700,
  ...
}
```

With `fontSize: 14px` and `padding: 12px 24px`:
- Approximate height: 14px (font) + 12px * 2 (padding) = **38px** (below 44px minimum)

### Existing Device Detection Hook

`app/src/hooks/useDeviceDetection.js` already provides:
- `useIsMobile()` - viewport <= 768px
- `useIsDesktop()` - viewport > 768px
- `useIsTablet()` - viewport 769px-1024px
- `useDeviceDetection()` - all values combined
- Constants: `MOBILE_BREAKPOINT = 768`, `TABLET_BREAKPOINT = 1024`

**Missing**: Small mobile breakpoint (480px) for compact styling.

---

## 3. Target State Definition

### Desired End State

1. **No V1 files exist** - Complete removal of orphaned components
2. **CSS uses natural specificity** - Zero `!important` declarations
3. **Responsive FavoritesCardV2** - Adapts to 3 breakpoints with proper mobile styles
4. **Memoized component** - Wrapped in `React.memo` to prevent re-renders
5. **Touch-accessible buttons** - All interactive elements >= 44px touch target
6. **Touch-aware hover states** - No hover animations on touch devices

### Target Breakpoints

| Breakpoint | Viewport | Image Height | Content Padding | Title Font | Price Font | Button Padding |
|------------|----------|--------------|-----------------|------------|------------|----------------|
| Desktop | > 768px | 240px | 24px | 18px | 22px | 14px 28px |
| Mobile | <= 768px | 180px | 16px | 16px | 20px | 14px 24px |
| Small Mobile | <= 480px | 160px | 12px | 15px | 18px | 12px 20px |

### Button Touch Target Verification

With padding increase:
- Desktop: 14px * 2 + 14px font = **42px** minimum + line-height = ~46px (OK)
- Mobile: 14px * 2 + 14px font = **42px** minimum + line-height = ~46px (OK)
- Small: 12px * 2 + 14px font = **38px** + line-height = ~42px (NEEDS min-height)

**Solution**: Add `minHeight: '44px'` to all button styles.

### Success Criteria

1. [ ] `FavoritesCard.jsx` and `FavoritesCard.css` deleted from codebase
2. [ ] `FavoriteListingsPage.css` has zero `!important` declarations
3. [ ] `FavoritesCardV2` uses `useDeviceDetection` hook for responsive styles
4. [ ] `FavoritesCardV2` wrapped in `React.memo` with proper comparison
5. [ ] All buttons have `minHeight: '44px'` for touch accessibility
6. [ ] Hover effects check for touch device before applying
7. [ ] No visual regressions on desktop (maintain exact appearance)

---

## 4. File-by-File Action Plan

### File 1: FavoritesCard.jsx (DELETE)

**Path**: `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL21\Split Lease\app\src\islands\pages\FavoriteListingsPage\components\FavoritesCard.jsx`

**Current State**: 272-line component never imported by any file

**Required Changes**: Delete entire file

**Dependencies**: None (orphaned)

**Verification**:
1. Run: `grep -r "FavoritesCard[^V]" app/src --include="*.jsx" --include="*.js"`
2. Expected result: No matches (already confirmed)

---

### File 2: FavoritesCard.css (DELETE)

**Path**: `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL21\Split Lease\app\src\islands\pages\FavoriteListingsPage\components\FavoritesCard.css`

**Current State**: 298-line CSS file only imported by deleted FavoritesCard.jsx

**Required Changes**: Delete entire file

**Dependencies**: Only FavoritesCard.jsx (being deleted)

**Verification**:
1. Run: `grep -r "FavoritesCard.css" app/src --include="*.jsx" --include="*.js" --include="*.css"`
2. Expected: Only match in FavoritesCard.jsx (being deleted)

---

### File 3: useDeviceDetection.js (MODIFY)

**Path**: `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL21\Split Lease\app\src\hooks\useDeviceDetection.js`

**Current State**: Provides mobile (768px) and tablet (1024px) breakpoints

**Required Changes**:
1. Add `SMALL_MOBILE_BREAKPOINT = 480` constant
2. Add `useIsSmallMobile()` hook
3. Add `isTouchDevice` detection to `useDeviceDetection()` return value
4. Export new constants and hooks

**Code Reference (additions)**:

After line 28 (after TABLET_BREAKPOINT):
```javascript
// Small mobile breakpoint for compact styling
const SMALL_MOBILE_BREAKPOINT = 480;
```

After line 111 (after useIsTablet):
```javascript
/**
 * Hook to detect if current viewport is small mobile-sized
 * @returns {boolean} True if viewport width <= 480px
 */
export function useIsSmallMobile() {
  const [isSmallMobile, setIsSmallMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= SMALL_MOBILE_BREAKPOINT;
  });

  useEffect(() => {
    const checkSmallMobile = () => {
      setIsSmallMobile(window.innerWidth <= SMALL_MOBILE_BREAKPOINT);
    };

    checkSmallMobile();
    window.addEventListener('resize', checkSmallMobile);

    return () => window.removeEventListener('resize', checkSmallMobile);
  }, []);

  return isSmallMobile;
}

/**
 * Hook to detect if device has touch capability
 * @returns {boolean} True if device supports touch
 */
export function useIsTouchDevice() {
  const [isTouchDevice, setIsTouchDevice] = useState(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  });

  useEffect(() => {
    // Re-check on mount in case SSR value was wrong
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  return isTouchDevice;
}
```

Update `useDeviceDetection()` function (around line 134):
```javascript
export function useDeviceDetection() {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();
  const isSmallMobile = useIsSmallMobile();
  const isTouchDevice = useIsTouchDevice();

  return {
    isMobile,
    isTablet,
    isDesktop,
    isSmallMobile,
    isTouchDevice,
    deviceType: isMobile ? (isSmallMobile ? 'small-mobile' : 'mobile') : isTablet ? 'tablet' : 'desktop',
    breakpoints: {
      mobile: MOBILE_BREAKPOINT,
      tablet: TABLET_BREAKPOINT,
      smallMobile: SMALL_MOBILE_BREAKPOINT
    }
  };
}
```

Update exports at end of file:
```javascript
export { MOBILE_BREAKPOINT, TABLET_BREAKPOINT, SMALL_MOBILE_BREAKPOINT };
```

**Dependencies**: None

**Verification**:
1. Import hook in test component, verify all values returned
2. Resize browser, confirm breakpoint detection works

---

### File 4: FavoritesCardV2.jsx (MODIFY - Major)

**Path**: `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL21\Split Lease\app\src\islands\pages\FavoriteListingsPage\components\FavoritesCardV2.jsx`

**Current State**: 466-line component with fixed inline styles, no memoization

**Required Changes**:

#### Change 4.1: Add React.memo wrapper and imports

**Location**: Line 1-8 (imports) and line 465 (export)

**Before**:
```javascript
import { useState, useRef, useEffect } from 'react';
```

**After**:
```javascript
import { useState, useRef, useEffect, memo } from 'react';
import { useDeviceDetection } from '../../../../hooks/useDeviceDetection.js';
```

**Before** (line 465):
```javascript
export default FavoritesCardV2;
```

**After**:
```javascript
export default memo(FavoritesCardV2, (prevProps, nextProps) => {
  // Custom comparison - only re-render if these props change
  return (
    prevProps.listing?.id === nextProps.listing?.id &&
    prevProps.proposalForListing?._id === nextProps.proposalForListing?._id &&
    prevProps.viewMode === nextProps.viewMode &&
    prevProps.userId === nextProps.userId
  );
});
```

#### Change 4.2: Add responsive hook usage

**Location**: After line 158 (after `const isNewListing = listing.isNew;`)

**Add**:
```javascript
  // Responsive design hook
  const { isMobile, isSmallMobile, isTouchDevice } = useDeviceDetection();
```

#### Change 4.3: Update hover state logic

**Location**: Lines 379-380 (onMouseEnter/onMouseLeave)

**Before**:
```javascript
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
```

**After**:
```javascript
      onMouseEnter={() => !isTouchDevice && setIsHovered(true)}
      onMouseLeave={() => !isTouchDevice && setIsHovered(false)}
```

#### Change 4.4: Update imageSection style (responsive height)

**Location**: Lines 210-216

**Before**:
```javascript
    imageSection: {
      position: 'relative',
      height: isGrid ? '240px' : 'auto',
      width: isGrid ? '100%' : '280px',
      minWidth: isGrid ? 'auto' : '280px',
      overflow: 'hidden',
    },
```

**After**:
```javascript
    imageSection: {
      position: 'relative',
      height: isGrid
        ? (isSmallMobile ? '160px' : isMobile ? '180px' : '240px')
        : 'auto',
      width: isGrid ? '100%' : (isMobile ? '200px' : '280px'),
      minWidth: isGrid ? 'auto' : (isMobile ? '200px' : '280px'),
      overflow: 'hidden',
    },
```

#### Change 4.5: Update cardContent style (responsive padding)

**Location**: Lines 260-266

**Before**:
```javascript
    cardContent: {
      padding: '24px',
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    },
```

**After**:
```javascript
    cardContent: {
      padding: isSmallMobile ? '12px' : isMobile ? '16px' : '24px',
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: isSmallMobile ? '8px' : isMobile ? '10px' : '12px',
    },
```

#### Change 4.6: Update cardTitle style (responsive font)

**Location**: Lines 275-281

**Before**:
```javascript
    cardTitle: {
      fontSize: '18px',
      fontWeight: 700,
      color: '#0F172A',
      margin: 0,
      lineHeight: 1.4,
    },
```

**After**:
```javascript
    cardTitle: {
      fontSize: isSmallMobile ? '15px' : isMobile ? '16px' : '18px',
      fontWeight: 700,
      color: '#0F172A',
      margin: 0,
      lineHeight: 1.4,
    },
```

#### Change 4.7: Update cardLocation style (responsive font)

**Location**: Lines 267-274

**Before**:
```javascript
    cardLocation: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '13px',
      color: '#6366F1',
      fontWeight: 600,
    },
```

**After**:
```javascript
    cardLocation: {
      display: 'flex',
      alignItems: 'center',
      gap: isMobile ? '4px' : '6px',
      fontSize: isSmallMobile ? '11px' : isMobile ? '12px' : '13px',
      color: '#6366F1',
      fontWeight: 600,
    },
```

#### Change 4.8: Update priceValue style (responsive font)

**Location**: Lines 344-348

**Before**:
```javascript
    priceValue: {
      fontSize: '22px',
      fontWeight: 800,
      color: '#0F172A',
    },
```

**After**:
```javascript
    priceValue: {
      fontSize: isSmallMobile ? '18px' : isMobile ? '20px' : '22px',
      fontWeight: 800,
      color: '#0F172A',
    },
```

#### Change 4.9: Update actionBtn style (touch target + responsive)

**Location**: Lines 354-362

**Before**:
```javascript
    actionBtn: {
      padding: '12px 24px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: 700,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      border: 'none',
    },
```

**After**:
```javascript
    actionBtn: {
      padding: isSmallMobile ? '12px 20px' : isMobile ? '14px 24px' : '14px 28px',
      minHeight: '44px', // Touch target accessibility
      borderRadius: isSmallMobile ? '10px' : '12px',
      fontSize: isSmallMobile ? '13px' : '14px',
      fontWeight: 700,
      cursor: 'pointer',
      transition: isTouchDevice ? 'none' : 'all 0.2s ease',
      border: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
```

#### Change 4.10: Update card transition (touch-aware)

**Location**: Lines 192-209 (card style object)

**Before**:
```javascript
    card: {
      all: 'unset', // RESET EVERYTHING
      display: isGrid ? 'block' : 'flex',
      background: 'white',
      borderRadius: '24px',
      overflow: 'hidden',
      boxShadow: isHovered ? '0 20px 40px rgba(0,0,0,0.08)' : '0 4px 12px rgba(0,0,0,0.03)',
      transition: 'all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)',
      cursor: 'pointer',
      flexDirection: isGrid ? 'column' : 'row',
      transform: isHovered ? 'translateY(-8px)' : 'none',
      fontFamily: "'Inter', sans-serif",
      border: '1px solid #D1D5DB',
      padding: 0,
      margin: 0,
      boxSizing: 'border-box',
    },
```

**After**:
```javascript
    card: {
      all: 'unset', // RESET EVERYTHING
      display: isGrid ? 'block' : 'flex',
      background: 'white',
      borderRadius: isSmallMobile ? '16px' : isMobile ? '20px' : '24px',
      overflow: 'hidden',
      boxShadow: (isHovered && !isTouchDevice)
        ? '0 20px 40px rgba(0,0,0,0.08)'
        : '0 4px 12px rgba(0,0,0,0.03)',
      transition: isTouchDevice ? 'none' : 'all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)',
      cursor: 'pointer',
      flexDirection: isGrid ? 'column' : 'row',
      transform: (isHovered && !isTouchDevice) ? 'translateY(-8px)' : 'none',
      fontFamily: "'Inter', sans-serif",
      border: '1px solid #D1D5DB',
      padding: 0,
      margin: 0,
      boxSizing: 'border-box',
    },
```

#### Change 4.11: Update FavoriteButtonWithConfirm (touch targets)

**Location**: Lines 96-106 (cancelBtn style) and lines 107-117 (removeBtn style)

**Before**:
```javascript
    cancelBtn: {
      flex: 1,
      padding: '8px 12px',
      borderRadius: '8px',
      border: '1px solid #E2E8F0',
      background: 'white',
      color: '#64748B',
      fontSize: '13px',
      fontWeight: 600,
      cursor: 'pointer',
    },
    removeBtn: {
      flex: 1,
      padding: '8px 12px',
      borderRadius: '8px',
      border: 'none',
      background: '#EF4444',
      color: 'white',
      fontSize: '13px',
      fontWeight: 600,
      cursor: 'pointer',
    },
```

**After**:
```javascript
    cancelBtn: {
      flex: 1,
      padding: '10px 12px',
      minHeight: '44px',
      borderRadius: '8px',
      border: '1px solid #E2E8F0',
      background: 'white',
      color: '#64748B',
      fontSize: '13px',
      fontWeight: 600,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    removeBtn: {
      flex: 1,
      padding: '10px 12px',
      minHeight: '44px',
      borderRadius: '8px',
      border: 'none',
      background: '#EF4444',
      color: 'white',
      fontSize: '13px',
      fontWeight: 600,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
```

#### Change 4.12: Update host avatar (responsive)

**Location**: Lines 288-299 (hostAvatar style)

**Before**:
```javascript
    hostAvatar: {
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      background: '#6366F1',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
      fontWeight: 700,
    },
```

**After**:
```javascript
    hostAvatar: {
      width: isSmallMobile ? '28px' : '32px',
      height: isSmallMobile ? '28px' : '32px',
      borderRadius: '50%',
      background: '#6366F1',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: isSmallMobile ? '10px' : '12px',
      fontWeight: 700,
    },
```

**Dependencies**: useDeviceDetection.js (modified above)

**Verification**:
1. Open FavoriteListingsPage in browser
2. Test at 1200px (desktop), 600px (mobile), 400px (small mobile) widths
3. Verify card appearance adapts at each breakpoint
4. Test on mobile device or DevTools touch simulation - verify no hover effects
5. Verify button touch targets using DevTools accessibility audit

---

### File 5: FavoriteListingsPage.css (MODIFY)

**Path**: `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL21\Split Lease\app\src\islands\pages\FavoriteListingsPage\FavoriteListingsPage.css`

**Current State**: 717-line CSS file with 11 `!important` declarations

**Required Changes**: Remove all `!important` declarations and rely on natural specificity (V1 conflicts no longer exist after deletion)

#### Change 5.1: Line 64

**Before**:
```css
.favorites-page {
  padding-top: 0 !important; /* Sub-header handles spacing now */
```

**After**:
```css
.favorites-page {
  padding-top: 0; /* Sub-header handles spacing now */
```

#### Change 5.2: Lines 145-148

**Before**:
```css
.favorites-page .two-column-layout {
  display: grid !important;
  grid-template-columns: 1fr 400px !important; /* Map width from mockup */
  gap: 24px !important;
```

**After**:
```css
.favorites-page .two-column-layout {
  display: grid;
  grid-template-columns: 1fr 400px; /* Map width from mockup */
  gap: 24px;
```

#### Change 5.3: Line 163

**Before**:
```css
.favorites-page .map-column {
  width: 400px !important; /* Map width from mockup */
```

**After**:
```css
.favorites-page .map-column {
  width: 400px; /* Map width from mockup */
```

#### Change 5.4: Line 167

**Before**:
```css
  margin-top: 70px !important; /* Push map down to align with first card */
```

**After**:
```css
  margin-top: 70px; /* Push map down to align with first card */
```

#### Change 5.5: Lines 178-183

**Before**:
```css
.favorites-card-wrapper {
  padding: 0 !important;
  margin: 0 !important;
  box-shadow: none !important;
  border-radius: 24px !important;
  background: transparent !important;
}
```

**After**:
```css
.favorites-card-wrapper {
  padding: 0;
  margin: 0;
  box-shadow: none;
  border-radius: 24px;
  background: transparent;
}
```

#### Change 5.6: Line 459 (in media query)

**Before**:
```css
  .favorites-page .two-column-layout {
    grid-template-columns: 1fr !important;
  }
```

**After**:
```css
  .favorites-page .two-column-layout {
    grid-template-columns: 1fr;
  }
```

**Dependencies**: V1 files must be deleted first

**Verification**:
1. Open FavoriteListingsPage in browser
2. Verify layout is unchanged from before
3. Check that .favorites-card-wrapper styles apply correctly
4. Test on tablet (1024px) and mobile (768px) breakpoints

---

## 5. Execution Order

The changes must be executed in this order due to dependencies:

### Phase 1: Delete Orphaned V1 Files (Safe - No Dependencies)
1. Delete `app/src/islands/pages/FavoriteListingsPage/components/FavoritesCard.jsx`
2. Delete `app/src/islands/pages/FavoriteListingsPage/components/FavoritesCard.css`

### Phase 2: Extend Device Detection Hook
3. Modify `app/src/hooks/useDeviceDetection.js` - Add small mobile and touch detection

### Phase 3: Update Component (Depends on Phase 2)
4. Modify `app/src/islands/pages/FavoriteListingsPage/components/FavoritesCardV2.jsx`
   - Add imports (React.memo, useDeviceDetection)
   - Add responsive hook usage
   - Update all style objects with responsive values
   - Wrap export in React.memo

### Phase 4: Clean CSS (Depends on Phase 1)
5. Modify `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.css`
   - Remove all `!important` declarations (11 total)

### Safe Stopping Points
- After Phase 1: V1 cleanup complete, no breaking changes
- After Phase 2: Hook extended, no breaking changes
- After Phase 3: Component fully responsive
- After Phase 4: Full cleanup complete

---

## 6. Risk Assessment

### Potential Breaking Changes

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| V1 deletion breaks hidden import | Very Low | High | Grep confirmed no imports exist |
| !important removal causes style regression | Low | Medium | Test on all breakpoints before committing |
| React.memo breaks expected re-renders | Low | Medium | Custom comparison function is conservative |
| Touch detection fails on hybrid devices | Low | Low | Graceful degradation - hover just works |

### Edge Cases to Watch

1. **List view mode**: The component supports both `grid` and `list` viewMode. Ensure list view also looks correct on mobile.
2. **Long listing titles**: Title font size reduction may cause overflow issues - verify text truncation still works.
3. **Hybrid devices (Surface Pro)**: These have both touch and mouse - touch detection may disable hover. This is acceptable behavior.
4. **Card without images**: Verify fallback image styling works at all breakpoints.

### Rollback Considerations

If issues arise:
1. Phase 1 (V1 deletion) - Cannot rollback without git, but no dependencies exist
2. Phase 2 (hook changes) - Backwards compatible, no rollback needed
3. Phase 3 (component changes) - Can be reverted file by file
4. Phase 4 (CSS changes) - Easy to add `!important` back if needed

---

## 7. Verification Checklist

### Pre-Implementation
- [ ] Confirm no other files import FavoritesCard (V1)
- [ ] Take screenshots of current appearance at 1200px, 768px, 480px widths

### Post-Phase 1 (V1 Deletion)
- [ ] FavoritesCard.jsx deleted
- [ ] FavoritesCard.css deleted
- [ ] App still builds without errors
- [ ] FavoriteListingsPage still renders

### Post-Phase 2 (Hook Extension)
- [ ] useDeviceDetection.js compiles without errors
- [ ] useIsSmallMobile() returns true at 400px width
- [ ] useIsTouchDevice() returns true on mobile DevTools emulation
- [ ] Existing useIsMobile/useIsDesktop still work

### Post-Phase 3 (Component Update)
- [ ] FavoritesCardV2 renders without errors
- [ ] Card adapts at 768px breakpoint (padding, font sizes)
- [ ] Card adapts at 480px breakpoint (smaller values)
- [ ] Hover effects disabled on touch device simulation
- [ ] Buttons are minimum 44px tall (DevTools audit)
- [ ] React DevTools shows component not re-rendering on unrelated state changes

### Post-Phase 4 (CSS Cleanup)
- [ ] Zero `!important` declarations in FavoriteListingsPage.css
- [ ] Verify: `grep "!important" FavoriteListingsPage.css` returns empty
- [ ] Visual appearance unchanged at desktop (1200px)
- [ ] Visual appearance unchanged at tablet (1024px)
- [ ] Visual appearance unchanged at mobile (768px)

### Definition of Done
- [ ] All V1 files removed
- [ ] All `!important` removed from CSS
- [ ] Component memoized with React.memo
- [ ] Responsive at 3 breakpoints
- [ ] Touch targets >= 44px verified
- [ ] No hover effects on touch devices
- [ ] No visual regressions at any breakpoint

---

## 8. Reference Appendix

### All File Paths (Consolidated)

**Files to DELETE**:
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL21\Split Lease\app\src\islands\pages\FavoriteListingsPage\components\FavoritesCard.jsx`
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL21\Split Lease\app\src\islands\pages\FavoriteListingsPage\components\FavoritesCard.css`

**Files to MODIFY**:
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL21\Split Lease\app\src\hooks\useDeviceDetection.js`
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL21\Split Lease\app\src\islands\pages\FavoriteListingsPage\components\FavoritesCardV2.jsx`
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL21\Split Lease\app\src\islands\pages\FavoriteListingsPage\FavoriteListingsPage.css`

**Files for REFERENCE** (not modified):
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL21\Split Lease\app\src\islands\pages\FavoriteListingsPage\FavoriteListingsPage.jsx`

### Responsive Values Quick Reference

| Property | Desktop (>768) | Mobile (<=768) | Small (<=480) |
|----------|---------------|----------------|---------------|
| Image height (grid) | 240px | 180px | 160px |
| Image width (list) | 280px | 200px | 200px |
| Content padding | 24px | 16px | 12px |
| Content gap | 12px | 10px | 8px |
| Card border-radius | 24px | 20px | 16px |
| Title font | 18px | 16px | 15px |
| Location font | 13px | 12px | 11px |
| Price font | 22px | 20px | 18px |
| Button padding | 14px 28px | 14px 24px | 12px 20px |
| Button min-height | 44px | 44px | 44px |
| Host avatar | 32px | 32px | 28px |

### Key Code Patterns

**React.memo with custom comparison**:
```javascript
export default memo(Component, (prevProps, nextProps) => {
  return prevProps.id === nextProps.id &&
         prevProps.data === nextProps.data;
});
```

**Responsive inline style pattern**:
```javascript
const { isMobile, isSmallMobile, isTouchDevice } = useDeviceDetection();

const styles = {
  container: {
    padding: isSmallMobile ? '12px' : isMobile ? '16px' : '24px',
    transition: isTouchDevice ? 'none' : 'all 0.3s ease',
  }
};
```

**Touch-aware hover state**:
```javascript
const [isHovered, setIsHovered] = useState(false);

<div
  onMouseEnter={() => !isTouchDevice && setIsHovered(true)}
  onMouseLeave={() => !isTouchDevice && setIsHovered(false)}
>
```

---

**Plan Status**: READY FOR EXECUTION
**Estimated Implementation Time**: 45-60 minutes
**Risk Level**: Low (additive changes, clear rollback path)
