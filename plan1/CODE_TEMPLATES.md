# Logic Core Code Templates

This document provides copy-paste templates for each pillar of the Logic Core architecture. Use these as starting points when creating new logic modules.

---

## Table of Contents
1. [Calculator Template](#calculator-template)
2. [Rule Template](#rule-template)
3. [Processor Template](#processor-template)
4. [Workflow Template](#workflow-template)
5. [Hollow Island Template](#hollow-island-template)
6. [Logic Hook Template](#logic-hook-template)

---

## Calculator Template

**File:** `app/src/logic/calculators/{domain}/{calculateSomething}.js`

**Purpose:** Pure mathematical functions that always return the same output for the same input.

**Key Rules:**
- ✅ Pure function (no side effects, no global state)
- ✅ Named parameters for clarity
- ✅ Strict type checking - throw on invalid input
- ✅ NO fallback values (no `|| 0`)
- ✅ JSDoc with `@intent` tag

```javascript
/**
 * [Brief description of what this calculates]
 *
 * @intent [Why this exists from a business perspective]
 * @rule [Any business rules or constraints]
 *
 * @param {object} params - Named parameters for clarity.
 * @param {number} params.inputA - Description of first input.
 * @param {number} params.inputB - Description of second input.
 * @returns {number} Description of the calculated result.
 *
 * @throws {Error} If any parameter is not a number.
 * @throws {Error} If any business rule constraint is violated.
 *
 * @example
 * const result = calculateSomething({ inputA: 100, inputB: 4 })
 * // => 400
 */
export function calculateSomething({ inputA, inputB }) {
  // STEP 1: Type validation - No Fallback enforcement
  if (typeof inputA !== 'number' || isNaN(inputA)) {
    throw new Error(
      `calculateSomething: inputA must be a number, got ${typeof inputA}`
    )
  }

  if (typeof inputB !== 'number' || isNaN(inputB)) {
    throw new Error(
      `calculateSomething: inputB must be a number, got ${typeof inputB}`
    )
  }

  // STEP 2: Business rule validation
  if (inputB < 0) {
    throw new Error(
      `calculateSomething: inputB must be non-negative, got ${inputB}`
    )
  }

  // STEP 3: Pure calculation
  const result = inputA * inputB

  return result
}
```

### Real Example: Four Week Rent

```javascript
/**
 * Calculates the baseline rent for a standard 4-week period.
 *
 * @intent Determine the recurring monthly cost basis before fees.
 * @rule Four weeks is the standard billing cycle for split lease.
 *
 * @param {object} params - Named parameters for clarity.
 * @param {number} params.nightlyRate - The base cost per night in USD.
 * @param {number} params.frequency - The number of nights per week (2-7).
 * @returns {number} The total rent for a 4-week cycle.
 */
export function calculateFourWeekRent({ nightlyRate, frequency }) {
  if (typeof nightlyRate !== 'number' || isNaN(nightlyRate)) {
    throw new Error(
      `calculateFourWeekRent: nightlyRate must be a number, got ${typeof nightlyRate}`
    )
  }

  if (typeof frequency !== 'number' || isNaN(frequency)) {
    throw new Error(
      `calculateFourWeekRent: frequency must be a number, got ${typeof frequency}`
    )
  }

  if (frequency < 2 || frequency > 7) {
    throw new Error(
      `calculateFourWeekRent: frequency must be between 2-7 nights, got ${frequency}`
    )
  }

  return nightlyRate * frequency * 4
}
```

---

## Rule Template

**File:** `app/src/logic/rules/{domain}/{isCondition}.js` or `{canAction}.js` or `{shouldAction}.js`

**Purpose:** Boolean predicates that check business rules and permissions.

**Key Rules:**
- ✅ Returns ONLY boolean (true/false)
- ✅ NO side effects (no mutations, no API calls)
- ✅ NO UI concerns (no error messages, no strings)
- ✅ Naming convention: `is*`, `can*`, `should*`, `has*`
- ✅ JSDoc with `@intent` and `@rule` tags

```javascript
/**
 * [Brief description of what condition this checks]
 *
 * @intent [Why this rule exists from a business perspective]
 * @rule [The specific business rule being enforced]
 *
 * @param {object} context - The validation context.
 * @param {any} context.subject - The thing being validated.
 * @param {any} context.criteria - The criteria to check against.
 * @returns {boolean} True if condition is met, false otherwise.
 *
 * @example
 * const valid = isConditionMet({ subject: something, criteria: requirements })
 * // => true or false
 */
export function isConditionMet({ subject, criteria }) {
  // STEP 1: Handle edge cases
  if (!subject || !criteria) return false

  // STEP 2: Apply business logic
  // ... your validation logic ...

  // STEP 3: Return boolean result
  return true // or false
}
```

### Real Example: Schedule Contiguous Check

```javascript
/**
 * Validates if a set of selected days forms a contiguous block.
 *
 * @intent Enforce the business rule that split lease stays must be consecutive.
 * @rule Handles complex week wrap-around scenarios (e.g., Fri-Sat-Sun).
 * @rule If 6 or more days selected, automatically considered contiguous.
 *
 * @param {object} context - The validation context.
 * @param {number[]} context.selectedDayIndices - Array of 0-based day indices (0=Sunday, 6=Saturday).
 * @returns {boolean} True if the schedule is valid and contiguous.
 *
 * @example
 * // Standard contiguous
 * isScheduleContiguous({ selectedDayIndices: [1, 2, 3, 4, 5] }) // => true (Mon-Fri)
 *
 * // Non-contiguous
 * isScheduleContiguous({ selectedDayIndices: [1, 3, 5] }) // => false (Mon, Wed, Fri)
 *
 * // Wrap-around contiguous
 * isScheduleContiguous({ selectedDayIndices: [5, 6, 0, 1] }) // => true (Fri-Mon)
 */
export function isScheduleContiguous({ selectedDayIndices }) {
  // Edge cases
  if (!selectedDayIndices || selectedDayIndices.length === 0) return false
  if (selectedDayIndices.length === 1) return true
  if (selectedDayIndices.length >= 6) return true

  // Sort indices
  const sorted = [...selectedDayIndices].sort((a, b) => a - b)

  // Check standard contiguous sequence
  let isStandardContiguous = true
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) {
      isStandardContiguous = false
      break
    }
  }

  if (isStandardContiguous) return true

  // Check wrap-around case
  const hasZero = sorted.includes(0)
  const hasSix = sorted.includes(6)

  if (hasZero && hasSix) {
    // Use inverse logic: check not-selected days
    const allDays = [0, 1, 2, 3, 4, 5, 6]
    const notSelectedDays = allDays.filter(d => !sorted.includes(d))

    if (notSelectedDays.length === 0) return true

    const minNotSelected = Math.min(...notSelectedDays)
    const maxNotSelected = Math.max(...notSelectedDays)

    const expectedNotSelected = []
    for (let i = minNotSelected; i <= maxNotSelected; i++) {
      expectedNotSelected.push(i)
    }

    const notSelectedContiguous =
      notSelectedDays.length === expectedNotSelected.length &&
      notSelectedDays.every((day, index) => day === expectedNotSelected[index])

    return notSelectedContiguous
  }

  return false
}
```

---

## Processor Template

**File:** `app/src/logic/processors/{domain}/process{EntityName}.js`

**Purpose:** Transform and validate external data into internal format. Enforce "No Fallback" principle.

**Key Rules:**
- ✅ **NO FALLBACK** - Throw descriptive errors for missing/invalid data
- ✅ Validates critical fields
- ✅ Normalizes data structure
- ✅ Transforms external format to internal format
- ✅ Acts as Anti-Corruption Layer for external APIs

```javascript
/**
 * Transforms raw external data into a verified internal entity.
 *
 * @intent Create a safe, typed object for application use, enforcing data integrity.
 * @rule NO FALLBACK - Throws explicit errors for missing critical fields.
 * @rule All returned data is guaranteed to be valid and complete.
 *
 * @param {object} context - The processing context.
 * @param {object} context.rawData - Raw data from external source (API, database, etc.).
 * @returns {object} Validated and normalized entity object.
 *
 * @throws {Error} If rawData is null/undefined.
 * @throws {Error} If critical fields are missing or invalid.
 *
 * @example
 * const entity = processEntityData({ rawData: externalData })
 * // => Guaranteed valid entity object or error thrown
 */
export function processEntityData({ rawData }) {
  // STEP 1: No Fallback - Validate input exists
  if (!rawData) {
    throw new Error('Entity data is missing - cannot process null data')
  }

  // STEP 2: No Fallback - Validate critical fields
  if (!rawData.id) {
    throw new Error('Entity missing critical ID field')
  }

  if (!rawData.name) {
    throw new Error(`Entity ${rawData.id} missing required name field`)
  }

  // STEP 3: Transform and normalize
  return {
    id: rawData.id,
    name: rawData.name,
    description: rawData.description || '', // Optional field - empty string is valid default

    // Nested objects
    metadata: processMetadataField(rawData.metadata),

    // Arrays
    tags: parseArrayField(rawData.tags),

    // Dates
    createdAt: parseDateField(rawData.created_at)
  }
}

/**
 * Helper: Process metadata field
 */
function processMetadataField(metadata) {
  if (!metadata) {
    throw new Error('Metadata is required but missing')
  }

  return {
    version: metadata.version || '1.0',
    author: metadata.author || 'Unknown'
  }
}

/**
 * Helper: Parse array field
 */
function parseArrayField(field) {
  if (!field) return [] // Empty array is valid for optional arrays

  if (Array.isArray(field)) return field

  if (typeof field === 'string') {
    try {
      const parsed = JSON.parse(field)
      return Array.isArray(parsed) ? parsed : []
    } catch (e) {
      throw new Error(`Failed to parse array field: ${e.message}`)
    }
  }

  throw new Error(`Invalid array field type: ${typeof field}`)
}

/**
 * Helper: Parse date field
 */
function parseDateField(dateString) {
  if (!dateString) {
    throw new Error('Date field is required but missing')
  }

  const date = new Date(dateString)
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateString}`)
  }

  return date
}
```

### Real Example: Listing Data Processor

```javascript
/**
 * Transforms a raw Supabase listing row into a verified Listing entity.
 *
 * @intent Create a safe, typed object for UI consumption, enforcing data integrity.
 * @rule NO FALLBACK - Throws explicit errors for missing critical fields.
 */
export function processListingData({ rawListing }) {
  if (!rawListing) {
    throw new Error('Listing data is missing - cannot process null listing')
  }

  if (!rawListing._id) {
    throw new Error('Listing missing critical ID field')
  }

  if (!rawListing.Name) {
    throw new Error(`Listing ${rawListing._id} missing required Name field`)
  }

  // Validate critical pricing
  const nightlyRate = rawListing['💰Nightly Host Rate for 4 nights']
  if (nightlyRate === null || nightlyRate === undefined) {
    throw new Error(
      `Listing ${rawListing._id} missing critical pricing data`
    )
  }

  return {
    id: rawListing._id,
    title: rawListing.Name,
    description: rawListing.Description || '',

    location: {
      borough: processBoroughField(rawListing['Location - Borough']),
      neighborhood: processNeighborhoodField(rawListing['Location - Hood']),
      coordinates: processCoordinatesField(rawListing)
    },

    pricing: {
      nightlyRate: Number(nightlyRate),
      securityDeposit: Number(rawListing['💰Damage Deposit'] || 0),
      cleaningFee: Number(rawListing['💰Cleaning Cost / Maintenance Fee'] || 0)
    },

    features: {
      bedrooms: rawListing['Features - Qty Bedrooms'] || 0,
      bathrooms: rawListing['Features - Qty Bathrooms'] || 0,
      amenities: parseJsonArrayField(rawListing['Features - Amenities In-Unit'])
    }
  }
}
```

---

## Workflow Template

**File:** `app/src/logic/workflows/{domain}/{actionName}Workflow.js`

**Purpose:** Orchestrate multiple calculators, rules, and processors for complex multi-step operations.

**Key Rules:**
- ✅ Composes functions from other pillars
- ✅ Contains very little raw logic (delegates to calculators/rules/processors)
- ✅ Manages step-by-step execution
- ✅ Returns rich result objects (not just boolean)

```javascript
import { calculateSomething } from '../../calculators/domain/calculateSomething.js'
import { isConditionMet } from '../../rules/domain/isConditionMet.js'
import { processEntityData } from '../../processors/domain/processEntityData.js'

/**
 * Orchestrates a complex multi-step operation.
 *
 * @intent [Why this workflow exists from a business perspective]
 * @rule [Any business rules this workflow enforces]
 *
 * @param {object} context - The workflow context.
 * @param {any} context.input - Input data for the workflow.
 * @returns {object} Workflow result with success status and data/errors.
 *
 * @example
 * const result = await actionNameWorkflow({ input: data })
 * if (!result.success) {
 *   console.error(result.errorCode, result.errors)
 * }
 */
export async function actionNameWorkflow({ input }) {
  // STEP 1: Validate input using rule
  const isValid = isConditionMet({ subject: input, criteria: requirements })

  if (!isValid) {
    return {
      success: false,
      errorCode: 'INVALID_INPUT',
      errors: ['Input does not meet requirements']
    }
  }

  // STEP 2: Process/transform data
  let processedData
  try {
    processedData = processEntityData({ rawData: input })
  } catch (error) {
    return {
      success: false,
      errorCode: 'PROCESSING_FAILED',
      errors: [error.message]
    }
  }

  // STEP 3: Perform calculations
  const calculatedValue = calculateSomething({
    inputA: processedData.fieldA,
    inputB: processedData.fieldB
  })

  // STEP 4: Apply additional rules
  const meetsThreshold = isAnotherConditionMet({
    value: calculatedValue,
    threshold: 100
  })

  if (!meetsThreshold) {
    return {
      success: false,
      errorCode: 'THRESHOLD_NOT_MET',
      errors: ['Calculated value does not meet threshold']
    }
  }

  // STEP 5: Return success with data
  return {
    success: true,
    data: {
      processed: processedData,
      calculated: calculatedValue
    }
  }
}
```

### Real Example: Validate Schedule Workflow

```javascript
import { isScheduleContiguous } from '../../rules/scheduling/isScheduleContiguous.js'
import { isDateInRange } from '../../rules/scheduling/isDateInRange.js'
import { isDateBlocked } from '../../rules/scheduling/isDateBlocked.js'
import { calculateNightsFromDays } from '../../calculators/scheduling/calculateNightsFromDays.js'

/**
 * Orchestrates comprehensive schedule validation for a booking.
 *
 * @intent Ensure proposed schedule meets all business rules before submission.
 * @rule Days must be contiguous (consecutive).
 * @rule Must meet minimum/maximum night requirements.
 * @rule All dates must be available (not blocked).
 */
export function validateScheduleWorkflow({ selectedDays, listing }) {
  const result = {
    valid: true,
    errors: [],
    warnings: [],
    errorCode: null
  }

  // Step 1: Check if any days selected
  if (!selectedDays || selectedDays.length === 0) {
    result.valid = false
    result.errorCode = 'NO_DAYS_SELECTED'
    result.errors.push('Please select at least one day')
    return result
  }

  // Step 2: Check contiguous requirement (CRITICAL RULE)
  const isContiguous = isScheduleContiguous({ selectedDayIndices: selectedDays })

  if (!isContiguous) {
    result.valid = false
    result.errorCode = 'NOT_CONTIGUOUS'
    result.errors.push('Selected days must be consecutive')
    return result
  }

  // Step 3: Calculate nights and check min/max
  const nightsCount = calculateNightsFromDays({ selectedDays })

  if (listing.minimumNights && nightsCount < listing.minimumNights) {
    result.warnings.push(
      `Host prefers at least ${listing.minimumNights} nights per week`
    )
  }

  if (listing.maximumNights && nightsCount > listing.maximumNights) {
    result.valid = false
    result.errorCode = 'EXCEEDS_MAXIMUM'
    result.errors.push(
      `Host allows maximum ${listing.maximumNights} nights per week`
    )
    return result
  }

  // Step 4: Check against blocked dates (if applicable)
  if (listing.blockedDates && listing.blockedDates.length > 0) {
    const hasBlockedDate = selectedDays.some(dayIndex => {
      return isDateBlocked({ dayIndex, blockedDates: listing.blockedDates })
    })

    if (hasBlockedDate) {
      result.valid = false
      result.errorCode = 'BLOCKED_DATES'
      result.errors.push('Some selected days are not available')
      return result
    }
  }

  return result
}
```

---

## Hollow Island Template

**File:** `app/src/islands/{type}/{ComponentName}.jsx`

**Purpose:** Pure presentation component that only renders props and handles user interactions.

**Key Rules:**
- ✅ NO business logic
- ✅ NO calculations
- ✅ NO data transformations
- ✅ NO API calls
- ✅ Receives all data via props
- ✅ Delegates all actions via callback props

```jsx
/**
 * [Brief description of what this component displays]
 *
 * This is a "Hollow Island" - it contains NO business logic.
 * All data is received via props, all actions delegated to parent.
 *
 * @param {object} props - Component props
 * @param {object} props.data - Pre-processed display data
 * @param {string} props.errorMessage - Error message to display (or null)
 * @param {function} props.onAction - Callback when user performs action
 */
export default function ComponentName({
  data,
  errorMessage,
  onAction
}) {
  // ✅ NO business logic - only local UI state if needed
  // ✅ NO calculations
  // ✅ NO data transformations

  return (
    <div className="component-container">
      {/* Render pre-processed data */}
      <div className="data-display">
        <h2>{data.title}</h2>
        <p>{data.description}</p>
      </div>

      {/* Display error if provided */}
      {errorMessage && (
        <div className="error-banner">
          {errorMessage}
        </div>
      )}

      {/* User interaction delegates to parent */}
      <button onClick={() => onAction(data.id)}>
        Perform Action
      </button>
    </div>
  )
}
```

### Real Example: Hollow ListingScheduleSelector

```jsx
import { DayButton } from './DayButton.jsx'
import { PriceDisplay } from './PriceDisplay.jsx'

/**
 * Schedule selector for choosing days of the week.
 *
 * This is a "Hollow Island" - it contains NO business logic.
 * All pricing and validation is handled by the parent via Logic Core.
 *
 * @param {object} props
 * @param {Array} props.daysGrid - Array of pre-processed day objects
 * @param {object} props.priceBreakdown - Pre-calculated pricing information
 * @param {string|null} props.validationError - Error message to display
 * @param {function} props.onDayToggle - Callback when day is clicked
 */
export default function ListingScheduleSelector({
  daysGrid,
  priceBreakdown,
  validationError,
  onDayToggle
}) {
  // ✅ NO business logic
  // ✅ Only renders what it receives

  return (
    <div className="selector-container">
      {/* Day selection grid */}
      <div className="day-grid">
        {daysGrid.map(day => (
          <DayButton
            key={day.id}
            day={day}
            onClick={() => onDayToggle(day.id)}
          />
        ))}
      </div>

      {/* Error display */}
      {validationError && (
        <div className="error-banner">
          {validationError}
        </div>
      )}

      {/* Price display */}
      <PriceDisplay breakdown={priceBreakdown} />
    </div>
  )
}
```

---

## Logic Hook Template

**File:** `app/src/islands/{type}/use{FeatureName}Logic.js`

**Purpose:** Custom hook that orchestrates Logic Core functions and manages state.

**Key Rules:**
- ✅ Calls Logic Core functions (calculators, rules, workflows)
- ✅ Manages local state
- ✅ Returns pre-processed data to components
- ✅ Handles error mapping (error codes → UI messages)

```javascript
import { useState, useEffect, useMemo } from 'react'
import { calculateSomething } from '../../../logic/calculators/domain/calculateSomething.js'
import { isConditionMet } from '../../../logic/rules/domain/isConditionMet.js'
import { actionWorkflow } from '../../../logic/workflows/domain/actionWorkflow.js'

/**
 * Custom hook that orchestrates Logic Core for [feature name].
 *
 * This hook:
 * - Manages state
 * - Calls Logic Core functions
 * - Returns pre-processed data to component
 *
 * @param {object} config - Hook configuration
 * @returns {object} State and handlers for component
 */
export function useFeatureLogic(config) {
  // ✅ State management
  const [state, setState] = useState(initialState)
  const [error, setError] = useState(null)

  // ✅ Call Logic Core calculators
  const calculatedValue = useMemo(() => {
    try {
      return calculateSomething({
        inputA: state.fieldA,
        inputB: state.fieldB
      })
    } catch (err) {
      setError(err.message)
      return null
    }
  }, [state.fieldA, state.fieldB])

  // ✅ Call Logic Core rules
  const isValid = isConditionMet({
    subject: state.subject,
    criteria: config.criteria
  })

  // ✅ Handle user actions via workflows
  const handleAction = async () => {
    const result = await actionWorkflow({ input: state })

    if (!result.success) {
      // Map error code to UI message
      setError(ERROR_MESSAGES[result.errorCode] || 'An error occurred')
      return
    }

    // Update state with workflow result
    setState(prevState => ({ ...prevState, ...result.data }))
    setError(null)
  }

  // ✅ Return pre-processed data
  return {
    // Data for rendering
    calculatedValue,
    isValid,
    error,

    // Handlers for component
    handleAction
  }
}

// Error code to UI message mapping
const ERROR_MESSAGES = {
  INVALID_INPUT: 'Please provide valid input',
  THRESHOLD_NOT_MET: 'Value does not meet minimum requirement',
  PROCESSING_FAILED: 'Unable to process your request'
}
```

### Real Example: Schedule Selector Logic Hook

```javascript
import { useState, useMemo } from 'react'
import { calculatePricingBreakdown } from '../../../logic/calculators/pricing/calculatePricingBreakdown.js'
import { validateScheduleWorkflow } from '../../../logic/workflows/scheduling/validateScheduleWorkflow.js'
import { calculateCheckInOutDays } from '../../../logic/calculators/scheduling/calculateCheckInOutDays.js'

/**
 * Custom hook that manages schedule selection logic.
 *
 * Orchestrates Logic Core functions for day selection, pricing, and validation.
 */
export function useScheduleSelectorLogic({ listing, initialDays = [] }) {
  // State
  const [selectedDays, setSelectedDays] = useState(initialDays)

  // Calculate pricing using Logic Core
  const priceBreakdown = useMemo(() => {
    if (selectedDays.length < 2) {
      return { valid: false, nightlyPrice: null, fourWeekRent: null }
    }

    try {
      return calculatePricingBreakdown({
        listing,
        nightsPerWeek: selectedDays.length,
        reservationWeeks: 4
      })
    } catch (error) {
      console.error('Pricing calculation failed:', error)
      return { valid: false, error: error.message }
    }
  }, [listing, selectedDays.length])

  // Validate schedule using Logic Core workflow
  const validation = useMemo(() => {
    return validateScheduleWorkflow({
      selectedDays,
      listing
    })
  }, [selectedDays, listing])

  // Calculate check-in/out days
  const checkInOut = useMemo(() => {
    if (selectedDays.length === 0) return null

    return calculateCheckInOutDays({ selectedDays })
  }, [selectedDays])

  // Handle day toggle
  const handleDayToggle = (dayId) => {
    setSelectedDays(prevDays => {
      const dayIndex = parseInt(dayId.split('-')[1])
      const isSelected = prevDays.includes(dayIndex)

      if (isSelected) {
        return prevDays.filter(d => d !== dayIndex)
      } else {
        return [...prevDays, dayIndex].sort((a, b) => a - b)
      }
    })
  }

  // Map error codes to UI messages
  const errorMessage = validation.valid
    ? null
    : ERROR_MESSAGES[validation.errorCode] || validation.errors[0]

  return {
    // Data for component
    selectedDays,
    priceBreakdown,
    validationError: errorMessage,
    checkInOut,

    // Handlers
    handleDayToggle
  }
}

const ERROR_MESSAGES = {
  NO_DAYS_SELECTED: 'Please select at least one day',
  NOT_CONTIGUOUS: 'Please select consecutive days',
  EXCEEDS_MAXIMUM: 'Maximum nights exceeded',
  BLOCKED_DATES: 'Some selected days are not available'
}
```

---

## Complete Usage Example

Here's how all the pieces work together:

### 1. Logic Core Files

```javascript
// logic/calculators/pricing/calculateFourWeekRent.js
export function calculateFourWeekRent({ nightlyRate, frequency }) {
  if (typeof nightlyRate !== 'number' || isNaN(nightlyRate)) {
    throw new Error('nightlyRate must be a number')
  }
  return nightlyRate * frequency * 4
}

// logic/rules/scheduling/isScheduleContiguous.js
export function isScheduleContiguous({ selectedDayIndices }) {
  // ... validation logic ...
  return true
}

// logic/workflows/scheduling/validateScheduleWorkflow.js
export function validateScheduleWorkflow({ selectedDays, listing }) {
  const isContiguous = isScheduleContiguous({ selectedDayIndices: selectedDays })

  if (!isContiguous) {
    return { valid: false, errorCode: 'NOT_CONTIGUOUS' }
  }

  return { valid: true }
}
```

### 2. Logic Hook

```javascript
// islands/shared/useScheduleSelectorLogic.js
import { calculateFourWeekRent } from '../../../logic/calculators/pricing/calculateFourWeekRent.js'
import { validateScheduleWorkflow } from '../../../logic/workflows/scheduling/validateScheduleWorkflow.js'

export function useScheduleSelectorLogic({ listing }) {
  const [selectedDays, setSelectedDays] = useState([])

  const rent = useMemo(() => {
    return calculateFourWeekRent({
      nightlyRate: listing.nightlyRate,
      frequency: selectedDays.length
    })
  }, [listing, selectedDays])

  const validation = validateScheduleWorkflow({ selectedDays, listing })

  return {
    selectedDays,
    rent,
    validationError: validation.valid ? null : 'Please select consecutive days',
    handleDayToggle: (dayId) => {
      // ... toggle logic ...
    }
  }
}
```

### 3. Hollow Component

```jsx
// islands/shared/ListingScheduleSelector.jsx
import { useScheduleSelectorLogic } from './useScheduleSelectorLogic.js'

export default function ListingScheduleSelector({ listing }) {
  // Hook orchestrates all Logic Core
  const {
    selectedDays,
    rent,
    validationError,
    handleDayToggle
  } = useScheduleSelectorLogic({ listing })

  // Component only renders
  return (
    <div>
      <DayGrid onDayClick={handleDayToggle} />
      {validationError && <Error>{validationError}</Error>}
      <Price amount={rent} />
    </div>
  )
}
```

---

## Testing Templates

### Calculator Test

```javascript
// tests/logic/calculators/pricing/calculateFourWeekRent.test.js
import { describe, it, expect } from 'vitest'
import { calculateFourWeekRent } from '../../../../src/logic/calculators/pricing/calculateFourWeekRent.js'

describe('calculateFourWeekRent', () => {
  it('calculates correctly for 4 nights/week', () => {
    const result = calculateFourWeekRent({ nightlyRate: 100, frequency: 4 })
    expect(result).toBe(1600) // 100 * 4 * 4
  })

  it('throws on invalid nightlyRate', () => {
    expect(() => {
      calculateFourWeekRent({ nightlyRate: null, frequency: 4 })
    }).toThrow('nightlyRate must be a number')
  })

  it('throws on NaN', () => {
    expect(() => {
      calculateFourWeekRent({ nightlyRate: NaN, frequency: 4 })
    }).toThrow()
  })

  it('throws on frequency out of range', () => {
    expect(() => {
      calculateFourWeekRent({ nightlyRate: 100, frequency: 8 })
    }).toThrow('frequency must be between 2-7')
  })
})
```

### Rule Test

```javascript
// tests/logic/rules/scheduling/isScheduleContiguous.test.js
import { describe, it, expect } from 'vitest'
import { isScheduleContiguous } from '../../../../src/logic/rules/scheduling/isScheduleContiguous.js'

describe('isScheduleContiguous', () => {
  it('returns true for consecutive days (Mon-Fri)', () => {
    const result = isScheduleContiguous({ selectedDayIndices: [1, 2, 3, 4, 5] })
    expect(result).toBe(true)
  })

  it('returns false for non-consecutive days', () => {
    const result = isScheduleContiguous({ selectedDayIndices: [1, 3, 5] })
    expect(result).toBe(false)
  })

  it('returns true for wrap-around (Fri-Sun)', () => {
    const result = isScheduleContiguous({ selectedDayIndices: [5, 6, 0] })
    expect(result).toBe(true)
  })

  it('returns false for empty array', () => {
    const result = isScheduleContiguous({ selectedDayIndices: [] })
    expect(result).toBe(false)
  })

  it('returns true for single day', () => {
    const result = isScheduleContiguous({ selectedDayIndices: [3] })
    expect(result).toBe(true)
  })
})
```

### Processor Test

```javascript
// tests/logic/processors/listing/processListingData.test.js
import { describe, it, expect } from 'vitest'
import { processListingData } from '../../../../src/logic/processors/listing/processListingData.js'

describe('processListingData - No Fallback Enforcement', () => {
  it('throws when listing data is missing', () => {
    expect(() => {
      processListingData({ rawListing: null })
    }).toThrow('Listing data is missing')
  })

  it('throws when critical ID is missing', () => {
    expect(() => {
      processListingData({ rawListing: { Name: 'Test' } })
    }).toThrow('Listing missing critical ID')
  })

  it('throws when name is missing', () => {
    expect(() => {
      processListingData({ rawListing: { _id: '123' } })
    }).toThrow('missing required Name field')
  })

  it('processes valid listing data', () => {
    const raw = {
      _id: '123x456',
      Name: 'Test Listing',
      '💰Nightly Host Rate for 4 nights': 100
    }

    const result = processListingData({ rawListing: raw })

    expect(result.id).toBe('123x456')
    expect(result.title).toBe('Test Listing')
    expect(result.pricing.nightlyRate).toBe(100)
  })
})
```

---

**Use these templates as starting points for creating new Logic Core modules. Always follow the naming conventions and "No Fallback" principle.**
