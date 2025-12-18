# Database Foreign Key Reference Index

This document provides a complete index of all foreign key relationships in the Split Lease database, covering both:
1. **PostgreSQL FK Constraints** - Actual database-enforced foreign keys
2. **Bubble ID Field Mappings** - Logical relationships using Bubble.io ID format

**Last Updated**: 2025-12-18

---

# Part 1: PostgreSQL Foreign Key Constraints

These are actual database-enforced FK constraints. **Total: 53 foreign keys** across 2 schemas.

## Schema: `junctions` (10 tables, 20 FKs)

Junction tables implement many-to-many relationships with proper FK constraints.

| Table | Column | References |
|-------|--------|------------|
| `thread_message` | `message_id` | `public._message._id` |
| `thread_message` | `thread_id` | `public.thread._id` |
| `thread_participant` | `thread_id` | `public.thread._id` |
| `thread_participant` | `user_id` | `public.user._id` |
| `user_guest_reason` | `reason_id` | `reference_table.zat_goodguestreasons._id` |
| `user_guest_reason` | `user_id` | `public.user._id` |
| `user_lease` | `lease_id` | `public.bookings_leases._id` |
| `user_lease` | `user_id` | `public.user._id` |
| `user_listing_favorite` | `listing_id` | `public.listing._id` |
| `user_listing_favorite` | `user_id` | `public.user._id` |
| `user_permission` | `grantee_user_id` | `public.user._id` |
| `user_permission` | `grantor_user_id` | `public.user._id` |
| `user_preferred_hood` | `hood_id` | `reference_table.zat_geo_hood_mediumlevel._id` |
| `user_preferred_hood` | `user_id` | `public.user._id` |
| `user_proposal` | `proposal_id` | `public.proposal._id` |
| `user_proposal` | `user_id` | `public.user._id` |
| `user_rental_type_search` | `rental_type_id` | `reference_table.os_rental_type.id` |
| `user_rental_type_search` | `user_id` | `public.user._id` |
| `user_storage_item` | `storage_id` | `reference_table.zat_storage._id` |
| `user_storage_item` | `user_id` | `public.user._id` |

## Schema: `public` (Core tables, 33 FKs)

### `_message` (6 FKs)
| Column | References |
|--------|------------|
| `Call to Action` | `reference_table.os_messaging_cta.display` |
| `Created By` | `public.user._id` |
| `-Guest User` | `public.user._id` |
| `-Host User` | `public.user._id` |
| `-Originator User` | `public.user._id` |
| `Associated Thread/Conversation` | `public.thread._id` |

### `ai_parsing_queue` (1 FK)
| Column | References |
|--------|------------|
| `user_id` | `public.user._id` |

### `bookings_leases` (4 FKs)
| Column | References |
|--------|------------|
| `Cancellation Policy` | `reference_table.zat_features_cancellationpolicy._id` |
| `Created By` | `public.user._id` |
| `Listing` | `public.listing._id` |
| `Proposal` | `public.proposal._id` |

### `external_reviews` (1 FK)
| Column | References |
|--------|------------|
| `listing_id` | `public.listing._id` |

### `listing` (12 FKs) ⚠️ **CRITICAL - See Update Pattern**
| Column | References |
|--------|------------|
| `Location - Borough` | `reference_table.zat_geo_borough_toplevel._id` |
| `Location - Hood` | `reference_table.zat_geo_hood_mediumlevel._id` |
| `Cancellation Policy` | `reference_table.zat_features_cancellationpolicy._id` |
| `Features - Parking type` | `reference_table.zat_features_parkingoptions._id` |
| `Features - Secure Storage Option` | `reference_table.zat_features_storageoptions._id` |
| `Features - Type of Space` | `reference_table.zat_features_listingtype._id` |
| `Kitchen Type` | `reference_table.os_kitchen_type.display` |
| `Location - City` | `reference_table.zat_location._id` |
| `Location - State` | `reference_table.os_us_states.display` |
| `rental type` | `reference_table.os_rental_type.display` |
| `Created By` | `public.user._id` |
| `Host / Landlord` | `public.user._id` |

> ⚠️ **Update Pattern**: Due to 12 FK constraints, always send only changed fields when updating listings. See `.claude/plans/Documents/20251217091827-edit-listing-409-regression-report.md`

### `notification_preferences` (1 FK)
| Column | References |
|--------|------------|
| `user_id` | `public.user._id` |

### `proposal` (1 FK)
| Column | References |
|--------|------------|
| `Status` | `reference_table.os_proposal_status.display` |

### `sync_queue` (1 FK)
| Column | References |
|--------|------------|
| `table_name` | `public.sync_config.supabase_table` |

### `thread` (3 FKs)
| Column | References |
|--------|------------|
| `Created By` | `public.user._id` |
| `Listing` | `public.listing._id` |
| `Proposal` | `public.proposal._id` |

### `user` (5 FKs)
| Column | References |
|--------|------------|
| `Type - User Current` | `reference_table.os_user_type.display` |
| `Type - User Signup` | `reference_table.os_user_type.display` |
| `Preferred Borough` | `reference_table.zat_geo_borough_toplevel._id` |
| `Preferred weekly schedule` | `reference_table.os_weekly_selection_options.display` |
| `Price Tier` | `reference_table.os_price_filter.display` |

## Reference Tables Index (`reference_table` schema)

| Reference Table | Referenced By |
|-----------------|---------------|
| `os_kitchen_type` | listing |
| `os_messaging_cta` | _message |
| `os_price_filter` | user |
| `os_proposal_status` | proposal |
| `os_rental_type` | listing, user_rental_type_search |
| `os_us_states` | listing |
| `os_user_type` | user (2 columns) |
| `os_weekly_selection_options` | user |
| `zat_features_cancellationpolicy` | listing, bookings_leases |
| `zat_features_listingtype` | listing |
| `zat_features_parkingoptions` | listing |
| `zat_features_storageoptions` | listing |
| `zat_geo_borough_toplevel` | listing, user |
| `zat_geo_hood_mediumlevel` | listing, user_preferred_hood |
| `zat_goodguestreasons` | user_guest_reason |
| `zat_location` | listing |
| `zat_storage` | user_storage_item |

## FK Statistics Summary

| Metric | Count |
|--------|-------|
| **Total Foreign Keys** | 53 |
| **Schemas with FKs** | 2 (`junctions`, `public`) |
| **Reference Tables** | 17 (all in `reference_table` schema) |
| **Most FK-heavy table** | `listing` (12 FKs) |
| **Junction Tables** | 10 |

---

# Part 2: Bubble ID Field Mappings

This section documents fields containing Bubble-format IDs (logical relationships not yet converted to PostgreSQL FKs).

**Bubble ID Format**: `{timestamp}x{random_number}` (e.g., `1734021909988x471937219829047940`)

**Verification Method**: 2-phase search (semantic matching + brute force ID lookup across all 59 tables)

---

## User Management

### user

| Field | Target Table | Status |
|-------|--------------|--------|
| **bubble_id** | *(bubble unique id)* | - |
| **Account - Guest** | `account_guest` | VERIFIED |
| **Account - Host / Landlord** | `account_host` | VERIFIED |
| **Phone Calls** | *UNKNOWN* | NOT FOUND |
| **Curated listing page** | *UNKNOWN* | NOT FOUND |
| **Favorited Listings** (array) | `listing` | VERIFIED |
| **Chat - Threads** (array) | *UNKNOWN* | NOT FOUND |
| **Proposals List** (array) | `proposal` | VERIFIED |
| **Notification Settings OS(lisits)** | `notificationsettingsos_lists_` | VERIFIED |
| **Users with permission to see sensitive info** (array) | `user` | VERIFIED |
| **manualID** | *UNKNOWN* | NOT FOUND |

**Samples:**
- Account - Guest: `1764956538327x39447818200758824`
- Account - Host / Landlord: `1595460582799x638022078175992400`
- Favorited Listings: `["1743790812920x538927313033625600"]`
- Proposals List: `["1743793292650x494870697661962160"]`

### account_guest

| Field | Target Table | Status |
|-------|--------------|--------|
| **bubble_id** | *(bubble unique id)* | - |
| **User** | `user` | VERIFIED |
| **Created By** | `user` | VERIFIED |

**Samples:**
- User: `1563371229582x205578820371395740`
- Created By: `1563371229582x205578820371395740`

### account_host

| Field | Target Table | Status |
|-------|--------------|--------|
| **bubble_id** | *(bubble unique id)* | - |
| **Listings** (array) | `listing` | VERIFIED |
| **User** | `user` | VERIFIED |

**Samples:**
- Listings: `["1764957231545x45695519790456296"]`
- User: `1619634384639x871876484073276300`

### occupant

| Field | Target Table | Status |
|-------|--------------|--------|
| **bubble_id** | *(bubble unique id)* | - |
| **Created By** | `user` | VERIFIED |

**Samples:**
- Created By: `1655750145093x287839391204127260`

---

## Listings

### listing

| Field | Target Table | Status |
|-------|--------------|--------|
| **bubble_id** / **_id** | *(bubble unique id)* | - |
| **Clickers** (array) | `user` | VERIFIED |
| **Features - Photos** (array) | `listing_photo` | VERIFIED |
| **Features - Amenities In-Unit** (array) | `zat_features_amenity` | VERIFIED |
| **Features - House Rules** (array) | `zat_features_houserule` | VERIFIED |
| **Features - Safety** (array) | `zfut_safetyfeatures` | VERIFIED |
| **Listing Curation** (array) | `zep_curationparameter` | VERIFIED |
| **Location - Hoods (new)** (array) | `zat_geo_hood_mediumlevel` | VERIFIED |
| **Users that favorite** (array) | `user` | VERIFIED |
| **Viewers** (array) | `user` | VERIFIED |
| **Created By** | `user` | VERIFIED |
| **Host / Landlord** | `user` | VERIFIED |
| **Cancellation Policy** | `zat_features_cancellationpolicy` | VERIFIED |
| **Features - Parking type** | `zat_features_parkingoptions` | VERIFIED |
| **Features - Type of Space** | `zat_features_listingtype` | VERIFIED |
| **Location - Borough** | `zat_geo_borough_toplevel` | VERIFIED |
| **Location - City** | `zat_location` | VERIFIED |
| **Location - Secure Storage Option** | `zat_features_storageoptions` | VERIFIED |
| **pricing_list** | `pricing_list` | VERIFIED |

**Samples:**
- Features - Photos: `1746220401943x667266492118157400`
- Listing Curation: `1745337350001x917085109001809500`
- Location - Borough: `1607041299687x679479834266385900`
- Host / Landlord: `1642603569798x394377109560468700`

### listing_photo

| Field | Target Table | Status |
|-------|--------------|--------|
| **bubble_id** / **_id** | *(bubble unique id)* | - |

### listing_trial

| Field | Target Table | Status |
|-------|--------------|--------|
| **bubble_id** / **_id** | *(bubble unique id)* | - |

### hostrestrictions

| Field | Target Table | Status |
|-------|--------------|--------|
| **bubble_id** / **_id** | *(bubble unique id)* | - |
| **Created By** | `user` | VERIFIED |

### pricing_list

| Field | Target Table | Status |
|-------|--------------|--------|
| **bubble_id** / **_id** | *(bubble unique id)* | - |
| **Created By** | `user` | VERIFIED |
| **Host Compensation** (array) | `pricing_list` (JSONB self-ref) | VERIFIED |
| **Markup and Discount Multiplier** (array) | `pricing_list` (JSONB self-ref) | VERIFIED |
| **Nightly Price** (array) | `pricing_list` (JSONB self-ref) | VERIFIED |
| **Unused Nights** (array) | `pricing_list` (JSONB self-ref) | VERIFIED |
| **Unused Nights Discount** (array) | `pricing_list` (JSONB self-ref) | VERIFIED |

**Note:** The pricing sub-arrays (Host Compensation, Nightly Price, etc.) are stored as JSONB arrays within the same pricing_list record - they are self-referencing sub-items, not foreign keys to separate tables.

---

## Bookings & Leases

### bookings_leases

| Field | Target Table | Status |
|-------|--------------|--------|
| **bubble_id** / **_id** | *(bubble unique id)* | - |
| **Cancellation Policy** | `zat_features_cancellationpolicy` | VERIFIED |
| **Created By** | `user` | VERIFIED |
| **Guest** | `user` | VERIFIED |
| **Host** | `user` | VERIFIED |
| **Listing** | `listing` | VERIFIED |
| **Proposal** | `proposal` | VERIFIED |
| **Payment Records Guest-SL** (array) | `paymentrecords` | VERIFIED |
| **Payment Records SL-Hosts** (array) | `paymentrecords` | VERIFIED |

**Samples:**
- Guest: `1708453742766x607893815249408900`
- Listing: `1708549871201x144775687466909700`
- Proposal: `1708551785278x334264766597250240`

### bookings_stays

| Field | Target Table | Status |
|-------|--------------|--------|
| **bubble_id** / **_id** | *(bubble unique id)* | - |
| **Created By** | `user` | VERIFIED |

### datechangerequest

| Field | Target Table | Status |
|-------|--------------|--------|
| **bubble_id** / **_id** | *(bubble unique id)* | - |
| **Created By** | `user` | VERIFIED |
| **Lease** | `bookings_leases` | VERIFIED |
| **Stay Associated 1** | `bookings_stays` | VERIFIED |
| **Stay Associated 2** | `bookings_stays` | VERIFIED |

**Samples:**
- Lease: `1743796703343x707068100481214700`
- Stay Associated 1: `1743796945751x602610259163950200`

### co_hostrequest

| Field | Target Table | Status |
|-------|--------------|--------|
| **bubble_id** / **_id** | *(bubble unique id)* | - |
| **Created By** | `user` | VERIFIED |
| **Host - Landlord** | `user` | VERIFIED |
| **Listing** | `listing` | VERIFIED |
| **Virtual meeting** | `virtualmeetingschedulesandlinks` | VERIFIED |

---

## House Manuals

### housemanual

| Field | Target Table | Status |
|-------|--------------|--------|
| **bubble_id** / **_id** | *(bubble unique id)* | - |
| **Created By** | `user` | VERIFIED |
| **Host** | `user` | VERIFIED |
| **Listing** | `listing` | VERIFIED |
| **Leases attached to this house manual** (array) | `bookings_leases` | VERIFIED |
| **List of Visits - URL Shorteners** (array) | *UNKNOWN* | NOT FOUND |

**Samples:**
- Host: `1710168307964x870447258311032000`
- Listing: `1710168539821x661551606616817700`

### housemanualphotos

| Field | Target Table | Status |
|-------|--------------|--------|
| **bubble_id** / **_id** | *(bubble unique id)* | - |
| **Created By** | `user` | VERIFIED |
| **house manual** | `housemanual` | VERIFIED |

### narration

| Field | Target Table | Status |
|-------|--------------|--------|
| **bubble_id** / **_id** | *(bubble unique id)* | - |
| **Created By** | `user` | VERIFIED |
| **House Manual** | `housemanual` | VERIFIED |
| **Visit** | `visit` | VERIFIED |

**Samples:**
- House Manual: `1732313330519x707857456866000900`
- Visit: `1732314027781x297711102619287550`

### remindersfromhousemanual

| Field | Target Table | Status |
|-------|--------------|--------|
| **bubble_id** / **_id** | *(bubble unique id)* | - |
| **Created By** | `user` | VERIFIED |
| **guest** | `user` | VERIFIED |
| **house manual** | `housemanual` | VERIFIED |

---

## Reviews

### mainreview

| Field | Target Table | Status |
|-------|--------------|--------|
| **bubble_id** / **_id** | *(bubble unique id)* | - |
| **Created By** | `user` | VERIFIED |
| **Lease** | `bookings_leases` | VERIFIED |
| **Reviewee/Target** | `user` | VERIFIED |
| **Reviewer** | `user` | VERIFIED |
| **Stay** | `bookings_stays` | VERIFIED |
| **Rating Details** (array) | `ratingdetail_reviews_` | VERIFIED |
| **House Manual** | `housemanual` | VERIFIED |
| **Visit** | `visit` | VERIFIED |

**Samples:**
- Reviewer: `1690294003075x621754378700518700`
- Stay: `1751745914275x722601096937557800`
- Rating Details: `["1755810375506x427938705353356800"]`

### external_reviews

*(Table is empty - no data)*

### ratingdetail_reviews_

| Field | Target Table | Status |
|-------|--------------|--------|
| **bubble_id** / **_id** | *(bubble unique id)* | - |
| **Created By** | `user` | VERIFIED |
| **Review** | `mainreview` | VERIFIED |

---

## Communication

### _message

| Field | Target Table | Status |
|-------|--------------|--------|
| **bubble_id** / **_id** | *(bubble unique id)* | - |
| **-Guest User** | `user` | VERIFIED |
| **-Host User** | `user` | VERIFIED |
| **-Originator User** | `user` | VERIFIED |
| **Associated Thread/Conversation** | *UNKNOWN* | NOT FOUND |
| **Created By** | `user` | VERIFIED |
| **Unread Users** (array) | `user` | VERIFIED |
| **~previous Message** | `_message` | VERIFIED |

**Note:** Thread/Conversation IDs were not found in any table. They may be virtual/computed or stored in a field not named bubble_id.

### multimessage

| Field | Target Table | Status |
|-------|--------------|--------|
| **bubble_id** / **_id** | *(bubble unique id)* | - |
| **Created By** | `user` | VERIFIED |
| **Recipient(User)** | `user` | VERIFIED |
| **Sender(User)** | `user` | VERIFIED |
| **Thread / Conversation** | *UNKNOWN* | NOT FOUND |

### virtualmeetingschedulesandlinks

| Field | Target Table | Status |
|-------|--------------|--------|
| **bubble_id** / **_id** | *(bubble unique id)* | - |
| **Created By** | `user` | VERIFIED |
| **guest** | `user` | VERIFIED |
| **host** | `user` | VERIFIED |
| **proposal** | `proposal` | VERIFIED |
| **requested by** | `user` | VERIFIED |

---

## Proposals

### proposal

| Field | Target Table | Status |
|-------|--------------|--------|
| **bubble_id** / **_id** | *(bubble unique id)* | - |
| **Created By** | `user` | VERIFIED |
| **Guest** | `user` | VERIFIED |
| **Host - Account** | `account_host` | VERIFIED |
| **Listing** | `listing` | VERIFIED |
| **Negotiation Summary** (array) | `negotiationsummary` | VERIFIED |
| **House Rules** (array) | `zat_features_houserule` | VERIFIED |
| **rental application** | `rentalapplication` | VERIFIED |
| **virtual meeting** | `virtualmeetingschedulesandlinks` | VERIFIED |
| **Draft Authorization Credit Card** | `file` | VERIFIED |
| **Draft Host Payout Schedule** | `file` | VERIFIED |
| **Draft Periodic Tenancy Agreement** | `file` | VERIFIED |
| **Draft Supplemental Agreement** | `file` | VERIFIED |
| **Drafts List** (array) | `file` | VERIFIED |

**Samples:**
- Listing: `1637349440736x622780446630946800`
- House Rules: `["1556151847445x748291628265310200", "1556151848820x263815240540241400"]`
- Draft files: `1699632795821x598009143421304800`

### negotiationsummary

| Field | Target Table | Status |
|-------|--------------|--------|
| **bubble_id** / **_id** | *(bubble unique id)* | - |
| **Created By** | `user` | VERIFIED |
| **Proposal associated** | `proposal` | VERIFIED |

---

## Support

### emergencyreports

| Field | Target Table | Status |
|-------|--------------|--------|
| **bubble_id** / **_id** | *(bubble unique id)* | - |
| **Created By** | `user` | VERIFIED |
| **reported by** | `user` | VERIFIED |

### rentalapplication

| Field | Target Table | Status |
|-------|--------------|--------|
| **bubble_id** / **_id** | *(bubble unique id)* | - |
| **Created By** | `user` | VERIFIED |
| **Hosts (users) able to see this rental app** | `user` | VERIFIED |

---

## Financial

### paymentrecords

| Field | Target Table | Status |
|-------|--------------|--------|
| **bubble_id** / **_id** | *(bubble unique id)* | - |
| **Created By** | `user` | VERIFIED |

### paymentsfromdatechanges

| Field | Target Table | Status |
|-------|--------------|--------|
| **bubble_id** / **_id** | *(bubble unique id)* | - |
| **Created By** | `user` | VERIFIED |
| **Participants** (array) | `user` | VERIFIED |
| **date change request** | `datechangerequest` | VERIFIED |
| **lease** | `bookings_leases` | VERIFIED |
| **payer** | `user` | VERIFIED |
| **receiver** | `user` | VERIFIED |

### invoices

| Field | Target Table | Status |
|-------|--------------|--------|
| **bubble_id** / **_id** | *(bubble unique id)* | - |
| **Created By** | `user` | VERIFIED |

---

## Analytics

### datacollection_searchlogging

| Field | Target Table | Status |
|-------|--------------|--------|
| **bubble_id** / **_id** | *(bubble unique id)* | - |
| **Search Location** | `zat_geo_borough_toplevel` | PARTIAL (schema match, some IDs missing) |

### experiencesurvey

| Field | Target Table | Status |
|-------|--------------|--------|
| **bubble_id** / **_id** | *(bubble unique id)* | - |
| **Created By** | `user` | VERIFIED |

### savedsearch

| Field | Target Table | Status |
|-------|--------------|--------|
| **bubble_id** / **_id** | *(bubble unique id)* | - |
| **City** | `zat_location` | VERIFIED |
| **Borough Area** | `zat_geo_borough_toplevel` | VERIFIED |
| **Created By** | `user` | VERIFIED |
| **User** | `user` | VERIFIED |
| **Type of Spaces** (array) | `zat_features_listingtype` | VERIFIED |
| **newListings** (array) | `listing` | VERIFIED |

### waitlistsubmission

| Field | Target Table | Status |
|-------|--------------|--------|
| **bubble_id** / **_id** | *(bubble unique id)* | - |
| **Created By** | `user` | VERIFIED |

---

## System

### dailycounter

| Field | Target Table | Status |
|-------|--------------|--------|
| **_id** | *(bubble unique id)* | - |
| **Created By** | `user` | VERIFIED |

### sync_queue

*(Table does not exist)*

### audit_log

*(Table is empty)*

### notification_preferences

*(No Bubble ID fields - uses UUIDs)*

---

## Verified FK Target Summary

| Target Table | FK Fields Pointing To It |
|--------------|--------------------------|
| `user` | Created By, User, Guest, Host, Host / Landlord, Reviewer, Reviewee/Target, payer, receiver, -Guest User, -Host User, -Originator User, Recipient(User), Sender(User), requested by, guest, host, reported by, Clickers, Viewers, Users that favorite, Unread Users, Users with permission to see sensitive info, Participants, Hosts (users) able to see this rental app |
| `listing` | Listing, Listings, Favorited Listings, newListings |
| `proposal` | Proposal, Proposals List, Proposal associated |
| `bookings_leases` | Lease, lease, Leases attached to this house manual |
| `bookings_stays` | Stay, Stay Associated 1, Stay Associated 2 |
| `housemanual` | House Manual, house manual |
| `mainreview` | Review |
| `rentalapplication` | rental application |
| `virtualmeetingschedulesandlinks` | virtual meeting, Virtual meeting |
| `datechangerequest` | date change request |
| `negotiationsummary` | Negotiation Summary |
| `ratingdetail_reviews_` | Rating Details |
| `paymentrecords` | Payment Records Guest-SL, Payment Records SL-Hosts |
| `_message` | ~previous Message |
| `account_guest` | Account - Guest |
| `account_host` | Account - Host / Landlord, Host - Account |
| `listing_photo` | Features - Photos |
| `pricing_list` | pricing_list |
| `file` | Draft Authorization Credit Card, Draft Host Payout Schedule, Draft Periodic Tenancy Agreement, Draft Supplemental Agreement, Drafts List |
| `visit` | Visit |
| `zat_geo_borough_toplevel` | Location - Borough, Borough Area, Search Location |
| `zat_location` | Location - City, City |
| `zat_geo_hood_mediumlevel` | Location - Hoods (new) |
| `zat_features_cancellationpolicy` | Cancellation Policy |
| `zat_features_amenity` | Features - Amenities In-Unit |
| `zat_features_houserule` | Features - House Rules, House Rules |
| `zat_features_listingtype` | Features - Type of Space, Type of Spaces |
| `zat_features_parkingoptions` | Features - Parking type |
| `zat_features_storageoptions` | Location - Secure Storage Option |
| `zfut_safetyfeatures` | Features - Safety |
| `zep_curationparameter` | Listing Curation |
| `notificationsettingsos_lists_` | Notification Settings OS(lisits) |
| `pricing_list` (JSONB self-ref) | Host Compensation, Markup and Discount Multiplier, Nightly Price, Unused Nights, Unused Nights Discount |

---

## Unresolved FK Fields

These fields contain Bubble IDs but the target table could not be determined:

| Field | Source Table | Sample ID | Notes |
|-------|--------------|-----------|-------|
| Phone Calls | user | `1725977040216x176047238037838620` | ID not found in any table |
| Curated listing page | user | `1664301374331x106891418977558050` | ID not found in any table |
| Chat - Threads | user | `1743793293505x519315459590621950` | ID not found in any table |
| manualID | user | `1571695973393x196882694722027520` | ID not found in any table |
| Associated Thread/Conversation | _message | `1748968807794x587680763940366500` | ID not found - may be computed |
| Thread / Conversation | multimessage | `1740156905297x944097248385030900` | ID not found - may be computed |
| List of Visits - URL Shorteners | housemanual | `1746214885120x873101493825260500` | ID not found in any table |

**Possible explanations:**
1. Data was deleted but references remain (orphaned FKs)
2. IDs are stored in a different column name (not bubble_id)
3. These are computed/virtual references in Bubble.io that don't map to physical tables
4. Data sync from Bubble.io is incomplete

---

## Data Integrity Notes

1. **account_guest**: Some records have NULL bubble_ids (data quality issue)
2. **Search Location**: Some IDs reference non-existent geography records
3. **pricing_list sub-arrays**: Self-referencing JSONB structure, not separate tables

---

# Document Summary

| Section | Content |
|---------|---------|
| **Part 1: PostgreSQL FKs** | 53 database-enforced foreign keys |
| **Part 2: Bubble ID Mappings** | Logical relationships via Bubble IDs |

**Generated**: 2025-12-18
**PostgreSQL FK Query**: `information_schema.table_constraints` JOIN query
**Bubble ID Verification**: 2-phase (semantic + brute force)
**Tables Analyzed**: 35 core business tables
**Tables with Bubble ID Fields**: 31
**Verified FK Mappings**: 95%+ coverage
