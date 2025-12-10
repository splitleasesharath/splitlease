# Migration Plan: Proposal Status Config to Supabase Reference Table

**Created**: 2025-12-04
**Status**: Pending Implementation

---

## Overview

Migrate hardcoded proposal status constants in `proposalStatusConfig.js` to dynamically fetch from the Supabase `os_proposal_status` reference table. No backward compatibility - fix issues as they arise.

---

## Current State Analysis

### Hardcoded Constants (`app/src/config/proposalStatusConfig.js`)

The current implementation uses:
1. `PROPOSAL_STATUS` object - Maps semantic keys to display string values
2. `STATUS_CONFIG` object - Maps display strings to UI configuration (usualOrder, guestAction1, guestAction2)
3. `getStatusConfig()` function - Looks up config by status text

**Problem**: These values duplicate what exists in the `os_proposal_status` Supabase table, creating:
- Synchronization issues when database values change
- Maintenance overhead to keep both in sync
- Risk of mismatches between frontend and backend

### Database Table (`os_proposal_status`)

| Column | Purpose |
|--------|---------|
| `id` | Primary key (1-14) |
| `name` | Machine-readable key (e.g., `host_review`, `cancelled_by_guest`) |
| `display` | Full display text |
| `screen_display` | Short screen display text |
| `guest_action_1` | First guest action button label |
| `guest_action_2` | Second guest action button label |
| `host_action_1` | First host action button label |
| `host_action_2` | Second host action button label |
| `sort_order` | Display ordering |

---

## Migration Strategy

### Approach: Direct Replacement

1. **Create a data fetching hook** that queries `os_proposal_status` on app initialization
2. **Cache the data** in memory/context to avoid repeated fetches
3. **Use `name` field exclusively** for status comparisons
4. **Delete old config file** immediately after migration
5. **Fix breakages** as they surface

---

## Implementation Steps

### Step 1: Create Supabase Query Hook

Create `app/src/hooks/useProposalStatuses.js`:
- Fetch all rows from `os_proposal_status` table
- Return statuses array, loading state, error state
- Cache results to prevent refetching

### Step 2: Create Status Context Provider

Create `app/src/context/ProposalStatusContext.jsx`:
- Wraps app and provides status data globally
- Fetches on mount, stores in context
- Provides helper functions:
  - `getStatusByName(name)` - Get status object by `name` field
  - `getStatusById(id)` - Get status object by ID
  - `getStatusConfig(status)` - Returns UI config (actions, sort order)

### Step 3: Create Status Constants Module

Create `app/src/config/proposalStatusConstants.js`:
- Export `STATUS_NAMES` object with type-safe keys:
```javascript
export const STATUS_NAMES = {
  SL_SUBMITTED_AWAITING_RENTAL_APP: 'sl_submitted_awaiting_rental_app',
  GUEST_SUBMITTED_AWAITING_RENTAL_APP: 'guest_submitted_awaiting_rental_app',
  SL_SUBMITTED_PENDING_CONFIRMATION: 'sl_submitted_pending_confirmation',
  HOST_REVIEW: 'host_review',
  HOST_COUNTEROFFER: 'host_counteroffer',
  ACCEPTED_DRAFTING_LEASE: 'accepted_drafting_lease',
  LEASE_DOCS_FOR_REVIEW: 'lease_docs_for_review',
  LEASE_DOCS_FOR_SIGNATURES: 'lease_docs_for_signatures',
  LEASE_SIGNED_AWAITING_PAYMENT: 'lease_signed_awaiting_payment',
  PAYMENT_SUBMITTED_LEASE_ACTIVATED: 'payment_submitted_lease_activated',
  CANCELLED_BY_GUEST: 'cancelled_by_guest',
  REJECTED_BY_HOST: 'rejected_by_host',
  CANCELLED_BY_SL: 'cancelled_by_sl',
  GUEST_IGNORED_SUGGESTION: 'guest_ignored_suggestion',
};
```

### Step 4: Update `useProposalButtonStates.js`

Modify hook to:
- Import from new context/constants
- Compare against `name` field instead of `display` field
- Use `getStatusConfig()` from context for action buttons

### Step 5: Update Proposal Data Processing

Ensure proposals coming from API include the `status.name` or `status_name` field to match against `STATUS_NAMES`.

### Step 6: Delete Old `proposalStatusConfig.js`

Remove file immediately after migration. No deprecation period.

---

## File Changes Summary

| File | Action |
|------|--------|
| `app/src/hooks/useProposalStatuses.js` | **CREATE** - Supabase fetch hook |
| `app/src/context/ProposalStatusContext.jsx` | **CREATE** - Global status provider |
| `app/src/config/proposalStatusConstants.js` | **CREATE** - Type-safe status name constants |
| `app/src/logic/rules/proposals/useProposalButtonStates.js` | **MODIFY** - Use new context/constants |
| `app/src/config/proposalStatusConfig.js` | **DELETE** |

---

## Key Files Referenced

- `app/src/config/proposalStatusConfig.js` - Current hardcoded config (to be deleted)
- `app/src/logic/rules/proposals/useProposalButtonStates.js` - Primary consumer (lines 1-147)
- Supabase table: `os_proposal_status` - Source of truth

---

## Considerations

### Loading States

Components using status config need to handle the async nature of fetching:
- Eager fetch on app mount before rendering dependent components
- Show loading state until statuses are available

### Error Handling

If fetch fails, throw an error. No fallbacks.

### Performance

- Table has only 14 rows - minimal payload
- Cache in memory after first fetch

---

## Testing Checklist

- [ ] Status names match between constants and database
- [ ] `useProposalButtonStates` returns correct button configurations
- [ ] Loading states handled
- [ ] No regression in proposal card UI
