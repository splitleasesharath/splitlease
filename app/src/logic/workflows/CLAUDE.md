# Workflows - Logic Layer 4

**GENERATED**: 2025-11-26
**LAYER**: Workflows (Orchestration)
**PARENT**: app/src/logic/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Multi-step orchestration combining lower layers with async operations
[LAYER]: Layer 4 of four-layer logic architecture
[PATTERN]: Coordinate complex operations across rules, processors, and APIs

---

## ### SUBDIRECTORIES ###

### auth/
[INTENT]: Authentication workflows for login state and token validation
[FILES]: 2 workflow functions
[KEY_EXPORTS]: checkAuthStatusWorkflow, validateTokenWorkflow

### booking/
[INTENT]: Booking lifecycle workflows for proposal acceptance and cancellation
[FILES]: 3 workflow functions
[KEY_EXPORTS]: acceptProposalWorkflow, cancelProposalWorkflow, loadProposalDetailsWorkflow

### proposals/
[INTENT]: Proposal-specific workflows including counteroffers and meetings
[FILES]: 4 workflow functions
[KEY_EXPORTS]: counterofferWorkflow, virtualMeetingWorkflow, navigationWorkflow

### scheduling/
[INTENT]: Schedule validation workflows combining rules and availability checks
[FILES]: 2 workflow functions
[KEY_EXPORTS]: validateMoveInDateWorkflow, validateScheduleWorkflow

---

## ### FILE_INVENTORY ###

### index.js
[INTENT]: Barrel export aggregating all workflow functions
[EXPORTS]: * from all subdirectories

---

## ### LAYER_RULES ###

[ALLOWED]: Async operations, API calls via lib/
[ALLOWED]: Calling rules, processors, calculators
[ALLOWED]: Error handling and recovery logic
[PATTERN]: Try/catch with meaningful error messages

---

## ### WORKFLOW_PATTERN ###

```javascript
async function exampleWorkflow(input) {
  // 1. Validate using rules
  if (!canPerformAction(input)) {
    throw new Error('Action not allowed');
  }

  // 2. Transform using processors
  const processed = processData(input);

  // 3. Calculate using calculators
  const computed = calculate(processed);

  // 4. Call external API
  const result = await apiCall(computed);

  // 5. Return processed result
  return processResult(result);
}
```

---

**SUBDIRECTORY_COUNT**: 4
**TOTAL_FILES**: 11
