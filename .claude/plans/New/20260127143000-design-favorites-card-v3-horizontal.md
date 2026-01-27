# Design Implementation Plan: FavoritesCardV3 - Horizontal Compact Card with Mini Map

## 1. Overview

**Description**: A completely redesigned FavoritesCard component featuring a horizontal layout with three distinct sections: Image Thumbnail, Listing Details, and Mini Map. The design follows a Minimal Premium aesthetic inspired by Apple's design language with subtle purple/gold accents.

**User's Original Vision Summary**:
- Horizontal card layout (NOT vertical like current FavoritesCardV2)
- Smaller, more compact design
- Three sections: Image | Details | Mini Map
- Minimal Premium / Apple-like elegance
- Subtle purple (#6366F1) or gold accents
- Each card has its own mini-map showing listing location

**Scope Boundaries**:
- IS INCLUDED: New FavoritesCardV3 component, inline styles, responsive behavior, mini-map integration
- IS INCLUDED: Favorite heart indicator, proposal status badge, CTA button
- NOT INCLUDED: Changes to FavoriteListingsPage.jsx (parent will swap V2 for V3)
- NOT INCLUDED: Changes to favoritesApi.js or other data fetching logic

---

## 2. Reference Analysis

### Key Visual Characteristics [FROM USER REQUEST]
- **Layout**: Horizontal card with three equal-importance sections
- **Style**: Apple-like Minimal Premium aesthetic
- **Colors**: Clean white background with purple (#6366F1) or gold accents
- **Typography**: Refined, elegant, restrained
- **Shadows**: Subtle, elegant (not heavy)
- **Spacing**: Generous whitespace, refined proportions

### Design System Alignment [FROM CODEBASE]
- Primary accent color already in use: `#6366F1` (indigo/purple)
- Existing success green: `#10B981`
- Existing error red: `#EF4444`
- Existing text colors: `#0F172A` (dark), `#64748B` (medium), `#94A3B8` (light)
- Border color: `#E2E8F0` or `#D1D5DB`
- Border radius pattern: 12px-24px range

---

## 3. Existing Codebase Integration

### Relevant Existing Components to Reuse/Extend [FROM CODEBASE]
| Component | Path | Usage |
|-----------|------|-------|
| `FavoritesCardV2.jsx` | `app/src/islands/pages/FavoriteListingsPage/components/FavoritesCardV2.jsx` | Reference for props interface, favorite button logic |
| `useDeviceDetection.js` | `app/src/hooks/useDeviceDetection.js` | Mobile/tablet/desktop detection |
| `GoogleMap.jsx` | `app/src/islands/shared/GoogleMap.jsx` | Reference for Google Maps API usage (API key via `VITE_GOOGLE_MAPS_API_KEY`) |

### Existing Styling Patterns to Follow [FROM CODEBASE]
- Inline styles object pattern (as used in FavoritesCardV2)
- CSS custom properties for theming
- Touch target minimum: 44px
- Responsive breakpoints: 480px (small mobile), 768px (mobile), 1024px (tablet)

### Files That Will Be Affected
| File | Action |
|------|--------|
| `app/src/islands/pages/FavoriteListingsPage/components/FavoritesCardV3.jsx` | CREATE - New component |
| `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx` | MODIFY - Import and use V3 instead of V2 |

### Utilities and Helpers Available [FROM CODEBASE]
- `useDeviceDetection()` hook for responsive behavior
- `listing.coordinates` object with `lat` and `lng` properties
- Google Maps API key available via `import.meta.env.VITE_GOOGLE_MAPS_API_KEY`

---

## 4. Component Specifications

### 4.1 FavoritesCardV3 (Main Container)

**Purpose**: Horizontal card container with three sections

**Visual Specifications**:
| Property | Desktop (>1024px) | Tablet (768-1024px) | Mobile (<768px) |
|----------|-------------------|---------------------|-----------------|
| Width | 100% of grid cell | 100% of grid cell | 100% (full width) |
| Height | 160px | 150px | Auto (stacks vertically) |
| Background | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` |
| Border | `1px solid #E2E8F0` | `1px solid #E2E8F0` | `1px solid #E2E8F0` |
| Border Radius | `16px` | `14px` | `12px` |
| Box Shadow (default) | `0 1px 3px rgba(0,0,0,0.04)` | same | same |
| Box Shadow (hover) | `0 8px 24px rgba(0,0,0,0.08)` | none (touch) | none (touch) |
| Layout | `display: flex; flex-direction: row` | same | `flex-direction: column` |
| Overflow | `hidden` | `hidden` | `hidden` |
| Cursor | `pointer` | `pointer` | `pointer` |
| Transition | `all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)` | none | none |
| Transform (hover) | `translateY(-2px)` | none | none |

**Props/Variants**:
```typescript
interface FavoritesCardV3Props {
  listing: {
    id: string;
    title: string;
    location: string;
    coordinates: { lat: number; lng: number };
    images: string[];
    bedrooms: number;
    bathrooms: number;
    maxGuests: number;
    price: { starting: number };
    host?: { name: string; image?: string; verified?: boolean };
    isNew?: boolean;
  };
  onToggleFavorite: (listingId: string, title: string, newState: boolean) => void;
  onOpenCreateProposalModal: (listing: object) => void;
  onPhotoClick?: (listing: object, photoIndex: number) => void;
  proposalForListing?: { _id: string } | null;
  userId?: string;
}
```

**Accessibility**:
- Role: `article` or `div` with semantic structure
- `tabIndex={0}` for keyboard navigation
- `aria-label`: "Listing card for [title]"
- Focus visible state: `outline: 2px solid #6366F1; outline-offset: 2px`

---

### 4.2 ImageSection (Left Section)

**Purpose**: Square thumbnail image with favorite heart overlay

**Visual Specifications**:
| Property | Desktop | Tablet | Mobile |
|----------|---------|--------|--------|
| Width | `140px` | `130px` | `100%` |
| Height | `140px` | `130px` | `180px` |
| Min Width | `140px` | `130px` | `100%` |
| Aspect Ratio | `1:1` | `1:1` | `16:10` (mobile landscape) |
| Object Fit | `cover` | `cover` | `cover` |
| Border Radius | `16px 0 0 16px` | `14px 0 0 14px` | `12px 12px 0 0` |

**Image Placeholder (on error)**:
- URL: `'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400'`
- Background: `#F1F5F9`

**Favorite Heart Indicator (Overlay)**:
| Property | Value |
|----------|-------|
| Position | `absolute; top: 10px; right: 10px` |
| Size | `32px x 32px` |
| Background | `rgba(255,255,255,0.95)` |
| Border Radius | `50%` |
| Box Shadow | `0 2px 8px rgba(0,0,0,0.12)` |
| Icon Size | `16px x 16px` |
| Icon Color (filled) | `#EF4444` (red heart) |
| Hover Background | `#FFFFFF` |
| Transition | `all 0.2s ease` |

**Status Badge (Optional - Proposal Sent)**:
| Property | Value |
|----------|-------|
| Position | `absolute; top: 10px; left: 10px` |
| Padding | `4px 8px` |
| Background | `#8B5CF6` (violet) |
| Color | `#FFFFFF` |
| Font Size | `10px` |
| Font Weight | `700` |
| Text Transform | `uppercase` |
| Letter Spacing | `0.5px` |
| Border Radius | `4px` |

---

### 4.3 DetailsSection (Center Section)

**Purpose**: Listing information including title, location, amenities, price, and CTA

**Visual Specifications**:
| Property | Desktop | Tablet | Mobile |
|----------|---------|--------|--------|
| Flex | `1` | `1` | `1` |
| Padding | `16px 20px` | `14px 16px` | `16px` |
| Display | `flex` | `flex` | `flex` |
| Flex Direction | `column` | `column` | `column` |
| Justify Content | `space-between` | `space-between` | `flex-start` |
| Gap | `6px` | `5px` | `8px` |

**Sub-Components**:

#### 4.3.1 Location Text
| Property | Value |
|----------|-------|
| Font Size | `11px` |
| Font Weight | `600` |
| Color | `#6366F1` (purple accent) |
| Text Transform | `uppercase` |
| Letter Spacing | `0.5px` |
| Line Height | `1.2` |
| Max Lines | `1` |
| Overflow | `ellipsis` |
| Icon (pin) | `12px`, inline, `currentColor`, margin-right `4px` |

#### 4.3.2 Title
| Property | Value |
|----------|-------|
| Font Size | `15px` (desktop), `14px` (mobile) |
| Font Weight | `700` |
| Color | `#0F172A` |
| Line Height | `1.3` |
| Max Lines | `2` |
| Overflow | `ellipsis` |
| Display | `-webkit-box; -webkit-line-clamp: 2` |

#### 4.3.3 Amenities Row (Bed/Bath/Guests)
| Property | Value |
|----------|-------|
| Font Size | `12px` |
| Font Weight | `500` |
| Color | `#64748B` |
| Display | `flex` |
| Gap | `8px` |
| Divider | `4px` circle, `#CBD5E1` background |

#### 4.3.4 Price + CTA Row
| Property | Value |
|----------|-------|
| Display | `flex` |
| Justify Content | `space-between` |
| Align Items | `center` |
| Margin Top | `auto` |

**Price Display**:
| Property | Value |
|----------|-------|
| Price Amount Font Size | `18px` (desktop), `16px` (mobile) |
| Price Amount Font Weight | `800` |
| Price Amount Color | `#0F172A` |
| Period Text ("/night") Font Size | `12px` |
| Period Text Font Weight | `400` |
| Period Text Color | `#64748B` |

**CTA Button (Create Proposal / View Proposal)**:
| Property | Default (Create Proposal) | Secondary (View Proposal) |
|----------|---------------------------|---------------------------|
| Padding | `10px 16px` | `10px 16px` |
| Min Height | `44px` | `44px` |
| Border Radius | `10px` | `10px` |
| Font Size | `13px` | `13px` |
| Font Weight | `700` | `700` |
| Background | `#6366F1` | `#EEF2FF` |
| Color | `#FFFFFF` | `#6366F1` |
| Border | `none` | `none` |
| Box Shadow | `0 2px 8px rgba(99,102,241,0.2)` | `none` |
| Hover Background | `#4F46E5` | `#E0E7FF` |
| Transition | `all 0.2s ease` | `all 0.2s ease` |

---

### 4.4 MapSection (Right Section)

**Purpose**: Mini map showing listing location with a single pin marker

**Visual Specifications**:
| Property | Desktop | Tablet | Mobile |
|----------|---------|--------|--------|
| Width | `140px` | `120px` | `HIDDEN` |
| Height | `100%` | `100%` | `N/A` |
| Min Width | `140px` | `120px` | `N/A` |
| Display | `block` | `block` | `none` |
| Border Radius | `0 16px 16px 0` | `0 14px 14px 0` | `N/A` |
| Overflow | `hidden` | `hidden` | `N/A` |

**Mini Map Implementation Options**:

#### Option A: Google Static Maps API (RECOMMENDED)
| Property | Value |
|----------|-------|
| URL Template | `https://maps.googleapis.com/maps/api/staticmap?center={lat},{lng}&zoom=14&size=280x320&scale=2&maptype=roadmap&markers=color:0x6366F1|{lat},{lng}&style=feature:all|element:labels|visibility:simplified&style=feature:poi|visibility:off&key={API_KEY}` |
| Size | `280x320` (2x for retina: `scale=2`) |
| Zoom | `14` (neighborhood level) |
| Marker Color | `0x6366F1` (purple, hex without #) |
| Map Styling | Simplified labels, POI off for cleaner look |
| Loading | `loading="lazy"` |
| Alt | "Map showing location of [title]" |

[SUGGESTED] **Performance Optimization**:
- Use `loading="lazy"` for images outside viewport
- Consider caching static map URLs in memory
- Fallback to placeholder if coordinates are missing

#### Option B: Embedded Google Maps Lite (Alternative)
- Not recommended due to performance overhead
- Each card would initialize a separate map instance

**Map Placeholder (if no coordinates)**:
| Property | Value |
|----------|-------|
| Background | `#F1F5F9` |
| Icon | Location pin, `32px`, `#CBD5E1` |
| Text | "Map not available" |
| Font Size | `10px` |
| Color | `#94A3B8` |

---

## 5. Layout & Composition

### Desktop Layout (>1024px)
```
┌────────────────────────────────────────────────────────────────────┐
│  ┌──────────┐  ┌────────────────────────────────┐  ┌──────────┐   │
│  │          │  │  UPPER WEST SIDE, MANHATTAN     │  │          │   │
│  │  IMAGE   │  │  Luxury 2BR with Park Views     │  │   MINI   │   │
│  │          │  │  2 bed • 1 bath • 4 guests      │  │    MAP   │   │
│  │  140x140 │  │  ────────────────────────────   │  │          │   │
│  │          │  │  $180/night    [Create Proposal]│  │  140xFull│   │
│  └──────────┘  └────────────────────────────────┘  └──────────┘   │
└────────────────────────────────────────────────────────────────────┘
      140px                    flex: 1                   140px
```

### Mobile Layout (<768px)
```
┌─────────────────────────────────┐
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │         IMAGE             │  │
│  │       (full width)        │  │
│  │         180px h           │  │
│  └───────────────────────────┘  │
│                                 │
│  UPPER WEST SIDE, MANHATTAN     │
│  Luxury 2BR with Park Views     │
│  2 bed • 1 bath • 4 guests      │
│  ─────────────────────────────  │
│  $180/night   [Create Proposal] │
│                                 │
└─────────────────────────────────┘
         (Map hidden on mobile)
```

### Z-Index Layering
| Layer | Z-Index | Content |
|-------|---------|---------|
| Base | 0 | Card container |
| Image | 1 | Thumbnail image |
| Overlays | 10 | Heart button, status badge |
| Popup | 100 | Confirm removal popup |

---

## 6. Interactions & Animations

### Card Hover (Desktop Only)
| Property | Start | End | Duration | Easing |
|----------|-------|-----|----------|--------|
| Transform | `translateY(0)` | `translateY(-2px)` | `300ms` | `cubic-bezier(0.25, 0.1, 0.25, 1)` |
| Box Shadow | `0 1px 3px rgba(0,0,0,0.04)` | `0 8px 24px rgba(0,0,0,0.08)` | `300ms` | same |

### Favorite Heart Click
| Phase | Animation |
|-------|-----------|
| Click | Scale to `0.9` (50ms), back to `1.0` (150ms) |
| Fill Change | Color transition `200ms` ease |
| Confirm Popup | Fade in + slide down from heart button |

### CTA Button Hover
| Property | Default | Hover |
|----------|---------|-------|
| Background | `#6366F1` | `#4F46E5` |
| Transform | none | `scale(1.02)` |

### CTA Button Active (Press)
| Property | Value |
|----------|-------|
| Transform | `scale(0.98)` |
| Transition | `50ms ease` |

---

## 7. Assets Required

### Icons (SVG Inline)
| Icon | Usage | Size | Source |
|------|-------|------|--------|
| Heart (filled) | Favorite indicator | 16x16 | Already in FavoritesCardV2 |
| Heart (outline) | Unfavorited state | 16x16 | Already in FavoritesCardV2 |
| Location Pin | Location text prefix | 12x12 | Already in FavoritesCardV2 |

### Images
- None required (listing images from props, map from Google Static API)

### Fonts
- Inter (already loaded in project)
- System font stack fallback: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`

---

## 8. Implementation Sequence

### Phase 1: Core Structure
1. Create `FavoritesCardV3.jsx` file
2. Set up component skeleton with props interface
3. Implement main container styles with responsive detection

### Phase 2: Image Section
4. Implement ImageSection with thumbnail display
5. Add error handling and placeholder
6. Port FavoriteButtonWithConfirm from V2
7. Add status badge (Proposal Sent / New)

### Phase 3: Details Section
8. Implement location text with icon
9. Implement title with line clamping
10. Implement amenities row (bed/bath/guests)
11. Implement price display
12. Implement CTA button with variants

### Phase 4: Map Section
13. Build Google Static Maps URL generator utility
14. Implement MapSection with static map image
15. Add loading="lazy" and error handling
16. Add placeholder for missing coordinates

### Phase 5: Interactions
17. Add hover animations (desktop only via isTouchDevice)
18. Wire up onClick handlers
19. Add keyboard accessibility (focus states, Enter key)

### Phase 6: Responsive Behavior
20. Test and refine tablet breakpoint (768-1024px)
21. Test and refine mobile breakpoint (<768px)
22. Verify touch target sizes on mobile

### Phase 7: Integration
23. Update ListingsGridV2 in FavoriteListingsPage to use V3
24. Test with real listing data
25. Verify proposal state handling

---

## 9. Assumptions & Clarifications Needed

### Assumptions Made [SUGGESTED]
1. **Map API Key**: Assuming `VITE_GOOGLE_MAPS_API_KEY` is already configured and has Static Maps API enabled
2. **Coordinates Available**: Assuming `listing.coordinates` is always present (current page already filters out listings without coordinates)
3. **Gold Accent**: User mentioned "purple or gold" - will use purple (#6366F1) as primary since it's already the brand color. Gold can be added as an optional theme variant if requested.
4. **Map Hidden on Mobile**: Assuming map should be hidden on mobile to save space (per user's mobile considerations note)

### Questions for User [NEEDS CLARIFICATION]
1. **Photo Gallery**: Should clicking the image open the fullscreen photo gallery (like V2), or navigate to listing detail page?
2. **Gold Accent Usage**: Should gold be used anywhere, or stick with purple only?
3. **Card Height Flexibility**: Is 160px fixed height acceptable, or should it grow with content if title wraps to 3+ lines?
4. **Map Interactivity**: Should the mini-map be clickable to open the listing, or purely decorative?

---

## 10. Color Palette Reference

### Primary Colors
| Name | Hex | Usage |
|------|-----|-------|
| Purple (Primary) | `#6366F1` | Accents, CTA, location text, map marker |
| Purple Dark | `#4F46E5` | Hover states |
| Purple Light | `#EEF2FF` | Secondary button background |
| Purple Lighter | `#E0E7FF` | Secondary button hover |

### Neutral Colors
| Name | Hex | Usage |
|------|-----|-------|
| Text Dark | `#0F172A` | Titles, prices |
| Text Medium | `#64748B` | Amenities, period text |
| Text Light | `#94A3B8` | Placeholder text |
| Border | `#E2E8F0` | Card border |
| Background | `#FFFFFF` | Card background |
| Placeholder BG | `#F1F5F9` | Image/map placeholder |

### Semantic Colors
| Name | Hex | Usage |
|------|-----|-------|
| Success | `#10B981` | (Available for future use) |
| Error/Favorite | `#EF4444` | Heart icon filled |
| Proposal Badge | `#8B5CF6` | "Proposal Sent" badge |

---

## 11. Google Static Maps URL Builder

### Function Signature [SUGGESTED]
```javascript
/**
 * Builds a Google Static Maps URL for mini-map display
 * @param {Object} params
 * @param {number} params.lat - Latitude
 * @param {number} params.lng - Longitude
 * @param {number} [params.width=280] - Image width (before scale)
 * @param {number} [params.height=320] - Image height (before scale)
 * @param {number} [params.zoom=14] - Map zoom level
 * @returns {string} Full Google Static Maps URL
 */
function buildStaticMapUrl({ lat, lng, width = 280, height = 320, zoom = 14 }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const markerColor = '6366F1'; // Purple without #

  // Minimal styling for clean appearance
  const styles = [
    'feature:poi|visibility:off',           // Hide points of interest
    'feature:transit|visibility:off',        // Hide transit
    'feature:road|element:labels|visibility:simplified'  // Simplified road labels
  ].map(s => `&style=${encodeURIComponent(s)}`).join('');

  return `https://maps.googleapis.com/maps/api/staticmap?`
    + `center=${lat},${lng}`
    + `&zoom=${zoom}`
    + `&size=${width}x${height}`
    + `&scale=2`  // Retina display
    + `&maptype=roadmap`
    + `&markers=color:0x${markerColor}|${lat},${lng}`
    + styles
    + `&key=${apiKey}`;
}
```

---

## 12. Responsive Breakpoint Summary

| Breakpoint | Width Range | Layout | Map Visible | Card Height |
|------------|-------------|--------|-------------|-------------|
| Desktop | >1024px | Horizontal (3 sections) | Yes (140px) | 160px |
| Tablet | 768-1024px | Horizontal (3 sections) | Yes (120px) | 150px |
| Mobile | <768px | Vertical (2 sections) | No | Auto |
| Small Mobile | <480px | Vertical (2 sections) | No | Auto |

---

## 13. Memo Configuration

```javascript
export default memo(FavoritesCardV3, (prevProps, nextProps) => {
  return (
    prevProps.listing?.id === nextProps.listing?.id &&
    prevProps.proposalForListing?._id === nextProps.proposalForListing?._id &&
    prevProps.userId === nextProps.userId
  );
});
```

---

**Plan Version**: 1.0
**Created**: 2026-01-27
**Author**: Design Planner Agent
**Status**: Ready for Implementation
