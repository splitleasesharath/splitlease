# External Processors Context

**TYPE**: LEAF NODE (CRITICAL)
**PARENT**: app/src/logic/processors/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Anti-Corruption Layer for Bubble.io API day format conversion
[LAYER]: Layer 3 - Processors (boundary transformation)
[CRITICAL]: MUST use these functions at ALL API boundaries

---

## ### DAY_INDEXING_REFERENCE ###

| Day | JavaScript (Internal) | Bubble API (External) |
|-----|----------------------|----------------------|
| Sunday | 0 | 1 |
| Monday | 1 | 2 |
| Tuesday | 2 | 3 |
| Wednesday | 3 | 4 |
| Thursday | 4 | 5 |
| Friday | 5 | 6 |
| Saturday | 6 | 7 |

[FORMULA_FROM_BUBBLE]: jsDay = bubbleDay - 1
[FORMULA_TO_BUBBLE]: bubbleDay = jsDay + 1

---

## ### LOGIC_CONTRACTS ###

### adaptDaysFromBubble
[PATH]: ./adaptDaysFromBubble.js
[INTENT]: Convert day array from Bubble format (1-7) to JS format (0-6)
[SIGNATURE]: ({ bubbleDays: number[] }) => number[]
[INPUT]:
  - bubbleDays: number[] (req) - Array of 1-based Bubble day numbers
[OUTPUT]: number[] - Array of 0-based JS day indices
[THROWS]:
  - Error: "bubbleDays must be an array" - When not array
  - Error: "Invalid day value N" - When not number
  - Error: "Invalid Bubble day number N, must be 1-7" - When out of range
[EXAMPLE]:
  ```
  adaptDaysFromBubble({ bubbleDays: [2, 3, 4, 5, 6] })
  // => [1, 2, 3, 4, 5] (Monday-Friday in JS format)
  ```
[DEPENDS_ON]: None (pure function)
[USED_BY]: All components receiving day data from API

### adaptDaysToBubble
[PATH]: ./adaptDaysToBubble.js
[INTENT]: Convert day array from JS format (0-6) to Bubble format (1-7)
[SIGNATURE]: ({ zeroBasedDays: number[] }) => number[]
[INPUT]:
  - zeroBasedDays: number[] (req) - Array of 0-based JS day indices
[OUTPUT]: number[] - Array of 1-based Bubble day numbers
[THROWS]:
  - Error: "zeroBasedDays must be an array" - When not array
  - Error: "Invalid day value N" - When not number
  - Error: "Invalid day index N, must be 0-6" - When out of range
[EXAMPLE]:
  ```
  adaptDaysToBubble({ zeroBasedDays: [1, 2, 3, 4, 5] })
  // => [2, 3, 4, 5, 6] (Monday-Friday in Bubble format)
  ```
[DEPENDS_ON]: None (pure function)
[USED_BY]: All components sending day data to API

### adaptDayFromBubble
[PATH]: ./adaptDayFromBubble.js
[INTENT]: Convert single day from Bubble format (1-7) to JS format (0-6)
[SIGNATURE]: ({ bubbleDay: number }) => number
[INPUT]:
  - bubbleDay: number (req) - Single 1-based Bubble day number
[OUTPUT]: number - Single 0-based JS day index
[THROWS]: Error when bubbleDay not 1-7
[EXAMPLE]: adaptDayFromBubble({ bubbleDay: 1 }) => 0 (Sunday)
[DEPENDS_ON]: None (pure function)

### adaptDayToBubble
[PATH]: ./adaptDayToBubble.js
[INTENT]: Convert single day from JS format (0-6) to Bubble format (1-7)
[SIGNATURE]: ({ jsDay: number }) => number
[INPUT]:
  - jsDay: number (req) - Single 0-based JS day index
[OUTPUT]: number - Single 1-based Bubble day number
[THROWS]: Error when jsDay not 0-6
[EXAMPLE]: adaptDayToBubble({ jsDay: 0 }) => 1 (Sunday)
[DEPENDS_ON]: None (pure function)

---

## ### CRITICAL_USAGE_RULES ###

[RULE_1]: ALWAYS use adaptDaysFromBubble when receiving day data from Bubble API
[RULE_2]: ALWAYS use adaptDaysToBubble when sending day data to Bubble API
[RULE_3]: ALL internal frontend code uses JavaScript format (0-6)
[RULE_4]: NEVER mix formats in the same array
[RULE_5]: Convert at the boundary, not in business logic

---

## ### COMMON_PATTERNS ###

### Receiving from API
```javascript
import { adaptDaysFromBubble } from 'logic/processors/external/adaptDaysFromBubble'

const apiResponse = await fetchListing()
const selectedDays = adaptDaysFromBubble({ bubbleDays: apiResponse['Days Available'] })
// selectedDays is now in JS format [1, 2, 3, 4, 5] for Mon-Fri
```

### Sending to API
```javascript
import { adaptDaysToBubble } from 'logic/processors/external/adaptDaysToBubble'

const userSelectedDays = [1, 2, 3, 4, 5] // Mon-Fri in JS format
const bubbleDays = adaptDaysToBubble({ zeroBasedDays: userSelectedDays })
// bubbleDays is now [2, 3, 4, 5, 6] for Bubble API
await updateProposal({ 'Days Requested': bubbleDays })
```

---

## ### DEPENDENCIES ###

[LOCAL]: None
[EXTERNAL]: None
[EXPORTS]: adaptDaysFromBubble, adaptDaysToBubble, adaptDayFromBubble, adaptDayToBubble

---

## ### SHARED_CONVENTIONS ###

[NO_FALLBACK]: All functions throw errors, never return defaults
[PURE]: No side effects, deterministic output
[VALIDATION]: Strict range validation (1-7 or 0-6)

---

**FILE_COUNT**: 4
**EXPORTS_COUNT**: 4
