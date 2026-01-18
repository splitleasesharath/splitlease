/**
 * Get Reminders Handler
 * Split Lease - Reminder House Manual Feature
 *
 * Retrieves reminders by house manual ID or visit ID
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { GetRemindersPayload, GetByVisitPayload, GetRemindersResult, Reminder } from "../lib/types.ts";

/**
 * Handle get reminders action (host view)
 */
export const handleGet = async (
  payload: GetRemindersPayload,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<GetRemindersResult> => {
  console.log('[get] Fetching reminders');

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Build query
  let query = supabase
    .from('remindersfromhousemanual')
    .select('*');

  if (payload.houseManualId) {
    console.log('[get] Filtering by house manual:', payload.houseManualId);
    query = query.eq('house manual', payload.houseManualId);
  }

  if (payload.visitId) {
    console.log('[get] Filtering by visit:', payload.visitId);
    query = query.eq('visit', payload.visitId);
  }

  if (payload.status) {
    console.log('[get] Filtering by status:', payload.status);
    query = query.eq('status', payload.status);
  }

  // Order by scheduled date
  query = query.order('scheduled date and time', { ascending: true });

  const { data, error, count } = await query;

  if (error) {
    console.error('[get] Query error:', error);
    throw new Error(`Failed to fetch reminders: ${error.message}`);
  }

  console.log('[get] Found reminders:', data?.length || 0);

  return {
    reminders: (data || []) as readonly Reminder[],
    total: data?.length || 0,
  };
};

/**
 * Handle get-by-visit action (guest view - read-only)
 * This allows guests to view reminders for their visit
 */
export const handleGetByVisit = async (
  payload: GetByVisitPayload,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<GetRemindersResult> => {
  console.log('[get-by-visit] Fetching reminders for visit:', payload.visitId);

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Guests can only see reminders for their visit
  const { data, error } = await supabase
    .from('remindersfromhousemanual')
    .select('*')
    .eq('visit', payload.visitId)
    .order('scheduled date and time', { ascending: true });

  if (error) {
    console.error('[get-by-visit] Query error:', error);
    throw new Error(`Failed to fetch visit reminders: ${error.message}`);
  }

  console.log('[get-by-visit] Found reminders:', data?.length || 0);

  return {
    reminders: (data || []) as readonly Reminder[],
    total: data?.length || 0,
  };
};
