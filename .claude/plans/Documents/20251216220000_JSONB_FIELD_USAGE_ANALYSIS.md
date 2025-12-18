# JSONB Field Usage Analysis for Junction Table Migration

**Date**: 2025-12-16 22:00:00
**Purpose**: Document all code usages of user table JSONB fields before junction table migration

---

## Executive Summary

This document catalogs ALL usages of the 10 JSONB fields that have been normalized into junction tables. The analysis covers:
- **Edge Functions** (supabase/functions/)
- **Frontend React Code** (app/src/)

### Fields Analyzed

| # | Field Name | Active Code Usages Found |
|---|------------|-------------------------|
| 1 | `About - Commonly Stored Items` | 2 WRITE (Edge Functions) |
| 2 | `Preferred Hoods` | 2 WRITE (Edge Functions) |
| 3 | `Reasons to Host me` | 0 active (documentation only) |
| 4 | `recent rental type search` | 0 active |
| 5 | `Chat - Threads` | 0 active |
| 6 | `Favorited Listings` | 12+ READ/WRITE |
| 7 | `Proposals List` | 15+ READ/WRITE |
| 8 | `Leases` | 0 active |
| 9 | `Users with permission to see sensitive info` | 0 active |
| 10 | `Participants` (thread table) | 0 active |

---

## 1. `About - Commonly Stored Items`

### Edge Functions - WRITE Operations

#### File: `supabase/functions/ai-parse-profile/index.ts`
**Line**: 482
**Operation**: WRITE
**Context**: AI profile parsing updates user's stored items
```typescript
if (extractedData.storedItems && extractedData.storedItems.length > 0) {
  userUpdate['About - Commonly Stored Items'] = extractedData.storedItems;
}
```

#### File: `supabase/functions/bubble-proxy/handlers/parseProfile.ts`
**Line**: 437
**Operation**: WRITE
**Context**: Duplicate of ai-parse-profile logic
```typescript
if (extractedData.storedItems && extractedData.storedItems.length > 0) {
  userUpdate['About - Commonly Stored Items'] = extractedData.storedItems;
}
```

### Frontend - No Active Code
Documentation references only in `ACCOUNT_PROFILE_QUICK_REFERENCE.md`

---

## 2. `Preferred Hoods`

### Edge Functions - WRITE Operations

#### File: `supabase/functions/ai-parse-profile/index.ts`
**Line**: 476
**Operation**: WRITE
**Context**: AI profile parsing updates preferred neighborhoods
```typescript
if (hoodIds.length > 0) {
  userUpdate['Preferred Hoods'] = hoodIds;
}
```

#### File: `supabase/functions/bubble-proxy/handlers/parseProfile.ts`
**Line**: 431
**Operation**: WRITE
**Context**: Duplicate of ai-parse-profile logic
```typescript
if (hoodIds.length > 0) {
  userUpdate['Preferred Hoods'] = hoodIds;
}
```

### Frontend - No Active Code
Documentation references only

---

## 3. `Reasons to Host me`

### Edge Functions - No Active Code
The field `About - reasons to host me` (text) is used, but NOT the JSONB array `Reasons to Host me`

### Frontend - READ Only (UI Display)

#### File: `app/src/islands/pages/AccountProfilePage/components/cards/ReasonsCard.jsx`
**Lines**: 1-51
**Operation**: READ (display)
**Context**: Displays chip selection for good guest reasons
```jsx
<ProfileCard title="Reasons to Host Me">
  <p>Select the qualities that make you a great guest:</p>
  {/* Chip selection UI */}
</ProfileCard>
```

---

## 4. `recent rental type search`

### No Active Code Found
- Only documentation references in plan files
- Field exists in database but no application code reads/writes it

---

## 5. `Chat - Threads`

### No Active Code Found
- Only documentation references
- Field exists in database but no application code reads/writes it
- Chat functionality may use direct thread table queries instead

---

## 6. `Favorited Listings` (HIGHLY ACTIVE)

### Edge Functions - READ Operations

#### File: `supabase/functions/bubble-proxy/handlers/getFavorites.ts`
**Lines**: 98-125
**Operation**: READ
**Context**: Get user's favorited listings for display
```typescript
const { data: userData, error: userError } = await supabase
  .from('user')
  .select('"Favorited Listings"')
  .eq('_id', userId)
  .single();

// Parse Favorited Listings - it's stored as a stringified JSON array
let favoritedIds: string[] = [];
const rawFavorites = userData?.['Favorited Listings'];
```

#### File: `supabase/functions/bubble-proxy/handlers/favorites.ts`
**Lines**: 57-77
**Operation**: READ (for toggle)
**Context**: Read current favorites before add/remove
```typescript
const { data: userData, error: fetchError } = await supabase
  .from('user')
  .select('"Favorited Listings"')
  .eq('_id', userId)
  .single();

const currentFavorites = parseJsonArray<string>(
  userData?.['Favorited Listings'],
  'Favorited Listings'
);
```

#### File: `supabase/functions/ai-parse-profile/index.ts`
**Lines**: 263-297
**Operation**: READ + WRITE
**Context**: Auto-favorite matching listings during signup
```typescript
const { data: userData, error: userError } = await supabase
  .from('user')
  .select('"Favorited Listings"')
  .eq('_id', userId)
  .single();

// Parse existing favorites
const rawFavorites = userData?.['Favorited Listings'];
// ... merge logic ...

const { error: updateError } = await supabase
  .from('user')
  .update({ 'Favorited Listings': newFavorites })
  .eq('_id', userId);
```

### Edge Functions - WRITE Operations

#### File: `supabase/functions/bubble-proxy/handlers/parseProfile.ts`
**Lines**: 241-265
**Operation**: WRITE
**Context**: Update favorites during profile parsing
```typescript
const existingFavorites = parseJsonArray<string>(
  userData?.['Favorited Listings'],
  'Favorited Listings'
);
const newFavorites = [...new Set([...existingFavorites, ...listingIds])];

const { error: updateError } = await supabase
  .from('user')
  .update({ 'Favorited Listings': newFavorites })
  .eq('_id', userId);
```

#### File: `supabase/functions/proposal/actions/create.ts`
**Lines**: 343-349
**Operation**: WRITE
**Context**: Add listing to favorites when creating proposal
```typescript
const currentFavorites = parseJsonArray<string>(guestData["Favorited Listings"], "Favorited Listings");
if (!currentFavorites.includes(input.listingId)) {
  guestUpdates["Favorited Listings"] = [...currentFavorites, input.listingId];
}
```

### Frontend - READ Operations

#### File: `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`
**Lines**: 665-702
**Operation**: READ
**Context**: Fetch user's favorited listings for display
```javascript
const { data: userFavorites, error: favError } = await supabase
  .from('user')
  .select('"Favorited Listings"')
  .eq('_id', sessionId)
  .single();

const favorites = userFavorites?.['Favorited Listings'];
let favoritedIds = [];
// Parse logic for string or array
```

#### File: `app/src/islands/pages/SearchPage.jsx`
**Lines**: 1027-1039
**Operation**: READ
**Context**: Fetch favorites for search page heart icons
```javascript
const { data: userRecord, error } = await supabase
  .from('user')
  .select('"Favorited Listings", "Proposals List", ...')
  .eq('_id', userId)
  .single();

const favorites = userRecord['Favorited Listings'];
if (Array.isArray(favorites)) {
  // Filter valid Bubble IDs
}
```

#### File: `app/src/islands/shared/LoggedInAvatar/useLoggedInAvatarData.js`
**Lines**: 154-248
**Operation**: READ
**Context**: Get favorites count for avatar menu
```javascript
.select(`
  _id,
  "Type - User Current",
  "Proposals List",
  "Account - Host / Landlord",
  "Favorited Listings"
`)

const favoritesList = userData?.['Favorited Listings'];
const favoritesCount = Array.isArray(favoritesList) ? favoritesList.length : 0;
```

---

## 7. `Proposals List` (HIGHLY ACTIVE)

### Edge Functions - READ Operations

#### File: `supabase/functions/auth-user/handlers/validate.ts`
**Lines**: 68, 147-149
**Operation**: READ
**Context**: Get proposal count for user validation response
```typescript
const userSelectFields = '..., "Proposals List"';

const proposalsList = userData['Proposals List'];
const proposalCount = Array.isArray(proposalsList) ? proposalsList.length : 0;
```

#### File: `supabase/functions/listing/handlers/createMockupProposal.ts`
**Lines**: 580-601
**Operation**: READ + WRITE
**Context**: Add mockup proposal to host's list
```typescript
const { data: hostUser } = await supabase
  .from('user')
  .select('_id, "Proposals List"')
  .eq('_id', hostUserId)
  .single();

const currentProposals = parseJsonArray<string>(hostUser['Proposals List'], 'Host Proposals List');
const updatedProposals = [...currentProposals, proposalId];

await supabase.from('user').update({
  'Proposals List': updatedProposals,
}).eq('_id', hostUserId);
```

#### File: `supabase/functions/proposal/actions/create.ts`
**Lines**: 107, 143, 172-174, 340-342, 381-387
**Operation**: READ + WRITE
**Context**: Full proposal creation flow
```typescript
// Guest select
.select(`_id, email, "Rental Application", "Proposals List", ...`)

// Host select
.select(`_id, email, "Proposals List"`)

// Guest update (native text[] after migration)
const existingProposals: string[] = guestData["Proposals List"] || [];
guestUpdates["Proposals List"] = [...existingProposals, proposalId];

// Host update
const hostProposals: string[] = hostUserData["Proposals List"] || [];
await supabase.from("user").update({
  "Proposals List": [...hostProposals, proposalId],
}).eq("_id", hostAccountData.User);
```

### Frontend - READ Operations

#### File: `app/src/lib/proposals/userProposalQueries.js`
**Lines**: 23-71, 508-516
**Operation**: READ
**Context**: Fetch user's proposals via their Proposals List
```javascript
// Fetch user with proposals list
const { data: user } = await supabase
  .from('user')
  .select(`
    _id,
    "Name - First",
    "Name - Full",
    "Profile Photo",
    "email as text",
    "Proposals List"
  `)
  .eq('_id', userId)
  .maybeSingle();

// Extract IDs
const proposalsList = user['Proposals List'];
if (!proposalsList || !Array.isArray(proposalsList)) {
  return [];
}
return proposalsList;
```

#### File: `app/src/lib/proposalDataFetcher.js`
**Lines**: 91-110
**Operation**: READ
**Context**: Fetch proposals by guest
```javascript
const { data: userData } = await supabase
  .from('user')
  .select('"Proposals List"')
  .eq('_id', userId)
  .single();

const proposalIds = userData?.['Proposals List'];
if (!proposalIds || !Array.isArray(proposalIds) || proposalIds.length === 0) {
  return [];
}
```

#### File: `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`
**Lines**: 640-646, 1066-1072
**Operation**: READ
**Context**: Get proposal count for UI
```javascript
const { data: userProposalData } = await supabase
  .from('user')
  .select('"About Me / Bio", "need for Space", "special needs", "Proposals List"')
  .eq('_id', sessionId)
  .single();

const proposalsList = userProposalData['Proposals List'];
const proposalCount = Array.isArray(proposalsList) ? proposalsList.length : 0;
```

#### File: `app/src/islands/pages/SearchPage.jsx`
**Lines**: 1030, 1054-1056
**Operation**: READ
**Context**: Get proposal count for Create Proposal CTA
```javascript
.select('"Favorited Listings", "Proposals List", ...')

const proposalsList = userRecord['Proposals List'];
const proposalCount = Array.isArray(proposalsList) ? proposalsList.length : 0;
```

#### File: `app/src/islands/shared/LoggedInAvatar/useLoggedInAvatarData.js`
**Lines**: 155, 242-244
**Operation**: READ
**Context**: Get proposals count for avatar menu
```javascript
.select(`..., "Proposals List", ...`)

const proposalsList = userData?.['Proposals List'];
const proposalsCount = Array.isArray(proposalsList) ? proposalsList.length : 0;
```

---

## 8. `Leases`

### No Active Code Found
- Field exists in database
- No application code reads/writes it directly
- Leases are likely queried via `bookings_leases` table directly

---

## 9. `Users with permission to see sensitive info`

### No Active Code Found
- Field exists in database
- Only documentation references
- No application code reads/writes it

---

## 10. `Participants` (thread table)

### No Active Code Found
- Field exists in `thread` table
- No application code reads/writes it directly
- Thread participant queries may use joins or separate queries

---

## Summary: Files Requiring Updates

### HIGH PRIORITY (Active WRITE Operations)

| File | Fields | Operation |
|------|--------|-----------|
| `supabase/functions/ai-parse-profile/index.ts` | `Favorited Listings`, `Preferred Hoods`, `About - Commonly Stored Items` | WRITE |
| `supabase/functions/bubble-proxy/handlers/parseProfile.ts` | `Favorited Listings`, `Preferred Hoods`, `About - Commonly Stored Items` | WRITE |
| `supabase/functions/bubble-proxy/handlers/favorites.ts` | `Favorited Listings` | READ/WRITE |
| `supabase/functions/bubble-proxy/handlers/getFavorites.ts` | `Favorited Listings` | READ |
| `supabase/functions/proposal/actions/create.ts` | `Proposals List`, `Favorited Listings` | READ/WRITE |
| `supabase/functions/listing/handlers/createMockupProposal.ts` | `Proposals List` | READ/WRITE |
| `supabase/functions/auth-user/handlers/validate.ts` | `Proposals List` | READ |

### MEDIUM PRIORITY (Frontend READ Operations)

| File | Fields | Operation |
|------|--------|-----------|
| `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx` | `Favorited Listings`, `Proposals List` | READ |
| `app/src/islands/pages/SearchPage.jsx` | `Favorited Listings`, `Proposals List` | READ |
| `app/src/islands/shared/LoggedInAvatar/useLoggedInAvatarData.js` | `Favorited Listings`, `Proposals List` | READ |
| `app/src/lib/proposals/userProposalQueries.js` | `Proposals List` | READ |
| `app/src/lib/proposalDataFetcher.js` | `Proposals List` | READ |
| `app/src/islands/pages/AccountProfilePage/components/cards/ReasonsCard.jsx` | `Reasons to Host me` (display only) | READ |

### LOW PRIORITY (No Active Code)

| Field | Status |
|-------|--------|
| `recent rental type search` | No active code |
| `Chat - Threads` | No active code |
| `Leases` | No active code |
| `Users with permission to see sensitive info` | No active code |
| `Participants` (thread) | No active code |

---

## Migration Impact Analysis

### Phase 1: Junction Tables Created (No Code Changes Yet)
The junction tables have been created in the `junctions` schema. Data has been migrated from JSONB arrays.

### Phase 2: Dual-Write Implementation (Recommended Next Step)
For each active field, implement dual-write:
1. Continue writing to JSONB field (backward compatibility)
2. Also write to junction table (forward compatibility)

### Phase 3: Migrate Reads
Update read operations to query junction tables instead of JSONB arrays.

### Phase 4: Deprecate JSONB Fields
Once all reads are migrated:
1. Remove JSONB writes
2. Mark JSONB columns as deprecated
3. Eventually drop columns

---

## Appendix: Type Definitions

### `supabase/functions/proposal/lib/types.ts`
```typescript
export interface GuestUserData {
  _id: string;
  email: string;
  "Rental Application": string | null;
  "Proposals List": string[];  // Native text[] array (migrated)
  "Favorited Listings": string[];  // Still JSONB - requires parseJsonArray
  // ...
}

export interface HostUserData {
  _id: string;
  email: string;
  "Proposals List": string[];  // Native text[] array (migrated)
}
```

**NOTE**: `Proposals List` has already been migrated from JSONB to native PostgreSQL `text[]` array. The code no longer uses `parseJsonArray` for this field.
