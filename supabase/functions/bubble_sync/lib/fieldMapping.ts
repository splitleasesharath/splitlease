/**
 * Field Mapping Registry - Supabase ↔ Bubble
 *
 * Handles field name transformations between Supabase and Bubble.
 *
 * NOTE: The bubble_to_supabase_sync.py script preserves Bubble field names AS-IS
 * in Supabase (including spaces and special characters like emoji).
 * This means most fields don't need transformation - they're already in Bubble format.
 *
 * This registry handles:
 * 1. Fields that ARE different between systems
 * 2. Read-only fields that should never be sent to Bubble
 * 3. Excluded fields for security
 */

/**
 * Fields that are READ-ONLY in Bubble (managed by Bubble)
 * These should NEVER be included in POST/PATCH requests
 */
export const BUBBLE_READ_ONLY_FIELDS = new Set([
    '_id',
    'Created Date',
    'Modified Date',
    'Created By',
    'Modified By',
    '_type',
]);

/**
 * Fields to EXCLUDE from sync (security/internal use only)
 */
export const EXCLUDED_SYNC_FIELDS = new Set([
    // Security-sensitive
    'password_hash',
    'password',
    'refresh_token',
    'access_token',
    'api_key',
    'service_role_key',
    'secret',

    // Internal Supabase fields
    'created_at',       // Supabase timestamp (Bubble has 'Created Date')
    'updated_at',       // Supabase timestamp (Bubble has 'Modified Date')
    'bubble_id',        // Internal sync tracking field
    'sync_status',      // Internal sync status
    'bubble_sync_error', // Internal error tracking

    // Supabase-only listing fields (not in Bubble schema)
    'host_type',        // Supabase-only: host classification
    'market_strategy',  // Supabase-only: listing visibility strategy
    'pending',          // Supabase-only: internal status flag
    '_internal',        // Any internal marker fields
]);

/**
 * Fields that need special transformation when syncing TO Bubble
 * These are cases where Supabase field names differ from Bubble
 */
export const FIELD_MAPPING_TO_BUBBLE: Record<string, Record<string, string>> = {
    // Common patterns across tables
    // Note: Most fields are preserved as-is from Bubble, so minimal mapping needed

    user: {
        // Example mappings if Supabase uses different names
        // 'supabase_field': 'Bubble Field Name',
    },

    listing: {
        // Example: If we had snake_case versions
        // 'features_qty_bedrooms': 'Features - Qty Bedrooms',
    },

    proposal: {
        // Proposal-specific mappings
    },

    // Add table-specific mappings as discovered
};

/**
 * Fields that need special transformation when syncing FROM Bubble
 * (Used during pull operations for reference)
 */
export const FIELD_MAPPING_FROM_BUBBLE: Record<string, Record<string, string>> = {
    // Reverse of TO_BUBBLE mappings
    // Most fields are preserved as-is
};

/**
 * Apply field mapping to transform Supabase data for Bubble
 *
 * @param data - Record from Supabase
 * @param tableName - Name of the table
 * @param customMapping - Optional custom field mapping override
 * @returns Transformed data for Bubble API
 */
export function applyFieldMappingToBubble(
    data: Record<string, unknown>,
    tableName: string,
    customMapping?: Record<string, string>
): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    // Get table-specific mapping
    const tableMapping = FIELD_MAPPING_TO_BUBBLE[tableName] || {};

    // Merge with custom mapping (custom takes precedence)
    const mapping = { ...tableMapping, ...customMapping };

    for (const [key, value] of Object.entries(data)) {
        // Skip read-only fields
        if (BUBBLE_READ_ONLY_FIELDS.has(key)) {
            console.log(`[fieldMapping] Skipping read-only field: ${key}`);
            continue;
        }

        // Skip excluded fields
        if (EXCLUDED_SYNC_FIELDS.has(key)) {
            console.log(`[fieldMapping] Skipping excluded field: ${key}`);
            continue;
        }

        // Skip null/undefined values (Bubble API doesn't like nulls for some fields)
        if (value === null || value === undefined) {
            continue;
        }

        // Apply mapping if exists, otherwise use original key
        const bubbleKey = mapping[key] || key;

        result[bubbleKey] = value;
    }

    console.log(`[fieldMapping] Mapped ${Object.keys(data).length} → ${Object.keys(result).length} fields for ${tableName}`);

    return result;
}

/**
 * Apply field mapping to transform Bubble data for Supabase
 *
 * @param data - Record from Bubble
 * @param tableName - Name of the table
 * @param customMapping - Optional custom field mapping override
 * @returns Transformed data for Supabase
 */
export function applyFieldMappingFromBubble(
    data: Record<string, unknown>,
    tableName: string,
    customMapping?: Record<string, string>
): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    // Get table-specific mapping
    const tableMapping = FIELD_MAPPING_FROM_BUBBLE[tableName] || {};

    // Merge with custom mapping
    const mapping = { ...tableMapping, ...customMapping };

    for (const [key, value] of Object.entries(data)) {
        // Apply mapping if exists, otherwise use original key
        const supabaseKey = mapping[key] || key;
        result[supabaseKey] = value;
    }

    return result;
}

/**
 * Get the list of fields that should be excluded when syncing a table
 */
export function getExcludedFields(tableName: string): string[] {
    const excluded = [...EXCLUDED_SYNC_FIELDS, ...BUBBLE_READ_ONLY_FIELDS];

    // Add table-specific exclusions if any
    // (can be extended based on business logic)

    return excluded;
}

/**
 * Validate that required fields are present for Bubble
 */
export function validateRequiredFieldsForBubble(
    data: Record<string, unknown>,
    tableName: string,
    requiredFields: string[]
): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    for (const field of requiredFields) {
        if (!(field in data) || data[field] === null || data[field] === undefined) {
            missing.push(field);
        }
    }

    return {
        valid: missing.length === 0,
        missing,
    };
}

/**
 * Generate a dynamic field mapping from Supabase column names
 * Useful for auto-generating mappings
 */
export function inferBubbleFieldName(supabaseField: string): string {
    // Most Bubble fields are preserved as-is in Supabase
    // This function handles cases where we need to infer

    // If it looks like snake_case, try to convert
    if (supabaseField.includes('_') && !supabaseField.includes(' ')) {
        // Could be snake_case - check if it's a known pattern
        // For now, return as-is since most fields are already in Bubble format
    }

    return supabaseField;
}

/**
 * Build a complete field mapping for a table based on actual data
 * This is useful for generating mappings from sample records
 */
export function buildFieldMappingFromSample(
    supabaseSample: Record<string, unknown>,
    bubbleSample: Record<string, unknown>
): { toBubble: Record<string, string>; fromBubble: Record<string, string> } {
    const toBubble: Record<string, string> = {};
    const fromBubble: Record<string, string> = {};

    // Find matching fields by value comparison (crude but effective)
    // This is a development helper, not for production use

    for (const [sKey, sValue] of Object.entries(supabaseSample)) {
        for (const [bKey, bValue] of Object.entries(bubbleSample)) {
            if (JSON.stringify(sValue) === JSON.stringify(bValue) && sKey !== bKey) {
                toBubble[sKey] = bKey;
                fromBubble[bKey] = sKey;
            }
        }
    }

    return { toBubble, fromBubble };
}
