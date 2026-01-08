/**
 * Update Proposal Action
 * Split Lease - Supabase Edge Functions
 *
 * Handles proposal updates including:
 * - Field updates (pricing, dates, days/nights)
 * - Status transitions
 * - Host counteroffers
 * - Cancellations
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 *
 * FP PATTERN: Separates pure data builders from effectful database operations
 * All data transformations are pure with @pure annotations
 * All database operations are explicit with @effectful annotations
 *
 * @module proposal/actions/update
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ValidationError,
  SupabaseSyncError,
  AuthenticationError,
} from "../../_shared/errors.ts";
import { parseJsonArray } from "../../_shared/jsonUtils.ts";
import { enqueueBubbleSync, triggerQueueProcessing, filterBubbleIncompatibleFields } from "../../_shared/queueSync.ts";
import {
  UpdateProposalInput,
  UpdateProposalResponse,
  ProposalData,
  UserContext,
  ProposalStatusName,
} from "../lib/types.ts";
import { validateUpdateProposalInput, hasUpdateFields } from "../lib/validators.ts";
import { calculateComplementaryNights } from "../lib/calculations.ts";
import {
  isValidStatusTransition,
  isTerminalStatus,
  createStatusHistoryEntry,
  isValidStatus,
} from "../lib/status.ts";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[proposal:update]'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type UserRole = 'guest' | 'host' | 'admin'

interface AuthorizationContext {
  readonly isGuest: boolean;
  readonly isHost: boolean;
  readonly isAdmin: boolean;
  readonly role: UserRole;
}

interface UpdateResult {
  readonly updates: Readonly<Record<string, unknown>>;
  readonly updatedFields: readonly string[];
}

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if user is authorized to update proposal
 * @pure
 */
const isAuthorized = (authContext: AuthorizationContext): boolean =>
  authContext.isGuest || authContext.isHost || authContext.isAdmin

/**
 * Check if proposal can be updated (not in terminal status)
 * @pure
 */
const canUpdate = (proposal: ProposalData): boolean =>
  !isTerminalStatus(proposal.Status as ProposalStatusName)

/**
 * Determine user role from authorization context
 * @pure
 */
const determineRole = (authContext: AuthorizationContext): UserRole => {
  if (authContext.isAdmin) return 'admin'
  if (authContext.isHost) return 'host'
  return 'guest'
}

// ─────────────────────────────────────────────────────────────
// Pure Data Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build status update with history entry
 * @pure
 */
const buildStatusUpdate = (
  input: UpdateProposalInput,
  proposalData: ProposalData,
  userRole: UserRole
): Readonly<Record<string, unknown>> | null => {
  if (input.status === undefined || input.status === proposalData.Status) {
    return null
  }

  if (!isValidStatus(input.status)) {
    throw new ValidationError(`Invalid status: ${input.status}`)
  }

  if (!isValidStatusTransition(
    proposalData.Status as ProposalStatusName,
    input.status as ProposalStatusName
  )) {
    throw new ValidationError(
      `Invalid status transition: ${proposalData.Status} → ${input.status}`
    )
  }

  const historyEntry = createStatusHistoryEntry(
    input.status as ProposalStatusName,
    userRole
  )

  const currentHistory = parseJsonArray<string>(
    (proposalData as unknown as { History: unknown }).History,
    "History"
  )

  return Object.freeze({
    Status: input.status,
    History: [...currentHistory, historyEntry],
  })
}

/**
 * Build pricing updates
 * @pure
 */
const buildPricingUpdates = (
  input: UpdateProposalInput
): Readonly<Record<string, unknown>> => {
  const updates: Record<string, unknown> = {}

  if (input.proposal_price !== undefined) {
    updates["proposal nightly price"] = input.proposal_price
  }

  return Object.freeze(updates)
}

/**
 * Build date updates
 * @pure
 */
const buildDateUpdates = (
  input: UpdateProposalInput
): Readonly<Record<string, unknown>> => {
  const updates: Record<string, unknown> = {}

  if (input.move_in_start_range !== undefined) {
    updates["Move in range start"] = input.move_in_start_range
  }
  if (input.move_in_end_range !== undefined) {
    updates["Move in range end"] = input.move_in_end_range
  }

  return Object.freeze(updates)
}

/**
 * Build day/night selection updates
 * @pure
 */
const buildSelectionUpdates = (
  input: UpdateProposalInput,
  proposalData: ProposalData
): Readonly<Record<string, unknown>> => {
  const updates: Record<string, unknown> = {}

  if (input.days_selected !== undefined) {
    updates["Days Selected"] = input.days_selected
  }

  if (input.nights_selected !== undefined) {
    updates["Nights Selected (Nights list)"] = input.nights_selected
    updates["nights per week (num)"] = input.nights_selected.length

    // Recalculate complementary nights
    const availableNights = (proposalData as unknown as { "Days Available": number[] })["Days Available"] || []
    updates["Complementary Nights"] = calculateComplementaryNights(
      availableNights,
      input.nights_selected
    )
  }

  return Object.freeze(updates)
}

/**
 * Build duration updates
 * @pure
 */
const buildDurationUpdates = (
  input: UpdateProposalInput
): Readonly<Record<string, unknown>> => {
  const updates: Record<string, unknown> = {}

  if (input.reservation_span_weeks !== undefined) {
    updates["Reservation Span (Weeks)"] = input.reservation_span_weeks
  }

  if (input.comment !== undefined) {
    updates.Comment = input.comment
  }

  return Object.freeze(updates)
}

/**
 * Build host counteroffer updates
 * @pure
 */
const buildCounterofferUpdates = (
  input: UpdateProposalInput
): Readonly<Record<string, unknown>> => {
  const updates: Record<string, unknown> = {}

  if (input.hc_nightly_price !== undefined) {
    updates["hc nightly price"] = input.hc_nightly_price
    updates["counter offer happened"] = true
  }
  if (input.hc_days_selected !== undefined) {
    updates["hc days selected"] = input.hc_days_selected
  }
  if (input.hc_nights_selected !== undefined) {
    updates["hc nights selected"] = input.hc_nights_selected
    updates["hc nights per week"] = input.hc_nights_selected.length
  }
  if (input.hc_move_in_date !== undefined) {
    updates["hc move in date"] = input.hc_move_in_date
  }
  if (input.hc_reservation_span_weeks !== undefined) {
    updates["hc reservation span (weeks)"] = input.hc_reservation_span_weeks
  }
  if (input.hc_cleaning_fee !== undefined) {
    updates["hc cleaning fee"] = input.hc_cleaning_fee
  }
  if (input.hc_damage_deposit !== undefined) {
    updates["hc damage deposit"] = input.hc_damage_deposit
  }
  if (input.hc_total_price !== undefined) {
    updates["hc total price"] = input.hc_total_price
  }
  if (input.hc_four_week_rent !== undefined) {
    updates["hc 4 week rent"] = input.hc_four_week_rent
  }
  if (input.hc_check_in !== undefined) {
    updates["hc check in day"] = input.hc_check_in
  }
  if (input.hc_check_out !== undefined) {
    updates["hc check out day"] = input.hc_check_out
  }

  return Object.freeze(updates)
}

/**
 * Build cancellation updates
 * @pure
 */
const buildCancellationUpdates = (
  input: UpdateProposalInput
): Readonly<Record<string, unknown>> => {
  const updates: Record<string, unknown> = {}

  if (input.reason_for_cancellation !== undefined) {
    updates["reason for cancellation"] = input.reason_for_cancellation
  }

  return Object.freeze(updates)
}

/**
 * Track which fields were updated
 * @pure
 */
const trackUpdatedFields = (
  input: UpdateProposalInput,
  statusUpdated: boolean
): readonly string[] => {
  const fields: string[] = []

  if (statusUpdated) fields.push("status")
  if (input.proposal_price !== undefined) fields.push("proposal_price")
  if (input.move_in_start_range !== undefined) fields.push("move_in_start_range")
  if (input.move_in_end_range !== undefined) fields.push("move_in_end_range")
  if (input.days_selected !== undefined) fields.push("days_selected")
  if (input.nights_selected !== undefined) fields.push("nights_selected")
  if (input.reservation_span_weeks !== undefined) fields.push("reservation_span_weeks")
  if (input.comment !== undefined) fields.push("comment")
  if (input.hc_nightly_price !== undefined) fields.push("hc_nightly_price")
  if (input.hc_days_selected !== undefined) fields.push("hc_days_selected")
  if (input.hc_nights_selected !== undefined) fields.push("hc_nights_selected")
  if (input.hc_move_in_date !== undefined) fields.push("hc_move_in_date")
  if (input.hc_reservation_span_weeks !== undefined) fields.push("hc_reservation_span_weeks")
  if (input.hc_cleaning_fee !== undefined) fields.push("hc_cleaning_fee")
  if (input.hc_damage_deposit !== undefined) fields.push("hc_damage_deposit")
  if (input.hc_total_price !== undefined) fields.push("hc_total_price")
  if (input.hc_four_week_rent !== undefined) fields.push("hc_four_week_rent")
  if (input.hc_check_in !== undefined) fields.push("hc_check_in")
  if (input.hc_check_out !== undefined) fields.push("hc_check_out")
  if (input.reason_for_cancellation !== undefined) fields.push("reason_for_cancellation")

  return Object.freeze(fields)
}

/**
 * Build all updates from input
 * @pure
 */
const buildAllUpdates = (
  input: UpdateProposalInput,
  proposalData: ProposalData,
  userRole: UserRole,
  now: string
): UpdateResult => {
  const statusUpdate = buildStatusUpdate(input, proposalData, userRole)
  const pricingUpdates = buildPricingUpdates(input)
  const dateUpdates = buildDateUpdates(input)
  const selectionUpdates = buildSelectionUpdates(input, proposalData)
  const durationUpdates = buildDurationUpdates(input)
  const counterofferUpdates = buildCounterofferUpdates(input)
  const cancellationUpdates = buildCancellationUpdates(input)

  const updates: Record<string, unknown> = {
    ...(statusUpdate || {}),
    ...pricingUpdates,
    ...dateUpdates,
    ...selectionUpdates,
    ...durationUpdates,
    ...counterofferUpdates,
    ...cancellationUpdates,
    "Modified Date": now,
  }

  const updatedFields = trackUpdatedFields(input, statusUpdate !== null)

  return Object.freeze({
    updates: Object.freeze(updates),
    updatedFields,
  })
}

/**
 * Build response object
 * @pure
 */
const buildResponse = (
  proposalId: string,
  status: string,
  updatedFields: readonly string[],
  now: string
): UpdateProposalResponse =>
  Object.freeze({
    proposal_id: proposalId,
    status,
    updated_fields: updatedFields,
    updated_at: now,
  })

// ─────────────────────────────────────────────────────────────
// Database Query Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Fetch proposal from database
 * @effectful - Database read operation
 */
const fetchProposal = async (
  supabase: SupabaseClient,
  proposalId: string
): Promise<ProposalData> => {
  const { data: proposal, error } = await supabase
    .from("proposal")
    .select("*")
    .eq("_id", proposalId)
    .single()

  if (error || !proposal) {
    console.error(`${LOG_PREFIX} Proposal fetch failed:`, error)
    throw new ValidationError(`Proposal not found: ${proposalId}`)
  }

  return proposal as unknown as ProposalData
}

/**
 * Check if user is admin
 * @effectful - Database read operation
 */
const checkIsAdmin = async (
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> => {
  const { data } = await supabase
    .from("user")
    .select(`"Toggle - Is Admin"`)
    .eq("_id", userId)
    .single()

  return data?.["Toggle - Is Admin"] === true
}

/**
 * Check if user is the host of the proposal's listing
 * @pure - Host User now directly contains user._id
 */
const checkIsHost = (hostUserId: string, userId: string): boolean => {
  if (!hostUserId) return false
  return hostUserId === userId
}

/**
 * Build authorization context
 * @effectful - May require database lookup for admin check
 */
const buildAuthContext = async (
  supabase: SupabaseClient,
  proposalData: ProposalData,
  userId: string
): Promise<AuthorizationContext> => {
  const isGuest = proposalData.Guest === userId
  const isHost = checkIsHost(proposalData["Host User"], userId)
  const isAdmin = await checkIsAdmin(supabase, userId)

  return Object.freeze({
    isGuest,
    isHost,
    isAdmin,
    role: determineRole({ isGuest, isHost, isAdmin }),
  })
}

/**
 * Apply update to database
 * @effectful - Database write operation
 */
const applyUpdate = async (
  supabase: SupabaseClient,
  proposalId: string,
  updates: Readonly<Record<string, unknown>>
): Promise<void> => {
  const { error } = await supabase
    .from("proposal")
    .update(updates)
    .eq("_id", proposalId)

  if (error) {
    console.error(`${LOG_PREFIX} Update failed:`, error)
    throw new SupabaseSyncError(`Failed to update proposal: ${error.message}`)
  }
}

/**
 * Enqueue Bubble sync for update
 * @effectful - Database write and HTTP request
 */
const enqueueBubbleSyncUpdate = async (
  supabase: SupabaseClient,
  proposalId: string,
  bubbleId: string,
  updates: Readonly<Record<string, unknown>>
): Promise<void> => {
  try {
    const cleanUpdates = filterBubbleIncompatibleFields(updates)

    await enqueueBubbleSync(supabase, {
      correlationId: `proposal_update:${proposalId}:${Date.now()}`,
      items: [{
        sequence: 1,
        table: 'proposal',
        recordId: proposalId,
        operation: 'UPDATE',
        bubbleId,
        payload: cleanUpdates,
      }]
    })

    console.log(`${LOG_PREFIX} Bubble sync queued for proposal: ${proposalId}`)

    // Trigger queue processing (fire-and-forget)
    triggerQueueProcessing()
  } catch (syncError) {
    // Log but don't fail the update - sync can be retried
    console.error(`${LOG_PREFIX} Failed to queue Bubble sync (non-blocking):`, syncError)
  }
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle update proposal request
 * @effectful - Orchestrates multiple database operations
 */
export async function handleUpdate(
  payload: Record<string, unknown>,
  user: UserContext,
  supabase: SupabaseClient
): Promise<UpdateProposalResponse> {
  console.log(`${LOG_PREFIX} Starting update for user: ${user.email}`)

  // ================================================
  // VALIDATION
  // ================================================

  const input = payload as unknown as UpdateProposalInput
  validateUpdateProposalInput(input)

  if (!hasUpdateFields(input)) {
    throw new ValidationError("No valid fields to update")
  }

  console.log(`${LOG_PREFIX} Validated input for proposal: ${input.proposal_id}`)

  // ================================================
  // FETCH EXISTING PROPOSAL
  // ================================================

  const proposalData = await fetchProposal(supabase, input.proposal_id)
  console.log(`${LOG_PREFIX} Found proposal with status: ${proposalData.Status}`)

  // ================================================
  // AUTHORIZATION CHECK
  // ================================================

  const authContext = await buildAuthContext(supabase, proposalData, user.id)

  if (!isAuthorized(authContext)) {
    console.error(`${LOG_PREFIX} Unauthorized: user ${user.id} is not guest, host, or admin`)
    throw new AuthenticationError("You do not have permission to update this proposal")
  }

  console.log(`${LOG_PREFIX} Authorized as: ${authContext.role}`)

  // ================================================
  // CHECK TERMINAL STATUS
  // ================================================

  if (!canUpdate(proposalData)) {
    throw new ValidationError(
      `Cannot update proposal in terminal status: ${proposalData.Status}`
    )
  }

  // ================================================
  // BUILD UPDATE OBJECT
  // ================================================

  const now = new Date().toISOString()
  const { updates, updatedFields } = buildAllUpdates(input, proposalData, authContext.role, now)

  if (updatedFields.length === 0) {
    throw new ValidationError("No valid fields to update")
  }

  // ================================================
  // APPLY UPDATE
  // ================================================

  console.log(`${LOG_PREFIX} Updating fields: ${updatedFields.join(", ")}`)
  await applyUpdate(supabase, input.proposal_id, updates)
  console.log(`${LOG_PREFIX} Update successful`)

  // ================================================
  // TRIGGER STATUS-SPECIFIC WORKFLOWS
  // ================================================

  if (input.status) {
    console.log(`${LOG_PREFIX} [ASYNC] Status changed, would trigger notifications:`, {
      proposal_id: input.proposal_id,
      old_status: proposalData.Status,
      new_status: input.status,
    })
  }

  // ================================================
  // ENQUEUE BUBBLE SYNC
  // ================================================

  await enqueueBubbleSyncUpdate(supabase, input.proposal_id, proposalData._id, updates)

  // ================================================
  // RETURN RESPONSE
  // ================================================

  return buildResponse(
    input.proposal_id,
    (input.status || proposalData.Status) as string,
    updatedFields,
    now
  )
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

  // Validation Predicates
  isAuthorized,
  canUpdate,
  determineRole,

  // Pure Data Builders
  buildStatusUpdate,
  buildPricingUpdates,
  buildDateUpdates,
  buildSelectionUpdates,
  buildDurationUpdates,
  buildCounterofferUpdates,
  buildCancellationUpdates,
  trackUpdatedFields,
  buildAllUpdates,
  buildResponse,

  // Database Query Helpers
  fetchProposal,
  checkIsAdmin,
  checkIsHost,
  buildAuthContext,
  applyUpdate,
  enqueueBubbleSyncUpdate,

  // Main Handler
  handleUpdate,
})
