# Proposal Processors - Logic Layer 3

**GENERATED**: 2025-11-26
**LAYER**: Processors (Data Transformers)
**PARENT**: app/src/logic/processors/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Transform raw proposal API data into frontend-friendly format
[LAYER]: Layer 3 - Processors (data transformation with computed fields)
[PATTERN]: Convert Bubble proposal data to processed proposal objects

---

## ### FILE_INVENTORY ###

### processProposalData.js
[INTENT]: Convert raw Bubble proposal data to frontend-friendly format with computed fields
[EXPORTS]: processProposalData
[IMPORTS]: ../external/adaptDaysFromBubble, ../../rules/proposals/determineProposalStage
[SIGNATURE]: (rawProposal: object) => ProcessedProposal
[OUTPUT]: ProcessedProposal with stage, formatted dates, converted days

---

## ### PROCESSING_STEPS ###

[STEP_1]: Convert day arrays from Bubble format (1-7) to JS format (0-6)
[STEP_2]: Calculate proposal stage from status
[STEP_3]: Format dates for display
[STEP_4]: Add computed fields (canAccept, canCancel, etc.)

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { processProposalData } from 'logic/processors/proposal/processProposalData'
[CONSUMED_BY]: GuestProposalsPage, loadProposalDetailsWorkflow
[PATTERN]: const processed = processProposalData(apiResponse); setState(processed)

---

## ### OUTPUT_SHAPE ###

```javascript
{
  id: string,
  status: string,
  stage: number,
  selectedDays: number[], // JS format (0-6)
  checkIn: Date,
  checkOut: Date,
  pricing: { ... },
  canAccept: boolean,
  canCancel: boolean,
  canEdit: boolean
}
```

---

**FILE_COUNT**: 1
**EXPORTS_COUNT**: 1
