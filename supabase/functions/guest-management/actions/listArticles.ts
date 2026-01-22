/**
 * List Articles Action
 *
 * List all available knowledge base articles.
 * Optionally filter by category.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface ListArticlesPayload {
  category?: string;
  limit?: number;
  offset?: number;
}

interface ArticleItem {
  id: string;
  pageHeadline: string;
  pageHeadlineSubtext?: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

interface ListArticlesResult {
  articles: ArticleItem[];
  total: number;
  hasMore: boolean;
}

export async function handleListArticles(
  payload: ListArticlesPayload,
  supabase: SupabaseClient
): Promise<ListArticlesResult> {
  const { category, limit = 50, offset = 0 } = payload;

  console.log(`[listArticles] Listing articles (category: ${category || 'all'})`);

  // Build query
  let query = supabase
    .from('knowledge_article')
    .select('_id, page_headline, page_headline_subtext, category, created_at, updated_at', { count: 'exact' });

  if (category) {
    query = query.eq('category', category);
  }

  // Get results with pagination
  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[listArticles] Error:', error);
    throw new Error(`Failed to list articles: ${error.message}`);
  }

  const total = count || 0;
  const articles: ArticleItem[] = (data || []).map(a => ({
    id: a._id,
    pageHeadline: a.page_headline,
    pageHeadlineSubtext: a.page_headline_subtext,
    category: a.category,
    createdAt: a.created_at,
    updatedAt: a.updated_at
  }));

  console.log(`[listArticles] Found ${articles.length} articles (total: ${total})`);

  return {
    articles,
    total,
    hasMore: offset + articles.length < total
  };
}
