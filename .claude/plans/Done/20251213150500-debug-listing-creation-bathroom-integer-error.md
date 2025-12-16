# Debug Analysis: Listing Creation Failure - Invalid Integer for Bathroom Count

**Created**: 2025-12-13 15:05:00
**Status**: Analysis Complete - Pending Implementation
**Severity**: High
**Affected Area**: SelfListingPageV2 / Listing Creation Flow

## 1. System Context (From Onboarding)

### 1.1 Architecture Understanding
- **Architecture Pattern**: Islands Architecture with Hollow Components
- **Tech Stack**: React 18 (TypeScript), Supabase (PostgreSQL), Cloudflare Pages
- **Data Flow**:
  - SelfListingPageV2 (form) -> mapFormDataToListingService() -> createListing() -> listingService.js -> Supabase `listing` table insert

### 1.2 Domain Context
- **Feature Purpose**: Self-service listing creation wizard for hosts to create rental listings
- **Related Documentation**:
  - `.claude/Documentation/Pages/SELF_LISTING_QUICK_REFERENCE.md`
  - `.claude/plans/Done/DATABASE_SCHEMA_OVERVIEW.md`
- **Data Model**:
  - `listing` table in Supabase (93 tables total)
  - Key columns: `Features - Qty Bathrooms` (INTEGER), `Features - Qty Bedrooms` (INTEGER), `Features - Qty Beds` (INTEGER)

### 1.3 Relevant Conventions
- **Key Patterns**:
  - Four-layer logic (calculators -> rules -> processors -> workflows)
  - Direct Supabase inserts via listingService.js
  - Form data mapping in mapFormDataToListingService()
- **Layer Boundaries**:
  - Frontend form collects data as strings from `<select>` elements
  - listingService.js maps form data to database columns
  - Database enforces INTEGER type for bathroom count

### 1.4 Entry Points & Dependencies
- **User/Request Entry Point**: `/self-listing-v2` page
- **Critical Path**:
  1. User fills form (Step 6 - Space & Time)
  2. User clicks "Activate Listing" (Step 8)
  3. handleSubmit() -> mapFormDataToListingService() -> createListing()
  4. createListing() calls Supabase insert
- **Dependencies**:
  - `app/src/lib/listingService.js`
  - `app/src/islands/pages/SelfListingPageV2/SelfListingPageV2.tsx`
  - Supabase `listing` table

## 2. Problem Statement

When a user creates a listing via the SelfListingPageV2 wizard and selects "1.5" as the bathroom count, the listing creation fails with the error:

```
invalid input syntax for type integer: "1.5"
```

The error occurs at listingService.js line 103 during the Supabase insert operation. The account creation succeeds, but the listing creation fails because:

1. The form allows decimal bathroom values ("1.5" for 1.5 bathrooms / half bath)
2. The database column `Features - Qty Bathrooms` is defined as INTEGER
3. The value is passed directly without conversion to an integer

## 3. Reproduction Context

- **Environment**: Production and development
- **Steps to reproduce**:
  1. Navigate to `/self-listing-v2`
  2. Complete steps 1-5 of the wizard
  3. On Step 6 (Space & Time), select "1.5" from the Bathrooms dropdown
  4. Complete Step 7 (Photos - optional)
  5. Click "Activate Listing" on Step 8 (Review)
- **Expected behavior**: Listing should be created successfully with 1.5 bathrooms stored appropriately
- **Actual behavior**: Error thrown: `invalid input syntax for type integer: "1.5"`
- **Error messages/logs**:
  - `[ListingService] Error creating listing in Supabase: {code: "22P02", message: "invalid input syntax for type integer: \"1.5\""}`
  - Caught at SelfListingPageV2.tsx line 812

## 4. Investigation Summary

### 4.1 Files Examined

| File | Relevance |
|------|-----------|
| `app/src/islands/pages/SelfListingPageV2/SelfListingPageV2.tsx` | Main form component - defines bathroom dropdown options |
| `app/src/lib/listingService.js` | Service layer - maps form data to DB columns and performs insert |
| `DATABASE_SCHEMA_OVERVIEW.md` | Documents the listing table schema |
| Supabase `listing` table schema | Confirms `Features - Qty Bathrooms` is INTEGER |

### 4.2 Execution Flow Trace

1. **SelfListingPageV2.tsx (Step 6 - Space & Time)**
   - Lines 1410-1421: Bathroom dropdown with options: `"1"`, `"1.5"`, `"2"`, `"Shared"`
   - Value stored in `formData.bathrooms` as string type

2. **SelfListingPageV2.tsx (handleSubmit - line 785-817)**
   - Line 804: `mapFormDataToListingService(formData)` called
   - Line 805: `createListing(listingData)` called

3. **SelfListingPageV2.tsx (mapFormDataToListingService - lines 820-941)**
   - **Line 860**: `bathrooms: data.bathrooms === 'Shared' ? 1 : parseFloat(data.bathrooms) || 1,`
   - The bathroom value is converted to float but NOT to integer
   - "1.5" becomes `1.5` (float)

4. **listingService.js (mapFormDataToListingTable - lines 194-315)**
   - **Line 223**: `'Features - Qty Bathrooms': formData.spaceSnapshot?.bathrooms || null,`
   - The value `1.5` is passed directly to the database column

5. **listingService.js (createListing - lines 96-105)**
   - **Line 98**: `.insert(listingData)` - Supabase insert fails
   - **Line 102-103**: Error caught and logged

### 4.3 Git History Analysis

No recent commits appear to have modified the bathroom handling logic. The issue likely existed since the SelfListingPageV2 was implemented. The form allows "1.5" as a valid option, but the database schema was not updated to accommodate decimal values.

## 5. Hypotheses

### Hypothesis 1: Type Mismatch - Form Float vs DB Integer (Likelihood: 95%)

**Theory**: The bathroom value "1.5" is parsed as a float (1.5) but the database column `Features - Qty Bathrooms` is defined as INTEGER, causing PostgreSQL to reject the insert.

**Supporting Evidence**:
1. Database schema query confirms `Features - Qty Bathrooms` is `integer` type
2. Form dropdown explicitly includes "1.5" as an option (line 1418)
3. `parseFloat()` is used (line 860) which preserves decimal values
4. Error message explicitly states `invalid input syntax for type integer: "1.5"`

**Contradicting Evidence**: None

**Verification Steps**:
1. Confirm by selecting "1" or "2" bathrooms - should succeed
2. Select "1.5" - should fail with the reported error

**Potential Fixes**:
- **Option A (Quick Fix)**: Convert bathroom value to integer using `Math.floor()` or `Math.round()` before insert
- **Option B (Better UX)**: Change database column to `numeric` or `decimal` type to support half-baths
- **Option C (Hybrid)**: Store as integer (1, 2, 3...) but display as "1", "1.5", "2" using a mapping

**Convention Check**: The current implementation violates the principle that form data should be validated/transformed at the service layer boundary before database operations.

### Hypothesis 2: Missing Data Transformation in Service Layer (Likelihood: 90%)

**Theory**: The listingService.js `mapFormDataToListingTable` function does not properly transform the bathroom value from the form format to the database format.

**Supporting Evidence**:
1. Line 223 in listingService.js passes the value directly without transformation
2. Other fields like `bedrooms` use `parseInt()` in mapFormDataToListingService (line 858)
3. The bathroom field uniquely has decimal options in the form

**Contradicting Evidence**: None - this is really the same root cause as Hypothesis 1, just at a different layer.

**Verification Steps**: Same as Hypothesis 1

**Potential Fix**: Add `Math.floor()` or `parseInt()` transformation in listingService.js line 223

### Hypothesis 3: Form Options Don't Match Database Constraints (Likelihood: 85%)

**Theory**: The form UI was designed without considering database constraints, allowing values that cannot be stored.

**Supporting Evidence**:
1. Form options include "1.5" and "Shared" which are not integers
2. "Shared" is handled with a special case (mapped to 1), but "1.5" is not

**Contradicting Evidence**: None

**Verification Steps**: Review all form options against database column types

**Potential Fix**: Either change form options to integers only, or update database schema

## 6. Recommended Action Plan

### Priority 1 (Try First) - Quick Fix: Floor the Bathroom Value

**Location**: `app/src/islands/pages/SelfListingPageV2/SelfListingPageV2.tsx`
**Line**: 860

**Current Code**:
```typescript
bathrooms: data.bathrooms === 'Shared' ? 1 : parseFloat(data.bathrooms) || 1,
```

**Proposed Fix**:
```typescript
bathrooms: data.bathrooms === 'Shared' ? 1 : Math.floor(parseFloat(data.bathrooms)) || 1,
```

**Rationale**: This is the quickest fix with minimal risk. `Math.floor(1.5)` = 1, which is a reasonable interpretation (1 full bathroom + half bath = 1 full bath for database purposes).

**Alternative Quick Fix**: Use `Math.round()` instead:
```typescript
bathrooms: data.bathrooms === 'Shared' ? 1 : Math.round(parseFloat(data.bathrooms)) || 1,
```
This would make "1.5" become 2 bathrooms.

### Priority 2 (If Business Wants Half-Bath Support) - Database Schema Change

**Location**: Supabase `listing` table

**Migration**:
```sql
ALTER TABLE listing
ALTER COLUMN "Features - Qty Bathrooms" TYPE numeric(3,1);
```

**Rationale**: This allows storing 1.5, 2.5, etc. for properties with half bathrooms.

**Additional Changes Required**:
- Update any queries/filters that expect integer values
- Update display logic to show "1.5 Bath" appropriately

### Priority 3 (For Consistency) - Add Validation in listingService.js

**Location**: `app/src/lib/listingService.js`
**Line**: 223

**Current Code**:
```javascript
'Features - Qty Bathrooms': formData.spaceSnapshot?.bathrooms || null,
```

**Proposed Fix**:
```javascript
'Features - Qty Bathrooms': formData.spaceSnapshot?.bathrooms
  ? Math.floor(Number(formData.spaceSnapshot.bathrooms))
  : null,
```

**Rationale**: This adds a safety layer at the service boundary, ensuring that even if form data is malformed, the service layer produces valid database values.

## 7. Prevention Recommendations

1. **Type Validation at Form Submission**: Add Zod or similar validation schema that checks numeric fields match database constraints before calling service functions.

2. **Database-Aware Form Options**: When creating form dropdowns for database fields, verify the allowed values match the database column type/constraints.

3. **Service Layer Guards**: The listingService.js should explicitly validate/transform data types before insert operations, not rely on form-side transformations.

4. **Integration Tests**: Add tests that attempt to create listings with edge-case values (1.5 bathrooms, "Shared", etc.) to catch type mismatches early.

5. **Documentation**: Add comments in form components noting which fields have database type constraints (e.g., "// Note: DB column is INTEGER, half-baths will be floored").

## 8. Related Files Reference

| File | Line(s) | Action |
|------|---------|--------|
| `app/src/islands/pages/SelfListingPageV2/SelfListingPageV2.tsx` | 860 | **FIX**: Change `parseFloat()` to `Math.floor(parseFloat())` |
| `app/src/islands/pages/SelfListingPageV2/SelfListingPageV2.tsx` | 1410-1421 | **REVIEW**: Consider removing "1.5" option or documenting behavior |
| `app/src/lib/listingService.js` | 223 | **FIX**: Add numeric conversion/floor |
| `app/src/lib/listingService.js` | 447 | **FIX**: Same issue exists in `mapFormDataToListingTableForUpdate` |
| `app/src/lib/listingService.js` | 709 | **FIX**: Same issue in deprecated `mapFormDataToDatabase` |
| `app/src/lib/listingService.js` | 893 | **FIX**: In `mapDatabaseToFormData`, ensure reverse mapping handles integers |
| Supabase `listing` table | Column `Features - Qty Bathrooms` | **ALTERNATIVE**: Change to `numeric(3,1)` if business needs half-bath support |

---

## Summary

**Root Cause**: The SelfListingPageV2 form allows "1.5" as a bathroom count option, which is parsed as a float. However, the Supabase `listing` table defines `Features - Qty Bathrooms` as an INTEGER column, causing the insert to fail with "invalid input syntax for type integer".

**Recommended Quick Fix**: Add `Math.floor()` around the `parseFloat()` call on line 860 of SelfListingPageV2.tsx to convert 1.5 to 1 before database insert.

**Business Decision Needed**: Does the product need to support half-bathrooms (1.5, 2.5)? If yes, change the database column type. If no, either floor the values or remove non-integer options from the form.
