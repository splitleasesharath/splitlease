# Host Schedule Selector Context

**TYPE**: LEAF NODE
**PARENT**: app/src/islands/shared/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Reusable React component for hosts to select nights of the week
[PATTERN]: Self-contained module with component, utils, types, and constants
[ORIGIN]: Based on Bubble.io implementation with complete workflow logic

---

## ### COMPONENT_CONTRACTS ###

### HostScheduleSelector.jsx
[PATH]: ./HostScheduleSelector.jsx
[INTENT]: Main React component for night selection with auto-fill and contiguity
[PROPS]:
  - listing: Listing (opt) - The listing being edited
  - selectedNights: NightId[] (opt) - Controlled selection
  - onSelectionChange: (nights: NightId[]) => void (req) - Selection change callback
  - isClickable: boolean (opt, default: true) - Enable/disable interaction
  - inProposal: boolean (opt, default: false) - Proposal mode (different behavior)
  - mode: 'normal' | 'proposal' | 'preview' | 'step-by-step-guide' (opt, default: 'normal')
  - onAlert: (title: string, content: string, type: string) => void (opt) - Alert callback
[BEHAVIOR]:
  - Auto-fill sequence between first and second selection
  - Auto-complete to 7 nights when hitting 6
  - Warning on removal from 7 to 6
[EXPORTS]: HostScheduleSelector (default)

---

### constants.js
[PATH]: ./constants.js
[INTENT]: Night definitions and lookup maps
[EXPORTS]: ALL_NIGHTS, NIGHTS_MAP, getNightById(), getNightByNumber()
[DATA_SHAPE]:
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
  sameDay: 'Monday'
}
```

---

### utils.js
[PATH]: ./utils.js
[INTENT]: Utility functions for schedule logic
[EXPORTS]:
  - checkContiguity: (nights: NightId[]) => boolean
  - autoFillSequence: (start: NightId, end: NightId) => NightId[]
  - autoCompleteToSeven: (nights: NightId[]) => NightId[]
  - sortNights: (nights: NightId[]) => NightId[]
  - validateSelection: (nights: NightId[], listing: object) => ValidationResult
  - isNightAvailable: (night: NightId, listing: object) => boolean

---

### types.js
[PATH]: ./types.js
[INTENT]: JSDoc type definitions
[TYPES]: NightId, DayId, Night, Listing, HostScheduleSelectorProps

---

## ### DAY_INDEXING_WARNING ###

**CRITICAL**: This component uses **Bubble.io day numbering**:
- Sunday = 1, Monday = 2, ... Saturday = 7

Convert at boundaries using processors/external/adaptDays* when interfacing with JavaScript 0-6 format.

---

## ### KEY_WORKFLOWS ###

### Adding a Night (Workflow 9)
1. Check if clickable and not at max (7)
2. If second selection, auto-fill sequence between first and new
3. If hits 6 nights, auto-complete to 7
4. Trigger state update and callbacks

### Removing a Night (Workflow 10)
1. Remove night from selection
2. If going from 7 to 6, show warning
3. Trigger state update and callbacks

---

## ### CRITICAL_USAGE_RULES ###

[RULE_1]: Uses Bubble day numbering (1-7), NOT JavaScript (0-6)
[RULE_2]: Auto-fill only triggers on second selection
[RULE_3]: 6→7 auto-complete is automatic
[RULE_4]: Alert callback is optional but recommended for UX

---

## ### DEPENDENCIES ###

[LOCAL]: None
[EXTERNAL]: None

---

**FILE_COUNT**: 5
**EXPORTS_COUNT**: 6
