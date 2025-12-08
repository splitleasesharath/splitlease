# Split Lease Database - Complete Table List

## Summary Statistics
- **Total Tables**: 157
- **Reference/Lookup Tables**: 99 (starting with os_, zat_, or being static lookup tables)
- **Core Business Tables**: 58 (non-reference tables with actual operational data)

---

## CORE BUSINESS TABLES (Non-Reference)

These are the primary tables containing actual business data and operational records:

### User & Account Management
1. `user` - Main user accounts
2. `account_guest` - Guest account profiles
3. `account_host` - Host account profiles
4. `occupant` - Occupant records

### Listing Management
5. `listing` - Property listings
6. `listing_photo` - Listing photos
7. `listing_trial` - Trial periods for listings
8. `hostrestrictions` - Host-defined restrictions
9. `pricing_list` - Pricing configurations

### Booking & Lease Management
10. `bookings_leases` - Lease agreements
11. `bookings_stays` - Individual stays/bookings
12. `paymentrecords` - Payment transaction records
13. `paymentsfromdatechanges` - Payments from date change requests
14. `datechangerequest` - Date modification requests
15. `co_hostrequest` - Co-host collaboration requests

### House Manuals & Documents
16. `housemanual` - Property house manuals
17. `housemanualphotos` - Photos associated with house manuals
18. `remindersfromhousemanual` - Reminders extracted from manuals
19. `narration` - Narration/jingle content
20. `documentssent` - Sent documents tracking
21. `updatestodocuments` - Document version updates
22. `file` - File storage references
23. `fieldsforleasedocuments` - Lease document field values

### Reviews & Ratings
24. `mainreview` - Main review records (guest/host reviews)
25. `ratingdetail_reviews_` - Rating detail breakdowns
26. `external_reviews` - External review aggregation
27. `reviewslistingsexternal` - External listing reviews

### Communication & Messaging
28. `_message` - Messages between users
29. `multimessage` - Multi-channel messages (email/SMS)
30. `virtualmeetingschedulesandlinks` - Virtual meeting bookings
31. `proxysmssession` - SMS proxy sessions

### Proposals & Negotiations
32. `proposal` - Guest proposals to hosts
33. `negotiationsummary` - Negotiation summaries

### Emergency & Support
34. `emergencyreports` - Emergency incident reports
35. `rentalapplication` - Rental applications

### Data Collection & Analytics
36. `datacollection_searchlogging` - Search query logging
37. `experiencesurvey` - User experience surveys
38. `savedsearch` - Saved search preferences
39. `waitlistsubmission` - Waitlist submissions
40. `visit` - Visit/viewing records
41. `referral` - Referral tracking

### Email & Notifications
42. `email` - Email records
43. `emailtemplate_postmark_` - Email templates
44. `emailtemplates_category_postmark_` - Email template categories
45. `notification_preferences` - User notification preferences
46. `notificationsettingsos_lists_` - Notification settings lists

### API & Integration
47. `postmark_loginbound` - Postmark webhook logs
48. `os_postmark_webhook` - (Shared webhook config)
49. `multimessage` - (Email/SMS proxy records)

### QR Codes & Digital Assets
50. `qrcodes` - Generated QR codes
51. `zat_htmlembed` - HTML embed codes

### Geo & Location
52. `zat_location` - Location data

### Knowledge Base & Support
53. `knowledgebase` - Knowledge base articles
54. `knowledgebaselineitem` - Knowledge base line items
55. `informationaltexts` - Informational text blocks
56. `internalfiles` - Internal documents

### Invoices & Financial
57. `invoices` - Invoice records

### System Management
58. `dailycounter` - Daily counter for ID generation

---

## REFERENCE/LOOKUP TABLES (Static Configuration)

### Option Sets (Starting with `os_`)
These tables store dropdown/select options throughout the application:

1. `os_admin_users` - Admin user list
2. `os_ai_fields_house_manual` - AI-related fields config
3. `os_ai_fields_listing` - AI-related fields config
4. `os_alert_type` - Alert types
5. `os_amenity_categories` - Amenity category options
6. `os_bathrooms` - Bathroom count options
7. `os_bedrooms` - Bedroom count options
8. `os_beds` - Bed count options
9. `os_categories_guest_user_reviews` - Review categories
10. `os_categories_house_manual_reviews` - Review categories
11. `os_categories_listings_reviews` - Review categories
12. `os_categories_stays_reviews` - Review categories
13. `os_chatgpt_models` - ChatGPT model options
14. `os_check_in_out_times` - Check-in/out time options
15. `os_co_host_status` - Co-host status values
16. `os_cohost_admins` - Co-host admin list
17. `os_color_palette` - Color options
18. `os_communication_preference` - Communication channel preferences
19. `os_date_change_request_status` - Request status values
20. `os_days` - Day of week options
21. `os_faq_type` - FAQ category types
22. `os_gender_type` - Gender options
23. `os_house_manual_audiences` - Audience types for house manuals
24. `os_ideal_split_preference` - Roommate preference options
25. `os_images` - Image library
26. `os_important_errors` - Error message catalog
27. `os_jingles` - Jingle audio options
28. `os_kitchen_type` - Kitchen type options
29. `os_language` - Language options
30. `os_lease_status` - Lease status values
31. `os_legal_page_type` - Legal page types
32. `os_listing_photo_type` - Photo type options
33. `os_logos` - Logo library
34. `os_melodies` - Melody audio options
35. `os_messaging_cta` - Call-to-action text options
36. `os_modality` - Communication modality options
37. `os_multi_message_status` - Message status values
38. `os_name_mapping` - Name mapping data
39. `os_narrators` - Narrator audio options
40. `os_nights` - Night count options
41. `os_pages` - Page catalog
42. `os_personas` - User persona options
43. `os_photo_evidence_type` - Evidence photo types
44. `os_price_filter` - Price range filter options
45. `os_prompts` - AI prompt templates
46. `os_proposal_status` - Proposal status values
47. `os_proxy_sms_channels` - SMS proxy channel options
48. `os_qr_code_use_cases` - QR code purpose options
49. `os_qty_guests` - Guest count options
50. `os_receipt` - Receipt type options
51. `os_referral_contact_methods` - Referral contact method options
52. `os_reminder_type` - Reminder type options
53. `os_rental_type` - Rental type options
54. `os_review_guest_questions` - Guest review question templates
55. `os_review_host_questions` - Host review question templates
56. `os_review_type` - Review type options
57. `os_room_styles` - Room style options
58. `os_roommates` - Roommate compatibility options
59. `os_schedule_selection_types` - Schedule selection modes
60. `os_screen_size` - Screen size breakpoints
61. `os_slack_channels` - Slack channel references
62. `os_slack_webhooks` - Slack webhook configurations
63. `os_sort_by_properties_search` - Search sort options
64. `os_space_type` - Space type options
65. `os_split_lease_config` - Platform configuration
66. `os_stay_periods` - Stay period duration options
67. `os_stay_status` - Stay status values
68. `os_storage_parking_type` - Storage/parking type options
69. `os_task_load` - Task workload options
70. `os_twilio_numbers` - Twilio phone numbers
71. `os_ui_icons` - UI icon library
72. `os_us_states` - US state options
73. `os_user_subtype` - User subtype options
74. `os_user_type` - User type options
75. `os_video_animations` - Animation options
76. `os_virtual_meeting_times` - Meeting time slot options
77. `os_weekly_selection_options` - Weekly schedule options
78. `os_zep_curation_parameters` - Curation configuration

### Zero-Alpha Tables (Starting with `zat_`)
These are specialized data tables and feature-specific lookups:

1. `zat_aisuggestions` - AI-generated suggestions
2. `zat_blocked_vm_bookingtimes` - Blocked virtual meeting times
3. `zat_email_html_template_eg_sendbasicemailwf_` - Email HTML templates
4. `zat_faq` - FAQ entries
5. `zat_features_amenity` - Amenity feature options
6. `zat_features_cancellationpolicy` - Cancellation policy options
7. `zat_features_houserule` - House rule options
8. `zat_features_listingtype` - Listing type options
9. `zat_features_parkingoptions` - Parking type options
10. `zat_features_storageoptions` - Storage type options
11. `zat_geo_borough_toplevel` - NYC borough geography
12. `zat_geo_hood_mediumlevel` - NYC neighborhood geography
13. `zat_goodguestreasons` - Good guest criteria
14. `zat_htmlembed` - HTML embed snippets
15. `zat_location` - Location reference data
16. `zat_policiesdocuments` - Policy document templates
17. `zat_priceconfiguration` - Price configuration rules
18. `zat_splitleaseteam` - Split Lease team directory
19. `zat_storage` - Storage configuration
20. `zat_successstory` - Success story content
21. `zep_curationparameter` - Curation algorithm parameters
22. `zep_twilio` - Twilio configuration
23. `zep_twiliocheckin` - Check-in call templates
24. `zep_twiliocheckout` - Check-out call templates

### Miscellaneous Reference Tables
1. `num` - Numeric lookup table
2. `state` - State reference data
3. `sync_config` - Sync configuration
4. `sync_queue` - Sync queue management
5. `zfut_proofofcleaning` - Cleaning proof evidence types
6. `zfut_safetyfeatures` - Safety feature options
7. `zfut_storagephotos` - Storage photo evidence types

---

## Key Observations

### Business Data Tables (58 total)
These contain the core operational data:
- User/Account: 4 tables
- Listings: 5 tables
- Bookings/Leases: 6 tables
- House Manuals: 7 tables
- Reviews: 4 tables
- Communication: 4 tables
- Proposals: 2 tables
- Emergency/Support: 2 tables
- Data Collection: 6 tables
- Email/Notifications: 5 tables
- API Integration: 2 tables
- Other: 8 tables

### Reference Tables (99 total)
Option sets and configuration for dropdowns, selects, and static data:
- Option Sets (os_): 78 tables
- Zero-Alpha (zat_): 19 tables
- Miscellaneous: 2 tables

---

## Table Naming Conventions

- **`os_`** prefix: Open source or option set (dropdown/select options)
- **`zat_`** prefix: Zero-Alpha Test tables (features/geographic data)
- **`zep_`** prefix: Zero-Epic tables (larger feature implementations)
- **`zfut_`** prefix: Zero-Future tables (upcoming features)
- **No prefix**: Core business tables and Bubble.io migrated data

---

## Export Generated
**Date**: 2025-12-06
**Source**: Supabase Live Database - public schema
**Total Tables Analyzed**: 157
