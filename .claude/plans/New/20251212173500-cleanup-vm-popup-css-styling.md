# Virtual Meeting Popup Modal CSS Styling Cleanup Plan

**Created**: 2025-12-12T17:35:00
**Type**: CLEANUP (CSS-Only)
**Scope**: Virtual Meeting popup modal on guest-proposals page
**Constraint**: NO changes to HTML structure, functionality, conditionals, triggers, or actions

---

## 1. Executive Summary

### What is Being Cleaned Up
The CSS styling of the Virtual Meeting popup modal components (`BookVirtualMeeting.jsx`, `BookTimeSlot.jsx`, and associated CSS files) to match the original Bubble implementation's visual appearance.

### Why
The current implementation has diverged from the original Bubble design specifications. The user interface needs visual parity with the established design language to maintain consistency.

### Scope and Boundaries
- **IN SCOPE**: CSS properties only - colors, fonts, layouts, spacing, borders, backgrounds
- **OUT OF SCOPE**:
  - HTML structure changes
  - JavaScript functionality
  - Conditional logic
  - Event handlers
  - Component props
  - State management

### Expected Outcomes
1. Side-by-side layout with calendar on left, time slots on right
2. Calendar header with dropdown and up/down navigation arrows
3. Properly styled calendar grid with original date cell styling
4. 4-column time slots grid (not list)
5. Selected slots area with gray background, clock icon, centered items
6. Correct submit button styling (white when enabled, gray when disabled)
7. Alata font, purple accent (#5c20b6 / rgb(92, 32, 182))
8. X close button in top right corner

---

## 2. Current State Analysis

### 2.1 Affected Files (Complete Inventory)

| File Path | Purpose | Lines | Changes Needed |
|-----------|---------|-------|----------------|
| `app/src/islands/shared/VirtualMeetingManager/VirtualMeetingManager.css` | Main container, overlay, buttons, messages | ~565 | Moderate |
| `app/src/islands/shared/VirtualMeetingManager/BookTimeSlot.css` | Calendar grid, time slots, selected slots display | ~391 | Heavy |

### 2.2 Current CSS Patterns (Analysis)

#### VirtualMeetingManager.css Current State

**Container Styling (lines 25-38)**:
```css
.vm-container {
  background: white;
  border-radius: 16px;
  padding: 24px 32px;
  width: 95%;
  max-width: 900px;
  min-height: min(600px, calc(100vh - 130px));
  max-height: calc(100vh - 130px);
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  position: relative;
  display: flex;
  flex-direction: column;
}
```
**Issues**: No font-family override to Alata

**Close Button (lines 71-83)**:
```css
.vm-close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #6b7280;
  cursor: pointer;
  padding: 4px 8px;
  transition: color 0.2s;
}
```
**Issues**: Missing X icon styling, positioning could be refined

**Primary Button (lines 127-147)**:
```css
.vm-button-primary {
  background: var(--color-primary, #31135d);
  color: white;
  ...
}
.vm-button-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}
```
**Issues**: Disabled state should be `rgb(104, 104, 104)` not `#ccc`

**Success Button (lines 200-220)**:
```css
.vm-button-success {
  background: var(--color-success, #00C851);
  color: white;
  ...
}
.vm-button-success:disabled {
  background: #ccc;
  cursor: not-allowed;
}
```
**Issues**:
- Enabled state should be white background with dark text
- Disabled state should be `rgb(104, 104, 104)`

#### BookTimeSlot.css Current State

**Main Container Layout (lines 5-16)**:
```css
.vm-book-time-slot-container {
  width: 100%;
  max-width: 100%;
  min-height: 400px;
  font-family: inherit;
  background: white;
  display: grid;
  grid-template-columns: 1fr 280px;
  grid-template-rows: auto 1fr;
  gap: 24px;
  flex: 1;
}
```
**Issues**:
- Font should be Alata
- Grid proportions may need adjustment for side-by-side layout

**Calendar Navigation (lines 45-79)**:
```css
.vm-calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
}

.vm-calendar-nav-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 8px 12px;
  color: #6b7280;
  ...
}
```
**Issues**:
- Navigation buttons use left/right arrows (larr/rarr)
- Should use up/down arrows for month navigation
- Month dropdown font should be 17px Alata

**Date Button Styling (lines 112-134)**:
```css
.vm-date-button {
  width: 100%;
  height: 100%;
  border: 1px solid #e5e7eb;
  background: white;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

.vm-date-button:disabled {
  color: #d1d5db;
  cursor: not-allowed;
  background: #f9fafb;
}
```
**Issues**:
- Disabled/past dates should be `color: rgb(221, 221, 221)` exactly
- Current date should have `background: rgba(var(--color_surface_default_rgb), 0.5)`, bold font, purple text

**Active Date Button (lines 137-146)**:
```css
.vm-date-button-active {
  background: var(--color-primary, #31135d);
  color: white;
  border-color: var(--color-primary, #31135d);
  box-shadow: 0 2px 8px rgba(49, 19, 93, 0.3);
}
```
**Issues**: Current date highlight should be different from selected date

**Time Slots Grid (lines 302-309)**:
```css
.vm-time-slots-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
  padding: 4px;
}
```
**Issues**: Should be fixed 4-column grid, not auto-fill

**Selected Time Slot (lines 335-344)**:
```css
.vm-time-slot-selected {
  background: #e3f2fd !important;
  border-color: var(--color-primary, #31135d) !important;
  color: var(--color-primary, #31135d) !important;
  font-weight: 600;
}
```
**Issues**:
- Selected should be `background: rgb(92, 32, 182)` (purple)
- Text should be white

**Selected Slots Display (lines 195-206)**:
```css
.vm-selected-slots {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
  min-height: 80px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px dashed #d1d5db;
}
```
**Issues**:
- Should have `background: rgb(247, 248, 249)`
- Should include clock icon before time text
- Items should be centered

### 2.3 Target Design Specifications (From Bubble)

| Element | Property | Target Value |
|---------|----------|--------------|
| Font Family | All modal text | Alata, sans-serif |
| Dropdown Font Size | Month selector | 17px |
| Purple Accent | Primary color | #5c20b6 / rgb(92, 32, 182) |
| Disabled Date Color | Past/unavailable | rgb(221, 221, 221) |
| Current Date BG | Today highlight | rgba(var(--color_surface_default_rgb), 0.5) |
| Current Date Color | Text color | rgb(92, 32, 182) |
| Current Date Weight | Font weight | bold |
| Selected Slot BG | Time slot selected | rgb(92, 32, 182) |
| Selected Slot Text | Text color | white |
| Time Slots Grid | Column count | 4 columns |
| Time Slots Count | Total visible | 12 (11am-10pm) |
| Selected Area BG | Bottom display | rgb(247, 248, 249) |
| Submit Enabled BG | Button background | white |
| Submit Disabled BG | Button background | rgb(104, 104, 104) |

---

## 3. Target State Definition

### 3.1 Layout Target
```
+-----------------------------------------------------------------------+
|  [X]                    Request Virtual Meeting                        |
+-----------------------------------------------------------------------+
|                                                                        |
|  +----------------------------+  +----------------------------------+  |
|  |      CALENDAR SECTION      |  |     TIME SLOTS SECTION           |  |
|  |                            |  |                                  |  |
|  |   [December    v] [^][v]   |  |   Select 3 Time Slots (EST)      |  |
|  |                            |  |                                  |  |
|  |   Su Mo Tu We Th Fr Sa     |  |   [Selected slot 1 w/clock X]    |  |
|  |                            |  |   [Selected slot 2 w/clock X]    |  |
|  |   [1] [2] [3] [4] [5] [6]  |  |   [Selected slot 3 w/clock X]    |  |
|  |   [7] [8] [9]...           |  |                                  |  |
|  |                            |  |   Clear Time Slots               |  |
|  +----------------------------+  +----------------------------------+  |
|                                                                        |
|  +-------------------------------------------------------------------+ |
|  |  Time slots for Dec 15, 2025                                       | |
|  |  +--------+ +--------+ +--------+ +--------+                       | |
|  |  | 11:00  | | 11:30  | | 12:00  | | 12:30  |   <- 4 columns       | |
|  |  +--------+ +--------+ +--------+ +--------+                       | |
|  |  | 1:00   | | 1:30   | | 2:00   | | 2:30   |                       | |
|  |  +--------+ +--------+ +--------+ +--------+                       | |
|  |  | 3:00   | | 3:30   | ...                                         | |
|  +-------------------------------------------------------------------+ |
|                                                                        |
|  +-------------------------------------------------------------------+ |
|  |  SELECTED SLOTS AREA (gray bg #f7f8f9)                             | |
|  |  [clock] Dec 15, 11:00 AM   [clock] Dec 15, 2:30 PM   ...         | |
|  +-------------------------------------------------------------------+ |
|                                                                        |
|  Select 3 time slots to meet (EST). You have selected 2/3 slots.      |
|                                                                        |
|  +-------------------------------------------------------------------+ |
|  |                    [ Submit Request ]                              | |
|  |         (white bg when 3 selected, gray #686868 when < 3)          | |
|  +-------------------------------------------------------------------+ |
+-----------------------------------------------------------------------+
```

### 3.2 Color Scheme Target

```css
/* Target Color Variables */
--vm-purple-accent: rgb(92, 32, 182);       /* #5c20b6 */
--vm-disabled-gray: rgb(221, 221, 221);     /* #dddddd */
--vm-selected-slots-bg: rgb(247, 248, 249); /* #f7f8f9 */
--vm-submit-disabled: rgb(104, 104, 104);   /* #686868 */
--vm-submit-enabled-bg: #ffffff;
--vm-submit-enabled-text: #333333;
```

### 3.3 Typography Target

```css
/* Target Typography */
--vm-font-family: 'Alata', sans-serif;
--vm-dropdown-font-size: 17px;
--vm-date-font-weight-today: bold;
```

---

## 4. File-by-File Action Plan

---

### File: `C:\Users\Split Lease\Documents\Split Lease\app\src\islands\shared\VirtualMeetingManager\VirtualMeetingManager.css`

**Current State**: Contains base container, overlay, header, buttons, and message styles with project defaults

**Required Changes**:

#### 4.1.1 Add Alata Font Import (Top of file)
```css
/* ADD at line 1 */
@import url('https://fonts.googleapis.com/css2?family=Alata&display=swap');
```

#### 4.1.2 Update Container Font (lines 25-38)
```css
/* CHANGE .vm-container */
.vm-container {
  background: white;
  border-radius: 16px;
  padding: 24px 32px;
  width: 95%;
  max-width: 900px;
  min-height: min(600px, calc(100vh - 130px));
  max-height: calc(100vh - 130px);
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  position: relative;
  display: flex;
  flex-direction: column;
  font-family: 'Alata', sans-serif;  /* ADD THIS */
}
```

#### 4.1.3 Update Close Button Position and Styling (lines 71-83)
```css
/* REPLACE .vm-close-btn */
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

#### 4.1.4 Update Success Button (Submit) Styling (lines 200-220)
```css
/* REPLACE .vm-button-success */
.vm-button-success {
  background: #ffffff;
  color: #333333;
  padding: 12px 24px;
  border-radius: 8px;
  border: 2px solid rgb(92, 32, 182);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  font-family: 'Alata', sans-serif;
}

.vm-button-success:hover:not(:disabled) {
  background: #f5f5f5;
}

.vm-button-success:disabled {
  background: rgb(104, 104, 104);
  color: white;
  border-color: rgb(104, 104, 104);
  cursor: not-allowed;
}
```

#### 4.1.5 Add New VM Purple Accent Variable (after line 5)
```css
/* ADD after opening comment */
:root {
  --vm-purple-accent: rgb(92, 32, 182);
  --vm-disabled-gray: rgb(221, 221, 221);
  --vm-selected-slots-bg: rgb(247, 248, 249);
  --vm-submit-disabled: rgb(104, 104, 104);
}
```

**Dependencies**: None - this is the main CSS file

**Verification**:
- Modal should use Alata font throughout
- Close button should appear as X in top-right corner
- Submit button should have white background when enabled, gray when disabled

---

### File: `C:\Users\Split Lease\Documents\Split Lease\app\src\islands\shared\VirtualMeetingManager\BookTimeSlot.css`

**Current State**: Contains calendar grid, time slots list, and selected slots display with auto-fill grid

**Required Changes**:

#### 4.2.1 Update Main Container Layout (lines 5-16)
```css
/* REPLACE .vm-book-time-slot-container */
.vm-book-time-slot-container {
  width: 100%;
  max-width: 100%;
  min-height: 400px;
  font-family: 'Alata', sans-serif;
  background: white;
  display: grid;
  grid-template-columns: 1fr 1fr;  /* Side-by-side equal columns */
  grid-template-rows: auto 1fr;
  gap: 24px;
  flex: 1;
}

/* Calendar on left, full height */
.vm-book-time-slot-container .vm-select-date-section {
  grid-column: 1;
  grid-row: 1 / 3;
}

/* Selected slots in top-right */
.vm-book-time-slot-container .vm-select-time-section {
  grid-column: 2;
  grid-row: 1;
}

/* Time slots grid below selected slots */
.vm-book-time-slot-container .vm-inline-time-slots {
  grid-column: 2;
  grid-row: 2;
  align-self: start;
}
```

#### 4.2.2 Update Calendar Header for Up/Down Navigation (lines 45-79)
```css
/* REPLACE .vm-calendar-header */
.vm-calendar-header {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 16px;
  padding: 8px 12px;
  gap: 8px;
}

.vm-month-select {
  font-family: 'Alata', sans-serif;
  font-size: 17px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 6px 12px;
  background: white;
  cursor: pointer;
  font-weight: 400;
  min-width: 120px;
  text-align: center;
}

/* Change nav buttons to vertical arrows container */
.vm-calendar-nav-container {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.vm-calendar-nav-btn {
  background: none;
  border: 1px solid #d1d5db;
  font-size: 12px;
  cursor: pointer;
  padding: 4px 8px;
  color: #6b7280;
  transition: all 0.2s;
  border-radius: 4px;
  line-height: 1;
}

.vm-calendar-nav-btn:hover {
  color: #000;
  background: #f3f4f6;
  border-color: #9ca3af;
}

.vm-calendar-nav-btn--up::after {
  content: '\25B2';  /* Up triangle */
}

.vm-calendar-nav-btn--down::after {
  content: '\25BC';  /* Down triangle */
}
```

#### 4.2.3 Update Day Header Styling (lines 81-95)
```css
/* REPLACE .vm-days-of-week and .vm-day-header */
.vm-days-of-week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 8px;
}

.vm-day-header {
  text-align: center;
  font-family: 'Alata', sans-serif;
  font-weight: 400;
  font-size: 13px;
  padding: 8px 0;
  color: #6b7280;
  text-transform: uppercase;
}
```

#### 4.2.4 Update Date Button Base Styling (lines 112-134)
```css
/* REPLACE .vm-date-button */
.vm-date-button {
  width: 100%;
  height: 100%;
  border: none;
  background: white;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
  font-family: 'Alata', sans-serif;
  font-size: 14px;
  font-weight: 400;
  color: #1f2937;
}

.vm-date-button:hover:not(:disabled) {
  background: rgba(92, 32, 182, 0.1);
  color: rgb(92, 32, 182);
}

.vm-date-button:disabled {
  color: rgb(221, 221, 221);
  cursor: not-allowed;
  background: transparent;
}
```

#### 4.2.5 Add Current Date Styling (after .vm-date-button:disabled)
```css
/* ADD new class for today's date */
.vm-date-button-today {
  background: rgba(245, 245, 250, 0.5);
  font-weight: bold;
  color: rgb(92, 32, 182);
}

.vm-date-button-today:hover:not(:disabled) {
  background: rgba(92, 32, 182, 0.15);
}
```

#### 4.2.6 Update Active/Selected Date Button (lines 137-146)
```css
/* REPLACE .vm-date-button-active */
.vm-date-button-active {
  background: rgb(92, 32, 182);
  color: white;
  font-weight: 600;
}

.vm-date-button-active:hover:not(:disabled) {
  background: rgb(82, 28, 162);
}

/* Date has selected time slots */
.vm-date-button-has-slots {
  background: rgba(92, 32, 182, 0.15);
  color: rgb(92, 32, 182);
  font-weight: 600;
}

.vm-date-button-has-slots:hover:not(:disabled) {
  background: rgba(92, 32, 182, 0.25);
}

/* Date is both active AND has slots */
.vm-date-button-active.vm-date-button-has-slots {
  background: rgb(92, 32, 182);
  color: white;
  box-shadow: 0 0 0 2px rgba(92, 32, 182, 0.3);
}
```

#### 4.2.7 Update Time Slots Grid to 4 Columns (lines 302-309)
```css
/* REPLACE .vm-time-slots-list */
.vm-time-slots-list {
  display: grid;
  grid-template-columns: repeat(4, 1fr);  /* Fixed 4 columns */
  gap: 8px;
  max-height: 280px;
  overflow-y: auto;
  padding: 4px;
}
```

#### 4.2.8 Update Time Slot Button Styling (lines 311-328)
```css
/* REPLACE .vm-time-slot-button */
.vm-time-slot-button {
  padding: 10px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  text-align: center;
  font-family: 'Alata', sans-serif;
  font-size: 13px;
  font-weight: 400;
  transition: all 0.15s ease;
  color: #374151;
}

.vm-time-slot-button:hover:not(:disabled):not(.vm-time-slot-selected) {
  background: rgba(92, 32, 182, 0.08);
  border-color: rgb(92, 32, 182);
  color: rgb(92, 32, 182);
}

.vm-time-slot-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

#### 4.2.9 Update Selected Time Slot Styling (lines 335-344)
```css
/* REPLACE .vm-time-slot-selected */
.vm-time-slot-selected {
  background: rgb(92, 32, 182) !important;
  border-color: rgb(92, 32, 182) !important;
  color: white !important;
  font-weight: 500;
}

.vm-time-slot-selected:hover:not(:disabled) {
  background: rgb(82, 28, 162) !important;
}
```

#### 4.2.10 Update Selected Slots Display Area (lines 195-206)
```css
/* REPLACE .vm-selected-slots */
.vm-selected-slots {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
  min-height: 100px;
  padding: 16px;
  background: rgb(247, 248, 249);
  border-radius: 8px;
  border: none;
}

.vm-empty-slots {
  text-align: center;
  color: #9ca3af;
  font-family: 'Alata', sans-serif;
  font-size: 14px;
  padding: 20px;
  width: 100%;
}
```

#### 4.2.11 Update Slot Badge with Clock Icon (lines 207-223)
```css
/* REPLACE .vm-slot-badge */
.vm-slot-badge {
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 8px 0;
  font-family: 'Alata', sans-serif;
  font-size: 14px;
  color: #374151;
  font-weight: 400;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background 0.2s;
}

.vm-slot-badge::before {
  content: '';
  display: inline-block;
  width: 16px;
  height: 16px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='M12 6v6l4 2'/%3E%3C/svg%3E");
  background-size: contain;
  background-repeat: no-repeat;
}

.vm-slot-badge:hover {
  background: rgba(0, 0, 0, 0.03);
}

.vm-remove-slot-btn {
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  font-size: 16px;
  padding: 0 4px;
  line-height: 1;
  transition: color 0.2s;
}

.vm-remove-slot-btn:hover {
  color: #dc2626;
}
```

#### 4.2.12 Update Clear Button Styling (lines 240-262)
```css
/* REPLACE .vm-clear-button */
.vm-clear-button {
  width: 100%;
  padding: 8px;
  background: transparent;
  border: none;
  border-radius: 0;
  cursor: pointer;
  text-decoration: underline;
  font-family: 'Alata', sans-serif;
  font-size: 13px;
  color: #6b7280;
  transition: color 0.2s;
  margin-bottom: 12px;
}

.vm-clear-button:hover:not(:disabled) {
  color: #374151;
}

.vm-clear-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

#### 4.2.13 Update Section Title Styling (lines 183-193)
```css
/* REPLACE .vm-select-time-title */
.vm-select-time-title {
  font-family: 'Alata', sans-serif;
  font-size: 16px;
  font-weight: 400;
  margin-bottom: 16px;
  text-align: center;
  color: #1f2937;
}
```

#### 4.2.14 Update Time Picker Header (lines 294-300)
```css
/* REPLACE .vm-time-picker-header */
.vm-time-picker-header {
  font-family: 'Alata', sans-serif;
  font-size: 15px;
  font-weight: 400;
  margin-bottom: 12px;
  color: #374151;
  text-align: left;
}
```

#### 4.2.15 Update Inline Time Slots Container (lines 286-292)
```css
/* REPLACE .vm-inline-time-slots */
.vm-inline-time-slots {
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}
```

#### 4.2.16 Update Responsive Breakpoints (lines 350-390)
```css
/* REPLACE media queries */
@media (max-width: 800px) {
  .vm-book-time-slot-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .vm-book-time-slot-container .vm-select-date-section,
  .vm-book-time-slot-container .vm-select-time-section,
  .vm-book-time-slot-container .vm-inline-time-slots {
    grid-column: auto;
    grid-row: auto;
  }

  .vm-time-slots-list {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 640px) {
  .vm-book-time-slot-container {
    max-width: 100%;
  }

  .vm-calendar-header {
    padding: 8px;
  }

  .vm-date-button {
    font-size: 12px;
  }

  .vm-selected-slots {
    min-height: 80px;
    padding: 12px;
  }

  .vm-slot-badge {
    font-size: 13px;
    padding: 6px 0;
  }

  .vm-time-slots-list {
    grid-template-columns: repeat(2, 1fr);
  }

  .vm-time-slot-button {
    padding: 8px 6px;
    font-size: 12px;
  }
}
```

**Dependencies**: VirtualMeetingManager.css (for font import), BookTimeSlot.jsx (uses these class names)

**Verification**:
- Calendar should appear on left, time slots on right
- Month dropdown should have up/down arrows beside it
- Date cells should have clean styling with proper disabled/today/selected states
- Time slots should display in 4-column grid
- Selected slots should show in gray area with clock icons
- Purple accent color should be #5c20b6

---

## 5. Execution Order

### Phase 1: Foundation (Must be done first)
1. **VirtualMeetingManager.css** - Add font import and CSS variables
2. **VirtualMeetingManager.css** - Update container with font-family

### Phase 2: Container & Layout
3. **BookTimeSlot.css** - Update main container grid layout
4. **BookTimeSlot.css** - Update grid section positioning

### Phase 3: Calendar Styling
5. **BookTimeSlot.css** - Update calendar header layout and navigation
6. **BookTimeSlot.css** - Update day header styling
7. **BookTimeSlot.css** - Update date button base styles
8. **BookTimeSlot.css** - Add today's date styling
9. **BookTimeSlot.css** - Update active/selected date styling

### Phase 4: Time Slots Styling
10. **BookTimeSlot.css** - Update time slots grid to 4 columns
11. **BookTimeSlot.css** - Update time slot button styling
12. **BookTimeSlot.css** - Update selected time slot styling

### Phase 5: Selected Area Styling
13. **BookTimeSlot.css** - Update selected slots display area
14. **BookTimeSlot.css** - Update slot badge with clock icon
15. **BookTimeSlot.css** - Update clear button styling

### Phase 6: Button & Polish
16. **VirtualMeetingManager.css** - Update close button positioning
17. **VirtualMeetingManager.css** - Update submit button styling

### Phase 7: Responsive
18. **BookTimeSlot.css** - Update responsive breakpoints

### Safe Stopping Points
- After Phase 2: Layout structure complete
- After Phase 4: Core styling complete
- After Phase 6: All functionality styled

---

## 6. Risk Assessment

### Potential Breaking Changes
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Font not loading | Low | Medium | Include fallback fonts |
| Grid layout breaking on edge viewport sizes | Medium | Medium | Test at multiple breakpoints |
| Color contrast accessibility | Low | Low | Purple on white meets WCAG |
| Responsive stacking issues | Medium | Low | Keep mobile-first approach |

### Edge Cases
1. **Very long month names** - Some languages have long month names
2. **Many selected slots** - Ensure container scrolls properly
3. **Small screen + landscape** - Test tablet landscape orientation

### Rollback Considerations
- All changes are CSS-only, easily revertable via git
- No database or state changes
- Can revert entire file if needed

---

## 7. Verification Checklist

### Visual Verification
- [ ] Modal uses Alata font throughout
- [ ] Close button (X) appears in top-right corner
- [ ] Calendar on left, time selection on right (side-by-side)
- [ ] Month dropdown has up/down navigation arrows
- [ ] Disabled/past dates show in gray (rgb(221, 221, 221))
- [ ] Today's date highlighted with purple text and bold
- [ ] Selected dates have purple background
- [ ] Time slots display in 4-column grid
- [ ] Selected time slots have purple background, white text
- [ ] Selected slots area has gray background (rgb(247, 248, 249))
- [ ] Clock icon appears before each selected slot
- [ ] Submit button white when 3 slots selected
- [ ] Submit button gray (rgb(104, 104, 104)) when < 3 slots

### Functional Verification (Should Not Change)
- [ ] Clicking dates still opens time picker
- [ ] Selecting/deselecting time slots still works
- [ ] Submit button still triggers on click when enabled
- [ ] Close button still closes modal
- [ ] All existing interactions preserved

### Responsive Verification
- [ ] Desktop (1200px+): Side-by-side layout
- [ ] Tablet (800px): Stacked layout, 3-column time grid
- [ ] Mobile (640px): Stacked layout, 2-column time grid

### Browser Testing
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

---

## 8. Reference Appendix

### 8.1 All File Paths

```
C:\Users\Split Lease\Documents\Split Lease\app\src\islands\shared\VirtualMeetingManager\VirtualMeetingManager.css
C:\Users\Split Lease\Documents\Split Lease\app\src\islands\shared\VirtualMeetingManager\BookTimeSlot.css
```

### 8.2 Related Component Files (Reference Only - No Changes)

```
C:\Users\Split Lease\Documents\Split Lease\app\src\islands\shared\VirtualMeetingManager\VirtualMeetingManager.jsx
C:\Users\Split Lease\Documents\Split Lease\app\src\islands\shared\VirtualMeetingManager\BookVirtualMeeting.jsx
C:\Users\Split Lease\Documents\Split Lease\app\src\islands\shared\VirtualMeetingManager\BookTimeSlot.jsx
C:\Users\Split Lease\Documents\Split Lease\app\src\islands\shared\VirtualMeetingManager\dateUtils.js
```

### 8.3 Key Color Values

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Purple Accent | #5c20b6 | rgb(92, 32, 182) | Selected slots, buttons, highlights |
| Disabled Gray | #dddddd | rgb(221, 221, 221) | Past/unavailable dates |
| Selected Area BG | #f7f8f9 | rgb(247, 248, 249) | Selected slots container |
| Submit Disabled | #686868 | rgb(104, 104, 104) | Disabled submit button |
| Submit Enabled BG | #ffffff | white | Enabled submit button |

### 8.4 Typography Reference

```css
/* Font Stack */
font-family: 'Alata', sans-serif;

/* Dropdown */
font-size: 17px;

/* Section Titles */
font-size: 16px;
font-weight: 400;

/* Body Text */
font-size: 14px;
font-weight: 400;

/* Small Text */
font-size: 13px;
```

### 8.5 Clock Icon SVG (Inline Data URI)

```
data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='M12 6v6l4 2'/%3E%3C/svg%3E
```

---

## 9. Notes for Executor

### Critical Constraints Reminder
1. **CSS ONLY** - Do not modify any JSX/JS files
2. **No HTML changes** - Class names must match existing JSX
3. **No functionality changes** - All interactions must continue working
4. **Preserve responsive behavior** - Modal must work at all viewport sizes

### Existing Class Names (Must Preserve)
The following class names are used in JSX and MUST continue to exist:
- `.vm-overlay`
- `.vm-container`
- `.vm-header`
- `.vm-close-btn`
- `.vm-book-time-slot-container`
- `.vm-select-date-section`
- `.vm-select-time-section`
- `.vm-inline-time-slots`
- `.vm-calendar-header`
- `.vm-calendar-nav-btn`
- `.vm-month-select`
- `.vm-days-of-week`
- `.vm-day-header`
- `.vm-calendar-grid`
- `.vm-calendar-cell`
- `.vm-date-button`
- `.vm-date-button-active`
- `.vm-date-button-has-slots`
- `.vm-time-slots-list`
- `.vm-time-slot-button`
- `.vm-time-slot-selected`
- `.vm-selected-slots`
- `.vm-slot-badge`
- `.vm-remove-slot-btn`
- `.vm-clear-button`
- `.vm-button-success`
- `.vm-select-time-title`
- `.vm-time-picker-header`
- `.vm-empty-slots`
- `.vm-current-date-info`

### Testing Approach
1. Open dev server: `bun run dev`
2. Navigate to guest-proposals page
3. Click on a proposal with VM capability
4. Open Virtual Meeting modal
5. Verify visual changes against checklist
6. Test all interactions still work

---

**Plan Created By**: Claude (cleanup-planner agent)
**Plan Version**: 1.0
**Ready for Execution**: Yes
