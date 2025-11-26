# Plan: LoggedInAvatar Dropdown Conditional Visibility

## Overview

This plan maps the Bubble.io conditional visibility logic to the existing React implementation in `LoggedInAvatar.jsx`. The goal is to ensure parity between Bubble's dropdown behavior and the React version.

---

## Current State Analysis

### Existing Implementation Location
- **Component**: `app/src/islands/shared/LoggedInAvatar/LoggedInAvatar.jsx`
- **Data Hook**: `app/src/islands/shared/LoggedInAvatar/useLoggedInAvatarData.js`
- **Visibility Logic**: `getMenuVisibility()` function in the data hook

### Current Menu Items (12 total)
1. My Profile
2. My Proposals
3. Proposals Suggested (currently hidden)
4. My Listings
5. Virtual Meetings
6. House Manuals & Visits
7. My Leases
8. My Favorite Listings
9. Messages
10. Rental Application
11. Reviews Manager
12. Referral

---

## Bubble Conditional Logic vs Current Implementation

### 1. G:My Profile (3 conditionals)
| Bubble Condition | Current Implementation | Status |
|-----------------|----------------------|--------|
| When "This Group is visible" | Always visible | ✅ Match |
| When "This URL contains profile" | Active state check via `currentPath` | ✅ Match |
| Hover → Background #CAC8C8 | CSS `:hover` state | ✅ Match |

**No changes needed**

---

### 2. G:My Proposals (5 conditionals)
| Bubble Condition | Current Implementation | Status |
|-----------------|----------------------|--------|
| When "This Group is visible" | Always visible | ✅ Match |
| When user is HOST | Shows all proposals | ✅ Match |
| When user is TRIAL_HOST | Shows all proposals | ✅ Match |
| Hover → Background #CAC8C8 | CSS `:hover` state | ✅ Match |
| When "Current page name is guest-dashboard" | Active state check | ⚠️ Need to verify path |

**Action**: Verify active path detection includes `guest-dashboard`

---

### 3. G:My Proposals Suggested (5 conditionals)
| Bubble Condition | Current Implementation | Status |
|-----------------|----------------------|--------|
| When "This Group is visible" | Currently `false` (hidden) | ❌ Mismatch |
| When user is HOST | Not implemented | ❌ Missing |
| When user is TRIAL_HOST | Not implemented | ❌ Missing |
| Hover → Background #CAC8C8 | CSS exists | ✅ Ready |
| When proposals count < 1 | Not implemented | ❌ Missing |

**Action Required**:
- Enable visibility when: `(isHost || isTrialHost) && proposalsCount < 1`
- This appears to be a "suggested proposals" feature for hosts with no proposals

---

### 4. G:My Listings (5 conditionals)
| Bubble Condition | Current Implementation | Status |
|-----------------|----------------------|--------|
| When "This Group is visible" | `isHostOrTrial` | ✅ Match |
| When "This URL contains host-overview" | Active state check | ⚠️ Verify path |
| When user is GUEST | Hidden | ✅ Match |
| When user is HOST or TRIAL_HOST | Visible | ✅ Match |
| Hover → Background #CAC8C8 | CSS `:hover` state | ✅ Match |

**No changes needed** - logic already correct

---

### 5. G:Virtual Meetings (4 conditionals)
| Bubble Condition | Current Implementation | Status |
|-----------------|----------------------|--------|
| When "This Group is visible" | `proposalsCount === 0` | ⚠️ Partial |
| Hover → Background #CAC8C8 | CSS `:hover` state | ✅ Match |
| When GUEST & proposals = 0 | Currently applies to all | ⚠️ Review |
| When HOST & proposals = 0 | Currently applies to all | ⚠️ Review |

**Action Required**: Verify if current logic should only show Virtual Meetings when:
- User is GUEST AND proposals count = 0, OR
- User is HOST AND proposals count = 0

Current implementation shows it for ANY user with 0 proposals. This may be intentional simplification.

---

### 6. G:My Leases (5 conditionals)
| Bubble Condition | Current Implementation | Status |
|-----------------|----------------------|--------|
| When "This Group is visible" | Always visible | ⚠️ Different |
| When GUEST & leases = 0 | Not implemented | ❌ Missing |
| When HOST & leases = 0 | Not implemented | ❌ Missing |
| When TRIAL_HOST | Not implemented | ❌ Missing |
| Hover → Background #CAC8C8 | CSS `:hover` state | ✅ Match |

**Analysis**: Bubble appears to have special styling/behavior when leases count is 0.
**Action**: Clarify if this means HIDE when leases = 0, or just STYLE differently.

---

### 7. G:My Favorites (5 conditionals)
| Bubble Condition | Current Implementation | Status |
|-----------------|----------------------|--------|
| When "This Group is visible" | `isGuest` only | ⚠️ Partial |
| When NOT GUEST or favorites = 0 | Hide logic | ⚠️ Different |
| When TRIAL_HOST | Hide | ✅ Match (not guest) |
| Hover → Background #CAC8C8 | CSS `:hover` state | ✅ Match |
| When page is "favorite-listings" | Active state | ⚠️ Verify path |

**Action Required**:
- Current: Shows for GUEST only
- Bubble: Hides when NOT GUEST OR favorites count = 0
- Need to add: `isGuest && favoritesCount > 0`

---

### 8. G:Rental Application (5 conditionals)
| Bubble Condition | Current Implementation | Status |
|-----------------|----------------------|--------|
| When "This Group is visible" | `isGuest` only | ✅ Match |
| When URL contains "rental-application" & GUEST | Active state | ⚠️ Verify |
| When URL contains "profile" & HOST | Different behavior | ❌ Missing |
| When TRIAL_HOST | Hide | ✅ Match |
| Hover → Background #CAC8C8 | CSS `:hover` state | ✅ Match |

**Action Required**: Bubble shows different behavior based on URL + user type combo. Need to clarify expected behavior.

---

### 9. G:Reviews Section (2 conditionals)
| Bubble Condition | Current Implementation | Status |
|-----------------|----------------------|--------|
| When "This Group is visible" | Always visible | ✅ Match |
| Hover → Background #CAC8C8 | CSS `:hover` state | ✅ Match |

**No changes needed**

---

### 10. G:Referral (2 conditionals)
| Bubble Condition | Current Implementation | Status |
|-----------------|----------------------|--------|
| When "This Group is visible" | Always visible | ✅ Match |
| Hover → Background #CAC8C8 | CSS `:hover` state | ✅ Match |

**No changes needed**

---

### 11. G:Sign Out (2 conditionals)
| Bubble Condition | Current Implementation | Status |
|-----------------|----------------------|--------|
| When "This Group is visible" | Always visible | ✅ Match |
| Hover → Background #CAC8C8 | CSS `:hover` state | ✅ Match |

**No changes needed**

---

## Supabase Fields & Tables Required

### Primary User Table: `user`

| Field | Purpose | Used For |
|-------|---------|----------|
| `_id` | User identifier | All queries |
| `Type - User Current` | User classification | Visibility logic |
| `Type - User Signup` | Original signup type | Fallback classification |
| `Proposals List` | JSONB array of proposal IDs | Proposals count |
| `Favorites - Listing` | JSONB array of listing IDs | Favorites count |
| `Account - Host / Landlord` | FK to host account | House manuals lookup |

### Related Tables for Counts

| Table | Field(s) | Query | Count Purpose |
|-------|----------|-------|---------------|
| `listing` | `_id`, `Created By` | `WHERE "Created By" = userId` | Listings count |
| `proposal` | `_id` | From user's `Proposals List` array | Proposals count |
| `visit` | `_id`, `Guest` | `WHERE "Guest" = userId` | Visits count |
| `virtualmeetingschedulesandlinks` | `_id`, `Guest`, `Host` | `WHERE Guest = userId OR Host = userId` | Virtual meetings count |
| `Booking - Lease` | `_id`, `Guest`, `Created By` | `WHERE Guest = userId OR "Created By" = userId` | Leases count |
| `message` | `_id`, `Recipient`, `Read` | `WHERE Recipient = userId AND Read = false` | Unread messages |
| `account_host` | `_id`, `House manuals` | `WHERE _id = user."Account - Host / Landlord"` | House manuals count |

### User Type Values (from `Type - User Current`)

| Raw Value | Normalized Constant |
|-----------|-------------------|
| `'A Guest (I would like to rent a space)'` | `GUEST` |
| `'A Host (I have a space available to rent)'` | `HOST` |
| `'Trial Host'` | `TRIAL_HOST` |
| `'Split Lease'` | `HOST` (internal users) |

---

## Implementation Tasks

### Phase 1: Update Visibility Logic

1. **Modify `getMenuVisibility()` in `useLoggedInAvatarData.js`**:
   ```javascript
   return {
     myProfile: true,
     myProposals: true,
     myProposalsSuggested: isHostOrTrial && proposalsCount < 1,  // NEW
     myListings: isHostOrTrial,
     virtualMeetings: proposalsCount === 0,  // Keep as-is or split by user type
     houseManualsAndVisits: isGuest ? visitsCount < 1 : houseManualsCount === 0,
     myLeases: true,  // Or add conditional based on count
     myFavoriteListings: isGuest && favoritesCount > 0,  // UPDATED
     messages: true,
     rentalApplication: isGuest,
     reviewsManager: true,
     referral: true
   };
   ```

### Phase 2: Verify Active Path Detection

2. **Check path matching in `LoggedInAvatar.jsx`**:
   - `profile` → My Profile
   - `guest-dashboard` → My Proposals
   - `host-overview` → My Listings
   - `favorite-listings` → My Favorite Listings
   - `rental-application` → Rental Application

### Phase 3: Add Missing Data Fetches

3. **Ensure all required counts are fetched**:
   - [x] User type
   - [x] Proposals count (from array length)
   - [x] Listings count
   - [x] Visits count
   - [x] Virtual meetings count
   - [x] Leases count
   - [x] Favorites count (from array length)
   - [x] Unread messages count
   - [x] House manuals count (secondary query)

---

## Questions to Clarify

1. **Proposals Suggested**: Should this menu item be enabled? Currently hardcoded to `false`.

2. **My Leases visibility**: Bubble shows special conditions for when leases = 0. Does this mean:
   - Hide the menu item entirely?
   - Show with different styling (grayed out)?
   - Show with "No leases yet" text?

3. **My Favorites**: Current implementation shows for all GUESTs. Bubble hides when favorites = 0. Which behavior is preferred?

4. **Virtual Meetings**: Current shows for ANY user with 0 proposals. Bubble explicitly mentions GUEST with 0 AND HOST with 0. Is the simplified version acceptable?

5. **Rental Application URL/HOST behavior**: Bubble shows different behavior when HOST views a URL containing "profile". What should happen in this case?

---

## Files to Modify

1. `app/src/islands/shared/LoggedInAvatar/useLoggedInAvatarData.js`
   - Update `getMenuVisibility()` function
   - Ensure all counts are available

2. `app/src/islands/shared/LoggedInAvatar/LoggedInAvatar.jsx`
   - Update menu item rendering to use new visibility rules
   - Verify active path matching

3. `app/src/islands/shared/LoggedInAvatar/LoggedInAvatar.css`
   - Verify hover states match #CAC8C8

---

## Testing Checklist

- [ ] Test as GUEST user with 0 proposals
- [ ] Test as GUEST user with >0 proposals
- [ ] Test as GUEST user with 0 favorites
- [ ] Test as GUEST user with >0 favorites
- [ ] Test as HOST user with 0 proposals
- [ ] Test as HOST user with >0 proposals
- [ ] Test as HOST user with 0 listings
- [ ] Test as HOST user with >0 listings
- [ ] Test as TRIAL_HOST user
- [ ] Verify hover states on all menu items
- [ ] Verify active state highlighting on all paths

---

## Summary

The current implementation is ~80% aligned with Bubble's conditional logic. Main gaps:

1. **Proposals Suggested** - Disabled, needs enabling with conditions
2. **My Favorites** - Missing check for favorites count > 0
3. **Active path verification** - Need to ensure all paths are correctly detected

All required Supabase fields and tables are already being queried. No new database queries needed.
