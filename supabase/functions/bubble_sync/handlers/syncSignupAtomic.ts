/**
 * Atomic Signup Sync Handler
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
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
    BubbleDataApiConfig,
    createRecord,
    updateRecord,
} from '../lib/bubbleDataApi.ts';

export interface SyncSignupAtomicPayload {
    user_id: string;                // Supabase user._id
    host_account_id: string;        // Legacy FK ID (now stored in user table, not a separate table)
}

export interface SyncSignupAtomicResult {
    success: boolean;
    user_bubble_id: string;
    supabase_user_updated: boolean;
    // Legacy fields kept for backwards compatibility with callers
    phase1: {
        host_bubble_id: string;  // Empty - account_host sync removed
        user_bubble_id: string;
    };
    phase2: {
        host_updated: boolean;   // Always false - account_host sync removed
    };
    supabase_updates: {
        host_updated: boolean;   // Always false - account_host sync removed
        user_updated: boolean;
    };
}

export async function handleSyncSignupAtomic(
    supabase: SupabaseClient,
    bubbleConfig: BubbleDataApiConfig,
    payload: SyncSignupAtomicPayload
): Promise<SyncSignupAtomicResult> {
    console.log('[syncSignupAtomic] ========== SIGNUP SYNC START (SIMPLIFIED) ==========');
    console.log('[syncSignupAtomic] User ID:', payload.user_id);
    console.log('[syncSignupAtomic] Host Account ID (legacy FK):', payload.host_account_id);
    console.log('[syncSignupAtomic] NOTE: account_host table sync SKIPPED (deprecated)');

    const result: SyncSignupAtomicResult = {
        success: false,
        user_bubble_id: '',
        supabase_user_updated: false,
        // Legacy fields for backwards compatibility
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
    };

    try {
        // ========== FETCH USER RECORD FROM SUPABASE ==========
        console.log('[syncSignupAtomic] Fetching user record from Supabase...');

        const { data: userRecord, error: userFetchError } = await supabase
            .from('user')
            .select('*')
            .eq('_id', payload.user_id)
            .single();

        if (userFetchError || !userRecord) {
            throw new Error(`Failed to fetch user: ${userFetchError?.message}`);
        }

        console.log('[syncSignupAtomic] ✅ User record fetched from Supabase');

        // ========== CREATE USER IN BUBBLE ==========
        console.log('[syncSignupAtomic] Creating user in Bubble...');

        // User data includes host fields (migrated from account_host)
        const userData = {
            'email as text': userRecord['email as text'],
            'Name - First': userRecord['Name - First'],
            'Name - Last': userRecord['Name - Last'],
            'Name - Full': userRecord['Name - Full'],
            'Date of Birth': userRecord['Date of Birth'],
            'Phone Number (as text)': userRecord['Phone Number (as text)'],
            'Type - User Current': userRecord['Type - User Current'],
            'Type - User Signup': userRecord['Type - User Signup'],
            // NOTE: Account - Host / Landlord is now just an ID string, not a FK to account_host in Bubble
            // Bubble may need to be updated to handle this or we skip this field
            'Created Date': userRecord['Created Date'],
            'Modified Date': userRecord['Modified Date'],
            'authentication': userRecord['authentication'] || {},
            'user_signed_up': userRecord['user_signed_up'] || true,
            // Host fields (migrated from account_host)
            'Receptivity': userRecord['Receptivity'] || 0,
            'MedianHoursToReply': userRecord['MedianHoursToReply'] || null,
            'Listings': userRecord['Listings'] || null
        };

        const userBubbleId = await createRecord(
            bubbleConfig,
            'user',
            userData
        );

        result.user_bubble_id = userBubbleId;
        result.phase1.user_bubble_id = userBubbleId;
        console.log('[syncSignupAtomic] ✅ user created in Bubble:', userBubbleId);

        // Update Supabase with Bubble ID
        const { error: userUpdateError } = await supabase
            .from('user')
            .update({ bubble_id: userBubbleId })
            .eq('_id', payload.user_id);

        if (userUpdateError) {
            console.error('[syncSignupAtomic] Failed to update user.bubble_id:', userUpdateError);
            throw new Error(`Supabase update failed: ${userUpdateError.message}`);
        }

        result.supabase_user_updated = true;
        result.supabase_updates.user_updated = true;
        console.log('[syncSignupAtomic] ✅ Supabase user.bubble_id updated');

        result.success = true;
        console.log('[syncSignupAtomic] ========== SIGNUP SYNC COMPLETE ==========');
        console.log('[syncSignupAtomic] Summary:');
        console.log('[syncSignupAtomic]   User Bubble ID:', userBubbleId);
        console.log('[syncSignupAtomic]   account_host sync: SKIPPED (deprecated)');

        return result;

    } catch (error) {
        console.error('[syncSignupAtomic] ========== SYNC FAILED ==========');
        console.error('[syncSignupAtomic] Error:', error);
        console.error('[syncSignupAtomic] Partial results:', result);
        throw error;
    }
}
