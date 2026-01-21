/**
 * Get Guest Action
 *
 * Retrieve a single guest with full profile details,
 * including assigned articles and recent history.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface GetGuestPayload {
  guestId: string;
  includeHistory?: boolean;
  includeArticles?: boolean;
}

interface GuestDetails {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  profilePhoto?: string;
  userType: string;
  birthDate?: string;
  personalAddress?: string;
  notes?: string;
  currentTimezone?: string;
  createdAt: string;
  updatedAt: string;
  history?: HistoryEntry[];
  assignedArticles?: AssignedArticle[];
}

interface HistoryEntry {
  date: string;
  page: string;
  actionType?: string;
}

interface AssignedArticle {
  id: string;
  pageHeadline: string;
  pageHeadlineSubtext?: string;
  assignedAt: string;
}

export async function handleGetGuest(
  payload: GetGuestPayload,
  supabase: SupabaseClient
): Promise<GuestDetails> {
  const { guestId, includeHistory = true, includeArticles = true } = payload;

  if (!guestId) {
    throw new Error('guestId is required');
  }

  console.log(`[getGuest] Fetching guest: ${guestId}`);

  // Fetch user details
  const { data: user, error: userError } = await supabase
    .from('user')
    .select('*')
    .eq('_id', guestId)
    .single();

  if (userError || !user) {
    console.error('[getGuest] User not found:', userError);
    throw new Error(`Guest not found: ${guestId}`);
  }

  const guest: GuestDetails = {
    _id: user._id,
    firstName: user['Name - First'] || '',
    lastName: user['Name - Last'] || '',
    email: user.email || '',
    phoneNumber: user['Phone Number'] || '',
    profilePhoto: user['Profile photo'],
    userType: user['User Type'] || 'guest',
    birthDate: user['Date of Birth'],
    personalAddress: user['Personal Address'],
    notes: user.notes,
    currentTimezone: user['Current Timezone'],
    createdAt: user['Created Date'] || new Date().toISOString(),
    updatedAt: user['Modified Date'] || new Date().toISOString()
  };

  // Fetch activity history if requested
  if (includeHistory) {
    const { data: historyData, error: historyError } = await supabase
      .from('guest_activity_history')
      .select('page_path, page_title, action_type, created_at')
      .eq('guest_id', guestId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (historyError) {
      console.warn('[getGuest] Failed to fetch history:', historyError);
    }

    guest.history = (historyData || []).map(h => ({
      date: h.created_at,
      page: h.page_title || h.page_path,
      actionType: h.action_type
    }));
  }

  // Fetch assigned articles if requested
  if (includeArticles) {
    const { data: assignmentData, error: assignmentError } = await supabase
      .from('guest_knowledge_assignment')
      .select(`
        assigned_at,
        knowledge_article (
          _id,
          page_headline,
          page_headline_subtext
        )
      `)
      .eq('guest_id', guestId);

    if (assignmentError) {
      console.warn('[getGuest] Failed to fetch assignments:', assignmentError);
    }

    guest.assignedArticles = (assignmentData || [])
      .filter(a => a.knowledge_article)
      .map(a => {
        const article = a.knowledge_article as Record<string, unknown>;
        return {
          id: article._id as string,
          pageHeadline: article.page_headline as string,
          pageHeadlineSubtext: article.page_headline_subtext as string | undefined,
          assignedAt: a.assigned_at
        };
      });
  }

  console.log(`[getGuest] Successfully fetched guest: ${guest.firstName} ${guest.lastName}`);

  return guest;
}
