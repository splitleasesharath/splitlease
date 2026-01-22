/**
 * Get Guest History Action
 *
 * Retrieve activity history for a specific guest.
 * Shows pages visited, actions taken, etc.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface GetGuestHistoryPayload {
  guestId: string;
  limit?: number;
  offset?: number;
}

interface HistoryEntry {
  id: string;
  date: string;
  page: string;
  pagePath: string;
  actionType: string;
  metadata?: Record<string, unknown>;
}

interface GetGuestHistoryResult {
  entries: HistoryEntry[];
  total: number;
  hasMore: boolean;
}

export async function handleGetGuestHistory(
  payload: GetGuestHistoryPayload,
  supabase: SupabaseClient
): Promise<GetGuestHistoryResult> {
  const { guestId, limit = 50, offset = 0 } = payload;

  if (!guestId) {
    throw new Error('guestId is required');
  }

  console.log(`[getGuestHistory] Fetching history for guest: ${guestId}`);

  // Get total count
  const { count, error: countError } = await supabase
    .from('guest_activity_history')
    .select('*', { count: 'exact', head: true })
    .eq('guest_id', guestId);

  if (countError) {
    console.error('[getGuestHistory] Count error:', countError);
  }

  const total = count || 0;

  // Fetch history entries
  const { data, error } = await supabase
    .from('guest_activity_history')
    .select('_id, page_path, page_title, action_type, metadata, created_at')
    .eq('guest_id', guestId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[getGuestHistory] Fetch error:', error);
    throw new Error(`Failed to fetch history: ${error.message}`);
  }

  const entries: HistoryEntry[] = (data || []).map(h => ({
    id: h._id,
    date: h.created_at,
    page: h.page_title || h.page_path,
    pagePath: h.page_path,
    actionType: h.action_type || 'view',
    metadata: h.metadata
  }));

  console.log(`[getGuestHistory] Found ${entries.length} entries (total: ${total})`);

  return {
    entries,
    total,
    hasMore: offset + entries.length < total
  };
}
