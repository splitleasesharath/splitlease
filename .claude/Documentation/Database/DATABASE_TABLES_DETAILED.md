# Database Tables - Detailed Reference

> **Source of Truth** | Generated: 2026-01-20 | Verified against live Supabase
> **See also**: [DATABASE_OPTION_SETS_QUICK_REFERENCE.md](./DATABASE_OPTION_SETS_QUICK_REFERENCE.md) | [OPTION_SETS_DETAILED.md](./OPTION_SETS_DETAILED.md)

---

## Table of Contents

1. [Overview](#overview)
2. [User Domain](#user-domain)
3. [Property Domain](#property-domain)
4. [Booking Domain](#booking-domain)
5. [Messaging Domain](#messaging-domain)
6. [Financial Domain](#financial-domain)
7. [Review Domain](#review-domain)
8. [Support Domain](#support-domain)
9. [Content Domain](#content-domain)
10. [Feature/Lookup Tables](#featurelookup-tables)
11. [Foreign Key Index](#foreign-key-index)
12. [JSONB Array Index](#jsonb-array-index)

---

## Overview

### Primary Key Patterns
| Pattern | Format | Used By |
|---------|--------|---------|
| Bubble `_id` | `{timestamp}x{random}` | All Bubble-synced tables |
| Supabase `id` | UUID or BIGINT | Native Supabase tables |

### Column Naming Conventions
| Bubble Convention | Example |
|-------------------|---------|
| Space-separated | `Created Date`, `Host / Landlord` |
| Requires quoting | `SELECT "Location - Hood" FROM listing` |

---

## User Domain

### `user` (Bubble)
**Purpose**: Primary user profile table | **Rows**: 876

#### Identity Fields
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `_id` | text | NO | PK, Bubble format |
| `Name - Full` | text | YES | Full name |
| `Name - First` | text | YES | First name |
| `Name - Last` | text | YES | Last name |
| `email as text` | text | YES | Email address |
| `Phone Number (as text)` | text | YES | Phone |
| `Profile Photo` | text | YES | Photo URL |
| `Date of Birth` | timestamptz | YES | DOB |

#### Type Classification
| Column | Type | Nullable | Values |
|--------|------|----------|--------|
| `Type - User Current` | text | YES | → `os_user_type` |
| `Type - User Signup` | text | YES | Original signup type |
| `User Sub Type` | text | YES | → `os_user_subtype` |
| `Account - Guest` | text | YES | FK → `account_guest._id` |
| `Account - Host / Landlord` | text | YES | FK → `account_host._id` |
| `Toggle - Is Admin` | boolean | YES | Admin flag |
| `Toggle - Is Corporate User` | boolean | YES | Corporate flag |

#### Verification
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `is email confirmed` | boolean | YES | Email verified |
| `user verified?` | boolean | YES | Identity verified |
| `Verify - Phone` | boolean | YES | Phone verified |
| `Verify - Linked In ID` | text | YES | LinkedIn ID |
| `Google ID` | text | YES | Google OAuth ID |
| `StripeCustomerID` | text | YES | Stripe customer |

#### Preferences
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `Preferred Borough` | text | YES | Borough preference |
| `Preferred Hoods` | jsonb | YES | Array of hood IDs |
| `Preferred weekly schedule` | text | YES | Schedule type |
| `Mobile Notifications On` | boolean | YES | Push notifications |
| `Notification Settings OS(lisits)` | text | YES | FK → `notificationsettingsos_lists_` |

#### JSONB Arrays
| Column | Contains |
|--------|----------|
| `Favorited Listings` | Array of `listing._id` |
| `Leases` | Array of `bookings_leases._id` |
| `Proposals List` | Array of `proposal._id` |
| `Chat - Threads` | Array of thread IDs |
| `Recent Days Selected` | Day selection history |

#### Timestamps
| Column | Type | Nullable |
|--------|------|----------|
| `Created Date` | timestamptz | YES |
| `Modified Date` | timestamptz | YES |
| `created_at` | timestamptz | YES |
| `updated_at` | timestamptz | YES |

---

### `users` (Supabase Auth)
**Purpose**: Native Supabase authentication | **Rows**: Variable

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | uuid | NO | PK |
| `email` | varchar | YES | Email |
| `encrypted_password` | varchar | YES | Hashed password |
| `name_first` | varchar | YES | First name |
| `name_last` | varchar | YES | Last name |
| `profile_photo` | text | YES | Photo URL |
| `bio` | text | YES | Bio |
| `phone` | text | YES | Phone |
| `email_confirmed_at` | timestamptz | YES | Email verification |
| `email_verified` | boolean | YES | Verified flag |
| `phone_verified` | boolean | YES | Phone verified |
| `identity_verified` | boolean | YES | ID verified |
| `linkedin_verified` | boolean | YES | LinkedIn verified |
| `is_sso_user` | boolean | YES | SSO user |
| `is_anonymous` | boolean | YES | Anonymous |
| `is_super_admin` | boolean | YES | Super admin |
| `banned_until` | timestamptz | YES | Ban expiry |
| `deleted_at` | timestamptz | YES | Soft delete |
| `last_sign_in_at` | timestamptz | YES | Last login |

---

### `account_guest`
**Purpose**: Guest profile extension | **Rows**: 652

| Column | Type | Nullable | FK Target |
|--------|------|----------|-----------|
| `_id` | text | NO | PK |
| `User` | text | YES | `user._id` |
| `Created By` | text | YES | `user._id` |

---

### `account_host`
**Purpose**: Host profile extension | **Rows**: 847

| Column | Type | Nullable | FK Target |
|--------|------|----------|-----------|
| `_id` | text | NO | PK |
| `User` | text | YES | `user._id` |
| `Created By` | text | YES | `user._id` |

**JSONB Arrays**:
| Column | Contains |
|--------|----------|
| `Listings` | Array of `listing._id` |
| `House manuals` | Array of `housemanual._id` |
| `Co-Hosts Requests` | Array of `co_hostrequest._id` |
| `Listings to claim` | Array of `listing._id` |

---

## Property Domain

### `listing`
**Purpose**: Property listings | **Rows**: 265 | **RLS**: Disabled

#### Identity
| Column | Type | Nullable | FK Target |
|--------|------|----------|-----------|
| `_id` | text | NO | PK |
| `Name` | text | YES | Listing name |
| `Host / Landlord` | text | YES | `account_host._id` |
| `Host email` | text | YES | Host email |
| `host name` | text | YES | Host name |
| `Created By` | text | YES | `user._id` |

#### Location
| Column | Type | Nullable | FK Target |
|--------|------|----------|-----------|
| `Location - Address` | jsonb | YES | Full address object |
| `Location - City` | text | YES | City |
| `Location - State` | text | YES | State |
| `Location - Borough` | text | YES | `zat_geo_borough_toplevel._id` |
| `Location - Hood` | text | YES | `zat_geo_hood_mediumlevel._id` |
| `Location - Hoods (new)` | jsonb | YES | Array of hood IDs |
| `Location - Zip Code` | text | YES | ZIP |
| `Location - Coordinates` | jsonb | YES | `{lat, lng}` |
| `neighborhood (manual input by user)` | text | YES | Manual input |

#### Property Features
| Column | Type | Nullable | Reference |
|--------|------|----------|-----------|
| `Features - Type of Space` | text | YES | → `os_space_type` |
| `Features - Qty Bedrooms` | integer | YES | → `os_bedrooms` |
| `Features - Qty Beds` | integer | YES | → `os_beds` |
| `Features - Qty Bathrooms` | integer | YES | → `os_bathrooms` |
| `Features - Qty Guests` | integer | YES | → `os_qty_guests` |
| `Features - SQFT Area` | integer | YES | Square feet |
| `Features - SQFT of Room` | integer | YES | Room sqft |
| `Features - Trial Periods Allowed` | boolean | NO | Trial allowed |
| `Kitchen Type` | text | YES | → `os_kitchen_type` |
| `Features - Parking type` | text | YES | → `os_storage_parking_type` |
| `Features - Secure Storage Option` | text | YES | → `os_storage_parking_type` |

#### JSONB Feature Arrays
| Column | Contains | Reference |
|--------|----------|-----------|
| `Features - Amenities In-Unit` | Array | `zat_features_amenity._id` |
| `Features - Amenities In-Building` | Array | `zat_features_amenity._id` |
| `Features - House Rules` | Array | `zat_features_houserule._id` |
| `Features - Safety` | Array | `zfut_safetyfeatures._id` |
| `Features - Photos` | Array | `listing_photo._id` |

#### Availability
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `Active` | boolean | YES | Listing active |
| `Approved` | boolean | YES | Admin approved |
| `Complete` | boolean | YES | Profile complete |
| `Days Available (List of Days)` | jsonb | NO | Available days array |
| `Days Not Available` | jsonb | YES | Unavailable days |
| `Dates - Blocked` | jsonb | YES | Blocked date ranges |
| `Nights Available (List of Nights)` | jsonb | NO | Available nights |
| `Nights Not Available` | jsonb | YES | Unavailable nights |
| ` First Available` | text | YES | First available date |
| `Last Available` | text | YES | Last available date |
| `# of nights available` | integer | YES | Night count |
| `confirmedAvailability` | boolean | YES | Confirmed |
| `weeks out to available` | integer | YES | Weeks out |

#### Pricing
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `💰Nightly Host Rate for 2 nights` | numeric | YES | 2-night rate |
| `💰Nightly Host Rate for 3 nights` | numeric | YES | 3-night rate |
| `💰Nightly Host Rate for 4 nights` | numeric | YES | 4-night rate |
| `💰Nightly Host Rate for 5 nights` | numeric | YES | 5-night rate |
| `💰Nightly Host Rate for 7 nights` | numeric | YES | 7-night rate |
| `💰Weekly Host Rate` | numeric | YES | Weekly rate |
| `💰Monthly Host Rate` | integer | YES | Monthly rate |
| `💰Cleaning Cost / Maintenance Fee` | integer | YES | Cleaning fee |
| `💰Damage Deposit` | integer | NO | Deposit |
| `💰Unit Markup` | integer | YES | Markup |
| `💰Price Override` | integer | YES | Override |
| `Standarized Minimum Nightly Price (Filter)` | numeric | YES | Min price |

#### Duration Constraints
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `Minimum Nights` | integer | NO | Min nights |
| `Minimum Weeks` | integer | YES | Min weeks |
| `Minimum Months` | integer | YES | Min months |
| `Maximum Nights` | integer | YES | Max nights |
| `Maximum Weeks` | integer | NO | Max weeks |
| `Maximum Months` | integer | YES | Max months |

#### Check-In/Out
| Column | Type | Nullable | Reference |
|--------|------|----------|-----------|
| `NEW Date Check-in Time` | text | NO | → `os_check_in_out_times` |
| `NEW Date Check-out Time` | text | NO | → `os_check_in_out_times` |

#### Relations
| Column | Type | Nullable | FK Target |
|--------|------|----------|-----------|
| `House manual` | text | YES | `housemanual._id` |
| `host restrictions` | text | YES | `hostrestrictions._id` |
| `pricing_list` | text | YES | `pricing_list._id` |
| `Cancellation Policy` | text | YES | → `zat_features_cancellationpolicy` |

#### Engagement JSONB
| Column | Contains |
|--------|----------|
| `Users that favorite` | Array of `user._id` |
| `Viewers` | Array of `user._id` |
| `Clickers` | Array of `user._id` |
| `Reviews` | Array of `mainreview._id` |
| `AI Suggestions List` | Array of `zat_aisuggestions._id` |
| `users with permission` | Array of `user._id` |

---

### `listing_photo`
**Purpose**: Listing photos | **Rows**: 4,604 | **RLS**: Enabled

| Column | Type | Nullable | FK Target |
|--------|------|----------|-----------|
| `_id` | text | NO | PK |
| `Listing` | text | YES | `listing._id` |
| `Created By` | text | YES | `user._id` |
| `Photo` | text | YES | Photo URL |
| `Type` | text | YES | → `os_listing_photo_type` |
| `Order` | integer | YES | Display order |

---

### `housemanual`
**Purpose**: House manuals | **Rows**: 195

| Column | Type | Nullable | FK Target |
|--------|------|----------|-----------|
| `_id` | text | NO | PK |
| `Host` | text | YES | `account_host._id` |
| `Listing` | text | YES | `listing._id` |
| `Created By` | text | YES | `user._id` |

**JSONB Arrays**:
| Column | Contains |
|--------|----------|
| `Leases attached to this house manual` | `bookings_leases._id` |
| `ALL Narrations and Jingles` | `narration._id` |
| `QR Codes` | `qrcodes._id` |
| `House manual photos for specific guidelines` | `housemanualphotos._id` |
| `Visitors` | `visit._id` |
| `AI Suggestions` | `zat_aisuggestions._id` |

---

### `housemanualphotos`
**Purpose**: Manual photos | **Rows**: 4

| Column | Type | Nullable | FK Target |
|--------|------|----------|-----------|
| `_id` | text | NO | PK |
| `house manual` | text | YES | `housemanual._id` |
| `Created By` | text | YES | `user._id` |

---

### `hostrestrictions`
**Purpose**: Host restrictions per listing | **Rows**: 33

| Column | Type | Nullable | FK Target |
|--------|------|----------|-----------|
| `_id` | text | NO | PK |
| `listing` | text | YES | `listing._id` |
| `Created By` | text | YES | `user._id` |

---

### `pricing_list`
**Purpose**: Pricing configurations

| Column | Type | Nullable | FK Target |
|--------|------|----------|-----------|
| `_id` | text | NO | PK |
| `listing` | text | YES | `listing._id` |

---

## Booking Domain

### `proposal` (Legacy)
**Purpose**: Legacy proposals | **Rows**: 687

#### Identity
| Column | Type | Nullable | FK Target |
|--------|------|----------|-----------|
| `_id` | text | NO | PK |
| `Guest` | text | YES | `user._id` |
| `Host - Account` | text | YES | `account_host._id` |
| `Listing` | text | YES | `listing._id` |
| `Created By` | text | YES | `user._id` |

#### Reservation Config
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `Move in range start` | text | YES | Start date |
| `Move in range end` | text | YES | End date |
| `Reservation Span` | text | YES | Text description |
| `Reservation Span (Weeks)` | integer | YES | Weeks count |
| `Nights Selected (Nights list)` | jsonb | YES | Nights array |
| `Days Selected` | jsonb | YES | Days array |
| `Days Available` | jsonb | YES | Available days |
| `Complementary Nights` | jsonb | NO | Required |
| `Complementary Days` | jsonb | YES | Complementary |
| `check in day` | text | YES | Check-in day |
| `check out day` | text | YES | Check-out day |

#### Pricing
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `4 week rent` | numeric | NO | 4-week rent |
| `4 week compensation` | integer | YES | Host compensation |
| `proposal nightly price` | numeric | YES | Nightly price |
| `Total Price for Reservation (guest)` | numeric | NO | Guest total |
| `Total Compensation (proposal - host)` | numeric | YES | Host total |
| `cleaning fee` | integer | YES | Cleaning |
| `damage deposit` | integer | YES | Deposit |

#### Host Counter (HC) Fields
| Column | Type | Nullable |
|--------|------|----------|
| `hc 4 week rent` | integer | YES |
| `hc check in day` | text | YES |
| `hc check out day` | text | YES |
| `hc cleaning fee` | integer | YES |
| `hc damage deposit` | integer | YES |
| `hc days selected` | jsonb | YES |
| `hc move in date` | timestamptz | YES |
| `hc nightly price` | numeric | YES |
| `hc nights per week` | integer | YES |
| `hc nights selected` | jsonb | YES |
| `hc reservation span (weeks)` | integer | YES |
| `hc total price` | numeric | YES |

#### Status
| Column | Type | Nullable | Reference |
|--------|------|----------|-----------|
| `Status` | text | NO | → `os_proposal_status` |
| `Is Finalized` | boolean | NO | Finalized flag |
| `Deleted` | boolean | YES | Soft delete |
| `counter offer happened` | boolean | YES | Counter flag |
| `reason for cancellation` | text | YES | Cancellation reason |

#### Guest Info
| Column | Type | Nullable |
|--------|------|----------|
| `Guest email` | text | NO |
| `Guest flexibility` | text | YES |
| `About yourself` | text | YES |
| `Special needs` | text | YES |
| `need for space` | text | YES |
| `preferred gender` | text | YES |
| `rental type` | text | YES |
| `custom_schedule_description` | text | YES | Guest's free-form description of preferred recurrent schedule |

#### Relations
| Column | Type | Nullable | FK Target |
|--------|------|----------|-----------|
| `rental application` | text | YES | `rentalapplication._id` |
| `virtual meeting` | text | YES | `virtualmeetingschedulesandlinks._id` |

#### JSONB Arrays
| Column | Contains |
|--------|----------|
| `Drafts List` | File/document IDs |
| `History` | `negotiationsummary._id` |
| `Negotiation Summary` | Summary data |

---

### `proposals` (New)
**Purpose**: Normalized proposals | **Rows**: 0

| Column | Type | Nullable | FK Target |
|--------|------|----------|-----------|
| `id` | text | NO | PK |
| `listing_id` | text | YES | `listing._id` |
| `guest_id` | text | YES | `user._id` |
| `host_id` | text | YES | `user._id` |
| `move_in_range_start` | date | YES | Start date |
| `move_in_range_end` | date | YES | End date |
| `reservation_span_weeks` | integer | YES | Weeks |
| `days_selected` | ARRAY | YES | Days array |
| `nights_per_week` | integer | YES | Nights |
| `check_in_day` | text | YES | Check-in |
| `check_out_day` | text | YES | Check-out |
| `nightly_price` | numeric | YES | Price |
| `total_price` | numeric | YES | Total |
| `cleaning_fee` | numeric | YES | Cleaning |
| `damage_deposit` | numeric | YES | Deposit |
| `status` | varchar | YES | → `os_proposal_status` |
| `current_stage` | integer | YES | Stage |
| `completed_stages` | ARRAY | YES | Completed stages |
| `is_suggested_by_host` | boolean | YES | Host suggestion |
| `deleted` | boolean | YES | Soft delete |

---

### `bookings_leases`
**Purpose**: Lease agreements | **Rows**: 156

| Column | Type | Nullable | FK Target |
|--------|------|----------|-----------|
| `_id` | text | NO | PK |
| `Agreement Number` | text | YES | Unique agreement |
| `Proposal` | text | YES | `proposal._id` |
| `Listing` | text | YES | `listing._id` |
| `Guest` | text | YES | `user._id` |
| `Host` | text | YES | `account_host._id` |
| `Created By` | text | YES | `user._id` |
| `Thread` | text | YES | Thread ID |

#### Status & Dates
| Column | Type | Nullable | Reference |
|--------|------|----------|-----------|
| `Lease Status` | text | YES | → `os_lease_status` |
| `Reservation Period : Start` | text | YES | Start date |
| `Reservation Period : End` | text | YES | End date |
| `current week number` | integer | YES | Current week |
| `total week count` | integer | YES | Total weeks |
| `Lease signed?` | boolean | NO | Signed flag |

#### Financial
| Column | Type | Nullable |
|--------|------|----------|
| `Total Rent` | numeric | YES |
| `Total Compensation` | integer | YES |
| `Paid to Date from Guest` | numeric | YES |

#### JSONB Arrays
| Column | Contains |
|--------|----------|
| `List of Stays` | `bookings_stays._id` |
| `List of Booked Dates` | Date array |
| `Payment Records Guest-SL` | `paymentrecords._id` |
| `Payment Records SL-Hosts` | `paymentrecords._id` |
| `Date Change Requests` | `datechangerequest._id` |
| `Participants` | `user._id` |

---

### `bookings_stays`
**Purpose**: Individual stay periods | **Rows**: 17,601

| Column | Type | Nullable | FK Target |
|--------|------|----------|-----------|
| `_id` | text | NO | PK |
| `Lease` | text | YES | `bookings_leases._id` |
| `listing` | text | YES | `listing._id` |
| `Guest` | text | YES | `user._id` |
| `Host` | text | YES | `user._id` |
| `Created By` | text | YES | `user._id` |
| `Review Submitted by Guest` | text | YES | `mainreview._id` |
| `Review Submitted by Host` | text | YES | `mainreview._id` |
| `status` | text | YES | → `os_stay_status` |

---

### `negotiationsummary`
**Purpose**: Proposal negotiations | **Rows**: 375

| Column | Type | Nullable | FK Target |
|--------|------|----------|-----------|
| `_id` | text | NO | PK |
| `Proposal associated` | text | YES | `proposal._id` |
| `Created By` | text | YES | `user._id` |

---

### `datechangerequest`
**Purpose**: Date change requests | **Rows**: 99

| Column | Type | Nullable | FK Target |
|--------|------|----------|-----------|
| `_id` | text | NO | PK |
| `Lease` | text | YES | `bookings_leases._id` |
| `Requested by` | text | YES | `user._id` |
| `Request receiver` | text | YES | `user._id` |
| `Stay Associated 1` | text | YES | `bookings_stays._id` |
| `Stay Associated 2` | text | YES | `bookings_stays._id` |
| `Created By` | text | YES | `user._id` |
| `status` | text | YES | → `os_date_change_request_status` |

---

## Messaging Domain

### `_message`
**Purpose**: Bubble messages | **Rows**: 6,244

| Column | Type | Nullable | FK Target |
|--------|------|----------|-----------|
| `_id` | text | NO | PK |
| `-Guest User` | text | YES | `user._id` |
| `-Host User` | text | YES | `user._id` |
| `-Originator User` | text | YES | `user._id` |
| `Created By` | text | YES | `user._id` |
| `~previous Message` | text | YES | `_message._id` |
| `Associated Thread/Conversation` | text | YES | Thread (not migrated) |
| `Date Change Request involved` | text | YES | `datechangerequest._id` |
| `Review involved` | text | YES | `mainreview._id` |

---

### `multimessage`
**Purpose**: SMS/Email messages | **Rows**: 359

| Column | Type | Nullable | FK Target |
|--------|------|----------|-----------|
| `_id` | text | NO | PK |
| `Recipient(User)` | text | YES | `user._id` |
| `Sender(User)` | text | YES | `user._id` |
| `SMS Session` | text | YES | `proxysmssession._id` |
| `Thread / Conversation` | text | YES | Thread (not migrated) |
| `Created By` | text | YES | `user._id` |
| `status` | text | YES | → `os_multi_message_status` |

---

### `proxysmssession`
**Purpose**: SMS proxy sessions

| Column | Type | Nullable | FK Target |
|--------|------|----------|-----------|
| `_id` | text | NO | PK |
| `Thread / Conversation` | text | YES | Thread (not migrated) |
| `Created By` | text | YES | `user._id` |

**JSONB Arrays**:
| Column | Contains |
|--------|----------|
| `Multi Message` | `multimessage._id` |

---

## Financial Domain

### `paymentrecords`
**Purpose**: Payment tracking | **Rows**: 4,015

| Column | Type | Nullable | FK Target |
|--------|------|----------|-----------|
| `_id` | text | NO | PK |
| `Booking - Reservation` | text | YES | `bookings_leases._id` |
| `Created By` | text | YES | `user._id` |

---

### `paymentsfromdatechanges`
**Purpose**: Date change payments | **Rows**: 18

| Column | Type | Nullable | FK Target |
|--------|------|----------|-----------|
| `_id` | text | NO | PK |
| `date change request` | text | YES | `datechangerequest._id` |
| `lease` | text | YES | `bookings_leases._id` |
| `payer` | text | YES | `user._id` |
| `receiver` | text | YES | `user._id` |
| `Created By` | text | YES | `user._id` |

---

### `fieldsforleasedocuments`
**Purpose**: Lease document fields | **Rows**: 14

| Column | Type | Nullable |
|--------|------|----------|
| `_id` | text | NO |

---

## Review Domain

### `mainreview`
**Purpose**: Reviews | **Rows**: 32

| Column | Type | Nullable | FK Target |
|--------|------|----------|-----------|
| `_id` | text | NO | PK |
| `Reviewer` | text | YES | `user._id` |
| `Reviewee/Target` | text | YES | `user._id` |
| `Stay` | text | YES | `bookings_stays._id` |
| `Lease` | text | YES | `bookings_leases._id` |
| `House Manual` | text | YES | `housemanual._id` |
| `Visit` | text | YES | `visit._id` |
| `Created By` | text | YES | `user._id` |
| `type` | text | YES | → `os_review_type` |

**JSONB Arrays**:
| Column | Contains |
|--------|----------|
| `Rating Details` | `ratingdetail_reviews_._id` |

---

### `ratingdetail_reviews_`
**Purpose**: Rating breakdowns

| Column | Type | Nullable | FK Target |
|--------|------|----------|-----------|
| `_id` | text | NO | PK |
| `Review` | text | YES | `mainreview._id` |
| `Created By` | text | YES | `user._id` |

---

### `external_reviews`
**Purpose**: External reviews

| Column | Type | Nullable | FK Target |
|--------|------|----------|-----------|
| `id` | uuid | NO | PK (Supabase native) |
| `listing_id` | text | YES | `listing._id` |

**FK Constraint**: `external_reviews_listing_id_fkey`

---

## Support Domain

### `rentalapplication`
**Purpose**: Rental applications

| Column | Type | Nullable | FK Target |
|--------|------|----------|-----------|
| `_id` | text | NO | PK |
| `Created By` | text | YES | `user._id` |

**JSONB Arrays**:
| Column | Contains |
|--------|----------|
| `Hosts (users) able to see this rental app` | `user._id` |
| `occupants list` | `occupant._id` |

---

### `occupant`
**Purpose**: Occupant records | **Rows**: 50

| Column | Type | Nullable | FK Target |
|--------|------|----------|-----------|
| `_id` | text | NO | PK |

---

### `co_hostrequest`
**Purpose**: Co-host requests | **Rows**: 26

| Column | Type | Nullable | FK Target |
|--------|------|----------|-----------|
| `_id` | text | NO | PK |
| `Co-Host User` | text | YES | `user._id` |
| `Host - Landlord` | text | YES | `account_host._id` |
| `Listing` | text | YES | `listing._id` |
| `Created By` | text | YES | `user._id` |
| `status` | text | YES | → `os_co_host_status` |

---

### `emergencyreports`
**Purpose**: Emergency reports | **Rows**: 34

| Column | Type | Nullable | FK Target |
|--------|------|----------|-----------|
| `_id` | text | NO | PK |
| `Reservation` | text | YES | `bookings_leases._id` |
| `reported by` | text | YES | `user._id` |
| `Created By` | text | YES | `user._id` |

---

### `referral`
**Purpose**: Referral tracking

| Column | Type | Nullable | FK Target |
|--------|------|----------|-----------|
| `_id` | text | NO | PK |
| `fromUser` | text | YES | `user._id` |
| `Created By` | text | YES | `user._id` |

---

## Content Domain

### `knowledgebase`
**Purpose**: KB articles | **Rows**: 56

| Column | Type | Nullable |
|--------|------|----------|
| `_id` | text | NO |

---

### `knowledgebaselineitem`
**Purpose**: KB items | **Rows**: 272

| Column | Type | Nullable | FK Target |
|--------|------|----------|-----------|
| `_id` | text | NO | PK |
| `knowledgebase` | text | YES | `knowledgebase._id` |

---

### `informationaltexts`
**Purpose**: UI texts | **Rows**: 84

| Column | Type | Nullable |
|--------|------|----------|
| `_id` | text | NO |

---

## Feature/Lookup Tables

### zat_features_* (Listing Features)
| Table | Description | Used By |
|-------|-------------|---------|
| `zat_features_amenity` | Amenity options | `listing.Features - Amenities *` (JSONB) |
| `zat_features_cancellationpolicy` | Cancellation policies | `listing.Cancellation Policy` |
| `zat_features_houserule` | House rules | `listing.Features - House Rules` (JSONB) |
| `zat_features_listingtype` | Listing types | `listing` |
| `zat_features_parkingoptions` | Parking options | `listing` |
| `zat_features_storageoptions` | Storage options | `listing` |

### zat_geo_* (Geography)
| Table | Description | FK Constraint |
|-------|-------------|---------------|
| `zat_geo_borough_toplevel` | Boroughs | `fk_listing_borough` |
| `zat_geo_hood_mediumlevel` | Neighborhoods | `fk_listing_hood` |
| `zat_location` | Location refs | - |

### zat_* (Other)
| Table | Description |
|-------|-------------|
| `zat_aisuggestions` | AI suggestions |
| `zat_blocked_vm_bookingtimes` | Blocked meeting times |
| `zat_email_html_template_eg_sendbasicemailwf_` | Email templates |
| `zat_faq` | FAQ content |
| `zat_goodguestreasons` | Good guest reasons |
| `zat_htmlembed` | HTML embeds |
| `zat_policiesdocuments` | Policy docs |
| `zat_priceconfiguration` | Price config |
| `zat_splitleaseteam` | Team data |
| `zat_storage` | Storage |
| `zat_successstory` | Success stories |

### zfut_* (Future)
| Table | Description |
|-------|-------------|
| `zfut_proofofcleaning` | Cleaning proof |
| `zfut_safetyfeatures` | Safety features |
| `zfut_storagephotos` | Storage photos |

### zep_* (Integration)
| Table | Description |
|-------|-------------|
| `zep_curationparameter` | Curation params |
| `zep_twilio` | Twilio config |
| `zep_twiliocheckin` | Check-in config |
| `zep_twiliocheckout` | Check-out config |

---

## Foreign Key Index

### Database-Level FK Constraints
```sql
fk_listing_borough: listing."Location - Borough" → zat_geo_borough_toplevel._id
fk_listing_hood: listing."Location - Hood" → zat_geo_hood_mediumlevel._id
external_reviews_listing_id_fkey: external_reviews.listing_id → listing._id
```

### Application-Level FK References

#### To `user._id`
- `account_guest.User`, `account_guest.Created By`
- `account_host.User`, `account_host.Created By`
- `_message.-Guest User`, `_message.-Host User`, `_message.-Originator User`
- `bookings_leases.Guest`, `bookings_stays.Guest`, `bookings_stays.Host`
- `proposal.Guest`, `proposals.guest_id`, `proposals.host_id`
- `mainreview.Reviewer`, `mainreview.Reviewee/Target`
- `multimessage.Recipient(User)`, `multimessage.Sender(User)`
- Most `Created By` fields

#### To `listing._id`
- `listing_photo.Listing`
- `housemanual.Listing`
- `hostrestrictions.listing`
- `proposal.Listing`, `proposals.listing_id`
- `bookings_leases.Listing`, `bookings_stays.listing`
- `co_hostrequest.Listing`
- `external_reviews.listing_id`

#### To `account_host._id`
- `listing.Host / Landlord`
- `housemanual.Host`
- `proposal.Host - Account`
- `bookings_leases.Host`
- `co_hostrequest.Host - Landlord`

#### To `bookings_leases._id`
- `bookings_stays.Lease`
- `paymentrecords.Booking - Reservation`
- `datechangerequest.Lease`
- `paymentsfromdatechanges.lease`
- `mainreview.Lease`
- `emergencyreports.Reservation`
- `file.Lease Associated`

#### To `proposal._id`
- `bookings_leases.Proposal`
- `negotiationsummary.Proposal associated`
- `virtualmeetingschedulesandlinks.proposal`
- `file.Proposal Associated`
- `virtual_meetings.proposal_id`

---

## JSONB Array Index

### User Arrays
| Table.Field | Contains |
|-------------|----------|
| `user.Favorited Listings` | `listing._id` |
| `user.Leases` | `bookings_leases._id` |
| `user.Proposals List` | `proposal._id` |
| `user.Preferred Hoods` | `zat_geo_hood_mediumlevel._id` |

### Listing Arrays
| Table.Field | Contains |
|-------------|----------|
| `listing.Features - Photos` | `listing_photo._id` |
| `listing.Features - Amenities In-Unit` | `zat_features_amenity._id` |
| `listing.Features - Amenities In-Building` | `zat_features_amenity._id` |
| `listing.Features - House Rules` | `zat_features_houserule._id` |
| `listing.Features - Safety` | Safety feature IDs |
| `listing.Reviews` | `mainreview._id` |
| `listing.Users that favorite` | `user._id` |
| `listing.Location - Hoods (new)` | `zat_geo_hood_mediumlevel._id` |
| `listing.AI Suggestions List` | `zat_aisuggestions._id` |

### Account Host Arrays
| Table.Field | Contains |
|-------------|----------|
| `account_host.Listings` | `listing._id` |
| `account_host.House manuals` | `housemanual._id` |
| `account_host.Co-Hosts Requests` | `co_hostrequest._id` |

### Booking Arrays
| Table.Field | Contains |
|-------------|----------|
| `bookings_leases.List of Stays` | `bookings_stays._id` |
| `bookings_leases.Payment Records Guest-SL` | `paymentrecords._id` |
| `bookings_leases.Payment Records SL-Hosts` | `paymentrecords._id` |
| `bookings_leases.Date Change Requests` | `datechangerequest._id` |
| `bookings_leases.Participants` | `user._id` |

### House Manual Arrays
| Table.Field | Contains |
|-------------|----------|
| `housemanual.Leases attached...` | `bookings_leases._id` |
| `housemanual.ALL Narrations and Jingles` | `narration._id` |
| `housemanual.QR Codes` | `qrcodes._id` |
| `housemanual.Visitors` | `visit._id` |
| `housemanual.AI Suggestions` | `zat_aisuggestions._id` |

---

## Known Issues

### Orphaned References
| Source Table | FK Field | Issue |
|--------------|----------|-------|
| `bookings_leases` | `Proposal` | Some proposal IDs not found |
| `datechangerequest` | `Lease` | Some lease IDs not found |
| `file` | `Proposal Associated` | Some proposal IDs not found |
| `mainreview` | `Lease` | Some lease IDs not found |
| `negotiationsummary` | `Proposal associated` | Some proposal IDs not found |
| `virtualmeetingschedulesandlinks` | `proposal` | Some proposal IDs not found |

### Missing Thread Table
Tables referencing non-existent Thread/Conversation table:
- `_message.Associated Thread/Conversation`
- `multimessage.Thread / Conversation`
- `proxysmssession.Thread / Conversation`
- `bookings_leases.Thread`

---

## Cross-References

| Document | Purpose |
|----------|---------|
| [DATABASE_OPTION_SETS_QUICK_REFERENCE.md](./DATABASE_OPTION_SETS_QUICK_REFERENCE.md) | Quick lookup |
| [OPTION_SETS_DETAILED.md](./OPTION_SETS_DETAILED.md) | Option set values |
| `app/src/lib/constants/CLAUDE.md` | Status constants |

---

*Last verified: 2026-01-20 against live Supabase database*
