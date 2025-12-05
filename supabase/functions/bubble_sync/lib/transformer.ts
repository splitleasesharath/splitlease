/**
 * Field Transformer for Supabase → Bubble Push Sync
 *
 * Converts Supabase data formats to Bubble-compatible formats.
 * This is the REVERSE of the transformation in bubble_to_supabase_sync.py
 */

/**
 * Field type classifications based on bubble_to_supabase_sync.py
 */
export const FIELD_TYPES = {
    INTEGER_FIELDS: new Set([
        '# of nights available', '.Search Ranking', 'Features - Qty Bathrooms',
        'Features - Qty Bedrooms', 'Features - Qty Beds', 'Features - Qty Guests',
        'Features - SQFT Area', 'Features - SQFT of Room', 'Maximum Months',
        'Maximum Nights', 'Maximum Weeks', 'Metrics - Click Counter',
        'Minimum Months', 'Minimum Nights', 'Minimum Weeks',
        'weeks out to available', '💰Cleaning Cost / Maintenance Fee',
        '💰Damage Deposit', '💰Monthly Host Rate', '💰Price Override',
        '💰Unit Markup'
    ]),

    NUMERIC_FIELDS: new Set([
        'ClicksToViewRatio', 'DesirabilityTimesReceptivity',
        'Standarized Minimum Nightly Price (Filter)',
        '💰Nightly Host Rate for 2 nights', '💰Nightly Host Rate for 3 nights',
        '💰Nightly Host Rate for 4 nights', '💰Nightly Host Rate for 5 nights',
        '💰Nightly Host Rate for 7 nights', '💰Weekly Host Rate',
        'Total Compensation', 'Total Rent', 'Paid to Date from Guest'
    ]),

    BOOLEAN_FIELDS: new Set([
        // Listing table booleans
        'Active', 'Approved', 'Complete', 'Default Extension Setting',
        'Default Listing', 'Features - Trial Periods Allowed', 'Showcase',
        'allow alternating roommates?', 'confirmedAvailability', 'is private?',
        'isForUsability', 'saw chatgpt suggestions?',
        // User table booleans
        'Additional Credits Received', 'Allow Email Change', 'Hide Nights Error',
        'Hide header announcement', 'ID documents submitted?', 'Lead Info Captured',
        'Mobile Notifications On', 'SMS Lock', 'Toggle - Is Admin',
        'Toggle - Is Corporate User', 'Verify - Phone', 'agreed to term and conditions?',
        'has logged in through mobile app', 'is email confirmed', 'is usability tester',
        'override tester?', 'reminder after 15 days sent?', 'show selector popups?',
        'user verified?', 'user_signed_up', 'usernotifyseton'
    ]),

    JSONB_FIELDS: new Set([
        'AI Suggestions List', 'Clickers', 'Dates - Blocked',
        'Days Available (List of Days)', 'Days Not Available', 'Errors',
        'Features - Amenities In-Building', 'Features - Amenities In-Unit',
        'Features - House Rules', 'Features - Photos', 'Features - Safety',
        'Listing Curation', 'Location - Address', 'Location - Hoods (new)',
        'Location - slightly different address', 'Nights Available (List of Nights) ',
        'Nights Available (numbers)', 'Nights Not Available', 'Reviews',
        'Users that favorite', 'Viewers', 'users with permission'
    ]),

    TIMESTAMP_FIELDS: new Set([
        'Created Date', 'Modified Date', 'Operator Last Updated AUT'
    ]),

    // Fields containing day indices that need conversion
    DAY_INDEX_FIELDS: new Set([
        'Days Available (List of Days)', 'Days Not Available',
        'Nights Available (List of Nights) ', 'Nights Not Available',
        'Nights Available (numbers)'
    ]),

    // Fields to exclude from sync (sensitive data)
    EXCLUDED_FIELDS: new Set([
        'password_hash', 'refresh_token', 'access_token',
        'service_role_key', 'api_key'
    ])
};

/**
 * Convert JavaScript day index (0=Sunday) to Bubble day index (1=Sunday)
 * CRITICAL: This is the reverse of adaptDaysFromBubble()
 */
export function adaptDaysToBubble(days: number[]): number[] {
    if (!Array.isArray(days)) return days;
    return days.map(day => {
        const bubbleDay = day + 1;
        // Ensure valid range 1-7
        return Math.max(1, Math.min(7, bubbleDay));
    });
}

/**
 * Convert Bubble day index (1=Sunday) to JavaScript day index (0=Sunday)
 * For reference - this is what the pull script uses
 */
export function adaptDaysFromBubble(days: number[]): number[] {
    if (!Array.isArray(days)) return days;
    return days.map(day => {
        const jsDay = day - 1;
        // Ensure valid range 0-6
        return Math.max(0, Math.min(6, jsDay));
    });
}

/**
 * Parse JSONB field if it's a string
 */
export function parseJsonbField(value: unknown): unknown {
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch {
            // If it's not valid JSON, return as-is
            return value;
        }
    }
    return value;
}

/**
 * Transform a single field value for Bubble
 */
export function transformFieldForBubble(
    key: string,
    value: unknown,
    fieldMapping?: Record<string, string>
): { key: string; value: unknown } {
    // Apply field mapping if provided
    const bubbleKey = fieldMapping?.[key] || key;

    // Skip null/undefined values
    if (value === null || value === undefined) {
        return { key: bubbleKey, value: null };
    }

    // Handle excluded fields
    if (FIELD_TYPES.EXCLUDED_FIELDS.has(key)) {
        return { key: bubbleKey, value: undefined }; // Skip entirely
    }

    // Handle JSONB fields
    if (FIELD_TYPES.JSONB_FIELDS.has(key)) {
        let parsedValue = parseJsonbField(value);

        // If this is a day index field, convert the values
        if (FIELD_TYPES.DAY_INDEX_FIELDS.has(key) && Array.isArray(parsedValue)) {
            parsedValue = adaptDaysToBubble(parsedValue as number[]);
        }

        return { key: bubbleKey, value: parsedValue };
    }

    // Handle boolean fields - Bubble accepts true/false
    if (FIELD_TYPES.BOOLEAN_FIELDS.has(key)) {
        return { key: bubbleKey, value: Boolean(value) };
    }

    // Handle integer fields
    if (FIELD_TYPES.INTEGER_FIELDS.has(key)) {
        if (typeof value === 'number') {
            return { key: bubbleKey, value: Math.round(value) };
        }
        if (typeof value === 'string') {
            const parsed = parseInt(value, 10);
            return { key: bubbleKey, value: isNaN(parsed) ? null : parsed };
        }
        return { key: bubbleKey, value: value };
    }

    // Handle numeric fields
    if (FIELD_TYPES.NUMERIC_FIELDS.has(key)) {
        if (typeof value === 'number') {
            return { key: bubbleKey, value: value };
        }
        if (typeof value === 'string') {
            const parsed = parseFloat(value);
            return { key: bubbleKey, value: isNaN(parsed) ? null : parsed };
        }
        return { key: bubbleKey, value: value };
    }

    // Handle timestamp fields - Bubble expects ISO 8601 strings
    if (FIELD_TYPES.TIMESTAMP_FIELDS.has(key)) {
        if (value instanceof Date) {
            return { key: bubbleKey, value: value.toISOString() };
        }
        return { key: bubbleKey, value: value };
    }

    // Default: return as-is
    return { key: bubbleKey, value: value };
}

/**
 * Transform an entire record for Bubble
 */
export function transformRecordForBubble(
    record: Record<string, unknown>,
    tableName: string,
    fieldMapping?: Record<string, string>,
    excludedFields?: string[]
): Record<string, unknown> {
    const transformed: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(record)) {
        // Skip excluded fields
        if (excludedFields?.includes(key)) {
            continue;
        }

        const { key: bubbleKey, value: bubbleValue } = transformFieldForBubble(
            key,
            value,
            fieldMapping
        );

        // Skip undefined values (explicitly excluded)
        if (bubbleValue !== undefined) {
            transformed[bubbleKey] = bubbleValue;
        }
    }

    console.log(`[Transformer] Transformed ${Object.keys(record).length} fields for table: ${tableName}`);

    return transformed;
}

/**
 * Validate that required fields are present
 */
export function validateRequiredFields(
    record: Record<string, unknown>,
    requiredFields: string[]
): { valid: boolean; missing: string[] } {
    const missing = requiredFields.filter(field =>
        record[field] === null || record[field] === undefined
    );

    return {
        valid: missing.length === 0,
        missing
    };
}
