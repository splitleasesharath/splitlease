# Listings Overview Page Migration Plan

**Created**: 2026-01-22 18:26:56
**Source**: https://github.com/splitleasesharath/_listings-overview.git
**Target**: Split Lease Monorepo - Internal Admin Page
**Classification**: BUILD

---

## Executive Summary

Migrate the standalone `_listings-overview` React application into the Split Lease monorepo as an internal admin page. The source is a **mock-data prototype** that needs to be rewired to use real Supabase data and conform to Split Lease's hollow component architecture.

---

## Part 1: Source Analysis

### Technology Stack Comparison

| Aspect | Source Repo | Split Lease Target |
|--------|-------------|-------------------|
| Framework | React 18 + TypeScript | React 18 + JavaScript (JSX) |
| Build Tool | Vite 5.1 | Vite (shared config) |
| Styling | Custom CSS (7 files) | Custom CSS (co-located) |
| Data Source | Mock data (296 hardcoded) | Supabase + Bubble.io |
| API Pattern | In-memory mutations | Edge Functions (`{ action, payload }`) |
| Auth | None | Supabase Auth + Admin check |
| State | useState hooks | Hollow component + logic hook |

### Source Files Inventory

```
_listings-overview/src/
├── App.tsx (131 bytes)              → DELETE (entry point changes)
├── main.tsx (247 bytes)             → DELETE (replaced by entry JSX)
├── components/
│   ├── Header.tsx (1,358 bytes)     → MIGRATE to ListingsOverviewPage/
│   ├── FilterPanel.tsx (5,659 bytes)→ MIGRATE to ListingsOverviewPage/
│   ├── ListingsTable.tsx (3,417 bytes)→ MIGRATE to ListingsOverviewPage/
│   ├── ListingRow.tsx (7,440 bytes) → MIGRATE to ListingsOverviewPage/
│   └── Modal.tsx (703 bytes)        → USE existing shared Modal
├── pages/
│   └── ListingsOverviewPage.tsx     → SPLIT into index.jsx + useLogic.js
├── services/
│   └── api.ts (5,433 bytes)         → REWRITE completely
├── data/
│   └── mockData.ts (8,331 bytes)    → DELETE entirely
├── types/
│   └── listing.types.ts (2,044 bytes)→ REFERENCE only (JS codebase)
└── styles/ (7 CSS files, ~18kb)     → MERGE into single CSS file
```

---

## Part 2: Architecture Mapping

### Target File Structure

```
app/src/
├── listings-overview.jsx            # NEW entry point
├── listings-overview.html           # NEW HTML shell
└── islands/pages/ListingsOverviewPage/
    ├── index.jsx                    # Hollow component (UI only)
    ├── useListingsOverviewPageLogic.js  # All business logic
    ├── api.js                       # Supabase queries with reference table JOINs
    ├── components/
    │   ├── ListingsHeader.jsx       # Action buttons + bulk price controls
    │   ├── ListingsFilterPanel.jsx  # Filter controls (borough/hood from reference tables)
    │   ├── ListingsTable.jsx        # Table wrapper
    │   ├── ListingRow.jsx           # Individual row with inline toggles
    │   └── ErrorManagementModal.jsx # Preset errors + custom text input
    ├── constants.js                 # Status enums, preset error codes, price multipliers
    └── ListingsOverviewPage.css     # Merged styles
```

### Constants File Preview

```javascript
// constants.js - Error codes and pricing configuration

export const PRESET_ERROR_CODES = [
  { code: 'CONTACT_IN_DESC', label: 'Sharing Contact Information in Description' },
  { code: 'MISSING_PHOTOS', label: 'Insufficient Photos (< 5)' },
  { code: 'PRICING_ISSUE', label: 'Pricing Below Market Rate' },
  { code: 'INCOMPLETE_PROFILE', label: 'Host Profile Incomplete' },
  { code: 'ADDRESS_MISMATCH', label: 'Address Verification Failed' },
  { code: 'DUPLICATE_LISTING', label: 'Possible Duplicate Listing' },
];

export const PRICE_MULTIPLIERS = {
  DEFAULT: 1.75,  // Quick button default
  MIN: 1.0,
  MAX: 3.0,
};

export const LISTING_STATUS = {
  COMPLETED: 'Completed',
  IN_PROGRESS: 'InProgress',
  DRAFT: 'Draft',
  ARCHIVED: 'Archived',
};

export const AVAILABILITY_STATUS = {
  AVAILABLE: 'Available',
  UNAVAILABLE: 'Unavailable',
  PENDING: 'Pending',
};
```

### Route Configuration Addition

```javascript
// Add to routes.config.js after proposal-manage entry (line ~656)
{
  path: '/_internal/listings-overview',
  file: 'listings-overview.html',
  aliases: ['/_internal/listings-overview.html', '/listings-overview'],
  protected: true,
  adminOnly: true,
  cloudflareInternal: false,
  internalName: 'listings-overview-view',
  hasDynamicSegment: false
}
```

---

## Part 3: Data Model Discrepancies

### Critical Mapping: Source Types → Supabase Schema

| Source Field | Supabase Column | Transformation Needed |
|--------------|-----------------|----------------------|
| `id` | `_id` | Direct map |
| `uniqueId` | `Listing Code OP` | Direct map |
| `name` | `Name` | Direct map |
| `description` | `Description` | Direct map |
| `host.id` | `Host User` | Bubble ID reference |
| `host.email` | `Host email` | Direct map |
| `host.name` | `host name` | Direct map |
| `location.borough.id` | `Location - Borough` | **Bubble ID** - JOIN to lookup |
| `location.borough.display` | `reference_table.zat_geo_borough_toplevel."Display Borough"` | **JOIN** |
| `location.neighborhood.id` | `Location - Hood` | **Bubble ID** - JOIN to lookup |
| `location.neighborhood.display` | `reference_table.zat_geo_hood_mediumlevel."Display"` | **JOIN** |
| `pricing.nightly` | `Nightly Host Rate for 1 night` | Direct map |
| `pricing.override` | `Price Override` | Direct map |
| `pricing.calculated3Night` | `Nightly Host Rate for 3 nights` | Direct map |
| `status` | Derived from `Complete`, `pending`, `Deleted` | **Computed field** |
| `availability` | Derived from `Active`, `Approved` | **Computed field** |
| `usability` | `isForUsability` | Direct map (boolean) |
| `active` | `Active` | Direct map (boolean) |
| `showcase` | `Showcase` | Direct map (boolean) |
| `photos` (count) | `Features - Photos` | JSONB array `.length` |
| `amenities` | `Features - Amenities In-Unit` | JSONB array |
| `errors[]` | `Errors` | JSONB array (already exists!) |

### Borough/Neighborhood Resolution - SOLVED ✅

**Discovery**: The Supabase database already contains complete geographic reference tables!

| Reference Table | Records | Key Columns |
|-----------------|---------|-------------|
| `reference_table.zat_geo_borough_toplevel` | 8 | `_id`, `Display Borough` |
| `reference_table.zat_geo_hood_mediumlevel` | 293 | `_id`, `Display`, `Geo-Borough` |
| `reference_table.zat_location` | 8 | `_id`, `cityName`, `Short Name` |

**Borough Data Available**:
| Bubble ID | Display Name |
|-----------|--------------|
| `1607041299687x679479834266385900` | Manhattan |
| `1607041299637x913970439175620100` | Brooklyn |
| `1607041299828x406969561802059650` | Queens |
| `1607041299715x741251947580746200` | Bronx |
| `1734531600000x514268093014903501` | Staten Island |
| `1686599616073x348655546878883200` | Hudson County NJ |
| `1686596333255x514268093014903500` | Bergen County NJ |
| `1686674905048x436838997624262400` | Essex County NJ |

**Solution**: JOIN directly to reference tables - **NO NEW MIGRATIONS NEEDED**

```sql
SELECT
  l."_id",
  l."Name",
  b."Display Borough" AS borough_name,
  h."Display" AS neighborhood_name
FROM listing l
LEFT JOIN reference_table.zat_geo_borough_toplevel b
  ON l."Location - Borough" = b._id
LEFT JOIN reference_table.zat_geo_hood_mediumlevel h
  ON l."Location - Hood" = h._id
```

### Status Computation Logic

The source has enum statuses. Split Lease derives status from multiple flags:

```javascript
// Source enum
enum ListingStatus { Completed, InProgress, Draft, Archived }

// Split Lease computation
function computeListingStatus(listing) {
  if (listing.Deleted) return 'Archived';
  if (listing.Complete) return 'Completed';
  if (listing.pending) return 'Draft';
  return 'InProgress';
}

function computeAvailability(listing) {
  if (!listing.Active) return 'Unavailable';
  if (!listing.Approved) return 'Pending';
  return 'Available';
}
```

---

## Part 4: API Service Rewrite

### Source API Methods → Edge Function Actions

| Source Method | Edge Function | Action | Notes |
|---------------|---------------|--------|-------|
| `getListings(filters, page)` | Direct Supabase | N/A | Query `listing` with JOINs to reference tables |
| `getBoroughs()` | Direct Supabase | N/A | Query `reference_table.zat_geo_borough_toplevel` |
| `getNeighborhoods(boroughId)` | Direct Supabase | N/A | Query `reference_table.zat_geo_hood_mediumlevel` filtered by `Geo-Borough` |
| `getErrorOptions()` | Constants + Manual | N/A | Preset list + custom text input |
| `updateListing(id, updates)` | `listing` | `update` | **Use changed-fields-only pattern** |
| `deleteListing(id)` | `listing` | `delete` | Soft delete (set Deleted=true) |
| `incrementPrices(ids, multiplier)` | New function | `bulk-price` | Default 1.75× OR custom multiplier |
| `addError(id, errorCode)` | Direct Supabase | N/A | JSONB array append |
| `clearErrors(id)` | Direct Supabase | N/A | Set `Errors` to `[]` |

### New API Service Implementation

```javascript
// app/src/islands/pages/ListingsOverviewPage/api.js

import { supabase } from '../../../lib/supabase.js';

export const listingsApi = {
  /**
   * Fetch listings with filters and pagination
   */
  async getListings({ filters, page = 1, pageSize = 50 }) {
    let query = supabase
      .from('listing')
      .select(`
        _id,
        "Name",
        "Description",
        "Host User",
        "Host email",
        "host name",
        "Location - Borough",
        "Location - Hood",
        "Nightly Host Rate for 1 night",
        "Nightly Host Rate for 3 nights",
        "Price Override",
        "Active",
        "Approved",
        "Complete",
        "pending",
        "Deleted",
        "isForUsability",
        "Showcase",
        "Features - Photos",
        "Errors",
        "Modified Date",
        "Listing Code OP"
      `, { count: 'exact' })
      .or('"Deleted".is.null,"Deleted".eq.false');

    // Apply filters
    if (filters.status) {
      // Map status filter to column conditions
    }
    if (filters.borough) {
      query = query.eq('"Location - Borough"', filters.borough);
    }
    if (filters.searchQuery) {
      query = query.or(`"Name".ilike.%${filters.searchQuery}%,"Host email".ilike.%${filters.searchQuery}%`);
    }

    // Pagination
    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, error, count } = await query;
    return { data, error, count };
  },

  /**
   * Update listing - ONLY send changed fields
   */
  async updateListing(id, changes) {
    // Critical: Filter to changed fields only (FK constraint safety)
    const { data, error } = await supabase
      .from('listing')
      .update(changes)
      .eq('_id', id)
      .select()
      .single();

    return { data, error };
  },

  /**
   * Add error to listing's Errors JSONB array
   */
  async addError(listingId, errorCode) {
    // Use Postgres array append
    const { data: listing } = await supabase
      .from('listing')
      .select('"Errors"')
      .eq('_id', listingId)
      .single();

    const currentErrors = listing?.Errors || [];
    if (!currentErrors.includes(errorCode)) {
      currentErrors.push(errorCode);
    }

    return supabase
      .from('listing')
      .update({ Errors: currentErrors })
      .eq('_id', listingId);
  },

  /**
   * Clear all errors from listing
   */
  async clearErrors(listingId) {
    return supabase
      .from('listing')
      .update({ Errors: [] })
      .eq('_id', listingId);
  },

  /**
   * Bulk price increment
   */
  async incrementPrices(listingIds, multiplier) {
    // Use Edge Function for complex operation
    return supabase.functions.invoke('listing', {
      body: {
        action: 'bulk-price-update',
        payload: { listing_ids: listingIds, multiplier }
      }
    });
  }
};
```

---

## Part 5: Migration Steps

### Phase 1: Infrastructure Setup (Prerequisites)

- [x] ~~**1.1** Create `borough` lookup table in Supabase~~ → **ALREADY EXISTS**: `reference_table.zat_geo_borough_toplevel`
- [x] ~~**1.2** Create `neighborhood` lookup table in Supabase~~ → **ALREADY EXISTS**: `reference_table.zat_geo_hood_mediumlevel`
- [x] ~~**1.3** Populate lookup tables from Bubble.io data~~ → **ALREADY POPULATED**: 8 boroughs, 293 neighborhoods
- [ ] **1.4** Add route to `routes.config.js`
- [ ] **1.5** Create HTML shell (`listings-overview.html`)
- [ ] **1.6** Create entry point (`listings-overview.jsx`)

### Phase 2: Core Component Migration

- [ ] **2.1** Create folder structure `islands/pages/ListingsOverviewPage/`
- [ ] **2.2** Create `index.jsx` (hollow component)
- [ ] **2.3** Create `useListingsOverviewPageLogic.js` (logic hook)
- [ ] **2.4** Merge CSS files into `ListingsOverviewPage.css`
- [ ] **2.5** Create `constants.js` with error codes and status enums

### Phase 3: Sub-Component Migration

- [ ] **3.1** Migrate `Header.tsx` → `ListingsHeader.jsx` (convert TS→JS)
- [ ] **3.2** Migrate `FilterPanel.tsx` → `ListingsFilterPanel.jsx`
- [ ] **3.3** Migrate `ListingsTable.tsx` → `ListingsTable.jsx`
- [ ] **3.4** Migrate `ListingRow.tsx` → `ListingRow.jsx`
- [ ] **3.5** Use existing shared Modal component (no migration)

### Phase 4: API Integration

- [ ] **4.1** Create `api.js` with Supabase queries
- [ ] **4.2** Implement listing fetch with pagination
- [ ] **4.3** Implement filter application
- [ ] **4.4** Implement error management (add/clear)
- [ ] **4.5** Implement inline toggle updates (Active, Showcase, Usability)

### Phase 5: Edge Function Enhancement (Optional)

- [ ] **5.1** Add `bulk-price-update` action to listing Edge Function
- [ ] **5.2** Add `update` action if not exists
- [ ] **5.3** Test Edge Function integration

### Phase 6: Testing & Polish

- [ ] **6.1** Verify admin authentication flow
- [ ] **6.2** Test all filter combinations
- [ ] **6.3** Test pagination (load more)
- [ ] **6.4** Test error add/clear functionality
- [ ] **6.5** Test inline toggle persistence
- [ ] **6.6** Run `bun run generate-routes`
- [ ] **6.7** Test full page in browser

---

## Part 6: Code Transformation Examples

### TypeScript → JavaScript Conversion

**Before (TypeScript)**:
```typescript
interface FilterState {
  availability: string;
  status: string;
  borough: string;
  neighborhood: string;
}

const FilterPanel: React.FC<{
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}> = ({ filters, onFilterChange }) => {
  // ...
};
```

**After (JavaScript + JSDoc)**:
```javascript
/**
 * @typedef {Object} FilterState
 * @property {string} availability
 * @property {string} status
 * @property {string} borough
 * @property {string} neighborhood
 */

/**
 * @param {Object} props
 * @param {FilterState} props.filters
 * @param {(filters: FilterState) => void} props.onFilterChange
 */
function ListingsFilterPanel({ filters, onFilterChange }) {
  // ...
}
```

### Mock API → Supabase Integration

**Before (Mock)**:
```typescript
async getListings(filters: FilterState, page: number) {
  await delay(randomDelay());
  let filtered = [...mockListings];
  // filter logic...
  return { listings: filtered.slice(start, end), total: filtered.length };
}
```

**After (Supabase)**:
```javascript
async function loadListings(filters, page) {
  setIsLoading(true);
  try {
    const { data, error, count } = await listingsApi.getListings({ filters, page });

    if (error) throw error;

    const normalized = data.map(normalizeListingFromSupabase);
    setListings(prev => page === 1 ? normalized : [...prev, ...normalized]);
    setTotalCount(count);
  } catch (err) {
    console.error('[ListingsOverview] Load failed:', err);
    setError('Failed to load listings');
  } finally {
    setIsLoading(false);
  }
}
```

### Normalizer Function

```javascript
/**
 * Transform Supabase listing row to UI-friendly format
 */
function normalizeListingFromSupabase(row) {
  return {
    id: row._id,
    uniqueId: row['Listing Code OP'] || row._id.slice(-8),
    name: row.Name || 'Untitled Listing',
    description: row.Description || '',
    host: {
      id: row['Host User'],
      email: row['Host email'] || '',
      name: row['host name'] || ''
    },
    location: {
      borough: {
        id: row['Location - Borough'],
        display: '' // Resolved via lookup
      },
      neighborhood: {
        id: row['Location - Hood'],
        display: '' // Resolved via lookup
      }
    },
    pricing: {
      nightly: row['Nightly Host Rate for 1 night'] || 0,
      override: row['Price Override'],
      calculated3Night: row['Nightly Host Rate for 3 nights'] || 0
    },
    status: computeListingStatus(row),
    availability: computeAvailability(row),
    usability: row.isForUsability || false,
    active: row.Active || false,
    showcase: row.Showcase || false,
    photos: (row['Features - Photos'] || []).length,
    errors: row.Errors || [],
    modifiedDate: row['Modified Date']
  };
}
```

---

## Part 7: Database Migrations Required

### ✅ NO NEW MIGRATIONS NEEDED

The geographic reference tables already exist in the `reference_table` schema:

| Table | Purpose | Records |
|-------|---------|---------|
| `reference_table.zat_geo_borough_toplevel` | Borough lookup | 8 |
| `reference_table.zat_geo_hood_mediumlevel` | Neighborhood lookup | 293 |
| `reference_table.zat_location` | City lookup | 8 |

**Query Pattern** (replaces planned migration):

```sql
-- Fetch boroughs for filter dropdown
SELECT _id, "Display Borough" AS name
FROM reference_table.zat_geo_borough_toplevel
ORDER BY "Display Borough";

-- Fetch neighborhoods filtered by borough
SELECT _id, "Display" AS name
FROM reference_table.zat_geo_hood_mediumlevel
WHERE "Geo-Borough" = $1  -- borough Bubble ID
ORDER BY "Display";

-- Fetch listings with resolved names
SELECT
  l.*,
  b."Display Borough" AS borough_name,
  h."Display" AS neighborhood_name
FROM listing l
LEFT JOIN reference_table.zat_geo_borough_toplevel b
  ON l."Location - Borough" = b._id
LEFT JOIN reference_table.zat_geo_hood_mediumlevel h
  ON l."Location - Hood" = h._id
WHERE COALESCE(l."Deleted", false) = false;
```

---

## Part 8: Risk Assessment

### High Risk Items

| Risk | Mitigation |
|------|------------|
| Borough/Neighborhood IDs mismatch | Verify Bubble IDs before populating lookup tables |
| FK constraint violations on update | Always use changed-fields-only pattern |
| TypeScript conversion errors | Test each component individually |
| CSS conflicts with existing styles | Namespace all classes with `lo-` prefix |

### Medium Risk Items

| Risk | Mitigation |
|------|------------|
| Pagination performance at scale | Add database indices on filter columns |
| Bulk price update timeout | Implement as Edge Function with batching |
| Error codes drift from Bubble | Document authoritative source of error codes |

### Low Risk Items

| Risk | Mitigation |
|------|------------|
| Auth pattern already proven | Copy from ProposalManagePage |
| Route conflicts | Unique `/_internal/listings-overview` path |

---

## Part 9: File References

### Source Files (to migrate from)
- https://github.com/splitleasesharath/_listings-overview/blob/main/src/pages/ListingsOverviewPage.tsx
- https://github.com/splitleasesharath/_listings-overview/blob/main/src/components/
- https://github.com/splitleasesharath/_listings-overview/blob/main/src/types/listing.types.ts
- https://github.com/splitleasesharath/_listings-overview/blob/main/src/styles/

### Target Architecture References
- [routes.config.js](../../../app/src/routes.config.js) - Route registry (line 656 for insertion point)
- [ProposalManagePage/index.jsx](../../../app/src/islands/pages/ProposalManagePage/index.jsx) - Hollow component pattern
- [useProposalManagePageLogic.js](../../../app/src/islands/pages/ProposalManagePage/useProposalManagePageLogic.js) - Logic hook pattern
- [listing Edge Function](../../../supabase/functions/listing/index.ts) - Edge Function structure
- [lib/auth.js](../../../app/src/lib/auth.js) - Authentication utilities
- [lib/supabase.js](../../../app/src/lib/supabase.js) - Supabase client

### Database Schema References
- `listing` table - 109 columns, includes `Errors` JSONB field
- `listing_photo` table - Photo metadata
- `user` table - Host information, `Admin?` field for auth

---

## Approval Checklist

Before implementation:
- [x] ~~Confirm borough/neighborhood lookup table approach~~ → **RESOLVED**: Use existing `reference_table` schema
- [x] ~~Obtain Bubble.io IDs for all 5 boroughs + neighborhoods~~ → **RESOLVED**: Already in Supabase (8 boroughs, 293 neighborhoods)
- [x] ~~Confirm error code authoritative list~~ → **RESOLVED**: Preset common errors + manual text input field
- [x] ~~Decide on price multiplier configurability~~ → **RESOLVED**: Default 1.75× button + custom multiplier input

---

## Design Decisions Summary

| Decision | Resolution |
|----------|------------|
| **Borough/Neighborhood Data** | JOIN to existing `reference_table.zat_geo_*` tables - no new migrations |
| **Error Management** | Preset dropdown with common errors (e.g., "Sharing Contact Information") + free-text input for custom errors |
| **Price Multiplier** | Two options: (1) Quick 1.75× button, (2) Custom multiplier input field |
| **Database Migrations** | NONE required - all reference data already exists |

---

**Plan Status**: ✅ Ready for Implementation
**Estimated Effort**: 1.5-2 days (reduced from 2-3 days, no migrations needed)
**Dependencies**: None - all data structures already exist
