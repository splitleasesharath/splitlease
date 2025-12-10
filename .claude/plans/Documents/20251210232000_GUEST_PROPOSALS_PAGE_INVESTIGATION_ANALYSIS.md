# Guest Proposals Page - Implementation Investigation Analysis

**GENERATED**: 2025-12-10
**STATUS**: Comprehensive Analysis Complete

---

## Executive Summary

The Guest Proposals page (`/guest-proposals`) retrieves and displays proposal listings for authenticated guest users through a session-based authentication system combined with a multi-step data fetching pipeline that queries the user's "Proposals List" array and enriches the data with related listings, hosts, guests, and virtual meetings.

---

## Architecture Overview

### Component Hierarchy

```
guest-proposals.jsx (Entry Point)
    │
    └── GuestProposalsPage.jsx (Hollow Component)
            │
            ├── useGuestProposalsPageLogic.js (Business Logic Hook)
            │       ├── Authentication: checkAuthStatus() + validateTokenAndFetchUser()
            │       ├── Data Fetching: fetchUserProposalsFromUrl()
            │       ├── State Management: user, proposals, selectedProposal
            │       └── Derived Data: transformedProposal, statusConfig, buttonConfig
            │
            └── UI Components
                ├── ProposalSelector.jsx (Dropdown)
                ├── ProposalCard.jsx (Main Display)
                └── VirtualMeetingsSection.jsx (Active VMs)
```

### File Inventory

| File | Purpose |
|------|---------|
| `app/src/guest-proposals.jsx` | Entry point, mounts React to #root |
| `app/src/islands/pages/GuestProposalsPage.jsx` | Hollow component (JSX only) |
| `app/src/islands/pages/proposals/useGuestProposalsPageLogic.js` | All business logic |
| `app/src/lib/proposals/userProposalQueries.js` | Supabase data fetching |
| `app/src/lib/proposals/urlParser.js` | URL parameter parsing |
| `app/src/lib/proposals/dataTransformers.js` | Data normalization |
| `app/src/lib/proposals/statusButtonConfig.js` | Button configuration cache |

---

## Proposal Listing Retrieval Process

### Complete Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. AUTHENTICATION                                               │
│    checkAuthStatus() → validateTokenAndFetchUser()              │
│    ├── Token invalid → redirect to /                            │
│    ├── Not Guest → redirect to /                                │
│    └── Valid Guest → proceed to data loading                    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. GET USER ID FROM SESSION                                     │
│    getUserIdFromSession() → getSessionId()                      │
│    User ID comes from secure storage, NOT from URL              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. FETCH USER WITH PROPOSALS LIST                               │
│    fetchUserWithProposalList(userId)                            │
│    SELECT _id, "Name - First", "Proposals List" FROM user       │
│    WHERE _id = {userId}                                         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. EXTRACT PROPOSAL IDS                                         │
│    extractProposalIds(user)                                     │
│    Parse "Proposals List" JSONB array → Array of proposal IDs   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. FETCH PROPOSALS BY IDS                                       │
│    fetchProposalsByIds(proposalIds)                             │
│    SELECT * FROM proposal WHERE _id IN ({proposalIds})          │
│    ORDER BY "Created Date" DESC                                 │
│                                                                 │
│    FILTERING:                                                   │
│    - Exclude Deleted = true                                     │
│    - Exclude Status = 'Proposal Cancelled by Guest'             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. ENRICH WITH RELATED DATA (Batch Queries)                     │
│    ├── Listings: FROM listing WHERE _id IN ({listing_ids})      │
│    ├── Featured Photos: FROM listing_photo WHERE Listing IN     │
│    ├── Boroughs: FROM zat_geo_borough_toplevel                  │
│    ├── Neighborhoods: FROM zat_geo_hood_mediumlevel             │
│    ├── House Rules: FROM zat_features_houserule                 │
│    ├── Hosts: FROM user WHERE "Account - Host" IN               │
│    ├── Guests: FROM user WHERE _id IN                           │
│    └── Virtual Meetings: FROM virtualmeetingschedulesandlinks   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. MANUAL JOINS & RETURN                                        │
│    Create Map lookups for efficient joining                     │
│    Return { user, proposals[], selectedProposal }               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Implementation Details

### 1. Authentication (Two-Step Pattern)

**Location**: `useGuestProposalsPageLogic.js:68-141`

```javascript
// Step 1: Lightweight auth check (tokens/cookies exist)
const isAuthenticated = await checkAuthStatus();

// Step 2: Validate token AND fetch user data (including userType)
const userData = await validateTokenAndFetchUser();

// Check if user is a Guest (not a Host)
const userType = userData.userType;
const isGuest = userType === 'Guest' || userType?.includes('Guest');
```

**Key Point**: User type comes from the validated response, NOT from synchronous storage read. This prevents a race condition where `getUserType()` was called before user data was cached.

---

### 2. Session-Based User ID

**Location**: `urlParser.js:74-84`

```javascript
export function getUserIdFromSession() {
  const userId = getSessionId();

  if (userId) {
    console.log('getUserIdFromSession: Got user ID from session');
    return userId;
  }

  return null;
}
```

**Important**: User ID is extracted from `secureStorage.js` (encrypted session storage), NOT from URL parameters. Legacy URL patterns with user ID in path are automatically cleaned.

---

### 3. Proposals List Approach

**Location**: `userProposalQueries.js:23-86`

The user table has a `"Proposals List"` JSONB column containing an array of proposal IDs:

```javascript
// Fetch user with their proposal IDs list
const { data, error } = await supabase
  .from('user')
  .select(`_id, "Name - First", "Proposals List"`)
  .eq('_id', userId)
  .maybeSingle();

// Extract proposal IDs from JSONB array
let proposalIds = [];
if (Array.isArray(proposalsList)) {
  proposalIds = proposalsList;
} else if (typeof proposalsList === 'string') {
  proposalIds = JSON.parse(proposalsList);
}
```

---

### 4. Proposal Fetching with Filtering

**Location**: `userProposalQueries.js:95-170`

```javascript
const { data: proposals, error } = await supabase
  .from('proposal')
  .select(`
    _id, "Status", "Deleted", "Guest", "Listing",
    "Days Selected", "Nights Selected (Nights list)",
    "Reservation Span (Weeks)", "Move in range start", "Move in range end",
    "Total Price for Reservation (guest)", "proposal nightly price",
    "cleaning fee", "damage deposit", "counter offer happened",
    "hc days selected", "hc reservation span (weeks)",
    "hc total price", "hc nightly price", "Created Date", "Modified Date",
    "virtual meeting", "House Rules", ...
  `)
  .in('_id', proposalIds)
  .order('"Created Date"', { ascending: false });

// Filter out deleted and cancelled proposals
const validProposals = proposals.filter(p => {
  if (p.Deleted === true) return false;
  if (p.Status === 'Proposal Cancelled by Guest') return false;
  return true;
});
```

---

### 5. Multi-Table Enrichment

**Location**: `userProposalQueries.js:172-456`

The function performs sequential batch queries to enrich proposals:

| Step | Table | Purpose |
|------|-------|---------|
| 3 | `listing` | Property details |
| 3.25 | `listing_photo` | Featured photos (`toggleMainPhoto = true`) |
| 3.5 | `zat_geo_borough_toplevel` | Borough display names |
| 3.5 | `zat_geo_hood_mediumlevel` | Neighborhood display names |
| 3.6 | `zat_features_houserule` | House rule names |
| 4 | `user` (hosts) | Host profiles via `Account - Host / Landlord` |
| 5.5 | `user` (guests) | Guest profiles |
| 6 | `virtualmeetingschedulesandlinks` | Virtual meeting data |

**Map-Based Joins**:
```javascript
// Create lookup maps for efficient joining
const listingMap = new Map(listings.map(l => [l._id, l]));
const hostMap = new Map(hosts.map(h => [h['Account - Host / Landlord'], h]));
const guestMap = new Map(guests.map(g => [g._id, g]));
const boroughMap = new Map(boroughs.map(b => [b._id, b['Display Borough']]));
const hoodMap = new Map(hoods.map(h => [h._id, h['Display']]));
const featuredPhotoMap = new Map(featuredPhotos.map(p => [p.Listing, p.Photo]));
const houseRulesMap = new Map(houseRules.map(r => [r._id, r.Name]));
const vmMap = new Map(virtualMeetings.map(vm => [vm.proposal, vm]));

// Enrich each proposal
const enrichedProposals = validProposals.map((proposal) => {
  const listing = listingMap.get(proposal.Listing);
  const host = listing ? hostMap.get(listing['Host / Landlord']) : null;
  const guest = guestMap.get(proposal.Guest);
  const virtualMeeting = vmMap.get(proposal._id) || null;
  // ... more enrichment
  return { ...proposal, listing, guest, virtualMeeting, houseRules };
});
```

---

### 6. Pre-Selection Logic

**Location**: `userProposalQueries.js:507-520`

```javascript
// Check for preselected proposal from URL query param
const preselectedId = getProposalIdFromQuery();  // ?proposal={id}
let selectedProposal = null;

if (preselectedId) {
  selectedProposal = proposals.find(p => p._id === preselectedId);
  if (!selectedProposal) {
    // Fallback to first proposal if preselected not found
    selectedProposal = proposals[0] || null;
  }
} else {
  // Default to first proposal
  selectedProposal = proposals[0] || null;
}
```

---

### 7. Data Transformation

**Location**: `dataTransformers.js:141-190`

Raw Supabase data is transformed for UI consumption:

```javascript
export function transformProposalData(rawProposal) {
  return {
    id: rawProposal._id,
    status: rawProposal.Status,
    daysSelected: rawProposal['Days Selected'],
    nightsSelected: rawProposal['Nights Selected (Nights list)'],
    reservationWeeks: rawProposal['Reservation Span (Weeks)'],
    moveInStart: rawProposal['Move in range start'],
    totalPrice: rawProposal['Total Price for Reservation (guest)'],
    nightlyPrice: rawProposal['proposal nightly price'],
    cleaningFee: rawProposal['cleaning fee'],
    damageDeposit: rawProposal['damage deposit'],
    counterOfferHappened: rawProposal['counter offer happened'],
    hcDaysSelected: rawProposal['hc days selected'],
    hcTotalPrice: rawProposal['hc total price'],
    houseRules: rawProposal.houseRules || [],
    listing: transformListingData(rawProposal.listing),
    host: transformHostData(rawProposal.listing?.host),
    guest: transformGuestData(rawProposal.guest),
    virtualMeeting: transformVirtualMeetingData(rawProposal.virtualMeeting)
  };
}
```

---

## Display Flow

### Proposal Selector Dropdown

```javascript
// Generate dropdown options
const proposalOptions = proposals.map(p => ({
  id: p._id,
  label: getProposalDisplayText(transformProposalData(p))  // "Host - Listing Name"
}));

// Handle selection change
const handleProposalSelect = (proposalId) => {
  const proposal = proposals.find(p => p._id === proposalId);
  if (proposal) {
    setSelectedProposal(proposal);
    updateUrlWithProposal(proposalId);  // Update URL without reload
  }
};
```

### ProposalCard Rendering

The selected proposal is displayed in `ProposalCard.jsx` with:
- Status banner (dynamic color based on status)
- Two-column layout (details + photo)
- Day badges (converted from Bubble 1-indexed to display 0-indexed)
- Pricing bar (nightly, 4-week, fee, deposit)
- Action buttons (VM, edit, cancel based on status)
- Progress tracker (6 stages)

---

## Database Tables Involved

### Primary Tables

| Table | Purpose |
|-------|---------|
| `user` | User data with "Proposals List" JSONB array |
| `proposal` | Main proposal records |
| `listing` | Property listings |
| `listing_photo` | Photos with featured flag |
| `virtualmeetingschedulesandlinks` | Virtual meeting records |

### Lookup Tables

| Table | Purpose |
|-------|---------|
| `zat_geo_borough_toplevel` | Borough display names |
| `zat_geo_hood_mediumlevel` | Neighborhood display names |
| `zat_features_houserule` | House rule names |

---

## Key Fields Retrieved

### From `proposal` Table

- `_id`, `Status`, `Deleted`, `Guest`, `Listing`
- `Days Selected`, `Nights Selected (Nights list)`
- `Reservation Span (Weeks)`, `nights per week (num)`
- `Move in range start`, `Move in range end`
- `Total Price for Reservation (guest)`, `proposal nightly price`
- `cleaning fee`, `damage deposit`
- `counter offer happened`, `hc days selected`, `hc total price`
- `virtual meeting`, `House Rules`
- `rental application`, `Is Finalized`

### From `listing` Table

- `_id`, `Name`, `Description`
- `Location - Address` (JSONB with lat/lng)
- `Location - Borough`, `Location - Hood`
- `Host / Landlord` (FK to account_host)
- `House manual` (boolean for house manual availability)

---

## Error Handling

| Error Scenario | Handler |
|----------------|---------|
| Not authenticated | Redirect to `/` |
| Token invalid | Redirect to `/` |
| Not Guest user type | Redirect to `/` |
| User not found | Throw "User with ID not found" |
| No proposals | Show EmptyState component |
| Fetch error | Show ErrorState with retry button |
| Orphaned proposal IDs | Log warning, continue with valid proposals |

---

## Performance Considerations

1. **Batch Queries**: All related data fetched in batch queries, not N+1
2. **Map-Based Joins**: O(1) lookups instead of O(n) array searches
3. **Filtering at Source**: Deleted/cancelled proposals filtered in query layer
4. **Parallel Fetching**: Status configurations fetched in parallel with proposals
5. **Caching**: Status button config cached after first fetch

---

## Key Files Reference

| Path | Line Numbers | Purpose |
|------|--------------|---------|
| `useGuestProposalsPageLogic.js` | 68-141 | Authentication check |
| `useGuestProposalsPageLogic.js` | 150-178 | Data loading |
| `userProposalQueries.js` | 23-51 | Fetch user with proposals list |
| `userProposalQueries.js` | 59-86 | Extract proposal IDs |
| `userProposalQueries.js` | 95-460 | Fetch and enrich proposals |
| `userProposalQueries.js` | 471-528 | Main orchestration function |
| `urlParser.js` | 74-84 | Get user ID from session |
| `dataTransformers.js` | 141-190 | Transform proposal data |

---

**VERSION**: 1.0
**ANALYSIS_SCOPE**: Complete data retrieval and display pipeline
