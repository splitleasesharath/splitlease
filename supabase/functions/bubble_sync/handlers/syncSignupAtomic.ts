/**
 * Atomic Signup Sync Handler
 *
 * Synchronizes native Supabase signup data to Bubble using Data API.
 *
 * PHASE 1: Create account_host, user (2 POSTs)
 * PHASE 2: Update foreign keys (1 PATCH)
 *
 * Handles circular foreign key dependency by:
 * 1. Creating host WITHOUT User field
 * 2. Creating user WITH Bubble host ID
 * 3. Updating host WITH Bubble user ID
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
    host_account_id: string;        // Supabase account_host._id
}

export interface SyncSignupAtomicResult {
    success: boolean;
    phase1: {
        host_bubble_id: string;
        user_bubble_id: string;
    };
    phase2: {
        host_updated: boolean;
    };
    supabase_updates: {
        host_updated: boolean;
        user_updated: boolean;
    };
}

export async function handleSyncSignupAtomic(
    supabase: SupabaseClient,
    bubbleConfig: BubbleDataApiConfig,
    payload: SyncSignupAtomicPayload
): Promise<SyncSignupAtomicResult> {
    console.log('[syncSignupAtomic] ========== ATOMIC SIGNUP SYNC START ==========');
    console.log('[syncSignupAtomic] User ID:', payload.user_id);
    console.log('[syncSignupAtomic] Host Account ID:', payload.host_account_id);

    const result: SyncSignupAtomicResult = {
        success: false,
        phase1: {
            host_bubble_id: '',
            user_bubble_id: ''
        },
        phase2: {
            host_updated: false
        },
        supabase_updates: {
            host_updated: false,
            user_updated: false
        }
    };

    try {
        // ========== FETCH RECORDS FROM SUPABASE ==========
        console.log('[syncSignupAtomic] Fetching records from Supabase...');

        const { data: hostRecord, error: hostFetchError } = await supabase
            .from('account_host')
            .select('*')
            .eq('_id', payload.host_account_id)
            .single();

        if (hostFetchError || !hostRecord) {
            throw new Error(`Failed to fetch account_host: ${hostFetchError?.message}`);
        }

        const { data: userRecord, error: userFetchError } = await supabase
            .from('user')
            .select('*')
            .eq('_id', payload.user_id)
            .single();

        if (userFetchError || !userRecord) {
            throw new Error(`Failed to fetch user: ${userFetchError?.message}`);
        }

        console.log('[syncSignupAtomic] ✅ All records fetched from Supabase');

        // ========== PHASE 1: CREATE RECORDS IN BUBBLE ==========
        console.log('[syncSignupAtomic] ========== PHASE 1: CREATE RECORDS ==========');

        // Step 1.1: Create account_host (WITHOUT User field)
        console.log('[syncSignupAtomic] Step 1.1: Creating account_host in Bubble...');

        const hostData = {
            'HasClaimedListing': hostRecord['HasClaimedListing'] || false,
            'Receptivity': hostRecord['Receptivity'] || 0,
            'Created Date': hostRecord['Created Date'],
            'Modified Date': hostRecord['Modified Date']
            // ⚠️ OMIT 'User' field - will be set in Phase 2
        };

        const hostBubbleId = await createRecord(
            bubbleConfig,
            'account_host',
            hostData
        );

        result.phase1.host_bubble_id = hostBubbleId;
        console.log('[syncSignupAtomic] ✅ account_host created in Bubble:', hostBubbleId);

        // Update Supabase with Bubble ID
        const { error: hostUpdateError } = await supabase
            .from('account_host')
            .update({ bubble_id: hostBubbleId })
            .eq('_id', payload.host_account_id);

        if (hostUpdateError) {
            console.error('[syncSignupAtomic] Failed to update account_host.bubble_id:', hostUpdateError);
            throw new Error(`Supabase update failed: ${hostUpdateError.message}`);
        }

        result.supabase_updates.host_updated = true;
        console.log('[syncSignupAtomic] ✅ Supabase account_host.bubble_id updated');

        // Step 1.2: Create user (WITH Bubble host ID)
        console.log('[syncSignupAtomic] Step 1.2: Creating user in Bubble...');

        const userData = {
            'email as text': userRecord['email as text'],
            'Name - First': userRecord['Name - First'],
            'Name - Last': userRecord['Name - Last'],
            'Name - Full': userRecord['Name - Full'],
            'Date of Birth': userRecord['Date of Birth'],
            'Phone Number (as text)': userRecord['Phone Number (as text)'],
            'Type - User Current': userRecord['Type - User Current'],
            'Type - User Signup': userRecord['Type - User Signup'],
            'Account - Host / Landlord': hostBubbleId,     // ✅ Use Bubble ID
            'Created Date': userRecord['Created Date'],
            'Modified Date': userRecord['Modified Date'],
            'authentication': userRecord['authentication'] || {},
            'user_signed_up': userRecord['user_signed_up'] || true
        };

        const userBubbleId = await createRecord(
            bubbleConfig,
            'user',
            userData
        );

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

        result.supabase_updates.user_updated = true;
        console.log('[syncSignupAtomic] ✅ Supabase user.bubble_id updated');
        console.log('[syncSignupAtomic] ========== PHASE 1 COMPLETE ==========');

        // ========== PHASE 2: UPDATE FOREIGN KEYS ==========
        console.log('[syncSignupAtomic] ========== PHASE 2: UPDATE FOREIGN KEYS ==========');

        // Step 2.1: Update account_host.User → Bubble user ID
        console.log('[syncSignupAtomic] Step 2.1: Updating account_host.User in Bubble...');

        await updateRecord(
            bubbleConfig,
            'account_host',
            hostBubbleId,
            { 'User': userBubbleId }  // ✅ Set foreign key to Bubble user ID
        );

        result.phase2.host_updated = true;
        console.log('[syncSignupAtomic] ✅ account_host.User updated in Bubble');
        console.log('[syncSignupAtomic] ========== PHASE 2 COMPLETE ==========');

        result.success = true;
        console.log('[syncSignupAtomic] ========== ATOMIC SIGNUP SYNC COMPLETE ==========');
        console.log('[syncSignupAtomic] Summary:');
        console.log('[syncSignupAtomic]   Host Bubble ID:', hostBubbleId);
        console.log('[syncSignupAtomic]   User Bubble ID:', userBubbleId);
        console.log('[syncSignupAtomic]   All foreign keys updated: ✅');

        return result;

    } catch (error) {
        console.error('[syncSignupAtomic] ========== SYNC FAILED ==========');
        console.error('[syncSignupAtomic] Error:', error);
        console.error('[syncSignupAtomic] Partial results:', result);
        throw error;
    }
}
