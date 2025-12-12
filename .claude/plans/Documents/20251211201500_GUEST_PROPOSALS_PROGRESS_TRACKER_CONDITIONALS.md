# Guest Proposals Progress Tracker - Conditional Logic Analysis

**Generated**: 2025-12-11 20:15:00
**Scope**: InlineProgressTracker component in Guest Proposals page
**Screenshot Reference**: The progress tracker showing 6 stages with colored nodes and labels

---

## Overview

The progress tracker (`InlineProgressTracker`) is an inline component within `ProposalCard.jsx` that displays the proposal workflow progression. It shows 6 stages in a horizontal timeline format with dynamic coloring based on proposal status.

---

## Visual Reference (from screenshot)

```
[●]─────[●]─────[●]─────[○]─────[○]─────[○]
 ↑        ↑        ↑        ↑        ↑        ↑
Purple   Green   Purple   Gray    Gray    Gray

Proposal  Rental   Host    Review   Lease   Initial
Submitted  App    Review  Documents Documents Payment
          Submitted
```

---

## 1. Component Location

**File**: `app/src/islands/pages/proposals/ProposalCard.jsx`
**Lines**: 491-540 (InlineProgressTracker function)
**Lines**: 363-489 (getStageColor function and PROGRESS_COLORS constant)

---

## 2. Progress Tracker Stages

The tracker has **6 fixed stages**:

| Stage Index | Stage ID | Default Label          |
|-------------|----------|------------------------|
| 0           | 1        | Proposal Submitted     |
| 1           | 2        | Rental App Submitted   |
| 2           | 3        | Host Review            |
| 3           | 4        | Review Documents       |
| 4           | 5        | Lease Documents        |
| 5           | 6        | Initial Payment        |

---

## 3. Color Constants

```javascript
const PROGRESS_COLORS = {
  purple: '#6D31C2',      // Completed stage
  green: '#1F8E16',       // Current/Active stage (action needed)
  red: '#DB2E2E',         // Cancelled/Rejected
  lightPurple: '#B6B7E9', // Pending/Waiting state
  gray: '#DEDEDE',        // Inactive/Future stage
  labelGray: '#9CA3AF'    // Inactive label color
};
```

---

## 4. Stage Color Logic (`getStageColor` function)

The function `getStageColor(stageIndex, status, usualOrder, isTerminal, proposal)` determines each stage's color based on:

### 4.1 Terminal Status Check (All Stages Turn Red)

```javascript
if (isTerminal) {
  return PROGRESS_COLORS.red;
}
```

**Terminal statuses**:
- "Proposal Cancelled by Guest"
- "Proposal Cancelled by Split Lease"
- "Proposal Rejected by Host"

### 4.2 Stage-by-Stage Logic

#### **Stage 1 (Index 0): Proposal Submitted**
- **Always PURPLE** once a proposal exists
```javascript
if (stageIndex === 0) {
  return PROGRESS_COLORS.purple;
}
```

#### **Stage 2 (Index 1): Rental App Submitted**
- **GREEN** when:
  - No rental application exists (`!hasRentalApp`)
  - Status is "Proposal Submitted by guest - Awaiting Rental Application"
  - Status is "Proposal Submitted for guest by Split Lease - Awaiting Rental Application"
  - Status is "Proposal Submitted for guest by Split Lease - Pending Confirmation"

- **PURPLE** when:
  - `usualOrder >= 1` (past this stage)

- **GRAY** otherwise

```javascript
if (stageIndex === 1) {
  if (!hasRentalApp ||
      normalizedStatus === 'Proposal Submitted by guest - Awaiting Rental Application' ||
      normalizedStatus === 'Proposal Submitted for guest by Split Lease - Awaiting Rental Application' ||
      normalizedStatus === 'Proposal Submitted for guest by Split Lease - Pending Confirmation') {
    return PROGRESS_COLORS.green;
  }
  if (usualOrder >= 1) {
    return PROGRESS_COLORS.purple;
  }
  return PROGRESS_COLORS.gray;
}
```

#### **Stage 3 (Index 2): Host Review**
- **GREEN** when:
  - Status is "Host Review" AND rental app exists
  - Status is "Host Counteroffer Submitted / Awaiting Guest Review"

- **PURPLE** when:
  - `usualOrder >= 3` (past this stage)

- **GRAY** otherwise

```javascript
if (stageIndex === 2) {
  if (normalizedStatus === 'Host Review' && hasRentalApp) {
    return PROGRESS_COLORS.green;
  }
  if (normalizedStatus === 'Host Counteroffer Submitted / Awaiting Guest Review') {
    return PROGRESS_COLORS.green;
  }
  if (usualOrder >= 3) {
    return PROGRESS_COLORS.purple;
  }
  return PROGRESS_COLORS.gray;
}
```

#### **Stage 4 (Index 3): Review Documents**
- **GREEN** when:
  - Status is "Lease Documents Sent for Review"

- **LIGHT PURPLE** when:
  - `guestDocsFinalized` is true (waiting state)

- **PURPLE** when:
  - `usualOrder >= 5` (past this stage)

- **GRAY** otherwise

```javascript
if (stageIndex === 3) {
  if (normalizedStatus === 'Lease Documents Sent for Review') {
    return PROGRESS_COLORS.green;
  }
  if (guestDocsFinalized) {
    return PROGRESS_COLORS.lightPurple;
  }
  if (usualOrder >= 5) {
    return PROGRESS_COLORS.purple;
  }
  return PROGRESS_COLORS.gray;
}
```

#### **Stage 5 (Index 4): Lease Documents**
- **GREEN** when:
  - Status is "Lease Documents Sent for Signatures"

- **PURPLE** when:
  - `usualOrder >= 6` (past this stage)

- **GRAY** otherwise

```javascript
if (stageIndex === 4) {
  if (normalizedStatus === 'Lease Documents Sent for Signatures') {
    return PROGRESS_COLORS.green;
  }
  if (usualOrder >= 6) {
    return PROGRESS_COLORS.purple;
  }
  return PROGRESS_COLORS.gray;
}
```

#### **Stage 6 (Index 5): Initial Payment**
- **GREEN** when:
  - Status is "Lease Documents Signed / Awaiting Initial payment"
  - Status is "Lease Signed / Awaiting Initial Payment" (legacy)

- **PURPLE** when:
  - Status is "Initial Payment Submitted / Lease activated"

- **GRAY** otherwise

```javascript
if (stageIndex === 5) {
  if (normalizedStatus === 'Lease Documents Signed / Awaiting Initial payment' ||
      normalizedStatus === 'Lease Signed / Awaiting Initial Payment') {
    return PROGRESS_COLORS.green;
  }
  if (normalizedStatus === 'Initial Payment Submitted / Lease activated') {
    return PROGRESS_COLORS.purple;
  }
  return PROGRESS_COLORS.gray;
}
```

---

## 5. Label Color Logic

The label colors mirror the node colors:
- If stage color is NOT gray → use stage color
- If stage color IS gray → use `#9CA3AF` (labelGray)

```javascript
const labelColor = stageColor !== PROGRESS_COLORS.gray ? stageColor : PROGRESS_COLORS.labelGray;
```

---

## 6. Dynamic Label Text

Labels can change based on status using `getStageLabels(status)`:

```javascript
function getStageLabels(status) {
  const baseLabels = [
    'Proposal Submitted',
    'Rental App Submitted',
    'Host Review',
    'Review Documents',
    'Lease Documents',
    'Initial Payment'
  ];

  // Customize based on status
  if (status.includes('Accepted') || status.includes('Drafting')) {
    baseLabels[2] = 'Host Review Complete';
    baseLabels[3] = 'Drafting Lease Docs';
  }

  if (status.includes('Counteroffer')) {
    baseLabels[2] = 'Counteroffer Pending';
  }

  if (status.includes('Lease Documents Sent')) {
    baseLabels[2] = 'Host Review Complete';
    baseLabels[3] = 'Docs Reviewed';
  }

  if (status.includes('Payment Submitted') || status.includes('activated')) {
    baseLabels[2] = 'Host Review Complete';
    baseLabels[3] = 'Docs Reviewed';
    baseLabels[4] = 'Lease Signed';
  }

  return baseLabels;
}
```

---

## 7. Connector Line Colors

Connector colors match the node they lead to:
```javascript
const connectorColor = stageColor !== PROGRESS_COLORS.gray ? stageColor : PROGRESS_COLORS.gray;
```

---

## 8. Data Sources for Conditionals

| Field | Source | Purpose |
|-------|--------|---------|
| `status` | `proposal.Status` | Primary status text |
| `usualOrder` | `statusConfig.usualOrder` | Numeric ordering (1-7, 99 for terminal) |
| `isTerminal` | `isTerminalStatus(status)` | Whether cancelled/rejected |
| `hasRentalApp` | `proposal['rental application']` | Boolean - rental app exists |
| `guestDocsFinalized` | `proposal['guest documents review finalized?']` | Boolean - docs reviewed |

---

## 9. Status to usualOrder Mapping

From `proposalStatuses.js`:

| Status | usualOrder | Stage |
|--------|------------|-------|
| Pending | 1 | 1 |
| Host Review | 2 | 3 |
| Proposal Submitted - Awaiting Rental App | 3 | 1 |
| Rental Application Submitted | 3 | 2 |
| Host Counteroffer Submitted | 4 | 3 |
| Proposal or Counteroffer Accepted | 5 | 4 |
| Reviewing Documents | 5 | 4 |
| Lease Documents Sent for Review | 6 | 4 |
| Lease Documents Sent for Signatures | 6 | 5 |
| Lease Documents Signed / Awaiting Payment | 6 | 6 |
| Initial Payment Submitted / Lease activated | 7 | 6 |
| Cancelled/Rejected | 99 | null |

---

## 10. Example: Screenshot Analysis

Based on the screenshot where:
- Stage 1: Purple (Proposal Submitted)
- Stage 2: Green (Rental App Submitted)
- Stage 3: Purple (Host Review)
- Stages 4-6: Gray (Review Documents, Lease Documents, Initial Payment)

This indicates:
- **Status**: Likely "Rental Application Submitted"
- **Rental app exists**: Yes (stage 2 is past awaiting state)
- **Current action needed**: Stage 2 is GREEN indicating the rental app was JUST submitted
- **usualOrder**: ~3 (Rental Application Submitted status)
- **Why Stage 3 is Purple**: The `usualOrder >= 3` condition causes Host Review to show as purple (completed), though this may be a visual inconsistency with actual status

---

## 11. Component Invocation

```jsx
<InlineProgressTracker
  status={status}
  usualOrder={currentStatusConfig?.usualOrder || 0}
  stageLabels={stageLabels}
  isTerminal={isTerminal}
  proposal={proposal}
/>
```

---

## 12. CSS Styling

```css
.inline-progress-tracker {
  padding: 10px 15px 20px;
}

.progress-node {
  width: 26px;
  height: 26px;
  border-radius: 100px;
  background-color: #DEDEDE; /* Default gray */
}

.progress-connector {
  width: 100px;
  height: 7px;
  background-color: #D4D4D4;
}

.progress-label {
  width: 120px;
  font-size: 12px;
  color: #D4D4D4;
  text-align: center;
}
```

Colors are applied via inline `style` attributes for dynamic theming.

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `app/src/islands/pages/proposals/ProposalCard.jsx` | Contains InlineProgressTracker component |
| `app/src/logic/constants/proposalStatuses.js` | Status configurations with usualOrder |
| `app/src/styles/components/guest-proposals.css` | Progress tracker CSS |
| `app/src/islands/pages/proposals/useGuestProposalsPageLogic.js` | Page logic hook |

---

## Summary

The progress tracker uses a **per-stage conditional coloring system** where:
1. **GREEN** = Action required at this stage
2. **PURPLE** = Stage completed
3. **LIGHT PURPLE** = Waiting state (special case)
4. **GRAY** = Future/inactive stage
5. **RED** = All stages when proposal is cancelled/rejected

The color is determined by comparing the proposal's `status`, `usualOrder`, and specific boolean fields (`hasRentalApp`, `guestDocsFinalized`) against stage-specific conditions.
