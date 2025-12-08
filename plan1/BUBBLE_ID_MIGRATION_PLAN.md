# Bubble ID Migration Plan

## Overview

Add a `bubble_<table_name>_id` column to all Bubble-synced tables and copy the `_id` value to this new field. This provides a stable reference ID that remains consistent even if the primary key structure changes in the future.

## Tables to Migrate (62 tables with `_id` column)

| # | Table Name | New Column Name | Row Count |
|---|------------|-----------------|-----------|
| 1 | `_message` | `bubble_message_id` | ~6,244 |
| 2 | `account_guest` | `bubble_account_guest_id` | ~652 |
| 3 | `account_host` | `bubble_account_host_id` | ~847 |
| 4 | `bookings_leases` | `bubble_bookings_leases_id` | ~156 |
| 5 | `bookings_stays` | `bubble_bookings_stays_id` | ~17,601 |
| 6 | `co_hostrequest` | `bubble_co_hostrequest_id` | ~26 |
| 7 | `dailycounter` | `bubble_dailycounter_id` | ~205 |
| 8 | `datacollection_searchlogging` | `bubble_datacollection_searchlogging_id` | ~1,682 |
| 9 | `datechangerequest` | `bubble_datechangerequest_id` | ~99 |
| 10 | `documentssent` | `bubble_documentssent_id` | ~13 |
| 11 | `email` | `bubble_email_id` | ~0 |
| 12 | `emailtemplate_postmark_` | `bubble_emailtemplate_postmark_id` | ~15 |
| 13 | `emailtemplates_category_postmark_` | `bubble_emailtemplates_category_postmark_id` | ~0 |
| 14 | `emergencyreports` | `bubble_emergencyreports_id` | ~34 |
| 15 | `experiencesurvey` | `bubble_experiencesurvey_id` | ~2 |
| 16 | `fieldsforleasedocuments` | `bubble_fieldsforleasedocuments_id` | ~14 |
| 17 | `file` | `bubble_file_id` | ~128 |
| 18 | `hostrestrictions` | `bubble_hostrestrictions_id` | ~33 |
| 19 | `housemanual` | `bubble_housemanual_id` | ~195 |
| 20 | `housemanualphotos` | `bubble_housemanualphotos_id` | ~4 |
| 21 | `informationaltexts` | `bubble_informationaltexts_id` | ~84 |
| 22 | `internalfiles` | `bubble_internalfiles_id` | ~2 |
| 23 | `invoices` | `bubble_invoices_id` | ~2 |
| 24 | `knowledgebase` | `bubble_knowledgebase_id` | ~56 |
| 25 | `knowledgebaselineitem` | `bubble_knowledgebaselineitem_id` | ~272 |
| 26 | `listing` | `bubble_listing_id` | ~265 |
| 27 | `listing_photo` | `bubble_listing_photo_id` | ~4,604 |
| 28 | `listing_trial` | `bubble_listing_trial_id` | TBD |
| 29 | `mailing_list_opt_in` | `bubble_mailing_list_opt_in_id` | ~39 |
| 30 | `mainreview` | `bubble_mainreview_id` | ~32 |
| 31 | `multimessage` | `bubble_multimessage_id` | ~359 |
| 32 | `narration` | `bubble_narration_id` | ~252 |
| 33 | `negotiationsummary` | `bubble_negotiationsummary_id` | ~375 |
| 34 | `notificationsettingsos_lists_` | `bubble_notificationsettingsos_lists_id` | ~126 |
| 35 | `num` | `bubble_num_id` | ~22,973 |
| 36 | `occupant` | `bubble_occupant_id` | ~50 |
| 37 | `paymentrecords` | `bubble_paymentrecords_id` | ~4,015 |
| 38 | `paymentsfromdatechanges` | `bubble_paymentsfromdatechanges_id` | TBD |
| 39 | `postmark_loginbound` | `bubble_postmark_loginbound_id` | TBD |
| 40 | `pricing_list` | `bubble_pricing_list_id` | TBD |
| 41 | `proposal` | `bubble_proposal_id` | TBD |
| 42 | `proxysmssession` | `bubble_proxysmssession_id` | TBD |
| 43 | `qrcodes` | `bubble_qrcodes_id` | TBD |
| 44 | `ratingdetail_reviews_` | `bubble_ratingdetail_reviews_id` | TBD |
| 45 | `referral` | `bubble_referral_id` | TBD |
| 46 | `remindersfromhousemanual` | `bubble_remindersfromhousemanual_id` | TBD |
| 47 | `rentalapplication` | `bubble_rentalapplication_id` | TBD |
| 48 | `reviewslistingsexternal` | `bubble_reviewslistingsexternal_id` | TBD |
| 49 | `savedsearch` | `bubble_savedsearch_id` | TBD |
| 50 | `state` | `bubble_state_id` | TBD |
| 51 | `updatestodocuments` | `bubble_updatestodocuments_id` | TBD |
| 52 | `user` | `bubble_user_id` | ~881 ✅ **DONE** |
| 53 | `virtualmeetingschedulesandlinks` | `bubble_virtualmeetingschedulesandlinks_id` | TBD |
| 54 | `visit` | `bubble_visit_id` | TBD |
| 55 | `waitlistsubmission` | `bubble_waitlistsubmission_id` | TBD |
| 56 | `zep_curationparameter` | `bubble_zep_curationparameter_id` | TBD |
| 57 | `zep_twilio` | `bubble_zep_twilio_id` | TBD |
| 58 | `zep_twiliocheckin` | `bubble_zep_twiliocheckin_id` | TBD |
| 59 | `zep_twiliocheckout` | `bubble_zep_twiliocheckout_id` | TBD |
| 60 | `zfut_proofofcleaning` | `bubble_zfut_proofofcleaning_id` | TBD |
| 61 | `zfut_safetyfeatures` | `bubble_zfut_safetyfeatures_id` | TBD |
| 62 | `zfut_storagephotos` | `bubble_zfut_storagephotos_id` | TBD |

## Excluded Tables

### Tables without `_id` column (not Bubble-synced):
- `external_reviews` - Native Supabase table
- `notification_preferences` - Native Supabase table
- `proposals` - Native Supabase table

### Reference/Option Set tables (`os_*` prefix):
- These are static lookup tables that don't need Bubble ID tracking

### System tables:
- `audit_log` - Internal logging table

### Geographic reference tables (`zat_*` prefix):
- These are static geographic reference data

---

## Migration Strategy

### Option A: Single Migration (Recommended for Production)

Run a single migration that adds all columns and populates them in one transaction.

**Pros:**
- Atomic operation - all or nothing
- Single migration to track
- Cleaner migration history

**Cons:**
- Longer lock time on tables
- If one table fails, all rollback

### Option B: Batch Migrations

Run separate migrations for each table or groups of tables.

**Pros:**
- Smaller transactions
- Easier to debug failures
- Can pause/resume

**Cons:**
- Many migrations to track
- Inconsistent state during migration

---

## Implementation

### Single Migration SQL

```sql
-- Migration: add_bubble_id_columns
-- Description: Add bubble_<table>_id columns to all Bubble-synced tables

-- 1. _message
ALTER TABLE "_message" ADD COLUMN IF NOT EXISTS "bubble_message_id" TEXT UNIQUE;
UPDATE "_message" SET "bubble_message_id" = "_id" WHERE "bubble_message_id" IS NULL;

-- 2. account_guest
ALTER TABLE "account_guest" ADD COLUMN IF NOT EXISTS "bubble_account_guest_id" TEXT UNIQUE;
UPDATE "account_guest" SET "bubble_account_guest_id" = "_id" WHERE "bubble_account_guest_id" IS NULL;

-- 3. account_host
ALTER TABLE "account_host" ADD COLUMN IF NOT EXISTS "bubble_account_host_id" TEXT UNIQUE;
UPDATE "account_host" SET "bubble_account_host_id" = "_id" WHERE "bubble_account_host_id" IS NULL;

-- 4. bookings_leases
ALTER TABLE "bookings_leases" ADD COLUMN IF NOT EXISTS "bubble_bookings_leases_id" TEXT UNIQUE;
UPDATE "bookings_leases" SET "bubble_bookings_leases_id" = "_id" WHERE "bubble_bookings_leases_id" IS NULL;

-- 5. bookings_stays
ALTER TABLE "bookings_stays" ADD COLUMN IF NOT EXISTS "bubble_bookings_stays_id" TEXT UNIQUE;
UPDATE "bookings_stays" SET "bubble_bookings_stays_id" = "_id" WHERE "bubble_bookings_stays_id" IS NULL;

-- 6. co_hostrequest
ALTER TABLE "co_hostrequest" ADD COLUMN IF NOT EXISTS "bubble_co_hostrequest_id" TEXT UNIQUE;
UPDATE "co_hostrequest" SET "bubble_co_hostrequest_id" = "_id" WHERE "bubble_co_hostrequest_id" IS NULL;

-- 7. dailycounter
ALTER TABLE "dailycounter" ADD COLUMN IF NOT EXISTS "bubble_dailycounter_id" TEXT UNIQUE;
UPDATE "dailycounter" SET "bubble_dailycounter_id" = "_id" WHERE "bubble_dailycounter_id" IS NULL;

-- 8. datacollection_searchlogging
ALTER TABLE "datacollection_searchlogging" ADD COLUMN IF NOT EXISTS "bubble_datacollection_searchlogging_id" TEXT UNIQUE;
UPDATE "datacollection_searchlogging" SET "bubble_datacollection_searchlogging_id" = "_id" WHERE "bubble_datacollection_searchlogging_id" IS NULL;

-- 9. datechangerequest
ALTER TABLE "datechangerequest" ADD COLUMN IF NOT EXISTS "bubble_datechangerequest_id" TEXT UNIQUE;
UPDATE "datechangerequest" SET "bubble_datechangerequest_id" = "_id" WHERE "bubble_datechangerequest_id" IS NULL;

-- 10. documentssent
ALTER TABLE "documentssent" ADD COLUMN IF NOT EXISTS "bubble_documentssent_id" TEXT UNIQUE;
UPDATE "documentssent" SET "bubble_documentssent_id" = "_id" WHERE "bubble_documentssent_id" IS NULL;

-- 11. email
ALTER TABLE "email" ADD COLUMN IF NOT EXISTS "bubble_email_id" TEXT UNIQUE;
UPDATE "email" SET "bubble_email_id" = "_id" WHERE "bubble_email_id" IS NULL;

-- 12. emailtemplate_postmark_
ALTER TABLE "emailtemplate_postmark_" ADD COLUMN IF NOT EXISTS "bubble_emailtemplate_postmark_id" TEXT UNIQUE;
UPDATE "emailtemplate_postmark_" SET "bubble_emailtemplate_postmark_id" = "_id" WHERE "bubble_emailtemplate_postmark_id" IS NULL;

-- 13. emailtemplates_category_postmark_
ALTER TABLE "emailtemplates_category_postmark_" ADD COLUMN IF NOT EXISTS "bubble_emailtemplates_category_postmark_id" TEXT UNIQUE;
UPDATE "emailtemplates_category_postmark_" SET "bubble_emailtemplates_category_postmark_id" = "_id" WHERE "bubble_emailtemplates_category_postmark_id" IS NULL;

-- 14. emergencyreports
ALTER TABLE "emergencyreports" ADD COLUMN IF NOT EXISTS "bubble_emergencyreports_id" TEXT UNIQUE;
UPDATE "emergencyreports" SET "bubble_emergencyreports_id" = "_id" WHERE "bubble_emergencyreports_id" IS NULL;

-- 15. experiencesurvey
ALTER TABLE "experiencesurvey" ADD COLUMN IF NOT EXISTS "bubble_experiencesurvey_id" TEXT UNIQUE;
UPDATE "experiencesurvey" SET "bubble_experiencesurvey_id" = "_id" WHERE "bubble_experiencesurvey_id" IS NULL;

-- 16. fieldsforleasedocuments
ALTER TABLE "fieldsforleasedocuments" ADD COLUMN IF NOT EXISTS "bubble_fieldsforleasedocuments_id" TEXT UNIQUE;
UPDATE "fieldsforleasedocuments" SET "bubble_fieldsforleasedocuments_id" = "_id" WHERE "bubble_fieldsforleasedocuments_id" IS NULL;

-- 17. file
ALTER TABLE "file" ADD COLUMN IF NOT EXISTS "bubble_file_id" TEXT UNIQUE;
UPDATE "file" SET "bubble_file_id" = "_id" WHERE "bubble_file_id" IS NULL;

-- 18. hostrestrictions
ALTER TABLE "hostrestrictions" ADD COLUMN IF NOT EXISTS "bubble_hostrestrictions_id" TEXT UNIQUE;
UPDATE "hostrestrictions" SET "bubble_hostrestrictions_id" = "_id" WHERE "bubble_hostrestrictions_id" IS NULL;

-- 19. housemanual
ALTER TABLE "housemanual" ADD COLUMN IF NOT EXISTS "bubble_housemanual_id" TEXT UNIQUE;
UPDATE "housemanual" SET "bubble_housemanual_id" = "_id" WHERE "bubble_housemanual_id" IS NULL;

-- 20. housemanualphotos
ALTER TABLE "housemanualphotos" ADD COLUMN IF NOT EXISTS "bubble_housemanualphotos_id" TEXT UNIQUE;
UPDATE "housemanualphotos" SET "bubble_housemanualphotos_id" = "_id" WHERE "bubble_housemanualphotos_id" IS NULL;

-- 21. informationaltexts
ALTER TABLE "informationaltexts" ADD COLUMN IF NOT EXISTS "bubble_informationaltexts_id" TEXT UNIQUE;
UPDATE "informationaltexts" SET "bubble_informationaltexts_id" = "_id" WHERE "bubble_informationaltexts_id" IS NULL;

-- 22. internalfiles
ALTER TABLE "internalfiles" ADD COLUMN IF NOT EXISTS "bubble_internalfiles_id" TEXT UNIQUE;
UPDATE "internalfiles" SET "bubble_internalfiles_id" = "_id" WHERE "bubble_internalfiles_id" IS NULL;

-- 23. invoices
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "bubble_invoices_id" TEXT UNIQUE;
UPDATE "invoices" SET "bubble_invoices_id" = "_id" WHERE "bubble_invoices_id" IS NULL;

-- 24. knowledgebase
ALTER TABLE "knowledgebase" ADD COLUMN IF NOT EXISTS "bubble_knowledgebase_id" TEXT UNIQUE;
UPDATE "knowledgebase" SET "bubble_knowledgebase_id" = "_id" WHERE "bubble_knowledgebase_id" IS NULL;

-- 25. knowledgebaselineitem
ALTER TABLE "knowledgebaselineitem" ADD COLUMN IF NOT EXISTS "bubble_knowledgebaselineitem_id" TEXT UNIQUE;
UPDATE "knowledgebaselineitem" SET "bubble_knowledgebaselineitem_id" = "_id" WHERE "bubble_knowledgebaselineitem_id" IS NULL;

-- 26. listing
ALTER TABLE "listing" ADD COLUMN IF NOT EXISTS "bubble_listing_id" TEXT UNIQUE;
UPDATE "listing" SET "bubble_listing_id" = "_id" WHERE "bubble_listing_id" IS NULL;

-- 27. listing_photo
ALTER TABLE "listing_photo" ADD COLUMN IF NOT EXISTS "bubble_listing_photo_id" TEXT UNIQUE;
UPDATE "listing_photo" SET "bubble_listing_photo_id" = "_id" WHERE "bubble_listing_photo_id" IS NULL;

-- 28. listing_trial
ALTER TABLE "listing_trial" ADD COLUMN IF NOT EXISTS "bubble_listing_trial_id" TEXT UNIQUE;
UPDATE "listing_trial" SET "bubble_listing_trial_id" = "_id" WHERE "bubble_listing_trial_id" IS NULL;

-- 29. mailing_list_opt_in
ALTER TABLE "mailing_list_opt_in" ADD COLUMN IF NOT EXISTS "bubble_mailing_list_opt_in_id" TEXT UNIQUE;
UPDATE "mailing_list_opt_in" SET "bubble_mailing_list_opt_in_id" = "_id" WHERE "bubble_mailing_list_opt_in_id" IS NULL;

-- 30. mainreview
ALTER TABLE "mainreview" ADD COLUMN IF NOT EXISTS "bubble_mainreview_id" TEXT UNIQUE;
UPDATE "mainreview" SET "bubble_mainreview_id" = "_id" WHERE "bubble_mainreview_id" IS NULL;

-- 31. multimessage
ALTER TABLE "multimessage" ADD COLUMN IF NOT EXISTS "bubble_multimessage_id" TEXT UNIQUE;
UPDATE "multimessage" SET "bubble_multimessage_id" = "_id" WHERE "bubble_multimessage_id" IS NULL;

-- 32. narration
ALTER TABLE "narration" ADD COLUMN IF NOT EXISTS "bubble_narration_id" TEXT UNIQUE;
UPDATE "narration" SET "bubble_narration_id" = "_id" WHERE "bubble_narration_id" IS NULL;

-- 33. negotiationsummary
ALTER TABLE "negotiationsummary" ADD COLUMN IF NOT EXISTS "bubble_negotiationsummary_id" TEXT UNIQUE;
UPDATE "negotiationsummary" SET "bubble_negotiationsummary_id" = "_id" WHERE "bubble_negotiationsummary_id" IS NULL;

-- 34. notificationsettingsos_lists_
ALTER TABLE "notificationsettingsos_lists_" ADD COLUMN IF NOT EXISTS "bubble_notificationsettingsos_lists_id" TEXT UNIQUE;
UPDATE "notificationsettingsos_lists_" SET "bubble_notificationsettingsos_lists_id" = "_id" WHERE "bubble_notificationsettingsos_lists_id" IS NULL;

-- 35. num
ALTER TABLE "num" ADD COLUMN IF NOT EXISTS "bubble_num_id" TEXT UNIQUE;
UPDATE "num" SET "bubble_num_id" = "_id" WHERE "bubble_num_id" IS NULL;

-- 36. occupant
ALTER TABLE "occupant" ADD COLUMN IF NOT EXISTS "bubble_occupant_id" TEXT UNIQUE;
UPDATE "occupant" SET "bubble_occupant_id" = "_id" WHERE "bubble_occupant_id" IS NULL;

-- 37. paymentrecords
ALTER TABLE "paymentrecords" ADD COLUMN IF NOT EXISTS "bubble_paymentrecords_id" TEXT UNIQUE;
UPDATE "paymentrecords" SET "bubble_paymentrecords_id" = "_id" WHERE "bubble_paymentrecords_id" IS NULL;

-- 38. paymentsfromdatechanges
ALTER TABLE "paymentsfromdatechanges" ADD COLUMN IF NOT EXISTS "bubble_paymentsfromdatechanges_id" TEXT UNIQUE;
UPDATE "paymentsfromdatechanges" SET "bubble_paymentsfromdatechanges_id" = "_id" WHERE "bubble_paymentsfromdatechanges_id" IS NULL;

-- 39. postmark_loginbound
ALTER TABLE "postmark_loginbound" ADD COLUMN IF NOT EXISTS "bubble_postmark_loginbound_id" TEXT UNIQUE;
UPDATE "postmark_loginbound" SET "bubble_postmark_loginbound_id" = "_id" WHERE "bubble_postmark_loginbound_id" IS NULL;

-- 40. pricing_list
ALTER TABLE "pricing_list" ADD COLUMN IF NOT EXISTS "bubble_pricing_list_id" TEXT UNIQUE;
UPDATE "pricing_list" SET "bubble_pricing_list_id" = "_id" WHERE "bubble_pricing_list_id" IS NULL;

-- 41. proposal
ALTER TABLE "proposal" ADD COLUMN IF NOT EXISTS "bubble_proposal_id" TEXT UNIQUE;
UPDATE "proposal" SET "bubble_proposal_id" = "_id" WHERE "bubble_proposal_id" IS NULL;

-- 42. proxysmssession
ALTER TABLE "proxysmssession" ADD COLUMN IF NOT EXISTS "bubble_proxysmssession_id" TEXT UNIQUE;
UPDATE "proxysmssession" SET "bubble_proxysmssession_id" = "_id" WHERE "bubble_proxysmssession_id" IS NULL;

-- 43. qrcodes
ALTER TABLE "qrcodes" ADD COLUMN IF NOT EXISTS "bubble_qrcodes_id" TEXT UNIQUE;
UPDATE "qrcodes" SET "bubble_qrcodes_id" = "_id" WHERE "bubble_qrcodes_id" IS NULL;

-- 44. ratingdetail_reviews_
ALTER TABLE "ratingdetail_reviews_" ADD COLUMN IF NOT EXISTS "bubble_ratingdetail_reviews_id" TEXT UNIQUE;
UPDATE "ratingdetail_reviews_" SET "bubble_ratingdetail_reviews_id" = "_id" WHERE "bubble_ratingdetail_reviews_id" IS NULL;

-- 45. referral
ALTER TABLE "referral" ADD COLUMN IF NOT EXISTS "bubble_referral_id" TEXT UNIQUE;
UPDATE "referral" SET "bubble_referral_id" = "_id" WHERE "bubble_referral_id" IS NULL;

-- 46. remindersfromhousemanual
ALTER TABLE "remindersfromhousemanual" ADD COLUMN IF NOT EXISTS "bubble_remindersfromhousemanual_id" TEXT UNIQUE;
UPDATE "remindersfromhousemanual" SET "bubble_remindersfromhousemanual_id" = "_id" WHERE "bubble_remindersfromhousemanual_id" IS NULL;

-- 47. rentalapplication
ALTER TABLE "rentalapplication" ADD COLUMN IF NOT EXISTS "bubble_rentalapplication_id" TEXT UNIQUE;
UPDATE "rentalapplication" SET "bubble_rentalapplication_id" = "_id" WHERE "bubble_rentalapplication_id" IS NULL;

-- 48. reviewslistingsexternal
ALTER TABLE "reviewslistingsexternal" ADD COLUMN IF NOT EXISTS "bubble_reviewslistingsexternal_id" TEXT UNIQUE;
UPDATE "reviewslistingsexternal" SET "bubble_reviewslistingsexternal_id" = "_id" WHERE "bubble_reviewslistingsexternal_id" IS NULL;

-- 49. savedsearch
ALTER TABLE "savedsearch" ADD COLUMN IF NOT EXISTS "bubble_savedsearch_id" TEXT UNIQUE;
UPDATE "savedsearch" SET "bubble_savedsearch_id" = "_id" WHERE "bubble_savedsearch_id" IS NULL;

-- 50. state
ALTER TABLE "state" ADD COLUMN IF NOT EXISTS "bubble_state_id" TEXT UNIQUE;
UPDATE "state" SET "bubble_state_id" = "_id" WHERE "bubble_state_id" IS NULL;

-- 51. updatestodocuments
ALTER TABLE "updatestodocuments" ADD COLUMN IF NOT EXISTS "bubble_updatestodocuments_id" TEXT UNIQUE;
UPDATE "updatestodocuments" SET "bubble_updatestodocuments_id" = "_id" WHERE "bubble_updatestodocuments_id" IS NULL;

-- 52. user (ALREADY DONE)
-- ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "bubble_user_id" TEXT UNIQUE;
-- UPDATE "user" SET "bubble_user_id" = "_id" WHERE "bubble_user_id" IS NULL;

-- 53. virtualmeetingschedulesandlinks
ALTER TABLE "virtualmeetingschedulesandlinks" ADD COLUMN IF NOT EXISTS "bubble_virtualmeetingschedulesandlinks_id" TEXT UNIQUE;
UPDATE "virtualmeetingschedulesandlinks" SET "bubble_virtualmeetingschedulesandlinks_id" = "_id" WHERE "bubble_virtualmeetingschedulesandlinks_id" IS NULL;

-- 54. visit
ALTER TABLE "visit" ADD COLUMN IF NOT EXISTS "bubble_visit_id" TEXT UNIQUE;
UPDATE "visit" SET "bubble_visit_id" = "_id" WHERE "bubble_visit_id" IS NULL;

-- 55. waitlistsubmission
ALTER TABLE "waitlistsubmission" ADD COLUMN IF NOT EXISTS "bubble_waitlistsubmission_id" TEXT UNIQUE;
UPDATE "waitlistsubmission" SET "bubble_waitlistsubmission_id" = "_id" WHERE "bubble_waitlistsubmission_id" IS NULL;

-- 56. zep_curationparameter
ALTER TABLE "zep_curationparameter" ADD COLUMN IF NOT EXISTS "bubble_zep_curationparameter_id" TEXT UNIQUE;
UPDATE "zep_curationparameter" SET "bubble_zep_curationparameter_id" = "_id" WHERE "bubble_zep_curationparameter_id" IS NULL;

-- 57. zep_twilio
ALTER TABLE "zep_twilio" ADD COLUMN IF NOT EXISTS "bubble_zep_twilio_id" TEXT UNIQUE;
UPDATE "zep_twilio" SET "bubble_zep_twilio_id" = "_id" WHERE "bubble_zep_twilio_id" IS NULL;

-- 58. zep_twiliocheckin
ALTER TABLE "zep_twiliocheckin" ADD COLUMN IF NOT EXISTS "bubble_zep_twiliocheckin_id" TEXT UNIQUE;
UPDATE "zep_twiliocheckin" SET "bubble_zep_twiliocheckin_id" = "_id" WHERE "bubble_zep_twiliocheckin_id" IS NULL;

-- 59. zep_twiliocheckout
ALTER TABLE "zep_twiliocheckout" ADD COLUMN IF NOT EXISTS "bubble_zep_twiliocheckout_id" TEXT UNIQUE;
UPDATE "zep_twiliocheckout" SET "bubble_zep_twiliocheckout_id" = "_id" WHERE "bubble_zep_twiliocheckout_id" IS NULL;

-- 60. zfut_proofofcleaning
ALTER TABLE "zfut_proofofcleaning" ADD COLUMN IF NOT EXISTS "bubble_zfut_proofofcleaning_id" TEXT UNIQUE;
UPDATE "zfut_proofofcleaning" SET "bubble_zfut_proofofcleaning_id" = "_id" WHERE "bubble_zfut_proofofcleaning_id" IS NULL;

-- 61. zfut_safetyfeatures
ALTER TABLE "zfut_safetyfeatures" ADD COLUMN IF NOT EXISTS "bubble_zfut_safetyfeatures_id" TEXT UNIQUE;
UPDATE "zfut_safetyfeatures" SET "bubble_zfut_safetyfeatures_id" = "_id" WHERE "bubble_zfut_safetyfeatures_id" IS NULL;

-- 62. zfut_storagephotos
ALTER TABLE "zfut_storagephotos" ADD COLUMN IF NOT EXISTS "bubble_zfut_storagephotos_id" TEXT UNIQUE;
UPDATE "zfut_storagephotos" SET "bubble_zfut_storagephotos_id" = "_id" WHERE "bubble_zfut_storagephotos_id" IS NULL;
```

---

## Verification Query

After running the migration, verify all columns were created and populated:

```sql
SELECT
  table_name,
  column_name,
  (SELECT COUNT(*) FROM information_schema.tables t2
   WHERE t2.table_name = c.table_name AND t2.table_schema = 'public') as table_exists
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.column_name LIKE 'bubble_%_id'
ORDER BY c.table_name;
```

---

## Rollback Plan

If needed, columns can be dropped:

```sql
ALTER TABLE "table_name" DROP COLUMN IF EXISTS "bubble_<table>_id";
```

---

## Notes

1. **`user` table is already done** - `bubble_user_id` column exists and is populated
2. All new columns are `TEXT` type with `UNIQUE` constraint to match the `_id` format
3. The `IF NOT EXISTS` clause prevents errors if columns already exist
4. The `WHERE ... IS NULL` clause prevents overwriting existing values

---

## Status

- [x] `user` - COMPLETED
- [ ] All other tables - PENDING

**Last Updated:** 2024-12-05
