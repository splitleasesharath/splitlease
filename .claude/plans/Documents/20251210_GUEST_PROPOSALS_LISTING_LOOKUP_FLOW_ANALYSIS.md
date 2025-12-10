# Guest Proposals Page - Listing Lookup Flow Analysis

**GENERATED**: 2025-12-10
**STATUS**: Investigation Complete - Issue Identified
**PAGE_URL**: `/guest-proposals`

---

## Executive Summary

The Guest Proposals page has a specific issue: **"No listings available"**. This analysis traces the complete lookup flow from authentication to data display, identifying where the breakdown occurs.

---

## Complete Lookup Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        GUEST PROPOSALS PAGE LOAD                              │
│                     /guest-proposals or /guest-proposals?proposal=xxx         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 0: COMPONENT INITIALIZATION                                             │
│ File: app/src/islands/pages/GuestProposalsPage.jsx                          │
│                                                                              │
│ • Mounts from entry point: app/src/guest-proposals.jsx                      │
│ • Calls useGuestProposalsPageLogic() hook                                   │
│ • Renders LoadingState initially while authState.isChecking = true          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: AUTHENTICATION CHECK (TWO-STEP PATTERN)                              │
│ File: app/src/islands/pages/proposals/useGuestProposalsPageLogic.js:68-141  │
│                                                                              │
│ useEffect(() => {                                                           │
│   async function checkAuth() {                                              │
│     // 1a. Clean legacy URL patterns                                        │
│     cleanLegacyUserIdFromUrl();                                            │
│                                                                              │
│     // 1b. Step 1: Lightweight auth check                                   │
│     const isAuthenticated = await checkAuthStatus();                        │
│     if (!isAuthenticated) → redirect to '/'                                 │
│                                                                              │
│     // 1c. Step 2: Validate token AND fetch user data                       │
│     const userData = await validateTokenAndFetchUser();                     │
│     if (!userData) → redirect to '/'                                        │
│                                                                              │
│     // 1d. Check if user is Guest (not Host)                                │
│     const userType = userData.userType;                                     │
│     const isGuest = userType === 'Guest' || userType?.includes('Guest');    │
│     if (!isGuest) → redirect to '/'                                         │
│   }                                                                          │
│ }, []);                                                                       │
│                                                                              │
│ POTENTIAL ISSUES:                                                            │
│ ⚠️ If checkAuthStatus() returns false → empty page + redirect              │
│ ⚠️ If validateTokenAndFetchUser() fails → empty page + redirect            │
│ ⚠️ If userType is "Host" → redirect (user accessing wrong page)            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ (auth passes)
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 2: LOAD PROPOSALS (triggered by authState change)                       │
│ File: app/src/islands/pages/proposals/useGuestProposalsPageLogic.js:182-188 │
│                                                                              │
│ useEffect(() => {                                                           │
│   if (authState.isAuthenticated && authState.isGuest && !authState.isChecking) {
│     loadProposals();   ◄────── ENTRY POINT FOR DATA FETCHING               │
│   }                                                                          │
│ }, [authState.isAuthenticated, authState.isGuest, authState.isChecking]);   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 3: FETCH USER PROPOSALS FROM URL                                        │
│ File: app/src/lib/proposals/userProposalQueries.js:471-528                  │
│                                                                              │
│ async function fetchUserProposalsFromUrl() {                                │
│   // 3a. Get user ID from session (NOT URL)                                 │
│   const userId = getUserIdFromSession();                                    │
│   if (!userId) throw new Error('NOT_AUTHENTICATED'); ◄── CRITICAL CHECK    │
│   ...                                                                        │
│ }                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 3a: GET USER ID FROM SESSION                                            │
│ File: app/src/lib/proposals/urlParser.js:74-84                              │
│                                                                              │
│ function getUserIdFromSession() {                                           │
│   const userId = getSessionId();  ◄── Reads from localStorage              │
│   if (userId) {                                                             │
│     console.log('getUserIdFromSession: Got user ID from session');          │
│     return userId;                                                          │
│   }                                                                          │
│   console.log('getUserIdFromSession: No user ID in session');               │
│   return null;                                                              │
│ }                                                                            │
│                                                                              │
│ Storage Key: localStorage.getItem('__sl_sid__')                             │
│ File: app/src/lib/secureStorage.js:72-74                                    │
│                                                                              │
│ POTENTIAL ISSUE:                                                             │
│ ⚠️ If '__sl_sid__' is not set in localStorage → returns null               │
│ ⚠️ This would cause "NOT_AUTHENTICATED" error                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ (userId obtained)
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 4: FETCH USER WITH PROPOSALS LIST                                       │
│ File: app/src/lib/proposals/userProposalQueries.js:23-51                    │
│                                                                              │
│ async function fetchUserWithProposalList(userId) {                          │
│   const { data, error } = await supabase                                    │
│     .from('user')                                                           │
│     .select(`                                                               │
│       _id,                                                                  │
│       "Name - First",                                                       │
│       "Name - Last",                                                        │
│       "Name - Full",                                                        │
│       "Profile Photo",                                                      │
│       "email as text",                                                      │
│       "Proposals List"    ◄──────── KEY FIELD FOR PROPOSAL IDS             │
│     `)                                                                      │
│     .eq('_id', userId)                                                      │
│     .maybeSingle();                                                         │
│                                                                              │
│   if (error) → throw Error                                                  │
│   if (!data) → throw Error("User not found")                                │
│   return data;                                                              │
│ }                                                                            │
│                                                                              │
│ POTENTIAL ISSUES:                                                            │
│ ⚠️ If user._id doesn't exist in 'user' table → "User not found" error      │
│ ⚠️ If "Proposals List" is null/empty → returns user but no proposal IDs    │
│ ⚠️ RLS policies may block query if not configured for this userId          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 5: EXTRACT PROPOSAL IDS FROM USER                                       │
│ File: app/src/lib/proposals/userProposalQueries.js:58-86                    │
│                                                                              │
│ function extractProposalIds(user) {                                         │
│   const proposalsList = user['Proposals List'];                             │
│                                                                              │
│   if (!proposalsList) {                                                     │
│     console.warn('User has no Proposals List field');                       │
│     return [];  ◄──────── RETURNS EMPTY → SHOWS EMPTY STATE                │
│   }                                                                          │
│                                                                              │
│   // Handle JSONB array parsing                                             │
│   if (Array.isArray(proposalsList)) {                                       │
│     proposalIds = proposalsList;                                            │
│   } else if (typeof proposalsList === 'string') {                           │
│     proposalIds = JSON.parse(proposalsList);  // May fail                   │
│   }                                                                          │
│                                                                              │
│   return proposalIds;                                                       │
│ }                                                                            │
│                                                                              │
│ CRITICAL ISSUE - LIKELY ROOT CAUSE:                                          │
│ ❌ If user['Proposals List'] is null or empty → returns [] → NO PROPOSALS  │
│ ❌ This means listings will NEVER be fetched because no proposal IDs exist  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ (if proposalIds.length === 0)
┌─────────────────────────────────────────────────────────────────────────────┐
│ EARLY RETURN: NO PROPOSAL IDS                                                │
│ File: app/src/lib/proposals/userProposalQueries.js:485-492                  │
│                                                                              │
│ if (proposalIds.length === 0) {                                             │
│   console.log('User has no proposal IDs in their Proposals List');          │
│   return {                                                                  │
│     user,                                                                   │
│     proposals: [],     ◄──────── EMPTY PROPOSALS                           │
│     selectedProposal: null                                                  │
│   };                                                                        │
│ }                                                                            │
│                                                                              │
│ RESULT: Empty state shown → "No Proposals Yet" message                      │
│ NOTE: This is a data issue, not a code bug - the user simply has no        │
│ proposals in their "Proposals List" field                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ (if proposalIds.length > 0)
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 6: FETCH PROPOSALS BY IDS                                               │
│ File: app/src/lib/proposals/userProposalQueries.js:95-460                   │
│                                                                              │
│ async function fetchProposalsByIds(proposalIds) {                           │
│   // Step 6a: Fetch proposals from 'proposal' table                         │
│   const { data: proposals, error } = await supabase                         │
│     .from('proposal')                                                       │
│     .select(`_id, Status, Guest, Listing, ...`)                             │
│     .in('_id', proposalIds)                                                 │
│     .order('"Created Date"', { ascending: false });                         │
│                                                                              │
│   // Step 6b: Filter out deleted/cancelled proposals                        │
│   const validProposals = proposals.filter(p => {                            │
│     if (p.Deleted === true) return false;                                   │
│     if (p.Status === 'Proposal Cancelled by Guest') return false;           │
│     return true;                                                            │
│   });                                                                        │
│                                                                              │
│ POTENTIAL ISSUES:                                                            │
│ ⚠️ If proposal IDs don't exist in 'proposal' table → empty results         │
│ ⚠️ All proposals may be Deleted or Cancelled → no valid proposals          │
│ ⚠️ RLS policies may block access to proposals                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 7: FETCH LISTINGS FOR PROPOSALS                                         │
│ File: app/src/lib/proposals/userProposalQueries.js:172-204                  │
│                                                                              │
│ // Extract unique listing IDs from proposals                                │
│ const listingIds = [...new Set(                                             │
│   validProposals.map(p => p.Listing).filter(Boolean)                        │
│ )];                                                                          │
│                                                                              │
│ // Fetch listings                                                           │
│ const { data: listings, error } = await supabase                            │
│   .from('listing')                                                          │
│   .select(`                                                                 │
│     _id, Name, Description,                                                 │
│     "Location - Address", "Location - Borough", "Location - Hood",          │
│     "Features - Photos", "Features - House Rules",                          │
│     "Host / Landlord", "House manual"                                       │
│   `)                                                                        │
│   .in('_id', listingIds);                                                   │
│                                                                              │
│ POTENTIAL ISSUES:                                                            │
│ ⚠️ If proposal.Listing is null → listingIds is empty → no listings        │
│ ⚠️ If listing._id doesn't exist → listings fetch returns empty             │
│ ⚠️ RLS policies may block access to listings                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 8: FETCH RELATED DATA (PARALLEL)                                        │
│                                                                              │
│ 8a. Featured Photos:                                                        │
│     FROM: listing_photo                                                     │
│     WHERE: Listing IN (listingIds) AND toggleMainPhoto=true AND Active=true │
│                                                                              │
│ 8b. Boroughs:                                                               │
│     FROM: zat_geo_borough_toplevel                                          │
│     WHERE: _id IN (boroughIds)                                              │
│                                                                              │
│ 8c. Neighborhoods:                                                          │
│     FROM: zat_geo_hood_mediumlevel                                          │
│     WHERE: _id IN (hoodIds)                                                 │
│                                                                              │
│ 8d. House Rules:                                                            │
│     FROM: zat_features_houserule                                            │
│     WHERE: _id IN (houseRuleIds)                                            │
│                                                                              │
│ 8e. Hosts (via account_host → user):                                        │
│     FROM: user                                                              │
│     WHERE: "Account - Host / Landlord" IN (hostAccountIds)                  │
│                                                                              │
│ 8f. Guests:                                                                 │
│     FROM: user                                                              │
│     WHERE: _id IN (guestIds)                                                │
│                                                                              │
│ 8g. Virtual Meetings:                                                       │
│     FROM: virtualmeetingschedulesandlinks                                   │
│     WHERE: proposal IN (proposalIds)                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 9: ENRICH PROPOSALS (MANUAL JOINS)                                      │
│ File: app/src/lib/proposals/userProposalQueries.js:409-456                  │
│                                                                              │
│ const enrichedProposals = validProposals.map((proposal) => {                │
│   const listing = listingMap.get(proposal.Listing);                         │
│   const host = listing ? hostMap.get(listing['Host / Landlord']) : null;    │
│   const guest = guestMap.get(proposal.Guest);                               │
│   const boroughName = listing ? boroughMap.get(...) : null;                 │
│   const hoodName = listing ? hoodMap.get(...) : null;                       │
│   const featuredPhotoUrl = listing ? featuredPhotoMap.get(...) : null;      │
│   const virtualMeeting = vmMap.get(proposal._id) || null;                   │
│                                                                              │
│   return {                                                                  │
│     ...proposal,                                                            │
│     listing: listing ? {                                                    │
│       ...listing,                                                           │
│       host,           ◄──────── HOST DATA                                  │
│       boroughName,    ◄──────── RESOLVED BOROUGH NAME                      │
│       hoodName,       ◄──────── RESOLVED NEIGHBORHOOD NAME                 │
│       featuredPhotoUrl, ◄────── MAIN PHOTO URL                             │
│       hasHouseManual  ◄──────── HOUSE MANUAL FLAG                          │
│     } : null,         ◄──────── NULL IF LISTING NOT FOUND                  │
│     guest,                                                                  │
│     virtualMeeting,                                                         │
│     houseRules        ◄──────── RESOLVED HOUSE RULE NAMES                  │
│   };                                                                        │
│ });                                                                          │
│                                                                              │
│ CRITICAL: If listingMap.get(proposal.Listing) returns undefined,            │
│ the entire listing object will be null → "No listings available"            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 10: RETURN TO COMPONENT                                                 │
│                                                                              │
│ return {                                                                    │
│   user,                                                                     │
│   proposals: enrichedProposals,                                             │
│   selectedProposal: proposals[0] || null                                    │
│ };                                                                          │
│                                                                              │
│ Component receives:                                                         │
│ • proposals array (may have items with null listings)                       │
│ • selectedProposal (first proposal or null)                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Data Dependencies

### Storage Keys
| Key | Location | Purpose |
|-----|----------|---------|
| `__sl_sid__` | localStorage | User ID (session ID) |
| `__sl_at__` | localStorage | Auth token |
| `sl_user_type` | localStorage | "Host" or "Guest" |

### Database Tables Queried
| Table | Join Field | Data Retrieved |
|-------|------------|----------------|
| `user` | `_id` | User profile + "Proposals List" |
| `proposal` | `_id` IN proposalIds | Proposal details |
| `listing` | `_id` IN proposal.Listing | Listing details |
| `listing_photo` | `Listing` IN listingIds | Featured photos |
| `user` (hosts) | `Account - Host / Landlord` | Host profiles |
| `user` (guests) | `_id` IN proposal.Guest | Guest profiles |
| `zat_geo_borough_toplevel` | `_id` | Borough names |
| `zat_geo_hood_mediumlevel` | `_id` | Neighborhood names |
| `zat_features_houserule` | `_id` | House rule names |
| `virtualmeetingschedulesandlinks` | `proposal` | VM records |

---

## Potential Root Causes for "No Listings Available"

### 1. User Has No Proposals in "Proposals List" Field
**Location**: `user` table → `"Proposals List"` column
**Check**: Query user table to verify the field has proposal IDs

```sql
SELECT _id, "Name - Full", "Proposals List"
FROM "user"
WHERE _id = '<user_id_from_localStorage>';
```

### 2. Proposal.Listing is NULL or Invalid
**Location**: `proposal` table → `Listing` column
**Check**: Verify proposals have valid listing IDs

```sql
SELECT _id, "Status", "Listing"
FROM proposal
WHERE _id IN ('<proposal_ids>');
```

### 3. Listing Doesn't Exist in Database
**Location**: `listing` table → `_id` column
**Check**: Verify listing IDs exist in listing table

```sql
SELECT _id, "Name"
FROM listing
WHERE _id = '<listing_id_from_proposal>';
```

### 4. RLS (Row Level Security) Blocking Access
**Location**: Supabase RLS policies on `user`, `proposal`, or `listing` tables
**Check**: Review RLS policies for these tables

### 5. Session ID Mismatch
**Location**: localStorage `__sl_sid__` vs actual user ID
**Check**: Verify stored session ID matches authenticated user

---

## Investigation Checklist

### Browser DevTools Verification

1. **Check localStorage for session ID**:
   ```javascript
   localStorage.getItem('__sl_sid__')
   ```

2. **Check console logs** for:
   - `🔐 Guest Proposals: Checking authentication...`
   - `✅ Guest Proposals: User authenticated as Guest`
   - `getUserIdFromSession: Got user ID from session`
   - `fetchUserWithProposalList: User fetched: <name>`
   - `extractProposalIds: Extracted X proposal IDs`
   - `fetchProposalsByIds: Fetched X proposals`
   - `fetchProposalsByIds: Fetching X unique listings`

3. **If seeing "User has no Proposals List field"**:
   - The user's "Proposals List" is null/empty in database
   - This is a data issue, not a code bug

4. **If seeing "No valid proposals found"**:
   - All proposals are deleted or cancelled
   - Check proposal Status values

5. **Network Tab** - Check Supabase requests:
   - `POST /rest/v1/user` - Should return user with Proposals List
   - `POST /rest/v1/proposal` - Should return proposal records
   - `POST /rest/v1/listing` - Should return listing records

---

## Data Flow Summary

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  localStorage.__sl_sid__                                        │
│         │                                                        │
│         ▼                                                        │
│  user._id = <session_id>                                        │
│         │                                                        │
│         ▼                                                        │
│  user."Proposals List" = ["prop_id_1", "prop_id_2", ...]       │
│         │                                                        │
│         ▼                                                        │
│  proposal._id IN (proposalIds)                                  │
│  proposal.Listing = <listing_id>                                │
│         │                                                        │
│         ▼                                                        │
│  listing._id = <listing_id>                                     │
│  listing."Host / Landlord" = <host_account_id>                  │
│         │                                                        │
│         ▼                                                        │
│  Enriched proposal with:                                        │
│  - listing details                                              │
│  - host profile                                                 │
│  - featured photo                                               │
│  - borough/neighborhood names                                   │
│  - virtual meeting data                                         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Files Referenced

| File | Line Numbers | Purpose |
|------|--------------|---------|
| `app/src/guest-proposals.jsx` | - | Entry point |
| `app/src/islands/pages/GuestProposalsPage.jsx` | 1-181 | Page component |
| `app/src/islands/pages/proposals/useGuestProposalsPageLogic.js` | 1-301 | Logic hook |
| `app/src/lib/proposals/userProposalQueries.js` | 1-529 | Data fetching |
| `app/src/lib/proposals/urlParser.js` | 1-130 | URL parsing + session |
| `app/src/lib/secureStorage.js` | 1-307 | Token storage |
| `app/src/lib/auth.js` | - | Authentication |

---

**VERSION**: 1.0
**ANALYSIS_TYPE**: Data Flow Investigation
**ISSUE**: "No listings available" on Guest Proposals page
