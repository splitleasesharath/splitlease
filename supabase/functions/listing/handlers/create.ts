/**
 * Listing Creation Handler
 * Split Lease - listing/handlers
 *
 * STANDARDIZED FLOW (Supabase-first with queue-based Bubble sync):
 * 1. Generate Bubble-compatible ID via generate_bubble_id()
 * 2. Create listing in Supabase (source of truth)
 * 3. Queue INSERT to Bubble (Data API) for async processing
 * 4. Return listing data immediately
 *
 * This flow matches the proposal and auth-user patterns for uniformity.
 *
 * NO FALLBACK PRINCIPLE: Supabase insert must succeed, Bubble sync is queued
 *
 * @module listing/handlers/create
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateRequiredFields } from '../../_shared/validation.ts';
import { enqueueBubbleSync, triggerQueueProcessing } from '../../_shared/queueSync.ts';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[listing:create]'
const USER_TABLE = 'user'
const LISTING_TABLE = 'listing'
const DEFAULT_STATUS = 'Draft'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface CreateListingPayload {
    readonly listing_name: string;
    readonly user_email?: string;
}

export interface CreateListingResult {
    readonly _id: string;
    readonly listing_id: string;
    readonly Name: string;
    readonly [key: string]: unknown;
}

interface EnvConfig {
    readonly supabaseUrl: string;
    readonly supabaseServiceKey: string;
}

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if env variables are present
 * @pure
 */
const hasEnvVars = (
    supabaseUrl: string | undefined,
    supabaseServiceKey: string | undefined
): supabaseUrl is string =>
    Boolean(supabaseUrl && supabaseServiceKey)

/**
 * Check if user data exists
 * @pure
 */
const hasUserData = (userData: { _id: string } | null | undefined): userData is { _id: string } =>
    userData !== null && userData !== undefined && Boolean(userData._id)

// ─────────────────────────────────────────────────────────────
// Config Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Get environment configuration
 * @effectful (reads environment variables)
 */
const getEnvConfig = (): EnvConfig => {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!hasEnvVars(supabaseUrl, supabaseServiceKey)) {
        throw new Error('Missing required environment variables')
    }

    return Object.freeze({
        supabaseUrl,
        supabaseServiceKey: supabaseServiceKey!,
    })
}

/**
 * Create Supabase admin client
 * @pure (factory function)
 */
const createSupabaseClient = (config: EnvConfig): SupabaseClient =>
    createClient(config.supabaseUrl, config.supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })

// ─────────────────────────────────────────────────────────────
// Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build initial listing data
 * @pure
 */
const buildListingData = (
    listingId: string,
    listingName: string,
    timestamp: string
): Record<string, unknown> => ({
    _id: listingId,
    Name: listingName.trim(),
    Status: DEFAULT_STATUS,
    Active: false,
    'Created Date': timestamp,
    'Modified Date': timestamp,
})

/**
 * Add user fields to listing data
 * @pure
 */
const addUserFields = (
    listingData: Record<string, unknown>,
    userId: string
): Record<string, unknown> => ({
    ...listingData,
    'Host User': userId,
    'Created By': userId,
})

/**
 * Build success result
 * @pure
 */
const buildSuccessResult = (
    listingId: string,
    listingName: string,
    listingData: Record<string, unknown>
): CreateListingResult =>
    Object.freeze({
        _id: listingId,
        listing_id: listingId,
        Name: listingName.trim(),
        ...listingData
    }) as CreateListingResult

/**
 * Build sync queue item
 * @pure
 */
const buildSyncQueueItem = (
    listingId: string,
    listingData: Record<string, unknown>
): { correlationId: string; items: readonly { sequence: number; table: string; recordId: string; operation: string; payload: Record<string, unknown> }[] } =>
    Object.freeze({
        correlationId: `listing_create:${listingId}`,
        items: Object.freeze([{
            sequence: 1,
            table: LISTING_TABLE,
            recordId: listingId,
            operation: 'INSERT',
            payload: listingData,
        }])
    })

// ─────────────────────────────────────────────────────────────
// Query Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Generate Bubble-compatible listing ID
 * @effectful (database RPC)
 */
async function generateListingId(supabase: SupabaseClient): Promise<string> {
    console.log(`${LOG_PREFIX} Step 1/3: Generating listing ID...`)

    const { data: listingId, error } = await supabase.rpc('generate_bubble_id')

    if (error || !listingId) {
        console.error(`${LOG_PREFIX} ID generation failed:`, error)
        throw new Error('Failed to generate listing ID')
    }

    console.log(`${LOG_PREFIX} ✅ Step 1 complete - Listing ID:`, listingId)
    return listingId
}

/**
 * Lookup user by email
 * @effectful (database query)
 */
async function lookupUserByEmail(
    supabase: SupabaseClient,
    email: string
): Promise<string | undefined> {
    const { data: userData } = await supabase
        .from(USER_TABLE)
        .select('_id')
        .eq('email', email.toLowerCase())
        .single()

    if (hasUserData(userData)) {
        console.log(`${LOG_PREFIX} User found:`, userData._id)
        return userData._id
    }

    return undefined
}

/**
 * Insert listing into Supabase
 * @effectful (database mutation)
 */
async function insertListing(
    supabase: SupabaseClient,
    listingData: Record<string, unknown>
): Promise<void> {
    console.log(`${LOG_PREFIX} Step 2/3: Creating listing in Supabase...`)

    const { error } = await supabase
        .from(LISTING_TABLE)
        .insert(listingData)

    if (error) {
        console.error(`${LOG_PREFIX} Supabase insert failed:`, error)
        throw new Error(`Failed to create listing: ${error.message}`)
    }

    console.log(`${LOG_PREFIX} ✅ Step 2 complete - Listing created in Supabase`)
}

/**
 * Queue Bubble sync (fire-and-forget)
 * @effectful (database mutation, HTTP request)
 */
async function queueBubbleSync(
    supabase: SupabaseClient,
    listingId: string,
    listingData: Record<string, unknown>
): Promise<void> {
    console.log(`${LOG_PREFIX} Step 3/3: Queueing Bubble sync...`)

    try {
        const syncItem = buildSyncQueueItem(listingId, listingData)
        await enqueueBubbleSync(supabase, syncItem)

        console.log(`${LOG_PREFIX} ✅ Step 3 complete - Bubble sync queued`)

        // Trigger queue processing (fire-and-forget)
        triggerQueueProcessing()
    } catch (syncError) {
        // Log but don't fail - sync can be retried via pg_cron
        console.error(`${LOG_PREFIX} ⚠️ Step 3 warning - Queue error (non-blocking):`, syncError)
    }
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle listing creation with Supabase-first pattern
 * Supabase insert must succeed, Bubble sync is queued for async processing
 *
 * @effectful (database mutations, HTTP requests, console logging)
 */
export async function handleCreate(
    payload: Record<string, unknown>
): Promise<CreateListingResult> {
    console.log(`${LOG_PREFIX} ========== CREATE LISTING (SUPABASE-FIRST) ==========`)
    console.log(`${LOG_PREFIX} Payload:`, JSON.stringify(payload, null, 2))

    // Validate required fields
    validateRequiredFields(payload, ['listing_name'])

    const { listing_name, user_email } = payload as CreateListingPayload
    const config = getEnvConfig()
    const supabase = createSupabaseClient(config)

    console.log(`${LOG_PREFIX} Creating listing with name:`, listing_name)
    console.log(`${LOG_PREFIX} User email:`, user_email || 'Not provided (logged out)')

    try {
        // Step 1: Generate ID
        const listingId = await generateListingId(supabase)

        // Step 2: Build and insert listing
        const now = new Date().toISOString()
        let listingData = buildListingData(listingId, listing_name, now)

        // If user_email provided, look up and attach user
        if (user_email) {
            const userId = await lookupUserByEmail(supabase, user_email)
            if (userId) {
                listingData = addUserFields(listingData, userId)
            }
        }

        await insertListing(supabase, listingData)

        // Step 3: Queue Bubble sync
        await queueBubbleSync(supabase, listingId, listingData)

        console.log(`${LOG_PREFIX} ========== SUCCESS ==========`)

        return buildSuccessResult(listingId, listing_name, listingData)

    } catch (error) {
        console.error(`${LOG_PREFIX} ========== ERROR ==========`)
        console.error(`${LOG_PREFIX} Failed to create listing:`, error)
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
    USER_TABLE,
    LISTING_TABLE,
    DEFAULT_STATUS,

    // Predicates
    hasEnvVars,
    hasUserData,

    // Config Helpers
    getEnvConfig,
    createSupabaseClient,

    // Builders
    buildListingData,
    addUserFields,
    buildSuccessResult,
    buildSyncQueueItem,

    // Query Helpers
    generateListingId,
    lookupUserByEmail,
    insertListing,
    queueBubbleSync,
})
