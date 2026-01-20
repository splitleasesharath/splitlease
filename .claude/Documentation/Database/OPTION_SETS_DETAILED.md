# Option Sets - Detailed Reference

> **Source of Truth** | Generated: 2026-01-20 | Verified against live Supabase
> **See also**: [DATABASE_OPTION_SETS_QUICK_REFERENCE.md](./DATABASE_OPTION_SETS_QUICK_REFERENCE.md) | [DATABASE_TABLES_DETAILED.md](./DATABASE_TABLES_DETAILED.md)

---

## Table of Contents

1. [Common Schema](#common-schema)
2. [Status & Workflow](#status--workflow)
3. [User Types](#user-types)
4. [Property Options](#property-options)
5. [Time & Scheduling](#time--scheduling)
6. [Reviews & Ratings](#reviews--ratings)
7. [Communication](#communication)
8. [AI & Content](#ai--content)
9. [Media & Assets](#media--assets)
10. [Search & Filters](#search--filters)
11. [Reference Data](#reference-data)
12. [Integration Config](#integration-config)
13. [Bubble → Supabase Mapping](#bubble--supabase-mapping)

---

## Common Schema

All `os_*` tables share this base structure:

```sql
CREATE TABLE os_example (
    id          BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name        TEXT NOT NULL UNIQUE,     -- Programmatic key (snake_case)
    display     TEXT NOT NULL,            -- User-facing label
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### Usage Patterns

**Querying by name (programmatic)**:
```sql
SELECT * FROM os_proposal_status WHERE name = 'host_review';
```

**Querying by id (foreign key)**:
```sql
SELECT * FROM os_proposal_status WHERE id = 4;
```

**Getting display values**:
```javascript
const status = await supabase
  .from('os_proposal_status')
  .select('display')
  .eq('name', 'host_review')
  .single();
// Returns: { display: 'Host Review' }
```

---

## Status & Workflow

### `os_proposal_status`
**Purpose**: Proposal lifecycle states | **Used by**: `proposal.Status`, `proposals.status`

| ID | Name | Display | Sort |
|----|------|---------|------|
| 1 | `sl_submitted_awaiting_rental_app` | Proposal Submitted for guest by Split Lease - Awaiting Rental Application | 0 |
| 2 | `guest_submitted_awaiting_rental_app` | Proposal Submitted by guest - Awaiting Rental Application | 0 |
| 3 | `sl_submitted_pending_confirmation` | Proposal Submitted for guest by Split Lease - Pending Confirmation | 0 |
| 4 | `host_review` | Host Review | 1 |
| 5 | `host_counteroffer` | Host Counteroffer Submitted / Awaiting Guest Review | 2 |
| 6 | `accepted_drafting_lease` | Proposal or Counteroffer Accepted / Drafting Lease Documents | 3 |
| 7 | `lease_docs_for_review` | Lease Documents Sent for Review | 4 |
| 8 | `lease_docs_for_signatures` | Lease Documents Sent for Signatures | 5 |
| 9 | `lease_signed_awaiting_payment` | Lease Documents Signed / Awaiting Initial payment | 6 |
| 10 | `payment_submitted_lease_activated` | Initial Payment Submitted / Lease activated | 7 |
| 11 | `cancelled_by_guest` | Proposal Cancelled by Guest | -1 |
| 12 | `rejected_by_host` | Proposal Rejected by Host | -1 |
| 13 | `cancelled_by_sl` | Proposal Cancelled by Split Lease | -1 |
| 14 | `guest_ignored_suggestion` | Guest Ignored Suggestion | -1 |

**Extended Fields**:
- `displayed_on_screen` (text) - Screen context
- `guest_action_1`, `guest_action_2` (text) - Guest action buttons
- `host_action_1`, `host_action_2` (text) - Host action buttons

**Stage Mapping**:
| Stage | Status Names | Description |
|-------|--------------|-------------|
| Pre-submission | `*_awaiting_rental_app`, `*_pending_confirmation` | Initial states |
| 1 | `host_review` | Host reviewing proposal |
| 2 | `host_counteroffer` | Host made counter-offer |
| 3 | `accepted_drafting_lease` | Accepted, drafting docs |
| 4 | `lease_docs_for_review` | Docs ready for review |
| 5 | `lease_docs_for_signatures` | Docs ready for signing |
| 6 | `lease_signed_awaiting_payment` | Signed, awaiting payment |
| 7 | `payment_submitted_lease_activated` | Active lease |
| Terminal | `cancelled_*`, `rejected_*` | Closed states |

---

### `os_lease_status`
**Purpose**: Lease states | **Used by**: `bookings_leases.Lease Status`

| ID | Name | Display |
|----|------|---------|
| 1 | `not_started` | Not Started |
| 2 | `active` | Active |
| 3 | `started` | Started |
| 4 | `completed_finished` | Completed/Finished |
| 5 | `terminated` | Terminated |

**State Flow**:
```
not_started → started → active → completed_finished
                    ↘              ↗
                     → terminated →
```

---

### `os_stay_status`
**Purpose**: Individual stay states | **Used by**: `bookings_stays.status`

| ID | Name | Display |
|----|------|---------|
| 1 | `not_started` | Not Started |
| 2 | `started` | Started |
| 3 | `in_progress` | In Progress |
| 4 | `completed` | Completed |

---

### `os_co_host_status`
**Purpose**: Co-host request states | **Used by**: `co_hostrequest.status`

| ID | Name | Display |
|----|------|---------|
| - | `pending` | Pending |
| - | `accepted` | Accepted |
| - | `rejected` | Rejected |

---

### `os_date_change_request_status`
**Purpose**: Date change request states | **Used by**: `datechangerequest.status`

| ID | Name | Display |
|----|------|---------|
| - | `pending` | Pending |
| - | `approved` | Approved |
| - | `denied` | Denied |

---

### `os_multi_message_status`
**Purpose**: Multi-message states | **Used by**: `multimessage.status`

| ID | Name | Display |
|----|------|---------|
| - | `pending` | Pending |
| - | `sent` | Sent |
| - | `delivered` | Delivered |
| - | `failed` | Failed |

---

## User Types

### `os_user_type`
**Purpose**: Primary user classification | **Used by**: `user.Type - User Current`

| ID | Name | Display |
|----|------|---------|
| 1 | `host` | A Host (I have a space available to rent) |
| 2 | `guest` | A Guest (I would like to rent a space) |
| 3 | `split_lease` | Split Lease |
| 4 | `trial_host` | Trial Host |

---

### `os_user_subtype`
**Purpose**: User subcategories | **Used by**: `user.User Sub Type`

| ID | Name | Display |
|----|------|---------|
| - | `corporate` | Corporate User |
| - | `individual` | Individual |
| - | `property_manager` | Property Manager |

---

### `os_admin_users`
**Purpose**: Admin user config | **Used by**: Admin features

---

### `os_personas`
**Purpose**: User personas for UX | **Used by**: Onboarding flows

---

### `os_gender_type`
**Purpose**: Gender preferences | **Used by**: `listing.Preferred Gender`

| ID | Name | Display |
|----|------|---------|
| - | `any` | Any |
| - | `male` | Male |
| - | `female` | Female |

---

## Property Options

### `os_space_type`
**Purpose**: Space/listing types | **Used by**: `listing.Features - Type of Space`

| ID | Name | Display |
|----|------|---------|
| 1 | `entire_space` | Entire Space |
| 2 | `private_room` | Private Room |
| 3 | `shared_room` | Shared Room |

---

### `os_bathrooms`
**Purpose**: Bathroom counts | **Used by**: `listing.Features - Qty Bathrooms`

| ID | Name | Display |
|----|------|---------|
| 1 | `1` | 1 |
| 2 | `1.5` | 1.5 |
| 3 | `2` | 2 |
| 4 | `2.5` | 2.5 |
| 5 | `3` | 3 |
| 6 | `3+` | 3+ |

---

### `os_bedrooms`
**Purpose**: Bedroom counts | **Used by**: `listing.Features - Qty Bedrooms`

| ID | Name | Display |
|----|------|---------|
| 1 | `studio` | Studio |
| 2 | `1` | 1 |
| 3 | `2` | 2 |
| 4 | `3` | 3 |
| 5 | `4` | 4 |
| 6 | `5+` | 5+ |

---

### `os_beds`
**Purpose**: Bed counts | **Used by**: `listing.Features - Qty Beds`

---

### `os_qty_guests`
**Purpose**: Guest capacity | **Used by**: `listing.Features - Qty Guests`

---

### `os_roommates`
**Purpose**: Roommate counts | **Used by**: Roommate features

---

### `os_kitchen_type`
**Purpose**: Kitchen types | **Used by**: `listing.Kitchen Type`

| ID | Name | Display |
|----|------|---------|
| - | `full` | Full Kitchen |
| - | `kitchenette` | Kitchenette |
| - | `shared` | Shared Kitchen |
| - | `none` | No Kitchen |

---

### `os_rental_type`
**Purpose**: Rental types | **Used by**: `listing.rental type`, `proposal.rental type`

| ID | Name | Display |
|----|------|---------|
| - | `short_term` | Short Term |
| - | `long_term` | Long Term |
| - | `flexible` | Flexible |

---

### `os_storage_parking_type`
**Purpose**: Storage/parking options | **Used by**: `listing.Features - Parking type`

| ID | Name | Display |
|----|------|---------|
| - | `street` | Street Parking |
| - | `garage` | Garage |
| - | `lot` | Parking Lot |
| - | `none` | No Parking |

---

### `os_room_styles`
**Purpose**: Room styling options | **Used by**: Room description

---

### `os_amenity_categories`
**Purpose**: Amenity categories | **Used by**: `zat_features_amenity` categorization

| ID | Name | Display |
|----|------|---------|
| - | `essentials` | Essentials |
| - | `bathroom` | Bathroom |
| - | `bedroom` | Bedroom |
| - | `kitchen` | Kitchen |
| - | `entertainment` | Entertainment |
| - | `outdoor` | Outdoor |
| - | `safety` | Safety |
| - | `building` | Building |

---

## Time & Scheduling

### `os_days`
**Purpose**: Days of week | **Used by**: Day selection features

| ID | Name | Display | JS Index | Bubble Index |
|----|------|---------|----------|--------------|
| 1 | `sunday` | Sunday | 0 | 1 |
| 2 | `monday` | Monday | 1 | 2 |
| 3 | `tuesday` | Tuesday | 2 | 3 |
| 4 | `wednesday` | Wednesday | 3 | 4 |
| 5 | `thursday` | Thursday | 4 | 5 |
| 6 | `friday` | Friday | 5 | 6 |
| 7 | `saturday` | Saturday | 6 | 7 |

**CRITICAL**: Day index conversion required at system boundaries.
- Use `adaptDaysFromBubble()` when reading from database
- Use `adaptDaysToBubble()` when writing to database
- See `app/src/lib/scheduleSelector/CLAUDE.md`

---

### `os_nights`
**Purpose**: Nights of week | **Used by**: Night selection features

| ID | Name | Display |
|----|------|---------|
| 1 | `sunday_night` | Sunday Night |
| 2 | `monday_night` | Monday Night |
| 3 | `tuesday_night` | Tuesday Night |
| 4 | `wednesday_night` | Wednesday Night |
| 5 | `thursday_night` | Thursday Night |
| 6 | `friday_night` | Friday Night |
| 7 | `saturday_night` | Saturday Night |

---

### `os_check_in_out_times`
**Purpose**: Check-in/out times | **Used by**: `listing.NEW Date Check-in Time`, `listing.NEW Date Check-out Time`

| ID | Name | Display |
|----|------|---------|
| 1 | `10_00_am` | 10:00 am |
| 2 | `11_00_am` | 11:00 am |
| 3 | `12_00_pm` | 12:00 pm |
| 4 | `1_00_pm` | 1:00 pm |
| 5 | `2_00_pm` | 2:00 pm |
| 6 | `3_00_pm` | 3:00 pm |
| 7 | `4_00_pm` | 4:00 pm |

---

### `os_virtual_meeting_times`
**Purpose**: Meeting time slots | **Used by**: Virtual meeting scheduling

---

### `os_stay_periods`
**Purpose**: Duration options | **Used by**: Reservation span selection

| ID | Name | Display |
|----|------|---------|
| - | `1_week` | 1 Week |
| - | `2_weeks` | 2 Weeks |
| - | `1_month` | 1 Month |
| - | `2_months` | 2 Months |
| - | `3_months` | 3 Months |
| - | `6_months` | 6 Months |
| - | `1_year` | 1 Year |

---

### `os_weekly_selection_options`
**Purpose**: Schedule patterns | **Used by**: Schedule type selection

| ID | Name | Display |
|----|------|---------|
| - | `weekdays` | Weekdays Only |
| - | `weekends` | Weekends Only |
| - | `full_week` | Full Week |
| - | `custom` | Custom |

---

### `os_schedule_selection_types`
**Purpose**: Schedule selection modes | **Used by**: Schedule selector

---

## Reviews & Ratings

### `os_review_type`
**Purpose**: Review types | **Used by**: `mainreview.type`

| ID | Name | Display |
|----|------|---------|
| - | `guest_to_host` | Guest → Host |
| - | `host_to_guest` | Host → Guest |
| - | `guest_to_listing` | Guest → Listing |
| - | `guest_to_house_manual` | Guest → House Manual |

---

### `os_review_guest_questions`
**Purpose**: Guest survey questions | **Used by**: Guest review forms

---

### `os_review_host_questions`
**Purpose**: Host survey questions | **Used by**: Host review forms

---

### `os_categories_guest_user_reviews`
**Purpose**: Guest review categories | **Used by**: Review categorization

---

### `os_categories_house_manual_reviews`
**Purpose**: House manual review categories | **Used by**: Manual reviews

---

### `os_categories_listings_reviews`
**Purpose**: Listing review categories | **Used by**: Listing reviews

---

### `os_categories_stays_reviews`
**Purpose**: Stay review categories | **Used by**: Stay reviews

---

## Communication

### `os_communication_preference`
**Purpose**: User communication prefs | **Used by**: User settings

| ID | Name | Display |
|----|------|---------|
| - | `email` | Email |
| - | `sms` | SMS |
| - | `both` | Email & SMS |
| - | `push` | Push Notifications |

---

### `os_messaging_cta`
**Purpose**: Message CTAs | **Used by**: Messaging system

---

### `os_modality`
**Purpose**: Communication modes | **Used by**: Message type

| ID | Name | Display |
|----|------|---------|
| - | `email` | Email |
| - | `sms` | SMS |
| - | `in_app` | In-App |
| - | `push` | Push |

---

### `os_referral_contact_methods`
**Purpose**: Referral contact methods | **Used by**: Referral system

---

### `os_reminder_type`
**Purpose**: Reminder types | **Used by**: Reminder scheduling

---

### `os_alert_type`
**Purpose**: UI alert types | **Used by**: Alert components

| ID | Name | Display |
|----|------|---------|
| - | `info` | Information |
| - | `warning` | Warning |
| - | `error` | Error |
| - | `success` | Success |

---

## AI & Content

### `os_ai_fields_house_manual`
**Purpose**: AI fields for house manual parsing | **Used by**: AI features

---

### `os_ai_fields_listing`
**Purpose**: AI fields for listing parsing | **Used by**: AI features

---

### `os_chatgpt_models`
**Purpose**: ChatGPT model config | **Used by**: AI Gateway

| ID | Name | Display |
|----|------|---------|
| - | `gpt_3_5_turbo` | GPT-3.5 Turbo |
| - | `gpt_4` | GPT-4 |
| - | `gpt_4_turbo` | GPT-4 Turbo |

---

### `os_house_manual_audiences`
**Purpose**: House manual audience types | **Used by**: Manual access control

---

### `os_prompts`
**Purpose**: AI prompt templates | **Used by**: AI features

---

## Media & Assets

### `os_listing_photo_type`
**Purpose**: Photo types | **Used by**: `listing_photo.Type`

| ID | Name | Display |
|----|------|---------|
| - | `exterior` | Exterior |
| - | `living_room` | Living Room |
| - | `bedroom` | Bedroom |
| - | `bathroom` | Bathroom |
| - | `kitchen` | Kitchen |
| - | `amenity` | Amenity |
| - | `neighborhood` | Neighborhood |

---

### `os_photo_evidence_type`
**Purpose**: Evidence photo types | **Used by**: Evidence uploads

---

### `os_jingles`
**Purpose**: Audio jingle samples | **Used by**: Narration features

---

### `os_melodies`
**Purpose**: Melody options | **Used by**: Audio generation

---

### `os_narrators`
**Purpose**: AI narrator voices | **Used by**: Text-to-speech

---

### `os_video_animations`
**Purpose**: Video animation assets | **Used by**: UI animations

---

### `os_color_palette`
**Purpose**: UI color definitions | **Used by**: Theme system

---

### `os_images`
**Purpose**: Image asset URLs | **Used by**: Static assets

---

### `os_logos`
**Purpose**: Logo image URLs | **Used by**: Branding

---

### `os_ui_icons`
**Purpose**: Icon image URLs | **Used by**: UI components

---

## Search & Filters

### `os_price_filter`
**Purpose**: Price filter ranges | **Used by**: Search filters

| ID | Name | Display |
|----|------|---------|
| - | `0_50` | $0 - $50 |
| - | `50_100` | $50 - $100 |
| - | `100_150` | $100 - $150 |
| - | `150_200` | $150 - $200 |
| - | `200_plus` | $200+ |

---

### `os_sort_by_properties_search`
**Purpose**: Search sort options | **Used by**: Search results

| ID | Name | Display |
|----|------|---------|
| - | `price_low` | Price: Low to High |
| - | `price_high` | Price: High to Low |
| - | `newest` | Newest First |
| - | `relevance` | Most Relevant |

---

### `os_qr_code_use_cases`
**Purpose**: QR code types | **Used by**: QR code generation

---

## Reference Data

### `os_us_states`
**Purpose**: US state options | **Used by**: Address forms

| ID | Name | Display |
|----|------|---------|
| - | `NY` | New York |
| - | `CA` | California |
| - | `TX` | Texas |
| - | ... | ... |

---

### `os_language`
**Purpose**: Language options | **Used by**: Localization

| ID | Name | Display |
|----|------|---------|
| - | `en` | English |
| - | `es` | Spanish |
| - | `zh` | Chinese |

---

### `os_pages`
**Purpose**: Page references | **Used by**: Navigation

---

### `os_faq_type`
**Purpose**: FAQ categories | **Used by**: `zat_faq` categorization

---

### `os_legal_page_type`
**Purpose**: Legal page types | **Used by**: Legal content

| ID | Name | Display |
|----|------|---------|
| - | `terms` | Terms of Service |
| - | `privacy` | Privacy Policy |
| - | `cookies` | Cookie Policy |

---

### `os_screen_size`
**Purpose**: Responsive breakpoints | **Used by**: UI logic

| ID | Name | Display |
|----|------|---------|
| - | `mobile` | Mobile (<768px) |
| - | `tablet` | Tablet (768-1024px) |
| - | `desktop` | Desktop (>1024px) |

---

### `os_important_errors`
**Purpose**: Listing error types | **Used by**: Validation

---

### `os_ideal_split_preference`
**Purpose**: Split preferences | **Used by**: Preference settings

---

### `os_task_load`
**Purpose**: Task load levels | **Used by**: Task management

---

### `os_receipt`
**Purpose**: Receipt templates | **Used by**: Payment receipts

---

## Integration Config

### `os_cohost_admins`
**Purpose**: Admin contact/profile data | **Used by**: Admin features

---

### `os_proxy_sms_channels`
**Purpose**: SMS proxy phone numbers | **Used by**: SMS features

---

### `os_slack_channels`
**Purpose**: Slack channel config | **Used by**: Slack integration

---

### `os_slack_webhooks`
**Purpose**: Slack webhook URLs | **Used by**: Slack notifications

---

### `os_split_lease_config`
**Purpose**: App configuration | **Used by**: System settings

---

### `os_twilio_numbers`
**Purpose**: Twilio phone numbers | **Used by**: SMS/Voice

---

### `os_zep_curation_parameters`
**Purpose**: Curation weighting | **Used by**: Search ranking

---

### `os_postmark_webhook`
**Purpose**: Postmark webhook types | **Used by**: Email webhooks

---

## Bubble → Supabase Mapping

### Complete Reference

| Bubble.io Name | Supabase Table | Category |
|----------------|----------------|----------|
| #Bathrooms | `os_bathrooms` | Property |
| #Bedrooms | `os_bedrooms` | Property |
| #Beds | `os_beds` | Property |
| #Qty Guests | `os_qty_guests` | Property |
| #Roommates | `os_roommates` | Property |
| Admin Users | `os_admin_users` | User |
| AI fields (house manual) | `os_ai_fields_house_manual` | AI |
| AI Fields (Listing) | `os_ai_fields_listing` | AI |
| Alert Type | `os_alert_type` | Comm |
| Assets - Color Pallete | `os_color_palette` | Media |
| Assets - Images | `os_images` | Media |
| Assets - Split Lease Logos | `os_logos` | Media |
| Assets - UI Icons | `os_ui_icons` | Media |
| Categories of Guest user Reviews | `os_categories_guest_user_reviews` | Review |
| Categories of House Manual Reviews | `os_categories_house_manual_reviews` | Review |
| Categories of Listings Reviews | `os_categories_listings_reviews` | Review |
| Categories of Stays Reviews | `os_categories_stays_reviews` | Review |
| ChatGPT Models | `os_chatgpt_models` | AI |
| Check-In and Check-Out Times | `os_check_in_out_times` | Time |
| Co-Host Status | `os_co_host_status` | Status |
| Co-Host/Split Lease Admins | `os_cohost_admins` | Config |
| Communication Preference OS | `os_communication_preference` | Comm |
| date change request status | `os_date_change_request_status` | Status |
| Days | `os_days` | Time |
| Filter - PriceonSearch | `os_price_filter` | Search |
| house manual audiences | `os_house_manual_audiences` | AI |
| Ideal Split Preference | `os_ideal_split_preference` | Pref |
| Important Errors | `os_important_errors` | Ref |
| jingles samples | `os_jingles` | Media |
| Kitchen Types | `os_kitchen_type` | Property |
| Language | `os_language` | Ref |
| Melodies Previews | `os_melodies` | Media |
| Messaging - Call to Action (CTA) | `os_messaging_cta` | Comm |
| Modality | `os_modality` | Comm |
| Multi Message Status | `os_multi_message_status` | Status |
| Narrators | `os_narrators` | Media |
| Nights | `os_nights` | Time |
| Pages | `os_pages` | Ref |
| Personas | `os_personas` | User |
| Prompts | `os_prompts` | AI |
| Proxy SMS Channels OS | `os_proxy_sms_channels` | Config |
| QR Code Use Cases | `os_qr_code_use_cases` | Search |
| receipt | `os_receipt` | Ref |
| Referral Contact Methods | `os_referral_contact_methods` | Comm |
| Reminder Type | `os_reminder_type` | Comm |
| Rental Type | `os_rental_type` | Property |
| Review - Guest Questions | `os_review_guest_questions` | Review |
| Review - Host Questions | `os_review_host_questions` | Review |
| Room Styles | `os_room_styles` | Property |
| Schedule Selection Types | `os_schedule_selection_types` | Time |
| Screen Size | `os_screen_size` | Ref |
| Slack Channels | `os_slack_channels` | Config |
| Slack Webhooks | `os_slack_webhooks` | Config |
| sortByPropertiesSearch | `os_sort_by_properties_search` | Search |
| Split Lease Config | `os_split_lease_config` | Config |
| Status - Leases | `os_lease_status` | Status |
| Status - Proposal | `os_proposal_status` | Status |
| Stay - Status | `os_stay_status` | Status |
| Stay Periods (Reservation Span) | `os_stay_periods` | Time |
| sub-type of users | `os_user_subtype` | User |
| Task Load | `os_task_load` | Ref |
| Twilio Numbers | `os_twilio_numbers` | Config |
| Type of ZAT - FAQ | `os_faq_type` | Ref |
| Type_ Amenity Categories | `os_amenity_categories` | Property |
| Type_ Gender | `os_gender_type` | User |
| Type_ Legal Page | `os_legal_page_type` | Ref |
| Type_ Listing Photo | `os_listing_photo_type` | Media |
| Type_ Photo Evidence | `os_photo_evidence_type` | Media |
| Type_ Review | `os_review_type` | Review |
| Type_ Space | `os_space_type` | Property |
| Type_ Storage & Parking | `os_storage_parking_type` | Property |
| Type_ Users | `os_user_type` | User |
| US States | `os_us_states` | Ref |
| Video Animations | `os_video_animations` | Media |
| Virtual Meeting Times | `os_virtual_meeting_times` | Time |
| Weekly Selection options | `os_weekly_selection_options` | Time |
| ZEP - Curation Parameters(OS) | `os_zep_curation_parameters` | Config |
| zep-Type_ Postmark Webhook | `os_postmark_webhook` | Config |

---

## Usage Guidelines

### Querying Option Sets

**Get all values for dropdown**:
```javascript
const { data } = await supabase
  .from('os_space_type')
  .select('id, name, display')
  .order('id');
```

**Lookup by programmatic name**:
```javascript
const { data } = await supabase
  .from('os_proposal_status')
  .select('*')
  .eq('name', 'host_review')
  .single();
```

**Get display for stored value**:
```javascript
const { data } = await supabase
  .from('os_proposal_status')
  .select('display')
  .eq('name', storedStatusName)
  .single();
```

### Adding New Option Set Values

```sql
INSERT INTO os_example (name, display)
VALUES ('new_value', 'New Display Text');
```

### Creating New Option Set Table

```sql
CREATE TABLE os_new_category (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL UNIQUE,
    display TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS with public read
ALTER TABLE os_new_category ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON os_new_category FOR SELECT USING (true);
```

---

## Cross-References

| Document | Purpose |
|----------|---------|
| [DATABASE_OPTION_SETS_QUICK_REFERENCE.md](./DATABASE_OPTION_SETS_QUICK_REFERENCE.md) | Quick lookup |
| [DATABASE_TABLES_DETAILED.md](./DATABASE_TABLES_DETAILED.md) | Full table schemas |
| `app/src/lib/constants/CLAUDE.md` | Frontend constants |
| `app/src/config/CLAUDE.md` | Status configuration |

---

*Last verified: 2026-01-20 against live Supabase database*
