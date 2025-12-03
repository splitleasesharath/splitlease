# Create Proposal Flow V2 Components

**GENERATED**: 2025-11-26
**ARCHITECTURE**: React Islands
**PARENT**: app/src/islands/shared/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Section components for multi-step proposal creation wizard
[PATTERN]: Each section handles one step of the proposal creation process
[PARENT_COMPONENT]: CreateProposalFlowV2.jsx

---

## ### FILE_INVENTORY ###

### DaysSelectionSection.jsx
[INTENT]: Day selection section with weekly schedule picker
[IMPORTS]: react, ../ListingScheduleSelector
[PROPS]: listing, selectedDays, onDaysChange, onNext

### MoveInSection.jsx
[INTENT]: Move-in date selection with calendar picker and availability validation
[IMPORTS]: react
[DEPENDENCIES]: logic/calculators/scheduling/calculateNextAvailableCheckIn, logic/workflows/scheduling/validateMoveInDateWorkflow
[PROPS]: listing, blockedDates, onDateSelect, onNext, onBack

### ReviewSection.jsx
[INTENT]: Final review displaying pricing breakdown and terms before submission
[IMPORTS]: react, ../PriceDisplay
[DEPENDENCIES]: logic/calculators/pricing/calculatePricingBreakdown, logic/calculators/pricing/calculateReservationTotal
[PROPS]: proposal, pricing, onSubmit, onBack

### UserDetailsSection.jsx
[INTENT]: Guest personal details and special requests input
[IMPORTS]: react
[PROPS]: user, onDetailsChange, onNext, onBack

---

## ### WIZARD_FLOW ###

```
Step 1: DaysSelectionSection
    │ selectedDays
    ▼
Step 2: MoveInSection
    │ moveInDate
    ▼
Step 3: UserDetailsSection
    │ guestDetails
    ▼
Step 4: ReviewSection
    │ submit
    ▼
Proposal Created
```

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { MoveInSection } from 'islands/shared/CreateProposalFlowV2Components/MoveInSection'
[CONSUMED_BY]: CreateProposalFlowV2.jsx only
[STATE_MANAGEMENT]: Parent wizard manages step state and data

---

**FILE_COUNT**: 4
**EXPORTS_COUNT**: 4
