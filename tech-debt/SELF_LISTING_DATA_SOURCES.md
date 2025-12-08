# Self-Listing Page Data Sources Reference

**Created**: 2025-12-06
**Purpose**: Document all data sources for selection fields in the Self-Listing page, including the Edge Function that creates listings in both Supabase and Bubble.

---

## Table of Contents

1. [Edge Function: Listing Creation](#edge-function-listing-creation)
2. [Selection Fields Data Sources](#selection-fields-data-sources)
3. [Hardcoded Constants Reference](#hardcoded-constants-reference)
4. [Supabase Tables Used](#supabase-tables-used)
5. [Tech Debt: Dual Data Sources](#tech-debt-dual-data-sources)

---

## Edge Function: Listing Creation

### Location
`supabase/functions/bubble-proxy/handlers/submitListing.ts`

### Bubble Workflow
`listing_full_submission_in_code`

### Flow
1. Update listing in Bubble with all fields (REQUIRED)
2. Attach user to listing via `user_email` or `user_id` (REQUIRED)
3. Fetch updated listing data from Bubble (REQUIRED)
4. Sync to Supabase replica (BEST EFFORT)
5. Return listing data to client

### Complete Field List

#### Required Identifiers
| Field | Type | Description |
|-------|------|-------------|
| `listing_id` | string | The listing ID from initial creation |
| `user_email` | string | User's email address |
| `user_unique_id` | string (optional) | Bubble user unique ID from signup |

#### Basic Info
| Field | Type |
|-------|------|
| `Name` | string |
| `Type of Space` | string |
| `Bedrooms` | number |
| `Beds` | number |
| `Bathrooms` | number |
| `Type of Kitchen` | string |
| `Type of Parking` | string |

#### Address
| Field | Type |
|-------|------|
| `Address` | string |
| `Street Number` | string |
| `Street` | string |
| `City` | string |
| `State` | string |
| `Zip` | string |
| `Neighborhood` | string |
| `Latitude` | number (nullable) |
| `Longitude` | number (nullable) |

#### Amenities
| Field | Type |
|-------|------|
| `Amenities Inside Unit` | string[] |
| `Amenities Outside Unit` | string[] |

#### Descriptions
| Field | Type |
|-------|------|
| `Description of Lodging` | string |
| `Neighborhood Description` | string |

#### Lease Style
| Field | Type |
|-------|------|
| `Rental Type` | string |
| `Available Nights` | string[] (e.g., `['sunday', 'monday']`) |
| `Weekly Pattern` | string |

#### Pricing
| Field | Type |
|-------|------|
| `Damage Deposit` | number (default: 500) |
| `Maintenance Fee` | number |
| `Monthly Compensation` | number (nullable) |
| `Weekly Compensation` | number (nullable) |
| `Price 1 night selected` | number (nullable) |
| `Price 2 nights selected` | number (nullable) |
| `Price 3 nights selected` | number (nullable) |
| `Price 4 nights selected` | number (nullable) |
| `Price 5 nights selected` | number (nullable) |
| `Nightly Decay Rate` | number (nullable) |

#### Rules
| Field | Type |
|-------|------|
| `Cancellation Policy` | string |
| `Preferred Gender` | string (default: 'No Preference') |
| `Number of Guests` | number (default: 2) |
| `Check-In Time` | string |
| `Check-Out Time` | string |
| `Ideal Min Duration` | number (default: 6) |
| `Ideal Max Duration` | number (default: 52) |
| `House Rules` | string[] |
| `Blocked Dates` | string[] (ISO date strings) |

#### Safety & Review
| Field | Type |
|-------|------|
| `Safety Features` | string[] |
| `Square Footage` | number (nullable) |
| `First Day Available` | string |
| `Previous Reviews Link` | string |
| `Optional Notes` | string |

#### Status
| Field | Type |
|-------|------|
| `Status` | string (default: 'Pending Review') |
| `Is Draft` | boolean (default: false) |

---

## Selection Fields Data Sources

### Summary Table

| Field | UI Checkbox Options | "Load Common" Button |
|-------|---------------------|---------------------|
| Amenities Inside Unit | **HARDCODED** in `listing.types.ts:216-245` | Supabase `zat_features_amenity` |
| Amenities Outside Unit | **HARDCODED** in `listing.types.ts:247-272` | Supabase `zat_features_amenity` |
| House Rules | **HARDCODED** in `listing.types.ts:274-305` | **HARDCODED** in `Section5Rules.tsx:51` |
| Safety Features | **HARDCODED** in `listing.types.ts:149-157` | Supabase `zfut_safetyfeatures` |
| Neighborhood Description | N/A (textarea) | Supabase RPC `get_neighborhood_by_zip` |

### How It Works

1. **UI Checkboxes**: The options displayed come from **hardcoded JavaScript constants** in `listing.types.ts`. These are bundled into the frontend and do NOT come from Supabase.

2. **"Load Common" Button**: When clicked, fetches data from Supabase tables and **pre-selects** the corresponding checkboxes.

---

## Hardcoded Constants Reference

### File Location
`app/src/islands/pages/SelfListingPage/types/listing.types.ts`

### SAFETY_FEATURES (Lines 149-157)
```typescript
export const SAFETY_FEATURES: string[] = [
  'Smoke Detector',
  'Carbon Monoxide Detector',
  'Fire Extinguisher',
  'First Aid Kit',
  'Fire Sprinklers',
  'Lock on Bedroom Door'
];
```

### AMENITIES_INSIDE (Lines 216-245)
```typescript
export const AMENITIES_INSIDE: string[] = [
  'Air Conditioned',
  'Bedding',
  'Closet',
  'Coffee Maker',
  'Dedicated Workspace',
  'Dishwasher',
  'Dryer',
  'Fireplace',
  'Hair Dryer',
  'Hangers',
  'Iron/Ironing Board',
  'Locked Door',
  'Patio/Backyard',
  'TV',
  'Washer',
  'WiFi',
  'Microwave',
  'Refrigerator',
  'Oven/Stove',
  'Kitchen Utensils',
  'Dishes & Silverware',
  'Cooking Basics',
  'Cable TV',
  'Heating',
  'Hot Water',
  'Essentials',
  'Private Entrance',
  'Lockbox'
];
```

### AMENITIES_OUTSIDE (Lines 247-272)
```typescript
export const AMENITIES_OUTSIDE: string[] = [
  'BBQ Grill',
  'Bike Storage',
  'Common Outdoor Space',
  'Doorman',
  'Elevator',
  'Gym',
  'Hot Tub',
  'Pool (Indoor)',
  'Pool (Outdoor)',
  'Laundry Room',
  'Wheelchair Accessible',
  'Free Parking',
  'Paid Parking',
  'EV Charger',
  'Security Cameras',
  'Smoke Alarm',
  'Carbon Monoxide Alarm',
  'Fire Extinguisher',
  'First Aid Kit',
  'Pets Allowed',
  'Pet Friendly Common Areas',
  '24-Hour Security',
  'Concierge',
  'Package Receiving'
];
```

### HOUSE_RULES (Lines 274-305)
```typescript
export const HOUSE_RULES: string[] = [
  'Clear Common Areas',
  'Conserve Water',
  "Don't Move Furniture",
  'Flush Toilet Paper ONLY',
  'Lock Doors',
  'Maximum Occupancy',
  'No Access On Off Days',
  'No Candles',
  'No Drinking',
  'No Drugs',
  'No Entertaining',
  'No Food in Bedroom',
  'No Guests',
  'No Overnight Guests',
  'No Package Delivery',
  'No Parties',
  'No Pets',
  'No Shoes Inside',
  'No Smoking Inside',
  'No Smoking Outside',
  'Quiet Hours',
  'Not Suitable for Children',
  'Off Limit Areas',
  'Recycle',
  'Take Out Trash',
  'Wash Your Dishes',
  'Respect Neighbors',
  'No Loud Music',
  'Clean Up After Yourself',
  'Turn Off Lights'
];
```

### Common House Rules (Hardcoded in Section5Rules.tsx:51)
```typescript
const common = ['No Parties', 'No Smoking Inside', 'Quiet Hours', 'Wash Your Dishes', 'Lock Doors'];
```

---

## Supabase Tables Used

### zat_features_amenity
**Purpose**: Stores amenity options with categorization

| Column | Type | Description |
|--------|------|-------------|
| `_id` | string | Unique identifier |
| `Name` | string | Amenity name |
| `Type - Amenity Categories` | string | Category: 'In Unit', 'In Building', 'In Room' |
| `Icon` | string | Icon reference |
| `pre-set?` | boolean | Whether this is a common/default amenity |

**Service File**: `app/src/islands/pages/SelfListingPage/utils/amenitiesService.ts`

**Queries**:
- In Unit: `pre-set? = true AND Type - Amenity Categories = 'In Unit'`
- In Building: `pre-set? = true AND Type - Amenity Categories = 'In Building'`

### zfut_safetyfeatures
**Purpose**: Stores safety feature options

| Column | Type | Description |
|--------|------|-------------|
| `_id` | string | Unique identifier |
| `Name` | string | Safety feature name |
| `Icon` | string | Icon reference |
| `pre-set?` | boolean | Whether this is a common/default feature |

**Service File**: `app/src/islands/pages/SelfListingPage/utils/safetyService.ts`

**Query**: `pre-set? = true`

### Neighborhood Lookup (via RPC)
**Purpose**: Get neighborhood description by ZIP code

**RPC Function**: `get_neighborhood_by_zip(zip_code)`

**Service File**: `app/src/islands/pages/SelfListingPage/utils/neighborhoodService.ts`

**Returns**:
- `Display` → `neighborhood_name`
- `Neighborhood Description` → `description`
- `Zips` → `zips[]`

---

## Tech Debt: Dual Data Sources

### The Problem

The self-listing page has **two separate data sources** for selection fields:

1. **Hardcoded constants** in `listing.types.ts` - displayed as UI options
2. **Supabase tables** - used only for "load common" functionality

This creates several issues:

1. **Data Drift**: If new amenities/rules are added to Supabase, they won't appear in the UI without a code change.

2. **Maintenance Burden**: Updates require both:
   - Adding to Supabase table (for "load common")
   - Adding to hardcoded constant (for UI display)

3. **Inconsistency Risk**: The hardcoded values may not match what's in the database.

### Current File References

| Constant | Defined In | Used In |
|----------|------------|---------|
| `AMENITIES_INSIDE` | `listing.types.ts:216` | `Section2Features.tsx:3, 198` |
| `AMENITIES_OUTSIDE` | `listing.types.ts:247` | `Section2Features.tsx:3, 225` |
| `HOUSE_RULES` | `listing.types.ts:274` | `Section5Rules.tsx:3, 359` |
| `SAFETY_FEATURES` | `listing.types.ts:149` | `Section7Review.tsx:3, 101` |

### Recommended Fix

Migrate to a single source of truth:

**Option A**: Fetch all options from Supabase at page load
- Pros: Single source of truth, dynamic updates
- Cons: Requires loading state, network dependency

**Option B**: Generate constants from Supabase at build time
- Pros: Fast UI, no runtime fetch, still single source
- Cons: Requires build step, not real-time

**Option C**: Keep hardcoded but add sync validation
- Pros: Fast UI, catches drift
- Cons: Still dual maintenance

---

## Related Files

### Edge Function
- `supabase/functions/bubble-proxy/handlers/submitListing.ts` - Full submission handler
- `supabase/functions/bubble-proxy/handlers/listing.ts` - Initial creation handler

### Frontend Types
- `app/src/islands/pages/SelfListingPage/types/listing.types.ts` - All type definitions and constants

### Frontend Sections
- `app/src/islands/pages/SelfListingPage/sections/Section2Features.tsx` - Amenities selection
- `app/src/islands/pages/SelfListingPage/sections/Section5Rules.tsx` - House rules selection
- `app/src/islands/pages/SelfListingPage/sections/Section7Review.tsx` - Safety features selection

### Service Files
- `app/src/islands/pages/SelfListingPage/utils/amenitiesService.ts` - Amenities Supabase queries
- `app/src/islands/pages/SelfListingPage/utils/safetyService.ts` - Safety features Supabase queries
- `app/src/islands/pages/SelfListingPage/utils/neighborhoodService.ts` - Neighborhood lookup

---

**Document Version**: 1.0
**Last Updated**: 2025-12-06
