# Split Lease Database Relations Documentation

> **Generated**: 2026-01-20 (Updated with verification)
> **Source**: Bubble.io migrated data in Supabase
> **Primary Key Pattern**: All Bubble tables use `_id` (text) with format `{timestamp}x{random_number}`
> **Verification Status**: All relationships verified by querying actual data samples

---

## Table of Contents

1. [Overview](#overview)
2. [Core Entity Relationships](#core-entity-relationships)
3. [Table-by-Table Foreign Key Documentation](#table-by-table-foreign-key-documentation)
4. [Lookup/Configuration Tables](#lookupconfiguration-tables)
5. [JSONB Array Fields](#jsonb-array-fields)
6. [Notes & Caveats](#notes--caveats)

---

## Overview

### Entity Hierarchy

```
user (central identity)
     account_guest (guest profile extension)
     account_host (host profile extension)
          listing (properties)
                listing_photo
                housemanual
                     housemanualphotos
                     narration
                     qrcodes
                     visit (shared with guests)
                     remindersfromhousemanual
                     zat_aisuggestions
                hostrestrictions
                pricing_list
                proposal (booking requests)
                      negotiationsummary
                      rentalapplication
                      virtualmeetingschedulesandlinks
                      file (documents)

     bookings_leases (confirmed bookings)
           bookings_stays (individual stay periods)
           paymentrecords
           datechangerequest
                paymentsfromdatechanges
           emergencyreports
           file (lease documents)
           mainreview
                 ratingdetail_reviews_
```

### Key Relationships Summary

| Relationship Type | From → To |
|-------------------|-----------|
| User Identity | `user` → `account_guest`, `account_host` |
| Property Ownership | `account_host` → `listing` |
| Booking Flow | `listing` → `proposal` → `bookings_leases` → `bookings_stays` |
| Messaging | `_message` links `user` (guest/host) via threads |
| Reviews | `mainreview` links to `user`, `bookings_stays`, `bookings_leases` |
| Geography | `listing` → `zat_geo_hood_mediumlevel` → `zat_geo_borough_toplevel` |

---

## Core Entity Relationships

### User & Accounts

```

      user
  (_id = PK)
        │
        ▼
        ┼
        │
    ┌───┴───┐
    │       │
    ▼       ▼
┌─────────┐ ┌─────────┐
│account_ │ │account_ │
│ guest   │ │  host   │
└─────────┘ └─────────┘
│ User  ◄─┤ │ User  ◄─┤
└─────────┘ └─────────┘
```

### Booking Flow

```
┌─────────┐   ┌─────────┐   ┌────────────────┐   ┌──────────────┐
│ listing │ → │proposal │ → │bookings_leases │ → │bookings_stays│
└─────────┘   └─────────┘   └────────────────┘   └──────────────┘
│ _id (PK)│   │ Listing │   │ Proposal       │   │ Lease        │
│         │   │ Guest   │   │ Guest          │   │ Guest        │
│         │   │Host-Acct│   │ Host           │   │ Host         │
│         │   │         │   │ Listing        │   │ listing      │
└─────────┘   └─────────┘   └────────────────┘   └──────────────┘
```

---

## Table-by-Table Foreign Key Documentation

### 1. _message

| Field | References | Target Table | Verified |
|-------|------------|--------------|----------|
| `-Guest User` | `_id` | `user` | ✅ |
| `-Host User` | `_id` | `user` | ✅ |
| `-Originator User` | `_id` | `user` | ✅ |
| `Created By` | `_id` | `user` | ✅ |
| `~previous Message` | `_id` | `_message` | ✅ |
| `Associated Thread/Conversation` | `_id` | *(not migrated)* | ⚠ |
| `Date Change Request involved` | `_id` | `datechangerequest` | nullable |
| `Review involved` | `_id` | `mainreview` | nullable |

---

### 2. account_guest

| Field | References | Target Table | Verified |
|-------|------------|--------------|----------|
| `Created By` | `_id` | `user` | ✅ |
| `User` | `_id` | `user` | ✅ |

---

### 3. account_host

| Field | References | Target Table | Verified |
|-------|------------|--------------|----------|
| `Created By` | `_id` | `user` | ✅ |
| `User` | `_id` | `user` | ✅ |

**JSONB Array Fields:**
- `Listings` → array of `listing._id`
- `House manuals` → array of `housemanual._id`
- `Co-Hosts Requests` → array of `co_hostrequest._id`
- `Listings to claim` → array of `listing._id`

---

### 4. bookings_leases

| Field | References | Target Table | Verified |
|-------|------------|--------------|----------|
| `Created By` | `_id` | `user` | ✅ |
| `Guest` | `_id` | `user` | ✅ |
| `Host` | `_id` | `account_host` | ✅ |
| `Listing` | `_id` | `listing` | ✅ |
| `Proposal` | `_id` | `proposal` | ⚠ partial |
| `Thread` | `_id` | *(not migrated)* | ⚠ |

**JSONB Array Fields:**
- `List of Stays` → array of `bookings_stays._id`
- `Payment Records Guest-SL` → array of `paymentrecords._id`
- `Payment Records SL-Hosts` → array of `paymentrecords._id`
- `Date Change Requests` → array of `datechangerequest._id`
- `Participants` → array of `user._id`

---

### 5. bookings_stays

| Field | References | Target Table | Verified |
|-------|------------|--------------|----------|
| `Created By` | `_id` | `user` | ✅ |
| `Guest` | `_id` | `user` | ✅ |
| `Host` | `_id` | `user` | ✅ |
| `Lease` | `_id` | `bookings_leases` | ✅ |
| `listing` | `_id` | `listing` | ✅ |
| `Review Submitted by Guest` | `_id` | `mainreview` | nullable |
| `Review Submitted by Host` | `_id` | `mainreview` | nullable |

---

### 6. co_hostrequest

| Field | References | Target Table | Verified |
|-------|------------|--------------|----------|
| `Created By` | `_id` | `user` | ✅ |
| `Co-Host User` | `_id` | `user` | nullable |
| `Host - Landlord` | `_id` | `account_host` | ✅ |
| `Listing` | `_id` | `listing` | ✅ |

---

### 7. datacollection_searchlogging

| Field | References | Target Table | Verified |
|-------|------------|--------------|----------|
| `Created By` | `_id` | `user` | ✅ |
| `User` | `_id` | `user` | ⚠ partial |

---

### 8. datechangerequest

| Field | References | Target Table | Verified |
|-------|------------|--------------|----------|
| `Created By` | `_id` | `user` | ✅ |
| `Lease` | `_id` | `bookings_leases` | ⚠ partial |
| `Request receiver` | `_id` | `user` | nullable |
| `Requested by` | `_id` | `user` | ✅ |
| `Stay Associated 1` | `_id` | `bookings_stays` | ✅ |
| `Stay Associated 2` | `_id` | `bookings_stays` | ✅ |

---

### 9. documentssent

| Field | References | Target Table | Verified |
|-------|------------|--------------|----------|
| `Created By` | special | can be "no_user" | - |
| `Host user` | `_id` | `user` | ✅ |

---

### 10. emergencyreports

| Field | References | Target Table | Verified |
|-------|------------|--------------|----------|
| `Created By` | `_id` | `user` | ✅ |
| `Reservation` | `_id` | `bookings_leases` | ✅ |
| `reported by` | `_id` | `user` | ✅ |

---

### 11. file

| Field | References | Target Table | Verified |
|-------|------------|--------------|----------|
| `Created By` | `_id` | `user` | ✅ |
| `Lease Associated` | `_id` | `bookings_leases` | ✅ |
| `Proposal Associated` | `_id` | `proposal` | ⚠ partial |

---

### 12. hostrestrictions

| Field | References | Target Table | Verified |
|-------|------------|--------------|----------|
| `Created By` | `_id` | `user` | ✅ |
| `listing` | `_id` | `listing` | ✅ |

---

### 13. housemanual

| Field | References | Target Table | Verified |
|-------|------------|--------------|----------|
| `Created By` | `_id` | `user` | ✅ |
| `Host` | `_id` | `account_host` | ✅ |
| `Listing` | `_id` | `listing` | ✅ |

**JSONB Array Fields:**
- `Leases attached to this house manual` → array of `bookings_leases._id`
- `ALL Narrations and Jingles` → array of `narration._id`
- `QR Codes` → array of `qrcodes._id`
- `House manual photos for specific guidelines` → array of `housemanualphotos._id`
- `Visitors` → array of `visit._id`
- `AI Suggestions` → array of `zat_aisuggestions._id`

---

### 14. housemanualphotos

| Field | References | Target Table | Verified |
|-------|------------|--------------|----------|
| `Created By` | `_id` | `user` | ✅ |
| `house manual` | `_id` | `housemanual` | ✅ |

---

### 15. listing

| Field | References | Target Table | Verified |
|-------|------------|--------------|----------|
| `Created By` | `_id` | `user` | ✅ |
| `Host / Landlord` | `_id` | `account_host` | ✅ |
| `House manual` | `_id` | `housemanual` | nullable |
| `Location - Borough` | `_id` | `zat_geo_borough_toplevel` | ✅ |
| `Location - Hood` | `_id` | `zat_geo_hood_mediumlevel` | ✅ |
| `host restrictions` | `_id` | `hostrestrictions` | nullable |
| `pricing_list` | `_id` | `pricing_list` | ✅ |

**JSONB Array Fields:**
- `Features - Photos` → array of `listing_photo._id`
- `Reviews` → array of `mainreview._id`
- `Users that favorite` → array of `user._id`
- `Viewers` → array of `user._id`
- `Clickers` → array of `user._id`
- `AI Suggestions List` → array of `zat_aisuggestions._id`
- `Location - Hoods (new)` → array of `zat_geo_hood_mediumlevel._id`
- `users with permission` → array of `user._id`
- `Features - Amenities In-Building` → array of `zat_features_amenity._id`
- `Features - Amenities In-Unit` → array of `zat_features_amenity._id`
- `Features - House Rules` → array of `zat_features_houserule._id`
- `Features - Safety` → array of `zat_features_*._id`

---

### 16. listing_photo

| Field | References | Target Table | Verified |
|-------|------------|--------------|----------|
| `Created By` | `_id` | `user` | ✅ |
| `Listing` | `_id` | `listing` | ✅ |

---

### 17. mainreview

| Field | References | Target Table | Verified |
|-------|------------|--------------|----------|
| `Created By` | `_id` | `user` | ✅ |
| `House Manual` | `_id` | `housemanual` | nullable |
| `Lease` | `_id` | `bookings_leases` | ⚠ partial |
| `Reviewee/Target` | `_id` | `user` | ✅ |
| `Reviewer` | `_id` | `user` | ✅ |
| `Stay` | `_id` | `bookings_stays` | ✅ |
| `Visit` | `_id` | `visit` | nullable |

**JSONB Array Fields:**
- `Rating Details` → array of `ratingdetail_reviews_._id`

---

### 18. multimessage

| Field | References | Target Table | Verified |
|-------|------------|--------------|----------|
| `Created By` | `_id` | `user` | ✅ |
| `Recipient(User)` | `_id` | `user` | ✅ |
| `Sender(User)` | `_id` | `user` | ✅ |
| `SMS Session` | `_id` | `proxysmssession` | nullable |
| `Thread / Conversation` | `_id` | *(not migrated)* | ⚠ |

---

### 19. narration

| Field | References | Target Table | Verified |
|-------|------------|--------------|----------|
| `Created By` | `_id` | `user` | ✅ |
| `House Manual` | `_id` | `housemanual` | ✅ |
| `Visit` | `_id` | `visit` | ✅ |

---

### 20. negotiationsummary

| Field | References | Target Table | Verified |
|-------|------------|--------------|----------|
| `Created By` | `_id` | `user` | ✅ |
| `Proposal associated` | `_id` | `proposal` | ⚠ partial |

---

### 21. notificationsettingsos_lists_

| Field | References | Target Table | Verified |
|-------|------------|--------------|----------|
| `Created By` | `_id` | `user` | ✅ |
| `User` | `_id` | `user` | ✅ |

---

### 22. paymentrecords

| Field | References | Target Table | Verified |
|-------|------------|--------------|----------|
| `Created By` | `_id` | `user` | ✅ |
| `Booking - Reservation` | `_id` | `bookings_leases` | ✅ |

---

### 23. paymentsfromdatechanges

| Field | References | Target Table | Verified |
|-------|------------|--------------|----------|
| `Created By` | `_id` | `user` | ✅ |
| `date change request` | `_id` | `datechangerequest` | ✅ |
| `lease` | `_id` | `bookings_leases` | ✅ |
| `payer` | `_id` | `user` | ✅ |
| `receiver` | `_id` | `user` | ✅ |

**JSONB Array Fields:**
- `Participants` → array of `user._id`

---

### 24. proposal

| Field | References | Target Table | Verified |
|-------|------------|--------------|----------|
| `Created By` | `_id` | `user` | ✅ |
| `Guest` | `_id` | `user` | ✅ |
| `Host - Account` | `_id` | `account_host` | ✅ |
| `Listing` | `_id` | `listing` | ✅ |
| `rental application` | `_id` | `rentalapplication` | ✅ |
| `virtual meeting` | `_id` | `virtualmeetingschedulesandlinks` | nullable |

**JSONB Array Fields:**
- `Drafts List` → array of file/document IDs
- `History` → array of `negotiationsummary._id`

---

### 25. proxysmssession

| Field | References | Target Table | Verified |
|-------|------------|--------------|----------|
| `Created By` | `_id` | `user` | ✅ |
| `Thread / Conversation` | `_id` | *(not migrated)* | ⚠ |

**JSONB Array Fields:**
- `Multi Message` → array of `multimessage._id` | ✅ |

---

### 26. qrcodes

| Field | References | Target Table | Verified |
|-------|------------|--------------|----------|
| `Created By` | `_id` | `user` | ✅ |
| `House Manual` | `_id` | `housemanual` | ✅ |

---

### 27. ratingdetail_reviews_

| Field | References | Target Table | Verified |
|-------|------------|--------------|----------|
| `Created By` | `_id` | `user` | ✅ |
| `Review` | `_id` | `mainreview` | ✅ |

---

### 28. referral

| Field | References | Target Table | Verified |
|-------|------------|--------------|----------|
| `Created By` | `_id` | `user` | ✅ |
| `fromUser` | `_id` | `user` | ✅ |

---

### 29. remindersfromhousemanual

| Field | References | Target Table | Verified |
|-------|------------|--------------|----------|
| `Created By` | `_id` | `user` | ✅ |
| `house manual` | `_id` | `housemanual` | ✅ |
| `guest` | `_id` | `user` | nullable |

---

### 30. rentalapplication

| Field | References | Target Table | Verified |
|-------|------------|--------------|----------|
| `Created By` | `_id` | `user` | ✅ |

**JSONB Array Fields:**
- `Hosts (users) able to see this rental app` → array of `user._id`
- `occupants list` → array of `occupant._id`

---

### 31. savedsearch

| Field | References | Target Table | Verified |
|-------|------------|--------------|----------|
| `Created By` | `_id` | `user` | ✅ |
| `User` | `_id` | `user` | ✅ |

---

### 32. visit

| Field | References | Target Table | Verified |
|-------|------------|--------------|----------|
| `Created By` | `_id` | `user` | ✅ |
| `house manual` | `_id` | `housemanual` | ✅ |
| `User shared with (guest)` | `_id` | `user` | nullable |
| `Review from Guest` | `_id` | `mainreview` | nullable |

**JSONB Array Fields:**
- `LIST of Narration / Jingles` → array of `narration._id`
- `Reminders from House Manual` → array of `remindersfromhousemanual._id`
- `Visit photos for specific guidelines` → array of photo IDs

---

### 33. virtualmeetingschedulesandlinks

| Field | References | Target Table | Verified |
|-------|------------|--------------|----------|
| `Created By` | `_id` | `user` | ✅ |
| `guest` | `_id` | `user` | ✅ |
| `host` | `_id` | `user` | ✅ |
| `proposal` | `_id` | `proposal` | ⚠ partial |
| `requested by` | `_id` | `user` | ✅ |
| `Listing (for Co-Host feature)` | `_id` | `listing` | nullable |

---

### 34. zat_aisuggestions

| Field | References | Target Table | Verified |
|-------|------------|--------------|----------|
| `Created By` | `_id` | `user` | ✅ |
| `House Manual` | `_id` | `housemanual` | ✅ |
| `Listing` | `_id` | `listing` | nullable |

---

### 35. zat_geo_hood_mediumlevel

| Field | References | Target Table | Verified |
|-------|------------|--------------|----------|
| `Created By` | `_id` | `user` | ✅ |
| `Geo-Borough` | `_id` | `zat_geo_borough_toplevel` | ✅ |

---

## Lookup/Configuration Tables

These tables typically have no foreign keys (standalone reference data):

| Table | Description |
|-------|-------------|
| `dailycounter` | Daily sequence counter for IDs |
| `email` | Email log/queue |
| `emailtemplate_postmark_` | Email templates |
| `emailtemplates_category_postmark_` | Email template categories |
| `experiencesurvey` | Survey responses |
| `informationaltexts` | UI copy/text content |
| `internalfiles` | Internal document storage |
| `invoices` | Invoice files |
| `knowledgebase` | Help/KB articles |
| `knowledgebaselineitem` | KB article sections |
| `mailing_list_opt_in` | Newsletter subscriptions |
| `num` | Number sequence table |
| `occupant` | Occupant info (names/relationships) |
| `postmark_loginbound` | Inbound email log |
| `state` | US states reference |
| `updatestodocuments` | Document update log |
| `waitlistsubmission` | Waitlist entries |
| `zat_geo_borough_toplevel` | Borough/region reference |
| `zat_features_amenity` | Amenity options |
| `zat_features_cancellationpolicy` | Cancellation policy options |
| `zat_features_houserule` | House rule options |
| `zat_features_listingtype` | Listing type options |
| `zat_features_parkingoptions` | Parking options |
| `zat_features_storageoptions` | Storage options |
| `zat_goodguestreasons` | Good guest reason options |
| `zat_htmlembed` | HTML embed snippets |
| `zat_location` | Location reference |
| `zat_policiesdocuments` | Policy documents |
| `zat_priceconfiguration` | Pricing config |
| `zat_splitleaseteam` | Team member info |
| `zat_storage` | Storage reference |
| `zat_successstory` | Success stories |
| `zat_blocked_vm_bookingtimes` | Blocked meeting times |
| `zat_faq` | FAQ entries |
| `zep_curationparameter` | Curation parameters |
| `zep_twilio` | Twilio config |
| `zep_twiliocheckin` | Twilio check-in config |
| `zep_twiliocheckout` | Twilio check-out config |
| `zfut_proofofcleaning` | Cleaning proof (future) |
| `zfut_safetyfeatures` | Safety features (future) |
| `zfut_storagephotos` | Storage photos (future) |

---

## JSONB Array Fields

Many tables contain JSONB fields that store arrays of Bubble IDs. These represent one-to-many or many-to-many relationships.

### Pattern
```json
["1234567890123x0000000000000001", "1234567890123x0000000000000002"]
```

### Key JSONB Array Relationships

| Table | Field | Contains Array Of |
|-------|-------|-------------------|
| `account_host` | `Listings` | `listing._id` |
| `account_host` | `House manuals` | `housemanual._id` |
| `bookings_leases` | `List of Stays` | `bookings_stays._id` |
| `bookings_leases` | `Payment Records Guest-SL` | `paymentrecords._id` |
| `bookings_leases` | `Date Change Requests` | `datechangerequest._id` |
| `bookings_leases` | `Participants` | `user._id` |
| `housemanual` | `Leases attached...` | `bookings_leases._id` |
| `housemanual` | `ALL Narrations and Jingles` | `narration._id` |
| `housemanual` | `Visitors` | `visit._id` |
| `listing` | `Features - Photos` | `listing_photo._id` |
| `listing` | `Reviews` | `mainreview._id` |
| `listing` | `Users that favorite` | `user._id` |
| `listing` | `Features - Amenities In-Unit` | `zat_features_amenity._id` |
| `mainreview` | `Rating Details` | `ratingdetail_reviews_._id` |
| `proxysmssession` | `Multi Message` | `multimessage._id` |
| `rentalapplication` | `Hosts (users) able to see...` | `user._id` |
| `visit` | `LIST of Narration / Jingles` | `narration._id` |

---

## Notes & Caveats

### 1. Orphaned References
Some FK fields contain IDs that don't exist in the target table. This may be due to:
- Deleted records in Bubble that weren't cascade-deleted
- Incomplete data migration
- Data from test/development environments

**Affected fields:**
- `mainreview.Lease`
- `file.Proposal Associated`
- `negotiationsummary.Proposal associated`
- `virtualmeetingschedulesandlinks.proposal`
- `datechangerequest.Lease`

### 2. Missing Tables
Some referenced tables haven't been migrated yet:
- Thread/Conversation table (referenced by `_message`, `multimessage`, `proxysmssession`, `bookings_leases`)

### 3. Special Values
- `Created By` field can sometimes be `"no_user"` instead of a valid user ID
- Some timestamps are stored as text strings rather than proper timestamps

### 4. Case Sensitivity
Column names in Bubble preserve original casing with spaces. When querying:
```sql
-- Use double quotes for column names with spaces/special chars
SELECT "Host / Landlord", "Location - Borough" FROM listing;
```

### 5. Non-Bubble Tables
Some tables don't follow Bubble conventions:
- `virtual_meetings` - uses `id` (not `_id`) as PK, has `proposal_id` FK
- `external_reviews` - uses `id` (not `_id`) as PK, has `listing_id` FK
- `proposals` - different from `proposal`, uses `id` as PK
- `users` - different from `user`, may be Supabase auth table
- `notification_preferences` - likely Supabase native table
- `audit_log` - system logging table

---

## Existing Foreign Key Constraints

The following FK constraints are already defined in the database:

```sql
-- listing table
fk_listing_borough: listing."Location - Borough" → zat_geo_borough_toplevel._id
fk_listing_hood: listing."Location - Hood" → zat_geo_hood_mediumlevel._id

-- external_reviews table
external_reviews_listing_id_fkey: external_reviews.listing_id → listing._id
```

---

## Quick Reference: Common Joins

### Get listing with host info
```sql
SELECT l.*, ah."User" as host_user_id, u."First Name", u."Last Name"
FROM listing l
JOIN account_host ah ON l."Host / Landlord" = ah._id
JOIN "user" u ON ah."User" = u._id;
```

### Get booking with all parties
```sql
SELECT
  bl.*,
  guest."First Name" as guest_name,
  host_user."First Name" as host_name,
  l."Name" as listing_name
FROM bookings_leases bl
JOIN "user" guest ON bl."Guest" = guest._id
JOIN account_host ah ON bl."Host" = ah._id
JOIN "user" host_user ON ah."User" = host_user._id
JOIN listing l ON bl."Listing" = l._id;
```

### Get reviews for a listing
```sql
SELECT mr.*, u."First Name" as reviewer_name
FROM mainreview mr
JOIN bookings_stays bs ON mr."Stay" = bs._id
JOIN "user" u ON mr."Reviewer" = u._id
WHERE bs.listing = 'YOUR_LISTING_ID';
```

---

## Verification Summary

All relationships documented above were verified on **2026-01-20** by:
1. Sampling actual data from each table
2. Checking that FK values exist in the referenced target tables
3. Documenting any orphaned references or missing target records

### Verification Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | **Verified** - Sample FK value found in target table |
| ⚠ partial | **Partially Verified** - Some FK values exist, others are orphaned |
| nullable | **Nullable Field** - Field can be null, relationship verified when data exists |
| *(not migrated)* | **Target table not in database** - Referenced table doesn't exist yet |

### Tables with Orphaned References

These tables have FK fields where some values don't match records in the target table:

| Source Table | FK Field | Target Table | Issue |
|--------------|----------|--------------|-------|
| `bookings_leases` | `Proposal` | `proposal` | Some proposal IDs not found |
| `datechangerequest` | `Lease` | `bookings_leases` | Some lease IDs not found |
| `file` | `Proposal Associated` | `proposal` | Some proposal IDs not found |
| `mainreview` | `Lease` | `bookings_leases` | Some lease IDs not found |
| `negotiationsummary` | `Proposal associated` | `proposal` | Some proposal IDs not found |
| `virtualmeetingschedulesandlinks` | `proposal` | `proposal` | Some proposal IDs not found |
| `datacollection_searchlogging` | `User` | `user` | Some user IDs not found |

### Missing Thread/Conversation Table

Multiple tables reference a "Thread/Conversation" entity that doesn't exist in the database:
- `_message.Associated Thread/Conversation`
- `multimessage.Thread / Conversation`
- `proxysmssession.Thread / Conversation`
- `bookings_leases.Thread`

This table may need to be migrated from Bubble or created in Supabase.

---

*Document maintained by Split Lease engineering team*
