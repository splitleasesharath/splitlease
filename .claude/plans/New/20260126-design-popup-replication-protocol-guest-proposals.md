# Design Implementation Plan: POPUP_REPLICATION_PROTOCOL for Guest Proposals Page

## 1. Overview

- **What's being implemented**: Applying the POPUP_REPLICATION_PROTOCOL design system to all 7 modals on the Guest Proposals page
- **User's original vision**: Consistent modal styling following a strict monochromatic purple design system with mobile bottom-sheet behavior
- **Scope boundaries**:
  - **IS included**: HostProfileModal, GuestEditingProposalModal, CancelProposalModal, CompareTermsModal, NotInterestedModal, FullscreenProposalMapModal, VirtualMeetingManager (and its sub-components)
  - **IS NOT included**: Modals on other pages, global toast/notification styling, non-modal UI elements

---

## 2. Reference Analysis: POPUP_REPLICATION_PROTOCOL

### 2.1 Core Structure
```
[FROM REFERENCE] Modal Layout:
- Flexbox container with flex-direction: column
- Header: Fixed height (reduced 25% from legacy)
- Body: flex: 1, overflow-y: auto (scrollable)
- Footer: Fixed height, never scrolls
- Max-height: 92vh
```

### 2.2 Color Palette (STRICT - NO EXCEPTIONS)
| Token | Value | Usage |
|-------|-------|-------|
| `--protocol-primary` | #31135D | Text, icons, borders |
| `--protocol-action` | #5B5FCF | Primary action buttons, links |
| `--protocol-secondary` | #6D31C2 | Secondary accents |
| `--protocol-surface` | #F7F2FA | Light purple backgrounds |
| `--protocol-danger` | #DC3545 | Destructive actions (OUTLINED ONLY) |
| `--protocol-white` | #FFFFFF | Modal background, button text on filled |
| `--protocol-overlay` | rgba(0, 0, 0, 0.5) | Backdrop |

**FORBIDDEN COLORS**: Green (#22C55E, #16a34a, etc.), Yellow (#FEF3C7, etc.), Blue (#3b82f6, etc.)

### 2.3 Button Specifications
```
[FROM REFERENCE] All Buttons:
- border-radius: 100px (pill-shaped, ALWAYS)
- padding: 12px 24px
- font-weight: 600
- transition: all 0.2s ease

Primary Button:
- background: #5B5FCF
- color: #FFFFFF
- border: none

Secondary/Outline Button:
- background: transparent
- color: #31135D
- border: 2px solid #31135D

Danger Button (OUTLINED ONLY):
- background: transparent
- color: #DC3545
- border: 2px solid #DC3545
```

### 2.4 Mobile Bottom Sheet Behavior
```
[FROM REFERENCE] @media (max-width: 480px):
- Modal transforms to bottom sheet
- Position: fixed, bottom: 0, left: 0, right: 0
- border-radius: 24px 24px 0 0 (top corners only)
- Animation: slide-up from bottom
- Grab handle: 36px x 4px centered bar at top
- Header title: 18px, font-weight: 400 (NOT bold)
```

### 2.5 Iconography
```
[FROM REFERENCE] Feather Icons ONLY:
- stroke: #31135D
- stroke-width: 2
- fill: none (NEVER fill icons)
- Size: 20px default, 24px for prominent actions
```

### 2.6 Spacing Scale (STRICT)
```
[FROM REFERENCE] Only these values allowed:
- 8px (small gaps, icon margins)
- 16px (standard padding, section gaps)
- 24px (large padding, header/footer padding)
```

---

## 3. Existing Codebase Integration

### 3.1 Relevant Existing Components
| Component | Path | Notes |
|-----------|------|-------|
| Portal utility | createPortal from 'react-dom' | Already used by most modals |
| Feather Icons | react-feather | Already in project dependencies |
| CSS Variables | app/src/styles/variables.css | Will ADD protocol tokens here |

### 3.2 Existing Styling Patterns to Follow
- [FROM CODEBASE] Component-scoped CSS with kebab-case class names
- [FROM CODEBASE] CSS variables referenced via `var(--token-name)`
- [FROM CODEBASE] Component prefix pattern (e.g., `.gep-*` for GuestEditingProposalModal)

### 3.3 Files That Will Be Modified

#### CSS Files (Existing)
| File | Current Lines | Changes |
|------|---------------|---------|
| `app/src/styles/variables.css` | ~300 | Add POPUP_REPLICATION_PROTOCOL tokens |
| `app/src/styles/components/modal.css` | ~120 | Add shared protocol base classes |
| `app/src/islands/modals/host-profile-modal.css` | ~200 | Full rewrite to protocol |
| `app/src/islands/modals/GuestEditingProposalModal.css` | ~1617 | Heavy modifications |
| `app/src/islands/modals/CompareTermsModal.css` | ~400 | Full rewrite to protocol |
| `app/src/islands/modals/FullscreenProposalMapModal.css` | ~150 | Modifications for protocol |
| `app/src/islands/shared/VirtualMeetingManager/VirtualMeetingManager.css` | ~780 | Heavy modifications |
| `app/src/islands/shared/VirtualMeetingManager/BookTimeSlot.css` | ~250 | Color/spacing updates |

#### JSX Files (Structure changes)
| File | Current Lines | Changes |
|------|---------------|---------|
| `app/src/islands/modals/HostProfileModal.jsx` | ~180 | Add protocol classes, mobile structure |
| `app/src/islands/modals/GuestEditingProposalModal.jsx` | ~1281 | Update icon imports, class structure |
| `app/src/islands/modals/CancelProposalModal.jsx` | ~363 | Replace inline styles with protocol classes |
| `app/src/islands/modals/CompareTermsModal.jsx` | ~450 | Update structure, remove green/blue |
| `app/src/islands/shared/SuggestedProposals/components/NotInterestedModal.jsx` | ~150 | Replace inline styles, add CSS file |
| `app/src/islands/modals/FullscreenProposalMapModal.jsx` | ~200 | Add bottom sheet mobile behavior |
| `app/src/islands/shared/VirtualMeetingManager/VirtualMeetingManager.jsx` | ~265 | Update classes, icon changes |
| `app/src/islands/shared/VirtualMeetingManager/RespondToVMRequest.jsx` | ~177 | Icon/class updates |
| `app/src/islands/shared/VirtualMeetingManager/BookVirtualMeeting.jsx` | ~125 | Class updates |
| `app/src/islands/shared/VirtualMeetingManager/CancelVirtualMeetings.jsx` | ~118 | Danger button styling |
| `app/src/islands/shared/VirtualMeetingManager/DetailsOfProposalAndVM.jsx` | ~171 | Class updates |

#### New Files to Create
| File | Purpose |
|------|---------|
| `app/src/islands/shared/SuggestedProposals/components/NotInterestedModal.css` | Extracted styles for NotInterestedModal |
| `app/src/styles/components/protocol-modal.css` | Shared protocol modal base classes |

---

## 4. Component Specifications

### 4.1 Shared Protocol Modal Base (NEW FILE)

**Purpose**: Provide reusable base classes for all protocol-compliant modals

**File**: `app/src/styles/components/protocol-modal.css`

```css
/* Visual Specifications */

/* Overlay */
.protocol-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 16px;
}

/* Container */
.protocol-modal {
  background: #FFFFFF;
  border-radius: 16px;
  max-height: 92vh;
  width: 100%;
  max-width: 480px; /* Default, can override */
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

/* Header */
.protocol-header {
  padding: 16px 24px;
  border-bottom: 1px solid #F7F2FA;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.protocol-title {
  font-size: 20px;
  font-weight: 600;
  color: #31135D;
  margin: 0;
}

.protocol-close-btn {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: #31135D;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s ease;
}

.protocol-close-btn:hover {
  background: #F7F2FA;
}

/* Body */
.protocol-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

/* Footer */
.protocol-footer {
  padding: 16px 24px;
  border-top: 1px solid #F7F2FA;
  display: flex;
  gap: 16px;
  justify-content: flex-end;
  flex-shrink: 0;
}

/* Buttons */
.protocol-btn {
  border-radius: 100px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.protocol-btn-primary {
  background: #5B5FCF;
  color: #FFFFFF;
  border: none;
}

.protocol-btn-primary:hover {
  background: #4A4EBF;
}

.protocol-btn-primary:disabled {
  background: #B8BAE0;
  cursor: not-allowed;
}

.protocol-btn-secondary {
  background: transparent;
  color: #31135D;
  border: 2px solid #31135D;
}

.protocol-btn-secondary:hover {
  background: #F7F2FA;
}

.protocol-btn-danger {
  background: transparent;
  color: #DC3545;
  border: 2px solid #DC3545;
}

.protocol-btn-danger:hover {
  background: rgba(220, 53, 69, 0.1);
}

/* Grab Handle (Mobile) */
.protocol-grab-handle {
  display: none;
  width: 36px;
  height: 4px;
  background: #D1D5DB;
  border-radius: 2px;
  margin: 8px auto;
}

/* Mobile Bottom Sheet */
@media (max-width: 480px) {
  .protocol-overlay {
    align-items: flex-end;
    padding: 0;
  }

  .protocol-modal {
    border-radius: 24px 24px 0 0;
    max-width: 100%;
    max-height: 90vh;
    animation: slideUp 0.3s ease-out;
  }

  .protocol-grab-handle {
    display: block;
  }

  .protocol-header {
    padding: 8px 24px 16px;
  }

  .protocol-title {
    font-size: 18px;
    font-weight: 400;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
```

**Props/Variants**: Base classes only, extended by each modal

**Accessibility**:
- Overlay click to close (handled by each modal)
- ESC key handling (handled by each modal)
- Focus trap (to be implemented per modal)

---

### 4.2 HostProfileModal

**Purpose**: Display host profile information and verification badges

**File**: `app/src/islands/modals/HostProfileModal.jsx`

**Current State Analysis**:
- [FROM CODEBASE] Uses external CSS file with `--gp-*` variables
- [FROM CODEBASE] Uses green (#22C55E) for verified badges
- [FROM CODEBASE] Uses 16px border-radius
- [FROM CODEBASE] No mobile bottom sheet behavior

**Required Changes**:

| Element | Current | Target |
|---------|---------|--------|
| Container border-radius | 16px | 16px (desktop), 24px 24px 0 0 (mobile) |
| Verified badge color | Green #22C55E | Purple #5B5FCF |
| Badge icon background | Green/Red | Purple #F7F2FA |
| Close button | Blue outlined | Protocol close (X icon, no border) |
| CTA button radius | 10px | 100px (pill) |
| Mobile behavior | None | Bottom sheet slide-up |

**Visual Specifications**:

```
Header:
- Height: 56px
- Padding: 16px 24px
- Title: "Host Profile", 20px, #31135D, weight 600
- Close: X icon (Feather), 24px, #31135D

Body:
- Padding: 24px
- Profile photo: 80px x 80px, border-radius: 50%
- Name: 24px, #31135D, weight 600, margin-bottom: 8px
- Verification badges: Inline flex, gap: 8px
  - Badge background: #F7F2FA
  - Badge border-radius: 100px
  - Badge text: 14px, #31135D
  - Badge icon: 16px, stroke #5B5FCF

Footer:
- Padding: 16px 24px
- "Contact Host" button: protocol-btn-primary
```

**Props/Variants**:
- `isOpen` (boolean)
- `onClose` (function)
- `host` (object with name, photo, verifications)

**Accessibility**:
- role="dialog"
- aria-labelledby pointing to title
- Focus trap within modal

---

### 4.3 GuestEditingProposalModal

**Purpose**: Multi-step modal for editing proposal details (dates, pricing, schedule)

**File**: `app/src/islands/modals/GuestEditingProposalModal.jsx`

**Current State Analysis**:
- [FROM CODEBASE] Complex 4-view state machine: 'pristine' | 'editing' | 'general' | 'cancel'
- [FROM CODEBASE] Uses #6B4EFF surface color (should be #F7F2FA)
- [FROM CODEBASE] Uses 10px border-radius buttons (should be 100px)
- [FROM CODEBASE] 1617 lines of CSS with extensive custom styling
- [FROM CODEBASE] Already has some purple theme but wrong shades

**Required Changes**:

| Element | Current | Target |
|---------|---------|--------|
| Surface backgrounds | #6B4EFF/10 | #F7F2FA |
| Button radius | 10px | 100px |
| Primary button | #5C20B6 | #5B5FCF |
| Danger button | Solid red | Outlined #DC3545 |
| Section headers | 18px bold | 18px weight 600, #31135D |
| Day selector buttons | Custom purple | Protocol secondary when selected |
| Price breakdown | Various colors | #31135D text, #5B5FCF for totals |
| Mobile behavior | Centered modal | Bottom sheet |

**Visual Specifications**:

```
Header (All Views):
- Height: 56px
- Padding: 16px 24px
- Back button (when applicable): ChevronLeft icon, 24px
- Title: View-specific, 20px, #31135D, weight 600
- Close: X icon, 24px, #31135D

Body (Scrollable):
- Padding: 24px
- Sections separated by 24px gap

Day Selector:
- 7-column grid
- Day button size: 40px x 40px
- Unselected: background transparent, border 1px #31135D
- Selected: background #5B5FCF, color white
- All buttons: border-radius 8px (exception to pill rule for grid layout)

Price Breakdown:
- Background: #F7F2FA
- Padding: 16px
- Border-radius: 8px
- Line items: 14px, #31135D
- Total: 16px, weight 600, #31135D

Footer:
- Padding: 16px 24px
- Cancel: protocol-btn-secondary
- Save: protocol-btn-primary
```

**Props/Variants**:
- Views: pristine, editing, general, cancel
- Each view has different header title and button configuration

**Accessibility**:
- ARIA live regions for price updates
- Focus management on view transitions

---

### 4.4 CancelProposalModal

**Purpose**: Confirmation dialog for canceling a proposal

**File**: `app/src/islands/modals/CancelProposalModal.jsx`

**Current State Analysis**:
- [FROM CODEBASE] Uses inline styles exclusively (no CSS file)
- [FROM CODEBASE] Uses solid red button #b91c1c (should be outlined)
- [FROM CODEBASE] Uses 6px border-radius (should be 100px)
- [FROM CODEBASE] No mobile bottom sheet behavior

**Required Changes**:

| Element | Current | Target |
|---------|---------|--------|
| All inline styles | Inline | CSS classes |
| Confirm button | Solid red #b91c1c | Outlined #DC3545 |
| Cancel button | Gray outlined | protocol-btn-secondary |
| Button radius | 6px | 100px |
| Warning icon | Alert triangle (if any) | AlertTriangle from Feather, stroke #DC3545 |
| Mobile behavior | Centered | Bottom sheet |

**Visual Specifications**:

```
Header:
- Height: 56px
- Padding: 16px 24px
- Title: "Cancel Proposal", 20px, #31135D, weight 600
- Close: X icon, 24px, #31135D

Body:
- Padding: 24px
- Warning icon: AlertTriangle, 48px, stroke #DC3545, stroke-width 2
- Warning text: 16px, #31135D, text-align center
- Listing info card (if shown):
  - Background: #F7F2FA
  - Padding: 16px
  - Border-radius: 8px

Footer:
- Padding: 16px 24px
- "Keep Proposal": protocol-btn-secondary
- "Cancel Proposal": protocol-btn-danger
```

**Props/Variants**:
- `isOpen` (boolean)
- `onClose` (function)
- `onConfirm` (function)
- `proposalDetails` (object)

**Accessibility**:
- role="alertdialog"
- aria-describedby pointing to warning text
- Focus on cancel button by default (safe action)

---

### 4.5 CompareTermsModal

**Purpose**: Side-by-side comparison of proposal terms (original vs suggested)

**File**: `app/src/islands/modals/CompareTermsModal.jsx`

**Current State Analysis**:
- [FROM CODEBASE] Uses green #16a34a for accept button and "better" highlights
- [FROM CODEBASE] Uses blue #3b82f6 for close button
- [FROM CODEBASE] Has good structure but wrong colors
- [FROM CODEBASE] Blocks ESC key (intentional)

**Required Changes**:

| Element | Current | Target |
|---------|---------|--------|
| Accept button | Solid green #16a34a | protocol-btn-primary #5B5FCF |
| Close button | Solid blue #3b82f6 | protocol-btn-secondary |
| "Better" highlights | Green text/background | #5B5FCF text, #F7F2FA background |
| "Worse" highlights | Red text/background | #DC3545 text, rgba(220,53,69,0.1) background |
| Comparison cards | White with shadow | #F7F2FA background |
| Mobile behavior | Two columns | Stack vertically, bottom sheet |

**Visual Specifications**:

```
Header:
- Height: 56px
- Padding: 16px 24px
- Title: "Compare Terms", 20px, #31135D, weight 600
- Close: X icon, 24px, #31135D

Body:
- Padding: 24px
- Two-column layout (desktop): gap 24px
- Single column (mobile < 480px): stack vertically

Comparison Card:
- Background: #F7F2FA
- Padding: 16px
- Border-radius: 8px
- Card title: 14px, #6D31C2, weight 600, uppercase
- Value: 20px, #31135D, weight 600

Change Indicator:
- Improved: #5B5FCF text, small arrow up icon
- Worsened: #DC3545 text, small arrow down icon
- Unchanged: #31135D text

Footer:
- Padding: 16px 24px
- "Decline": protocol-btn-secondary
- "Accept Terms": protocol-btn-primary
```

**Props/Variants**:
- `originalTerms` (object)
- `suggestedTerms` (object)
- `onAccept` (function)
- `onDecline` (function)

**Accessibility**:
- Comparison values marked with aria-label describing change direction
- Screen reader announces "improved by X" or "increased by X"

---

### 4.6 NotInterestedModal

**Purpose**: Collect feedback when guest declines a suggested proposal

**File**: `app/src/islands/shared/SuggestedProposals/components/NotInterestedModal.jsx`

**Current State Analysis**:
- [FROM CODEBASE] Uses inline styles exclusively
- [FROM CODEBASE] Uses yellow #FEF3C7 for icon background (FORBIDDEN)
- [FROM CODEBASE] Uses gray #6B7280 for confirm button (should be purple)
- [FROM CODEBASE] No CSS file exists

**Required Changes**:

| Element | Current | Target |
|---------|---------|--------|
| All inline styles | Inline | New CSS file |
| Icon background | Yellow #FEF3C7 | Purple #F7F2FA |
| Confirm button | Gray #6B7280 | protocol-btn-primary #5B5FCF |
| Cancel button | White outlined | protocol-btn-secondary |
| Feedback options | Checkbox list | Radio buttons with protocol styling |
| Mobile behavior | Centered | Bottom sheet |

**Visual Specifications**:

```
Header:
- Height: 56px
- Padding: 16px 24px
- Title: "Not Interested?", 20px, #31135D, weight 600
- Close: X icon, 24px, #31135D

Body:
- Padding: 24px
- Icon: MessageCircle from Feather, 32px, stroke #31135D
- Icon container: 64px x 64px, background #F7F2FA, border-radius 50%
- Prompt text: 16px, #31135D, margin: 16px 0 24px

Feedback Options:
- Radio button group
- Option padding: 12px 16px
- Option border: 1px solid #E5E7EB
- Option border-radius: 8px
- Selected option: border 2px solid #5B5FCF, background #F7F2FA
- Option text: 14px, #31135D

Footer:
- Padding: 16px 24px
- "Cancel": protocol-btn-secondary
- "Submit Feedback": protocol-btn-primary
```

**New File Required**: `app/src/islands/shared/SuggestedProposals/components/NotInterestedModal.css`

**Props/Variants**:
- `isOpen` (boolean)
- `onClose` (function)
- `onSubmit` (function with feedback reason)

**Accessibility**:
- Radio group with proper fieldset/legend
- aria-required on feedback selection

---

### 4.7 FullscreenProposalMapModal

**Purpose**: Display proposal location on an interactive fullscreen map

**File**: `app/src/islands/modals/FullscreenProposalMapModal.jsx`

**Current State Analysis**:
- [FROM CODEBASE] Uses proper purple #31135d
- [FROM CODEBASE] Non-pill button radius
- [FROM CODEBASE] Centered modal (not bottom sheet on mobile)
- [FROM CODEBASE] Good structure, needs minor updates

**Required Changes**:

| Element | Current | Target |
|---------|---------|--------|
| Button radius | 8px | 100px |
| Close button style | Custom | protocol-close-btn |
| Mobile behavior | Fullscreen centered | Bottom sheet with map at 70vh |

**Visual Specifications**:

```
Header:
- Height: 56px
- Padding: 16px 24px
- Title: "Location", 20px, #31135D, weight 600
- Close: X icon, 24px, #31135D

Body:
- Padding: 0 (map fills area)
- Map container: flex 1, min-height 300px
- Desktop: 80vh height
- Mobile: 70vh height in bottom sheet

Address Bar (Below Map):
- Padding: 16px 24px
- Background: #F7F2FA
- Address text: 14px, #31135D
- MapPin icon: 16px, stroke #5B5FCF

Footer:
- Padding: 16px 24px
- "Get Directions": protocol-btn-primary (links to Google Maps)
- "Close": protocol-btn-secondary
```

**Props/Variants**:
- `isOpen` (boolean)
- `onClose` (function)
- `coordinates` ({ lat, lng })
- `address` (string)

**Accessibility**:
- Map has aria-label describing location
- Keyboard-accessible close button

---

### 4.8 VirtualMeetingManager

**Purpose**: Orchestrate 4 virtual meeting workflow views

**File**: `app/src/islands/shared/VirtualMeetingManager/VirtualMeetingManager.jsx`

**Current State Analysis**:
- [FROM CODEBASE] Uses custom --vm-* CSS variables
- [FROM CODEBASE] Uses #5C20B6 purple variant (should be #5B5FCF)
- [FROM CODEBASE] Non-standard spacing throughout
- [FROM CODEBASE] Mixed button styles across sub-components
- [FROM CODEBASE] 5 sub-components to update

**Required Changes for Main Container**:

| Element | Current | Target |
|---------|---------|--------|
| --vm-primary | #5C20B6 | #5B5FCF |
| --vm-primary-dark | #4A1091 | #4A4EBF |
| --vm-surface | #F5F0FF | #F7F2FA |
| Button radius | 8px | 100px |
| Success messages | Green bg | #F7F2FA bg, #5B5FCF text |
| Error messages | Red bg | #F7F2FA bg, #DC3545 text |
| Mobile behavior | Centered | Bottom sheet |

**Visual Specifications for VirtualMeetingManager.jsx**:

```
Overlay:
- Background: rgba(0, 0, 0, 0.5)
- z-index: 10000

Container:
- Background: #FFFFFF
- Border-radius: 16px (desktop), 24px 24px 0 0 (mobile)
- Max-width: 520px
- Max-height: 92vh

Header:
- Height: 56px
- Padding: 16px 24px
- Title: View-dependent, 20px, #31135D, weight 600
- Close: X icon, 24px, #31135D
- Back button (when applicable): ChevronLeft, 24px

Message Banners:
- Success: background #F7F2FA, border-left 4px solid #5B5FCF
- Error: background #F7F2FA, border-left 4px solid #DC3545
- Padding: 12px 16px
- Text: 14px, #31135D
```

**Sub-Component Specifications**:

#### RespondToVMRequest.jsx
```
Time Slot Selection:
- Radio button list
- Slot padding: 12px 16px
- Slot border: 1px solid #E5E7EB
- Slot border-radius: 8px
- Selected: border 2px solid #5B5FCF, background #F7F2FA
- Time text: 16px, #31135D, weight 500
- Date text: 14px, #6D31C2

Footer Buttons:
- "Suggest Alternatives": protocol-btn-secondary
- "Confirm Time": protocol-btn-primary
- "Decline": protocol-btn-danger (outlined)
```

#### BookVirtualMeeting.jsx (and BookTimeSlot.jsx)
```
Calendar Grid:
- 7-column grid for days
- Day header: 12px, #6D31C2, weight 600
- Day button size: 40px
- Available: border 1px solid #31135D
- Selected: background #5B5FCF, color white
- Unavailable: background #E5E7EB, color #9CA3AF
- Today indicator: border 2px solid #6D31C2

Time Picker:
- Appears below calendar when date selected
- Time slot buttons: 12px padding, border-radius 8px
- Available: background #F7F2FA, color #31135D
- Selected: background #5B5FCF, color white

Selected Slots Display:
- Chip style: background #F7F2FA, border-radius 100px
- Remove button: X icon, 16px
- Max 3 slots required indicator
```

#### CancelVirtualMeetings.jsx
```
Warning Card:
- Background: #F7F2FA
- Border-left: 4px solid #DC3545
- Padding: 16px
- Icon: AlertTriangle, 24px, stroke #DC3545

Meeting Details:
- Label: 12px, #6D31C2
- Value: 14px, #31135D, weight 500

Footer:
- "Keep Meeting": protocol-btn-secondary
- "Cancel Meeting": protocol-btn-danger (outlined)
```

#### DetailsOfProposalAndVM.jsx
```
Profile Section:
- Photo: 64px, border-radius 50%
- Name: 18px, #31135D, weight 600
- Meeting time: 16px, #5B5FCF, weight 500

Meeting Info Card:
- Background: #F7F2FA
- Padding: 16px
- Border-radius: 8px
- Labels: 12px, #6D31C2
- Values: 14px, #31135D

Actions:
- "Add to Calendar": protocol-btn-primary
- "Join Meeting": protocol-btn-secondary with external link icon
```

---

## 5. Layout & Composition

### 5.1 Overall Modal Structure
```
.protocol-overlay
└── .protocol-modal
    ├── .protocol-grab-handle (mobile only)
    ├── .protocol-header
    │   ├── .protocol-back-btn (optional)
    │   ├── .protocol-title
    │   └── .protocol-close-btn
    ├── .protocol-body
    │   └── [Modal-specific content]
    └── .protocol-footer
        └── [Action buttons]
```

### 5.2 Z-Index Layering
| Element | Z-Index |
|---------|---------|
| Protocol overlay | 10000 |
| Protocol modal | 10001 |
| Dropdown within modal | 10002 |
| Tooltip within modal | 10003 |

### 5.3 Responsive Breakpoint Behaviors

**Desktop (> 480px)**:
- Modal centered vertically and horizontally
- Max-width varies by modal (480px default, 600px for comparison, 520px for VM)
- Border-radius: 16px all corners
- Animation: fadeIn + scaleUp

**Mobile (< 480px)**:
- Modal anchored to bottom
- Full width
- Border-radius: 24px 24px 0 0
- Grab handle visible
- Header title: 18px, weight 400
- Animation: slideUp from bottom

---

## 6. Interactions & Animations

### 6.1 Modal Open
```css
/* Desktop */
@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Mobile */
@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

/* Duration: 0.3s, Easing: ease-out */
```

### 6.2 Modal Close
- Reverse animations
- Duration: 0.2s, Easing: ease-in

### 6.3 Button Interactions
```css
/* Hover */
transition: all 0.2s ease;

/* Primary hover */
background: #4A4EBF; /* darker */

/* Secondary hover */
background: #F7F2FA;

/* Danger hover */
background: rgba(220, 53, 69, 0.1);

/* Active/Press */
transform: scale(0.98);
```

### 6.4 Selection States (Radio, Day selector)
```css
/* Transition */
transition: all 0.15s ease;

/* Selected */
border-color: #5B5FCF;
background: #F7F2FA; /* or #5B5FCF for filled selections */
```

---

## 7. Assets Required

### 7.1 Icons (Feather - Already Available)
| Icon | Usage |
|------|-------|
| `X` | Close buttons |
| `ChevronLeft` | Back navigation |
| `ChevronRight` | Forward navigation |
| `AlertTriangle` | Warning/danger states |
| `Check` | Success/confirmation |
| `CheckCircle` | Verified badges |
| `Calendar` | Date selection |
| `Clock` | Time display |
| `MapPin` | Location |
| `ExternalLink` | External links (Google Meet, etc.) |
| `MessageCircle` | Feedback prompts |
| `User` | Profile fallback |
| `Video` | Virtual meeting |
| `Phone` | Contact |
| `Mail` | Email verification |

### 7.2 Fonts
- [FROM CODEBASE] Inter (already loaded via Google Fonts)
- Weights: 400, 500, 600

### 7.3 Images/Illustrations
- None required (all icons from Feather)

---

## 8. Implementation Sequence

### Phase 1: Foundation (Estimated: 2 hours)
1. **Add protocol tokens to variables.css**
   - Add `--protocol-*` color tokens
   - Add protocol spacing tokens if not already present

2. **Create protocol-modal.css**
   - Base overlay, modal, header, body, footer classes
   - Button variants (primary, secondary, danger)
   - Mobile bottom sheet styles
   - Grab handle styles

3. **Update main.css imports**
   - Add `@import url('components/protocol-modal.css');`

### Phase 2: Simple Modals (Estimated: 3 hours)
4. **CancelProposalModal**
   - Replace all inline styles with protocol classes
   - Simplest modal, good validation of base classes

5. **NotInterestedModal**
   - Create new CSS file
   - Replace inline styles with protocol classes
   - Add radio button styling for feedback options

6. **HostProfileModal**
   - Update CSS file to protocol colors
   - Change verified badges from green to purple
   - Add mobile bottom sheet

### Phase 3: Map Modal (Estimated: 1 hour)
7. **FullscreenProposalMapModal**
   - Update button styles to pill
   - Add mobile bottom sheet behavior
   - Keep map-specific styles

### Phase 4: Complex Modals (Estimated: 4 hours)
8. **CompareTermsModal**
   - Replace green/blue with protocol colors
   - Update comparison card styling
   - Add mobile stacked layout

9. **GuestEditingProposalModal**
   - Heavy CSS modifications
   - Update all color references
   - Update day selector styling
   - Ensure state machine views all comply

### Phase 5: VirtualMeetingManager Suite (Estimated: 4 hours)
10. **VirtualMeetingManager.jsx + CSS**
    - Update CSS variables
    - Update container styles
    - Update message banner styles

11. **RespondToVMRequest.jsx**
    - Update time slot selection styling

12. **BookVirtualMeeting.jsx + BookTimeSlot.jsx + CSS**
    - Update calendar grid styling
    - Update time picker styling
    - Update selected slots display

13. **CancelVirtualMeetings.jsx**
    - Update warning card styling
    - Ensure danger button is outlined

14. **DetailsOfProposalAndVM.jsx**
    - Update profile section styling
    - Update meeting info card

### Phase 6: Testing & Polish (Estimated: 2 hours)
15. **Cross-browser testing**
    - Chrome, Firefox, Safari, Edge

16. **Mobile testing**
    - iOS Safari, Android Chrome
    - Bottom sheet behavior verification

17. **Accessibility audit**
    - Screen reader testing
    - Keyboard navigation verification

**Total Estimated Time**: 16 hours

---

## 9. Assumptions & Clarifications Needed

### Assumptions Made
1. **[SUGGESTED]** The "grab handle" on mobile should be purely decorative (not functional swipe-to-dismiss) for initial implementation
2. **[SUGGESTED]** ESC key behavior remains unchanged per modal (some block it intentionally)
3. **[SUGGESTED]** Existing portal mounting points remain valid
4. **[SUGGESTED]** The `useCompareTermsModalLogic` hook doesn't need modification (only UI changes)
5. **[SUGGESTED]** VirtualMeetingManager's 4-view state machine remains unchanged
6. **[SUGGESTED]** For day selector grids, 8px border-radius is acceptable (exception to 100px pill rule for grid usability)

### Clarifications Needed
1. **[NEEDS CLARIFICATION]** Should the VirtualMeetingManager sub-components (RespondToVMRequest, etc.) each have their own bottom sheet, or should only the outer VirtualMeetingManager have it?
2. **[NEEDS CLARIFICATION]** For CompareTermsModal, should mobile view show both comparison cards simultaneously (scrollable) or use tabs/swipe?
3. **[NEEDS CLARIFICATION]** Should FullscreenProposalMapModal remain truly fullscreen on desktop, or adopt the 92vh max-height constraint?

---

## 10. CSS Variable Reference (Quick Reference)

```css
/* Add to variables.css */

/* POPUP_REPLICATION_PROTOCOL Tokens */
--protocol-primary: #31135D;
--protocol-action: #5B5FCF;
--protocol-action-hover: #4A4EBF;
--protocol-secondary: #6D31C2;
--protocol-surface: #F7F2FA;
--protocol-danger: #DC3545;
--protocol-danger-hover: rgba(220, 53, 69, 0.1);
--protocol-white: #FFFFFF;
--protocol-overlay: rgba(0, 0, 0, 0.5);
--protocol-border: #E5E7EB;
--protocol-text-muted: #6B7280;

/* Protocol Spacing */
--protocol-space-sm: 8px;
--protocol-space-md: 16px;
--protocol-space-lg: 24px;

/* Protocol Radii */
--protocol-radius-button: 100px;
--protocol-radius-card: 8px;
--protocol-radius-modal: 16px;
--protocol-radius-modal-mobile: 24px;

/* Protocol Transitions */
--protocol-transition: 0.2s ease;
--protocol-transition-slow: 0.3s ease-out;
```

---

**Document Version**: 1.0
**Created**: 2026-01-26
**Author**: Design Implementation Planner
**Status**: Ready for Execution
