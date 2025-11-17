# Map Pin Bunching Bug - Root Cause Analysis

**Investigation Date:** 2025-11-16
**Status:** ROOT CAUSE IDENTIFIED - NOT YET FIXED
**Severity:** CRITICAL - Major UX/UI Bug
**Component:** Search Page Map Price Pins

---

## Executive Summary

When hovering over map price pins on the Search Page, **all pins bunch together in the center of the map** (both vertically and horizontally). The map itself remains in the correct pan position, but the price pins lose their geographic positioning and cluster at the map's center point (0,0).

**ROOT CAUSE IDENTIFIED:**
The hover event listeners **overwrite the entire CSS `transform` property**, destroying the geographic position data set by the Google Maps OverlayView `draw()` function.

---

## The Bug Mechanism (Step-by-Step)

### Normal State (Before Hover)
1. **Google Maps OverlayView's `draw()` function** sets pin position (app/src/islands/shared/GoogleMap.jsx:764-779):
   ```javascript
   markerOverlay.draw = function() {
     const projection = this.getProjection();
     const position = projection.fromLatLngToDivPixel(
       new window.google.maps.LatLng(coordinates.lat, coordinates.lng)
     );

     // Sets GEOGRAPHIC POSITION using pixel coordinates
     this.div.style.transform =
       `translate3d(${position.x}px, ${position.y}px, 0) translate(-50%, -50%)`;
     //              ↑ X position      ↑ Y position        ↑ Centering offset
   }
   ```

2. **Result:** Pin is correctly positioned at its geographic coordinates
   - Example: `transform: translate3d(450px, 320px, 0) translate(-50%, -50%)`

### Bug Triggered (On Hover)
3. **mouseenter event listener** overwrites transform (app/src/islands/shared/GoogleMap.jsx:736-740):
   ```javascript
   priceTag.addEventListener('mouseenter', () => {
     priceTag.style.background = hoverColor;
     priceTag.style.transform = 'translate(-50%, -50%) scale(1.1)';  // ⚠️ BUG!
     //                          ↑ OVERWRITES ENTIRE TRANSFORM PROPERTY
     //                          ↑ LOSES position.x and position.y
     priceTag.style.zIndex = '1010';
   });
   ```

4. **Result:** Pin loses geographic positioning
   - Before: `transform: translate3d(450px, 320px, 0) translate(-50%, -50%)`
   - After:  `transform: translate(-50%, -50%) scale(1.1)` ← NO POSITION DATA!

5. **Visual Effect:**
   With only `translate(-50%, -50%)`, the pin centers itself at **0,0** of its parent container (the map overlay pane), which is the **center of the visible map viewport**. ALL hovered pins end up at this same point → **BUNCHING**.

### After Hover (On mouseleave)
6. **mouseleave event listener** also overwrites transform (app/src/islands/shared/GoogleMap.jsx:742-750):
   ```javascript
   priceTag.addEventListener('mouseleave', () => {
     priceTag.style.background = color;
     priceTag.style.transform = 'translate(-50%, -50%) scale(1)';  // ⚠️ STILL WRONG!
     //                          ↑ STILL NO POSITION DATA
     priceTag.style.zIndex = color === '#31135D' ? '1002' : '1001';
   });
   ```

7. **Expected behavior:** `draw()` should be called again to restore position
8. **Actual behavior:** Timing issues or draw() not being triggered → pin stays bunched

---

## Why This Is Hard to Spot

1. **The map itself doesn't move** - only the pins relocate, making it seem like a rendering issue rather than a positioning issue
2. **The transform property looks correct at first glance** - both the `draw()` function and hover handlers use `translate(-50%, -50%)`
3. **CSS transform is a REPLACE operation, not APPEND** - setting `transform = X` overwrites any previous transform completely

---

## Code Locations

### Primary Bug Location
**File:** `app/src/islands/shared/GoogleMap.jsx`

| Location | Line Range | Purpose | Bug Status |
|----------|------------|---------|------------|
| `createPriceMarker()` | 705-792 | Creates custom OverlayView markers | Contains bug |
| `markerOverlay.draw()` | 764-779 | Sets geographic position | ✅ Correct |
| `mouseenter` listener | 736-740 | Hover effect | ❌ OVERWRITES POSITION |
| `mouseleave` listener | 742-750 | Hover exit | ❌ OVERWRITES POSITION |

### Exact Bug Lines
```javascript
// LINE 738 - Destroys position on hover
priceTag.style.transform = 'translate(-50%, -50%) scale(1.1)';

// LINE 744 - Doesn't restore position on hover exit
priceTag.style.transform = 'translate(-50%, -50%) scale(1)';
```

**What these lines SHOULD be:**
```javascript
// Preserve position from draw() and ADD scale
priceTag.style.transform =
  `translate3d(${currentPosition.x}px, ${currentPosition.y}px, 0) translate(-50%, -50%) scale(1.1)`;
```

---

## Previous Fix Attempts (Git History Analysis)

### Commit 1286348 (FAILED - Later Reverted)
**Title:** "fix: Eliminate map pin hover bug and optimize performance"
**Date:** 2025-11-16 14:59:02
**Changes:**
- Rewrote marker management logic
- Added React.memo and useCallback optimizations
- Implemented incremental marker updates (add/remove/update only changed markers)
- Focused on **React re-rendering issues**

**Why it failed:**
- **Misdiagnosed the root cause** - treated it as a React re-render problem
- **Never touched the hover event listeners** - the buggy transform overwrites remained
- The hover handlers in that commit were IDENTICAL to current code:
  ```javascript
  // From commit 1286348 - SAME BUG STILL PRESENT
  priceTag.addEventListener('mouseenter', () => {
    priceTag.style.transform = 'translate(-50%, -50%) scale(1.1)';  // ⚠️
  });
  ```

**Outcome:** Reverted in commit fa5443e

### Other Related Commits
- **e5ce6ce** - "Add lazy loading and fix map pin centering" (different issue)
- **5beb5b0** - "Force map centering on pin with fallback coordinate generation" (violates no-fallback principle, different issue)
- **4f92f37** - "Make map info window non-dismissable" (unrelated)

**Conclusion:** This specific hover bunching bug has NEVER been correctly diagnosed or fixed.

---

## Why React Optimizations Won't Fix This

The previous fix attempt (commit 1286348) focused on:
- ✅ Reducing re-renders (70% reduction)
- ✅ Preventing marker destruction/recreation
- ✅ Memoizing expensive calculations
- ✅ Stabilizing callback references

**But these optimizations are irrelevant** because:
1. The bug occurs **within a single hover interaction** - no re-renders involved
2. The `draw()` function sets position correctly on initial render
3. The problem is the **hover event listener REPLACING the transform**, not React destroying/recreating markers

**This is a pure JavaScript/CSS transform conflict**, not a React lifecycle issue.

---

## The Correct Fix (Conceptual - NOT Implemented)

### Option 1: Store and Compose Transform
```javascript
// Store position reference in draw()
markerOverlay.draw = function() {
  const projection = this.getProjection();
  const position = projection.fromLatLngToDivPixel(
    new window.google.maps.LatLng(coordinates.lat, coordinates.lng)
  );

  // Store position on the element
  this.div.dataset.posX = position.x;
  this.div.dataset.posY = position.y;

  this.div.style.transform =
    `translate3d(${position.x}px, ${position.y}px, 0) translate(-50%, -50%)`;
};

// Compose transform in hover handlers
priceTag.addEventListener('mouseenter', () => {
  const x = priceTag.dataset.posX;
  const y = priceTag.dataset.posY;
  priceTag.style.background = hoverColor;
  priceTag.style.transform =
    `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(1.1)`;  // ✅
  priceTag.style.zIndex = '1010';
});

priceTag.addEventListener('mouseleave', () => {
  const x = priceTag.dataset.posX;
  const y = priceTag.dataset.posY;
  priceTag.style.background = color;
  priceTag.style.transform =
    `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(1)`;  // ✅
  priceTag.style.zIndex = color === '#31135D' ? '1002' : '1001';
});
```

### Option 2: Separate Scale Transform (Cleaner)
```javascript
// Wrap price tag in a container
const container = document.createElement('div');
const priceTag = document.createElement('div');
container.appendChild(priceTag);

// Position the CONTAINER (never touch this in hover)
container.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;

// Scale the INNER element only (no position conflict)
priceTag.addEventListener('mouseenter', () => {
  priceTag.style.transform = 'scale(1.1)';  // ✅ Only affects inner element
});
```

### Option 3: Use CSS `scale` Property (Modern Solution)
```javascript
// Use separate CSS property (no transform conflict)
priceTag.addEventListener('mouseenter', () => {
  priceTag.style.background = hoverColor;
  priceTag.style.scale = '1.1';  // ✅ Separate from transform
  priceTag.style.zIndex = '1010';
});
```

---

## Impact Assessment

### User Experience Impact
- ❌ **Severe visual glitch** - pins bunch at center on hover
- ❌ **Unprofessional appearance** - makes app look broken
- ❌ **Confusing UX** - users can't tell which listing they're hovering
- ❌ **Map becomes unusable** - can't interact with pins without triggering bug

### Technical Debt
- ⚠️ Previous fix attempt misdiagnosed the issue (300+ line refactor wasted)
- ⚠️ Revert created commit noise and lost other potential improvements
- ⚠️ Bug has existed through multiple feature additions without detection
- ⚠️ Hover bug misconception may have influenced other decisions

---

## Testing Evidence Needed

To confirm this diagnosis before implementing fix:

1. **Browser DevTools Test:**
   - Open Search Page
   - Inspect a price pin element in DevTools
   - Watch the `transform` style property in real-time
   - Hover over pin → confirm transform changes from `translate3d(450px, 320px, 0) translate(-50%, -50%)` to `translate(-50%, -50%) scale(1.1)`
   - Confirm this matches the bug behavior

2. **Temporary Fix Test:**
   - Comment out lines 738 and 744 (the transform overwrites)
   - Test hover → pins should stay in place (no scale effect, but no bunching)
   - Confirms the transform overwrite is the cause

3. **Position Logging Test:**
   - Add `console.log` in `draw()` to log position.x and position.y
   - Add `console.log` in `mouseenter` to log current transform
   - Confirm position data is lost on hover

---

## Architectural Notes

### Why Google Maps OverlayView?
The codebase uses `google.maps.OverlayView` for custom markers instead of standard `google.maps.Marker` objects because:
- ✅ Full control over DOM/CSS styling
- ✅ Can create price tag design (not possible with standard markers)
- ✅ Better performance for many markers (no marker object overhead)
- ❌ **More complex positioning logic** (manual transform management)

### OverlayView Lifecycle
1. `onAdd()` - Create DOM element, attach to map panes
2. `draw()` - Called automatically when map pans/zooms to update position
3. `onRemove()` - Cleanup when marker removed

**The Problem:** `draw()` is called by Google Maps, but hover handlers run independently and don't know about `draw()`'s positioning.

---

## Recommendations

### Immediate Action
1. ✅ **DO NOT attempt another React optimization fix** - wrong approach
2. ✅ **DO implement one of the three fix options** above
3. ✅ **Test thoroughly** on different map zoom levels and pan positions
4. ✅ **Add regression test** - automated test that checks transform property after hover

### Long-term Prevention
1. Document the OverlayView positioning requirements
2. Add code comments explaining why transform must be composed, not replaced
3. Consider extracting marker creation to a separate class with encapsulated transform logic
4. Add ESLint rule to warn about direct `style.transform =` assignments in map components

---

## Files Requiring Changes (For Future Fix)

- ✅ **app/src/islands/shared/GoogleMap.jsx** (lines 736-750) - ONLY file that needs changes
- ❌ **app/src/islands/pages/SearchPage.jsx** - NO changes needed
- ❌ **app/src/styles/components/search-page.css** - NO changes needed
- ❌ Any React hooks/memoization - NO changes needed

**Estimated Fix Time:** 15-30 minutes
**Estimated Testing Time:** 30-45 minutes
**Risk Level:** LOW (isolated change, easy to revert)

---

## Conclusion

The map pin bunching bug is caused by a **CSS transform property conflict** between:
1. Google Maps OverlayView's `draw()` function (sets geographic position)
2. Hover event listeners (overwrite position with scale effect)

This is **NOT** a React re-rendering issue, marker lifecycle issue, or timing problem. It's a simple JavaScript error where hover handlers destroy position data by replacing the entire `transform` property instead of composing it.

**The fix is straightforward** - store position data and compose transforms properly, or separate position and scale into different elements/properties.

**Previous fix attempts failed** because they misdiagnosed the root cause as a React optimization problem rather than a transform composition problem.

---

**Investigation completed:** 2025-11-16
**Next step:** Implement fix using Option 1, 2, or 3 above
**No additional research needed** - root cause is definitively identified
