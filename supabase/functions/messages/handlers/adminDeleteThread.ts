/**
 * Admin Delete Thread Handler
 * Split Lease - Messages Edge Function
 *
 * Soft-deletes a thread by marking it and all its messages as deleted
 * Data is recoverable (soft delete, not hard delete)
 *
 * NO FALLBACK PRINCIPLE: Throws if database operations fail
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AuthenticationError, ValidationError } from '../../_shared/errors.ts';

interface AdminDeleteThreadPayload {
  threadId: string;
}

interface AdminDeleteThreadResult {
  deletedThreadId: string;
  deletedMessageCount: number;
}

/**
 * Verify that the current user is an admin
 */
async function verifyAdminRole(
  supabaseAdmin: SupabaseClient,
  user: { id: string; email: string }
): Promise<boolean> {
  console.log('[adminDeleteThread] Verifying admin role for:', user.email);

  const { data: userData, error } = await supabaseAdmin
    .from('user')
    .select('_id, "Toggle - Is Admin"')
    .ilike('email', user.email)
    .maybeSingle();

  if (error) {
    console.error('[adminDeleteThread] Admin check query failed:', error.message);
    return false;
  }

  return userData?.['Toggle - Is Admin'] === true;
}

/**
 * Log admin action for audit trail
 */
async function logAdminAction(
  supabaseAdmin: SupabaseClient,
  user: { id: string; email: string },
  action: string,
  targetId: string,
  details: Record<string, unknown>
): Promise<void> {
  try {
    // Check if admin_audit_log table exists before inserting
    const { error } = await supabaseAdmin
      .from('admin_audit_log')
      .insert({
        admin_email: user.email,
        action,
        target_id: targetId,
        target_type: 'thread',
        details: JSON.stringify(details),
        created_at: new Date().toISOString(),
      });

    if (error) {
      // Table might not exist - just log to console
      console.log('[adminDeleteThread] Audit log (table may not exist):', {
        admin: user.email,
        action,
        targetId,
        details,
      });
    }
  } catch {
    // Audit logging should not block the operation
    console.log('[adminDeleteThread] Audit log entry:', {
      admin: user.email,
      action,
      targetId,
      details,
    });
  }
}

/**
 * Handle admin_delete_thread action
 * Soft-deletes a thread and all its messages (recoverable)
 */
export async function handleAdminDeleteThread(
  supabaseAdmin: SupabaseClient,
  payload: AdminDeleteThreadPayload,
  user: { id: string; email: string }
): Promise<AdminDeleteThreadResult> {
  console.log('[adminDeleteThread] ========== ADMIN DELETE THREAD ==========');
  console.log('[adminDeleteThread] User:', user.email);
  console.log('[adminDeleteThread] Thread ID:', payload.threadId);

  // Step 1: Validate payload
  if (!payload.threadId) {
    throw new ValidationError('Thread ID is required');
  }

  // Step 2: Verify admin role
  const isAdmin = await verifyAdminRole(supabaseAdmin, user);
  if (!isAdmin) {
    console.error('[adminDeleteThread] User is not an admin');
    throw new AuthenticationError('You do not have permission to delete threads.');
  }

  // Step 3: Verify thread exists
  const { data: thread, error: threadError } = await supabaseAdmin
    .from('thread')
    .select('_id, "Thread Subject", "-Host User", "-Guest User"')
    .eq('_id', payload.threadId)
    .maybeSingle();

  if (threadError) {
    console.error('[adminDeleteThread] Thread lookup failed:', threadError.message);
    throw new Error(`Failed to find thread: ${threadError.message}`);
  }

  if (!thread) {
    throw new ValidationError('Thread not found');
  }

  console.log('[adminDeleteThread] Found thread:', thread['Thread Subject'] || thread._id);

  // Step 4: Soft-delete all messages in the thread
  // Set "is deleted (is hidden)" = true for all messages
  const { data: deletedMessages, error: msgDeleteError } = await supabaseAdmin
    .from('_message')
    .update({ 'is deleted (is hidden)': true })
    .eq('"Associated Thread/Conversation"', payload.threadId)
    .select('_id');

  if (msgDeleteError) {
    console.error('[adminDeleteThread] Message soft-delete failed:', msgDeleteError.message);
    throw new Error(`Failed to delete messages: ${msgDeleteError.message}`);
  }

  const deletedMessageCount = deletedMessages?.length || 0;
  console.log('[adminDeleteThread] Soft-deleted', deletedMessageCount, 'messages');

  // Step 5: Soft-delete the thread
  // We'll add a "deleted_at" field or similar marker
  // Since the thread table may not have a deleted field, we can:
  // 1. Add it via migration (preferred)
  // 2. Use a naming convention in Thread Subject
  // For now, we'll prepend [DELETED] to the subject as a soft-delete marker
  const deletedSubject = thread['Thread Subject']?.startsWith('[DELETED]')
    ? thread['Thread Subject']
    : `[DELETED] ${thread['Thread Subject'] || 'Unnamed Thread'}`;

  const { error: threadDeleteError } = await supabaseAdmin
    .from('thread')
    .update({ 'Thread Subject': deletedSubject })
    .eq('_id', payload.threadId);

  if (threadDeleteError) {
    console.error('[adminDeleteThread] Thread soft-delete failed:', threadDeleteError.message);
    throw new Error(`Failed to delete thread: ${threadDeleteError.message}`);
  }

  // Step 6: Log the admin action
  await logAdminAction(supabaseAdmin, user, 'delete_thread', payload.threadId, {
    originalSubject: thread['Thread Subject'],
    messageCount: deletedMessageCount,
    hostUserId: thread['-Host User'],
    guestUserId: thread['-Guest User'],
  });

  console.log('[adminDeleteThread] Thread soft-deleted successfully');
  console.log('[adminDeleteThread] ========== ADMIN DELETE THREAD COMPLETE ==========');

  return {
    deletedThreadId: payload.threadId,
    deletedMessageCount,
  };
}
