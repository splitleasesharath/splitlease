# Junction Table Analysis - Part 2: Reference Tables and JSONB Field Mapping

**Date**: 2025-12-16
**Status**: Analysis Complete
**Related**: Continues from previous junction table analysis

---

## Executive Summary

This analysis identified the specific reference tables and JSONB field structures used throughout the Split Lease database. Key finding: **Most list relationships are stored as JSONB arrays of Bubble IDs**, NOT as proper junction tables. Only one true reference table exists in Supabase (`zat_features_amenity`), while several option set reference tables exist only in Bubble and are NOT synced to Supabase.

---

## 1. Confirmed Reference Tables in Supabase

### 1.1 `zat_features_amenity` - Amenities Reference Table

**Purpose**: Stores all amenity options (in-unit and in-building)

| Column | Type | Description |
|--------|------|-------------|
| `_id` | text | Bubble ID (PK) |
| `Name` | text | Display name (e.g., "WiFi", "Gym") |
| `Slug` | text | URL-friendly identifier |
| `Type - Amenity Categories` | text | "In Unit" or "In Building" |
| `Icon` | text | URL to icon image |
| `pre-set?` | boolean | Is this a default amenity |
| `default show on view-split-lease?` | boolean | Show by default |
| `User Created` | text | FK to user who created custom amenity |

**Sample Data**:
```
_id: 1555340856469x472364328782922900 -> "WiFi" (In Unit)
_id: 1558470368024x124705598302821140 -> "Air Conditioned" (In Unit)
_id: 1555340850683x868929351440588700 -> "Gym" (In Building)
_id: 1555340848264x642584116582625100 -> "Doorman" (In Building)
```

**Used By**:
- `listing."Features - Amenities In-Unit"` (JSONB array of IDs)
- `listing."Features - Amenities In-Building"` (JSONB array of IDs)

---

## 2. JSONB List Fields Analysis

### 2.1 User Table - List Fields

| Field Name | Data Type | Contains IDs Referencing | Synced Reference Table? |
|------------|-----------|--------------------------|------------------------|
| `Chat - Threads` | jsonb | `thread._id` | YES - thread table exists |
| `Favorited Listings` | jsonb | `listing._id` | YES - listing table exists |
| `Leases` | jsonb | `bookings_leases._id` | YES - bookings_leases exists |
| `Listings` | jsonb | `listing._id` | YES - listing table exists |
| `Proposals List` | ARRAY (text[]) | `proposal._id` | YES - proposal table exists |
| `Preferred Hoods` | jsonb | Hood option set IDs | **NO - Not in Supabase** |
| `Reasons to Host me` | jsonb | Good Guest Reason IDs | **NO - Not in Supabase** |
| `About - Commonly Stored Items` | jsonb | Storage Item IDs | **NO - Not in Supabase** |
| `Users with permission to see sensitive info` | jsonb | `user._id` | YES - user table exists |
| `Message Forwarding Preference(list)` | jsonb | Communication preference IDs | **NO - Not in Supabase** |
| `Recent Days Selected` | jsonb | Day option set IDs | **NO - Not in Supabase** |
| `Promo - Codes Seen` | jsonb | Promo code IDs | Unknown |
| `Tasks Completed` | jsonb | Task IDs | Unknown |

**Sample JSONB Data Structure**:
```json
// Chat - Threads (array of thread IDs)
["1743793293505x519315459590621950", "1743202662454x900071645405928600"]

// Reasons to Host me (array of option set IDs - NOT in Supabase)
["1676564974916x827242825633751200", "1676565017160x597765149603000300"]

// About - Commonly Stored Items (array of option set IDs - NOT in Supabase)
["1676043957679x806705915443127800", "1676044015774x106866528080355340"]
```

### 2.2 Listing Table - List Fields

| Field Name | Data Type | Contains IDs Referencing | Synced Reference Table? |
|------------|-----------|--------------------------|------------------------|
| `Features - Amenities In-Unit` | jsonb | `zat_features_amenity._id` | **YES** |
| `Features - Amenities In-Building` | jsonb | `zat_features_amenity._id` | **YES** |
| `Features - House Rules` | jsonb | House Rule option set IDs | **NO - Not in Supabase** |
| `Features - Safety` | jsonb | Safety feature option set IDs | **NO - Not in Supabase** |
| `Location - Hoods (new)` | jsonb | Hood/Neighborhood IDs | **NO - Not in Supabase** |
| `Days Available (List of Days)` | jsonb | Day numbers or day option IDs | Inline values |
| `Nights Available (List of Nights)` | jsonb | Night identifiers | Inline values |
| `Users that favorite` | jsonb | `user._id` | YES - user table exists |
| `Viewers` | jsonb | `user._id` | YES - user table exists |
| `Clickers` | jsonb | `user._id` | YES - user table exists |
| `Reviews` | jsonb | `mainreview._id` | YES - mainreview exists |
| `AI Suggestions List` | jsonb | `zat_aisuggestions._id` | YES |
| `users with permission` | jsonb | `user._id` | YES - user table exists |

**Sample Listing JSONB Data**:
```json
// Features - Amenities In-Unit (references zat_features_amenity)
["1558470368024x124705598302821140"]  // -> "Air Conditioned"

// Location - Hoods (new) - references Bubble option set NOT in Supabase
["1686665230141x301148839537636900", "1686665230165x718769362639244700"]

// Features - House Rules - references Bubble option set NOT in Supabase
["1556151847445x748291628265310200"]
```

### 2.3 Proposal Table - List Fields

| Field Name | Data Type | Contains IDs Referencing |
|------------|-----------|--------------------------|
| `Days Selected` | jsonb | Day identifiers |
| `Days Available` | jsonb | Day identifiers |
| `Nights Selected (Nights list)` | jsonb | Night identifiers |
| `Complementary Days` | jsonb | Day identifiers |
| `Complementary Nights` | jsonb | Night identifiers |
| `House Rules` | jsonb | House Rule option set IDs |
| `hc days selected` | jsonb | Day identifiers (host counter) |
| `hc nights selected` | jsonb | Night identifiers (host counter) |
| `hc house rules` | jsonb | House Rule option set IDs |
| `Drafts List` | jsonb | Draft document IDs |
| `History` | jsonb | Historical state snapshots |
| `list of dates (actual dates)` | jsonb | Actual date values |

### 2.4 Bookings_Leases Table - List Fields

| Field Name | Data Type | Contains IDs Referencing |
|------------|-----------|--------------------------|
| `List of Stays` | jsonb | `bookings_stays._id` |
| `List of Booked Dates` | jsonb | Date values |
| `List of Booked Dates after Requests` | jsonb | Date values |
| `Participants` | jsonb | `user._id` |
| `Payment Records Guest-SL` | jsonb | `paymentrecords._id` |
| `Payment Records SL-Hosts` | jsonb | `paymentrecords._id` |
| `Date Change Requests` | jsonb | `datechangerequest._id` |
| `Payments from date change requests to GUEST` | jsonb | Payment IDs |
| `Payments from date change requests to HOST` | jsonb | Payment IDs |

### 2.5 Thread Table - List Fields

| Field Name | Data Type | Contains IDs Referencing |
|------------|-----------|--------------------------|
| `Participants` | jsonb | `user._id` |
| `Message list` | jsonb | `_message._id` |
| `Messages Sent by Host` | jsonb | `_message._id` |
| `Messages Sent by Guest` | jsonb | `_message._id` |
| `Messages sent by SLBot to Host` | jsonb | `_message._id` |
| `Messages sent by SLBot to Guest` | jsonb | `_message._id` |
| `Multi Messages` | jsonb | `multimessage._id` |

---

## 3. Missing Reference Tables (Bubble Option Sets NOT in Supabase)

These option sets exist in Bubble but have **NOT been synced to Supabase**:

### 3.1 `geo-hood` / Neighborhoods
- **Used By**: `user."Preferred Hoods"`, `listing."Location - Hoods (new)"`
- **Sample IDs**: `1686665230141x301148839537636900`
- **Impact**: Cannot resolve neighborhood names without Bubble API call

### 3.2 `good-guest-reasons` / Reasons to Host
- **Used By**: `user."Reasons to Host me"`
- **Sample IDs**: `1676564974916x827242825633751200`
- **Impact**: Cannot display reason labels without Bubble API

### 3.3 `zat-storages` / Storage Items
- **Used By**: `user."About - Commonly Stored Items"`
- **Sample IDs**: `1676043957679x806705915443127800`
- **Impact**: Cannot display storage item labels without Bubble API

### 3.4 `house-rules` / House Rules Options
- **Used By**: `listing."Features - House Rules"`, `proposal."House Rules"`
- **Sample IDs**: `1556151847445x748291628265310200`
- **Impact**: Cannot display house rule labels without Bubble API

### 3.5 `safety-features` / Safety Feature Options
- **Used By**: `listing."Features - Safety"`
- **Sample IDs**: `1555343668134x731801591789591700`
- **Impact**: Cannot display safety feature labels without Bubble API

### 3.6 `rental-types` / Rental Type Options
- **Used By**: `listing."rental type"`, `proposal."rental type"`
- **Note**: Stored as single text value, not array
- **Values**: Likely "Full Time", "Part Time", etc.

### 3.7 `communication-preferences` / Message Forwarding
- **Used By**: `user."Message Forwarding Preference(list)"`
- **Impact**: Cannot resolve preference labels without Bubble API

---

## 4. Existing Related Tables (Proper FK Relationships)

These tables have direct FK text fields (single references):

### 4.1 MainReview Table
| FK Field | References |
|----------|------------|
| `Reviewer` | `user._id` |
| `Reviewee/Target` | `user._id` |
| `Lease` | `bookings_leases._id` |
| `Stay` | `bookings_stays._id` |
| `Visit` | `visit._id` |
| `House Manual` | `housemanual._id` |

### 4.2 Visit Table
| FK Field | References |
|----------|------------|
| `User shared with (guest)` | `user._id` |
| `house manual` | `housemanual._id` |
| `Review from Guest` | `mainreview._id` |

### 4.3 Bookings_Stays Table
| FK Field | References |
|----------|------------|
| `Guest` | `user._id` |
| `Host` | `user._id` |
| `Lease` | `bookings_leases._id` |
| `listing` | `listing._id` |
| `Review Submitted by Guest` | `mainreview._id` |
| `Review Submitted by Host` | `mainreview._id` |

---

## 5. Notification Preferences Table

This is a **Supabase-native table** (not from Bubble) with proper schema:

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | text | FK to user._id |
| `message_forwarding_sms` | boolean | |
| `message_forwarding_email` | boolean | |
| `payment_reminders_sms` | boolean | |
| `payment_reminders_email` | boolean | |
| `promotional_sms` | boolean | |
| `promotional_email` | boolean | |
| `reservation_updates_sms` | boolean | |
| `reservation_updates_email` | boolean | |
| `lease_requests_sms` | boolean | |
| `lease_requests_email` | boolean | |
| `proposal_updates_sms` | boolean | |
| `proposal_updates_email` | boolean | |
| `checkin_checkout_sms` | boolean | |
| `checkin_checkout_email` | boolean | |
| `reviews_sms` | boolean | |
| `reviews_email` | boolean | |
| `tips_insights_sms` | boolean | |
| `tips_insights_email` | boolean | |
| `account_assistance_sms` | boolean | |
| `account_assistance_email` | boolean | |
| `virtual_meetings_sms` | boolean | |
| `virtual_meetings_email` | boolean | |

---

## 6. ZAT Tables (Support Tables)

### 6.1 `zat_aisuggestions`
- Stores AI-generated suggestions for house manuals and listings
- FK to `housemanual._id` and `listing._id`

### 6.2 `zat_blocked_vm_bookingtimes`
- Stores blocked virtual meeting time slots
- Contains JSONB fields for blocked times

### 6.3 `zat_features_amenity`
- Reference table for amenities (documented above)

---

## 7. Recommendations

### 7.1 Immediate: Sync Missing Option Sets
To enable direct lookups without Bubble API calls, sync these option sets to Supabase:

1. **High Priority** (frequently accessed):
   - `geo-hood` -> Create `ref_neighborhoods` table
   - `good-guest-reasons` -> Create `ref_guest_reasons` table
   - `house-rules` -> Create `ref_house_rules` table

2. **Medium Priority**:
   - `zat-storages` -> Create `ref_storage_items` table
   - `safety-features` -> Create `ref_safety_features` table

3. **Lower Priority**:
   - `communication-preferences` -> Create `ref_comm_preferences` table
   - `rental-types` -> Already stored as text values

### 7.2 Query Pattern for JSONB Arrays

Until option sets are synced, use this pattern for lookups:

```sql
-- Find listings with specific amenities (when reference table exists)
SELECT l.*, a."Name" as amenity_name
FROM listing l
CROSS JOIN LATERAL jsonb_array_elements_text(l."Features - Amenities In-Unit") as amenity_id
JOIN zat_features_amenity a ON a."_id" = amenity_id
WHERE a."Name" = 'WiFi';

-- Find user's favorited listings
SELECT l.*
FROM listing l
WHERE l."_id" IN (
  SELECT jsonb_array_elements_text(u."Favorited Listings")
  FROM "user" u
  WHERE u."_id" = 'target_user_id'
);
```

### 7.3 Consider Junction Tables for Heavy Queries

For high-frequency queries, consider creating materialized junction tables:

```sql
-- Example: user_favorite_listings junction
CREATE TABLE user_favorite_listings (
  user_id TEXT REFERENCES "user"("_id"),
  listing_id TEXT REFERENCES listing("_id"),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, listing_id)
);

-- Populate from JSONB
INSERT INTO user_favorite_listings (user_id, listing_id)
SELECT u."_id", jsonb_array_elements_text(u."Favorited Listings")
FROM "user" u
WHERE u."Favorited Listings" IS NOT NULL;
```

---

## 8. Complete Table Inventory

| Table Name | Type | Has JSONB Lists | Has FK References |
|------------|------|-----------------|-------------------|
| `user` | Core | YES (12+ fields) | YES |
| `listing` | Core | YES (15+ fields) | YES |
| `proposal` | Core | YES (10+ fields) | YES |
| `bookings_leases` | Core | YES (10+ fields) | YES |
| `bookings_stays` | Core | YES (2 fields) | YES |
| `thread` | Core | YES (7 fields) | YES |
| `_message` | Core | Unknown | YES |
| `mainreview` | Core | YES (1 field) | YES |
| `visit` | Core | YES (5+ fields) | YES |
| `housemanual` | Core | Unknown | YES |
| `zat_features_amenity` | Reference | NO | YES |
| `zat_aisuggestions` | Support | NO | YES |
| `notification_preferences` | Native | NO | YES |
| `state` | Reference | NO | NO |

---

## Files Referenced

- `DATABASE_SCHEMA_OVERVIEW.md` - Overall schema documentation
- `.claude/plans/Documents/` - Previous analysis documents

---

## Next Steps

1. Document the exact Bubble option set structures needed
2. Create migration plan for syncing option sets
3. Design junction table materialization strategy for performance-critical queries
4. Update edge functions to handle both JSONB and future junction table patterns
