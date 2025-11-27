# HostScheduleSelector - Schedule Selection Component

**GENERATED**: 2025-11-27
**PARENT**: app/src/islands/shared/

---

## DIRECTORY_INTENT

[PURPOSE]: Reusable React component for selecting nights of the week
[PATTERN]: Self-contained module with component, utils, types, and constants
[ORIGIN]: Based on Bubble.io implementation with complete workflow logic

---

## FILE_INVENTORY

### HostScheduleSelector.jsx
[INTENT]: Main React component for night selection
[EXPORTS]: HostScheduleSelector (default)
[FEATURES]: Controlled/uncontrolled modes, contiguity checking, auto-fill, alerts

### constants.js
[INTENT]: Night definitions and lookup maps
[EXPORTS]: ALL_NIGHTS, NIGHTS_MAP, getNightById(), getNightByNumber()

### utils.js
[INTENT]: Utility functions for schedule logic
[EXPORTS]: checkContiguity, autoFillSequence, autoCompleteToSeven, sortNights, validateSelection, isNightAvailable

### types.js
[INTENT]: JSDoc type definitions
[TYPES]: NightId, DayId, Night, Listing, HostScheduleSelectorProps

### HostScheduleSelector.css
[INTENT]: Component styles

---

## NIGHT_DATA_STRUCTURE

```javascript
{
  id: 'monday',           // NightId (lowercase)
  display: 'Monday',      // Full name
  singleLetter: 'M',      // For compact display
  first3Letters: 'Mon',   // Short form
  bubbleNumber: 2,        // Bubble.io numbering (1-7, Sunday=1)
  associatedCheckin: 'Monday',
  associatedCheckout: 'Tuesday',
  nextNight: 'tuesday',
  previousDay: 'Sunday',
  sameDay: 'Monday',
}
```

---

## KEY_WORKFLOWS

### Workflow 9: Adding a Night
1. Check if clickable and not at max (7)
2. If second selection, auto-fill sequence between first and new
3. If hits 6 nights, auto-complete to 7
4. Trigger state update and callbacks

### Workflow 10: Removing a Night
1. Remove night from selection
2. If going from 7 to 6, show warning
3. Trigger state update and callbacks

---

## COMPONENT_PROPS

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| listing | Listing | - | The listing being edited |
| selectedNights | NightId[] | - | Controlled selection |
| onSelectionChange | function | - | Selection change callback |
| isClickable | boolean | true | Enable/disable interaction |
| inProposal | boolean | false | Proposal mode (different behavior) |
| mode | string | 'normal' | 'normal', 'proposal', 'preview', 'step-by-step-guide' |
| onAlert | function | - | Alert notification callback |

---

## USAGE

```jsx
import { HostScheduleSelector } from 'islands/shared/HostScheduleSelector';

<HostScheduleSelector
  listing={listing}
  onSelectionChange={(nights) => setSelectedNights(nights)}
  onAlert={(title, content, type) => showToast({ title, content, type })}
/>
```

---

## DAY_INDEXING

**Critical**: This component uses Bubble.io day numbering:
- Sunday = 1, Monday = 2, ... Saturday = 7

Convert at boundaries using processors if needed.

---

**FILE_COUNT**: 5
