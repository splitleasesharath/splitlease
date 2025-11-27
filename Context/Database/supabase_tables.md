# Supabase Database Tables

Complete list of all tables in the Split Lease Supabase database.

## Table List

| # | Table Name | Row Count |
|---|------------|-----------|
| 1 | _message | 6,244 |
| 2 | account_guest | 652 |
| 3 | account_host | 847 |
| 4 | audit_log | 0 |
| 5 | bookings_leases | 140 |
| 6 | bookings_stays | 17,601 |
| 7 | co_hostrequest | 26 |
| 8 | dailycounter | 205 |
| 9 | datacollection_searchlogging | 1,682 |
| 10 | datechangerequest | 99 |
| 11 | documentssent | 13 |
| 12 | email | 0 |
| 13 | emailtemplate_postmark_ | 15 |
| 14 | emailtemplates_category_postmark_ | 0 |
| 15 | emergencyreports | 34 |
| 16 | experiencesurvey | 2 |
| 17 | external_reviews | 0 |
| 18 | fieldsforleasedocuments | 14 |
| 19 | file | 128 |
| 20 | hostrestrictions | 33 |
| 21 | housemanual | 195 |
| 22 | housemanualphotos | 4 |
| 23 | informationaltexts | 84 |
| 24 | internalfiles | 2 |
| 25 | invoices | 2 |
| 26 | knowledgebase | 56 |
| 27 | knowledgebaselineitem | 272 |
| 28 | listing | 245 |
| 29 | listing_photo | 4,604 |
| 30 | mailing_list_opt_in | 39 |
| 31 | mainreview | 32 |
| 32 | multimessage | 359 |
| 33 | narration | 252 |
| 34 | negotiationsummary | 375 |
| 35 | notification_preferences | 0 |
| 36 | notificationsettingsos_lists_ | 126 |
| 37 | num | 22,611 |
| 38 | occupant | 50 |
| 39 | paymentrecords | 4,015 |
| 40 | paymentsfromdatechanges | 18 |
| 41 | postmark_loginbound | 10 |
| 42 | pricing_list | 528 |
| 43 | proposal | 438 |
| 44 | proposals | 0 |
| 45 | proxysmssession | 22 |
| 46 | qrcodes | 177 |
| 47 | ratingdetail_reviews_ | 93 |
| 48 | referral | 83 |
| 49 | remindersfromhousemanual | 48 |
| 50 | rentalapplication | 224 |
| 51 | reviewslistingsexternal | 22 |
| 52 | savedsearch | 14 |
| 53 | state | 50 |
| 54 | updatestodocuments | 125 |
| 55 | user | 854 |
| 56 | users | 0 |
| 57 | virtual_meetings | 0 |
| 58 | virtualmeetingschedulesandlinks | 377 |
| 59 | visit | 298 |
| 60 | waitlistsubmission | 3 |
| 61 | zat_aisuggestions | 2,323 |
| 62 | zat_blocked_vm_bookingtimes | 0 |
| 63 | zat_email_html_template_eg_sendbasicemailwf_ | 0 |
| 64 | zat_faq | 70 |
| 65 | zat_features_amenity | 61 |
| 66 | zat_features_cancellationpolicy | 4 |
| 67 | zat_features_houserule | 30 |
| 68 | zat_features_listingtype | 4 |
| 69 | zat_features_parkingoptions | 6 |
| 70 | zat_features_storageoptions | 3 |
| 71 | zat_geo_borough_toplevel | 7 |
| 72 | zat_geo_hood_mediumlevel | 293 |
| 73 | zat_goodguestreasons | 12 |
| 74 | zat_htmlembed | 51 |
| 75 | zat_location | 8 |
| 76 | zat_policiesdocuments | 13 |
| 77 | zat_priceconfiguration | 1 |
| 78 | zat_splitleaseteam | 13 |
| 79 | zat_storage | 17 |
| 80 | zat_successstory | 5 |
| 81 | zep_curationparameter | 181 |
| 82 | zep_twilio | 644 |
| 83 | zep_twiliocheckin | 15 |
| 84 | zep_twiliocheckout | 2 |
| 85 | zfut_proofofcleaning | 5 |
| 86 | zfut_safetyfeatures | 6 |
| 87 | zfut_storagephotos | 12 |

## Summary Statistics

- **Total Tables Retrieved**: 87
- **Schema**: public

### Largest Tables (by row count)
| Table | Rows |
|-------|------|
| num | 22,611 |
| bookings_stays | 17,601 |
| _message | 6,244 |
| listing_photo | 4,604 |
| paymentrecords | 4,015 |
| zat_aisuggestions | 2,323 |
| datacollection_searchlogging | 1,682 |

### Empty Tables (0 rows)
- audit_log
- email
- emailtemplates_category_postmark_
- external_reviews
- notification_preferences
- proposals
- users
- virtual_meetings
- zat_blocked_vm_bookingtimes
- zat_email_html_template_eg_sendbasicemailwf_

### Table Naming Conventions
- **zat_** prefix: Static/configuration tables (features, geo data, FAQ, etc.)
- **zep_** prefix: External integrations (Twilio)
- **zfut_** prefix: Future/planned features
