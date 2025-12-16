# Listing Table Foreign Key Constraints Investigation

**Date**: 2025-12-16
**Purpose**: Document all FK constraints on the `listing` table to understand which columns require FK ID mapping instead of string values

---

## Foreign Key Constraints on `listing` Table

### Complete List of FK Constraints

| Constraint Name | Column Name | Foreign Table | Foreign Column | Notes |
|----------------|-------------|---------------|----------------|-------|
| `fk_listing_borough` | `Location - Borough` | `reference_table.zat_geo_borough_toplevel` | `_id` | Bubble ID format |
| `fk_listing_hood` | `Location - Hood` | `reference_table.zat_geo_hood_mediumlevel` | `_id` | Bubble ID format |
| `listing_Cancellation Policy_fkey` | `Cancellation Policy` | `reference_table.zat_features_cancellationpolicy` | `_id` | Bubble ID format |
| `listing_Features - Parking type_fkey` | `Features - Parking type` | `reference_table.zat_features_parkingoptions` | `_id` | Bubble ID format |
| `listing_Features - Secure Storage Option_fkey` | `Features - Secure Storage Option` | `reference_table.zat_features_storageoptions` | `_id` | Bubble ID format |
| `listing_Features - Type of Space_fkey` | `Features - Type of Space` | `reference_table.zat_features_listingtype` | `_id` | Bubble ID format |
| `listing_Kitchen Type_fkey` | `Kitchen Type` | `reference_table.os_kitchen_type` | `display` | **String FK** |
| `listing_Location - City_fkey` | `Location - City` | `reference_table.zat_location` | `_id` | Bubble ID format |
| `listing_Location - State_fkey` | `Location - State` | `reference_table.os_us_states` | `display` | **String FK** |
| `listing_rental type_fkey` | `rental type` | `reference_table.os_rental_type` | `display` | **String FK** |

---

## Reference Table Structures

### 1. Parking Options (`zat_features_parkingoptions`)
- **Primary Key**: `_id` (Bubble format: e.g., `1642428637379x970678957586007000`)
- **Display Field**: `Label`
- **Values**:
  - Street Parking
  - No Parking
  - Off-Street Parking
  - Attached Garage
  - Detached Garage
  - Nearby Parking Structure

### 2. Storage Options (`zat_features_storageoptions`)
- **Primary Key**: `_id` (Bubble format)
- **Display Fields**: `Title`, `Summary - Guest`, `Summary - Host`
- **Values**:
  - In the room
  - In a locked closet
  - In a suitcase

### 3. Listing Type (`zat_features_listingtype`)
- **Primary Key**: `_id` (Bubble format)
- **Display Fields**: `Label `, `Description`, `Icon`, `Level of control`
- **Values**:
  - Private Room (Level 2)
  - Entire Place (Level 3)
  - Shared Room (Level 1)
  - All Spaces (Level null)

### 4. Cancellation Policy (`zat_features_cancellationpolicy`)
- **Primary Key**: `_id` (Bubble format)
- **Display Field**: `Display`
- **Values**:
  - After First-Time Arrival
  - Prior to First-Time Arrival
  - Standard
  - Additional Host Restrictions

### 5. Borough (`zat_geo_borough_toplevel`)
- **Primary Key**: `_id` (Bubble format)
- **Display Field**: `Display Borough`
- **Values**:
  - Manhattan
  - Bronx
  - Queens
  - Bergen County NJ
  - Hudson County NJ
  - Essex County NJ
  - Brooklyn

### 6. Neighborhood (`zat_geo_hood_mediumlevel`)
- **Primary Key**: `_id` (Bubble format)
- **Display Field**: `Display`
- **Has**: `Neighborhood Description`, `Zips`, `Geo-Borough`, `Geo-City`
- **Examples**: Long Island City, Rockaways, Carnegie Hill, Bay Ridge, etc.

### 7. City (`zat_location`)
- **Primary Key**: `_id` (Bubble format)
- **Display Fields**: `cityName`, `Short Name`
- **Values**:
  - New York City (NY)
  - Brooklyn, NY (BK)
  - Queens (QB)
  - Bronx (Bx)
  - Bergen County (Bergen)

### 8. Kitchen Type (`os_kitchen_type`) - **STRING FK**
- **Primary Key**: `id` (integer)
- **FK Column**: `display` (string)
- **Values**:
  - "Full Kitchen"
  - "Kitchenette"
  - "No Kitchen"
  - "Kitchen Not Accessible"

### 9. US States (`os_us_states`) - **STRING FK**
- **Primary Key**: `id` (integer)
- **FK Column**: `display` (string)
- **Values**: All 50 US states by display name (e.g., "New York", "California", etc.)

### 10. Rental Type (`os_rental_type`) - **STRING FK**
- **Primary Key**: `id` (integer)
- **FK Column**: `display` (string)
- **Values**:
  - "Nightly"
  - "Weekly"
  - "Monthly"

---

## Key Findings

### ID-Based FKs (Bubble Format)
Most FK constraints use Bubble's `_id` format (e.g., `1642428637379x970678957586007000`). These require:
- Looking up the ID from the reference table using display values
- Storing the Bubble ID string in the listing table

**Columns requiring Bubble ID lookup**:
1. `Location - Borough`
2. `Location - Hood`
3. `Cancellation Policy`
4. `Features - Parking type`
5. `Features - Secure Storage Option`
6. `Features - Type of Space`
7. `Location - City`

### String-Based FKs
Three FK constraints use the `display` field directly as the foreign key. These can use string values directly:

**Columns using string values**:
1. `Kitchen Type` → uses display strings like "Full Kitchen"
2. `Location - State` → uses display strings like "New York"
3. `rental type` → uses display strings like "Nightly"

---

## Impact on Listing Creation

When creating listings from the frontend, the code must:

1. **For ID-based FKs**: Query reference tables to get the `_id` value
2. **For String-based FKs**: Use the display string directly

### Example Mapping Flow

```javascript
// ID-based FK (requires lookup)
const parkingLabel = "Street Parking";
const parkingOption = await queryReferenceTable('zat_features_parkingoptions', { Label: parkingLabel });
listingData['Features - Parking type'] = parkingOption._id; // "1642428637379x970678957586007000"

// String-based FK (direct assignment)
listingData['Kitchen Type'] = "Full Kitchen"; // No lookup needed
listingData['Location - State'] = "New York"; // No lookup needed
listingData['rental type'] = "Nightly"; // No lookup needed
```

---

## Related Files

- **Frontend**: `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\AccountProfilePage\useAccountProfilePageLogic.js`
- **Edge Function**: `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\supabase\functions\account-listing\handlers\create.ts`
- **Database Schema**: FK constraints on `public.listing` table

---

## Recommendations

1. **Create Reference Data Lookup Utilities**: Build helper functions to query reference tables by display values and return IDs
2. **Validation**: Ensure all ID-based FK fields receive valid Bubble IDs before insertion
3. **Error Handling**: Handle cases where reference data might not exist
4. **Caching**: Consider caching reference table data to reduce query overhead
