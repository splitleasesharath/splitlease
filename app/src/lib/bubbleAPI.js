/**
 * Bubble.io API Service - Edge Function Proxy
 *
 * ALL Bubble workflow calls now route through Supabase Edge Functions.
 * This ensures atomic operations and secure API key storage.
 *
 * NO FALLBACK: If Edge Function fails, we fail. No client-side retry logic.
 * API keys are stored server-side only in Supabase Secrets.
 *
 * Migration Status: ✅ MIGRATED TO EDGE FUNCTIONS
 */

import { supabase } from './supabase.js';

/**
 * Trigger a Bubble.io backend workflow via Edge Function
 * @deprecated Use specific functions like createListingInCode instead
 * @param {string} workflowName - Name of the workflow (not used - for backward compatibility)
 * @param {Object} parameters - Parameters to pass to the workflow (not used)
 * @returns {Promise<Object>} - Throws error (direct workflow calls not supported)
 */
export async function triggerBubbleWorkflow(workflowName, parameters = {}) {
  console.warn('[Bubble API] ⚠️ triggerBubbleWorkflow is deprecated and will be removed.');
  console.warn('[Bubble API] Direct Bubble workflow calls are not supported.');
  console.warn('[Bubble API] Use Edge Function proxies instead (e.g., createListingInCode).');
  throw new Error('Direct Bubble workflow calls are not supported. Use Edge Functions.');
}

/**
 * Create a new listing via Supabase Edge Function
 * Implements atomic operation: Create in Bubble → Fetch from Bubble → Sync to Supabase
 * NO FALLBACK - Throws if Edge Function fails
 *
 * @param {string} listingName - Name of the listing to create
 * @param {string} [userEmail] - Email of the logged-in user (optional)
 * @returns {Promise<Object>} - Synced listing data from Supabase
 */
export async function createListingInCode(listingName, userEmail = null) {
  console.log('[Bubble API] Creating listing via Edge Function');
  console.log('[Bubble API] Listing name:', listingName);
  console.log('[Bubble API] User email:', userEmail || 'Not provided (logged out)');

  if (!listingName?.trim()) {
    throw new Error('Listing name is required');
  }

  try {
    const { data, error } = await supabase.functions.invoke('bubble-proxy', {
      body: {
        action: 'create_listing',
        payload: {
          listing_name: listingName.trim(),
          user_email: userEmail,
        },
      },
    });

    if (error) {
      console.error('[Bubble API] Edge Function error:', error);
      throw new Error(error.message || 'Failed to create listing');
    }

    if (!data.success) {
      throw new Error(data.error || 'Unknown error');
    }

    console.log('[Bubble API] ✅ Listing created and synced:', data.data);
    return data.data;
  } catch (error) {
    console.error('[Bubble API] Failed to create listing:', error);
    throw error;
  }
}

/**
 * Get a listing by ID via Supabase Edge Function
 * Fetches listing data from Bubble via Edge Function proxy
 * NO FALLBACK - Throws if Edge Function fails
 *
 * @param {string} listingId - Bubble ID of the listing to fetch
 * @returns {Promise<Object>} - Listing data from Bubble
 */
export async function getListingById(listingId) {
  console.log('[Bubble API] Fetching listing via Edge Function');
  console.log('[Bubble API] Listing ID:', listingId);

  if (!listingId?.trim()) {
    throw new Error('Listing ID is required');
  }

  try {
    const { data, error } = await supabase.functions.invoke('bubble-proxy', {
      body: {
        action: 'get_listing',
        payload: {
          listing_id: listingId.trim(),
        },
      },
    });

    if (error) {
      console.error('[Bubble API] Edge Function error:', error);
      throw new Error(error.message || 'Failed to fetch listing');
    }

    if (!data.success) {
      throw new Error(data.error || 'Unknown error');
    }

    console.log('[Bubble API] ✅ Listing fetched:', data.data);
    return data.data;
  } catch (error) {
    console.error('[Bubble API] Failed to fetch listing:', error);
    throw error;
  }
}
