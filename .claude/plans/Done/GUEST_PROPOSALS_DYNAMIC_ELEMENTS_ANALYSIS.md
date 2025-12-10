# Guest Proposals Page - Dynamic Elements Analysis

## Summary

Comparative analysis between the Bubble.io implementation and the React code-based implementation of the Guest Proposals page reveals **7 major categories of missing dynamic UI behavior**. The infrastructure (data fetching, status configuration) largely exists but isn't connected to the UI.

---

## Visual Comparison

### Proposal A: Accepted Stage ("Drafting Lease Docs")

| Feature | Bubble | Code-Based | Gap |
|---------|--------|------------|-----|
| Status Banner | Green "Proposal Accepted! Split Lease is Drafting Lease Documents" | None | **Missing** |
| Progress Tracker Stage | Dynamic (shows "Drafting Lease Docs") | Hardcoded to index 3 | **Hardcoded** |
| Progress Tracker Color | Purple for accepted | Always red | **Missing** |
| Progress Labels | "Host Review Complete", "Drafting Lease Docs" | Generic "Host Review", "Review Documents" | **Static** |
| Warning Icon | Exclamation next to day badges | None | **Missing** |
| Move-out Date | Shows both Move-in AND Move-out | Only Move-in | **Missing** |
| Action Buttons | Virtual Meeting Accepted, Remind Split Lease, See Details, Cancel Proposal | Only Delete Proposal | **Missing** |

### Proposal B: Early Stage (Submitted/Under Review)

| Feature | Bubble | Code-Based | Gap |
|---------|--------|------------|-----|
| Progress Tracker Color | Red (all stages - terminal/error state) | Always red | Same styling by coincidence |
| House Rules Section | Hidden (no rules on listing) | Hidden | Correct |
| Action Buttons | Only Delete Proposal | Only Delete Proposal | Correct for stage |
| Status Banner | Hidden | Hidden | Correct |

---

## Gap 1: Hardcoded Progress Tracker Stage

### Current Code (ProposalCard.jsx:196)
```javascript
// Progress stage (simplified - in real implementation, derive from status)
const currentStageIndex = 3; // Example: at "Review Documents" stage
```

### Required Fix
```javascript
import { getStageFromStatus } from '../../../logic/constants/proposalStatuses.js';

const currentStageIndex = getStageFromStatus(proposal.Status) || 0;
```

### Database Field
- **`Status`** (text) - Contains values like:
  - `'Proposal Submitted by guest - Awaiting Rental Application'` (Stage 1)
  - `'Rental Application Submitted'` (Stage 2)
  - `'Host Review'` (Stage 3)
  - `'Proposal or Counteroffer Accepted / Drafting Lease Documents'` (Stage 4)
  - `'Lease Documents Sent for Review'` (Stage 5)
  - `'Initial Payment Submitted / Lease activated'` (Stage 6)

---

## Gap 2: Missing Status Banner

### Bubble Behavior
Shows a colored banner above the proposal card based on status:
- **Green**: "Proposal Accepted! Split Lease is Drafting Lease Documents"
- **Yellow**: "Review Host Counteroffer - Compare Terms"
- **Red**: "Proposal Cancelled by Split Lease. Reason: {reason}"

### Required Implementation
Add a `StatusBanner` component that reads from `getStatusConfig(proposal.Status)`:

```jsx
function StatusBanner({ status, cancelReason }) {
  const config = getStatusConfig(status);

  if (config.color === 'gray') return null; // Don't show for draft/pending

  const bannerMessages = {
    'Proposal or Counteroffer Accepted / Drafting Lease Documents': {
      text: 'Proposal Accepted! Split Lease is Drafting Lease Documents',
      bgColor: '#E1FFE1',
      borderColor: '#1BA54E',
      textColor: '#1BA54E'
    },
    'Host Counteroffer Submitted / Awaiting Guest Review': {
      text: 'Host has submitted a counteroffer. Review the new terms.',
      bgColor: '#FEF3C7',
      borderColor: '#F59E0B',
      textColor: '#92400E'
    },
    'Proposal Cancelled by Split Lease': {
      text: `Proposal Cancelled by Split Lease. Reason: ${cancelReason || 'Not specified'}`,
      bgColor: '#FEE2E2',
      borderColor: '#EF4444',
      textColor: '#B91C1C'
    }
  };

  const banner = bannerMessages[status];
  if (!banner) return null;

  return (
    <div style={{
      background: banner.bgColor,
      border: `1px solid ${banner.borderColor}`,
      color: banner.textColor,
      borderRadius: '10px',
      padding: '15px 20px',
      textAlign: 'center',
      fontWeight: 'bold',
      marginBottom: '15px'
    }}>
      {banner.text}
    </div>
  );
}
```

### Database Fields
- **`Status`** - Primary status string
- **`Cancelled Reason`** - Reason for cancellation (if applicable)

---

## Gap 3: Progress Tracker Color Theme

### Bubble Behavior
Progress tracker nodes/connectors change color based on proposal state:
- **Purple (#6D31C2)**: Active/accepted proposals
- **Red (#DB2E2E)**: Cancelled/rejected proposals
- **Gray (#DEDEDE)**: Pending stages

### Current Code (ProposalCard.jsx)
Uses single color (currently red `#EF4444`) for all active stages.

### Required Fix
Pass `statusConfig.color` to InlineProgressTracker:

```jsx
function InlineProgressTracker({ currentStageIndex = 0, statusColor = 'blue' }) {
  const colors = {
    blue: '#3B82F6',
    green: '#10B981',
    yellow: '#F59E0B',
    red: '#EF4444',
    gray: '#9CA3AF'
  };

  const activeColor = colors[statusColor] || colors.blue;

  // Use activeColor for nodes/connectors instead of hardcoded color
}
```

---

## Gap 4: Dynamic Action Buttons

### Bubble Behavior
Shows different action buttons based on proposal status:

| Status | Buttons Shown |
|--------|---------------|
| Awaiting Rental App | Submit Rental App, Cancel Proposal, Request VM |
| Host Review | Request VM, Cancel Proposal, Send Message |
| Counteroffer Pending | Review Counteroffer, Accept, Decline, Compare Terms |
| Accepted/Drafting | Virtual Meeting (status), Remind Split Lease, See Details, Cancel |
| Lease Signed | Submit Payment, View Lease |
| Activated | View Lease, View House Manual |

### Current Code
Only shows "Delete Proposal" button regardless of status.

### Required Fix
Use `getActionsForStatus(proposal.Status)` and render appropriate buttons:

```jsx
function ProposalActionBar({ proposal }) {
  const actions = getActionsForStatus(proposal.Status);
  const vmStatus = proposal['virtual meeting confirmed '];

  return (
    <div className="action-buttons">
      {/* Virtual Meeting Status */}
      {actions.includes('request_vm') && (
        vmStatus ? (
          <button className="btn-disabled">Virtual Meeting Accepted</button>
        ) : (
          <button className="btn-secondary">Request Virtual Meeting</button>
        )
      )}

      {/* Remind Button (for delayed stages) */}
      {actions.includes('send_message') && proposal.Status?.includes('Drafting') && (
        <button className="btn-success">Remind Split Lease</button>
      )}

      {/* See Details (for counteroffers) */}
      {actions.includes('compare_terms') && (
        <button className="btn-purple">See Details</button>
      )}

      {/* Cancel vs Delete */}
      {actions.includes('cancel_proposal') ? (
        <button className="btn-danger">Cancel Proposal</button>
      ) : (
        <button className="btn-danger">Delete Proposal</button>
      )}
    </div>
  );
}
```

### Database Fields Affecting Actions
- **`Status`** - Primary driver
- **`virtual meeting confirmed `** - Whether VM is scheduled
- **`request virtual meeting`** - Who requested VM ('guest', 'host', null)
- **`counter offer happened`** - Whether counteroffer exists
- **`Is Finalized`** - Whether proposal is locked

---

## Gap 5: Warning Icon for Unavailable Nights

### Bubble Behavior
Shows an exclamation icon (!) next to the day badges when some selected nights are no longer available.

### Database Fields
- **`some nights unavailable`** (boolean) - Indicates night availability conflict
- **`Nights Unavailable`** (array) - Specific nights that became unavailable

### Required Implementation
```jsx
{/* Day badges with warning */}
<div className="day-badges-row">
  {allDays.map((day) => (
    <div key={day.index} className={`day-badge-v2 ${day.selected ? 'selected' : ''}`}>
      {day.letter}
    </div>
  ))}
  {proposal['some nights unavailable'] && (
    <span className="nights-unavailable-warning" title="Some selected nights are no longer available">
      <i className="fa fa-exclamation-circle" style={{ color: '#4B47CE', fontSize: '20px' }} />
    </span>
  )}
</div>
```

---

## Gap 6: Missing Move-out Date

### Bubble Behavior
Shows both dates:
- "Move-in 9/19/25    Move-out 1/15/64"

### Current Code
Only shows: "Anticipated Move-in Sep 19, 2025"

### Database Fields
- **`Move in range start`** - Anticipated move-in date
- **`Move in range end`** - Anticipated move-out date (END of reservation)

### Required Fix
```jsx
const moveInStart = proposal['Move in range start'];
const moveInEnd = proposal['Move in range end'];

<div className="movein-date">
  <span className="label">Move-in</span> {formatDate(moveInStart) || 'TBD'}
  {moveInEnd && (
    <>
      &nbsp;&nbsp;&nbsp;
      <span className="label">Move-out</span> {formatDate(moveInEnd)}
    </>
  )}
</div>
```

---

## Gap 7: Dynamic Progress Stage Labels

### Bubble Behavior
Labels change based on completion:
- Stage 3: "Host Review" when pending -> "Host Review Complete" when done
- Stage 4: "Drafting Lease Docs" instead of generic "Review Documents"

### Current Code (ProposalCard.jsx:90-97)
```javascript
const PROGRESS_STAGES = [
  { id: 1, label: 'Proposal Submitted' },
  { id: 2, label: 'Rental App Submitted' },
  { id: 3, label: 'Host Review' },           // Static
  { id: 4, label: 'Review Documents' },      // Static
  { id: 5, label: 'Lease Documents' },
  { id: 6, label: 'Initial Payment' }
];
```

### Required Fix
Use status-aware labels:

```javascript
function getStageLabels(status) {
  const baseLabels = ['Proposal Submitted', 'Rental App Submitted', 'Host Review', 'Review Documents', 'Lease Documents', 'Initial Payment'];

  // Customize based on status
  if (status?.includes('Accepted') || status?.includes('Drafting')) {
    baseLabels[2] = 'Host Review Complete';
    baseLabels[3] = 'Drafting Lease Docs';
  }

  if (status?.includes('Counteroffer')) {
    baseLabels[2] = 'Counteroffer Pending';
  }

  return baseLabels;
}
```

---

## Implementation Priority

### High Priority (Core Functionality)
1. **Progress Tracker Stage** - Connect to `getStageFromStatus()` (5 min fix)
2. **Status Banner** - Add StatusBanner component (30 min)
3. **Dynamic Action Buttons** - Use `getActionsForStatus()` (1 hour)

### Medium Priority (Visual Parity)
4. **Progress Tracker Colors** - Add color theming (30 min)
5. **Move-out Date** - Add second date display (10 min)
6. **Dynamic Stage Labels** - Status-aware label function (20 min)

### Low Priority (Polish)
7. **Warning Icon** - Night availability indicator (15 min)

---

## Database Fields Summary

All fields needed are already being fetched in `userProposalQueries.js`. The 8-step data pipeline resolves:

| Field | Source | Used For |
|-------|--------|----------|
| `Status` | proposal table | Stage, color, actions, labels |
| `counter offer happened` | proposal table | Show counteroffer UI |
| `virtual meeting confirmed ` | proposal table | VM button state |
| `request virtual meeting` | proposal table | VM request state |
| `Cancelled Reason` | proposal table | Banner message |
| `some nights unavailable` | proposal table | Warning icon |
| `Move in range start` | proposal table | Move-in date |
| `Move in range end` | proposal table | Move-out date |
| `Is Finalized` | proposal table | Lock editing |

---

## Files to Modify

1. **`app/src/islands/pages/proposals/ProposalCard.jsx`**
   - Line 196: Replace hardcoded `currentStageIndex = 3`
   - Add StatusBanner component
   - Add dynamic action buttons
   - Add move-out date
   - Add warning icon

2. **`app/src/islands/pages/proposals/ProposalCard.jsx` (InlineProgressTracker)**
   - Add color prop support
   - Dynamic label generation

3. **`app/src/styles/components/proposal-card.css`** (if exists, or create)
   - Status banner styles
   - Action button variants
   - Warning icon styles

---

## Existing Infrastructure

### Already Available (just needs connection)
- `proposalStatuses.js` - 20+ status configurations with stages, colors, actions
- `proposalStages.js` - 6-stage definitions with help text
- `getStageFromStatus()` - Returns stage number from status string
- `getActionsForStatus()` - Returns array of available actions
- `getStatusConfig()` - Returns full config object (color, label, etc.)

### Data Already Fetched
The 8-step query pipeline in `userProposalQueries.js` already fetches all necessary fields including `Status`, `counter offer happened`, `virtual meeting confirmed `, etc.

---

## Conclusion

The gap between Bubble and the React implementation is primarily a **UI rendering gap**, not a data gap. The status configuration system (`proposalStatuses.js`) and data fetching (`userProposalQueries.js`) are comprehensive. The fix is connecting these existing systems to the UI components.

**Estimated Total Effort**: 3-4 hours for full parity
