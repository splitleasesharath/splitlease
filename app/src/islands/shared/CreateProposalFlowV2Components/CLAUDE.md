# Create Proposal Flow V2 Components Context

**TYPE**: LEAF NODE
**PARENT**: app/src/islands/shared/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Section components for multi-step proposal creation wizard
[PATTERN]: Each section handles one step of the proposal creation process
[PARENT_COMPONENT]: CreateProposalFlowV2.jsx

---

## ### COMPONENT_CONTRACTS ###

### DaysSelectionSection.jsx
[PATH]: ./DaysSelectionSection.jsx
[INTENT]: Day selection section with weekly schedule picker
[PROPS]:
  - listing: object (req) - Listing with available days
  - selectedDays: number[] (req) - Currently selected day indices (0-6)
  - onDaysChange: (days: number[]) => void (req) - Selection change handler
  - onNext: () => void (req) - Navigate to next section
[DEPENDS_ON]: ../ListingScheduleSelector

---

### MoveInSection.jsx
[PATH]: ./MoveInSection.jsx
[INTENT]: Move-in date selection with calendar picker and availability validation
[PROPS]:
  - listing: object (req) - Listing with availability info
  - blockedDates: Date[] (req) - Dates unavailable for move-in
  - onDateSelect: (date: Date) => void (req) - Date selection handler
  - onNext: () => void (req) - Navigate to next section
  - onBack: () => void (req) - Navigate to previous section
[DEPENDS_ON]: logic/workflows/scheduling/validateMoveInDateWorkflow
[ASYNC]: Yes (validation)

---

### UserDetailsSection.jsx
[PATH]: ./UserDetailsSection.jsx
[INTENT]: Guest personal details and special requests input
[PROPS]:
  - user: object (opt) - Pre-filled user data if logged in
  - onDetailsChange: (details: object) => void (req) - Details change handler
  - onNext: () => void (req) - Navigate to next section
  - onBack: () => void (req) - Navigate to previous section

---

### ReviewSection.jsx
[PATH]: ./ReviewSection.jsx
[INTENT]: Final review displaying pricing breakdown and terms before submission
[PROPS]:
  - proposal: object (req) - Complete proposal data
  - pricing: object (req) - Calculated pricing breakdown
  - onSubmit: () => Promise<void> (req) - Submit proposal handler
  - onBack: () => void (req) - Navigate to previous section
[DEPENDS_ON]: logic/calculators/pricing/calculatePricingBreakdown

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

## ### CRITICAL_USAGE_RULES ###

[RULE_1]: Parent wizard (CreateProposalFlowV2) manages step navigation
[RULE_2]: Each section validates before allowing onNext
[RULE_3]: Day indices use JavaScript format (0-6)
[RULE_4]: Pricing calculated fresh on ReviewSection mount

---

## ### DEPENDENCIES ###

[LOCAL]: logic/calculators/pricing/, logic/workflows/scheduling/
[EXTERNAL]: None

---

**FILE_COUNT**: 4
**EXPORTS_COUNT**: 4
