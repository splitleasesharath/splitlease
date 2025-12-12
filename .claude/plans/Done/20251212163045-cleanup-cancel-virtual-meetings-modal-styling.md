# Cleanup Plan: CancelVirtualMeetings Modal Styling Update

**Created**: 2025-12-12T16:30:45
**Type**: CLEANUP - CSS Styling Refactor
**Priority**: Medium
**Estimated Effort**: 30-45 minutes

---

## Executive Summary

### What is Being Cleaned Up
The CancelVirtualMeetings modal component needs its CSS styling updated to match the original Bubble design. The current implementation is too large, uses incorrect colors, and doesn't match the compact target design.

### Why This Cleanup is Needed
- Current modal is too spacious with excessive padding/margins
- Warning text is styled in red (#dc2626) instead of dark gray (#424242)
- Close button uses gray instead of purple (#6f34bf)
- Button sizing and styling don't match target (should be 128px wide, 32px tall, 20px border-radius)
- Meeting info card styling doesn't match (needs light gray #f7f8f9 background, 10px border-radius)
- Font families are inconsistent (should use Inter, DM Sans, and Roboto per target)

### Expected Outcomes
- More compact modal with minimal vertical space usage
- Visual consistency with original Bubble design
- Proper font family usage across components
- Correct color usage for warning text and interactive elements

---

## Current State Analysis

### Affected Files

| File | Path | Current Lines | Change Type |
|------|------|---------------|-------------|
| VirtualMeetingManager.css | `app/src/islands/shared/VirtualMeetingManager/VirtualMeetingManager.css` | 583 | MODIFY |
| CancelVirtualMeetings.jsx | `app/src/islands/shared/VirtualMeetingManager/CancelVirtualMeetings.jsx` | 117 | MINOR MODIFY |

### Current CSS Classes for Cancel View (Lines 359-418 in VirtualMeetingManager.css)

```css
/* Current Cancel View Styles */
.vm-cancel-container {
  padding: 8px 0;
}

.vm-meeting-info-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
  background: #f9fafb;
}

.vm-meeting-info-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.vm-meeting-info-icon {
  font-size: 32px;
}

.vm-meeting-info-details {
  flex: 1;
}

.vm-meeting-info-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.vm-meeting-info-listing {
  font-size: 14px;
  color: #6b7280;
  margin: 4px 0;
}

.vm-meeting-info-date {
  font-size: 14px;
  color: var(--color-primary, #31135d);
  font-weight: 600;
  margin: 4px 0;
}

.vm-meeting-info-link {
  font-size: 13px;
  color: #3b82f6;
  text-decoration: none;
  display: inline-block;
  margin-top: 8px;
}

.vm-meeting-info-link:hover {
  text-decoration: underline;
}
```

### Current Issues Identified

1. **Warning Text (Line 125-130)**
   - Current: `color: #dc2626;` (red)
   - Target: `color: #424242;` (dark gray)

2. **Close Button (Line 81-98)**
   - Current: `color: #6b7280;` (gray)
   - Target: `color: #6f34bf;` (purple)

3. **Meeting Info Card (Line 366-372)**
   - Current: `border-radius: 8px;`, `background: #f9fafb;`
   - Target: `border-radius: 10px;`, `background: #f7f8f9;`

4. **Meeting Title (Line 388-393)**
   - Current: `font-size: 16px; font-weight: 600;`
   - Target: `font-size: 17px; font-weight: 400; font-family: 'Roboto', sans-serif;`

5. **Listing Subtitle (Line 395-399)**
   - Current: `font-size: 14px;`
   - Target: `font-size: 12px; color: #424242;`

6. **Buttons (Lines 136-213)**
   - Current `.vm-button-outline`: blue border, flex: 1
   - Target: purple border (#6f34bf), 128px width, 32px height, 20px border-radius
   - Current `.vm-button-danger`: flex: 1
   - Target: red background (#c82333), 128px width, 32px height, 20px border-radius

7. **Header Layout**
   - Current: Trash icon and title in flex row
   - Target: Same layout but more compact

8. **Calendar Icon**
   - Current: Using emoji (&#128197;)
   - Should: Be purple (#6f34bf) colored

---

## Target State Definition

### Design Specifications from Target

| Element | Property | Target Value |
|---------|----------|--------------|
| Modal | Background | white |
| Modal | Shadow/Border | subtle shadow |
| Close Button | Color | #6f34bf (purple) |
| Header | Layout | Trash icon + title on same line |
| Warning Text | Color | #424242 (dark gray) |
| Warning Text | Font Weight | normal (not bold) |
| Meeting Card | Background | #f7f8f9 |
| Meeting Card | Border Radius | 10px |
| Calendar Icon | Color | #6f34bf (purple) |
| Meeting Title | Font | Roboto, 17px, weight 400 |
| Listing Subtitle | Font | 12px, color #424242 |
| No Button | Border Color | #6f34bf |
| No Button | Size | 128px x 32px |
| No Button | Border Radius | 20px |
| Cancel Button | Background | #c82333 |
| Cancel Button | Size | 128px x 32px |
| Cancel Button | Border Radius | 20px |
| Button Font | Family | DM Sans |

### CSS Variable Mapping

The project already has these variables in `variables.css`:
- `--font-dm`: 'DM Sans', sans-serif
- `--font-inter`: 'Inter', sans-serif
- No Roboto variable exists - needs direct usage or addition

---

## File-by-File Action Plan

### File: `C:\Users\Split Lease\Documents\Split Lease\app\src\islands\shared\VirtualMeetingManager\VirtualMeetingManager.css`

#### Change 1: Add Roboto Font Import (Line 6, after existing import)
**Current State**:
```css
@import url('https://fonts.googleapis.com/css2?family=Alata&display=swap');
```

**Required Changes**:
```css
@import url('https://fonts.googleapis.com/css2?family=Alata&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap');
```

#### Change 2: Add Cancel Modal Specific Variables (After line 13)
**Current State**:
```css
:root {
  --vm-purple-accent: rgb(92, 32, 182);
  --vm-disabled-gray: rgb(221, 221, 221);
  --vm-selected-slots-bg: rgb(247, 248, 249);
  --vm-submit-disabled: rgb(104, 104, 104);
}
```

**Required Changes**:
```css
:root {
  --vm-purple-accent: rgb(92, 32, 182);
  --vm-disabled-gray: rgb(221, 221, 221);
  --vm-selected-slots-bg: rgb(247, 248, 249);
  --vm-submit-disabled: rgb(104, 104, 104);
  /* Cancel Modal specific */
  --vm-cancel-purple: #6f34bf;
  --vm-cancel-danger: #c82333;
  --vm-cancel-gray: #424242;
  --vm-cancel-card-bg: #f7f8f9;
}
```

#### Change 3: Update Close Button Styles (Lines 81-98)
**Current State**:
```css
.vm-close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  font-size: 24px;
  color: #6b7280;
  cursor: pointer;
  padding: 8px;
  transition: color 0.2s;
  line-height: 1;
  z-index: 10;
}

.vm-close-btn:hover {
  color: #000;
}
```

**Required Changes**:
```css
.vm-close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  font-size: 20px;
  color: var(--vm-cancel-purple, #6f34bf);
  cursor: pointer;
  padding: 4px;
  transition: color 0.2s;
  line-height: 1;
  z-index: 10;
}

.vm-close-btn:hover {
  color: #5a2a9e;
}
```

#### Change 4: Update Warning Text Styles (Lines 125-130)
**Current State**:
```css
.vm-warning-text {
  color: #dc2626;
  font-size: 14px;
  margin-bottom: 16px;
  font-weight: 500;
}
```

**Required Changes**:
```css
.vm-warning-text {
  color: var(--vm-cancel-gray, #424242);
  font-size: 14px;
  margin-bottom: 12px;
  font-weight: 400;
}
```

#### Change 5: Update Button Group and Button Styles (Lines 136-213)

**Current `.vm-button-group` (Lines 136-140)**:
```css
.vm-button-group {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}
```

**Required Changes**:
```css
.vm-button-group {
  display: flex;
  gap: 16px;
  margin-top: 16px;
  justify-content: center;
}
```

**Current `.vm-button-outline` (Lines 198-213)**:
```css
.vm-button-outline {
  background: white;
  color: #3b82f6;
  padding: 12px 24px;
  border-radius: 8px;
  border: 2px solid #3b82f6;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  flex: 1;
}

.vm-button-outline:hover {
  background: #eff6ff;
}
```

**Required Changes**:
```css
.vm-button-outline {
  background: white;
  color: var(--vm-cancel-purple, #6f34bf);
  padding: 0;
  width: 128px;
  height: 32px;
  border-radius: 20px;
  border: 2px solid var(--vm-cancel-purple, #6f34bf);
  font-size: 14px;
  font-weight: 500;
  font-family: 'DM Sans', sans-serif;
  cursor: pointer;
  transition: all 0.2s;
  flex: none;
}

.vm-button-outline:hover {
  background: #f5f0ff;
}
```

**Current `.vm-button-danger` (Lines 181-196)**:
```css
.vm-button-danger {
  background: #dc2626;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  flex: 1;
}

.vm-button-danger:hover {
  background: #c41e1e;
}
```

**Required Changes**:
```css
.vm-button-danger {
  background: var(--vm-cancel-danger, #c82333);
  color: white;
  padding: 0;
  width: 128px;
  height: 32px;
  border-radius: 20px;
  border: none;
  font-size: 14px;
  font-weight: 500;
  font-family: 'DM Sans', sans-serif;
  cursor: pointer;
  transition: background 0.2s;
  flex: none;
}

.vm-button-danger:hover {
  background: #a71d2a;
}

.vm-button-danger:disabled {
  background: #ccc;
  cursor: not-allowed;
}
```

#### Change 6: Update Cancel Container Styles (Lines 362-364)
**Current State**:
```css
.vm-cancel-container {
  padding: 8px 0;
}
```

**Required Changes**:
```css
.vm-cancel-container {
  padding: 4px 0;
}
```

#### Change 7: Update Meeting Info Card Styles (Lines 366-372)
**Current State**:
```css
.vm-meeting-info-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
  background: #f9fafb;
}
```

**Required Changes**:
```css
.vm-meeting-info-card {
  border: none;
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 16px;
  background: var(--vm-cancel-card-bg, #f7f8f9);
}
```

#### Change 8: Update Meeting Info Icon (Line 380-382)
**Current State**:
```css
.vm-meeting-info-icon {
  font-size: 32px;
}
```

**Required Changes**:
```css
.vm-meeting-info-icon {
  font-size: 24px;
  color: var(--vm-cancel-purple, #6f34bf);
}
```

#### Change 9: Update Meeting Info Title (Lines 388-393)
**Current State**:
```css
.vm-meeting-info-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}
```

**Required Changes**:
```css
.vm-meeting-info-title {
  font-size: 17px;
  font-weight: 400;
  font-family: 'Roboto', sans-serif;
  color: #1f2937;
  margin: 0 0 4px 0;
}
```

#### Change 10: Update Meeting Info Listing (Lines 395-399)
**Current State**:
```css
.vm-meeting-info-listing {
  font-size: 14px;
  color: #6b7280;
  margin: 4px 0;
}
```

**Required Changes**:
```css
.vm-meeting-info-listing {
  font-size: 12px;
  color: var(--vm-cancel-gray, #424242);
  margin: 2px 0;
}
```

#### Change 11: Update Title Styles for More Compact Header (Lines 74-79)
**Current State**:
```css
.vm-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}
```

**Required Changes**:
```css
.vm-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  font-family: 'Inter', sans-serif;
}
```

#### Change 12: Update Header Margin (Lines 54-60)
**Current State**:
```css
.vm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 12px;
}
```

**Required Changes**:
```css
.vm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  gap: 8px;
}
```

#### Change 13: Update Icon Size (Lines 69-72)
**Current State**:
```css
.vm-icon {
  font-size: 24px;
  display: inline-block;
}
```

**Required Changes**:
```css
.vm-icon {
  font-size: 20px;
  display: inline-block;
}
```

---

### File: `C:\Users\Split Lease\Documents\Split Lease\app\src\islands\shared\VirtualMeetingManager\CancelVirtualMeetings.jsx`

#### Change 1: Add Close Button to JSX (if not present in parent container)

The CancelVirtualMeetings component is rendered inside VirtualMeetingManager which provides the container. However, the current JSX structure doesn't include a close button. The close button is handled by the parent VirtualMeetingManager.jsx.

**Verification Needed**: Check if close button exists in parent or needs to be added to this component.

**Current JSX Structure** (Lines 55-116):
```jsx
return (
  <div className="vm-cancel-container">
    <div className="vm-header">
      <div className="vm-header-title">
        <span className="vm-icon">&#128465;</span>
        <h2 className="vm-title">Cancel Virtual Meeting?</h2>
      </div>
    </div>
    ...
  </div>
);
```

**No JSX changes required** - the component structure is correct. All styling changes are in CSS.

---

## Execution Order

### Phase 1: CSS Variables (5 minutes)
1. Add Roboto font import to VirtualMeetingManager.css
2. Add cancel modal specific CSS variables

### Phase 2: Close Button & Header (5 minutes)
3. Update .vm-close-btn styles
4. Update .vm-header margin
5. Update .vm-icon font size
6. Update .vm-title styles

### Phase 3: Warning & Content (5 minutes)
7. Update .vm-warning-text color and weight
8. Update .vm-cancel-container padding

### Phase 4: Meeting Info Card (10 minutes)
9. Update .vm-meeting-info-card background and border-radius
10. Update .vm-meeting-info-icon color and size
11. Update .vm-meeting-info-title font
12. Update .vm-meeting-info-listing font size and color

### Phase 5: Buttons (10 minutes)
13. Update .vm-button-group layout
14. Update .vm-button-outline styles (purple border, fixed size)
15. Update .vm-button-danger styles (red bg, fixed size)

### Phase 6: Verification (5 minutes)
16. Visual verification of all changes
17. Test loading state display
18. Test responsive behavior

---

## Risk Assessment

### Potential Breaking Changes
- **Button width change from `flex: 1` to fixed `128px`**: On very narrow screens, buttons may need responsive override
- **Font family changes**: Ensure Roboto font loads correctly; fallback provided

### Mitigation
- Keep existing responsive media queries at bottom of file
- Add mobile override if needed for buttons to be full-width on small screens

### Edge Cases
- Loading state button text "Canceling..." may need width adjustment
- Very long listing names in meeting info card

---

## Verification Checklist

### Visual Checks
- [ ] Close button is purple (#6f34bf)
- [ ] Warning text "This action cannot be undone" is dark gray (#424242), not red
- [ ] Meeting info card has light gray background (#f7f8f9)
- [ ] Meeting info card has 10px border radius
- [ ] Calendar icon is purple
- [ ] Meeting title uses Roboto font at 17px, weight 400
- [ ] Listing subtitle is 12px, dark gray
- [ ] "No" button has purple border, 128px wide, 32px tall, 20px border-radius
- [ ] "Cancel Meeting" button has red background (#c82333), same dimensions
- [ ] Modal is more compact with reduced spacing

### Functional Checks
- [ ] Buttons are clickable and trigger correct actions
- [ ] Loading state displays correctly
- [ ] Error state displays correctly
- [ ] Modal closes on button click

### Responsive Checks
- [ ] Modal displays correctly on desktop (900px+)
- [ ] Modal displays correctly on tablet (640px-900px)
- [ ] Modal displays correctly on mobile (< 640px)

---

## Reference Appendix

### All File Paths
1. `C:\Users\Split Lease\Documents\Split Lease\app\src\islands\shared\VirtualMeetingManager\VirtualMeetingManager.css`
2. `C:\Users\Split Lease\Documents\Split Lease\app\src\islands\shared\VirtualMeetingManager\CancelVirtualMeetings.jsx`
3. `C:\Users\Split Lease\Documents\Split Lease\app\src\styles\variables.css` (reference only)

### Key Color Values

| Purpose | Current | Target |
|---------|---------|--------|
| Close button | #6b7280 | #6f34bf |
| Warning text | #dc2626 | #424242 |
| Outline button border | #3b82f6 | #6f34bf |
| Danger button bg | #dc2626 | #c82333 |
| Card background | #f9fafb | #f7f8f9 |

### Button Dimensions

| Property | Current | Target |
|----------|---------|--------|
| Width | flex: 1 | 128px |
| Height | auto (padding-based) | 32px |
| Border radius | 8px | 20px |
| Font family | inherit | DM Sans |

### Font Specifications

| Element | Family | Size | Weight |
|---------|--------|------|--------|
| Modal title | Inter | 18px | 600 |
| Meeting title | Roboto | 17px | 400 |
| Listing subtitle | inherit | 12px | 400 |
| Buttons | DM Sans | 14px | 500 |
| Warning text | inherit | 14px | 400 |

---

## Definition of Done

This cleanup is complete when:
1. All CSS changes listed above are implemented
2. Visual appearance matches target design specifications
3. All verification checklist items pass
4. No console errors or warnings related to styling
5. Responsive behavior is maintained or improved
6. Changes are committed to git

---

**Plan Author**: Claude Code (cleanup-planner)
**Review Required**: Yes - visual verification against target design
