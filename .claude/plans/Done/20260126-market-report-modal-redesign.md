# Implementation Plan: Market Report Modal Redesign

**Created**: 2026-01-26
**Status**: Ready for Implementation
**Classification**: BUILD (UI Redesign)

---

## Overview

Update the `AiSignupMarketReport` modal to conform to the `POPUP_REPLICATION_PROTOCOL.md` design system. The current implementation has significant style deviations from the standardized popup design.

---

## Current State Analysis (from Screenshot)

The screenshot shows the modal in its current state with the following elements:
- **Header**: Package/box icon + "Market Research for Lodging, Storage, Transport, Restaurants and more" title + X close button
- **Body**:
  - "Describe your unique logistics needs in your own words" instruction
  - Textarea with placeholder example text
  - Topic chips: Schedule, Patterns, Commute, Location, Needs, About You, Storage
  - Helper text: "💡 Include your email and phone number for faster processing"
- **Footer**: Purple "Next" button

---

## Design Protocol Requirements

### 1. **Core Architecture** (Section 1)
| Requirement | Current State | Action Needed |
|-------------|--------------|---------------|
| Flexbox layout with fixed Header/Footer | Partial | Restructure to proper flex container |
| Mobile bottom-sheet mode (<480px) | ❌ Missing | Add slide-up animation + border-radius change |
| Max-height 92vh | 90vh used | Update to 92vh |
| Body overflow-y: auto | ✅ Yes | Keep |

### 2. **Color Scheme** (Section 2)
| Requirement | Current State | Action Needed |
|-------------|--------------|---------------|
| Primary Purple: #31135D | ✅ Used | Keep |
| Topic chips use GREEN for detected | ❌ Uses #c6f6d5 (green) | Change to #5B5FCF (Positive Purple) |
| Light Purple Background: #F7F2FA | ❌ Uses #f7fafc (gray) | Update topic chips undetected bg |
| NO GREEN anywhere | ❌ Green checkmarks/bg | Replace all green with purple tones |

### 3. **Iconography** (Section 3)
| Requirement | Current State | Action Needed |
|-------------|--------------|---------------|
| Feather icons | ✅ Package icon used | Keep |
| Stroke: #31135D, no fill | ✅ Correct | Keep |
| Close button: 32×32px, strokeWidth 2.5 | ❌ Uses "×" character | Replace with proper Feather X icon |
| Inline SVG dimensions required | Partial | Add explicit width/height attributes |

### 4. **Component Specifications** (Section 4)

#### A. Modal Header
| Requirement | Current State | Action Needed |
|-------------|--------------|---------------|
| Height reduced 25% | Standard height | Reduce padding from 24px to 16px |
| Mobile title: 18px, weight 400 | 16px/600 on mobile | Update typography |
| Icon + Title flex center aligned | ✅ Yes | Keep |
| Mobile grab handle (36x4px, #E7E0EC) | ❌ Missing | Add for mobile |

#### B. Button Variants
| Requirement | Current State | Action Needed |
|-------------|--------------|---------------|
| Border-radius: 100px (pill) | Uses 8px | Change to 100px |
| Primary: bg #31135D, text white | ✅ Correct colors | Update radius |
| Ghost buttons for Back | Uses solid gray | Change to ghost style |

#### C. Info Banners
| Requirement | Current State | Action Needed |
|-------------|--------------|---------------|
| Background: #F7F2FA | ❌ Not implemented | Add info banner styling |
| Border: 1px solid #E7E0EC | ❌ Not implemented | Add border |
| Solid purple circle icon with white exclamation | Uses 💡 emoji | Replace with proper icon |

#### E. Vertical Rhythm & Spacing
| Requirement | Current State | Action Needed |
|-------------|--------------|---------------|
| Use 8px/16px/24px scale | Various non-standard | Standardize all gaps |
| Header/Footer equal padding (16px) | 24px header, 16px footer | Align both to 16px |
| Section gaps: 8px between forms | 16px used | Update to 8px |

---

## Implementation Steps

### Step 1: Update CSS Structure & Core Layout
**File**: `app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx`

**Changes**:
1. Update `.ai-signup-modal` to use `display: flex; flex-direction: column; max-height: 92vh;`
2. Add `.modal-body { overflow-y: auto; flex-grow: 1; }` class
3. Header and footer get `flex-shrink: 0;`
4. Add mobile slide-up animation and bottom-sheet styles

### Step 2: Update Color Scheme
**File**: `app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx`

**Changes**:
1. Replace all green colors in topic chips:
   - `.topic-detected` background: `#c6f6d5` → `#F7F2FA` (light purple)
   - `.topic-detected` border: `#68d391` → `#5B5FCF` (positive purple)
   - `.topic-detected` text: `#22543d` → `#31135D` (primary purple)
   - `.topic-checkmark` color: `#38a169` → `#5B5FCF`
2. Update undetected topic chip background from `#f7fafc` to `#F7F2FA`

### Step 3: Update Close Button to Feather Icon
**File**: `app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx`

**Changes**:
Replace the `×` character close button with proper Feather X icon:
```jsx
<button className="ai-signup-close-button" onClick={onClose} aria-label="Close modal">
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
</button>
```

### Step 4: Update Button Styles to Pill Shape
**File**: `app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx`

**Changes**:
1. Change `.nav-next-button` border-radius from `8px` to `100px`
2. Change `.nav-back-button` to ghost style:
   - `background: transparent`
   - `border: 1px solid #E7E0EC`
   - `color: #49454F`

### Step 5: Add Mobile Bottom-Sheet Behavior
**File**: `app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx`

**Changes**:
1. Add mobile grab handle element to header:
```jsx
<div className="modal-grab-handle" />
```

2. Add CSS for mobile behavior:
```css
@media (max-width: 480px) {
  .ai-signup-overlay {
    align-items: flex-end;
    padding: 0;
  }
  .ai-signup-modal {
    border-radius: 24px 24px 0 0;
    animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    max-width: 100%;
  }
  .modal-grab-handle {
    display: block;
    width: 36px;
    height: 4px;
    background: #E7E0EC;
    border-radius: 2px;
    margin: 8px auto 0;
  }
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
```

### Step 6: Update Header Styling
**File**: `app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx`

**Changes**:
1. Reduce header padding from `24px` to `16px`
2. Update mobile title to `18px` weight `400`
3. Align icon and title with flex center

### Step 7: Update Info Banner (Helper Text)
**File**: `app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx`

**Changes**:
1. Replace emoji helper text with proper info banner styling:
```jsx
<div className="info-banner">
  <div className="info-banner-icon">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="#31135D" stroke="none">
      <circle cx="12" cy="12" r="10" />
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">!</text>
    </svg>
  </div>
  <span>Include your email and phone number for faster processing</span>
</div>
```

2. Add CSS:
```css
.info-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #F7F2FA;
  border: 1px solid #E7E0EC;
  border-radius: 8px;
}
```

### Step 8: Standardize Vertical Rhythm
**File**: `app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx`

**Changes**:
1. Content padding: `16px` (was 24px)
2. Section gaps: `8px` (was 16px for some)
3. Footer padding: `16px` (already correct)
4. Header padding: `16px` (was 24px)

---

## Files to Modify

| File | Changes |
|------|---------|
| `app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx` | All CSS updates (inline styles) |

---

## Visual Comparison

### Before (Current)
- Green topic chip highlights
- Square buttons (8px radius)
- No mobile bottom-sheet behavior
- Character-based close button
- Non-standard spacing

### After (Protocol-Compliant)
- Purple topic chip highlights (#F7F2FA bg, #5B5FCF border)
- Pill-shaped buttons (100px radius)
- Mobile bottom-sheet with slide-up animation
- Feather X icon close button (32×32, strokeWidth 2.5)
- Standardized 8/16/24px spacing scale

---

## Testing Checklist

- [ ] Desktop modal displays centered with proper styling
- [ ] Mobile modal slides up from bottom with grab handle
- [ ] Topic chips use purple tones (no green)
- [ ] Close button is proper Feather X icon
- [ ] Buttons have pill shape (100px radius)
- [ ] Back button uses ghost style
- [ ] Spacing follows 8/16/24px scale
- [ ] Info banner has proper styling (no emoji)
- [ ] All interactive states work correctly
- [ ] ESC key still closes modal
- [ ] Overlay click still closes modal

---

## References

- **Design Protocol**: `C:\Users\Split Lease\My Drive (splitleaseteam@gmail.com)\_Agent Context and Tools\SL22\Design\2026\Ongoing Projects\pop up redesign\POPUP_REPLICATION_PROTOCOL.md`
- **Current Component**: `app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx`
