# Analysis: get_host_listings RPC Function Return Fields

**Date**: 2025-12-16
**Status**: Analysis Complete

---

## Summary

The `get_host_listings` RPC function returns listings from both `listing_trial` and `listing` tables but **does NOT include** several fields required by the ListingsCard component, specifically:
- Bedroom count
- Bathroom count
- Hood/Neighborhood information

These fields exist in the database tables but are not included in the function's return signature.

---

## Function Return Signature

The `get_host_listings(host_user_id text)` function returns:

| Field Name | Data Type | Source Column | Notes |
|------------|-----------|---------------|-------|
| `id` | text | `listing_trial.id` or `listing._id` | Cast to TEXT |
| `_id` | text | `_id` | Primary identifier |
| `Name` | text | `Name` | Listing name |
| `Created By` | text | `Created By` | User who created listing |
| `Host / Landlord` | text | `Host / Landlord` | Host user ID |
| `Complete` | boolean | `Complete` | Completion status |
| `Location - Borough` | text | `Location - Borough` | Borough/Region |
| `Location - City` | text | `Location - City` | City |
| `Location - State` | text | `Location - State` | State |
| `Features - Photos` | jsonb | `Features - Photos` | Photo array |
| `rental_type` | text | `rental type` | Type of rental |
| `min_nightly` | numeric | `Standarized Minimum Nightly Price (Filter)` | Minimum nightly rate |
| `rate_2_nights` | numeric | `💰Nightly Host Rate for 2 nights` | 2-night rate |
| `rate_3_nights` | numeric | `💰Nightly Host Rate for 3 nights` | 3-night rate |
| `rate_4_nights` | numeric | `💰Nightly Host Rate for 4 nights` | 4-night rate |
| `rate_5_nights` | numeric | `💰Nightly Host Rate for 5 nights` | 5-night rate |
| `rate_7_nights` | numeric | `💰Nightly Host Rate for 7 nights` | 7-night rate |
| `weekly_rate` | numeric | `💰Weekly Host Rate` | Weekly rate |
| `monthly_rate` | numeric | `💰Monthly Host Rate` | Monthly rate |
| `cleaning_fee` | numeric | `💰Cleaning Cost / Maintenance Fee` | Cleaning fee |
| `damage_deposit` | numeric | `💰Damage Deposit` | Damage deposit |
| `nightly_pricing` | jsonb | `nightly_pricing` | Nightly pricing JSON (listing_trial only) |
| `source` | text | Literal: 'listing_trial' or 'listing' | Source table indicator |

---

## Missing Fields (Available in Tables but Not Returned)

These fields **exist in both tables** but are **NOT included** in the function return:

| Required by ListingsCard | Database Column Name | Data Type |
|--------------------------|----------------------|-----------|
| `Qty of Bedrooms` | `Features - Qty Bedrooms` | integer |
| `Qty of Bathrooms` | `Features - Qty Bathrooms` | numeric |
| `hood` | `Location - Hood` | text |

Additional related columns available:
- `Location - Hoods (new)` (jsonb) - Array of hoods
- `Description - Neighborhood` (text)
- `neighborhood (manual input by user)` (text)

---

## ListingsCard Component Requirements

The component expects this mapping (from `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\pages\Host\Listings\components\ListingsCard.jsx`):

```javascript
{
  _id: string,
  Name: string,
  'Borough/Region': string,
  hood: string,
  'Qty of Bedrooms': number,
  'Qty of Bathrooms': number,
  'Start Nightly Price': number,
  listing_photo: Array<{url: string, Order: number}>
}
```

---

## Current Field Mapping Issues

### Available from RPC:
- `_id` → ✅ Available
- `Name` → ✅ Available
- `Location - Borough` → ✅ Available (maps to 'Borough/Region')
- `min_nightly` → ✅ Available (maps to 'Start Nightly Price')
- `Features - Photos` → ✅ Available (maps to 'listing_photo')

### **MISSING from RPC:**
- ❌ `Features - Qty Bedrooms` (needed for 'Qty of Bedrooms')
- ❌ `Features - Qty Bathrooms` (needed for 'Qty of Bathrooms')
- ❌ `Location - Hood` (needed for 'hood')

---

## Recommended Solutions

### Option 1: Update RPC Function (Recommended)
Modify `get_host_listings` to include the missing fields:

```sql
CREATE OR REPLACE FUNCTION public.get_host_listings(host_user_id text)
RETURNS TABLE(
  id text,
  _id text,
  "Name" text,
  "Created By" text,
  "Host / Landlord" text,
  "Complete" boolean,
  "Location - Borough" text,
  "Location - City" text,
  "Location - State" text,
  "Location - Hood" text,  -- ADD THIS
  "Features - Photos" jsonb,
  "Features - Qty Bedrooms" integer,  -- ADD THIS
  "Features - Qty Bathrooms" numeric,  -- ADD THIS
  rental_type text,
  min_nightly numeric,
  rate_2_nights numeric,
  rate_3_nights numeric,
  rate_4_nights numeric,
  rate_5_nights numeric,
  rate_7_nights numeric,
  weekly_rate numeric,
  monthly_rate numeric,
  cleaning_fee numeric,
  damage_deposit numeric,
  nightly_pricing jsonb,
  source text
)
```

Then update both SELECT statements to include:
- `lt."Location - Hood"` / `l."Location - Hood"`
- `lt."Features - Qty Bedrooms"` / `l."Features - Qty Bedrooms"`
- `lt."Features - Qty Bathrooms"` / `l."Features - Qty Bathrooms"`

### Option 2: Frontend Workaround (Not Recommended)
Display placeholders or "N/A" for missing fields. This is not ideal as the data exists in the database.

---

## Impact Assessment

### Current Behavior:
The ListingsCard component will display:
- ✅ Listing name
- ✅ Borough/Region
- ❌ Hood (undefined/missing)
- ❌ Bedroom count (undefined/missing)
- ❌ Bathroom count (undefined/missing)
- ✅ Starting price
- ✅ Photos

This results in incomplete listing cards that cannot properly inform hosts about their property details.

---

## Next Steps

1. **Update the RPC function** to include the three missing fields
2. **Apply migration** using `mcp__supabase__apply_migration`
3. **Update frontend mapping** in `useListingsPageLogic.js` to handle the new fields
4. **Test** with actual host data to verify all fields display correctly

---

## Referenced Files

- **RPC Function**: `public.get_host_listings` (PostgreSQL function)
- **Frontend Component**: `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\pages\Host\Listings\components\ListingsCard.jsx`
- **Frontend Logic**: `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\pages\Host\Listings\logic\useListingsPageLogic.js`
- **Database Tables**: `listing_trial`, `listing`
