# Listing Creation Migration: Bubble.io to Native Supabase

**Created**: 2025-12-05
**Status**: Planning
**Goal**: Migrate the listing creation flow from Bubble.io backend to native Supabase

---

## Executive Summary

The current listing creation flow uses Bubble.io as the source of truth, with Supabase as a replica. This plan outlines migrating to **native Supabase** as the source of truth, eliminating Bubble.io dependency for new listings.

---

## Current Architecture

```
User Input (SelfListingPage)
    │
    ↓
listingService.js::createListing()
    │
    ├──→ 1. Insert into Supabase `listing_trial` (with temp _id)
    │
    ├──→ 2. Call bubble-proxy → Bubble workflow
    │         └─→ Creates Listing in Bubble
    │         └─→ Returns Bubble `_id`
    │
    ├──→ 3. Update `listing_trial` with Bubble `_id`
    │
    └──→ 4. Sync to Supabase `listing` table
```

### Files Involved in Current Flow

| File | Purpose | Bubble Dependency |
|------|---------|-------------------|
| `app/src/lib/listingService.js` | Frontend service | `syncListingToBubble()` |
| `app/src/islands/pages/SelfListingPage/store/prepareListingSubmission.ts` | Data transformation | Bubble field mapping |
| `supabase/functions/bubble-proxy/handlers/listing.ts` | Edge Function handler | `triggerWorkflow()` |
| `supabase/functions/bubble-proxy/handlers/submitListing.ts` | Full submission | Bubble workflow call |
| `supabase/functions/_shared/bubbleSync.ts` | Core Bubble API | All Bubble API calls |

---

## Target Architecture

```
User Input (SelfListingPage)
    │
    ↓
listingService.js::createListing()
    │
    ├──→ 1. Call listing Edge Function (native)
    │         └─→ Validate data
    │         └─→ Upload photos to Supabase Storage
    │         └─→ Insert into `listing` table
    │         └─→ Associate with authenticated user
    │         └─→ Return listing with UUID
    │
    └──→ 2. Redirect to dashboard with UUID
```

---

## Phase 1: Listing Edge Function - CRUD Operations

### 1.1 Complete the `supabase/functions/listing/` Edge Function

**File**: `supabase/functions/listing/index.ts`

**Actions to implement**:

| Action | Purpose | Auth Required |
|--------|---------|---------------|
| `create` | Create new listing natively | Yes |
| `update` | Update existing listing | Yes (owner only) |
| `get` | Get listing by ID | No |
| `delete` | Soft delete listing | Yes (owner only) |
| `list_by_user` | Get all listings for a user | Yes |

**Handler structure**:
```
supabase/functions/listing/
├── index.ts                 # Main router
├── deno.json               # Import map
├── actions/
│   ├── create.ts           # Create listing handler
│   ├── update.ts           # Update listing handler
│   ├── get.ts              # Get listing handler
│   ├── delete.ts           # Soft delete handler
│   └── listByUser.ts       # List user's listings
└── lib/
    ├── types.ts            # TypeScript interfaces
    ├── validators.ts       # Input validation
    └── mappers.ts          # Form data → DB mapping
```

### 1.2 Database Schema Changes

**New columns for `listing` table**:
```sql
-- Add native Supabase columns
ALTER TABLE listing ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE listing ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE listing ADD COLUMN IF NOT EXISTS source text DEFAULT 'bubble'; -- 'bubble' or 'native'
ALTER TABLE listing ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE listing ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_listing_user_id ON listing(user_id);
CREATE INDEX IF NOT EXISTS idx_listing_source ON listing(source);
```

**RLS Policies for native listings**:
```sql
-- Users can only update their own listings
CREATE POLICY "Users can update own listings" ON listing
  FOR UPDATE USING (user_id = auth.uid());

-- Users can only delete their own listings
CREATE POLICY "Users can delete own listings" ON listing
  FOR DELETE USING (user_id = auth.uid());

-- Public read access for active listings
CREATE POLICY "Public read for active listings" ON listing
  FOR SELECT USING (Active = true);
```

### 1.3 Create Listing Handler Implementation

**Key responsibilities**:
1. Validate all required fields
2. Generate UUID for listing
3. Map frontend form data to database schema
4. Handle photo URLs (no upload, URLs already resolved)
5. Associate listing with authenticated user
6. Set initial status: `Active=false`, `Approved=false`, `Complete=true`
7. Return created listing with UUID

**Form Data → Database Mapping** (from `prepareListingSubmission.ts`):

| Form Field | Database Column |
|------------|-----------------|
| `spaceSnapshot.listingName` | `Name` |
| `spaceSnapshot.typeOfSpace` | `Features - Type of Space` |
| `spaceSnapshot.address.fullAddress` | `Location - Address` (JSONB) |
| `leaseStyles.rentalType` | `rental type` |
| `pricing.damageDeposit` | `💰Damage Deposit` |
| ... | (see `mapFormDataToDatabase` in listingService.js) |

---

## Phase 2: Photo Storage Migration

### 2.1 Create Supabase Storage Bucket

**Bucket**: `listing-photos`

```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-photos', 'listing-photos', true);

-- RLS policy: authenticated users can upload
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'listing-photos');

-- Public read access
CREATE POLICY "Public can view listing photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'listing-photos');
```

### 2.2 Photo Upload Handler

**File**: `supabase/functions/listing/actions/uploadPhotos.ts`

```typescript
// Upload flow:
// 1. Receive photo files (multipart/form-data) or base64
// 2. Validate file types (jpg, png, heic)
// 3. Generate unique filename: {listing_id}/{order}_{timestamp}.{ext}
// 4. Upload to Supabase Storage
// 5. Return public URLs
// 6. Update listing with photo URLs
```

### 2.3 Update Section6Photos Component

**Current**: Stores photos as base64 data URLs in localStorage
**Target**: Upload to Supabase Storage, store URLs

**Changes to `Section6Photos.tsx`**:
- Add upload function that calls listing Edge Function
- Show upload progress
- Store public URLs in form state
- Support drag-and-drop reordering (updates `displayOrder`)

---

## Phase 3: Frontend Service Updates

### 3.1 Update `listingService.js`

**Remove**:
- `syncListingToBubble()` function
- `syncToListingTable()` function (will be done server-side)

**Update `createListing()`**:
```javascript
export async function createListing(formData) {
  // Call native listing Edge Function
  const { data, error } = await supabase.functions.invoke('listing', {
    body: {
      action: 'create',
      payload: mapFormDataToPayload(formData)
    }
  });

  if (error) throw new Error(error.message);
  return data;
}
```

### 3.2 Update `prepareListingSubmission.ts`

**Changes**:
- Remove Bubble-specific field names (use snake_case)
- Map directly to Supabase column names
- Remove day indexing conversion (store 0-based internally)

### 3.3 Update `SelfListingPage.tsx`

**Changes**:
- Update success redirect to use `id` (UUID) instead of `_id`
- Remove Bubble-related error handling
- Update success modal URL generation

---

## Phase 4: User Association

### 4.1 Link Listings to Supabase Auth Users

**Authentication Flow**:
1. User fills form (Sections 1-6)
2. Section 7: Submit triggers auth check
3. If not logged in → show SignUpLoginModal
4. After auth → include user's JWT in Edge Function call
5. Edge Function extracts `user_id` from JWT
6. Listing created with `user_id` reference

**Edge Function Auth**:
```typescript
// In listing/actions/create.ts
const { data: { user }, error } = await supabase.auth.getUser();
if (!user) throw new AuthenticationError('Authentication required');

const listing = {
  ...payload,
  user_id: user.id,
  source: 'native'
};
```

### 4.2 Update Account Profile / Dashboard

**Changes needed**:
- Query listings by `user_id` instead of Bubble host account
- Update `ListingDashboardPage` to fetch from Supabase directly
- Support both `_id` (legacy) and `id` (native) listings

---

## Phase 5: Search & Discovery Integration

### 5.1 Update Search Queries

**File**: `app/src/islands/pages/useSearchPageLogic.js`

**Changes**:
- Query `listing` table directly for native listings
- Support both `_id` and `id` in URL parameters
- Filter by `source = 'native'` for new listings

### 5.2 Update View Listing Page

**File**: `app/src/islands/pages/useViewSplitLeasePageLogic.js`

**Changes**:
- Support lookup by both `id` (UUID) and `_id` (Bubble)
- Fetch from Supabase directly instead of bubble-proxy
- Handle legacy Bubble listings vs native listings

---

## Phase 6: Migration Utilities

### 6.1 Backward Compatibility

**Approach**: Dual-ID support
- Legacy listings: Keep `_id` as primary identifier
- New listings: Use `id` (UUID) as primary identifier
- Frontend routes support both: `/view-split-lease.html?listing_id=xxx`

**Detection logic**:
```javascript
function isUUID(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function fetchListing(listingId) {
  if (isUUID(listingId)) {
    return supabase.from('listing').select('*').eq('id', listingId).single();
  } else {
    return supabase.from('listing').select('*').eq('_id', listingId).single();
  }
}
```

### 6.2 Future: Migrate Existing Bubble Listings

**Out of scope for this phase**, but future migration would:
1. Generate UUIDs for existing listings
2. Associate with Supabase auth users (by email match)
3. Set `source = 'bubble'` to preserve history
4. Eventually deprecate `_id` field

---

## Implementation Order

### Sprint 1: Core Backend (Estimated: 3-5 days)
1. [ ] **Database migration**: Add `id`, `user_id`, `source` columns
2. [ ] **Storage bucket**: Create `listing-photos` bucket with policies
3. [ ] **listing Edge Function**: Implement `create`, `get`, `update` actions
4. [ ] **Validation**: Port validation from `prepareListingSubmission.ts`

### Sprint 2: Frontend Integration (Estimated: 3-4 days)
5. [ ] **Update listingService.js**: Remove Bubble sync, use native Edge Function
6. [ ] **Update SelfListingPage**: Success redirect with UUID
7. [ ] **Photo upload**: Implement Storage upload in Section6Photos
8. [ ] **Testing**: End-to-end listing creation flow

### Sprint 3: Search & Dashboard (Estimated: 2-3 days)
9. [ ] **Update search**: Query native listings
10. [ ] **Update view page**: Support UUID lookups
11. [ ] **Update dashboard**: Show user's native listings
12. [ ] **Testing**: Full user journey test

### Sprint 4: Polish & Cleanup (Estimated: 1-2 days)
13. [ ] **Error handling**: Improve error messages
14. [ ] **Cleanup**: Remove unused Bubble sync code
15. [ ] **Documentation**: Update CLAUDE.md files
16. [ ] **Monitoring**: Add logging for native vs Bubble listings

---

## Files to Modify

### New Files
- `supabase/functions/listing/actions/create.ts`
- `supabase/functions/listing/actions/update.ts`
- `supabase/functions/listing/actions/get.ts`
- `supabase/functions/listing/actions/delete.ts`
- `supabase/functions/listing/actions/uploadPhotos.ts`
- `supabase/functions/listing/lib/types.ts`
- `supabase/functions/listing/lib/validators.ts`
- `supabase/functions/listing/lib/mappers.ts`

### Modified Files
- `supabase/functions/listing/index.ts` - Complete router
- `supabase/config.toml` - Add listing function config
- `app/src/lib/listingService.js` - Native Supabase calls
- `app/src/islands/pages/SelfListingPage/store/prepareListingSubmission.ts` - Native field mapping
- `app/src/islands/pages/SelfListingPage/SelfListingPage.tsx` - Success redirect
- `app/src/islands/pages/SelfListingPage/sections/Section6Photos.tsx` - Storage upload
- `app/src/islands/pages/useViewSplitLeasePageLogic.js` - UUID support
- `app/src/islands/pages/useSearchPageLogic.js` - Query native listings

### SQL Migrations
- Add `id`, `user_id`, `source`, `created_at`, `updated_at` to `listing`
- Create RLS policies for user-owned listings
- Create `listing-photos` storage bucket

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data loss during migration | Low | High | Keep Bubble sync as fallback initially |
| Auth integration issues | Medium | Medium | Test auth flow thoroughly |
| Photo upload failures | Medium | Medium | Implement retry logic, client-side validation |
| Legacy listing compatibility | Medium | Medium | Dual-ID support, thorough testing |
| Performance degradation | Low | Low | Add indexes, monitor query times |

---

## Success Criteria

1. **New listings created without Bubble**: Complete listing creation flow works entirely in Supabase
2. **Photos stored in Supabase Storage**: No base64 URLs, proper CDN-backed photos
3. **User association works**: Listings correctly linked to authenticated users
4. **Backward compatible**: Existing Bubble listings still accessible
5. **Search works**: Native listings appear in search results
6. **Dashboard works**: Users see their native listings in dashboard

---

## Questions for Review

1. **Photo storage strategy**: Upload during Section 6 (per-photo) or batch at submission?
2. **User association**: Use Supabase Auth `user_id` or link to existing `user` table `_id`?
3. **Approval workflow**: Keep manual approval or auto-approve for verified users?
4. **Day indexing**: Store 0-based (JS native) or 1-based (Bubble compatible) in native listings?

---

**Plan Version**: 1.0
**Last Updated**: 2025-12-05
