# Payoneer Floating Avatar Implementation Analysis

## Overview
Analysis of the Payoneer "Get Paid by Marketplaces" page hero section, focusing on how they implement floating marketplace logo cards (eBay, Wish, Amazon, etc.) with responsive behavior across desktop, tablet, and mobile viewports.

## Screenshots Captured
- Desktop (1920px): `desktop-1920px.png`
- Tablet (768px): `tablet-768px.png`
- Mobile (375px): `mobile-375px.png`

---

## Key Implementation Details

### Architecture Pattern
Payoneer uses a **mockup phone/card UI as the container** with absolutely positioned floating logo cards that overflow the container. This creates the "floating" effect.

**Core Structure:**
```
.get-paid-by__inner (absolute positioned container)
  └── .transactions__notifications (full container overlay)
      └── .notification__wrapper-[brand] (absolute positioned cards)
          └── img (brand logos)
```

---

## Positioning Techniques

### Desktop (1920px)

**Container:**
- `.get-paid-by__inner`: `position: absolute`
- Dimensions: `331px × 528px` (fixed pixel size for phone mockup)
- Transform: `matrix(1, 0, 0, 1, -165.5, 0)` (slight horizontal offset)
- Positioned using: `top: 29px`, `left: 540px`

**Floating Cards:**
1. **eBay Card** (`.notification__wrapper-ebay`):
   - Position: `absolute`
   - Top: `90px`, Left: `162px`
   - Size: `299px × 280px`
   - **Negative right value**: `right: -130px` (allows overflow beyond container)
   - Rect shows it extends outside parent (x: 956.5, parent ends at ~1125)

2. **Wish Card** (`.notification__wrapper-wish`):
   - Position: `absolute`
   - Top: `286px`, **Left: `-125px`** (negative = extends left outside container)
   - Size: `269px × 251px`
   - Negative bottom: `bottom: -9px`
   - **Note**: Rect shows `width: 0, height: 0` (possibly collapsed or off-screen)

### Tablet (768px)

**Key Changes:**
- Container parent width adjusts: `738px` (down from 1080px on desktop)
- Phone mockup stays same size: `473px × 557px`
- Cards maintain same dimensions (`299px`, `269px`)
- Positioning adjusts but cards remain visible
- eBay card: `x: 380.5` (more centered relative to narrower viewport)

### Mobile (375px)

**Dramatic Simplification:**
- Container parent: `345px` (narrow width)
- Background image: `410px` (wider than parent - intentional overflow)
- Background rect: `x: -17.5` (starts off-screen left, crops naturally)
- Cards scale down or reposition significantly
- eBay card: `x: 75.5` (much more left-aligned)

---

## CSS Techniques Identified

### 1. Image Sizing
- **Fixed pixel dimensions** at all breakpoints
- No viewport units (vw/vh), no clamp()
- Images: `width: 299px`, `height: 280px` (exact pixels)
- `object-fit: fill` (maintain aspect ratio)
- `aspect-ratio: auto 299 / 280` (browser-native aspect ratio)

### 2. Positioning Strategy
- **Absolute positioning with pixel values** (not percentages)
- **Negative positioning values** to create overflow effect
  - `left: -125px` (extend left outside container)
  - `right: -130px` (extend right outside container)
- Parent container uses `overflow: visible` to allow children to overflow

### 3. Transform Usage
- Minimal transforms (only one found: `matrix(1, 0, 0, 1, -165.5, 0)`)
- No complex translate/scale transforms
- Positioning done primarily via top/left/right/bottom

### 4. Responsive Approach

**NOT using:**
- Media query-based image swapping
- CSS Grid/Flexbox for layout
- Viewport-relative units (vw, vh)
- Fluid typography/sizing (clamp, min, max)

**USING:**
- Fixed pixel dimensions at all breakpoints
- Container width changes via parent element
- Absolute positioning recalculated at breakpoints
- Elements maintain same intrinsic size, just repositioned

### 5. Overflow Handling
- Parent: `overflow: visible` (critical for floating effect)
- No `overflow: hidden` that would clip cards
- Negative positioning + visible overflow = floating outside container

---

## Responsive Behavior Summary

| Viewport | Container Width | Card Behavior | Technique |
|----------|----------------|---------------|-----------|
| **Desktop (1920px)** | 1080px | Cards extend significantly outside mockup phone | Negative right (-130px), negative left (-125px) |
| **Tablet (768px)** | 738px | Cards still extend but less dramatically | Adjusted positioning, same card sizes |
| **Mobile (375px)** | 345px | Cards stack/reposition, much tighter layout | Aggressive repositioning, parent overflow |

---

## Key Insights for Split Lease Implementation

### What Works Well:
1. **Fixed pixel sizing is simpler** than viewport units for this use case
2. **Negative absolute positioning** creates believable "floating" effect
3. **Parent `overflow: visible`** is critical - don't clip the cards
4. **Separate container and card positioning** - container adjusts width, cards adjust position

### Recommendations:

**For Desktop/Tablet (768px+):**
- Use absolute positioning within a relatively positioned container
- Fixed pixel dimensions for avatar images (e.g., 200px, 150px, etc.)
- Negative positioning values to extend avatars outside their container
- Parent container: `overflow: visible`

**For Mobile (< 768px):**
- Drastically simplify or remove floating avatars entirely
- If kept, make them much smaller and tighter to main content
- Consider stacking vertically instead of floating

**CSS Pattern to Use:**
```css
.hero-container {
  position: relative;
  overflow: visible; /* Critical */
}

.floating-avatars-wrapper {
  position: absolute;
  width: 400px;
  height: 500px;
  /* Position relative to hero */
}

.avatar-card {
  position: absolute;
  width: 180px;
  height: 180px;

  /* Negative positioning for overflow effect */
  &.top-right {
    top: 50px;
    right: -80px; /* Extends outside parent */
  }

  &.bottom-left {
    bottom: 30px;
    left: -60px; /* Extends outside parent */
  }
}

/* Tablet adjustments */
@media (max-width: 1024px) {
  .floating-avatars-wrapper {
    width: 350px;
  }

  .avatar-card {
    width: 140px;
    height: 140px;

    &.top-right {
      right: -40px; /* Less overflow */
    }
  }
}

/* Mobile simplification */
@media (max-width: 768px) {
  .floating-avatars-wrapper {
    position: static; /* Remove floating */
    width: 100%;
  }

  .avatar-card {
    position: relative; /* Stack normally */
    width: 100px;
    height: 100px;
  }
}
```

---

## Technical Details

### Parent Container Structure:
- Fixed-size inner container for mockup
- Absolute positioning within relative parent
- Transform used for fine-tuning alignment
- Z-index management (though mostly auto)

### Image Optimization:
- Using WebP format (`.webp` extension)
- Fixed dimensions prevent layout shift
- `object-fit: fill` maintains aspect ratio
- No lazy loading detected in initial viewport

### Animation/Interaction:
- No complex animations detected in static analysis
- Likely has hover states or scroll animations (not captured)

---

## Conclusion

Payoneer's approach is **simpler than expected**:
- No fancy viewport units or fluid sizing
- Fixed pixel dimensions throughout
- Absolute positioning with negative values
- Container width adjustments drive responsive behavior
- Overflow visibility is the key to the floating effect

This is a **highly maintainable approach** that Split Lease can adapt by:
1. Creating a fixed-size container for avatars
2. Absolutely positioning each avatar with specific pixel values
3. Using negative positioning to extend avatars outside the container
4. Ensuring parent has `overflow: visible`
5. Adjusting positioning values at breakpoints (not sizing)
