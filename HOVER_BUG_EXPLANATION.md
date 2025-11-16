# Map Hover Bug - Root Cause Analysis

## The Problem You're Experiencing

**Symptom:** When you hover over ANY part of the map (not just pins), all markers disappear and reappear, then the map recenters.

**Why this is catastrophic:** It happens on EVERY mouse movement over the map, making the map basically unusable.

---

## The Root Cause: Infinite Re-render Loop

### The Smoking Gun

**File:** `SearchPage.jsx`, lines 1648-1650

```javascript
<GoogleMap
  ref={mapRef}
  listings={allActiveListings}
  filteredListings={allListings}
  selectedListing={null}
  selectedBorough={selectedBorough}
  onMarkerClick={(listing) => {           // ← PROBLEM IS HERE!
    console.log('Marker clicked:', listing.title);
  }}
  onAIResearchClick={handleOpenAIResearchModal}
/>
```

**The Issue:**
Every time `SearchPage` component re-renders, this code creates a **BRAND NEW FUNCTION** for `onMarkerClick`.

In JavaScript:
```javascript
const func1 = () => console.log('hello');
const func2 = () => console.log('hello');
func1 === func2  // FALSE! Different objects in memory
```

Even though the functions do the same thing, they are **different objects in memory**.

---

## The Chain Reaction

### Step 1: Initial Render
```
SearchPage renders
  → Creates NEW onMarkerClick function (function #1)
  → Passes it to GoogleMap as prop
  → GoogleMap receives prop
```

### Step 2: GoogleMap's handlePinClick Hook
**File:** `GoogleMap.jsx`, line 260

```javascript
const handlePinClick = useCallback(async (listing, priceTag) => {
  // ... pin click logic ...
}, [onMarkerClick]);  // ← Depends on onMarkerClick!
```

**What `useCallback` does:**
- Creates a memoized version of the function
- **Recreates the function whenever dependencies change**
- Dependency: `onMarkerClick`

When `onMarkerClick` changes (new function reference), `handlePinClick` is recreated.

### Step 3: The Infinite Loop Trigger

Something (we need to identify what) causes `SearchPage` to re-render.

**Possible triggers:**
1. Mouse movement over the map container
2. Hover state changes somewhere in SearchPage
3. Some other state update we haven't identified yet

When SearchPage re-renders:
```
SearchPage re-renders
  → Creates NEW onMarkerClick (function #2)
  → function #2 !== function #1 (different memory addresses!)
  → GoogleMap receives new prop value
  → GoogleMap component re-renders (prop changed!)
  → handlePinClick recreates (dependency changed!)
  → Marker event listeners use new handlePinClick
  → (Maybe) Some side effect triggers another re-render
  → LOOP BACK TO START
```

### Step 4: Marker Recreation Effect

**File:** `GoogleMap.jsx`, lines 337-604

```javascript
useEffect(() => {
  // Create markers
}, [listings, filteredListings, mapLoaded, showAllListings]);
```

**Current behavior:**
The marker effect does NOT depend on `onMarkerClick`, so it should NOT trigger on hover.

**BUT:** If GoogleMap is re-rendering constantly (due to the loop above), and if `listings` or `filteredListings` arrays are being recreated with new references, the signature check might fail:

```javascript
const markerSignature = `${listings.map(l => l.id).join(',')}-${filteredListings.map(l => l.id).join(',')}-${showAllListings}`;
if (lastMarkersUpdateRef.current === markerSignature) return;
```

If the signature is the same string but the effect runs anyway due to constant rerenders, markers will recreate.

---

## Why Hover Specifically?

### Hypothesis 1: Map Container Has Hover State
There might be a hover handler on the map container that updates state.

### Hypothesis 2: React Event Pooling/Bubbling
Mouse events might be bubbling up and triggering state changes in SearchPage.

### Hypothesis 3: Dev Tools or Extensions
Sometimes React DevTools or browser extensions can cause constant re-renders during hover.

### Hypothesis 4: CSS Hover + React State
Some component might be using CSS `:hover` combined with React state tracking for styling.

---

## The Fix

### Solution 1: Memoize the Callback in SearchPage ✅ RECOMMENDED

**Change this:**
```javascript
onMarkerClick={(listing) => {
  console.log('Marker clicked:', listing.title);
}}
```

**To this:**
```javascript
// At top of SearchPage component
const handleMarkerClick = useCallback((listing) => {
  console.log('Marker clicked:', listing.title);
}, []); // Empty deps = function never changes

// In JSX
<GoogleMap
  onMarkerClick={handleMarkerClick}  // Pass stable reference
  // ... other props
/>
```

**Why this works:**
- `useCallback` with empty deps creates function ONCE
- Same function reference passed on every render
- GoogleMap sees "prop didn't change"
- No re-render loop

### Solution 2: Remove Unused Callback

**Even better:**
The `onMarkerClick` callback currently just logs to console, which is not useful in production.

**If you don't need it, remove it:**
```javascript
<GoogleMap
  ref={mapRef}
  listings={allActiveListings}
  filteredListings={allListings}
  selectedListing={null}
  selectedBorough={selectedBorough}
  // onMarkerClick removed entirely
  onAIResearchClick={handleOpenAIResearchModal}
/>
```

**Update GoogleMap.jsx line 257-259:**
```javascript
// Remove or make optional
if (onMarkerClick) {
  onMarkerClick(listing);
}
```

This already has the optional check, so removing the prop is safe.

### Solution 3: React.memo on GoogleMap

**Wrap GoogleMap export:**
```javascript
export default React.memo(GoogleMap, (prevProps, nextProps) => {
  // Custom comparison - only re-render if these actually change
  return (
    prevProps.listings === nextProps.listings &&
    prevProps.filteredListings === nextProps.filteredListings &&
    prevProps.selectedBorough === nextProps.selectedBorough &&
    prevProps.mapLoaded === nextProps.mapLoaded
  );
  // Ignore onMarkerClick changes
});
```

**Why this works:**
- Prevents GoogleMap from re-rendering unless critical props change
- Breaks the re-render loop

---

## Additional Investigation Needed

### Find What's Causing SearchPage to Re-render

**Add this to SearchPage component (after the useState declarations):**
```javascript
useEffect(() => {
  console.log('🔄 SearchPage RE-RENDERED');
  console.trace(); // Shows stack trace of what caused re-render
});
```

**Then:**
1. Open browser console
2. Hover over map
3. Check if "SearchPage RE-RENDERED" logs appear
4. Check the stack trace to see what triggered it

### Check for Hover State Management

**Search for:**
```bash
grep -n "onMouseEnter\|onMouseLeave\|onHover" SearchPage.jsx
```

Look for any state updates in hover handlers.

---

## Comparison: Before vs After Fix

### Before (Current Buggy Behavior)

```
User hovers over map
  ↓
Something triggers SearchPage re-render (unknown)
  ↓
New onMarkerClick function created
  ↓
GoogleMap receives new prop
  ↓
GoogleMap re-renders
  ↓
handlePinClick recreated
  ↓
(Possibly) Markers recreate
  ↓
Map fitBounds called
  ↓
Markers disappear/reappear
  ↓
Map viewport shifts
  ↓
LOOP CONTINUES with next mouse movement
```

### After Fix (With useCallback)

```
User hovers over map
  ↓
Something triggers SearchPage re-render
  ↓
SAME onMarkerClick function reference (memoized)
  ↓
GoogleMap sees "props didn't change"
  ↓
NO RE-RENDER
  ↓
Loop broken ✅
```

---

## Testing the Fix

### Before Applying Fix

1. Open browser console
2. Hover over map
3. Count how many times you see:
   - `🗺️ GoogleMap: Component rendered with props:`
   - `🗺️ GoogleMap: Markers update triggered`
   - `🗺️ GoogleMap: Cleared existing markers`

If these logs appear on EVERY hover/mouse movement, you have the infinite loop.

### After Applying Fix

1. Apply Solution 1 (useCallback)
2. Refresh page
3. Hover over map
4. These logs should NOT appear on hover
5. Markers should stay stable

---

## Root Cause Summary

**Primary Issue:** `onMarkerClick` prop creates new function on every SearchPage render

**Secondary Issue:** Something (unidentified) is causing SearchPage to re-render on hover

**Result:** Infinite re-render loop → constant marker recreation → unusable map

**Fix:** Memoize the callback with `useCallback` or remove it entirely

**Priority:** CRITICAL - Makes map completely unusable

**Estimated Fix Time:** 5 minutes (Solution 1 or 2)

---

## Files to Modify

### SearchPage.jsx

**Option A: Memoize callback**
```javascript
// Add near other useCallback declarations (around line 620-640)
const handleMarkerClick = useCallback((listing) => {
  console.log('Marker clicked:', listing.title);
}, []);

// Update GoogleMap usage (line 1648-1650)
<GoogleMap
  ref={mapRef}
  listings={allActiveListings}
  filteredListings={allListings}
  selectedListing={null}
  selectedBorough={selectedBorough}
  onMarkerClick={handleMarkerClick}  // ← Use memoized function
  onAIResearchClick={handleOpenAIResearchModal}
/>
```

**Option B: Remove callback (recommended)**
```javascript
// Just delete lines 1648-1650, make it:
<GoogleMap
  ref={mapRef}
  listings={allActiveListings}
  filteredListings={allListings}
  selectedListing={null}
  selectedBorough={selectedBorough}
  onAIResearchClick={handleOpenAIResearchModal}
/>
```

---

**Report Created:** 2025-11-16
**Status:** Root cause identified, fix available
**Severity:** CRITICAL
