/**
 * Table Name Mapping - Supabase ↔ Bubble
 *
 * Supabase uses underscores (snake_case), Bubble uses hyphens or camelCase.
 * This registry provides bidirectional mapping.
 */

/**
 * Complete list of tables from bubble_to_supabase_sync.py
 */
export const TABLE_MAPPING = {
    // Bidirectional mapping: Supabase name → Bubble name
    toBubble: {
        // Core tables
        'user': 'user',
        'listing': 'listing',
        'proposal': 'proposal',

        // Booking tables (hyphenated in Bubble)
        'bookings_stays': 'bookings-stays',
        'bookings_leases': 'bookings-leases',

        // Account tables
        'account_host': 'account_host',
        'account_guest': 'account_guest',

        // Related tables
        'listing_photo': 'listing-photo',
        'paymentrecords': 'paymentrecords',
        '_message': '_message',
        'mainreview': 'mainreview',
        'housemanual': 'housemanual',
        'visit': 'visit',
        'virtualmeetingschedulesandlinks': 'virtualmeetingschedulesandlinks',
        'rentalapplication': 'rentalapplication',

        // Lookup/reference tables (zat_ prefix)
        'zat_geo_borough_toplevel': 'zat_geo_borough_toplevel',
        'zat_geo_hood_mediumlevel': 'zat_geo_hood_mediumlevel',
        'zat_location': 'zat_location',
        'zat_aisuggestions': 'zat_aisuggestions',
        'zat_features_amenities_in_unit': 'zat_features_amenities_in_unit',
        'zat_features_house_rules': 'zat_features_house_rules',

        // Analytics/logging tables
        'datacollection_searchlogging': 'datacollection_searchlogging',

        // Other tables
        'num': 'num',
        'housemanualphotos': 'housemanualphotos',
        'remindersfromhousemanual': 'remindersfromhousemanual',
        'narration': 'narration',
        'ratingdetail_reviews_': 'ratingdetail_reviews_',
        'reviewslistingsexternal': 'reviewslistingsexternal',
    } as Record<string, string>,

    // Reverse mapping: Bubble name → Supabase name
    fromBubble: {
        // Core tables
        'user': 'user',
        'listing': 'listing',
        'proposal': 'proposal',

        // Booking tables
        'bookings-stays': 'bookings_stays',
        'bookings-leases': 'bookings_leases',

        // Account tables
        'account_host': 'account_host',
        'account_guest': 'account_guest',

        // Related tables
        'listing-photo': 'listing_photo',
        'paymentrecords': 'paymentrecords',
        '_message': '_message',
        'mainreview': 'mainreview',
        'housemanual': 'housemanual',
        'visit': 'visit',
        'virtualmeetingschedulesandlinks': 'virtualmeetingschedulesandlinks',
        'rentalapplication': 'rentalapplication',

        // Lookup/reference tables
        'zat_geo_borough_toplevel': 'zat_geo_borough_toplevel',
        'zat_geo_hood_mediumlevel': 'zat_geo_hood_mediumlevel',
        'zat_location': 'zat_location',
        'zat_aisuggestions': 'zat_aisuggestions',
        'zat_features_amenities_in_unit': 'zat_features_amenities_in_unit',
        'zat_features_house_rules': 'zat_features_house_rules',

        // Analytics/logging tables
        'datacollection_searchlogging': 'datacollection_searchlogging',

        // Other tables
        'num': 'num',
        'housemanualphotos': 'housemanualphotos',
        'remindersfromhousemanual': 'remindersfromhousemanual',
        'narration': 'narration',
        'ratingdetail_reviews_': 'ratingdetail_reviews_',
        'reviewslistingsexternal': 'reviewslistingsexternal',
    } as Record<string, string>,
};

/**
 * Get Bubble table name from Supabase table name
 */
export function getBubbleTableName(supabaseTable: string): string {
    const mapped = TABLE_MAPPING.toBubble[supabaseTable];
    if (!mapped) {
        console.warn(`[tableMapping] No mapping found for Supabase table: ${supabaseTable}, using as-is`);
        return supabaseTable;
    }
    return mapped;
}

/**
 * Get Supabase table name from Bubble table name
 */
export function getSupabaseTableName(bubbleTable: string): string {
    const mapped = TABLE_MAPPING.fromBubble[bubbleTable];
    if (!mapped) {
        console.warn(`[tableMapping] No mapping found for Bubble table: ${bubbleTable}, using as-is`);
        // Convert hyphens to underscores as fallback
        return bubbleTable.replace(/-/g, '_');
    }
    return mapped;
}

/**
 * Check if a table is supported for sync
 */
export function isTableSupported(tableName: string): boolean {
    return tableName in TABLE_MAPPING.toBubble || tableName in TABLE_MAPPING.fromBubble;
}

/**
 * Get all supported Supabase table names
 */
export function getSupportedSupabaseTables(): string[] {
    return Object.keys(TABLE_MAPPING.toBubble);
}

/**
 * Get all supported Bubble table names
 */
export function getSupportedBubbleTables(): string[] {
    return Object.keys(TABLE_MAPPING.fromBubble);
}
