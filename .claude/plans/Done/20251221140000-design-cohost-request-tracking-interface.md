# Design Implementation Plan: Co-Host Request Tracking Interface

## 1. Overview

### Brief Description
Replace the simple success modal in the Co-Host Request detail view with a comprehensive tracking interface featuring a 5-stage progress bar, status indicators, and a conditional rating/feedback form that activates upon meeting completion.

### User's Original Vision/Reference Summary
- A 5-stage horizontal progress bar showing: Requested, Co-Host Selected, Google Meet Scheduled, Google Meet Finished, Finished
- Visual indicators with purple active states (#6D31C2) and light gray inactive states (#EDEAF6)
- Dots (20px circles) connected by bars (4px height)
- Labels alternating above and below the progress line
- Conditional rating/feedback section that only appears when meeting is complete
- Star rating with yellow/gold selected state (#FDE16D)
- Green submit button (#1F8E16) with outline style
- Metadata display showing creation date and unique ID

### Scope Boundaries

**IS Included:**
- New `CohostProgressBar` sub-component with 5-stage visual progression
- New `CohostDetailsSection` sub-component for rating/feedback
- Enhanced metadata display (creation date, unique ID)
- Status-to-numeric mapping for progress tracking
- CSS additions to ScheduleCohost.css
- Replacement of current "details" stage UI (lines 730-792)

**IS NOT Included:**
- Backend changes to status values
- Database schema modifications
- Changes to the request submission stage
- Changes to cohostService.js API functions
- Toast notification modifications

---

## 2. Reference Analysis

### Key Visual Characteristics Identified

**Progress Bar Design:**
[FROM REFERENCE]
- 5 stages in horizontal layout
- Dots: 20px circles
- Inactive dot/bar color: #EDEAF6 (light purple-gray)
- Active dot/bar color: #6D31C2 (purple)
- Bars: 4px height, connecting dots
- Cascading fill effect: all stages up to and including current status are active
- Labels alternate: "Co-Host Selected" and "Google Meet Finished" above; "Requested", "Google Meet Scheduled", and "Finished" below

**Rating/Feedback Section:**
[FROM REFERENCE]
- Only visible when status >= "Google Meet Finished"
- Container: #F1F3F5 background, 1px solid #000 border, 10px border-radius, 8px padding
- Star rating: 5 stars, unselected #E3E3E3, selected #FDE16D (yellow/gold)
- Half-star support mentioned (optional enhancement)
- Feedback textarea with focus state: blue #52A8EC glow on focus
- Submit button: outline style, green #1F8E16, font Lato 700 18px

**Metadata Section:**
[FROM REFERENCE]
- "Created: [Date]" format
- "Unique ID: [ID]" format
- Font: Lato 400 12px
- Color: #424242
- Centered alignment

### Design System Alignment Notes
[FROM CODEBASE]
- Existing CSS uses `--sc-*` variables (schedule-cohost namespace)
- Existing star rating already implemented (lines 105-126 in JSX)
- Existing star colors differ from spec: current uses #D4D4D4 (unselected) and #F6DA3B (filled)
- Must update star colors to match spec: #E3E3E3 unselected, #FDE16D selected
- Current progress patterns in guest-proposals.css use `.inline-progress-tracker` with similar structure

---

## 3. Existing Codebase Integration

### Relevant Existing Components to Reuse/Extend

1. **StarRating Component** (lines 105-126 of ScheduleCohost.jsx)
   - Already exists, needs color update to match spec
   - Current: #D4D4D4 unselected, #F6DA3B filled
   - Spec: #E3E3E3 unselected, #FDE16D filled

2. **Toast System** (already in place)
   - Will continue to use existing toast for feedback submission

3. **submitRating Function** (cohostService.js lines 231-259)
   - Already implemented, no changes needed

### Existing Styling Patterns to Follow
[FROM CODEBASE]
- BEM-like naming: `.schedule-cohost-*`
- CSS custom properties in `:root` block
- Section separation with comment blocks
- Responsive breakpoints at 768px and 480px

### Files That Will Be Affected

| File | Change Type |
|------|-------------|
| `app/src/islands/shared/ScheduleCohost/ScheduleCohost.jsx` | Major - Replace details stage UI (lines 730-792) |
| `app/src/islands/shared/ScheduleCohost/ScheduleCohost.css` | Major - Add progress bar and details section styles |

### Utilities and Helpers Available
[FROM CODEBASE]
- `formatDateForDisplay(date)` in cohostService.js (for creation date display)
- `sanitizeInput(input)` in cohostService.js (for feedback input)

---

## 4. Component Specifications

### 4.1 CohostProgressBar Sub-Component

**Purpose:**
Display a 5-stage horizontal progress bar showing the current status of a co-host request with visual indicators for completed, current, and pending stages.

**Visual Specifications:**

| Property | Value | Notes |
|----------|-------|-------|
| Container padding | 20px 16px | Horizontal padding for edge clearance |
| Dot diameter | 20px | All stages |
| Dot inactive color | #EDEAF6 | Light purple-gray |
| Dot active color | #6D31C2 | Purple |
| Bar height | 4px | Connecting bars |
| Bar inactive color | #EDEAF6 | Light purple-gray |
| Bar active color | #6D31C2 | Purple |
| Label font | Lato 400 11px | Below breakpoint may need 10px |
| Label color inactive | #B5B5B5 | Muted gray |
| Label color active | #3D3D3D | Dark text |
| Label line-height | 1.3 | Tight line height for multi-line labels |
| Label max-width | 80px | Prevent label overflow |
| Gap between dot and label | 6px | Vertical spacing |

**Props/Variants:**

```typescript
interface CohostProgressBarProps {
  currentStatus: string;  // Status string from coHostRequest
}
```

**Status Order Mapping:**
```javascript
const STATUS_ORDER = {
  'Co-Host Requested': 1,
  'Requested': 1,
  'Co-Host Selected': 2,
  'Google Meet Scheduled': 3,
  'Virtual Meeting Finished': 4,
  'Google Meet Finished': 4,
  'Finished': 5,
  'Request closed': 5,
  'Closed': 5,
};
```

**Stage Definitions:**
```javascript
const COHOST_STAGES = [
  { order: 1, label: 'Requested', labelPosition: 'below' },
  { order: 2, label: 'Co-Host Selected', labelPosition: 'above' },
  { order: 3, label: 'Google Meet Scheduled', labelPosition: 'below' },
  { order: 4, label: 'Google Meet Finished', labelPosition: 'above' },
  { order: 5, label: 'Finished', labelPosition: 'below' },
];
```

**Accessibility:**
- Add `role="progressbar"` to container
- Add `aria-valuenow` with current stage number
- Add `aria-valuemin="1"` and `aria-valuemax="5"`
- Add `aria-label="Co-host request progress"`

**JSX Structure:**
```jsx
<div className="schedule-cohost-progress" role="progressbar" aria-valuenow={currentStageOrder} aria-valuemin="1" aria-valuemax="5" aria-label="Co-host request progress">
  {/* Top labels row */}
  <div className="schedule-cohost-progress-labels schedule-cohost-progress-labels--top">
    {COHOST_STAGES.filter(s => s.labelPosition === 'above').map(stage => (
      <span
        key={stage.order}
        className={`schedule-cohost-progress-label ${currentStageOrder >= stage.order ? 'schedule-cohost-progress-label--active' : ''}`}
        style={{ gridColumn: stage.order }}
      >
        {stage.label}
      </span>
    ))}
  </div>

  {/* Dots and bars row */}
  <div className="schedule-cohost-progress-track">
    {COHOST_STAGES.map((stage, index) => (
      <React.Fragment key={stage.order}>
        {index > 0 && (
          <div className={`schedule-cohost-progress-bar ${currentStageOrder >= stage.order ? 'schedule-cohost-progress-bar--active' : ''}`} />
        )}
        <div className={`schedule-cohost-progress-dot ${currentStageOrder >= stage.order ? 'schedule-cohost-progress-dot--active' : ''}`} />
      </React.Fragment>
    ))}
  </div>

  {/* Bottom labels row */}
  <div className="schedule-cohost-progress-labels schedule-cohost-progress-labels--bottom">
    {COHOST_STAGES.filter(s => s.labelPosition === 'below').map(stage => (
      <span
        key={stage.order}
        className={`schedule-cohost-progress-label ${currentStageOrder >= stage.order ? 'schedule-cohost-progress-label--active' : ''}`}
        style={{ gridColumn: stage.order }}
      >
        {stage.label}
      </span>
    ))}
  </div>
</div>
```

---

### 4.2 CohostDetailsSection Sub-Component (Rating/Feedback)

**Purpose:**
Display a rating and feedback form when the meeting has been completed (status >= stage 4).

**Visual Specifications:**

| Property | Value | Notes |
|----------|-------|-------|
| Container background | #F1F3F5 | Light gray |
| Container border | 1px solid #000 | Black border |
| Container border-radius | 10px | Rounded corners |
| Container padding | 16px | Inner spacing |
| Container margin-top | 24px | Space above section |
| Title font | Lato 600 16px | Section heading |
| Title color | #3D3D3D | Dark text |
| Title margin-bottom | 12px | Space below title |
| Star unselected color | #E3E3E3 | Light gray |
| Star selected color | #FDE16D | Yellow/gold |
| Star size | 32px | Same as existing |
| Star gap | 8px | Between stars |
| Textarea border default | 1px solid #686B6B | Gray border |
| Textarea border-radius | 4px | Slightly rounded |
| Textarea padding | 12px | Inner spacing |
| Textarea font | Lato 400 14px | Body text |
| Textarea min-height | 80px | Minimum 3-4 lines |
| Textarea margin-top | 16px | Space above |
| Textarea focus border | 1px solid #52A8EC | Blue border |
| Textarea focus box-shadow | 0 0 0 3px rgba(82, 168, 236, 0.25) | Blue glow |
| Submit button background | transparent | Outline style |
| Submit button border | 2px solid #1F8E16 | Green border |
| Submit button color | #1F8E16 | Green text |
| Submit button font | Lato 700 18px | Bold |
| Submit button padding | 12px 32px | Comfortable click target |
| Submit button border-radius | 8px | Rounded |
| Submit button margin-top | 16px | Space above |
| Submit button hover background | #1F8E16 | Fill on hover |
| Submit button hover color | #FFFFFF | White text on hover |
| Submit button disabled opacity | 0.5 | Dimmed when disabled |

**Props/Variants:**

```typescript
interface CohostDetailsSectionProps {
  rating: number;              // 0-5
  onRatingChange: (rating: number) => void;
  ratingMessage: string;
  onRatingMessageChange: (message: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  disabled?: boolean;
}
```

**Accessibility:**
- Star buttons have `aria-label="Rate {n} out of 5 stars"`
- Textarea has `aria-label="Feedback message (optional)"`
- Submit button disabled when rating is 0 or isLoading is true

---

### 4.3 Updated StarRating Component

**Purpose:**
Update the existing StarRating component colors to match the design spec.

**Color Changes:**
| State | Current | New |
|-------|---------|-----|
| Unselected | #D4D4D4 | #E3E3E3 |
| Selected/Filled | #F6DA3B | #FDE16D |

---

### 4.4 Metadata Display

**Purpose:**
Show creation date and unique ID below the main content.

**Visual Specifications:**

| Property | Value | Notes |
|----------|-------|-------|
| Container margin-top | 24px | Space above |
| Container text-align | center | Centered |
| Font | Lato 400 12px | Small text |
| Color | #424242 | Medium gray |
| Line spacing | 4px | Between lines |

**JSX Structure:**
```jsx
<div className="schedule-cohost-metadata-centered">
  {coHostRequest.createdDate && (
    <p>Created: {formatDateForDisplay(new Date(coHostRequest.createdDate))}</p>
  )}
  {coHostRequest.id && (
    <p>Unique ID: {coHostRequest.id}</p>
  )}
</div>
```

---

## 5. Layout and Composition

### Overall Details Stage Structure

```
┌─────────────────────────────────────────────────────────────┐
│                        Modal Container                       │
├─────────────────────────────────────────────────────────────┤
│  [Header: "Meet with a Co-Host" + subtitle]                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            CohostProgressBar Component              │    │
│  │                                                     │    │
│  │     [Top Labels: "Co-Host Selected", "Google       │    │
│  │                   Meet Finished"]                   │    │
│  │                                                     │    │
│  │     ●─────●─────●─────●─────●                      │    │
│  │                                                     │    │
│  │     [Bottom Labels: "Requested", "Google Meet      │    │
│  │                      Scheduled", "Finished"]        │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Meeting Times Display                   │    │
│  │              (existing UI preserved)                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Topics Display (if present)             │    │
│  │              (existing UI preserved)                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            CohostDetailsSection                      │    │
│  │            (only if status >= stage 4)               │    │
│  │                                                     │    │
│  │   "How was your meeting?"                           │    │
│  │   ★ ★ ★ ★ ★                                        │    │
│  │   [Feedback textarea]                               │    │
│  │   [Submit Rating] button                            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  [Done button]                                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            Metadata Display                          │    │
│  │   Created: [Date]                                   │    │
│  │   Unique ID: [ID]                                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Z-Index Layering
- No z-index changes needed; modal already uses z-index: 9999

### Responsive Breakpoint Behaviors

**Desktop (> 768px):**
- Full progress bar with all labels visible
- Labels on alternating rows (above/below)
- Comfortable spacing between elements

**Tablet (480px - 768px):**
- Progress bar condenses slightly
- Labels may use smaller font (10px)
- All elements remain visible

**Mobile (< 480px):**
- Progress bar further condensed
- Labels may truncate or wrap
- Consider stacking progress bar vertically if needed
- [SUGGESTED] If progress bar becomes too cramped, could hide connecting bars and show only dots with labels below

---

## 6. Interactions and Animations

### Progress Bar Transitions
[SUGGESTED]
- No animation on initial render (instant display)
- If status updates while viewing, use 300ms transition on color changes
- Transition property: `background-color 0.3s ease`

### Star Rating Interactions
[FROM CODEBASE - Existing]
- Hover: Scale to 1.1x
- Click: Immediate color change to selected
- All stars up to clicked star become selected

### Submit Button States
| State | Appearance |
|-------|------------|
| Default | Green outline (#1F8E16 border/text, transparent bg) |
| Hover | Green fill (#1F8E16 bg, white text) |
| Disabled | 50% opacity, cursor not-allowed |
| Loading | Show "Submitting..." text, disabled state |

### Textarea Focus State
- Default border: #686B6B
- Focus: Blue border (#52A8EC) + blue glow shadow

---

## 7. Assets Required

### Icons
[FROM CODEBASE]
- No new icons needed; star character (★) already used

### Images/Illustrations
- None required

### Fonts
[FROM CODEBASE]
- Lato (already loaded): weights 400, 700 needed
- DM Sans (already loaded): for fallback

---

## 8. Implementation Sequence

### Step 1: Add CSS Variables and Progress Bar Styles
Add new CSS custom properties to ScheduleCohost.css for the progress bar colors and dimensions.

### Step 2: Add Details Section Styles
Add CSS for the rating/feedback section with the specified colors and layout.

### Step 3: Update Star Rating Styles
Modify existing `.schedule-cohost-star` and `.schedule-cohost-star--filled` colors to match spec.

### Step 4: Add Metadata Centered Styles
Add CSS for the new centered metadata display.

### Step 5: Define Status Order Mapping
Add the `STATUS_ORDER` constant and `COHOST_STAGES` array at the top of the component file.

### Step 6: Create CohostProgressBar Sub-Component
Implement the progress bar as a function component within ScheduleCohost.jsx.

### Step 7: Create CohostDetailsSection Sub-Component
Implement the details section with star rating, textarea, and submit button.

### Step 8: Update Details Stage JSX
Replace lines 730-792 with the new component structure.

### Step 9: Test All Status States
Verify progress bar renders correctly for each possible status value.

### Step 10: Test Responsive Behavior
Verify layout at 480px, 768px, and desktop breakpoints.

### Step 11: Test Rating Submission
Verify existing rating submission workflow still functions.

---

## 9. Assumptions and Clarifications Needed

### Assumptions Made
[SUGGESTED]
1. **Status string normalization**: The component should handle both "Co-Host Requested" and "Requested" as equivalent (stage 1), and similar variations for other statuses.

2. **Creation date availability**: The `coHostRequest` object is assumed to have a `createdDate` field. If not present, that line of metadata will be hidden.

3. **Half-star rating**: The design spec mentions half-star support, but the existing implementation does whole stars only. Implementing half-stars would require significant changes to the StarRating component. [NEEDS CLARIFICATION] Is half-star support required for initial implementation?

4. **Progress bar on mobile**: At very narrow widths, the 5-stage progress bar may become cramped. [SUGGESTED] A stacked/vertical layout could be considered for < 320px widths, but this is an edge case.

### Questions for User
[NEEDS CLARIFICATION]
1. **Half-star rating**: Should the star rating support half-star selections (e.g., 3.5 stars), or is whole-star rating sufficient?

2. **Creation date source**: Does `coHostRequest` currently include a `createdDate` field from the API, or does this need to be added to the Edge Function response?

3. **Status value variations**: Are there other status string variations beyond what's documented that need to be mapped?

---

## 10. File References

### Primary Files to Modify
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\shared\ScheduleCohost\ScheduleCohost.jsx`
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\shared\ScheduleCohost\ScheduleCohost.css`

### Reference Files Consulted
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\shared\ScheduleCohost\cohostService.js` (API functions, date formatting)
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\styles\components\guest-proposals.css` (inline progress tracker patterns)
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\proposals\ProgressTracker.jsx` (progress tracker component pattern)
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\styles\components\host-proposals.css` (progress bar styling reference)

---

## 11. CSS Additions Summary

### New CSS Variables (add to :root)
```css
/* Co-host Progress Bar */
--sc-progress-inactive: #EDEAF6;
--sc-progress-active: #6D31C2;
--sc-progress-dot-size: 20px;
--sc-progress-bar-height: 4px;

/* Co-host Details Section */
--sc-details-bg: #F1F3F5;
--sc-details-border: #000000;
--sc-star-unselected: #E3E3E3;
--sc-star-selected: #FDE16D;
--sc-focus-blue: #52A8EC;
--sc-submit-green: #1F8E16;
```

### New CSS Classes Required
1. `.schedule-cohost-progress` - Progress bar container
2. `.schedule-cohost-progress-labels` - Labels row container
3. `.schedule-cohost-progress-labels--top` - Top labels modifier
4. `.schedule-cohost-progress-labels--bottom` - Bottom labels modifier
5. `.schedule-cohost-progress-label` - Individual label
6. `.schedule-cohost-progress-label--active` - Active label state
7. `.schedule-cohost-progress-track` - Dots/bars row container
8. `.schedule-cohost-progress-dot` - Individual dot
9. `.schedule-cohost-progress-dot--active` - Active dot state
10. `.schedule-cohost-progress-bar` - Connecting bar
11. `.schedule-cohost-progress-bar--active` - Active bar state
12. `.schedule-cohost-details-section` - Rating section container
13. `.schedule-cohost-details-title` - Section title
14. `.schedule-cohost-feedback-textarea` - Feedback input
15. `.schedule-cohost-submit-rating-btn` - Submit button
16. `.schedule-cohost-metadata-centered` - Centered metadata

---

**Plan Version**: 1.0
**Created**: 2025-12-21
**Author**: Design Implementation Planner (Claude)
