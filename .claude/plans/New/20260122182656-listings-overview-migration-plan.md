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
    ├── components/
    │   ├── ListingsHeader.jsx       # Action buttons
    │   ├── ListingsFilterPanel.jsx  # Filter controls
    │   ├── ListingsTable.jsx        # Table wrapper
    │   └── ListingRow.jsx           # Individual row
    ├── constants.js                 # Status enums, error codes
    └── ListingsOverviewPage.css     # Merged styles
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
| `location.borough.id` | `Location - Borough` | **Bubble ID** - needs lookup |
| `location.borough.display` | N/A | **Must fetch from Bubble** |
| `location.neighborhood.id` | `Location - Hood` | **Bubble ID** - needs lookup |
| `location.neighborhood.display` | N/A | **Must fetch from Bubble** |
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

### Borough/Neighborhood Resolution Problem

**Issue**: The source app has hardcoded borough/neighborhood data. Split Lease stores **Bubble.io IDs** in `Location - Borough` and `Location - Hood` columns.

**Solution Options**:

1. **Option A: Create lookup tables in Supabase** (Recommended)
   - Create `borough` and `neighborhood` tables with ID→Name mappings
   - One-time data migration from Bubble
   - Fast local lookups, no external API calls

2. **Option B: Fetch from Bubble on demand**
   - Use bubble-proxy Edge Function to resolve names
   - Slower, adds external dependency
   - No schema changes needed

3. **Option C: Denormalize into listing table**
   - Add `borough_name` and `neighborhood_name` columns
   - Update via trigger on write
   - Redundant data but simplest queries

**Recommendation**: Option A - Create lookup tables

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
| `getListings(filters, page)` | Direct Supabase | N/A | Query `listing` table |
| `getBoroughs()` | Direct Supabase | N/A | Query `borough` table (new) |
| `getNeighborhoods()` | Direct Supabase | N/A | Query `neighborhood` table (new) |
| `getErrorOptions()` | Constants file | N/A | Static list |
| `updateListing(id, updates)` | `listing` | `update` | **Use changed-fields-only pattern** |
| `deleteListing(id)` | `listing` | `delete` | Soft delete (set Deleted=true) |
| `incrementPrices(ids, multiplier)` | New function | `bulk-price` | Batch update |
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

- [ ] **1.1** Create `borough` lookup table in Supabase
- [ ] **1.2** Create `neighborhood` lookup table in Supabase
- [ ] **1.3** Populate lookup tables from Bubble.io data
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

### Migration 1: Create Borough Lookup Table

```sql
-- Migration: create_borough_lookup_table
CREATE TABLE IF NOT EXISTS borough (
  bubble_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert NYC boroughs (Bubble IDs to be filled from actual data)
INSERT INTO borough (bubble_id, name, display_order) VALUES
  ('BUBBLE_ID_MANHATTAN', 'Manhattan', 1),
  ('BUBBLE_ID_BROOKLYN', 'Brooklyn', 2),
  ('BUBBLE_ID_QUEENS', 'Queens', 3),
  ('BUBBLE_ID_BRONX', 'The Bronx', 4),
  ('BUBBLE_ID_STATEN_ISLAND', 'Staten Island', 5);

-- Enable RLS
ALTER TABLE borough ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Borough lookup is public"
  ON borough FOR SELECT
  USING (true);
```

### Migration 2: Create Neighborhood Lookup Table

```sql
-- Migration: create_neighborhood_lookup_table
CREATE TABLE IF NOT EXISTS neighborhood (
  bubble_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  borough_id TEXT REFERENCES borough(bubble_id),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE neighborhood ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Neighborhood lookup is public"
  ON neighborhood FOR SELECT
  USING (true);
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
- [ ] Confirm borough/neighborhood lookup table approach
- [ ] Obtain Bubble.io IDs for all 5 boroughs + neighborhoods
- [ ] Confirm error code authoritative list
- [ ] Decide on price multiplier configurability (hardcode 1.75× or make editable?)

---

**Plan Status**: Ready for Review
**Estimated Effort**: 2-3 days
**Dependencies**: Bubble.io ID extraction for lookup tables
