# Implementation Plan: Add pending Boolean Field to All Non-OS Tables

## Overview
Add a pending boolean column to all tables in the public schema that do NOT start with os_ (option set tables).

---

## Tables to Modify (91 tables)

### Core Business Tables
1. _message
2. account_guest
3. account_host
4. bookings_leases
5. bookings_stays
6. co_hostrequest
7. listing
8. listing_photo
9. listing_trial
10. occupant
11. proposal
12. proposals
13. stay_periods

### Communication & Messaging Tables
14. email
15. emailtemplate_postmark_
16. emailtemplates_category_postmark_
17. multimessage
18. narration
19. notification_preferences
20. notificationsettingsos_lists_

### Documents & Reviews Tables
21. documentssent
22. external_reviews
23. mainreview
24. reviewslistingsexternal
25. ratingdetail_reviews_
26. fieldsforleasedocuments
27. updatestodocuments

### Administrative & Logging Tables
28. audit_log
29. dailycounter
30. datacollection_searchlogging
31. informationaltexts
32. internalfiles

### Financial Tables
33. invoices
34. paymentrecords
35. paymentsfromdatechanges

### House Manual & Knowledge Tables
36. housemanual
37. housemanualphotos
38. knowledgebase
39. knowledgebaselineitem
40. remindersfromhousemanual

### User & Profile Tables
41. user
42. state
43. referral
44. mailing_list_opt_in

### Requests & Changes Tables
45. datechangerequest
46. emergencyreports
47. experiencesurvey
48. hostrestrictions
49. negotiationsummary
50. rentalapplication
51. virtualmeetingschedulesandlinks

### Search & Booking Tables
52. savedsearch
53. visit
54. waitlistsubmission

### ZAT Tables (Business Logic/Features)
55. zat_aisuggestions
56. zat_blocked_vm_bookingtimes
57. zat_email_html_template_eg_sendbasicemailwf_
58. zat_faq
59. zat_features_amenity
60. zat_features_cancellationpolicy
61. zat_features_houserule
62. zat_features_listingtype
63. zat_features_parkingoptions
64. zat_features_storageoptions
65. zat_geo_borough_toplevel
66. zat_geo_hood_mediumlevel
67. zat_goodguestreasons
68. zat_htmlembed
69. zat_location
70. zat_policiesdocuments
71. zat_priceconfiguration
72. zat_splitleaseteam
73. zat_storage
74. zat_successstory

### ZEP Tables (System/Infrastructure)
75. zep_curationparameter
76. zep_twilio
77. zep_twiliocheckin
78. zep_twiliocheckout

### ZFUT Tables (Future/Utilities)
79. zfut_proofofcleaning
80. zfut_safetyfeatures
81. zfut_storagephotos

### Other Tables
82. file
83. num
84. postmark_loginbound
85. pricing_list
86. proxysmssession
87. qrcodes

---

## Option Set Tables EXCLUDED (80 tables starting with os_)

These tables store static option/enum values and should NOT have a pending field:

os_admin_users, os_ai_fields_house_manual, os_ai_fields_listing, os_alert_type,
os_amenity_categories, os_bathrooms, os_bedrooms, os_beds,
os_categories_guest_user_reviews, os_categories_house_manual_reviews,
os_categories_listings_reviews, os_categories_stays_reviews,
os_chatgpt_models, os_check_in_out_times, os_co_host_status,
os_cohost_admins, os_color_palette, os_communication_preference,
os_date_change_request_status, os_days, os_faq_type, os_gender_type,
os_house_manual_audiences, os_ideal_split_preference, os_images,
os_important_errors, os_jingles, os_kitchen_type, os_language,
os_lease_status, os_legal_page_type, os_listing_photo_type, os_logos,
os_melodies, os_messaging_cta, os_modality, os_multi_message_status,
os_name_mapping, os_narrators, os_nights, os_pages, os_personas,
os_photo_evidence_type, os_postmark_webhook, os_price_filter, os_prompts,
os_proposal_status, os_proxy_sms_channels, os_qr_code_use_cases,
os_qty_guests, os_receipt, os_referral_contact_methods, os_reminder_type,
os_rental_type, os_review_guest_questions, os_review_host_questions,
os_review_type, os_room_styles, os_roommates, os_schedule_selection_types,
os_screen_size, os_slack_channels, os_slack_webhooks,
os_sort_by_properties_search, os_space_type, os_split_lease_config,
os_stay_periods, os_stay_status, os_storage_parking_type, os_task_load,
os_twilio_numbers, os_ui_icons, os_us_states, os_user_subtype,
os_user_type, os_video_animations, os_virtual_meeting_times,
os_weekly_selection_options, os_zep_curation_parameters

---

## Column Specification

| Property | Value |
|----------|-------|
| Column Name | pending |
| Data Type | BOOLEAN |
| Default Value | false |
| Nullable | Yes (or NOT NULL if preferred) |
| Index | Optional - Add if frequently queried |

---

## Implementation Strategy

### Option 1: Single Migration (Recommended for Consistency)
Create one migration that adds the pending column to all 91 tables at once using a DO block that iterates through the table list.

### Option 2: Individual Migrations (Better for Tracking)
Create separate migrations for each table category for better rollback granularity.

---

## Migration SQL

See separate SQL file: migration_add_pending_field.sql

---

## Considerations

### 1. Default Value
- DEFAULT false - New records are not pending by default
- Change to DEFAULT true if new records should start as pending

### 2. NOT NULL Constraint
- If NOT NULL is required, ensure default is set
- Current recommendation: Allow NULL for flexibility

### 3. Index Requirement
If you will frequently query WHERE pending = true, add partial indexes.

### 4. RLS Policies
Review if any RLS policies need updating to account for the new pending field.

### 5. Bubble.io Sync Impact
Tables synced from Bubble.io may have sync implications. Verify that:
- The sync process wont overwrite the pending field
- The field is added to sync mappings if needed

---

## Execution Steps

1. Review Plan: Confirm table list and column specification
2. Test on Dev: Run migration on development database first
3. Verify: Check that all columns were added correctly
4. Update Types: Regenerate TypeScript types if using type generation
5. Deploy to Live: Apply migration to production
6. Update Application: Modify application code to use the new field

---

## Verification Query

After running the migration, verify with:

SELECT table_name, column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE column_name = 'pending'
AND table_schema = 'public'
ORDER BY table_name;

Expected result: 91 rows, one for each modified table.

---

## Summary

| Metric | Value |
|--------|-------|
| Total Tables in Database | 171 |
| Tables to Modify | 91 (non-OS tables) |
| Tables Excluded | 80 (OS_ option set tables) |
| Column Specification | pending BOOLEAN DEFAULT false |
| Migration Type | Single DDL migration recommended |

---

Created: 2024-12-04
Status: Ready for Review
