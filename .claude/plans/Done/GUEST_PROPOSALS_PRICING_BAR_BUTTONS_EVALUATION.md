# Guest Proposals Page - Pricing Bar Buttons Evaluation Report

**Generated**: 2025-12-01
**Purpose**: Comprehensive analysis comparing current button implementation against Bubble.io specification
**Status**: Gap Analysis Complete - Requires Implementation Changes

---

## Executive Summary

The current implementation in `ProposalCard.jsx` (lines 811-858) has **significant gaps** when compared to the Bubble.io button conditional specifications. The implementation is missing:

1. **Dynamic button labels** from `os_proposal_status` table (Guest Action 1 & 2)
2. **Guest Action 2 button** entirely (not implemented)
3. **Multiple visibility conditions** for various statuses
4. **Conditional label changes** based on proposal state
5. **Data fields** in the query layer needed for button logic

---

## Bubble Button Specification vs Current Implementation

### Button 1: REQUEST VIRTUAL MEETING

#### Bubble Specification (8 Conditionals)

| # | Condition | Expected Behavior |
|---|-----------|-------------------|
| 1 | VM requested by is NOT Current User AND VM is not empty | Label: "Respond to Virtual Meeting Request" |
| 2 | VM requested by IS Current User | Label: "Virtual Meeting Requested" |
| 3 | Button is pressed | Visual: Inset box shadow |
| 4 | VM booked date is not empty AND confirmedBySplitLease is NO | Label: "Virtual Meeting Accepted" |
| 5 | VM booked date is not empty AND confirmedBySplitLease is YES | Label: "Meeting confirmed" |
| 6 | VM meeting declined is YES | Label: "Virtual Meeting Declined", Font: #DB2E2E, Bold |
| 7 | Status is "Rejected by Host" OR "Cancelled by SL" OR "Lease activated" | **HIDDEN** |
| 8 | Status is "SL Submitted - Awaiting Rental App" OR "SL Submitted - Pending Confirmation" | **HIDDEN** |

#### Current Implementation (lines 634-660, 813-821)

```javascript
// getVmButtonState() handles:
if (vmDeclined === true) → "Virtual Meeting Declined"
if (vmBookedDate && vmConfirmedBySL === true) → "Meeting confirmed"
if (vmBookedDate) → "Virtual Meeting Accepted"
if (vmRequestedBy === currentUserId) → "Virtual Meeting Requested"
if (vmRequestedBy && vmRequestedBy !== currentUserId) → "Respond to VM Request"
default → "Request Virtual Meeting"

// Visibility:
{!isTerminal && !isCompleted && (...)}
```

#### Gaps Identified

| Gap | Severity | Description |
|-----|----------|-------------|
| **MISSING** | HIGH | Not hidden for "Proposal Submitted for guest by Split Lease - Awaiting Rental Application" |
| **MISSING** | HIGH | Not hidden for "Proposal Submitted for guest by Split Lease - Pending Confirmation" |
| **PARTIAL** | LOW | Bold styling for declined state present in CSS but not dynamic |

---

### Button 2: GUEST ACTION 1

#### Bubble Specification (10 Conditionals)

| # | Condition | Expected Behavior |
|---|-----------|-------------------|
| 1 | Status is not empty | Visible |
| 2 | Status's Guest Action 1 is "Invisible" | **HIDDEN** |
| 3 | guest documents review finalized? is YES AND Status is "Lease Documents Sent for Review" | **HIDDEN** |
| 4 | Status's Guest Action 1 is "Remind Split Lease" AND remindersByGuest >= 3 | **HIDDEN** |
| 5 | Status is not empty | Label: Status's `Guest Action 1` field value |
| 6-7 | (duplicates of 2, 3) | - |
| 8 | Status's Guest Action 1 is "Go to Leases" | Special handling |
| 9 | (duplicate of 4) | - |
| 10 | Status is "Proposal Rejected by Host" | Label: "Delete Proposal", Background: #EF4444 |

#### Expected Labels from `os_proposal_status` Table

| Status | Guest Action 1 Label |
|--------|---------------------|
| sl_submitted_awaiting_rental_app | Interested |
| guest_submitted_awaiting_rental_app | Submit Rental App |
| sl_submitted_pending_confirmation | Interested |
| host_review | Modify Proposal |
| host_counteroffer | Accept Host Terms |
| accepted_drafting_lease | Remind Split Lease |
| lease_docs_for_review | Review Documents |
| lease_docs_for_signatures | Resend Lease Docs |
| lease_signed_awaiting_payment | Submit Initial Payment |
| payment_submitted_lease_activated | Go to Leases |
| cancelled_by_guest | Invisible |
| rejected_by_host | Delete Proposal |
| cancelled_by_sl | Invisible |
| guest_ignored_suggestion | Invisible |

#### Current Implementation (lines 830-845)

```javascript
// Hard-coded logic:
{(status?.includes('Drafting') || status === 'Host Review') && (
  <button>Remind Split Lease</button>
)}

{!isTerminal && !isCompleted && (
  <button onClick={() => setShowProposalDetailsModal(true)}>
    Modify Proposal
  </button>
)}
```

#### Gaps Identified

| Gap | Severity | Description |
|-----|----------|-------------|
| **CRITICAL** | CRITICAL | Labels are hard-coded instead of sourced from `os_proposal_status.guest_action_1` |
| **MISSING** | HIGH | No check for `remindersByGuest >= 3` to hide "Remind Split Lease" |
| **MISSING** | HIGH | No check for `guest documents review finalized?` to hide when docs finalized |
| **MISSING** | HIGH | Missing labels: "Interested", "Submit Rental App", "Accept Host Terms", "Review Documents", "Resend Lease Docs", "Submit Initial Payment" |
| **MISSING** | MEDIUM | "Delete Proposal" special red styling for rejected proposals |
| **INCORRECT** | HIGH | "Modify Proposal" shows for ALL non-terminal statuses instead of only "Host Review" |

---

### Button 3: GUEST ACTION 2

#### Bubble Specification (5 Conditionals)

| # | Condition | Expected Behavior |
|---|-----------|-------------------|
| 1 | Status's Guest Action 2 is "Invisible" | **HIDDEN** |
| 2 | Guest's ID documents submitted? is YES AND Status is "Lease Documents Sent for Review" | **HIDDEN** |
| 3 | Status is not empty | Label: Status's `Guest Action 2` field value |
| 4-5 | (duplicates) | - |

#### Expected Labels from `os_proposal_status` Table

| Status | Guest Action 2 Label |
|--------|---------------------|
| sl_submitted_awaiting_rental_app | Not Interested |
| guest_submitted_awaiting_rental_app | Invisible |
| sl_submitted_pending_confirmation | Not Interested |
| host_review | Invisible |
| host_counteroffer | Review Host Terms |
| accepted_drafting_lease | See Details |
| lease_docs_for_review | Verify Your Identity |
| lease_docs_for_signatures | Invisible |
| lease_signed_awaiting_payment | Invisible |
| payment_submitted_lease_activated | Invisible |
| (all terminal states) | Invisible |

#### Current Implementation

```javascript
// NOT IMPLEMENTED - Button does not exist in current code
```

#### Gaps Identified

| Gap | Severity | Description |
|-----|----------|-------------|
| **NOT IMPLEMENTED** | CRITICAL | Entire button is missing |
| **MISSING** | HIGH | "Not Interested" for SL-suggested proposals |
| **MISSING** | HIGH | "Review Host Terms" for counteroffer status |
| **MISSING** | HIGH | "See Details" for accepted/drafting status |
| **MISSING** | HIGH | "Verify Your Identity" for lease docs review |
| **MISSING** | HIGH | ID documents submitted check for visibility |

---

### Button 4: CANCEL PROPOSAL

#### Bubble Specification (6 Conditionals)

| # | Condition | Expected Behavior |
|---|-----------|-------------------|
| 1 | Status is "Proposal Rejected by Host" | Label: "Proposal Rejected", **HIDDEN** |
| 2 | Status is "Host Counteroffer Submitted / Awaiting Guest Review" | Label: "Reject Modified Terms" |
| 3 | Status's Usual Order > 5 | Visible |
| 4 | Status is Cancelled by SL/Guest OR Rejected by Host | Label: "Delete Proposal" |
| 5 | Usual Order > 5 AND Listing's House manual is not empty | Label: "See House Manual", Background: #6D31C2, Not clickable |
| 6 | Status is "SL Submitted - Awaiting Rental App" OR "SL Submitted - Pending Confirmation" | Label: "Reject Proposal", Visible |

#### Current Implementation (lines 847-857)

```javascript
{isTerminal && (
  <button className="btn-delete-proposal">Delete Proposal</button>
)}
{!isTerminal && !isCompleted && (
  <button className="btn-cancel-proposal">Cancel Proposal</button>
)}
```

#### Gaps Identified

| Gap | Severity | Description |
|-----|----------|-------------|
| **MISSING** | HIGH | "Reject Modified Terms" label for counteroffer status |
| **MISSING** | HIGH | "See House Manual" with purple background when Usual Order > 5 AND house manual exists |
| **MISSING** | HIGH | "Reject Proposal" for SL-submitted proposals |
| **MISSING** | MEDIUM | House manual field not fetched in query layer |
| **INCORRECT** | MEDIUM | Uses simple terminal/non-terminal check instead of Usual Order logic |

---

## Data Requirements Gap Analysis

### Fields Missing from Query Layer

The current `userProposalQueries.js` does NOT fetch these required fields:

| Field | Table | Required For |
|-------|-------|--------------|
| `remindersByGuest (number)` | proposal | Guest Action 1 visibility (>= 3 check) |
| `guest documents review finalized?` | proposal | Guest Action 1 visibility |
| `ID documents submitted?` | user | Guest Action 2 visibility |
| `House manual` | listing | Cancel button label ("See House Manual") |

### Required Query Updates

```javascript
// In fetchProposalsByIds() - proposal select:
"remindersByGuest (number)",
"guest documents review finalized?",

// In listing select:
"House manual",

// In guest user select:
"ID documents submitted?"
```

---

## Supabase Reference Table Structure

### `os_proposal_status` Table Schema

| Column | Type | Purpose |
|--------|------|---------|
| `id` | bigint | Primary key |
| `name` | text | Status key (snake_case) |
| `display` | text | Full documentation text |
| `displayed_on_screen` | text | User-facing short text |
| `guest_action_1` | text | Guest Action 1 button label |
| `guest_action_2` | text | Guest Action 2 button label |
| `host_action_1` | text | Host Action 1 button label |
| `host_action_2` | text | Host Action 2 button label |
| `sort_order` | integer | Workflow progression order |

### Status Key Mapping (name → display)

| Table `name` | Expected `Status` field value |
|--------------|------------------------------|
| `sl_submitted_awaiting_rental_app` | Proposal Submitted for guest by Split Lease - Awaiting Rental Application |
| `guest_submitted_awaiting_rental_app` | Proposal Submitted by guest - Awaiting Rental Application |
| `sl_submitted_pending_confirmation` | Proposal Submitted for guest by Split Lease - Pending Confirmation |
| `host_review` | Host Review |
| `host_counteroffer` | Host Counteroffer Submitted / Awaiting Guest Review |
| `accepted_drafting_lease` | Proposal or Counteroffer Accepted / Drafting Lease Documents |
| `lease_docs_for_review` | Lease Documents Sent for Review |
| `lease_docs_for_signatures` | Lease Documents Sent for Signatures |
| `lease_signed_awaiting_payment` | Lease Documents Signed / Awaiting Initial payment |
| `payment_submitted_lease_activated` | Initial Payment Submitted / Lease activated |
| `cancelled_by_guest` | Proposal Cancelled by Guest |
| `rejected_by_host` | Proposal Rejected by Host |
| `cancelled_by_sl` | Proposal Cancelled by Split Lease |

---

## Implementation Recommendations

### Priority 1: Critical (Functionality Broken)

1. **Add Guest Action 2 button**
   - Implement visibility logic based on `os_proposal_status.guest_action_2`
   - Add ID documents submitted check from user table
   - Required for counteroffer acceptance flow

2. **Convert Guest Action 1 to dynamic labels**
   - Fetch button labels from `os_proposal_status` table
   - Replace hard-coded "Modify Proposal" and "Remind Split Lease"
   - Implement reminder count limit check

### Priority 2: High (Missing Conditions)

3. **Fix Virtual Meeting visibility**
   - Add hidden check for SL-suggested proposal statuses
   - Statuses: `Proposal Submitted for guest by Split Lease - Awaiting Rental Application`, `Proposal Submitted for guest by Split Lease - Pending Confirmation`

4. **Fix Cancel button labels**
   - Add "Reject Modified Terms" for counteroffer status
   - Add "Reject Proposal" for SL-suggested proposals
   - Add "See House Manual" with purple background for Usual Order > 5

5. **Update data query layer**
   - Add missing fields to `fetchProposalsByIds()`
   - Fields: `remindersByGuest (number)`, `guest documents review finalized?`, `House manual`, `ID documents submitted?`

### Priority 3: Medium (Polish)

6. **Implement Usual Order-based logic**
   - Use `sort_order` from `os_proposal_status` instead of status string matching
   - More maintainable and consistent with Bubble

7. **Add document review finalization check**
   - Hide Guest Action 1 when `guest documents review finalized? = true` AND status is "Lease Documents Sent for Review"

---

## Proposed Architecture Change

### Option A: Status Config Lookup (Recommended)

Fetch `os_proposal_status` at page load and use for all button logic:

```javascript
// useGuestProposalsPageLogic.js
const [statusConfig, setStatusConfig] = useState(null);

useEffect(() => {
  async function fetchStatusConfig() {
    const { data } = await supabase
      .from('os_proposal_status')
      .select('name, display, guest_action_1, guest_action_2, sort_order');

    // Create lookup map by display value (matches proposal.Status)
    const configMap = new Map(data.map(s => [s.display, s]));
    setStatusConfig(configMap);
  }
  fetchStatusConfig();
}, []);
```

### Option B: Hybrid Approach

Keep current `proposalStatuses.js` but add `guestAction1` and `guestAction2` fields that match the database values.

---

## Summary Matrix

| Button | Current State | Gap Count | Severity |
|--------|---------------|-----------|----------|
| Virtual Meeting | Partial | 2 | HIGH |
| Guest Action 1 | Hard-coded | 6 | CRITICAL |
| Guest Action 2 | Not Implemented | 6 | CRITICAL |
| Cancel Proposal | Partial | 4 | HIGH |

**Total Gaps: 18**
**Critical: 12 | High: 6 | Medium: 0**

---

## Appendix: Reference Files

### Primary Implementation Files
- `app/src/islands/pages/proposals/ProposalCard.jsx` (lines 811-858) - Current button implementation
- `app/src/lib/proposals/userProposalQueries.js` - Data fetching layer
- `app/src/logic/constants/proposalStatuses.js` - Status configuration

### Specification Documents
- `docs/Button Conditionals - Guest Proposals Page.md` - Original Bubble button specs
- `docs/Option_Sets_Name_Mapping.md` - Supabase table name mappings
- `docs/Guest Proposals page Proposal Status Bar Conditionals Documentation .md` - Status banner specs
- `docs/Done/GUEST_PROPOSALS_BUTTON_CONDITIONALS.md` - Previous implementation plan

### Database References
- Supabase Table: `os_proposal_status` - Button labels and sort order
- Supabase Table: `proposal` - Status field, remindersByGuest, guest documents review finalized
- Supabase Table: `user` - ID documents submitted
- Supabase Table: `listing` - House manual

### Schema Documentation
- `docs/PROPOSAL_TABLE_SCHEMA.md` - Complete proposal table schema
- `DATABASE_SCHEMA_OVERVIEW.md` - Full database reference

---

## Next Steps

1. Review this report with stakeholder
2. Approve implementation approach (Option A or B)
3. Update query layer to fetch missing fields
4. Implement Guest Action 2 button
5. Convert Guest Action 1 to dynamic labels
6. Fix visibility conditions for all buttons
7. Test all status transitions
8. Update documentation
