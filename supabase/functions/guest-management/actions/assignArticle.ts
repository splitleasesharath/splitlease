/**
 * Assign Article Action
 *
 * Assign a knowledge base article to a guest.
 * Creates a many-to-many relationship.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface AssignArticlePayload {
  guestId: string;
  articleId: string;
}

interface AssignArticleResult {
  success: boolean;
  assignmentId: string;
  guestId: string;
  articleId: string;
  assignedAt: string;
}

export async function handleAssignArticle(
  payload: AssignArticlePayload,
  user: { id: string; email?: string },
  supabase: SupabaseClient
): Promise<AssignArticleResult> {
  const { guestId, articleId } = payload;

  if (!guestId) {
    throw new Error('guestId is required');
  }
  if (!articleId) {
    throw new Error('articleId is required');
  }

  console.log(`[assignArticle] Assigning article ${articleId} to guest ${guestId}`);

  // Verify guest exists
  const { data: guest, error: guestError } = await supabase
    .from('user')
    .select('_id')
    .eq('_id', guestId)
    .maybeSingle();

  if (guestError || !guest) {
    throw new Error(`Guest not found: ${guestId}`);
  }

  // Verify article exists
  const { data: article, error: articleError } = await supabase
    .from('knowledge_article')
    .select('_id')
    .eq('_id', articleId)
    .maybeSingle();

  if (articleError || !article) {
    throw new Error(`Article not found: ${articleId}`);
  }

  // Check if already assigned
  const { data: existing, error: existingError } = await supabase
    .from('guest_knowledge_assignment')
    .select('_id')
    .eq('guest_id', guestId)
    .eq('article_id', articleId)
    .maybeSingle();

  if (existingError) {
    console.warn('[assignArticle] Error checking existing assignment:', existingError);
  }

  if (existing) {
    throw new Error('Article is already assigned to this guest');
  }

  // Create assignment
  const assignmentId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { data: assignment, error: insertError } = await supabase
    .from('guest_knowledge_assignment')
    .insert({
      _id: assignmentId,
      guest_id: guestId,
      article_id: articleId,
      assigned_at: now,
      assigned_by: user.id
    })
    .select()
    .single();

  if (insertError) {
    console.error('[assignArticle] Insert error:', insertError);
    throw new Error(`Failed to assign article: ${insertError.message}`);
  }

  console.log(`[assignArticle] Successfully assigned article (assignment: ${assignmentId})`);

  return {
    success: true,
    assignmentId: assignment._id,
    guestId: assignment.guest_id,
    articleId: assignment.article_id,
    assignedAt: assignment.assigned_at
  };
}
