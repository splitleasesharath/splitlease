# External Processors - Logic Layer 3

**GENERATED**: 2025-11-26
**LAYER**: Processors (Data Transformers)
**PARENT**: app/src/logic/processors/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: CRITICAL data transformation between JavaScript and external APIs (Bubble.io)
[LAYER]: Layer 3 - Processors (boundary conversion, data adaptation)
[PATTERN]: Convert data formats at system boundaries

---

## ### CRITICAL_DAY_INDEXING ###

[JAVASCRIPT_FORMAT]: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
[BUBBLE_API_FORMAT]: 1=Sunday, 2=Monday, 3=Tuesday, 4=Wednesday, 5=Thursday, 6=Friday, 7=Saturday
[CONVERSION_RULE]: Bubble day = JS day + 1; JS day = Bubble day - 1

---

## ### FILE_INVENTORY ###

### adaptDayFromBubble.js
[INTENT]: CRITICAL - Convert single day from Bubble.io format (1-7) to JavaScript format (0-6)
[EXPORTS]: adaptDayFromBubble
[SIGNATURE]: (bubbleDay: number) => number
[EXAMPLE]: adaptDayFromBubble(1) => 0 (Sunday)

### adaptDaysFromBubble.js
[INTENT]: CRITICAL - Convert day array from Bubble.io format (1-7) to JavaScript format (0-6)
[EXPORTS]: adaptDaysFromBubble
[SIGNATURE]: (bubbleDays: number[]) => number[]
[EXAMPLE]: adaptDaysFromBubble([1, 2, 3]) => [0, 1, 2]

### adaptDayToBubble.js
[INTENT]: CRITICAL - Convert single day from JavaScript format (0-6) to Bubble.io format (1-7)
[EXPORTS]: adaptDayToBubble
[SIGNATURE]: (jsDay: number) => number
[EXAMPLE]: adaptDayToBubble(0) => 1 (Sunday)

### adaptDaysToBubble.js
[INTENT]: CRITICAL - Convert day array from JavaScript format (0-6) to Bubble.io format (1-7)
[EXPORTS]: adaptDaysToBubble
[SIGNATURE]: (jsDays: number[]) => number[]
[EXAMPLE]: adaptDaysToBubble([0, 1, 2]) => [1, 2, 3]

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { adaptDaysFromBubble } from 'logic/processors/external/adaptDaysFromBubble'
[USE_WHEN]: Receiving day data from Bubble API responses
[USE_WHEN]: Sending day data to Bubble API requests

---

## ### CRITICAL_RULES ###

[RULE_1]: ALWAYS convert when receiving data from Bubble API
[RULE_2]: ALWAYS convert when sending data to Bubble API
[RULE_3]: Internal frontend code uses JavaScript format (0-6)
[RULE_4]: Never mix formats in the same array

---

**FILE_COUNT**: 4
**EXPORTS_COUNT**: 4
