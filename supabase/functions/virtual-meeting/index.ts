/**
 * Virtual Meeting Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * Main router for virtual meeting operations:
 * - create: Create a new virtual meeting request
 * - delete: Delete/cancel a virtual meeting
 * - accept: Accept a virtual meeting with booked date
 * - decline: Decline a virtual meeting request
 * - send_calendar_invite: Trigger Google Calendar invite via Zapier
 * - notify_participants: Send SMS/Email notifications to participants
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 *
 * FP ARCHITECTURE:
 * - Pure functions for validation, routing, and response formatting
 * - Immutable data structures (no let reassignment in orchestration)
 * - Side effects isolated to boundaries (entry/exit of handler)
 * - Result type for error propagation (exceptions only at outer boundary)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ValidationError,
  AuthenticationError,
} from "../_shared/errors.ts";

// FP Utilities
import { Result, ok, err } from "../_shared/functional/result.ts";
import {
  parseRequest,
  validateAction,
  routeToHandler,
  isPublicAction,
  getSupabaseConfig,
  formatSuccessResponse,
  formatErrorResponseHttp,
  formatCorsResponse,
  CorsPreflightSignal,
  AuthenticatedUser,
  extractAuthToken,
} from "../_shared/functional/orchestration.ts";
import { createErrorLog, addError, setUserId, setAction, ErrorLog } from "../_shared/functional/errorLog.ts";
import { reportErrorLog } from "../_shared/slack.ts";

import { handleCreate } from "./handlers/create.ts";
import { handleDelete } from "./handlers/delete.ts";
import { handleAccept } from "./handlers/accept.ts";
import { handleDecline } from "./handlers/decline.ts";
import { handleSendCalendarInvite } from "./handlers/sendCalendarInvite.ts";
import { handleNotifyParticipants } from "./handlers/notifyParticipants.ts";

// Admin Handlers
import { handleAdminFetchNewRequests } from "./handlers/admin/fetchNewRequests.ts";
import { handleAdminFetchConfirmed } from "./handlers/admin/fetchConfirmedMeetings.ts";
import { handleAdminConfirmMeeting } from "./handlers/admin/confirmMeeting.ts";
import { handleAdminUpdateMeetingDates } from "./handlers/admin/updateMeetingDates.ts";
import { handleAdminDeleteMeeting } from "./handlers/admin/deleteMeeting.ts";
import {
  handleAdminFetchBlockedSlots,
  handleAdminBlockTimeSlot,
  handleAdminUnblockTimeSlot,
  handleAdminBlockFullDay,
  handleAdminUnblockFullDay,
} from "./handlers/admin/blockedSlots.ts";

// ─────────────────────────────────────────────────────────────
// Configuration (Immutable)
// ─────────────────────────────────────────────────────────────

const ALLOWED_ACTIONS = [
  // Existing public actions
  "create", "delete", "accept", "decline", "send_calendar_invite", "notify_participants",
  // Admin actions (require authentication)
  "admin_fetch_new_requests",
  "admin_fetch_confirmed",
  "admin_confirm_meeting",
  "admin_update_meeting_dates",
  "admin_delete_meeting",
  "admin_fetch_blocked_slots",
  "admin_block_time_slot",
  "admin_unblock_time_slot",
  "admin_block_full_day",
  "admin_unblock_full_day",
] as const;

// NOTE: Non-admin actions are public until Supabase auth migration is complete
// Admin actions require authentication
const PUBLIC_ACTIONS: ReadonlySet<string> = new Set([
  "create", "delete", "accept", "decline", "send_calendar_invite", "notify_participants"
]);

type Action = typeof ALLOWED_ACTIONS[number];

// Handler map (immutable record) - replaces switch statement
const handlers: Readonly<Record<Action, Function>> = {
  // Existing handlers
  create: handleCreate,
  delete: handleDelete,
  accept: handleAccept,
  decline: handleDecline,
  send_calendar_invite: handleSendCalendarInvite,
  notify_participants: handleNotifyParticipants,
  // Admin handlers
  admin_fetch_new_requests: handleAdminFetchNewRequests,
  admin_fetch_confirmed: handleAdminFetchConfirmed,
  admin_confirm_meeting: handleAdminConfirmMeeting,
  admin_update_meeting_dates: handleAdminUpdateMeetingDates,
  admin_delete_meeting: handleAdminDeleteMeeting,
  admin_fetch_blocked_slots: handleAdminFetchBlockedSlots,
  admin_block_time_slot: handleAdminBlockTimeSlot,
  admin_unblock_time_slot: handleAdminUnblockTimeSlot,
  admin_block_full_day: handleAdminBlockFullDay,
  admin_unblock_full_day: handleAdminUnblockFullDay,
};

// ─────────────────────────────────────────────────────────────
// Pure Functions
// ─────────────────────────────────────────────────────────────

/**
 * Authenticate user from request headers
 * Returns Result with user or error
 */
const authenticateUser = async (
  headers: Headers,
  supabaseUrl: string,
  supabaseAnonKey: string,
  requireAuth: boolean
): Promise<Result<AuthenticatedUser | null, AuthenticationError>> => {
  if (!requireAuth) {
    return ok(null);
  }

  const tokenResult = extractAuthToken(headers);
  if (!tokenResult.ok) {
    return tokenResult;
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: tokenResult.value } },
  });

  const { data: { user: authUser }, error: authError } = await authClient.auth.getUser();

  if (authError || !authUser) {
    return err(new AuthenticationError("Invalid or expired token"));
  }

  return ok({ id: authUser.id, email: authUser.email ?? "" });
};

// ─────────────────────────────────────────────────────────────
// Effect Boundary (Side Effects Isolated Here)
// ─────────────────────────────────────────────────────────────

console.log("[virtual-meeting] Edge Function started (FP mode)");

Deno.serve(async (req: Request) => {
  const correlationId = crypto.randomUUID().slice(0, 8);
  let errorLog: ErrorLog = createErrorLog('virtual-meeting', 'unknown', correlationId);

  try {
    console.log(`[virtual-meeting] ========== REQUEST ==========`);
    console.log(`[virtual-meeting] Method: ${req.method}`);

    const parseResult = await parseRequest(req);

    if (!parseResult.ok) {
      if (parseResult.error instanceof CorsPreflightSignal) {
        return formatCorsResponse();
      }
      throw parseResult.error;
    }

    const { action, payload, headers } = parseResult.value;
    errorLog = setAction(errorLog, action);
    console.log(`[virtual-meeting] Action: ${action}`);
    console.log(`[virtual-meeting] Payload:`, JSON.stringify(payload, null, 2));

    const actionResult = validateAction(ALLOWED_ACTIONS, action);
    if (!actionResult.ok) {
      throw actionResult.error;
    }

    const configResult = getSupabaseConfig();
    if (!configResult.ok) {
      throw configResult.error;
    }
    const config = configResult.value;

    const requireAuth = !isPublicAction(PUBLIC_ACTIONS, action);
    const authResult = await authenticateUser(
      headers,
      config.supabaseUrl,
      config.supabaseAnonKey,
      requireAuth
    );

    if (!authResult.ok) {
      throw authResult.error;
    }

    const user = authResult.value;

    if (user) {
      errorLog = setUserId(errorLog, user.id);
      console.log(`[virtual-meeting] Authenticated: ${user.email}`);
    } else {
      console.log(`[virtual-meeting] Public action - skipping authentication`);
    }

    const serviceClient = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const handlerResult = routeToHandler(handlers, action);
    if (!handlerResult.ok) {
      throw handlerResult.error;
    }

    const handler = handlerResult.value;
    const result = await handler(payload, user, serviceClient);

    console.log(`[virtual-meeting] ========== SUCCESS ==========`);

    return formatSuccessResponse(result);

  } catch (error) {
    console.error(`[virtual-meeting] ========== ERROR ==========`);
    console.error(`[virtual-meeting] Error name:`, (error as Error).name);
    console.error(`[virtual-meeting] Error message:`, (error as Error).message);
    console.error(`[virtual-meeting] Full error:`, error);

    errorLog = addError(errorLog, error as Error, 'Fatal error in main handler');
    reportErrorLog(errorLog);

    return formatErrorResponseHttp(error as Error);
  }
});
