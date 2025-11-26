# Split Lease Database Schema Overview

## Complete Table List (93 tables)

### Core User & Account Tables
- `user` - Bubble.io user data (primary user profile table)
- `users` - Auth/Supabase users table
- `account_guest` - Guest account details
- `account_host` - Host/landlord account details
- `audit_log` - Audit logging

### Listing & Property Tables
- `listing` - Main listings table (243 rows)
- `listings` - Alternative/new listings table (12 columns, minimal schema)
- `listing_photo` - Listing photos (4,604 rows, RLS enabled)
- `hostrestrictions` - Host restrictions per listing
- `housemanual` - House manuals with extensive fields (195 rows)
- `housemanualphotos` - Photos attached to house manuals

### Proposal & Booking Tables
- `proposal` - Legacy proposals table
- `proposals` - New proposals table (normalized structure)
- `bookings_leases` - Lease/booking agreements (140 rows)
- `bookings_stays` - Individual stays within bookings (17,601 rows)
- `co_hostrequest` - Co-host requests (26 rows)

### Message & Communication Tables
- `_message` - Bubble.io message data (6,244 rows)
- `multimessage` - Multi-channel messages (SMS/email, 359 rows)
- `postmark_loginbound` - Postmark email records (10 rows)

### Date Management
- `datechangerequest` - Date change requests from guests/hosts (99 rows)
- `paymentsfromdatechanges` - Payments related to date changes (18 rows)

### Payment & Financial Tables
- `paymentrecords` - Payment tracking (4,015 rows)
- `pricing_list` - Pricing configurations
- `zat_priceconfiguration` - Price configuration settings
- `fieldsforleasedocuments` - Financial fields for lease documents (14 rows)

### Review & Rating Tables
- `mainreview` - Primary reviews (32 rows)
- `ratingdetail_reviews_` - Rating detail breakdowns
- `external_reviews` - External reviews
- `reviewslistingsexternal` - External listing reviews

### Features & Configuration Tables
- `zat_features_amenity` - Amenity options
- `zat_features_cancellationpolicy` - Cancellation policy options
- `zat_features_houserule` - House rule options
- `zat_features_listingtype` - Listing type options
- `zat_features_parkingoptions` - Parking options
- `zat_features_storageoptions` - Storage options
- `zfut_safetyfeatures` - Safety features
- `zfut_storagephotos` - Storage area photos
- `zfut_proofofcleaning` - Cleaning proof photos

### Location & Geography
- `zat_geo_borough_toplevel` - Borough data
- `zat_geo_hood_mediumlevel` - Neighborhood/hood data
- `zat_location` - Location references

### Document & File Management
- `file` - File references (128 rows)
- `documentssent` - Documents sent to users (13 rows)
- `updatestodocuments` - Document updates
- `fieldsforleasedocuments` - Document field data
- `internalfiles` - Internal files (2 rows)
- `zat_email_html_template_eg_sendbasicemailwf_` - Email templates
- `invoices` - Invoice records (2 rows)

### Email & Notification Tables
- `email` - Email records (0 rows)
- `emailtemplate_postmark_` - Postmark email templates (15 rows)
- `emailtemplates_category_postmark_` - Email template categories (0 rows)
- `notificationsettingsos_lists_` - Notification settings (126 rows)
- `notification_preferences` - Notification preferences
- `mailing_list_opt_in` - Mailing list subscriptions (39 rows)

### Virtual Meeting Tables
- `virtual_meetings` - Virtual meeting records
- `virtualmeetingschedulesandlinks` - Meeting schedules
- `zat_blocked_vm_bookingtimes` - Blocked booking times

### Miscellaneous
- `narration` - House manual narrations/jingles (252 rows)
- `occupant` - Occupant records (50 rows)
- `rentalapplication` - Rental applications
- `waitlistsubmission` - Waitlist submissions
- `visit` - Visit records
- `experiencesurvey` - Experience surveys (2 rows)
- `emergencyreports` - Emergency reports (34 rows)
- `referral` - Referral tracking
- `remindersfromhousemanual` - Reminders
- `negotiationsummary` - Proposal negotiation summaries (375 rows)
- `zat_aisuggestions` - AI suggestions data
- `zat_faq` - FAQ content
- `zat_goodguestreasons` - Good guest reasons
- `zat_htmlembed` - HTML embeds
- `zat_policiesdocuments` - Policies documents
- `zat_storage` - Storage
- `zat_splitleaseteam` - Split Lease team data
- `zat_successstory` - Success stories
- `zep_curationparameter` - Curation parameters
- `zep_twilio` - Twilio integration
- `zep_twiliocheckin` - Twilio check-in
- `zep_twiliocheckout` - Twilio check-out
- `informationaltexts` - UI informational texts (84 rows)
- `knowledgebase` - Knowledge base articles (56 rows)
- `knowledgebaselineitem` - Knowledge base items (272 rows)
- `dailycounter` - Daily counter (205 rows)
- `datacollection_searchlogging` - Search logging (1,682 rows)
- `savedsearch` - Saved searches
- `proxysmssession` - Proxy SMS sessions
- `qrcodes` - QR codes
- `state` - State data
- `num` - Numeric data (22,611 rows)

---

## Key Tables Schema Details

### 1. USER PROFILES TABLE - `user`

**Purpose**: Primary Bubble.io user profile table with comprehensive user information.

**Key Fields for User Type Identification**:
- `Type - User Current` (text) - Current user type (Guest/Host/Both)
- `Type - User Signup` (text) - Original signup user type
- `User Sub Type` (text) - More granular user classification
- `Account - Guest` (text) - Foreign key to account_guest table
- `Account - Host / Landlord` (text) - Foreign key to account_host table
- `Toggle - Is Admin` (boolean) - Admin status
- `Toggle - Is Corporate User` (boolean) - Corporate account flag

**User Identification Fields**:
- `_id` (text) - Primary key
- `Name - Full` (text)
- `Name - First` (text)
- `Name - Last` (text)
- `email as text` (text) - Email address
- `Phone Number (as text)` (text)
- `Profile Photo` (text) - Photo URL
- `Date of Birth` (timestamp with time zone)

**Verification & Authentication**:
- `is email confirmed` (boolean)
- `user verified?` (boolean)
- `Verify - Phone` (boolean)
- `Verify - Linked In ID` (text)
- `authentication` (jsonb) - Auth data
- `Google ID` (text)
- `StripeCustomerID` (text)

**Favorites & Saved Listings**:
- `Favorited Listings` (jsonb) - JSON array of favorited listing IDs
- `Saved Search` (text) - Foreign key to savedsearch table
- `Recent Days Selected` (jsonb)
- `Search Log` (jsonb)

**Lease & Proposal Management**:
- `Leases` (jsonb) - JSON array of lease IDs
- `Proposals List` (jsonb) - JSON array of proposal IDs
- `Rental Application` (text) - Foreign key to rentalapplication

**Preferences & Settings**:
- `Preferred Borough` (text)
- `Preferred Hoods` (jsonb) - Preferred neighborhoods array
- `Preferred weekly schedule` (text)
- `Sign up - Preferred Schedule Type` (text)
- `Sign up - Willing to Clean` (text)
- `Mobile Notifications On` (boolean)
- `Notification Settings OS(lisits)` (text)
- `Chat - Threads` (jsonb)

**Timestamps**:
- `Created Date` (timestamp with time zone)
- `Modified Date` (timestamp with time zone)
- `created_at` (timestamp with time zone)
- `updated_at` (timestamp with time zone)

---

### 2. AUTH USERS TABLE - `users` (Supabase Auth)

**Purpose**: Supabase native authentication users table.

**Core Identity**:
- `id` (uuid) - Primary key
- `instance_id` (uuid)
- `email` (character varying)
- `encrypted_password` (character varying)

**Profile Information**:
- `name_first` (character varying)
- `name_last` (character varying)
- `profile_photo` (text)
- `bio` (text)

**Verification Status**:
- `email_confirmed_at` (timestamp with time zone)
- `email_verified` (boolean)
- `phone_verified` (boolean)
- `phone_confirmed_at` (timestamp with time zone)
- `identity_verified` (boolean)
- `linkedin_verified` (boolean)

**Phone & Email Management**:
- `phone` (text)
- `phone_change` (text)
- `email_change` (character varying)
- `email_change_sent_at` (timestamp with time zone)

**Account Status**:
- `is_sso_user` (boolean)
- `is_anonymous` (boolean)
- `is_super_admin` (boolean)
- `banned_until` (timestamp with time zone)
- `deleted_at` (timestamp with time zone)

**Timestamps**:
- `created_at` (timestamp without time zone)
- `updated_at` (timestamp without time zone)
- `last_sign_in_at` (timestamp with time zone)

---

### 3. PROPOSALS TABLE - `proposals` (Normalized Structure)

**Purpose**: Modern, normalized proposals table for new proposal system.

**Core Identifiers**:
- `id` (text) - Primary key
- `listing_id` (text) - Foreign key to listing
- `guest_id` (text) - Foreign key to user (guest)
- `host_id` (text) - Foreign key to user (host)

**Reservation Details**:
- `move_in_range_start` (date) - Earliest move-in date
- `move_in_range_end` (date) - Latest move-in date
- `reservation_span_weeks` (integer) - Duration in weeks
- `days_selected` (ARRAY) - Array of day names selected
- `nights_per_week` (integer)
- `check_in_day` (text)
- `check_out_day` (text)

**Pricing**:
- `nightly_price` (numeric)
- `total_price` (numeric)
- `cleaning_fee` (numeric)
- `damage_deposit` (numeric)

**Host Counter (HC) Fields** (for host counter-proposals):
- `hc_move_in_date` (date)
- `hc_reservation_span_weeks` (integer)
- `hc_days_selected` (ARRAY)
- `hc_nights_per_week` (integer)
- `hc_check_in_day` (text)
- `hc_check_out_day` (text)
- `hc_nightly_price` (numeric)
- `hc_total_price` (numeric)
- `hc_cleaning_fee` (numeric)
- `hc_damage_deposit` (numeric)

**Status & Workflow**:
- `status` (character varying) - Current proposal status
- `current_stage` (integer) - Current workflow stage
- `completed_stages` (ARRAY) - Array of completed stage numbers
- `is_suggested_by_host` (boolean)
- `deleted` (boolean)
- `reason_for_cancellation` (text)

**Timestamps**:
- `created_at` (timestamp without time zone)
- `updated_at` (timestamp without time zone)

---

### 4. LEGACY PROPOSALS TABLE - `proposal` (Bubble.io)

**Purpose**: Legacy Bubble.io proposals table with extensive field tracking.

**Core Identifiers**:
- `_id` (text) - Primary key
- `Guest` (text) - Guest user ID
- `Host - Account` (text) - Host account reference
- `Listing` (text) - Listing ID
- `Proposal associated` (text) - Cross-reference field

**Reservation Configuration**:
- `Move in range start` (text)
- `Move in range end` (text)
- `Reservation Span` (text) - Text description of span
- `Reservation Span (Weeks)` (integer)
- `Nights Selected (Nights list)` (jsonb) - JSONB array of nights
- `Days Selected` (jsonb)
- `Days Available` (jsonb)
- `Complementary Nights` (jsonb) - Required, not nullable
- `Complementary Days` (jsonb)
- `check in day` (text)
- `check out day` (text)

**Pricing Fields**:
- `4 week rent` (numeric) - Required
- `4 week compensation` (integer)
- `nightly price for map (text)` (text)
- `proposal nightly price` (numeric)
- `Total Price for Reservation (guest)` (numeric) - Required
- `Total Compensation (proposal - host)` (numeric)
- `cleaning fee` (integer)
- `damage deposit` (integer)
- `host compensation` (integer)

**Host Counter (HC) Fields**:
- `hc 4 week rent` (integer)
- `hc 4 week compensation` (integer)
- `hc check in day` (text)
- `hc check out day` (text)
- `hc cleaning fee` (integer)
- `hc damage deposit` (integer)
- `hc days selected` (jsonb)
- `hc duration in months` (numeric)
- `hc host compensation (per period)` (integer)
- `hc house rules` (jsonb)
- `hc move in date` (timestamp with time zone)
- `hc nightly price` (numeric)
- `hc nights per week` (integer)
- `hc nights selected` (jsonb)
- `hc reservation span` (text)
- `hc reservation span (weeks)` (integer)
- `hc total host compensation` (integer)
- `hc total price` (numeric)
- `hc weeks schedule` (text)

**Status & Workflow**:
- `Status` (text) - Required
- `Is Finalized` (boolean) - Required
- `Deleted` (boolean)
- `counter offer happened` (boolean)
- `reason for cancellation` (text)

**Guest Information**:
- `Guest email` (text) - Required
- `Guest flexibility` (text)
- `About yourself` (text)
- `Special needs` (text)
- `need for space` (text)
- `preferred gender` (text)
- `rental type` (text)

**Documentation**:
- `rental application` (text)
- `rental app requested` (boolean) - Required
- `guest documents review finalized?` (boolean)
- `host documents review finalized?` (boolean)
- `viewed proposed proposal` (boolean)

**Meetings & Communication**:
- `request virtual meeting` (text)
- `virtual meeting` (text)
- `virtual meeting confirmed` (boolean)

**Tracking & History**:
- `Order Ranking` (integer) - Required
- `History` (jsonb) - Required
- `Negotiation Summary` (jsonb)
- `Comment` (text)
- `proposal update message` (text)
- `Week Selection` (text)
- `actual weeks during reservation span` (integer) - Required

**Review Fields**:
- `reviewed by frederick` (boolean)
- `reviewed by igor` (boolean)
- `reviewed by robert` (boolean)

**Location Data**:
- `Location - Address` (jsonb)
- `Location - Address slightly different` (jsonb)

**Timestamps**:
- `Created Date` (timestamp with time zone) - Required
- `Modified Date` (timestamp with time zone) - Required
- `created_at` (timestamp with time zone)
- `updated_at` (timestamp with time zone)

---

### 5. BOOKINGS/LEASES TABLE - `bookings_leases`

**Purpose**: Lease agreements that result from accepted proposals (140 rows).

**Core Identifiers**:
- `_id` (text) - Primary key
- `Agreement Number` (text)
- `Proposal` (text) - Foreign key to proposal
- `Listing` (text) - Foreign key to listing
- `Guest` (text) - Foreign key to user (guest)
- `Host` (text) - Foreign key to user (host)

**Lease Dates & Periods**:
- `Reservation Period : Start` (text)
- `Reservation Period : End` (text)
- `List of Booked Dates` (jsonb)
- `List of Booked Dates after Requests` (jsonb)
- `List of Stays` (jsonb) - Foreign keys to bookings_stays
- `current week number` (integer)
- `total week count` (integer)

**Financial**:
- `Total Rent` (numeric)
- `Total Compensation` (integer)
- `Paid to Date from Guest` (numeric)

**Status & Agreements**:
- `Lease Status` (text) - Current status
- `Lease signed?` (boolean) - Required
- `Periodic Tenancy Agreement` (text)
- `Supplemental Agreement` (text)
- `Form Credit Card Authorization Charges` (text)

**Cancellation & Policy**:
- `Cancellation Policy` (text)

**Participants & Communication**:
- `Participants` (jsonb) - Array of participant IDs
- `Thread` (text) - Foreign key to messaging thread
- `Date Change Requests` (jsonb) - Array of date change request IDs

**Payments**:
- `Payment Records Guest-SL` (jsonb) - Payments from guest to Split Lease
- `Payment Records SL-Hosts` (jsonb) - Payments from Split Lease to host
- `Payments from date change requests to GUEST` (jsonb)
- `Payments from date change requests to HOST` (jsonb)
- `First Payment Date` (timestamp with time zone)
- `Host Payout Schedule` (text)

**Reputation & Throttling**:
- `Reputation Score (GUEST)` (integer)
- `Reputation Score (HOST)` (integer)
- `Throttling - guest NOT show warning popup` (boolean)
- `Throttling - guest ability to create requests?` (boolean)
- `Throttling - host NOT show warning popup` (boolean)
- `Throttling- host ability to create requests?` (boolean)

**Documentation**:
- `were documents generated?` (boolean)

**Timestamps**:
- `Created Date` (timestamp with time zone) - Required
- `Modified Date` (timestamp with time zone) - Required
- `created_at` (timestamp with time zone)
- `updated_at` (timestamp with time zone)

---

### 6. LISTING TABLE - `listing`

**Purpose**: Main listings table with comprehensive property information (243 rows, RLS not enabled).

**Core Identifiers**:
- `_id` (text) - Primary key
- `Name` (text) - Listing name
- `Host / Landlord` (text) - Foreign key to user (host)
- `Host email` (text)
- `host name` (text)

**Location**:
- `Location - Address` (jsonb) - Full address object
- `Location - City` (text)
- `Location - State` (text)
- `Location - Borough` (text) - Foreign key to zat_geo_borough_toplevel
- `Location - Hood` (text) - Foreign key to zat_geo_hood_mediumlevel
- `Location - Hoods (new)` (jsonb) - Array of hood IDs
- `Location - Zip Code` (text)
- `Location - Coordinates` (jsonb) - Geo coordinates
- `Location - slightly different address` (jsonb)
- `neighborhood (manual input by user)` (text)

**Property Features**:
- `Features - Type of Space` (text) - Room/entire place/etc
- `Features - Qty Bedrooms` (integer)
- `Features - Qty Beds` (integer)
- `Features - Qty Bathrooms` (integer)
- `Features - Qty Guests` (integer) - Max occupancy
- `Features - SQFT Area` (integer)
- `Features - SQFT of Room` (integer)
- `Features - Trial Periods Allowed` (boolean) - Required
- `Kitchen Type` (text)
- `Features - Parking type` (text)
- `Features - Secure Storage Option` (text)

**Amenities & Features**:
- `Features - Amenities In-Unit` (jsonb) - Array of amenity IDs
- `Features - Amenities In-Building` (jsonb) - Array of amenity IDs
- `Features - House Rules` (jsonb) - Array of house rule IDs
- `Features - Safety` (jsonb) - Array of safety feature IDs
- `Features - Photos` (jsonb) - Foreign keys to listing_photo

**Availability**:
- `Active` (boolean) - Listing is active
- `Approved` (boolean) - Approved by admin
- `Complete` (boolean) - Profile completion status
- `Days Available (List of Days)` (jsonb) - Required, array of available days
- `Days Not Available` (jsonb)
- `Dates - Blocked` (jsonb) - Blocked date ranges
- `Nights Available (List of Nights)` (jsonb) - Required
- `Nights Not Available` (jsonb)
- `Nights Available (numbers)` (jsonb) - Numeric night indices
- ` First Available` (text) - First available date text
- `Last Available` (text) - Last available date text
- `# of nights available` (integer)
- `confirmedAvailability` (boolean)
- `weeks out to available` (integer)

**Pricing**:
- `💰Nightly Host Rate for 2 nights` (numeric)
- `💰Nightly Host Rate for 3 nights` (numeric)
- `💰Nightly Host Rate for 4 nights` (numeric)
- `💰Nightly Host Rate for 5 nights` (numeric)
- `💰Nightly Host Rate for 7 nights` (numeric)
- `💰Weekly Host Rate` (numeric)
- `💰Monthly Host Rate` (integer)
- `💰Cleaning Cost / Maintenance Fee` (integer)
- `💰Damage Deposit` (integer) - Required
- `💰Unit Markup` (integer)
- `💰Price Override` (integer)
- `Standarized Minimum Nightly Price (Filter)` (numeric)

**Duration Constraints**:
- `Maximum Nights` (integer)
- `Maximum Weeks` (integer) - Required
- `Maximum Months` (integer)
- `Minimum Nights` (integer) - Required
- `Minimum Weeks` (integer)
- `Minimum Months` (integer)

**Description**:
- `Description` (text) - Main listing description
- `Description - Neighborhood` (text) - Neighborhood description

**Favorites & Engagement**:
- `Users that favorite` (jsonb) - Array of user IDs who favorited
- `Viewers` (jsonb) - Array of user IDs who viewed
- `Clickers` (jsonb) - Array of user IDs who clicked
- `Metrics - Click Counter` (integer)
- `ClicksToViewRatio` (numeric)

**Curation & Metadata**:
- `Listing Curation` (jsonb) - Curation parameters
- `.Search Ranking` (integer)
- `Default Listing` (boolean)
- `Showcase` (boolean)
- `is private?` (boolean)
- `DesirabilityTimesReceptivity` (numeric) - Ranking metric

**Rental Details**:
- `rental type` (text)
- `allow alternating roommates?` (boolean)
- `Preferred Gender` (text) - Required

**Check-In/Out Times**:
- `NEW Date Check-in Time` (text) - Required
- `NEW Date Check-out Time` (text) - Required

**Additional Fields**:
- `House manual` (text) - Foreign key to housemanual
- `Cancellation Policy` (text)
- `Operator Last Updated AUT` (timestamp with time zone)
- `progress` (text) - Listing creation progress
- `users with permission` (jsonb) - Array of user IDs with access
- `host restrictions` (text) - Foreign key to hostrestrictions
- `video tour` (text) - Video tour URL
- `AI Suggestions List` (jsonb)
- `saw chatgpt suggestions?` (boolean)
- `isForUsability` (boolean)
- `Source Link` (text)
- `Listing Code OP` (text)
- `bulk_upload_id` (text)
- `cancel-features-email-id` (text)
- `pricing_list` (text) - Foreign key to pricing_list
- `Not Found - Location - Address` (text)

**Timestamps**:
- `Created Date` (timestamp with time zone) - Required
- `Modified Date` (timestamp with time zone) - Required
- `created_at` (timestamp with time zone)
- `updated_at` (timestamp with time zone)

---

### 7. SIMPLIFIED LISTINGS TABLE - `listings`

**Purpose**: Newer, simplified listings table (minimal schema).

**Core Fields**:
- `id` (text) - Primary key
- `host_id` (text)
- `name` (text) - Required
- `location` (text)
- `address` (text)
- `borough` (text)
- `check_in_time` (text)
- `check_out_time` (text)
- `house_rules` (jsonb)
- `images` (ARRAY) - Array of image URLs
- `created_at` (timestamp without time zone)
- `updated_at` (timestamp without time zone)

---

## Favorites/Favorited Listings Storage

**Location**: `user` table, `Favorited Listings` field

**Data Type**: `jsonb` (JSON array)

**Structure**:
```json
["listing_id_1", "listing_id_2", "listing_id_3"]
```

**Details**:
- Stored directly in the user profile
- Contains array of listing ID references
- Nullable field (not all users have favorites)
- Can be queried and indexed using Postgres JSON operators

**Relationships**:
- User → (many) Favorited Listings (via JSONB array)
- Favorited Listing → Listing table (_id reference)

---

## User Type Classification

The system uses multiple fields to determine user type:

1. **`Type - User Current`** - Current user classification
   - Values: Likely "Guest", "Host", "Both"

2. **`Type - User Signup`** - Original signup classification
   - Values: What user selected during signup

3. **`User Sub Type`** - More granular classification
   - Additional categorical data

4. **Account References**:
   - `Account - Guest` (text) → Foreign key to `account_guest` table
   - `Account - Host / Landlord` (text) → Foreign key to `account_host` table

5. **Administrative Flags**:
   - `Toggle - Is Admin` (boolean)
   - `Toggle - Is Corporate User` (boolean)

---

## Key Relationships

```
user (user_id)
├── Favorited Listings → listing (via JSONB array)
├── Leases → bookings_leases (Guest)
├── Listings → listing (Host)
├── Proposals → proposal (Guest/Host)
├── Account - Guest → account_guest
├── Account - Host/Landlord → account_host
└── Rental Application → rentalapplication

listing (listing_id)
├── Host → user
├── Photos → listing_photo
├── House Manual → housemanual
├── Proposals → proposal (Guest proposals)
├── Leases → bookings_leases
└── Host Restrictions → hostrestrictions

proposal (_id or id)
├── Guest → user
├── Host → user (via Host - Account → account_host → user)
├── Listing → listing
├── Creates → bookings_leases (Lease field)
└── Contains → datechangerequest

bookings_leases (_id)
├── Guest → user
├── Host → user
├── From Proposal → proposal
├── Listing → listing
├── Contains → bookings_stays (List of Stays)
├── Messages → _message/multimessage
└── Date Changes → datechangerequest

proposals (NEW table, id)
├── guest_id → user
├── host_id → user
├── listing_id → listing
└── Normalized structure for easier querying
```

---

## Foreign Key Constraints

Found in Supabase schema:

1. `fk_listing_hood`: `listing."Location - Hood"` → `zat_geo_hood_mediumlevel._id`
2. `fk_listing_borough`: `listing."Location - Borough"` → `zat_geo_borough_toplevel._id`
3. `external_reviews_listing_id_fkey`: `external_reviews.listing_id` → `listing._id`

---

## Data Integrity Notes

1. **Dual User Tables**:
   - `user` (Bubble.io legacy) is primary in current system
   - `users` (Supabase Auth) is for authentication
   - Both systems exist, may need reconciliation

2. **Dual Proposals Tables**:
   - `proposal` (Bubble.io legacy, denormalized)
   - `proposals` (new normalized structure)
   - Gradual migration likely in progress

3. **Dual Listings Tables**:
   - `listing` (Bubble.io legacy, comprehensive)
   - `listings` (new, minimal schema)
   - May indicate schema refactoring

4. **RLS Status**:
   - `listing_photo` has RLS enabled
   - Most other tables have RLS disabled
   - Implement caution with sensitive data access

5. **JSONB Arrays**:
   - Favorites stored as JSONB arrays in user profile
   - Provides flexibility but requires JSON querying for filters

