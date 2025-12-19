/**
 * Create Co-Host Request Handler
 * Split Lease - Supabase Edge Functions
 *
 * Creates a co-host request record and an associated virtual meeting
 * in the database.
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError, SupabaseSyncError } from "../../_shared/errors.ts";
import { validateRequired } from "../../_shared/validation.ts";
import { enqueueBubbleSync, triggerQueueProcessing } from "../../_shared/queueSync.ts";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface UserContext {
  id: string;
  email: string;
}

interface CreateCoHostRequestInput {
  userId: string;           // User's Bubble _id
  userEmail: string;        // User's email
  userName: string;         // User's name
  listingId?: string;       // Optional: Listing Bubble _id
  selectedTimes: string[];  // Array of formatted datetime strings
  subject?: string;         // Topics/help needed (comma-separated)
  details?: string;         // Additional details text
}

interface CreateCoHostRequestResponse {
  requestId: string;
  virtualMeetingId: string;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle create co-host request
 *
 * Steps:
 * 1. Validate input (userId, selectedTimes required)
 * 2. Generate unique _id for co-host request
 * 3. Generate unique _id for virtual meeting
 * 4. Insert virtual meeting record
 * 5. Insert co-host request record (linked to virtual meeting)
 * 6. Enqueue Bubble sync for both records
 * 7. Return the created IDs
 */
export async function handleCreate(
  payload: Record<string, unknown>,
  user: UserContext | null,
  supabase: SupabaseClient
): Promise<CreateCoHostRequestResponse> {
  console.log(`[cohost-request:create] Starting create for user: ${user?.email || 'public'}`);

  // ================================================
  // VALIDATION
  // ================================================

  const input = payload as unknown as CreateCoHostRequestInput;

  validateRequired(input.userId, "userId");
  validateRequired(input.selectedTimes, "selectedTimes");

  if (!Array.isArray(input.selectedTimes) || input.selectedTimes.length === 0) {
    throw new ValidationError("selectedTimes must be a non-empty array");
  }

  console.log(`[cohost-request:create] Validated input for user: ${input.userId}`);
  console.log(`[cohost-request:create] Selected times: ${input.selectedTimes.length}`);

  // ================================================
  // FETCH USER DATA (optional - for additional context)
  // ================================================

  let userData = null;
  try {
    const { data: fetchedUser, error: userError } = await supabase
      .from("user")
      .select(`_id, email, "Name - First", "Name - Full"`)
      .eq("_id", input.userId)
      .single();

    if (!userError && fetchedUser) {
      userData = fetchedUser;
      console.log(`[cohost-request:create] Found user: ${userData.email}`);
    }
  } catch (e) {
    console.log(`[cohost-request:create] User lookup skipped (non-blocking)`);
  }

  // ================================================
  // GENERATE IDs
  // ================================================

  const { data: coHostRequestId, error: requestIdError } = await supabase.rpc('generate_bubble_id');
  if (requestIdError || !coHostRequestId) {
    console.error(`[cohost-request:create] Co-host request ID generation failed:`, requestIdError);
    throw new SupabaseSyncError('Failed to generate co-host request ID');
  }

  const { data: virtualMeetingId, error: vmIdError } = await supabase.rpc('generate_bubble_id');
  if (vmIdError || !virtualMeetingId) {
    console.error(`[cohost-request:create] Virtual meeting ID generation failed:`, vmIdError);
    throw new SupabaseSyncError('Failed to generate virtual meeting ID');
  }

  console.log(`[cohost-request:create] Generated IDs - Request: ${coHostRequestId}, VM: ${virtualMeetingId}`);

  // ================================================
  // CREATE VIRTUAL MEETING RECORD
  // ================================================

  const now = new Date().toISOString();

  const vmData: Record<string, unknown> = {
    _id: virtualMeetingId,

    // Relationships
    guest: input.userId,
    "requested by": input.userId,
    "Listing (for Co-Host feature)": input.listingId || null,

    // Meeting metadata
    "meeting duration": 30, // Default 30 minutes for co-host sessions
    "suggested dates and times": input.selectedTimes,

    // Status fields - all false/null initially
    "booked date": null,
    confirmedBySplitLease: false,
    "meeting declined": false,
    "meeting link": null,
    "end of meeting": null,
    pending: true, // Mark as pending until confirmed

    // Participant info
    "guest email": input.userEmail || userData?.email || null,
    "guest name": input.userName || userData?.["Name - Full"] || userData?.["Name - First"] || null,

    // Invitation tracking
    "invitation sent to guest?": false,
    "invitation sent to host?": false,

    // Audit fields
    "Created By": input.userId,
    "Created Date": now,
    "Modified Date": now,
  };

  console.log(`[cohost-request:create] Inserting virtual meeting: ${virtualMeetingId}`);

  const { error: vmInsertError } = await supabase
    .from("virtualmeetingschedulesandlinks")
    .insert(vmData);

  if (vmInsertError) {
    console.error(`[cohost-request:create] Virtual meeting insert failed:`, vmInsertError);
    throw new SupabaseSyncError(`Failed to create virtual meeting: ${vmInsertError.message}`);
  }

  console.log(`[cohost-request:create] Virtual meeting created successfully`);

  // ================================================
  // CREATE CO-HOST REQUEST RECORD
  // ================================================

  const coHostData: Record<string, unknown> = {
    _id: coHostRequestId,

    // Relationships
    "Co-Host User": input.userId,
    "Created By": input.userId,
    Listing: input.listingId || null,
    "Virtual meeting": virtualMeetingId,

    // Request details
    Subject: input.subject || null,
    "details submitted (optional)": input.details || null,
    "suggested dates and times": input.selectedTimes,

    // Status
    status: "Co-Host Requested",

    // Audit fields
    "Created Date": now,
    "Modified Date": now,
  };

  console.log(`[cohost-request:create] Inserting co-host request: ${coHostRequestId}`);

  const { error: requestInsertError } = await supabase
    .from("co_hostrequest")
    .insert(coHostData);

  if (requestInsertError) {
    console.error(`[cohost-request:create] Co-host request insert failed:`, requestInsertError);
    // Log full error details for FK debugging
    console.error(`[cohost-request:create] Error details - code: ${requestInsertError.code}, message: ${requestInsertError.message}, details: ${requestInsertError.details}, hint: ${requestInsertError.hint}`);
    throw new SupabaseSyncError(`Failed to create co-host request: ${requestInsertError.message}`);
  }

  console.log(`[cohost-request:create] Co-host request created successfully`);

  // ================================================
  // ENQUEUE BUBBLE SYNC
  // ================================================

  try {
    await enqueueBubbleSync(supabase, {
      correlationId: coHostRequestId,
      items: [
        {
          sequence: 1,
          table: 'virtualmeetingschedulesandlinks',
          recordId: virtualMeetingId,
          operation: 'INSERT',
          payload: vmData,
        },
        {
          sequence: 2,
          table: 'co_hostrequest',
          recordId: coHostRequestId,
          operation: 'INSERT',
          payload: coHostData,
        },
      ],
    });

    console.log(`[cohost-request:create] Bubble sync enqueued (correlation: ${coHostRequestId})`);

    // Trigger queue processing (fire and forget)
    triggerQueueProcessing();

  } catch (syncError) {
    // Log but don't fail - items can be manually requeued if needed
    console.error(`[cohost-request:create] Failed to enqueue Bubble sync (non-blocking):`, syncError);
  }

  // ================================================
  // RETURN RESPONSE
  // ================================================

  console.log(`[cohost-request:create] Complete, returning response`);

  return {
    requestId: coHostRequestId,
    virtualMeetingId: virtualMeetingId,
    createdAt: now,
  };
}
