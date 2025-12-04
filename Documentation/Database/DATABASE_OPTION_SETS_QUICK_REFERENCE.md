# Database & Option Sets Quick Reference

> **Source of Truth** | Generated: 2025-12-01 | Verified against live Supabase
> **See also**: [DATABASE_TABLES_DETAILED.md](./DATABASE_TABLES_DETAILED.md) | [OPTION_SETS_DETAILED.md](./OPTION_SETS_DETAILED.md)

---

## Database Summary

| Metric | Count |
|--------|-------|
| Total Tables | 167 |
| Main Data Tables | 58 |
| Option Sets (os_*) | 89 |
| Feature/Lookup (zat_/zfut_/zep_) | 27 |

---

## All Database Tables (58)

### Core Entities
| Table | PK | Description | FK Relations |
|-------|-----|-------------|--------------|
| `user` | `_id` | Bubble user profiles | `account_guest`, `account_host` |
| `users` | `id` | Supabase auth users | - |
| `account_guest` | `_id` | Guest profile extension | `user` |
| `account_host` | `_id` | Host profile extension | `user`, `listing[]` |

### Listings & Property
| Table | PK | Description | FK Relations |
|-------|-----|-------------|--------------|
| `listing` | `_id` | Property listings (265) | `account_host`, `housemanual`, `zat_geo_*` |
| `listing_photo` | `_id` | Listing photos (4604) | `listing` |
| `listings` | `id` | Simplified listings | - |
| `listing_trial` | - | Trial listings | `listing` |
| `hostrestrictions` | `_id` | Host restrictions | `listing` |
| `housemanual` | `_id` | House manuals | `listing`, `account_host` |
| `housemanualphotos` | `_id` | Manual photos | `housemanual` |
| `pricing_list` | `_id` | Pricing config | `listing` |

### Booking Flow
| Table | PK | Description | FK Relations |
|-------|-----|-------------|--------------|
| `proposal` | `_id` | Legacy proposals (687) | `user`, `listing`, `account_host` |
| `proposals` | `id` | New proposals (0) | `user`, `listing` |
| `bookings_leases` | `_id` | Leases (156) | `proposal`, `listing`, `user` |
| `bookings_stays` | `_id` | Individual stays (17601) | `bookings_leases`, `listing` |
| `negotiationsummary` | `_id` | Proposal negotiations | `proposal` |
| `datechangerequest` | `_id` | Date changes | `bookings_leases`, `bookings_stays` |
| `paymentsfromdatechanges` | `_id` | Date change payments | `datechangerequest`, `bookings_leases` |

### Payments & Financial
| Table | PK | Description | FK Relations |
|-------|-----|-------------|--------------|
| `paymentrecords` | `_id` | Payment records (4015) | `bookings_leases` |
| `fieldsforleasedocuments` | `_id` | Lease doc fields | - |
| `invoices` | `_id` | Invoices | - |

### Messaging
| Table | PK | Description | FK Relations |
|-------|-----|-------------|--------------|
| `_message` | `_id` | Messages (6244) | `user` |
| `multimessage` | `_id` | SMS/Email messages | `user`, `proxysmssession` |
| `proxysmssession` | `_id` | SMS proxy sessions | - |
| `postmark_loginbound` | `_id` | Inbound emails | - |

### Reviews
| Table | PK | Description | FK Relations |
|-------|-----|-------------|--------------|
| `mainreview` | `_id` | Reviews (32) | `user`, `bookings_stays`, `housemanual` |
| `ratingdetail_reviews_` | `_id` | Rating details | `mainreview` |
| `external_reviews` | `id` | External reviews | `listing` |
| `reviewslistingsexternal` | `_id` | External listing reviews | `listing` |

### User Support
| Table | PK | Description | FK Relations |
|-------|-----|-------------|--------------|
| `rentalapplication` | `_id` | Rental apps | `user` |
| `occupant` | `_id` | Occupants | `rentalapplication` |
| `referral` | `_id` | Referrals | `user` |
| `co_hostrequest` | `_id` | Co-host requests | `user`, `account_host`, `listing` |
| `emergencyreports` | `_id` | Emergency reports | `bookings_leases`, `user` |

### Meetings & Visits
| Table | PK | Description | FK Relations |
|-------|-----|-------------|--------------|
| `virtual_meetings` | `id` | Virtual meetings | `proposal` |
| `virtualmeetingschedulesandlinks` | `_id` | Meeting schedules | `proposal`, `user` |
| `visit` | `_id` | Property visits | `housemanual`, `user` |
| `narration` | `_id` | Audio narrations | `housemanual`, `visit` |
| `qrcodes` | `_id` | QR codes | `housemanual` |
| `remindersfromhousemanual` | `_id` | Reminders | `housemanual` |

### Documents & Files
| Table | PK | Description | FK Relations |
|-------|-----|-------------|--------------|
| `file` | `_id` | Files | `bookings_leases`, `proposal` |
| `documentssent` | `_id` | Sent documents | `user` |
| `updatestodocuments` | `_id` | Doc updates | - |
| `internalfiles` | `_id` | Internal files | - |

### Notifications
| Table | PK | Description | FK Relations |
|-------|-----|-------------|--------------|
| `email` | `_id` | Email records | - |
| `emailtemplate_postmark_` | `_id` | Email templates | - |
| `emailtemplates_category_postmark_` | `_id` | Template categories | - |
| `notificationsettingsos_lists_` | `_id` | Notification settings | `user` |
| `notification_preferences` | - | Preferences | `user` |
| `mailing_list_opt_in` | `_id` | Mailing subscriptions | - |

### Search & Analytics
| Table | PK | Description | FK Relations |
|-------|-----|-------------|--------------|
| `savedsearch` | `_id` | Saved searches | `user` |
| `datacollection_searchlogging` | `_id` | Search logs (1682) | `user` |
| `experiencesurvey` | `_id` | Surveys | - |
| `waitlistsubmission` | `_id` | Waitlist | - |

### Content & Config
| Table | PK | Description | FK Relations |
|-------|-----|-------------|--------------|
| `knowledgebase` | `_id` | KB articles | - |
| `knowledgebaselineitem` | `_id` | KB items | `knowledgebase` |
| `informationaltexts` | `_id` | UI texts | - |
| `audit_log` | - | Audit log | - |
| `state` | - | US states | - |
| `num` | - | Counters (22973) | - |
| `dailycounter` | - | Daily counters | - |

---

## Feature/Lookup Tables (27)

### zat_features_* (Listing Features)
| Table | Description | Used By |
|-------|-------------|---------|
| `zat_features_amenity` | Amenity options | `listing.Features - Amenities *` |
| `zat_features_cancellationpolicy` | Cancellation policies | `listing`, `bookings_leases` |
| `zat_features_houserule` | House rules | `listing.Features - House Rules` |
| `zat_features_listingtype` | Listing types | `listing` |
| `zat_features_parkingoptions` | Parking options | `listing` |
| `zat_features_storageoptions` | Storage options | `listing` |

### zat_geo_* (Geography)
| Table | Description | Used By |
|-------|-------------|---------|
| `zat_geo_borough_toplevel` | Boroughs | `listing.Location - Borough` |
| `zat_geo_hood_mediumlevel` | Neighborhoods | `listing.Location - Hood` |
| `zat_location` | Location refs | `listing` |

### zat_* (Other Config)
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

### zfut_* (Future/Additional)
| Table | Description |
|-------|-------------|
| `zfut_proofofcleaning` | Cleaning proof photos |
| `zfut_safetyfeatures` | Safety features |
| `zfut_storagephotos` | Storage photos |

### zep_* (Integration Config)
| Table | Description |
|-------|-------------|
| `zep_curationparameter` | Curation params |
| `zep_twilio` | Twilio config |
| `zep_twiliocheckin` | Twilio check-in |
| `zep_twiliocheckout` | Twilio check-out |

---

## Option Sets (89 Tables)

### Bubble Name → Supabase Table Mapping

#### Status & Workflow
| Bubble Name | Supabase Table | Used For |
|-------------|----------------|----------|
| Status - Proposal | `os_proposal_status` | `proposal.Status`, `proposals.status` |
| Status - Leases | `os_lease_status` | `bookings_leases.Lease Status` |
| Stay - Status | `os_stay_status` | `bookings_stays.status` |
| Co-Host Status | `os_co_host_status` | `co_hostrequest` |
| date change request status | `os_date_change_request_status` | `datechangerequest` |
| Multi Message Status | `os_multi_message_status` | `multimessage` |

#### User Types
| Bubble Name | Supabase Table | Used For |
|-------------|----------------|----------|
| Type_ Users | `os_user_type` | `user.Type - User Current` |
| sub-type of users | `os_user_subtype` | `user.User Sub Type` |
| Admin Users | `os_admin_users` | Admin config |
| Personas | `os_personas` | User personas |
| Type_ Gender | `os_gender_type` | `listing.Preferred Gender` |

#### Property Quantities
| Bubble Name | Supabase Table | Used For |
|-------------|----------------|----------|
| #Bathrooms | `os_bathrooms` | `listing.Features - Qty Bathrooms` |
| #Bedrooms | `os_bedrooms` | `listing.Features - Qty Bedrooms` |
| #Beds | `os_beds` | `listing.Features - Qty Beds` |
| #Qty Guests | `os_qty_guests` | `listing.Features - Qty Guests` |
| #Roommates | `os_roommates` | Roommate count |

#### Property Features
| Bubble Name | Supabase Table | Used For |
|-------------|----------------|----------|
| Type_ Space | `os_space_type` | `listing.Features - Type of Space` |
| Kitchen Types | `os_kitchen_type` | `listing.Kitchen Type` |
| Rental Type | `os_rental_type` | `listing.rental type`, `proposal.rental type` |
| Type_ Storage & Parking | `os_storage_parking_type` | Parking/storage options |
| Room Styles | `os_room_styles` | Room styling |
| Type_ Amenity Categories | `os_amenity_categories` | Amenity categories |

#### Time & Scheduling
| Bubble Name | Supabase Table | Used For |
|-------------|----------------|----------|
| Days | `os_days` | Day selection (JS: 0-6, Bubble: 1-7) |
| Nights | `os_nights` | Night selection |
| Check-In and Check-Out Times | `os_check_in_out_times` | `listing.NEW Date Check-in/out Time` |
| Virtual Meeting Times | `os_virtual_meeting_times` | Meeting scheduling |
| Stay Periods (Reservation Span) | `os_stay_periods` | Duration options |
| Weekly Selection options | `os_weekly_selection_options` | Schedule patterns |
| Schedule Selection Types | `os_schedule_selection_types` | Schedule types |

#### Reviews & Ratings
| Bubble Name | Supabase Table | Used For |
|-------------|----------------|----------|
| Type_ Review | `os_review_type` | `mainreview` type |
| Review - Guest Questions | `os_review_guest_questions` | Guest survey |
| Review - Host Questions | `os_review_host_questions` | Host survey |
| Categories of Guest user Reviews | `os_categories_guest_user_reviews` | Guest review cats |
| Categories of House Manual Reviews | `os_categories_house_manual_reviews` | Manual review cats |
| Categories of Listings Reviews | `os_categories_listings_reviews` | Listing review cats |
| Categories of Stays Reviews | `os_categories_stays_reviews` | Stay review cats |

#### Communication
| Bubble Name | Supabase Table | Used For |
|-------------|----------------|----------|
| Communication Preference OS | `os_communication_preference` | User prefs |
| Messaging - Call to Action (CTA) | `os_messaging_cta` | Message CTAs |
| Modality | `os_modality` | Communication modes |
| Referral Contact Methods | `os_referral_contact_methods` | Referral methods |
| Reminder Type | `os_reminder_type` | Reminder types |
| Alert Type | `os_alert_type` | Alert types |

#### AI & Content
| Bubble Name | Supabase Table | Used For |
|-------------|----------------|----------|
| AI fields (house manual) | `os_ai_fields_house_manual` | AI parsing |
| AI Fields (Listing) | `os_ai_fields_listing` | AI parsing |
| ChatGPT Models | `os_chatgpt_models` | Model config |
| house manual audiences | `os_house_manual_audiences` | Audience types |
| Prompts | `os_prompts` | AI prompts |

#### Photos & Media
| Bubble Name | Supabase Table | Used For |
|-------------|----------------|----------|
| Type_ Listing Photo | `os_listing_photo_type` | `listing_photo` types |
| Type_ Photo Evidence | `os_photo_evidence_type` | Evidence photos |
| jingles samples | `os_jingles` | Audio samples |
| Melodies Previews | `os_melodies` | Melody options |
| Narrators | `os_narrators` | Voice config |
| Video Animations | `os_video_animations` | Video assets |

#### Search & Filters
| Bubble Name | Supabase Table | Used For |
|-------------|----------------|----------|
| Filter - PriceonSearch | `os_price_filter` | Price filters |
| sortByPropertiesSearch | `os_sort_by_properties_search` | Sort options |
| QR Code Use Cases | `os_qr_code_use_cases` | QR code types |

#### Reference Data
| Bubble Name | Supabase Table | Used For |
|-------------|----------------|----------|
| US States | `os_us_states` | State dropdown |
| Language | `os_language` | Language options |
| Pages | `os_pages` | Page references |
| Type of ZAT - FAQ | `os_faq_type` | FAQ categories |
| Type_ Legal Page | `os_legal_page_type` | Legal page types |
| Screen Size | `os_screen_size` | Breakpoints |
| Important Errors | `os_important_errors` | Error types |

#### Preferences
| Bubble Name | Supabase Table | Used For |
|-------------|----------------|----------|
| Ideal Split Preference | `os_ideal_split_preference` | Split preferences |
| Task Load | `os_task_load` | Task load levels |
| receipt | `os_receipt` | Receipt templates |

#### UI Assets
| Bubble Name | Supabase Table | Used For |
|-------------|----------------|----------|
| Assets - Color Pallete | `os_color_palette` | Color definitions |
| Assets - Images | `os_images` | Image URLs |
| Assets - Split Lease Logos | `os_logos` | Logo URLs |
| Assets - UI Icons | `os_ui_icons` | Icon URLs |

#### Integration Config
| Bubble Name | Supabase Table | Used For |
|-------------|----------------|----------|
| Co-Host/Split Lease Admins | `os_cohost_admins` | Admin profiles |
| Proxy SMS Channels OS | `os_proxy_sms_channels` | SMS phone numbers |
| Slack Channels | `os_slack_channels` | Slack config |
| Slack Webhooks | `os_slack_webhooks` | Webhook URLs |
| Split Lease Config | `os_split_lease_config` | App config |
| Twilio Numbers | `os_twilio_numbers` | Twilio phones |
| ZEP - Curation Parameters(OS) | `os_zep_curation_parameters` | Curation weights |
| zep-Type_ Postmark Webhook | `os_postmark_webhook` | Postmark types |

---

## Option Set Table Schema

All `os_*` tables share common structure:

```sql
id            BIGINT PRIMARY KEY    -- Auto-increment
name          TEXT NOT NULL UNIQUE  -- Programmatic key
display       TEXT NOT NULL         -- User-facing label
created_at    TIMESTAMPTZ          -- Creation timestamp
```

Extended fields (vary by table):
- `sort_order` (integer) - Display ordering
- `displayed_on_screen` (text) - Screen context
- `guest_action_1/2` (text) - Guest action buttons
- `host_action_1/2` (text) - Host action buttons

---

## Key Relationships Diagram

```
USER DOMAIN                    PROPERTY DOMAIN                    BOOKING DOMAIN
───────────                    ───────────────                    ──────────────
user ─┬─► account_guest        listing ◄──┬── listing_photo      proposal ──► bookings_leases
      │                            │      │                           │              │
      └─► account_host ◄───────────┘      ├── housemanual             │              ├── bookings_stays
              │                           │       │                   │              │
              └─► co_hostrequest          │       └── narration       │              ├── paymentrecords
                                          │       └── visit           │              │
                                          │                           │              └── datechangerequest
                                          ├── hostrestrictions        │
                                          │                           │
                                          └── zat_geo_* (FK)          └── negotiationsummary
```

---

## Day Index Conversion (CRITICAL)

| Day | JS Index | Bubble Index |
|-----|----------|--------------|
| Sunday | 0 | 1 |
| Monday | 1 | 2 |
| Tuesday | 2 | 3 |
| Wednesday | 3 | 4 |
| Thursday | 4 | 5 |
| Friday | 5 | 6 |
| Saturday | 6 | 7 |

Convert at boundaries: `adaptDaysFromBubble()`, `adaptDaysToBubble()`

---

## Cross-References

| Document | Purpose |
|----------|---------|
| [DATABASE_TABLES_DETAILED.md](./DATABASE_TABLES_DETAILED.md) | Full schema, all columns, constraints |
| [OPTION_SETS_DETAILED.md](./OPTION_SETS_DETAILED.md) | Option set values, usage patterns |
| `app/src/lib/constants/CLAUDE.md` | Proposal status/stage constants |
| `app/src/logic/CLAUDE.md` | Four-layer logic architecture |

---

*Last verified: 2025-12-01 against live Supabase database*
