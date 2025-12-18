/**
 * Junction Table Helpers
 * Split Lease - Supabase Edge Functions
 *
 * Helper functions for dual-writing to junction tables during JSONB→junction migration.
 * These helpers maintain backward compatibility by continuing JSONB writes
 * while also writing to the new normalized junction tables.
 *
 * Junction tables are in the `junctions` schema.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================
// USER PROPOSAL JUNCTION
// ============================================

/**
 * Add a proposal to user's junction table
 * Writes to junctions.user_proposal
 */
export async function addUserProposal(
  supabase: SupabaseClient,
  userId: string,
  proposalId: string,
  role: 'guest' | 'host'
): Promise<void> {
  console.log(`[junctionHelpers] Adding user_proposal: user=${userId}, proposal=${proposalId}, role=${role}`);

  const { error } = await supabase
    .schema('junctions')
    .from('user_proposal')
    .insert({
      user_id: userId,
      proposal_id: proposalId,
      role: role,
    })
    .select()
    .single();

  if (error) {
    // Ignore duplicate key errors (junction already exists)
    if (error.code === '23505') {
      console.log(`[junctionHelpers] user_proposal already exists (idempotent)`);
      return;
    }
    console.error(`[junctionHelpers] Failed to add user_proposal:`, error);
    // Non-blocking - log but don't throw
  } else {
    console.log(`[junctionHelpers] user_proposal added successfully`);
  }
}

/**
 * Remove a proposal from user's junction table
 * Deletes from junctions.user_proposal
 */
export async function removeUserProposal(
  supabase: SupabaseClient,
  userId: string,
  proposalId: string
): Promise<void> {
  console.log(`[junctionHelpers] Removing user_proposal: user=${userId}, proposal=${proposalId}`);

  const { error } = await supabase
    .schema('junctions')
    .from('user_proposal')
    .delete()
    .eq('user_id', userId)
    .eq('proposal_id', proposalId);

  if (error) {
    console.error(`[junctionHelpers] Failed to remove user_proposal:`, error);
    // Non-blocking
  } else {
    console.log(`[junctionHelpers] user_proposal removed successfully`);
  }
}

// ============================================
// USER LISTING FAVORITE JUNCTION
// ============================================

/**
 * Add a listing to user's favorites junction table
 * Writes to junctions.user_listing_favorite
 */
export async function addUserListingFavorite(
  supabase: SupabaseClient,
  userId: string,
  listingId: string
): Promise<void> {
  console.log(`[junctionHelpers] Adding user_listing_favorite: user=${userId}, listing=${listingId}`);

  const { error } = await supabase
    .schema('junctions')
    .from('user_listing_favorite')
    .insert({
      user_id: userId,
      listing_id: listingId,
    })
    .select()
    .single();

  if (error) {
    // Ignore duplicate key errors (junction already exists)
    if (error.code === '23505') {
      console.log(`[junctionHelpers] user_listing_favorite already exists (idempotent)`);
      return;
    }
    console.error(`[junctionHelpers] Failed to add user_listing_favorite:`, error);
    // Non-blocking
  } else {
    console.log(`[junctionHelpers] user_listing_favorite added successfully`);
  }
}

/**
 * Remove a listing from user's favorites junction table
 * Deletes from junctions.user_listing_favorite
 */
export async function removeUserListingFavorite(
  supabase: SupabaseClient,
  userId: string,
  listingId: string
): Promise<void> {
  console.log(`[junctionHelpers] Removing user_listing_favorite: user=${userId}, listing=${listingId}`);

  const { error } = await supabase
    .schema('junctions')
    .from('user_listing_favorite')
    .delete()
    .eq('user_id', userId)
    .eq('listing_id', listingId);

  if (error) {
    console.error(`[junctionHelpers] Failed to remove user_listing_favorite:`, error);
    // Non-blocking
  } else {
    console.log(`[junctionHelpers] user_listing_favorite removed successfully`);
  }
}

// ============================================
// USER STORAGE ITEM JUNCTION
// ============================================

/**
 * Set user's commonly stored items (replaces all)
 * Writes to junctions.user_storage_item
 */
export async function setUserStorageItems(
  supabase: SupabaseClient,
  userId: string,
  storageIds: string[]
): Promise<void> {
  console.log(`[junctionHelpers] Setting user_storage_item: user=${userId}, items=${storageIds.length}`);

  // Delete existing items first
  const { error: deleteError } = await supabase
    .schema('junctions')
    .from('user_storage_item')
    .delete()
    .eq('user_id', userId);

  if (deleteError) {
    console.error(`[junctionHelpers] Failed to clear user_storage_item:`, deleteError);
  }

  // Insert new items
  if (storageIds.length > 0) {
    const rows = storageIds.map(storageId => ({
      user_id: userId,
      storage_id: storageId,
    }));

    const { error: insertError } = await supabase
      .schema('junctions')
      .from('user_storage_item')
      .insert(rows);

    if (insertError) {
      console.error(`[junctionHelpers] Failed to insert user_storage_item:`, insertError);
    } else {
      console.log(`[junctionHelpers] user_storage_item set successfully (${rows.length} items)`);
    }
  }
}

// ============================================
// USER PREFERRED HOOD JUNCTION
// ============================================

/**
 * Set user's preferred neighborhoods (replaces all)
 * Writes to junctions.user_preferred_hood
 */
export async function setUserPreferredHoods(
  supabase: SupabaseClient,
  userId: string,
  hoodIds: string[]
): Promise<void> {
  console.log(`[junctionHelpers] Setting user_preferred_hood: user=${userId}, hoods=${hoodIds.length}`);

  // Delete existing items first
  const { error: deleteError } = await supabase
    .schema('junctions')
    .from('user_preferred_hood')
    .delete()
    .eq('user_id', userId);

  if (deleteError) {
    console.error(`[junctionHelpers] Failed to clear user_preferred_hood:`, deleteError);
  }

  // Insert new items with preference order
  if (hoodIds.length > 0) {
    const rows = hoodIds.map((hoodId, index) => ({
      user_id: userId,
      hood_id: hoodId,
      preference_order: index + 1,
    }));

    const { error: insertError } = await supabase
      .schema('junctions')
      .from('user_preferred_hood')
      .insert(rows);

    if (insertError) {
      console.error(`[junctionHelpers] Failed to insert user_preferred_hood:`, insertError);
    } else {
      console.log(`[junctionHelpers] user_preferred_hood set successfully (${rows.length} hoods)`);
    }
  }
}

// ============================================
// BATCH FAVORITES OPERATIONS
// ============================================

/**
 * Add multiple listings to user's favorites junction table
 * Writes to junctions.user_listing_favorite (batch)
 */
export async function addUserListingFavoritesBatch(
  supabase: SupabaseClient,
  userId: string,
  listingIds: string[]
): Promise<void> {
  if (listingIds.length === 0) return;

  console.log(`[junctionHelpers] Batch adding user_listing_favorite: user=${userId}, listings=${listingIds.length}`);

  const rows = listingIds.map(listingId => ({
    user_id: userId,
    listing_id: listingId,
  }));

  const { error } = await supabase
    .schema('junctions')
    .from('user_listing_favorite')
    .upsert(rows, {
      onConflict: 'user_id,listing_id',
      ignoreDuplicates: true
    });

  if (error) {
    console.error(`[junctionHelpers] Failed to batch add user_listing_favorite:`, error);
  } else {
    console.log(`[junctionHelpers] user_listing_favorite batch added successfully`);
  }
}

// ============================================
// THREAD MESSAGE JUNCTION
// ============================================

export type MessageType = 'all' | 'slbot_to_host' | 'slbot_to_guest' | 'host_sent' | 'guest_sent';

/**
 * Add a message to thread junction
 * Usually auto-populated by trigger, but available for manual use
 */
export async function addThreadMessage(
  supabase: SupabaseClient,
  threadId: string,
  messageId: string,
  messageType: MessageType = 'all'
): Promise<void> {
  console.log(`[junctionHelpers] Adding thread_message: thread=${threadId}, message=${messageId}, type=${messageType}`);

  const { error } = await supabase
    .schema('junctions')
    .from('thread_message')
    .insert({
      thread_id: threadId,
      message_id: messageId,
      message_type: messageType,
    });

  if (error) {
    // Ignore duplicate key errors (junction already exists via trigger)
    if (error.code === '23505') {
      console.log(`[junctionHelpers] thread_message already exists (idempotent)`);
      return;
    }
    console.error(`[junctionHelpers] Failed to add thread_message:`, error);
  } else {
    console.log(`[junctionHelpers] thread_message added successfully`);
  }
}

/**
 * Get messages for a thread filtered by type
 * Useful for visibility-filtered queries
 */
export async function getThreadMessagesByType(
  supabase: SupabaseClient,
  threadId: string,
  messageTypes: MessageType[]
): Promise<string[]> {
  console.log(`[junctionHelpers] Getting thread_messages: thread=${threadId}, types=${messageTypes.join(',')}`);

  const { data, error } = await supabase
    .schema('junctions')
    .from('thread_message')
    .select('message_id')
    .eq('thread_id', threadId)
    .in('message_type', messageTypes);

  if (error) {
    console.error(`[junctionHelpers] Failed to get thread_messages:`, error);
    return [];
  }

  return data?.map(row => row.message_id) || [];
}

// ============================================
// THREAD PARTICIPANT JUNCTION
// ============================================

/**
 * Add a participant to thread junction
 * Usually auto-populated by trigger, but available for manual use
 */
export async function addThreadParticipant(
  supabase: SupabaseClient,
  threadId: string,
  userId: string,
  role: 'host' | 'guest'
): Promise<void> {
  console.log(`[junctionHelpers] Adding thread_participant: thread=${threadId}, user=${userId}, role=${role}`);

  const { error } = await supabase
    .schema('junctions')
    .from('thread_participant')
    .insert({
      thread_id: threadId,
      user_id: userId,
      role: role,
    });

  if (error) {
    // Ignore duplicate key errors (junction already exists via trigger)
    if (error.code === '23505') {
      console.log(`[junctionHelpers] thread_participant already exists (idempotent)`);
      return;
    }
    console.error(`[junctionHelpers] Failed to add thread_participant:`, error);
  } else {
    console.log(`[junctionHelpers] thread_participant added successfully`);
  }
}

/**
 * Get all threads for a user via junction table
 * More efficient than OR queries on thread table
 */
export async function getUserThreadIds(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  console.log(`[junctionHelpers] Getting user threads: user=${userId}`);

  const { data, error } = await supabase
    .schema('junctions')
    .from('thread_participant')
    .select('thread_id')
    .eq('user_id', userId);

  if (error) {
    console.error(`[junctionHelpers] Failed to get user threads:`, error);
    return [];
  }

  return data?.map(row => row.thread_id) || [];
}
