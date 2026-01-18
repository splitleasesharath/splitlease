/**
 * Create Proposal Thread Handler
 * Split Lease - Messages Edge Function
 *
 * Creates a conversation thread for a proposal and sends initial SplitBot
 * messages to both guest and host with appropriate CTAs.
 *
 * Mirrors Bubble workflow: CORE-create-new-thread-as-splitbot-after-proposal
 *
 * Flow:
 * 1. Find or create thread for proposal
 * 2. Get CTAs for current proposal status
 * 3. Fetch user names and listing name for template rendering
 * 4. Create SplitBot message for guest (visible to guest only)
 * 5. Create SplitBot message for host (visible to host only)
 * 6. Update thread's last message
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ValidationError } from '../../_shared/errors.ts';
import {
  findOrCreateProposalThread,
  createSplitBotMessage,
  updateThreadLastMessage,
  getUserProfile,
  getListingName,
} from '../../_shared/messagingHelpers.ts';
import {
  getCTAForProposalStatus,
  buildTemplateContext,
  getDefaultMessage,
  getVisibilityForRole,
} from '../../_shared/ctaHelpers.ts';

// ============================================
// TYPES
// ============================================

export interface CreateProposalThreadPayload {
  proposalId: string;
  guestId: string;
  hostId: string;
  listingId: string;
  proposalStatus: string;
  // Optional: custom message body (overrides CTA template for guest)
  customMessageBody?: string;
  // Optional: custom host message (AI-generated summary from proposal creation)
  customHostMessage?: string;
  // Optional: warning message for SplitBot
  splitBotWarning?: string;
}

export interface CreateProposalThreadResponse {
  threadId: string;
  isNewThread: boolean;
  guestMessageId: string | null;
  hostMessageId: string | null;
}

// ============================================
// VALIDATION
// ============================================

function validatePayload(payload: Record<string, unknown>): CreateProposalThreadPayload {
  const { proposalId, guestId, hostId, listingId, proposalStatus } = payload;

  if (!proposalId || typeof proposalId !== 'string') {
    throw new ValidationError('proposalId is required');
  }
  if (!guestId || typeof guestId !== 'string') {
    throw new ValidationError('guestId is required');
  }
  if (!hostId || typeof hostId !== 'string') {
    throw new ValidationError('hostId is required');
  }
  if (!listingId || typeof listingId !== 'string') {
    throw new ValidationError('listingId is required');
  }
  if (!proposalStatus || typeof proposalStatus !== 'string') {
    throw new ValidationError('proposalStatus is required');
  }

  return {
    proposalId,
    guestId,
    hostId,
    listingId,
    proposalStatus,
    customMessageBody: payload.customMessageBody as string | undefined,
    customHostMessage: payload.customHostMessage as string | undefined,
    splitBotWarning: payload.splitBotWarning as string | undefined,
  };
}

// ============================================
// HANDLER
// ============================================

/**
 * Handle create_proposal_thread action
 *
 * Creates thread and sends SplitBot messages to both parties
 */
export async function handleCreateProposalThread(
  supabase: SupabaseClient,
  payload: Record<string, unknown>
): Promise<CreateProposalThreadResponse> {
  console.log('[createProposalThread] Starting...');

  // Validate input
  const input = validatePayload(payload);
  console.log('[createProposalThread] Validated input:', {
    proposalId: input.proposalId,
    proposalStatus: input.proposalStatus,
    hasCustomHostMessage: !!input.customHostMessage,
  });

  // ─────────────────────────────────────────────────────────
  // Step 1: Fetch context data (parallel)
  // ─────────────────────────────────────────────────────────

  const [guestProfile, hostProfile, listingName] = await Promise.all([
    getUserProfile(supabase, input.guestId),
    getUserProfile(supabase, input.hostId),
    getListingName(supabase, input.listingId),
  ]);

  const guestFirstName = guestProfile?.firstName || 'Guest';
  const hostFirstName = hostProfile?.firstName || 'Host';
  const resolvedListingName = listingName || 'this listing';

  console.log('[createProposalThread] Context:', {
    guestFirstName,
    hostFirstName,
    listingName: resolvedListingName,
  });

  // Build template context for CTA rendering
  const templateContext = buildTemplateContext(hostFirstName, guestFirstName, resolvedListingName);

  // ─────────────────────────────────────────────────────────
  // Step 2: Find or create thread
  // ─────────────────────────────────────────────────────────

  const { threadId, isNew } = await findOrCreateProposalThread(supabase, {
    proposalId: input.proposalId,
    hostUserId: input.hostId,
    guestUserId: input.guestId,
    listingId: input.listingId,
    listingName: resolvedListingName,
  });

  console.log('[createProposalThread] Thread:', { threadId, isNew });

  // ─────────────────────────────────────────────────────────
  // Step 3: Get CTAs for this status
  // ─────────────────────────────────────────────────────────

  const [guestCTA, hostCTA] = await Promise.all([
    getCTAForProposalStatus(supabase, input.proposalStatus, 'guest', templateContext),
    getCTAForProposalStatus(supabase, input.proposalStatus, 'host', templateContext),
  ]);

  console.log('[createProposalThread] CTAs:', {
    guestCTA: guestCTA?.display || 'none',
    hostCTA: hostCTA?.display || 'none',
  });

  // ─────────────────────────────────────────────────────────
  // Step 4: Create SplitBot message for GUEST
  // ─────────────────────────────────────────────────────────

  let guestMessageId: string | null = null;

  if (guestCTA) {
    const guestMessageBody = input.customMessageBody ||
      guestCTA.message ||
      getDefaultMessage(input.proposalStatus, 'guest', templateContext);

    const guestVisibility = getVisibilityForRole('guest');

    guestMessageId = await createSplitBotMessage(supabase, {
      threadId,
      messageBody: guestMessageBody,
      callToAction: guestCTA.display,
      visibleToHost: guestVisibility.visibleToHost,
      visibleToGuest: guestVisibility.visibleToGuest,
      splitBotWarning: input.splitBotWarning,
      recipientUserId: input.guestId,
    });

    console.log('[createProposalThread] Created guest message:', guestMessageId);
  }

  // ─────────────────────────────────────────────────────────
  // Step 5: Create SplitBot message for HOST
  // ─────────────────────────────────────────────────────────

  let hostMessageId: string | null = null;

  if (hostCTA) {
    // Use custom host message (AI summary from proposal creation) if provided,
    // otherwise fall back to CTA template or default message
    const hostMessageBody = input.customHostMessage ||
      hostCTA.message ||
      getDefaultMessage(input.proposalStatus, 'host', templateContext);

    const hostVisibility = getVisibilityForRole('host');

    hostMessageId = await createSplitBotMessage(supabase, {
      threadId,
      messageBody: hostMessageBody,
      callToAction: hostCTA.display,
      visibleToHost: hostVisibility.visibleToHost,
      visibleToGuest: hostVisibility.visibleToGuest,
      splitBotWarning: input.splitBotWarning,
      recipientUserId: input.hostId,
    });

    console.log('[createProposalThread] Created host message:', hostMessageId,
      input.customHostMessage ? '(using AI summary)' : '(using CTA template)');
  }

  // ─────────────────────────────────────────────────────────
  // Step 6: Update thread's last message (non-blocking)
  // ─────────────────────────────────────────────────────────

  // Use the guest message as the "last message" since it's the most recent
  const lastMessageBody = guestCTA?.message ||
    hostCTA?.message ||
    `Proposal for ${resolvedListingName}`;

  await updateThreadLastMessage(supabase, threadId, lastMessageBody);

  // ─────────────────────────────────────────────────────────
  // Return response
  // ─────────────────────────────────────────────────────────

  console.log('[createProposalThread] Complete');

  return {
    threadId,
    isNewThread: isNew,
    guestMessageId,
    hostMessageId,
  };
}
