# Photo Upload Bug - Root Cause Analysis Report

**Date:** 2026-01-16
**Severity:** High (Feature completely non-functional)
**Time to Diagnose:** ~45 minutes
**Time to Fix:** ~30 minutes
**Tag:** `fix/listing-dashboard-photo-upload`

---

## Executive Summary

The "Add Photos" button on the Listing Dashboard page was completely non-functional due to **two independent issues**:

1. **Code Regression** - A partial refactor broke the PhotosSection component's props
2. **Infrastructure Gap** - Supabase Storage bucket was inaccessible due to missing RLS policies

These issues compounded to create a confusing debugging experience where even after fixing the code, the feature still failed due to infrastructure problems.

---

## Issue #1: Code Regression (PhotosSection Context Migration)

### What Happened

On **January 16, 2026**, an automated refactor (commit `9d704cf8`) introduced a React Context pattern to eliminate prop drilling in the ListingDashboardPage. However, the refactor was **incomplete**:

| Component | Context Updated? | Props Removed from Parent? | Result |
|-----------|------------------|---------------------------|--------|
| NavigationHeader | ✅ Yes | ✅ Yes | Working |
| AlertBanner | ✅ Yes | ✅ Yes | Working |
| ActionCardGrid | ✅ Yes | ✅ Yes | Working |
| PropertyInfoSection | ✅ Yes | ✅ Yes | Working |
| DescriptionSection | ✅ Yes | ✅ Yes | Working |
| **PricingSection** | ❌ No | ✅ Yes | **BROKEN** |
| **PhotosSection** | ❌ No | ✅ Yes | **BROKEN** |
| RulesSection | ❌ No | ✅ Yes | At Risk |
| AmenitiesSection | ❌ No | ✅ Yes | At Risk |
| DetailsSection | ❌ No | ✅ Yes | At Risk |
| AvailabilitySection | ❌ No | ✅ Yes | At Risk |
| CancellationPolicySection | ❌ No | ✅ Yes | At Risk |

### Root Cause

```jsx
// BEFORE refactor - PhotosSection received props
<PhotosSection
  listing={listing}
  onAddPhotos={() => handleEditSection('photos')}
  onDeletePhoto={handleDeletePhoto}
  ...
/>

// AFTER refactor - Props removed but component still expected them
<PhotosSection />  // listing=undefined, onAddPhotos=undefined
```

When `onAddPhotos` was `undefined`, clicking "Add Photos" did nothing (no error, silent failure).

### Why This Wasn't Caught

1. **No runtime errors** - JavaScript silently handles `undefined` function calls when guarded
2. **No TypeScript** - PropTypes would have warned about missing required props
3. **Build verified, no visual test** - Commit message indicates automated process without E2E testing
4. **Large batch commit** - 10 "chunks" implemented in one commit made review difficult

---

## Issue #2: Function Signature Mismatch

### What Happened

After fixing PhotosSection, photo uploads still failed with:
```
Could not find the '0' column of 'listing' in the schema cache
```

### Root Cause

Two different `updateListing` signatures existed:

| Location | Signature | Expectation |
|----------|-----------|-------------|
| `useListingData.js` | `updateListing(updates)` | Has `listingId` in closure |
| `EditListingDetails` | `updateListing(id, updates)` | Expects ID as first arg |

When `EditListingDetails` called `updateListing(listing._id, updates)`, the string `listing._id` was passed as the `updates` parameter. Iterating over a string spreads it into `{0: 'char1', 1: 'char2', ...}`.

### Why This Wasn't Caught

1. **Different code paths** - PricingEditSection uses a wrapper, EditListingDetails didn't
2. **No TypeScript** - Type checking would catch signature mismatches
3. **Error message was misleading** - "Column '0' not found" doesn't obviously point to string spreading

---

## Issue #3: Supabase Storage Infrastructure Gap

### What Happened

Even after code fixes, uploads failed with `StorageApiError: Bucket not found`.

### Root Cause Analysis

#### Production Environment (`supabase-live`)
- Bucket `listing-photos` existed (created 2025-11-27)
- **Missing:** RLS policy on `storage.buckets` table to allow clients to see public buckets
- Result: Bucket existed but was invisible to the Supabase client

#### Development Environment (`supabase-dev`)
- **Missing:** Bucket `listing-photos` entirely
- **Missing:** All storage policies
- Result: Complete infrastructure gap

### Comparison of Environments

| Resource | Production | Development | Gap |
|----------|------------|-------------|-----|
| `listing-photos` bucket | ✅ Exists | ❌ Missing (now fixed) | Created during debug |
| `profile-photos` bucket | ✅ Exists | ❌ Missing | **Still missing** |
| `rental-applications` bucket | ✅ Exists | ❌ Missing | **Still missing** |
| Bucket visibility policy | ❌ Was missing | ❌ Was missing | Both fixed |
| Object policies for listing-photos | ✅ 4 policies | ✅ 4 policies | Now synced |
| Object policies for profile-photos | ✅ 4 policies | ❌ Missing | **Not synced** |
| Object policies for rental-applications | ✅ 4 policies | ❌ Missing | **Not synced** |

### Why Infrastructure Drifted

1. **No Infrastructure-as-Code** - Buckets/policies created manually via Supabase Dashboard
2. **No migration scripts** - Storage configuration not tracked in `supabase/migrations/`
3. **No sync verification** - No automated check that dev matches prod
4. **Manual feature development** - Storage buckets added incrementally as features were built

---

## Timeline of Events

| Date | Event | Impact |
|------|-------|--------|
| 2025-11-27 | `listing-photos` bucket created in production | Feature works in prod |
| 2025-12-05 | `photoUpload.js` added (commit `8aa0a1a4`) | Code expects bucket |
| 2025-12-15 | `profile-photos` bucket created in production | Not in dev |
| 2025-12-23 | `rental-applications` bucket created in production | Not in dev |
| 2026-01-16 03:06 | AUTO refactor removes props from PhotosSection | **Feature broken** |
| 2026-01-16 ~16:00 | Bug reported - "Add Photos does nothing" | Investigation begins |
| 2026-01-16 ~16:30 | PhotosSection fixed to use context | Partial fix |
| 2026-01-16 ~16:45 | "Bucket not found" error discovered | Infrastructure issue |
| 2026-01-16 ~17:00 | Bucket policies added to production | Prod fixed |
| 2026-01-16 ~17:15 | Bucket + policies created in development | Dev fixed |
| 2026-01-16 ~17:30 | "Column 0 not found" error discovered | Signature mismatch |
| 2026-01-16 ~17:45 | updateListing wrapper added | **Fully fixed** |

---

## What's Still Missing in Development

### Buckets to Create

```sql
-- profile-photos bucket (for user avatars)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('profile-photos', 'profile-photos', true, 5242880,
        ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

-- rental-applications bucket (for private documents)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('rental-applications', 'rental-applications', false, 10485760,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
```

### Policies to Create (8 total)

For `profile-photos`:
- Public read access
- Authenticated user upload (own folder)
- Authenticated user update (own folder)
- Authenticated user delete (own folder)

For `rental-applications`:
- User can view own files
- User can upload own files
- User can delete own files
- Service role has full access

---

## Recommendations

### Immediate Actions

1. **Complete PhotosSection-like migrations** for remaining components:
   - RulesSection
   - AmenitiesSection
   - DetailsSection
   - AvailabilitySection
   - CancellationPolicySection

2. **Create missing buckets/policies in development** using SQL above

3. **Add PropTypes validation** to catch missing props at runtime:
   ```javascript
   PhotosSection.propTypes = {
     listing: PropTypes.object.isRequired,
     onAddPhotos: PropTypes.func.isRequired,
   };
   ```

### Process Improvements

1. **Infrastructure-as-Code for Storage**
   - Track bucket creation in `supabase/migrations/`
   - Include RLS policies in migrations
   - Run migrations on both dev and prod

2. **Automated Refactoring Safeguards**
   - Require E2E tests for large refactors
   - Split large refactors into smaller, testable commits
   - Add automated component prop validation

3. **Environment Parity Checks**
   - Create a script to compare dev vs prod storage configuration
   - Run before deployments
   - Alert on drift

4. **Context Migration Pattern**
   - Document the context pattern for new developers
   - Create a checklist for context migrations
   - Consider a codemod for consistent application

---

## Files Referenced

- [PhotosSection.jsx](../../../app/src/islands/pages/ListingDashboardPage/components/PhotosSection.jsx)
- [ListingDashboardPage.jsx](../../../app/src/islands/pages/ListingDashboardPage/ListingDashboardPage.jsx)
- [ListingDashboardContext.jsx](../../../app/src/islands/pages/ListingDashboardPage/context/ListingDashboardContext.jsx)
- [useListingData.js](../../../app/src/islands/pages/ListingDashboardPage/hooks/useListingData.js)
- [useEditListingDetailsLogic.js](../../../app/src/islands/shared/EditListingDetails/useEditListingDetailsLogic.js)
- [photoUpload.js](../../../app/src/lib/photoUpload.js)

## Commits Referenced

| Commit | Description |
|--------|-------------|
| `9d704cf8` | AUTO refactor that broke PhotosSection (Jan 16, 2026) |
| `940a1cbb` | Fix: PhotosSection migrated to context |
| `f8ec9ec3` | Fix: updateListing signature adapter |
| `8aa0a1a4` | Original: photoUpload.js added (Dec 5, 2025) |

## Tags

- `fix/listing-dashboard-photo-upload` - Marks the completion of all fixes
