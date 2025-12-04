# Workflows Map

**TYPE**: BRANCH NODE
**PARENT**: app/src/logic/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Multi-step orchestration combining lower layers with async operations
[PATTERN]: Layer 4 of Four-Layer Logic Architecture
[LAYER]: Coordinate complex operations across rules, processors, and APIs

---

## ### SUB-MODULES ###

- **[auth/](./auth/CLAUDE.md)**: Authentication workflows (checkAuthStatus, validateToken) - 2 functions
- **[booking/](./booking/CLAUDE.md)**: Booking lifecycle (accept, cancel, load proposal details) - 3 functions
- **[proposals/](./proposals/CLAUDE.md)**: Counteroffer and virtual meeting workflows - 4 functions
- **[scheduling/](./scheduling/CLAUDE.md)**: Schedule validation workflows - 2 functions

---

## ### KEY_EXPORTS ###

[FROM_AUTH]: checkAuthStatusWorkflow, validateTokenWorkflow
[FROM_BOOKING]: acceptProposalWorkflow, cancelProposalWorkflow, loadProposalDetailsWorkflow
[FROM_PROPOSALS]: acceptCounteroffer, declineCounteroffer, getTermsComparison, cancelProposalWorkflow
[FROM_SCHEDULING]: validateMoveInDateWorkflow, validateScheduleWorkflow

---

## ### LAYER_RULES ###

[ALLOWED]: Async operations, API calls via lib/
[ALLOWED]: Calling rules, processors, calculators
[ALLOWED]: Error handling and recovery logic
[FORBIDDEN]: Direct DOM manipulation
[PATTERN]: Try/catch with meaningful error messages

---

## ### WORKFLOW_PATTERN ###

```javascript
async function exampleWorkflow(params) {
  // 1. Validate inputs (throw on invalid)
  if (!params.required) throw new Error('param is required')

  // 2. Check rules (can*, is*, has*)
  if (!canPerformAction(params)) {
    return { success: false, message: 'Not allowed' }
  }

  // 3. Transform using processors
  const processed = processData(params)

  // 4. Call external API
  const { data, error } = await supabase.from('table').update(...)

  // 5. Return structured result
  return { success: !error, data, message: error?.message || 'Success' }
}
```

---

## ### ERROR_HANDLING_CONVENTION ###

[VALIDATION_ERRORS]: Throw immediately (missing required params)
[RULE_VIOLATIONS]: Return { success: false, message: 'reason' }
[API_ERRORS]: Return { success: false, error: err, message: err.message }
[NEVER]: Silently fail or return undefined

---

## ### SHARED_CONVENTIONS ###

[ASYNC]: Most workflows are async (except pure validation)
[SUPABASE_CLIENT]: Passed as parameter, not imported globally
[RULE_INJECTION]: Rule functions passed as params for testability
[RESULT_SHAPE]: { success: boolean, message: string, data?: any }

---

**SUBDIRECTORY_COUNT**: 4
**TOTAL_FILES**: 11
