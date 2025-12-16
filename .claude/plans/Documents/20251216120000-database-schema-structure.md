# Split Lease Supabase Database Schema

**Generated**: 2025-12-16
**Purpose**: Complete database schema structure for `public` and `reference_table` schemas

---

## Table of Contents

1. [Schema Overview](#schema-overview)
2. [Public Schema](#public-schema)
   - [Core Tables](#core-tables)
   - [Supporting Tables](#supporting-tables)
   - [System Tables](#system-tables)
3. [Reference Table Schema](#reference-table-schema)
   - [Bubble.io Legacy Tables (zat_)](#bubbleio-legacy-tables-zat_)
   - [Native Supabase Tables (os_)](#native-supabase-tables-os_)
4. [Foreign Key Relationships](#foreign-key-relationships)
5. [Indexes](#indexes)
6. [Notes](#notes)

---

## Schema Overview

| Schema | Table Count | Purpose |
|--------|-------------|---------|
| `public` | 55+ | Core application data (listings, users, bookings, etc.) |
| `reference_table` | 91 | Lookup/option tables for dropdowns and configurations |

---

## Public Schema

### Core Tables

#### `listing` (277 rows)
Primary Key: `_id` (text)

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| `_id` | text | NO | - | - |
| `Name` | text | YES | - | - |
| `Active` | boolean | YES | - | - |
| `Approved` | boolean | YES | - | - |
| `Description` | text | YES | - | - |
| `Location - Address` | jsonb | YES | - | - |
| `Location - City` | text | YES | - | reference_table.zat_location._id |
| `Location - State` | text | YES | - | reference_table.os_us_states.display |
| `Location - Borough` | text | YES | - | reference_table.zat_geo_borough_toplevel._id |
| `Location - Hood` | text | YES | - | reference_table.zat_geo_hood_mediumlevel._id |
| `Location - Coordinates` | jsonb | YES | - | - |
| `Features - Type of Space` | text | YES | - | reference_table.zat_features_listingtype._id |
| `Features - Qty Bedrooms` | integer | YES | - | - |
| `Features - Qty Bathrooms` | numeric | YES | - | - |
| `Features - Qty Beds` | integer | YES | - | - |
| `Features - Qty Guests` | integer | YES | - | - |
| `Features - Amenities In-Unit` | jsonb | YES | - | - |
| `Features - Amenities In-Building` | jsonb | YES | - | - |
| `Features - House Rules` | jsonb | YES | - | - |
| `Features - Photos` | jsonb | YES | - | - |
| `Features - Parking type` | text | YES | - | reference_table.zat_features_parkingoptions._id |
| `Features - Secure Storage Option` | text | YES | - | reference_table.zat_features_storageoptions._id |
| `Kitchen Type` | text | YES | - | reference_table.os_kitchen_type.display |
| `rental type` | text | YES | - | reference_table.os_rental_type.display |
| `Days Available (List of Days)` | jsonb | NO | - | - |
| `Nights Available (List of Nights)` | jsonb | NO | - | - |
| `Cancellation Policy` | text | YES | - | reference_table.zat_features_cancellationpolicy._id |
| `Host / Landlord` | text | YES | - | - |
| `host_type` | text | YES | - | - |
| `market_strategy` | text | YES | 'private' | - |
| `Nightly Host Rate for X nights` | numeric | YES | - | - |
| `Damage Deposit` | integer | NO | - | - |
| `Standarized Minimum Nightly Price` | numeric | YES | - | - |
| `isForUsability` | boolean | YES | false | - |
| `bubble_id` | text | YES | - | UNIQUE |
| `Created Date` | timestamptz | NO | - | - |
| `Modified Date` | timestamptz | NO | - | - |
| `created_at` | timestamptz | YES | now() | - |
| `updated_at` | timestamptz | YES | now() | - |
| `pending` | boolean | YES | false | - |

---

#### `user`
Primary Key: `_id` (text)

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| `_id` | text | NO | - | - |
| `email` | text | - | - | UNIQUE |
| `First Name` | text | YES | - | - |
| `Last Name` | text | YES | - | - |
| `Phone Number` | text | YES | - | - |
| `Type - User Signup` | text | YES | - | reference_table.os_user_type.display |
| `Type - User Current` | text | YES | - | reference_table.os_user_type.display |
| `Preferred weekly schedule` | text | YES | - | reference_table.os_weekly_selection_options.display |
| `Price Tier` | text | YES | - | reference_table.os_price_filter.display |
| `bubble_id` | text | YES | - | UNIQUE |
| `Created Date` | timestamptz | NO | - | - |
| `Modified Date` | timestamptz | NO | - | - |
| `created_at` | timestamptz | YES | now() | - |
| `updated_at` | timestamptz | YES | now() | - |
| `pending` | boolean | YES | false | - |

---

#### `bookings_leases` (197 rows)
Primary Key: `_id` (text)

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| `_id` | text | NO | - | - |
| `Agreement Number` | text | YES | - | - |
| `Listing` | text | YES | - | public.listing._id |
| `Proposal` | text | YES | - | public.proposal._id |
| `Created By` | text | YES | - | public.user._id |
| `Guest` | text | YES | - | - |
| `Host` | text | YES | - | - |
| `Lease Status` | text | YES | - | - |
| `Lease signed?` | boolean | NO | - | - |
| `Cancellation Policy` | text | YES | - | reference_table.zat_features_cancellationpolicy._id |
| `Total Rent` | numeric | YES | - | - |
| `Total Compensation` | numeric | YES | - | - |
| `Reservation Period : Start` | text | YES | - | - |
| `Reservation Period : End` | text | YES | - | - |
| `List of Booked Dates` | jsonb | YES | - | - |
| `List of Stays` | jsonb | YES | - | - |
| `bubble_id` | text | YES | - | UNIQUE |
| `Created Date` | timestamptz | NO | - | - |
| `Modified Date` | timestamptz | NO | - | - |
| `created_at` | timestamptz | YES | now() | - |
| `updated_at` | timestamptz | YES | now() | - |
| `pending` | boolean | YES | false | - |

---

#### `bookings_stays` (17,601 rows)
Primary Key: `_id` (text)

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `_id` | text | NO | - |
| `Lease` | text | YES | - |
| `Stay Status` | text | YES | - |
| `Start Date` | text | YES | - |
| `End Date` | text | YES | - |
| `bubble_id` | text | YES | UNIQUE |
| `Created Date` | timestamptz | NO | - |
| `Modified Date` | timestamptz | NO | - |
| `created_at` | timestamptz | YES | now() |
| `updated_at` | timestamptz | YES | now() |
| `pending` | boolean | YES | false |

---

#### `proposal`
Primary Key: `_id` (text)

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| `_id` | text | NO | - | - |
| `Status` | text | YES | - | reference_table.os_proposal_status.display |
| `bubble_id` | text | YES | - | UNIQUE |
| `Created Date` | timestamptz | NO | - | - |
| `Modified Date` | timestamptz | NO | - | - |
| `created_at` | timestamptz | YES | now() | - |
| `updated_at` | timestamptz | YES | now() | - |
| `pending` | boolean | YES | false | - |

---

### Supporting Tables

#### `_message` (6,244 rows)
Messages and conversations between users.

| Column | Type | Nullable |
|--------|------|----------|
| `_id` | text | NO |
| `Content` | text | YES |
| `Sender` | text | YES |
| `Recipient` | text | YES |
| `bubble_id` | text | YES |

---

#### `account_host` (885 rows)
Host account profiles and settings.

| Column | Type | Nullable |
|--------|------|----------|
| `_id` | text | NO |
| `User` | text | YES |
| `bubble_id` | text | YES |

---

#### `listing_photo` (4,604 rows) - **RLS ENABLED**
Listing photos with Row Level Security.

| Column | Type | Nullable |
|--------|------|----------|
| `_id` | text | NO |
| `Listing` | text | YES |
| `Photo URL` | text | YES |
| `Photo Type` | text | YES |
| `bubble_id` | text | YES |

---

#### `external_reviews`
External review imports from other platforms.

| Column | Type | Nullable | FK Reference |
|--------|------|----------|--------------|
| `id` | uuid | NO | - |
| `listing_id` | text | YES | public.listing._id |
| `platform` | text | YES | - |
| `review_date` | date | YES | - |
| `rating` | numeric | YES | - |
| `review_text` | text | YES | - |

---

#### `notification_preferences`
User notification settings.

| Column | Type | Nullable | FK Reference |
|--------|------|----------|--------------|
| `id` | uuid | NO | - |
| `user_id` | text | YES | public.user._id |
| `email_enabled` | boolean | YES | - |
| `sms_enabled` | boolean | YES | - |
| `push_enabled` | boolean | YES | - |

---

### System Tables

#### `ai_parsing_queue`
AI request processing queue.

| Column | Type | Nullable | FK Reference |
|--------|------|----------|--------------|
| `id` | uuid | NO | - |
| `user_id` | text | YES | public.user._id |
| `status` | text | YES | - |
| `request_type` | text | YES | - |
| `created_at` | timestamptz | YES | - |

---

#### `sync_config`
Bubble.io sync configuration.

| Column | Type | Nullable |
|--------|------|----------|
| `id` | uuid | NO |
| `supabase_table` | text | NO |
| `bubble_type` | text | YES |
| `sync_enabled` | boolean | YES |

---

#### `sync_queue`
Pending sync operations.

| Column | Type | Nullable | FK Reference |
|--------|------|----------|--------------|
| `id` | uuid | NO | - |
| `table_name` | text | YES | sync_config.supabase_table |
| `record_id` | text | YES | - |
| `status` | text | YES | - |
| `retry_count` | integer | YES | - |

---

#### `audit_log`
System audit trail.

| Column | Type | Nullable |
|--------|------|----------|
| `id` | uuid | NO |
| `action` | text | YES |
| `table_name` | text | YES |
| `record_id` | text | YES |
| `user_id` | text | YES |
| `created_at` | timestamptz | YES |

---

### Other Public Tables (Summary)

| Table | Rows | Description |
|-------|------|-------------|
| `co_hostrequest` | 26 | Co-host requests |
| `dailycounter` | 205 | Daily counter records |
| `datacollection_searchlogging` | 1,682 | Search analytics |
| `datechangerequest` | 99 | Date change requests |
| `documentssent` | 13 | Sent documents |
| `email` | 0 | Email records |
| `emailtemplate_postmark_` | 15 | Email templates |
| `emergencyreports` | 34 | Emergency reports |
| `experiencesurvey` | 2 | Experience surveys |
| `fieldsforleasedocuments` | 14 | Lease document fields |
| `file` | 128 | File attachments |
| `hostrestrictions` | 33 | Host restrictions |
| `housemanual` | 195 | House manuals |
| `housemanualphotos` | 4 | House manual photos |
| `informationaltexts` | 84 | Informational content |
| `knowledgebase` | 56 | Knowledge base articles |
| `knowledgebaselineitem` | 272 | KB line items |
| `listing_drafts` | - | Draft listings |
| `listing_trial` | - | Trial listings |
| `mainreview` | 32 | Reviews |
| `multimessage` | 359 | Multi-channel messages |
| `narration` | 252 | Narrations/audio |
| `negotiationsummary` | 375 | Negotiation summaries |
| `paymentrecords` | - | Payment records |
| `pricing_list` | - | Pricing configurations |
| `visit` | - | House manual visits |
| `workflow_definitions` | - | Workflow definitions |
| `workflow_executions` | - | Workflow execution history |

---

## Reference Table Schema

### Bubble.io Legacy Tables (zat_)

These tables preserve original Bubble.io field names for sync compatibility.

#### `zat_features_cancellationpolicy` (4 rows, RLS enabled)
**Referenced by**: `public.listing.Cancellation Policy`, `public.bookings_leases.Cancellation Policy`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `_id` | text | NO | - |
| `Best Case Text` | text | YES | - |
| `Created By` | text | NO | - |
| `Created Date` | timestamptz | NO | - |
| `Display` | text | NO | - |
| `Medium Case Text` | text | YES | - |
| `Modified Date` | timestamptz | NO | - |
| `Sort Order` | integer | YES | - |
| `Summary Texts` | jsonb | YES | - |
| `Worst Case Text` | text | YES | - |
| `shown` | boolean | YES | - |
| `created_at` | timestamptz | YES | now() |
| `updated_at` | timestamptz | YES | now() |
| `pending` | boolean | YES | false |

---

#### `zat_features_listingtype` (4 rows, RLS enabled)
**Referenced by**: `public.listing.Features - Type of Space`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `_id` | text | NO | - |
| `Created By` | text | YES | - |
| `Created Date` | timestamptz | NO | - |
| `Description` | text | NO | - |
| `Icon` | text | NO | - |
| `Label` | text | NO | - |
| `Level of control` | integer | YES | - |
| `Modified Date` | timestamptz | NO | - |
| `Order` | integer | YES | - |
| `created_at` | timestamptz | YES | now() |
| `updated_at` | timestamptz | YES | now() |
| `pending` | boolean | YES | false |

---

#### `zat_features_parkingoptions` (6 rows, RLS enabled)
**Referenced by**: `public.listing.Features - Parking type`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `_id` | text | NO | - |
| `Created By` | text | NO | - |
| `Created Date` | timestamptz | NO | - |
| `Label` | text | NO | - |
| `Modified Date` | timestamptz | NO | - |
| `created_at` | timestamptz | YES | now() |
| `updated_at` | timestamptz | YES | now() |
| `pending` | boolean | YES | false |

---

#### `zat_features_storageoptions` (3 rows, RLS enabled)
**Referenced by**: `public.listing.Features - Secure Storage Option`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `_id` | text | NO | - |
| `Created By` | text | NO | - |
| `Created Date` | timestamptz | NO | - |
| `Modified Date` | timestamptz | NO | - |
| `SortOrder` | integer | NO | - |
| `Summary - Guest` | text | NO | - |
| `Summary - Host` | text | NO | - |
| `Title` | text | NO | - |
| `created_at` | timestamptz | YES | now() |
| `updated_at` | timestamptz | YES | now() |
| `pending` | boolean | YES | false |

---

#### `zat_geo_borough_toplevel` (7 rows, RLS enabled)
**Referenced by**: `public.listing.Location - Borough`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `_id` | text | NO | - |
| `Created By` | text | NO | - |
| `Created Date` | timestamptz | NO | - |
| `Display Borough` | text | NO | - |
| `Geo-Hoods` | jsonb | NO | - |
| `Geo-Location` | text | NO | - |
| `Geographics Centre` | jsonb | NO | - |
| `Modified Date` | timestamptz | NO | - |
| `Zip Codes` | jsonb | NO | - |
| `created_at` | timestamptz | YES | now() |
| `updated_at` | timestamptz | YES | now() |
| `pending` | boolean | YES | false |

---

#### `zat_geo_hood_mediumlevel` (293 rows, RLS enabled)
**Referenced by**: `public.listing.Location - Hood`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `_id` | text | NO | - |
| `Created By` | text | NO | - |
| `Created Date` | timestamptz | NO | - |
| `Display` | text | NO | - |
| `Geo-Borough` | text | YES | - |
| `Geo-City` | text | NO | - |
| `Modified Date` | timestamptz | NO | - |
| `Neighborhood Description` | text | NO | - |
| `Zips` | jsonb | NO | - |
| `created_at` | timestamptz | YES | now() |
| `updated_at` | timestamptz | YES | now() |
| `pending` | boolean | YES | false |

---

#### `zat_location` (8 rows, RLS enabled)
**Referenced by**: `public.listing.Location - City`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `_id` | text | NO | - |
| `Cover Photo` | text | YES | - |
| `Created By` | text | YES | - |
| `Created Date` | timestamptz | NO | - |
| `Geographic City Address` | jsonb | NO | - |
| `Modified Date` | timestamptz | NO | - |
| `Order` | integer | YES | - |
| `Radius` | integer | YES | - |
| `Short Name` | text | NO | - |
| `cityName` | text | NO | - |
| `occupancyTax` | numeric | YES | - |
| `created_at` | timestamptz | YES | now() |
| `updated_at` | timestamptz | YES | now() |
| `pending` | boolean | YES | false |

---

#### `zat_priceconfiguration` (1 row, RLS enabled)
Global pricing configuration.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `_id` | text | NO | - |
| `Avg days per month` | integer | NO | - |
| `Created By` | text | NO | - |
| `Created Date` | timestamptz | NO | - |
| `Max Price per night` | integer | NO | - |
| `Min Price per night` | integer | NO | - |
| `Modified Date` | timestamptz | NO | - |
| `Overall Site Markup` | numeric | NO | - |
| `Suggestion Additional Profit` | integer | NO | - |
| `Suggestion Bedrooms Multiplier` | integer | NO | - |
| `Suggestion Beds Multiplier` | integer | NO | - |
| `Unused Nights Discount Multiplier` | numeric | NO | - |
| `Weekly Markup` | integer | NO | - |
| `full time (7 nights) Discount` | numeric | NO | - |
| `created_at` | timestamptz | YES | now() |
| `updated_at` | timestamptz | YES | now() |
| `pending` | boolean | YES | false |

---

#### Other Bubble.io Legacy Tables

| Table | Rows | Description |
|-------|------|-------------|
| `zat_email_html_template_eg_sendbasicemailwf_` | 30 | Email templates |
| `zat_faq` | 70 | FAQ entries |
| `zat_features_houserule` | 30 | House rules |
| `zat_goodguestreasons` | 12 | Good guest reasons |
| `zat_htmlembed` | 51 | HTML embeds |
| `zat_policiesdocuments` | 13 | Policy documents |
| `zat_splitleaseteam` | 13 | Team members |
| `zat_storage` | 17 | Storage options |
| `zat_successstory` | 5 | Success stories |

---

### Native Supabase Tables (os_)

These are newer reference tables with standardized naming conventions. All `os_` tables share a common base structure:

| Column | Type | Description |
|--------|------|-------------|
| `id` | integer | Auto-incrementing primary key |
| `name` | text | Internal identifier |
| `display` | text | User-facing display text |
| `created_at` | timestamptz | Creation timestamp |

---

#### `os_proposal_status` (14 rows)
**Referenced by**: `public.proposal.Status`

| Column | Type | Description |
|--------|------|-------------|
| `id` | integer | PK |
| `name` | text | Internal name |
| `display` | text | Display text |
| `displayed_on_screen` | text | Screen display variant |
| `guest_action_1` | text | Primary guest action |
| `guest_action_2` | text | Secondary guest action |
| `host_action_1` | text | Primary host action |
| `host_action_2` | text | Secondary host action |
| `sort_order` | integer | Display order |

---

#### `os_user_type` (4 rows)
**Referenced by**: `public.user.Type - User Signup`, `public.user.Type - User Current`

| Column | Type | Description |
|--------|------|-------------|
| `id` | integer | PK |
| `name` | text | Internal name |
| `display` | text | Display text |
| `alexa_name` | text | Alexa integration name |
| `toggle_client_facing` | boolean | Client-facing toggle |

---

#### `os_rental_type` (3 rows)
**Referenced by**: `public.listing.rental type`

| Column | Type | Description |
|--------|------|-------------|
| `id` | integer | PK |
| `name` | text | Internal name |
| `display` | text | Display text |
| `display_per_period` | text | Period display |
| `first_selection_idea` | text | Selection hint |
| `radio_button_text` | text | Radio button label |

---

#### `os_kitchen_type` (4 rows)
**Referenced by**: `public.listing.Kitchen Type`

| Column | Type | Description |
|--------|------|-------------|
| `id` | integer | PK |
| `name` | text | Internal name |
| `display` | text | Display text |

---

#### `os_us_states` (50 rows)
**Referenced by**: `public.listing.Location - State`

| Column | Type | Description |
|--------|------|-------------|
| `id` | integer | PK |
| `name` | text | Full state name |
| `display` | text | Display text |
| `abbreviation` | text | 2-letter code |

---

#### `os_weekly_selection_options` (4 rows)
**Referenced by**: `public.user.Preferred weekly schedule`

| Column | Type | Description |
|--------|------|-------------|
| `id` | integer | PK |
| `name` | text | Internal name |
| `display` | text | Display text |
| `display_mobile` | text | Mobile display |
| `short_display` | text | Short display |
| `period` | text | Period type |
| `num_weeks_during_4_calendar_weeks` | integer | Weeks count |
| `shown_to_hosts` | boolean | Host visibility |

---

#### `os_price_filter` (5 rows)
**Referenced by**: `public.user.Price Tier`

| Column | Type | Description |
|--------|------|-------------|
| `id` | integer | PK |
| `name` | text | Internal name |
| `display` | text | Display text |
| `price_min` | numeric | Minimum price |
| `price_max` | numeric | Maximum price |

---

#### `os_days` / `os_nights` (7 rows each)
Day/night mapping for schedule management.

| Column | Type | Description |
|--------|------|-------------|
| `id` | integer | PK (0-6 for JS, maps to 1-7 for Bubble) |
| `name` | text | Day name |
| `display` | text | Display text |
| `bubble_number` | integer | Bubble index (1-7) |
| `bubble_number_text` | text | Bubble index as text |
| `first_3_letters` | text | Abbreviated (Mon, Tue) |
| `single_letter` | text | Single letter (M, T) |

---

#### Other Native Supabase Tables (Summary)

| Category | Tables |
|----------|--------|
| **Quantity Options** | `os_bathrooms`, `os_bedrooms`, `os_beds`, `os_qty_guests`, `os_roommates` |
| **Status Options** | `os_co_host_status`, `os_date_change_request_status`, `os_lease_status`, `os_stay_status`, `os_multi_message_status` |
| **Feature Options** | `os_space_type`, `os_gender_type`, `os_amenity_categories`, `os_listing_photo_type`, `os_storage_parking_type` |
| **Time Options** | `os_check_in_out_times`, `os_virtual_meeting_times`, `os_stay_periods` |
| **AI Configuration** | `os_ai_fields_house_manual`, `os_ai_fields_listing`, `os_chatgpt_models`, `os_prompts` |
| **Review Categories** | `os_categories_guest_user_reviews`, `os_categories_house_manual_reviews`, `os_categories_listings_reviews`, `os_categories_stays_reviews`, `os_review_type`, `os_review_guest_questions`, `os_review_host_questions` |
| **Communication** | `os_communication_preference`, `os_reminder_type`, `os_messaging_cta`, `os_slack_channels`, `os_slack_webhooks`, `os_proxy_sms_channels`, `os_twilio_numbers` |
| **UI/Branding** | `os_color_palette`, `os_images`, `os_logos`, `os_ui_icons`, `os_screen_size`, `os_pages` |
| **Media** | `os_jingles`, `os_melodies`, `os_narrators`, `os_video_animations` |
| **System Config** | `os_admin_users`, `os_name_mapping`, `os_split_lease_config`, `os_important_errors`, `os_postmark_webhook` |
| **Other** | `os_alert_type`, `os_faq_type`, `os_ideal_split_preference`, `os_language`, `os_legal_page_type`, `os_modality`, `os_personas`, `os_photo_evidence_type`, `os_qr_code_use_cases`, `os_receipt`, `os_referral_contact_methods`, `os_room_styles`, `os_schedule_selection_types`, `os_sort_by_properties_search`, `os_task_load`, `os_user_subtype`, `os_zep_curation_parameters` |

---

## Foreign Key Relationships

### Public Schema Internal References

```
ai_parsing_queue.user_id ──────────────> user._id
bookings_leases.Proposal ──────────────> proposal._id
bookings_leases.Created By ────────────> user._id
bookings_leases.Listing ───────────────> listing._id
external_reviews.listing_id ───────────> listing._id
notification_preferences.user_id ──────> user._id
sync_queue.table_name ─────────────────> sync_config.supabase_table
```

### Public → Reference Table References

```
listing.rental type ───────────────────> os_rental_type.display
listing.Location - Borough ────────────> zat_geo_borough_toplevel._id
listing.Location - City ───────────────> zat_location._id
listing.Location - Hood ───────────────> zat_geo_hood_mediumlevel._id
listing.Features - Parking type ───────> zat_features_parkingoptions._id
listing.Kitchen Type ──────────────────> os_kitchen_type.display
listing.Location - State ──────────────> os_us_states.display
listing.Features - Secure Storage ─────> zat_features_storageoptions._id
listing.Cancellation Policy ───────────> zat_features_cancellationpolicy._id
listing.Features - Type of Space ──────> zat_features_listingtype._id
bookings_leases.Cancellation Policy ───> zat_features_cancellationpolicy._id
proposal.Status ───────────────────────> os_proposal_status.display
user.Preferred weekly schedule ────────> os_weekly_selection_options.display
user.Type - User Signup ───────────────> os_user_type.display
user.Type - User Current ──────────────> os_user_type.display
user.Price Tier ───────────────────────> os_price_filter.display
```

---

## Indexes

### Standard Indexes (All Bubble-synced Tables)

- Primary key on `_id`
- Unique index on `bubble_id`
- Index on `Created Date`
- Index on `Modified Date`

### Listing Table Indexes

```sql
idx_listing_active_usability     -- WHERE Active=true AND isForUsability=false
idx_listing_borough_filter       -- Location - Borough (filtered)
idx_listing_hood_filter          -- Location - Hood (filtered)
idx_listing_price_filter         -- Standarized Minimum Nightly Price (filtered)
```

### AI Parsing Queue Indexes

```sql
idx_ai_parsing_queue_status      -- status column
idx_ai_parsing_queue_user_id     -- user_id column
```

### External Reviews Indexes

```sql
idx_external_reviews_listing     -- listing_id
idx_external_reviews_platform    -- platform
idx_external_reviews_date        -- review_date DESC
```

### Sync Queue Indexes

```sql
idx_sync_queue_pending_unique    -- (table_name, record_id) WHERE status='pending'
idx_sync_queue_retry             -- WHERE status='failed' AND retry_count < 3
```

### User Table Indexes

```sql
user_email_key                   -- UNIQUE (email)
```

### Notification Preferences Indexes

```sql
unique_user_preferences          -- UNIQUE (user_id)
```

---

## Notes

### 1. Bubble.io Sync Pattern
Most tables in `public` schema have:
- `bubble_id` column (unique) for Bubble.io record correlation
- `pending` flag for sync status
- `Created Date` / `Modified Date` from Bubble
- `created_at` / `updated_at` for Supabase timestamps

### 2. Day Indexing (CRITICAL)
| System | Sun | Mon | Tue | Wed | Thu | Fri | Sat |
|--------|-----|-----|-----|-----|-----|-----|-----|
| JavaScript | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
| Bubble API | 1 | 2 | 3 | 4 | 5 | 6 | 7 |

**Always convert at API boundaries** using `adaptDaysFromBubble` / `adaptDaysToBubble`.

### 3. Row Level Security (RLS)
Only `listing_photo` in `public` schema has RLS enabled.
Most `reference_table` tables have RLS enabled.

### 4. Naming Conventions
- **`zat_` prefix**: Legacy Bubble.io tables with original field names
- **`os_` prefix**: Native Supabase option/reference tables
- **Column names with spaces**: Bubble.io convention (e.g., `Created Date`, `Location - City`)
- **snake_case columns**: Native Supabase convention (e.g., `created_at`, `user_id`)

### 5. Common Column Types
- **`_id` (text)**: Primary keys (Bubble-style IDs)
- **`jsonb`**: Arrays and complex objects (amenities, coordinates, etc.)
- **`timestamptz`**: All timestamps with timezone
- **`numeric`**: Monetary values and decimals
