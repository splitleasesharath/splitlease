-- Migration: add_pending_field_to_all_tables
-- Description: Adds a boolean 'pending' column with default false to all non-OS tables
-- Created: 2024-12-04

DO $$
DECLARE
    tbl TEXT;
    tables_to_update TEXT[] := ARRAY[
        '_message', 'account_guest', 'account_host', 'bookings_leases',
        'bookings_stays', 'co_hostrequest', 'dailycounter',
        'datacollection_searchlogging', 'datechangerequest', 'documentssent',
        'email', 'emailtemplate_postmark_', 'emailtemplates_category_postmark_',
        'emergencyreports', 'experiencesurvey', 'fieldsforleasedocuments',
        'file', 'hostrestrictions', 'housemanual', 'housemanualphotos',
        'informationaltexts', 'internalfiles', 'invoices', 'knowledgebase',
        'knowledgebaselineitem', 'listing', 'listing_photo', 'listing_trial',
        'mailing_list_opt_in', 'mainreview', 'multimessage', 'narration',
        'negotiationsummary', 'notification_preferences',
        'notificationsettingsos_lists_', 'num', 'occupant', 'paymentrecords',
        'paymentsfromdatechanges', 'postmark_loginbound', 'pricing_list',
        'proposal', 'proposals', 'proxysmssession', 'qrcodes',
        'ratingdetail_reviews_', 'referral', 'remindersfromhousemanual',
        'rentalapplication', 'reviewslistingsexternal', 'savedsearch', 'state',
        'stay_periods', 'updatestodocuments', 'user',
        'virtualmeetingschedulesandlinks', 'visit', 'waitlistsubmission',
        'zat_aisuggestions', 'zat_blocked_vm_bookingtimes',
        'zat_email_html_template_eg_sendbasicemailwf_', 'zat_faq',
        'zat_features_amenity', 'zat_features_cancellationpolicy',
        'zat_features_houserule', 'zat_features_listingtype',
        'zat_features_parkingoptions', 'zat_features_storageoptions',
        'zat_geo_borough_toplevel', 'zat_geo_hood_mediumlevel',
        'zat_goodguestreasons', 'zat_htmlembed', 'zat_location',
        'zat_policiesdocuments', 'zat_priceconfiguration', 'zat_splitleaseteam',
        'zat_storage', 'zat_successstory', 'zep_curationparameter', 'zep_twilio',
        'zep_twiliocheckin', 'zep_twiliocheckout', 'zfut_proofofcleaning',
        'zfut_safetyfeatures', 'zfut_storagephotos', 'audit_log',
        'external_reviews'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables_to_update
    LOOP
        -- Check if column already exists before adding
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = tbl
            AND column_name = 'pending'
        ) THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN pending BOOLEAN DEFAULT false', tbl);
            RAISE NOTICE 'Added pending column to %', tbl;
        ELSE
            RAISE NOTICE 'Column pending already exists in %', tbl;
        END IF;
    END LOOP;
END $$;
