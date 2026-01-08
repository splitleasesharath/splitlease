/**
 * Atomic Signup Sync Handler
 * Split Lease - bubble_sync/handlers
 *
 * Synchronizes native Supabase signup data to Bubble using Data API.
 *
 * NOTE: account_host table is DEPRECATED - host data now stored directly in user table
 *
 * SIMPLIFIED FLOW (after account_host deprecation):
 * 1. Create user in Bubble (with host fields included)
 * 2. Update user.bubble_id in Supabase
 *
 * NO FALLBACK PRINCIPLE:
 * - Real data or nothing
 * - Errors propagate (not hidden)
 * - Atomic operations (all-or-nothing per phase)
 *
 * @module bubble_sync/handlers/syncSignupAtomic
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
    BubbleDataApiConfig,
    createRecord,
} from '../lib/bubbleDataApi.ts';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[syncSignupAtomic]'
const USER_TABLE = 'user'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface SyncSignupAtomicPayload {
    readonly user_id: string;                // Supabase user._id
    readonly host_account_id: string;        // Legacy FK ID (now stored in user table, not a separate table)
}

interface Phase1Result {
    readonly host_bubble_id: string;  // Empty - account_host sync removed
    readonly user_bubble_id: string;
}

interface Phase2Result {
    readonly host_updated: boolean;   // Always false - account_host sync removed
}

interface SupabaseUpdatesResult {
    readonly host_updated: boolean;   // Always false - account_host sync removed
    readonly user_updated: boolean;
}

export interface SyncSignupAtomicResult {
    readonly success: boolean;
    readonly user_bubble_id: string;
    readonly supabase_user_updated: boolean;
    // Legacy fields kept for backwards compatibility with callers
    readonly phase1: Phase1Result;
    readonly phase2: Phase2Result;
    readonly supabase_updates: SupabaseUpdatesResult;
}

interface UserRecord {
    readonly _id: string;
    readonly 'email as text'?: string;
    readonly 'Name - First'?: string;
    readonly 'Name - Last'?: string;
    readonly 'Name - Full'?: string;
    readonly 'Date of Birth'?: string;
    readonly 'Phone Number (as text)'?: string;
    readonly 'Type - User Current'?: string;
    readonly 'Type - User Signup'?: string;
    readonly 'Created Date'?: string;
    readonly 'Modified Date'?: string;
    readonly authentication?: Record<string, unknown>;
    readonly user_signed_up?: boolean;
    readonly Receptivity?: number;
    readonly MedianHoursToReply?: number | null;
    readonly Listings?: string[] | null;
}

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if user record exists
 * @pure
 */
const hasUserRecord = (user: UserRecord | null | undefined): user is UserRecord =>
    user !== null && user !== undefined

// ─────────────────────────────────────────────────────────────
// Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build initial result object
 * @pure
 */
const buildInitialResult = (): SyncSignupAtomicResult => ({
    success: false,
    user_bubble_id: '',
    supabase_user_updated: false,
    phase1: {
        host_bubble_id: '',  // Empty - account_host sync removed
        user_bubble_id: ''
    },
    phase2: {
        host_updated: false  // Always false - account_host sync removed
    },
    supabase_updates: {
        host_updated: false, // Always false - account_host sync removed
        user_updated: false
    }
})

/**
 * Build user data payload for Bubble
 * @pure
 */
const buildUserDataForBubble = (userRecord: UserRecord): Readonly<Record<string, unknown>> =>
    Object.freeze({
        'email as text': userRecord['email as text'],
        'Name - First': userRecord['Name - First'],
        'Name - Last': userRecord['Name - Last'],
        'Name - Full': userRecord['Name - Full'],
        'Date of Birth': userRecord['Date of Birth'],
        'Phone Number (as text)': userRecord['Phone Number (as text)'],
        'Type - User Current': userRecord['Type - User Current'],
        'Type - User Signup': userRecord['Type - User Signup'],
        // NOTE: Account - Host / Landlord is now just an ID string, not a FK to account_host in Bubble
        'Created Date': userRecord['Created Date'],
        'Modified Date': userRecord['Modified Date'],
        'authentication': userRecord.authentication || {},
        'user_signed_up': userRecord.user_signed_up || true,
        // Host fields (migrated from account_host)
        'Receptivity': userRecord.Receptivity || 0,
        'MedianHoursToReply': userRecord.MedianHoursToReply || null,
        'Listings': userRecord.Listings || null
    })

/**
 * Build success result
 * @pure
 */
const buildSuccessResult = (userBubbleId: string): SyncSignupAtomicResult =>
    Object.freeze({
        success: true,
        user_bubble_id: userBubbleId,
        supabase_user_updated: true,
        phase1: Object.freeze({
            host_bubble_id: '',  // Empty - account_host sync removed
            user_bubble_id: userBubbleId
        }),
        phase2: Object.freeze({
            host_updated: false  // Always false - account_host sync removed
        }),
        supabase_updates: Object.freeze({
            host_updated: false, // Always false - account_host sync removed
            user_updated: true
        })
    })

// ─────────────────────────────────────────────────────────────
// Query Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Fetch user record from Supabase
 * @effectful (database query)
 */
async function fetchUserRecord(
    supabase: SupabaseClient,
    userId: string
): Promise<UserRecord> {
    console.log(`${LOG_PREFIX} Fetching user record from Supabase...`)

    const { data, error } = await supabase
        .from(USER_TABLE)
        .select('*')
        .eq('_id', userId)
        .single()

    if (error || !hasUserRecord(data)) {
        throw new Error(`Failed to fetch user: ${error?.message}`)
    }

    console.log(`${LOG_PREFIX} ✅ User record fetched from Supabase`)
    return data as UserRecord
}

/**
 * Create user in Bubble
 * @effectful (HTTP request, console logging)
 */
async function createUserInBubble(
    bubbleConfig: BubbleDataApiConfig,
    userRecord: UserRecord
): Promise<string> {
    console.log(`${LOG_PREFIX} Creating user in Bubble...`)

    const userData = buildUserDataForBubble(userRecord)
    const userBubbleId = await createRecord(bubbleConfig, USER_TABLE, userData)

    console.log(`${LOG_PREFIX} ✅ user created in Bubble:`, userBubbleId)
    return userBubbleId
}

/**
 * Update user's bubble_id in Supabase
 * @effectful (database mutation)
 */
async function updateUserBubbleId(
    supabase: SupabaseClient,
    userId: string,
    bubbleId: string
): Promise<void> {
    const { error } = await supabase
        .from(USER_TABLE)
        .update({ bubble_id: bubbleId })
        .eq('_id', userId)

    if (error) {
        console.error(`${LOG_PREFIX} Failed to update user.bubble_id:`, error)
        throw new Error(`Supabase update failed: ${error.message}`)
    }

    console.log(`${LOG_PREFIX} ✅ Supabase user.bubble_id updated`)
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle atomic signup synchronization
 *
 * Creates user in Bubble and updates Supabase with the returned Bubble ID.
 *
 * @effectful (database mutations, HTTP requests, console logging)
 */
export async function handleSyncSignupAtomic(
    supabase: SupabaseClient,
    bubbleConfig: BubbleDataApiConfig,
    payload: SyncSignupAtomicPayload
): Promise<SyncSignupAtomicResult> {
    console.log(`${LOG_PREFIX} ========== SIGNUP SYNC START (SIMPLIFIED) ==========`)
    console.log(`${LOG_PREFIX} User ID:`, payload.user_id)
    console.log(`${LOG_PREFIX} Host Account ID (legacy FK):`, payload.host_account_id)
    console.log(`${LOG_PREFIX} NOTE: account_host table sync SKIPPED (deprecated)`)

    try {
        // Step 1: Fetch user from Supabase
        const userRecord = await fetchUserRecord(supabase, payload.user_id)

        // Step 2: Create user in Bubble
        const userBubbleId = await createUserInBubble(bubbleConfig, userRecord)

        // Step 3: Update Supabase with Bubble ID
        await updateUserBubbleId(supabase, payload.user_id, userBubbleId)

        // Build and return success result
        const result = buildSuccessResult(userBubbleId)

        console.log(`${LOG_PREFIX} ========== SIGNUP SYNC COMPLETE ==========`)
        console.log(`${LOG_PREFIX} Summary:`)
        console.log(`${LOG_PREFIX}   User Bubble ID:`, userBubbleId)
        console.log(`${LOG_PREFIX}   account_host sync: SKIPPED (deprecated)`)

        return result

    } catch (error) {
        console.error(`${LOG_PREFIX} ========== SYNC FAILED ==========`)
        console.error(`${LOG_PREFIX} Error:`, error)
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

    // Predicates
    hasUserRecord,

    // Builders
    buildInitialResult,
    buildUserDataForBubble,
    buildSuccessResult,

    // Query Helpers
    fetchUserRecord,
    createUserInBubble,
    updateUserBubbleId,
})
