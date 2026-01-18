# Implementation Plan: Proposal Flow Personal Info Verification for First-Time Creators

## Overview
Modify the proposal creation flow in ViewSplitLeasePage to show the personal info input section (UserDetailsSection) for first-time proposal creators even when user profile data is already prefilled from AI market report signup or other sources. This allows users to verify or edit AI-generated or previously entered data before their first proposal submission. For subsequent proposals (2nd time onwards), skip directly to the reservation breakdown section (Review).

## Success Criteria
- [ ] First proposal with prefilled data: User sees UserDetailsSection with prefilled values, can edit, then proceeds to Review
- [ ] First proposal without prefilled data: User sees UserDetailsSection with empty fields (current behavior preserved)
- [ ] Second+ proposal: User goes directly to Review section (hub-and-spoke model)
- [ ] FavoriteListingsPage behavior is NOT affected (uses different flow with `useFullFlow=true`)
- [ ] Search page behavior is NOT affected
- [ ] Prefilled values from AI signup (needForSpace, aboutMe, specialNeeds) are visible and editable

## Context & References

### Relevant Files
| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/pages/ViewSplitLeasePage.jsx` | Primary page invoking CreateProposalFlowV2 | Modify `isFirstProposal` calculation logic |
| `app/src/islands/shared/CreateProposalFlowV2.jsx` | Proposal flow component with section navigation | No changes needed - logic already correct |
| `app/src/islands/shared/CreateProposalFlowV2Components/UserDetailsSection.jsx` | User info form section | No changes needed |
| `supabase/functions/auth-user/handlers/validate.ts` | Returns proposalCount from Proposals List | No changes needed |
| `app/src/lib/auth.js` | Frontend auth handling | No changes needed |

### Current Logic Analysis

#### How `isFirstProposal` is Currently Calculated (ViewSplitLeasePage line 2308-2311)
```javascript
isFirstProposal={
  !loggedInUserData ||
  (loggedInUserData.proposalCount === 0 && !loggedInUserData.needForSpace && !loggedInUserData.aboutMe)
}
```

This means:
- `isFirstProposal=true` → Sequential flow: UserDetailsSection → Review
- `isFirstProposal=false` → Hub-and-spoke: Starts on Review

**Current Problem**: When a user has `proposalCount === 0` but HAS `needForSpace` or `aboutMe` (from AI signup), `isFirstProposal` evaluates to `false`, so they skip UserDetailsSection and go straight to Review.

#### Desired Behavior
| Scenario | proposalCount | Has Prefilled Data | Current isFirstProposal | Desired isFirstProposal |
|----------|---------------|-------------------|------------------------|------------------------|
| New user, no data | 0 | No | `true` | `true` |
| AI signup, first proposal | 0 | Yes | `false` (bug!) | `true` (show for verification) |
| Returning user, 2nd+ proposal | 1+ | Yes/No | `false` | `false` |

### How CreateProposalFlowV2 Uses isFirstProposal (lines 163-172)
```javascript
// Determine which flow to use based on useFullFlow and isFirstProposal
const activeFlow = useFullFlow ? FULL_FIRST_PROPOSAL_FLOW : SHORT_FIRST_PROPOSAL_FLOW;

// Determine if we should use sequential flow
const useSequentialFlow = useFullFlow || isFirstProposal;

const [currentSection, setCurrentSection] = useState(
  useSequentialFlow ? activeFlow[0] : RETURNING_USER_START
);
```

Where:
- `SHORT_FIRST_PROPOSAL_FLOW = [2, 1]` (UserDetails → Review)
- `RETURNING_USER_START = 1` (Review)

So when `isFirstProposal=true` and `useFullFlow=false` (ViewSplitLeasePage):
- `useSequentialFlow = true`
- `currentSection` starts at `activeFlow[0]` which is `2` (UserDetailsSection)

This is ALREADY the desired behavior - the fix is simply to ensure `isFirstProposal` evaluates to `true` for first-time proposers regardless of prefilled data.

## Implementation Steps

### Step 1: Update isFirstProposal Calculation in ViewSplitLeasePage
**Files:** `app/src/islands/pages/ViewSplitLeasePage.jsx`
**Purpose:** Change the condition to only check proposalCount, not whether data is prefilled
**Details:**
- Change line 2308-2311 from:
  ```javascript
  isFirstProposal={
    !loggedInUserData ||
    (loggedInUserData.proposalCount === 0 && !loggedInUserData.needForSpace && !loggedInUserData.aboutMe)
  }
  ```
- To:
  ```javascript
  isFirstProposal={
    !loggedInUserData || loggedInUserData.proposalCount === 0
  }
  ```
- This ensures:
  - First proposal users (proposalCount === 0) ALWAYS see UserDetailsSection first
  - Users with prefilled data can verify/edit it before submission
  - Returning users (proposalCount > 0) go directly to Review
**Validation:**
1. Log in as a user with proposalCount=0 and prefilled data (from AI signup) → should see UserDetailsSection first with prefilled values
2. Log in as a user with proposalCount=1+ → should go directly to Review section

### Step 2: Verify FavoriteListingsPage is Not Affected
**Files:** `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`
**Purpose:** Confirm the FavoriteListingsPage already uses correct logic
**Details:**
- Current logic at line 1237: `isFirstProposal={!loggedInUserData || loggedInUserData.proposalCount === 0}`
- This is ALREADY correct - it only checks proposalCount, not prefilled data
- Plus it uses `useFullFlow={true}` which has its own flow (User Details → Move-in → Days → Review)
**Validation:** FavoriteListingsPage behavior remains unchanged

## Edge Cases & Error Handling
- **No loggedInUserData**: Already handled - `isFirstProposal` defaults to `true`
- **proposalCount is undefined/null**: `userData.proposalCount ?? 0` in auth.js ensures it's always a number
- **User closes modal without submitting**: No state change, next open behaves the same way
- **localStorage draft exists**: CreateProposalFlowV2 already merges existingUserData with localStorage draft (line 307-312)

## Testing Considerations
1. **First-time user with AI-prefilled data**:
   - Sign up via AI market report (populates needForSpace and aboutMe)
   - Navigate to a listing and click "Book"
   - Verify: UserDetailsSection shown first with prefilled values editable
   - Edit values, proceed to Review, submit proposal

2. **First-time user without prefilled data**:
   - New guest account with empty profile
   - Navigate to a listing and click "Book"
   - Verify: UserDetailsSection shown first with empty fields

3. **Returning user (2nd+ proposal)**:
   - User who has submitted at least 1 proposal
   - Navigate to a new listing and click "Book"
   - Verify: Goes directly to Review section (hub-and-spoke model)

4. **FavoriteListingsPage (unchanged behavior)**:
   - Navigate to Favorite Listings
   - Click "Book" on a listing
   - Verify: Still uses full flow (User Details → Move-in → Days → Review)

## Rollback Strategy
- Revert the single line change in ViewSplitLeasePage.jsx
- The old logic was:
  ```javascript
  isFirstProposal={
    !loggedInUserData ||
    (loggedInUserData.proposalCount === 0 && !loggedInUserData.needForSpace && !loggedInUserData.aboutMe)
  }
  ```

## Dependencies & Blockers
- None - this is a self-contained change

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Returning users accidentally affected | Low | Medium | Unit test proposalCount > 0 case |
| FavoriteListingsPage regression | Very Low | Low | Already uses correct logic |
| localStorage draft conflicts | Very Low | Low | Merge logic already handles this |

---

## Files Referenced

### Primary Change
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\islands\pages\ViewSplitLeasePage.jsx` (lines 2308-2311)

### Verified No Changes Needed
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\islands\shared\CreateProposalFlowV2.jsx` (flow logic already correct)
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\islands\shared\CreateProposalFlowV2Components\UserDetailsSection.jsx` (UI already handles prefilled data)
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\islands\pages\FavoriteListingsPage\FavoriteListingsPage.jsx` (already uses correct logic)
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\supabase\functions\auth-user\handlers\validate.ts` (proposalCount calculation unchanged)
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\lib\auth.js` (proposalCount handling unchanged)

---

**Plan Created:** 2026-01-17 14:45:32
**Author:** Claude Opus 4.5
