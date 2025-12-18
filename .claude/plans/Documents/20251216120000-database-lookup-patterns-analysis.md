# Database Lookup Patterns Analysis: Listings, Users, and Proposals

**Generated**: 2025-12-16
**Purpose**: Document all current database lookup patterns for listings, users, and proposals tables
**Focus**: Identifying multi-step lookups that could potentially use foreign key relations

---

## Executive Summary

The codebase uses a **multi-step lookup pattern** extensively rather than foreign key joins. This is primarily due to:

1. **Legacy Bubble.io architecture** - Data was originally designed for Bubble's data model
2. **Reference table separation** - Many lookup tables are in `reference_table` schema
3. **Complex relationships** - `account_host` intermediary table between listings and users
4. **JSONB arrays** - Many relationships stored as arrays of IDs rather than proper foreign keys

---

## 1. Frontend Data Fetching Files

### `app/src/lib/dataLookups.js`
**Purpose**: Cached lookups for reference data (neighborhoods, boroughs, property types, amenities, etc.)

**Pattern**: Pre-load all reference data into memory on app startup

```javascript
// Initialization - fetches ALL reference data in parallel
async function initializeLookups() {
  await Promise.all([
    initializeBoroughLookups(),      // reference_table.zat_geo_borough_toplevel
    initializeNeighborhoodLookups(), // reference_table.zat_geo_hood_mediumlevel
    initializePropertyTypeLookups(), // reference_table.zat_geo_listingtype
    initializeAmenityLookups(),      // public.zat_features_amenity
    initializeSafetyLookups(),       // public.zat_features_safety
    initializeHouseRuleLookups(),    // reference_table.zat_features_houserule
    initializeParkingLookups(),      // reference_table.zat_features_parking
    initializeCancellationPolicyLookups(), // reference_table.zat_cancellationpolicy
    initializeStorageLookups()       // reference_table.zat_features_securestoreoption
  ]);
}
```

**Tables Queried**:
- `reference_table.zat_geo_borough_toplevel` - `_id, "Display Borough"`
- `reference_table.zat_geo_hood_mediumlevel` - `_id, Display`
- `reference_table.zat_geo_listingtype` - `_id, "Label "`
- `public.zat_features_amenity` - `_id, Name, Icon`
- `public.zat_features_safety` - `_id, Name, Icon`
- `reference_table.zat_features_houserule` - `_id, Name, Icon`
- `reference_table.zat_features_parking` - `_id, Label`
- `reference_table.zat_cancellationpolicy` - `_id, Display, text fields...`
- `reference_table.zat_features_securestoreoption` - `_id, Title, "Summary - Guest"`

---

### `app/src/lib/listingDataFetcher.js`
**Purpose**: Fetch complete listing data with all enrichments

**Multi-Step Pattern**:

```javascript
export async function fetchListingComplete(listingId) {
  // Step 1: Fetch listing
  const { data: listingData } = await supabase
    .from('listing')
    .select('* (50+ fields)')
    .eq('_id', listingId)
    .single();

  // Step 2: Fetch photos (if legacy format - IDs not embedded objects)
  const { data: photosData } = await supabase
    .from('listing_photo')
    .select('_id, Photo, "Photo (thumbnail)", SortOrder, toggleMainPhoto, Caption')
    .eq('Listing', listingId);

  // Step 3: Resolve geographic data via cache (NOT joins)
  const resolvedNeighborhood = getNeighborhoodName(listingData['Location - Hood']);
  const resolvedBorough = getBoroughName(listingData['Location - Borough']);

  // Step 4: Resolve amenities via cache (NOT joins)
  const amenitiesInUnit = getAmenities(parseJsonField(listingData['Features - Amenities In-Unit']));

  // Step 5: Fetch host data - SEPARATE QUERY via account_host FK
  if (listingData['Host / Landlord']) {
    const { data: userData } = await supabase
      .from('user')
      .select('_id, "Name - First", "Name - Last", "Profile Photo", ...')
      .filter('"Account - Host / Landlord"', 'eq', listingData['Host / Landlord'])
      .maybeSingle();
  }

  // Step 6: Fetch reviews (IDs stored as JSONB array)
  const reviewIds = parseJsonField(listingData.Reviews);
  if (reviewIds.length > 0) {
    const { data: reviews } = await supabase
      .from('mainreview')
      .select('...')
      .in('_id', reviewIds);
  }
}
```

**Key Observations**:
- Host lookup requires filtering by `"Account - Host / Landlord"` field, not a direct FK
- Photos are separate table with `Listing` FK
- Reviews are stored as JSONB array of IDs, requiring `.in()` query

---

### `app/src/lib/proposalDataFetcher.js`
**Purpose**: Fetch proposal data with related entities

**Multi-Step Pattern**:

```javascript
export async function fetchProposalsByGuest(userId) {
  // Step 1: Get user's Proposals List (array of IDs)
  const { data: userData } = await supabase
    .from('user')
    .select('"Proposals List"')
    .eq('_id', userId)
    .single();

  const proposalIds = userData?.['Proposals List'];

  // Step 2: Fetch proposals by IDs
  const { data: proposalsData } = await supabase
    .from('proposal')
    .select('*')
    .in('_id', proposalIds);
}

export async function loadProposalDetails(proposal) {
  // Step 1: Load listing
  if (proposal.Listing) {
    const { data: listingData } = await supabase
      .from('listing')
      .select('*')
      .eq('_id', proposal.Listing)
      .single();
  }

  // Step 2: Load guest user
  if (proposal.Guest) {
    const { data: guestData } = await supabase
      .from('user')
      .select('...')
      .eq('_id', proposal.Guest)
      .single();
  }

  // Step 3: Load host user (via listing.Created By)
  if (enrichedProposal._listing?.['Created By']) {
    const { data: hostData } = await supabase
      .from('user')
      .select('...')
      .eq('_id', enrichedProposal._listing['Created By'])
      .single();
  }

  // Step 4: Load house rules
  if (proposal['House Rules']?.length > 0) {
    const { data: rulesData } = await supabase
      .schema('reference_table')
      .from('zat_features_houserule')
      .select('_id, Name, Icon')
      .in('_id', proposal['House Rules']);
  }

  // Step 5: Load virtual meeting
  if (proposal['virtual meeting']) {
    const { data: vmData } = await supabase
      .from('virtualmeetingschedulesandlinks')
      .select('*')
      .eq('_id', proposal['virtual meeting'])
      .single();
  }
}
```

---

### `app/src/lib/proposals/userProposalQueries.js`
**Purpose**: Comprehensive proposal fetching with nested data

**Multi-Step Pattern (Most Complex)**:

```javascript
export async function fetchProposalsByIds(proposalIds) {
  // Step 1: Fetch proposals
  const { data: proposals } = await supabase
    .from('proposal')
    .select('... 25+ fields')
    .in('_id', proposalIds);

  // Step 2: Extract unique listing IDs
  const listingIds = [...new Set(proposals.map(p => p.Listing).filter(Boolean))];

  // Step 3: Fetch all listings
  const { data: listings } = await supabase
    .from('listing')
    .select('_id, Name, Description, ...')
    .in('_id', listingIds);

  // Step 3.5: Extract photos (embedded or legacy)
  // ... fetch from listing_photo if needed

  // Step 4: Fetch boroughs and neighborhoods
  const boroughIds = [...new Set(listings.map(l => l['Location - Borough']))];
  const hoodIds = [...new Set(listings.map(l => l['Location - Hood']))];

  const { data: boroughs } = await supabase
    .schema('reference_table')
    .from('zat_geo_borough_toplevel')
    .select('_id, "Display Borough"')
    .in('_id', boroughIds);

  const { data: hoods } = await supabase
    .schema('reference_table')
    .from('zat_geo_hood_mediumlevel')
    .select('_id, "Display"')
    .in('_id', hoodIds);

  // Step 5: Fetch house rules
  const allHouseRuleIds = [...new Set(proposals.flatMap(p => p['House Rules']))];
  const { data: houseRules } = await supabase
    .schema('reference_table')
    .from('zat_features_houserule')
    .select('_id, "Name"')
    .in('_id', allHouseRuleIds);

  // Step 6: Fetch hosts via Account - Host / Landlord
  const hostAccountIds = [...new Set(listings.map(l => l['Host / Landlord']))];
  const { data: hosts } = await supabase
    .from('user')
    .select('...')
    .in('"Account - Host / Landlord"', hostAccountIds);

  // Step 7: Fetch guests
  const guestIds = [...new Set(proposals.map(p => p.Guest))];
  const { data: guests } = await supabase
    .from('user')
    .select('...')
    .in('_id', guestIds);

  // Step 8: Fetch virtual meetings
  const { data: virtualMeetings } = await supabase
    .from('virtualmeetingschedulesandlinks')
    .select('...')
    .in('proposal', proposalIds);

  // Step 9: Manual JOIN via Maps
  const listingMap = new Map(listings.map(l => [l._id, l]));
  const hostMap = new Map(hosts.map(h => [h['Account - Host / Landlord'], h]));
  const guestMap = new Map(guests.map(g => [g._id, g]));
  // ... more maps for boroughs, hoods, photos, house rules, virtual meetings

  // Step 10: Enrich proposals with related data
  return proposals.map(proposal => ({
    ...proposal,
    listing: listingMap.get(proposal.Listing),
    guest: guestMap.get(proposal.Guest),
    // etc.
  }));
}
```

---

### `app/src/lib/supabaseUtils.js`
**Purpose**: Shared utilities for batch data fetching

**Key Functions**:

```javascript
// Fetch photos by IDs from listing_photo table
export async function fetchPhotoUrls(photoIds) {
  const { data } = await supabase
    .from('listing_photo')
    .select('_id, Photo')
    .in('_id', photoIds);
}

// Fetch host data via account_host intermediary
export async function fetchHostData(hostIds) {
  // Step 1: Fetch account_host records
  const { data: accountHostData } = await supabase
    .from('account_host')
    .select('_id, User')
    .in('_id', hostIds);

  // Step 2: Collect user IDs
  const userIds = accountHostData.map(a => a.User);

  // Step 3: Fetch user records
  const { data: userData } = await supabase
    .from('user')
    .select('_id, "Name - Full", "Profile Photo"')
    .in('_id', userIds);

  // Step 4: Create maps and return keyed by account_host ID
}
```

---

### `app/src/lib/listingService.js`
**Purpose**: Listing CRUD operations

**Multi-Step Pattern (linkListingToHost)**:

```javascript
async function linkListingToHost(userId, listingId) {
  // Step 1: Get current Listings array
  const { data: userData } = await supabase
    .from('user')
    .select('_id, Listings')
    .eq('_id', userId)
    .maybeSingle();

  // Step 2: Add listing ID to array
  const currentListings = userData.Listings || [];
  currentListings.push(listingId);

  // Step 3: Update user
  await supabase
    .from('user')
    .update({ Listings: currentListings })
    .eq('_id', userData._id);
}
```

---

## 2. Edge Functions Data Fetching

### `supabase/functions/proposal/actions/get.ts`
**Multi-Step Pattern**:

```typescript
export async function handleGet(payload, supabase) {
  // Step 1: Fetch proposal
  const { data: proposal } = await supabase
    .from("proposal")
    .select("*")
    .eq("_id", proposalId)
    .single();

  // Step 2: Fetch listing
  const { data: listing } = await supabase
    .from("listing")
    .select('_id, Name, "Location - Address"')
    .eq("_id", proposal.Listing)
    .single();

  // Step 3: Fetch guest
  const { data: guest } = await supabase
    .from("user")
    .select('_id, "Name - Full", email')
    .eq("_id", proposal.Guest)
    .single();

  // Step 4: Fetch host (via account_host)
  const { data: hostAccount } = await supabase
    .from("account_host")
    .select("User")
    .eq("_id", proposal["Host - Account"])
    .single();

  const { data: host } = await supabase
    .from("user")
    .select('_id, "Name - Full", email')
    .eq("_id", hostAccount.User)
    .single();
}
```

---

### `supabase/functions/proposal/actions/create.ts`
**Multi-Step Pattern (6 separate queries)**:

```typescript
export async function handleCreate(payload, user, supabase) {
  // Step 1: Fetch Listing
  const { data: listing } = await supabase
    .from("listing")
    .select('_id, "Host / Landlord", "rental type", pricing fields...')
    .eq("_id", input.listingId)
    .single();

  // Step 2: Fetch Guest User
  const { data: guest } = await supabase
    .from("user")
    .select('_id, email, "Rental Application", "Proposals List", "Favorited Listings"...')
    .eq("_id", input.guestId)
    .single();

  // Step 3: Fetch Host Account
  const { data: hostAccount } = await supabase
    .from("account_host")
    .select("_id, User")
    .eq("_id", listing["Host / Landlord"])
    .single();

  // Step 4: Fetch Host User
  const { data: hostUser } = await supabase
    .from("user")
    .select('_id, email, "Proposals List"')
    .eq("_id", hostAccount.User)
    .single();

  // Step 5: Fetch Rental Application (if exists)
  if (guest["Rental Application"]) {
    const { data: app } = await supabase
      .from("rentalapplication")
      .select("_id, submitted")
      .eq("_id", guest["Rental Application"])
      .single();
  }
}
```

---

### `supabase/functions/messages/handlers/getThreads.ts`
**Multi-Step Pattern with Batch Processing**:

```typescript
export async function handleGetThreads(supabaseAdmin, payload, user) {
  // Step 1: Get user's Bubble ID from email
  const { data: userData } = await supabaseAdmin
    .from('user')
    .select('_id, "User Type"')
    .ilike('email', user.email)
    .single();

  // Step 2: Query thread_conversation
  const { data: threads } = await supabaseAdmin
    .from('thread_conversation')
    .select('_id, host, guest, proposal, listing, "last message"...')
    .or(`host.eq.${userBubbleId},guest.eq.${userBubbleId}`);

  // Step 3: Batch fetch contact user data
  const contactIds = new Set();
  threads.forEach(thread => {
    const contactId = thread.host === userBubbleId ? thread.guest : thread.host;
    if (contactId) contactIds.add(contactId);
  });

  const { data: contacts } = await supabaseAdmin
    .from('user')
    .select('_id, "First Name", "Last Name", "Profile Photo"')
    .in('_id', Array.from(contactIds));

  // Step 4: Batch fetch listing data
  const listingIds = new Set();
  threads.forEach(thread => {
    if (thread.listing) listingIds.add(thread.listing);
  });

  const { data: listings } = await supabaseAdmin
    .from('listing')
    .select('_id, Name')
    .in('_id', Array.from(listingIds));

  // Step 5: Fetch unread message counts
  const { data: unreadMessages } = await supabaseAdmin
    .from('message')
    .select('thread_conversation, unread_users')
    .in('thread_conversation', threadIds);

  // Step 6: Manual JOIN via Maps
}
```

---

### `supabase/functions/listing/handlers/get.ts`
**Direct Bubble API Call** (not Supabase):

```typescript
export async function handleGet(payload) {
  const syncService = new BubbleSyncService(...);
  const listingData = await syncService.fetchBubbleObject('Listing', listing_id);
}
```

---

## 3. Search Page Logic (`useSearchPageLogic.js`)

**Multi-Step Pattern for Listing Enrichment**:

```javascript
const fetchListings = useCallback(async () => {
  // Step 1: Query listings
  const { data } = await supabase
    .from('listing')
    .select('*')
    .eq(...filters);

  // Step 2: Batch collect photo IDs from Features - Photos field
  const allPhotoIds = new Set();
  data.forEach(listing => {
    const photosField = listing['Features - Photos'];
    // Parse JSONB array...
    parsed.forEach(id => allPhotoIds.add(id));
  });

  // Step 3: Fetch all photos
  const photoMap = await fetchPhotoUrls(Array.from(allPhotoIds));

  // Step 4: Batch collect host IDs
  const hostIds = new Set();
  data.forEach(listing => {
    if (listing['Host / Landlord']) {
      hostIds.add(listing['Host / Landlord']);
    }
  });

  // Step 5: Fetch all hosts (via account_host -> user)
  const hostMap = await fetchHostData(Array.from(hostIds));

  // Step 6: Transform and enrich listings
  const transformedListings = data.map(listing =>
    transformListing(listing, resolvedPhotos[listing._id], resolvedHosts[listing._id])
  );
});
```

---

## 4. Summary of Current Patterns

### Tables Commonly Queried Together

| Primary Table | Related Tables | Lookup Method |
|--------------|----------------|---------------|
| `proposal` | `listing`, `user` (guest), `user` (host via account_host), `virtualmeetingschedulesandlinks`, `rentalapplication` | Multiple `.eq()` queries |
| `listing` | `user` (host), `listing_photo`, `mainreview` | Filter by FK field, `.in()` for arrays |
| `user` | `account_host`, `proposal` (via Proposals List array) | `.eq()` or `.in()` |
| `thread_conversation` | `user` (host), `user` (guest), `listing`, `message` | Multiple `.in()` queries |

### Key Relationship Fields

| Table | Field | Contains | Type |
|-------|-------|----------|------|
| `listing` | `Host / Landlord` | `account_host._id` | Text FK |
| `listing` | `Features - Photos` | Array of photo IDs or embedded objects | JSONB |
| `listing` | `Reviews` | Array of `mainreview._id` | JSONB |
| `listing` | `Location - Hood` | `zat_geo_hood_mediumlevel._id` | Text FK |
| `listing` | `Location - Borough` | `zat_geo_borough_toplevel._id` | Text FK |
| `proposal` | `Listing` | `listing._id` | Text FK |
| `proposal` | `Guest` | `user._id` | Text FK |
| `proposal` | `Host - Account` | `account_host._id` | Text FK |
| `proposal` | `House Rules` | Array of `zat_features_houserule._id` | JSONB |
| `user` | `Account - Host / Landlord` | `account_host._id` | Text FK |
| `user` | `Proposals List` | Array of `proposal._id` | text[] |
| `user` | `Listings` | Array of `listing._id` | JSONB |
| `user` | `Favorited Listings` | Array of `listing._id` | JSONB |
| `account_host` | `User` | `user._id` | Text FK |

---

## 5. Opportunities for Foreign Key Relations

### Potential Join Candidates

1. **proposal -> listing**
   - Current: Separate query `supabase.from('listing').eq('_id', proposal.Listing)`
   - Could be: `supabase.from('proposal').select('*, listing(*)')`
   - **Blocker**: FK must be defined in database

2. **proposal -> user (guest)**
   - Current: Separate query `supabase.from('user').eq('_id', proposal.Guest)`
   - Could be: `supabase.from('proposal').select('*, guest:user!Guest(*)')`
   - **Blocker**: FK must be defined

3. **listing -> account_host -> user (host)**
   - Current: Two queries (account_host then user)
   - Could be: `supabase.from('listing').select('*, host:account_host(*, user(*))')`
   - **Blocker**: Complex chain, FKs needed at each level

4. **listing -> listing_photo**
   - Current: Separate query or embedded objects
   - Could be: `supabase.from('listing').select('*, photos:listing_photo(*)')`
   - **Blocker**: Already works but most photos now embedded

### Items NOT Suitable for Joins

1. **JSONB arrays of IDs** (Proposals List, Favorited Listings, Features - Photos legacy)
   - These are not proper foreign keys
   - Require `.in()` queries after extracting IDs

2. **Reference table lookups** (neighborhoods, boroughs, amenities)
   - Already cached on app startup
   - Cross-schema joins may have performance implications

---

## Files Referenced

### Frontend Files
- `app/src/lib/dataLookups.js`
- `app/src/lib/listingDataFetcher.js`
- `app/src/lib/proposalDataFetcher.js`
- `app/src/lib/proposals/userProposalQueries.js`
- `app/src/lib/supabaseUtils.js`
- `app/src/lib/listingService.js`
- `app/src/islands/pages/useSearchPageLogic.js`

### Edge Function Files
- `supabase/functions/proposal/actions/get.ts`
- `supabase/functions/proposal/actions/create.ts`
- `supabase/functions/messages/handlers/getThreads.ts`
- `supabase/functions/listing/handlers/get.ts`
