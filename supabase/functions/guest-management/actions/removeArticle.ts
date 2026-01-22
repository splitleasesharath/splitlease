/**
 * Remove Article Action
 *
 * Remove a knowledge base article assignment from a guest.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface RemoveArticlePayload {
  guestId: string;
  articleId: string;
}

interface RemoveArticleResult {
  success: boolean;
  guestId: string;
  articleId: string;
  removedAt: string;
}

export async function handleRemoveArticle(
  payload: RemoveArticlePayload,
  supabase: SupabaseClient
): Promise<RemoveArticleResult> {
  const { guestId, articleId } = payload;

  if (!guestId) {
    throw new Error('guestId is required');
  }
  if (!articleId) {
    throw new Error('articleId is required');
  }

  console.log(`[removeArticle] Removing article ${articleId} from guest ${guestId}`);

  // Find the assignment
  const { data: existing, error: findError } = await supabase
    .from('guest_knowledge_assignment')
    .select('_id')
    .eq('guest_id', guestId)
    .eq('article_id', articleId)
    .maybeSingle();

  if (findError) {
    console.error('[removeArticle] Find error:', findError);
    throw new Error(`Failed to find assignment: ${findError.message}`);
  }

  if (!existing) {
    throw new Error('Assignment not found');
  }

  // Delete the assignment
  const { error: deleteError } = await supabase
    .from('guest_knowledge_assignment')
    .delete()
    .eq('_id', existing._id);

  if (deleteError) {
    console.error('[removeArticle] Delete error:', deleteError);
    throw new Error(`Failed to remove assignment: ${deleteError.message}`);
  }

  console.log(`[removeArticle] Successfully removed assignment`);

  return {
    success: true,
    guestId,
    articleId,
    removedAt: new Date().toISOString()
  };
}
