/**
 * Get Listing Handler
 * Split Lease - listing/handlers
 *
 * Fetches listing data from Bubble Data API.
 * Used by self-listing page to preload listing name and other data.
 *
 * @module listing/handlers/get
 */

import { BubbleSyncService } from '../../_shared/bubbleSync.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[listing:get]'
const BUBBLE_TYPE = 'Listing'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface GetListingPayload {
    readonly listing_id: string;
}

interface EnvConfig {
    readonly bubbleBaseUrl: string;
    readonly bubbleApiKey: string;
    readonly supabaseUrl: string;
    readonly supabaseServiceKey: string;
}

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if all env variables are present
 * @pure
 */
const hasAllEnvVars = (
    bubbleBaseUrl: string | undefined,
    bubbleApiKey: string | undefined,
    supabaseUrl: string | undefined,
    supabaseServiceKey: string | undefined
): bubbleBaseUrl is string =>
    Boolean(bubbleBaseUrl && bubbleApiKey && supabaseUrl && supabaseServiceKey)

// ─────────────────────────────────────────────────────────────
// Config Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Get environment configuration
 * @effectful (reads environment variables)
 */
const getEnvConfig = (): EnvConfig => {
    const bubbleBaseUrl = Deno.env.get('BUBBLE_API_BASE_URL')
    const bubbleApiKey = Deno.env.get('BUBBLE_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!hasAllEnvVars(bubbleBaseUrl, bubbleApiKey, supabaseUrl, supabaseServiceKey)) {
        throw new Error('Missing required environment variables')
    }

    return Object.freeze({
        bubbleBaseUrl,
        bubbleApiKey: bubbleApiKey!,
        supabaseUrl: supabaseUrl!,
        supabaseServiceKey: supabaseServiceKey!,
    })
}

/**
 * Create BubbleSyncService instance
 * @pure (factory function)
 */
const createSyncService = (config: EnvConfig): BubbleSyncService =>
    new BubbleSyncService(
        config.bubbleBaseUrl,
        config.bubbleApiKey,
        config.supabaseUrl,
        config.supabaseServiceKey
    )

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle fetching a listing by ID
 * Fetches from Bubble Data API and returns the data
 *
 * @effectful (HTTP request, console logging)
 */
export async function handleGet(
    payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
    console.log(`${LOG_PREFIX} ========== GET LISTING ==========`)
    console.log(`${LOG_PREFIX} Payload:`, JSON.stringify(payload, null, 2))

    // Validate required fields
    validateRequiredFields(payload, ['listing_id'])

    const { listing_id } = payload as GetListingPayload
    const config = getEnvConfig()
    const syncService = createSyncService(config)

    console.log(`${LOG_PREFIX} Fetching listing ID:`, listing_id)

    try {
        const listingData = await syncService.fetchBubbleObject(BUBBLE_TYPE, listing_id)

        console.log(`${LOG_PREFIX} ✅ Listing fetched from Bubble`)
        console.log(`${LOG_PREFIX} Listing Name:`, listingData?.Name)
        console.log(`${LOG_PREFIX} ========== SUCCESS ==========`)

        return listingData

    } catch (error) {
        console.error(`${LOG_PREFIX} ========== ERROR ==========`)
        console.error(`${LOG_PREFIX} Failed to fetch listing:`, error)
        throw error
    }
}

// ─────────────────────────────────────────────────────────────
// Exported Test Constants
// ─────────────────────────────────────────────────────────────

/**
 * Exported for testing purposes
 * @test
 */
export const __test__ = Object.freeze({
    // Constants
    LOG_PREFIX,
    BUBBLE_TYPE,

    // Predicates
    hasAllEnvVars,

    // Config Helpers
    getEnvConfig,
    createSyncService,
})
