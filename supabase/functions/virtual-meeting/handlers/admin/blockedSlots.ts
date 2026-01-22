/**
 * Admin Handlers: Blocked Time Slots Management
 *
 * Handles blocking and unblocking time slots for host availability
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AuthenticationError, ValidationError } from "../../../_shared/errors.ts";

interface AuthenticatedUser {
  id: string;
  email: string;
}

// ─────────────────────────────────────────────────────────────
// Fetch Blocked Slots
// ─────────────────────────────────────────────────────────────

interface FetchBlockedSlotsPayload {
  hostId: string;
}

export async function handleAdminFetchBlockedSlots(
  payload: FetchBlockedSlotsPayload,
  user: AuthenticatedUser | null,
  supabase: SupabaseClient
): Promise<unknown[]> {
  if (!user) {
    throw new AuthenticationError("Authentication required for admin actions");
  }

  if (!payload.hostId) {
    throw new ValidationError("Host ID is required");
  }

  console.log(`[admin_fetch_blocked_slots] Fetching blocked slots for host: ${payload.hostId}`);

  const { data, error } = await supabase
    .from("blocked_time_slots")
    .select("*")
    .eq("host_id", payload.hostId)
    .order("date", { ascending: true });

  if (error) {
    console.error("[admin_fetch_blocked_slots] Database error:", error);
    throw new ValidationError(`Failed to fetch blocked slots: ${error.message}`);
  }

  return data || [];
}

// ─────────────────────────────────────────────────────────────
// Block Time Slot
// ─────────────────────────────────────────────────────────────

interface BlockSlotPayload {
  hostId: string;
  date: string;
  startTime: string;
  endTime: string;
}

export async function handleAdminBlockTimeSlot(
  payload: BlockSlotPayload,
  user: AuthenticatedUser | null,
  supabase: SupabaseClient
): Promise<unknown> {
  if (!user) {
    throw new AuthenticationError("Authentication required for admin actions");
  }

  if (!payload.hostId || !payload.date || !payload.startTime || !payload.endTime) {
    throw new ValidationError("Host ID, date, start time, and end time are required");
  }

  console.log(`[admin_block_time_slot] Blocking slot for host ${payload.hostId} on ${payload.date}`);

  const { data, error } = await supabase
    .from("blocked_time_slots")
    .insert({
      host_id: payload.hostId,
      date: payload.date,
      start_time: payload.startTime,
      end_time: payload.endTime,
      is_full_day_blocked: false
    })
    .select()
    .single();

  if (error) {
    console.error("[admin_block_time_slot] Database error:", error);
    throw new ValidationError(`Failed to block time slot: ${error.message}`);
  }

  return data;
}

// ─────────────────────────────────────────────────────────────
// Unblock Time Slot
// ─────────────────────────────────────────────────────────────

interface UnblockSlotPayload {
  slotId: string;
}

export async function handleAdminUnblockTimeSlot(
  payload: UnblockSlotPayload,
  user: AuthenticatedUser | null,
  supabase: SupabaseClient
): Promise<{ deleted: boolean; slotId: string }> {
  if (!user) {
    throw new AuthenticationError("Authentication required for admin actions");
  }

  if (!payload.slotId) {
    throw new ValidationError("Slot ID is required");
  }

  console.log(`[admin_unblock_time_slot] Unblocking slot: ${payload.slotId}`);

  const { error } = await supabase
    .from("blocked_time_slots")
    .delete()
    .eq("id", payload.slotId);

  if (error) {
    console.error("[admin_unblock_time_slot] Database error:", error);
    throw new ValidationError(`Failed to unblock time slot: ${error.message}`);
  }

  return {
    deleted: true,
    slotId: payload.slotId
  };
}

// ─────────────────────────────────────────────────────────────
// Block Full Day
// ─────────────────────────────────────────────────────────────

interface BlockFullDayPayload {
  hostId: string;
  date: string;
}

export async function handleAdminBlockFullDay(
  payload: BlockFullDayPayload,
  user: AuthenticatedUser | null,
  supabase: SupabaseClient
): Promise<unknown> {
  if (!user) {
    throw new AuthenticationError("Authentication required for admin actions");
  }

  if (!payload.hostId || !payload.date) {
    throw new ValidationError("Host ID and date are required");
  }

  console.log(`[admin_block_full_day] Blocking full day for host ${payload.hostId} on ${payload.date}`);

  // First, remove any partial blocks for this day
  await supabase
    .from("blocked_time_slots")
    .delete()
    .eq("host_id", payload.hostId)
    .eq("date", payload.date);

  // Then insert full day block
  const { data, error } = await supabase
    .from("blocked_time_slots")
    .insert({
      host_id: payload.hostId,
      date: payload.date,
      start_time: null,
      end_time: null,
      is_full_day_blocked: true
    })
    .select()
    .single();

  if (error) {
    console.error("[admin_block_full_day] Database error:", error);
    throw new ValidationError(`Failed to block full day: ${error.message}`);
  }

  return data;
}

// ─────────────────────────────────────────────────────────────
// Unblock Full Day
// ─────────────────────────────────────────────────────────────

interface UnblockFullDayPayload {
  hostId: string;
  date: string;
}

export async function handleAdminUnblockFullDay(
  payload: UnblockFullDayPayload,
  user: AuthenticatedUser | null,
  supabase: SupabaseClient
): Promise<{ deleted: boolean; hostId: string; date: string }> {
  if (!user) {
    throw new AuthenticationError("Authentication required for admin actions");
  }

  if (!payload.hostId || !payload.date) {
    throw new ValidationError("Host ID and date are required");
  }

  console.log(`[admin_unblock_full_day] Unblocking full day for host ${payload.hostId} on ${payload.date}`);

  const { error } = await supabase
    .from("blocked_time_slots")
    .delete()
    .eq("host_id", payload.hostId)
    .eq("date", payload.date)
    .eq("is_full_day_blocked", true);

  if (error) {
    console.error("[admin_unblock_full_day] Database error:", error);
    throw new ValidationError(`Failed to unblock full day: ${error.message}`);
  }

  return {
    deleted: true,
    hostId: payload.hostId,
    date: payload.date
  };
}
