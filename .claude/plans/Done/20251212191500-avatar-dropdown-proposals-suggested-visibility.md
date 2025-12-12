# Implementation Plan: Avatar Dropdown "Proposals Suggested" Conditional Visibility

## Overview
Add conditional visibility logic to the "Proposals Suggested" menu item in the avatar dropdown. Currently, this option is shown to all Guest users. The new requirement is to only show it when the Guest has at least one proposal with a specific "suggested by Split Lease" status.

## Success Criteria
- [ ] "Proposals Suggested" menu item only appears for Guest users
- [ ] "Proposals Suggested" only visible when user has >= 1 proposal with status matching either:
  - "Proposal Submitted for guest by Split Lease - Awaiting Rental Application"
  - "Proposal Submitted for guest by Split Lease - Pending Confirmation"
- [ ] Menu visibility updates when data is loaded from Supabase
- [ ] No performance regression (query should be efficient)
- [ ] Existing menu items remain unaffected

## Context & References

### Relevant Files
| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/shared/LoggedInAvatar/useLoggedInAvatarData.js` | Hook that fetches menu visibility data from Supabase | Add query to check for proposals with suggested statuses; add `hasSuggestedProposals` to return data |
| `app/src/islands/shared/LoggedInAvatar/LoggedInAvatar.jsx` | Avatar dropdown component rendering menu items | No direct changes (uses getMenuVisibility) |
| `app/src/logic/constants/proposalStatuses.js` | Centralized proposal status definitions | Reference for exact status strings |
| `app/src/config/proposalStatusConfig.js` | Proposal status configuration | Reference for status strings |

### Related Documentation
- [GUEST_PROPOSALS_QUICK_REFERENCE.md](.claude/Documentation/Pages/GUEST_PROPOSALS_QUICK_REFERENCE.md) - Proposal status handling
- [DATABASE_TABLES_DETAILED.md](.claude/Documentation/Database/DATABASE_TABLES_DETAILED.md) - Proposal table schema

### Existing Patterns to Follow
- **Parallel Supabase queries**: The `useLoggedInAvatarData` hook fetches multiple data sources in parallel using `Promise.all` for performance
- **Menu visibility via `getMenuVisibility`**: All menu item visibility is controlled by the `getMenuVisibility` function based on fetched data
- **JSONB array for Proposals List**: User's proposals are stored in the `user."Proposals List"` JSONB array field containing proposal IDs

## Implementation Steps

### Step 1: Define the Target Proposal Statuses as Constants
**Files:** `app/src/islands/shared/LoggedInAvatar/useLoggedInAvatarData.js`
**Purpose:** Add constants for the two "suggested by Split Lease" proposal statuses for clarity and maintainability
**Details:**
- Add at the top of the file (after imports):
```javascript
/**
 * Proposal statuses that indicate a proposal was suggested by Split Lease
 * Used to determine visibility of "Proposals Suggested" menu item
 */
const SUGGESTED_PROPOSAL_STATUSES = [
  'Proposal Submitted for guest by Split Lease - Awaiting Rental Application',
  'Proposal Submitted for guest by Split Lease - Pending Confirmation'
];
```
**Validation:** Code compiles without errors

### Step 2: Add Supabase Query for Suggested Proposals Count
**Files:** `app/src/islands/shared/LoggedInAvatar/useLoggedInAvatarData.js`
**Purpose:** Query the proposal table to check if user has any proposals with the suggested statuses
**Details:**
- Inside the `fetchData` callback, add a new query to the `Promise.all` array:
```javascript
// 7. Check for proposals suggested by Split Lease
//    These are proposals created by SL agent on behalf of the guest
supabase
  .from('proposal')
  .select('_id', { count: 'exact', head: true })
  .eq('Guest', userId)
  .in('Status', SUGGESTED_PROPOSAL_STATUSES)
  .or('"Deleted".is.null,"Deleted".eq.false')
```
- This query:
  - Filters proposals where `Guest` equals the current user
  - Filters by the two "suggested by Split Lease" statuses using `.in()`
  - Excludes deleted proposals
  - Uses `{ count: 'exact', head: true }` for efficiency (only returns count, no data)

**Validation:** Query returns expected count when tested with a user who has suggested proposals

### Step 3: Add Result Handling for Suggested Proposals Query
**Files:** `app/src/islands/shared/LoggedInAvatar/useLoggedInAvatarData.js`
**Purpose:** Destructure the new query result and add to the data state
**Details:**
- Update the destructuring of `Promise.all` results to include the new query result:
```javascript
const [
  userResult,
  listingsResult,
  visitsResult,
  virtualMeetingsResult,
  leasesResult,
  messagesResult,
  suggestedProposalsResult  // NEW
] = await Promise.all([
  // ... existing queries ...
  // 7. Check for proposals suggested by Split Lease (NEW)
  supabase
    .from('proposal')
    .select('_id', { count: 'exact', head: true })
    .eq('Guest', userId)
    .in('Status', SUGGESTED_PROPOSAL_STATUSES)
    .or('"Deleted".is.null,"Deleted".eq.false')
]);
```

- Add to the `newData` object:
```javascript
const newData = {
  // ... existing fields ...
  suggestedProposalsCount: suggestedProposalsResult.count || 0
};
```

- Update the initial state in `useState` to include the new field:
```javascript
const [data, setData] = useState({
  // ... existing fields ...
  suggestedProposalsCount: 0
});
```

**Validation:** Console log shows correct `suggestedProposalsCount` value

### Step 4: Update getMenuVisibility Function
**Files:** `app/src/islands/shared/LoggedInAvatar/useLoggedInAvatarData.js`
**Purpose:** Modify the visibility logic for "Proposals Suggested" to check for suggested proposals count
**Details:**
- Update the `getMenuVisibility` function to include `suggestedProposalsCount` in destructuring:
```javascript
export function getMenuVisibility(data, currentPath = '') {
  const {
    userType,
    proposalsCount,
    visitsCount,
    houseManualsCount,
    favoritesCount,
    leasesCount,
    suggestedProposalsCount  // NEW
  } = data;
```

- Update the `myProposalsSuggested` visibility rule:
```javascript
// 3. My Proposals Suggested - GUEST only AND must have suggested proposals
//    Only shows when user has proposals created by Split Lease agent
myProposalsSuggested: isGuest && suggestedProposalsCount > 0,
```

- Update the JSDoc comment to reflect the new rule:
```javascript
/**
 * MENU VISIBILITY BY USER TYPE:
 *
 * GUEST (wants to rent a space):
 *   ...
 *   ✓ My Proposals Suggested - Conditional (suggestedProposalsCount > 0)
 *   ...
 */
```

**Validation:** Menu item appears/disappears correctly based on proposal statuses

### Step 5: Update Component JSDoc Comments
**Files:** `app/src/islands/shared/LoggedInAvatar/LoggedInAvatar.jsx`
**Purpose:** Update documentation to reflect the new visibility rule
**Details:**
- Update the component JSDoc comment (lines 18-26) to reflect the new conditional:
```javascript
 * Menu Visibility Rules (from Bubble.io conditionals):
 * 1. My Profile - ALWAYS visible
 * 2. My Proposals - ALWAYS visible (all users)
 * 3. Proposals Suggested - GUEST only AND has proposals with "suggested by SL" status
 * 4. My Listings - HOST and TRIAL_HOST only
 * ...
```

**Validation:** Documentation is accurate

## Edge Cases & Error Handling
- **No proposals**: If user has no proposals at all, `suggestedProposalsCount` will be 0, menu item hidden
- **Only non-suggested proposals**: User has proposals but none with suggested statuses - menu item hidden
- **Query failure**: If the suggested proposals query fails, default to 0 (menu item hidden) to avoid false positives
- **Deleted proposals**: Query excludes proposals with `Deleted = true` to match existing behavior

## Testing Considerations
- Test with Guest user who has NO proposals - menu item should be hidden
- Test with Guest user who has proposals but NONE with suggested statuses - menu item should be hidden
- Test with Guest user who has at least ONE proposal with "Awaiting Rental Application" status - menu item should appear
- Test with Guest user who has at least ONE proposal with "Pending Confirmation" status - menu item should appear
- Test with Host user - menu item should always be hidden (Host check takes precedence)
- Verify no performance regression by checking network waterfall for the new query

## Rollback Strategy
- Revert the visibility condition in `getMenuVisibility` to `isGuest` only
- Remove the `suggestedProposalsCount` field and query
- Changes are isolated to two files, easy to revert

## Dependencies & Blockers
- None - this is an additive change to existing functionality

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Query performance | Low | Low | Using `count` with `head: true` is efficient |
| Incorrect status strings | Low | Medium | Using constants, matching existing proposalStatuses.js |
| Breaking existing menu items | Very Low | Medium | Only modifying one visibility rule |

---

## File References Summary

### Files to Modify
1. **`C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\shared\LoggedInAvatar\useLoggedInAvatarData.js`**
   - Add `SUGGESTED_PROPOSAL_STATUSES` constant
   - Add new Supabase query for suggested proposals count
   - Update `data` state to include `suggestedProposalsCount`
   - Update `getMenuVisibility` to use new visibility condition
   - Update JSDoc comments

2. **`C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\shared\LoggedInAvatar\LoggedInAvatar.jsx`**
   - Update component JSDoc comments to document new rule

### Files for Reference (No Changes)
3. **`C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\logic\constants\proposalStatuses.js`**
   - Reference for status string definitions
   - Lines 78-97: `SUGGESTED_PROPOSAL_AWAITING_RENTAL_APP` and `SUGGESTED_PROPOSAL_PENDING_CONFIRMATION`

4. **`C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\config\proposalStatusConfig.js`**
   - Reference for status strings
   - Lines 12-13: `PROPOSAL_SUBMITTED_BY_SL_AWAITING_APPLICATION` and `PROPOSAL_SUBMITTED_BY_SL_PENDING_CONFIRMATION`

---

**Plan Version**: 1.0
**Created**: 2025-12-12 19:15:00
**Author**: Claude (Implementation Planner)
