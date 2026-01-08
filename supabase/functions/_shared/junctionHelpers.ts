/**
 * Junction Table Helpers
 * Split Lease - Supabase Edge Functions
 *
 * Helper functions for dual-writing to junction tables during JSONB→junction migration.
 * These helpers maintain backward compatibility by continuing JSONB writes
 * while also writing to the new normalized junction tables.
 *
 * Junction tables are in the `junctions` schema.
 *
 * @module _shared/junctionHelpers
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[junctionHelpers]'
const UNIQUE_VIOLATION_CODE = '23505'
const JUNCTIONS_SCHEMA = 'junctions'

/**
 * Junction table names
 * @immutable
 */
const JUNCTION_TABLES = Object.freeze({
  USER_PROPOSAL: 'user_proposal',
  USER_LISTING_FAVORITE: 'user_listing_favorite',
  USER_STORAGE_ITEM: 'user_storage_item',
  USER_PREFERRED_HOOD: 'user_preferred_hood',
  THREAD_MESSAGE: 'thread_message',
  THREAD_PARTICIPANT: 'thread_participant',
} as const)

/**
 * Valid roles for user_proposal junction
 * @immutable
 */
export const PROPOSAL_ROLES = Object.freeze(['guest', 'host'] as const)
export type ProposalRole = typeof PROPOSAL_ROLES[number]

/**
 * Valid roles for thread_participant junction
 * @immutable
 */
export const PARTICIPANT_ROLES = Object.freeze(['host', 'guest'] as const)
export type ParticipantRole = typeof PARTICIPANT_ROLES[number]

/**
 * Valid message types
 * @immutable
 */
export const MESSAGE_TYPES = Object.freeze([
  'all',
  'slbot_to_host',
  'slbot_to_guest',
  'host_sent',
  'guest_sent',
] as const)
export type MessageType = typeof MESSAGE_TYPES[number]

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if error is a unique violation (duplicate key)
 * @pure
 */
const isUniqueViolation = (errorCode: string | undefined): boolean =>
  errorCode === UNIQUE_VIOLATION_CODE

/**
 * Check if array has items
 * @pure
 */
const hasItems = <T>(arr: ReadonlyArray<T>): boolean =>
  arr.length > 0

// ─────────────────────────────────────────────────────────────
// Row Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build user proposal junction row
 * @pure
 */
const buildUserProposalRow = (
  userId: string,
  proposalId: string,
  role: ProposalRole
): Readonly<{ user_id: string; proposal_id: string; role: ProposalRole }> =>
  Object.freeze({ user_id: userId, proposal_id: proposalId, role })

/**
 * Build user listing favorite junction row
 * @pure
 */
const buildUserListingFavoriteRow = (
  userId: string,
  listingId: string
): Readonly<{ user_id: string; listing_id: string }> =>
  Object.freeze({ user_id: userId, listing_id: listingId })

/**
 * Build user storage item junction row
 * @pure
 */
const buildUserStorageItemRow = (
  userId: string,
  storageId: string
): Readonly<{ user_id: string; storage_id: string }> =>
  Object.freeze({ user_id: userId, storage_id: storageId })

/**
 * Build user preferred hood junction row with preference order
 * @pure
 */
const buildUserPreferredHoodRow = (
  userId: string,
  hoodId: string,
  preferenceOrder: number
): Readonly<{ user_id: string; hood_id: string; preference_order: number }> =>
  Object.freeze({ user_id: userId, hood_id: hoodId, preference_order: preferenceOrder })

/**
 * Build thread message junction row
 * @pure
 */
const buildThreadMessageRow = (
  threadId: string,
  messageId: string,
  messageType: MessageType
): Readonly<{ thread_id: string; message_id: string; message_type: MessageType }> =>
  Object.freeze({ thread_id: threadId, message_id: messageId, message_type: messageType })

/**
 * Build thread participant junction row
 * @pure
 */
const buildThreadParticipantRow = (
  threadId: string,
  userId: string,
  role: ParticipantRole
): Readonly<{ thread_id: string; user_id: string; role: ParticipantRole }> =>
  Object.freeze({ thread_id: threadId, user_id: userId, role })

// ─────────────────────────────────────────────────────────────
// Result Extractors
// ─────────────────────────────────────────────────────────────

/**
 * Extract message IDs from query result
 * @pure
 */
const extractMessageIds = (data: ReadonlyArray<{ message_id: string }> | null): ReadonlyArray<string> =>
  data?.map(row => row.message_id) ?? []

/**
 * Extract thread IDs from query result
 * @pure
 */
const extractThreadIds = (data: ReadonlyArray<{ thread_id: string }> | null): ReadonlyArray<string> =>
  data?.map(row => row.thread_id) ?? []

// ============================================
// USER PROPOSAL JUNCTION
// ============================================

/**
 * Add a proposal to user's junction table
 * Writes to junctions.user_proposal
 * @effectful (database I/O, console logging)
 */
export async function addUserProposal(
  supabase: SupabaseClient,
  userId: string,
  proposalId: string,
  role: ProposalRole
): Promise<void> {
  console.log(`${LOG_PREFIX} Adding user_proposal: user=${userId}, proposal=${proposalId}, role=${role}`);

  const { error } = await supabase
    .schema(JUNCTIONS_SCHEMA)
    .from(JUNCTION_TABLES.USER_PROPOSAL)
    .insert(buildUserProposalRow(userId, proposalId, role))
    .select()
    .single();

  if (error) {
    // Ignore duplicate key errors (junction already exists)
    if (isUniqueViolation(error.code)) {
      console.log(`${LOG_PREFIX} user_proposal already exists (idempotent)`);
      return;
    }
    console.error(`${LOG_PREFIX} Failed to add user_proposal:`, error);
    // Non-blocking - log but don't throw
  } else {
    console.log(`${LOG_PREFIX} user_proposal added successfully`);
  }
}

/**
 * Remove a proposal from user's junction table
 * Deletes from junctions.user_proposal
 * @effectful (database I/O, console logging)
 */
export async function removeUserProposal(
  supabase: SupabaseClient,
  userId: string,
  proposalId: string
): Promise<void> {
  console.log(`${LOG_PREFIX} Removing user_proposal: user=${userId}, proposal=${proposalId}`);

  const { error } = await supabase
    .schema(JUNCTIONS_SCHEMA)
    .from(JUNCTION_TABLES.USER_PROPOSAL)
    .delete()
    .eq('user_id', userId)
    .eq('proposal_id', proposalId);

  if (error) {
    console.error(`${LOG_PREFIX} Failed to remove user_proposal:`, error);
    // Non-blocking
  } else {
    console.log(`${LOG_PREFIX} user_proposal removed successfully`);
  }
}

// ============================================
// USER LISTING FAVORITE JUNCTION
// ============================================

/**
 * Add a listing to user's favorites junction table
 * Writes to junctions.user_listing_favorite
 * @effectful (database I/O, console logging)
 */
export async function addUserListingFavorite(
  supabase: SupabaseClient,
  userId: string,
  listingId: string
): Promise<void> {
  console.log(`${LOG_PREFIX} Adding user_listing_favorite: user=${userId}, listing=${listingId}`);

  const { error } = await supabase
    .schema(JUNCTIONS_SCHEMA)
    .from(JUNCTION_TABLES.USER_LISTING_FAVORITE)
    .insert(buildUserListingFavoriteRow(userId, listingId))
    .select()
    .single();

  if (error) {
    // Ignore duplicate key errors (junction already exists)
    if (isUniqueViolation(error.code)) {
      console.log(`${LOG_PREFIX} user_listing_favorite already exists (idempotent)`);
      return;
    }
    console.error(`${LOG_PREFIX} Failed to add user_listing_favorite:`, error);
    // Non-blocking
  } else {
    console.log(`${LOG_PREFIX} user_listing_favorite added successfully`);
  }
}

/**
 * Remove a listing from user's favorites junction table
 * Deletes from junctions.user_listing_favorite
 * @effectful (database I/O, console logging)
 */
export async function removeUserListingFavorite(
  supabase: SupabaseClient,
  userId: string,
  listingId: string
): Promise<void> {
  console.log(`${LOG_PREFIX} Removing user_listing_favorite: user=${userId}, listing=${listingId}`);

  const { error } = await supabase
    .schema(JUNCTIONS_SCHEMA)
    .from(JUNCTION_TABLES.USER_LISTING_FAVORITE)
    .delete()
    .eq('user_id', userId)
    .eq('listing_id', listingId);

  if (error) {
    console.error(`${LOG_PREFIX} Failed to remove user_listing_favorite:`, error);
    // Non-blocking
  } else {
    console.log(`${LOG_PREFIX} user_listing_favorite removed successfully`);
  }
}

// ============================================
// USER STORAGE ITEM JUNCTION
// ============================================

/**
 * Set user's commonly stored items (replaces all)
 * Writes to junctions.user_storage_item
 * @effectful (database I/O, console logging)
 */
export async function setUserStorageItems(
  supabase: SupabaseClient,
  userId: string,
  storageIds: ReadonlyArray<string>
): Promise<void> {
  console.log(`${LOG_PREFIX} Setting user_storage_item: user=${userId}, items=${storageIds.length}`);

  // Delete existing items first
  const { error: deleteError } = await supabase
    .schema(JUNCTIONS_SCHEMA)
    .from(JUNCTION_TABLES.USER_STORAGE_ITEM)
    .delete()
    .eq('user_id', userId);

  if (deleteError) {
    console.error(`${LOG_PREFIX} Failed to clear user_storage_item:`, deleteError);
  }

  // Insert new items
  if (hasItems(storageIds)) {
    const rows = storageIds.map(storageId => buildUserStorageItemRow(userId, storageId));

    const { error: insertError } = await supabase
      .schema(JUNCTIONS_SCHEMA)
      .from(JUNCTION_TABLES.USER_STORAGE_ITEM)
      .insert(rows);

    if (insertError) {
      console.error(`${LOG_PREFIX} Failed to insert user_storage_item:`, insertError);
    } else {
      console.log(`${LOG_PREFIX} user_storage_item set successfully (${rows.length} items)`);
    }
  }
}

// ============================================
// USER PREFERRED HOOD JUNCTION
// ============================================

/**
 * Set user's preferred neighborhoods (replaces all)
 * Writes to junctions.user_preferred_hood
 * @effectful (database I/O, console logging)
 */
export async function setUserPreferredHoods(
  supabase: SupabaseClient,
  userId: string,
  hoodIds: ReadonlyArray<string>
): Promise<void> {
  console.log(`${LOG_PREFIX} Setting user_preferred_hood: user=${userId}, hoods=${hoodIds.length}`);

  // Delete existing items first
  const { error: deleteError } = await supabase
    .schema(JUNCTIONS_SCHEMA)
    .from(JUNCTION_TABLES.USER_PREFERRED_HOOD)
    .delete()
    .eq('user_id', userId);

  if (deleteError) {
    console.error(`${LOG_PREFIX} Failed to clear user_preferred_hood:`, deleteError);
  }

  // Insert new items with preference order
  if (hasItems(hoodIds)) {
    const rows = hoodIds.map((hoodId, index) =>
      buildUserPreferredHoodRow(userId, hoodId, index + 1)
    );

    const { error: insertError } = await supabase
      .schema(JUNCTIONS_SCHEMA)
      .from(JUNCTION_TABLES.USER_PREFERRED_HOOD)
      .insert(rows);

    if (insertError) {
      console.error(`${LOG_PREFIX} Failed to insert user_preferred_hood:`, insertError);
    } else {
      console.log(`${LOG_PREFIX} user_preferred_hood set successfully (${rows.length} hoods)`);
    }
  }
}

// ============================================
// BATCH FAVORITES OPERATIONS
// ============================================

/**
 * Add multiple listings to user's favorites junction table
 * Writes to junctions.user_listing_favorite (batch)
 * @effectful (database I/O, console logging)
 */
export async function addUserListingFavoritesBatch(
  supabase: SupabaseClient,
  userId: string,
  listingIds: ReadonlyArray<string>
): Promise<void> {
  if (!hasItems(listingIds)) return;

  console.log(`${LOG_PREFIX} Batch adding user_listing_favorite: user=${userId}, listings=${listingIds.length}`);

  const rows = listingIds.map(listingId => buildUserListingFavoriteRow(userId, listingId));

  const { error } = await supabase
    .schema(JUNCTIONS_SCHEMA)
    .from(JUNCTION_TABLES.USER_LISTING_FAVORITE)
    .upsert(rows, {
      onConflict: 'user_id,listing_id',
      ignoreDuplicates: true
    });

  if (error) {
    console.error(`${LOG_PREFIX} Failed to batch add user_listing_favorite:`, error);
  } else {
    console.log(`${LOG_PREFIX} user_listing_favorite batch added successfully`);
  }
}

// ============================================
// THREAD MESSAGE JUNCTION
// ============================================

/**
 * Add a message to thread junction
 * Usually auto-populated by trigger, but available for manual use
 * @effectful (database I/O, console logging)
 */
export async function addThreadMessage(
  supabase: SupabaseClient,
  threadId: string,
  messageId: string,
  messageType: MessageType = 'all'
): Promise<void> {
  console.log(`${LOG_PREFIX} Adding thread_message: thread=${threadId}, message=${messageId}, type=${messageType}`);

  const { error } = await supabase
    .schema(JUNCTIONS_SCHEMA)
    .from(JUNCTION_TABLES.THREAD_MESSAGE)
    .insert(buildThreadMessageRow(threadId, messageId, messageType));

  if (error) {
    // Ignore duplicate key errors (junction already exists via trigger)
    if (isUniqueViolation(error.code)) {
      console.log(`${LOG_PREFIX} thread_message already exists (idempotent)`);
      return;
    }
    console.error(`${LOG_PREFIX} Failed to add thread_message:`, error);
  } else {
    console.log(`${LOG_PREFIX} thread_message added successfully`);
  }
}

/**
 * Get messages for a thread filtered by type
 * Useful for visibility-filtered queries
 * @effectful (database I/O, console logging)
 */
export async function getThreadMessagesByType(
  supabase: SupabaseClient,
  threadId: string,
  messageTypes: ReadonlyArray<MessageType>
): Promise<ReadonlyArray<string>> {
  console.log(`${LOG_PREFIX} Getting thread_messages: thread=${threadId}, types=${messageTypes.join(',')}`);

  const { data, error } = await supabase
    .schema(JUNCTIONS_SCHEMA)
    .from(JUNCTION_TABLES.THREAD_MESSAGE)
    .select('message_id')
    .eq('thread_id', threadId)
    .in('message_type', messageTypes as MessageType[]);

  if (error) {
    console.error(`${LOG_PREFIX} Failed to get thread_messages:`, error);
    return [];
  }

  return extractMessageIds(data);
}

// ============================================
// THREAD PARTICIPANT JUNCTION
// ============================================

/**
 * Add a participant to thread junction
 * Usually auto-populated by trigger, but available for manual use
 * @effectful (database I/O, console logging)
 */
export async function addThreadParticipant(
  supabase: SupabaseClient,
  threadId: string,
  userId: string,
  role: ParticipantRole
): Promise<void> {
  console.log(`${LOG_PREFIX} Adding thread_participant: thread=${threadId}, user=${userId}, role=${role}`);

  const { error } = await supabase
    .schema(JUNCTIONS_SCHEMA)
    .from(JUNCTION_TABLES.THREAD_PARTICIPANT)
    .insert(buildThreadParticipantRow(threadId, userId, role));

  if (error) {
    // Ignore duplicate key errors (junction already exists via trigger)
    if (isUniqueViolation(error.code)) {
      console.log(`${LOG_PREFIX} thread_participant already exists (idempotent)`);
      return;
    }
    console.error(`${LOG_PREFIX} Failed to add thread_participant:`, error);
  } else {
    console.log(`${LOG_PREFIX} thread_participant added successfully`);
  }
}

/**
 * Get all threads for a user via junction table
 * More efficient than OR queries on thread table
 * @effectful (database I/O, console logging)
 */
export async function getUserThreadIds(
  supabase: SupabaseClient,
  userId: string
): Promise<ReadonlyArray<string>> {
  console.log(`${LOG_PREFIX} Getting user threads: user=${userId}`);

  const { data, error } = await supabase
    .schema(JUNCTIONS_SCHEMA)
    .from(JUNCTION_TABLES.THREAD_PARTICIPANT)
    .select('thread_id')
    .eq('user_id', userId);

  if (error) {
    console.error(`${LOG_PREFIX} Failed to get user threads:`, error);
    return [];
  }

  return extractThreadIds(data);
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
  UNIQUE_VIOLATION_CODE,
  JUNCTIONS_SCHEMA,
  JUNCTION_TABLES,
  PROPOSAL_ROLES,
  PARTICIPANT_ROLES,
  MESSAGE_TYPES,

  // Validation predicates
  isUniqueViolation,
  hasItems,

  // Row builders
  buildUserProposalRow,
  buildUserListingFavoriteRow,
  buildUserStorageItemRow,
  buildUserPreferredHoodRow,
  buildThreadMessageRow,
  buildThreadParticipantRow,

  // Result extractors
  extractMessageIds,
  extractThreadIds,
})
