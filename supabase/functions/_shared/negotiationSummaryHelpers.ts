/**
 * Negotiation Summary Helpers
 * Split Lease - Edge Functions
 *
 * Generates AI-powered summaries for proposal negotiations.
 * Uses the ai-gateway Edge Function for text generation.
 *
 * NO FALLBACK PRINCIPLE: Returns null on AI errors, callers should use
 * default messages when AI summary is not available.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface SuggestedProposalContext {
  guestFirstName: string;
  guestBio: string;
  needForSpace: string;
  listingName: string;
  listingBorough: string;
  reservationWeeks: number;
  moveInStart: string;
  moveInEnd: string;
  selectedDays: string;
  nightlyPrice: number;
  totalPrice: number;
  previousProposals?: string; // Formatted string of previous proposals
}

export interface CounterOfferContext {
  originalWeeks: number;
  originalMoveIn: string;
  originalDays: string;
  originalNightlyPrice: number;
  originalTotalPrice: number;
  counterWeeks: number;
  counterMoveIn: string;
  counterDays: string;
  counterNightlyPrice: number;
  counterTotalPrice: number;
}

export interface HostProposalContext {
  listingName: string;
  reservationWeeks: number;
  moveInStart: string;
  moveInEnd: string;
  selectedDays: string;
  hostCompensation: number;
  totalCompensation: number;
  guestComment?: string;
}

// ============================================
// AI SUMMARY GENERATION FUNCTIONS
// ============================================

/**
 * Generate AI summary for a Split Lease suggested proposal
 */
export async function generateSuggestedProposalSummary(
  supabase: SupabaseClient,
  context: SuggestedProposalContext
): Promise<string | null> {
  return callAIGateway(supabase, "negotiation-summary-suggested", context);
}

/**
 * Generate AI summary for a host counteroffer
 */
export async function generateCounterOfferSummary(
  supabase: SupabaseClient,
  context: CounterOfferContext
): Promise<string | null> {
  return callAIGateway(supabase, "negotiation-summary-counteroffer", context);
}

/**
 * Generate AI summary of proposal for host
 */
export async function generateHostProposalSummary(
  supabase: SupabaseClient,
  context: HostProposalContext
): Promise<string | null> {
  return callAIGateway(supabase, "negotiation-summary-host", context);
}

// ============================================
// INTERNAL: AI GATEWAY COMMUNICATION
// ============================================

/**
 * Internal: Call AI Gateway with prompt key and variables
 */
async function callAIGateway(
  supabase: SupabaseClient,
  promptKey: string,
  variables: Record<string, unknown>
): Promise<string | null> {
  try {
    console.log(`[negotiationSummary] Calling AI Gateway with prompt: ${promptKey}`);

    const { data, error } = await supabase.functions.invoke("ai-gateway", {
      body: {
        action: "complete",
        payload: {
          prompt_key: promptKey,
          variables,
        },
      },
    });

    if (error) {
      console.error(`[negotiationSummary] AI Gateway error for ${promptKey}:`, error);
      return null;
    }

    const content = data?.data?.content || data?.response || null;

    if (content) {
      console.log(`[negotiationSummary] AI summary generated (${content.length} chars)`);
    } else {
      console.warn(`[negotiationSummary] AI Gateway returned no content for ${promptKey}`);
    }

    return content;
  } catch (err) {
    console.error(`[negotiationSummary] Failed to generate summary:`, err);
    return null;
  }
}

// ============================================
// HELPER: FETCH PREVIOUS PROPOSALS
// ============================================

/**
 * Format previous proposals for the suggested proposal prompt
 * Fetches the guest's last 3 proposals (excluding current) and formats them
 */
export async function formatPreviousProposals(
  supabase: SupabaseClient,
  guestId: string,
  excludeProposalId?: string
): Promise<string> {
  try {
    let query = supabase
      .from("proposal")
      .select(`
        _id,
        "Reservation Span (Weeks)",
        "Days Selected",
        "proposal nightly price",
        "Total Price for Reservation (guest)",
        Listing (
          "Name",
          "Location - Borough"
        )
      `)
      .eq('"Guest"', guestId)
      .order('"Created Date"', { ascending: false })
      .limit(4); // Fetch one extra in case we need to exclude current

    if (excludeProposalId) {
      query = query.neq("_id", excludeProposalId);
    }

    const { data: proposals, error } = await query;

    if (error) {
      console.error(`[negotiationSummary] Failed to fetch previous proposals:`, error);
      return "";
    }

    if (!proposals || proposals.length === 0) {
      return "";
    }

    // Take only first 3 after filtering
    const recentProposals = proposals.slice(0, 3);

    return recentProposals.map((p, i) => {
      const listing = p.Listing as { Name?: string; "Location - Borough"?: string } | null;
      const weeks = p["Reservation Span (Weeks)"] || "?";
      const nightlyPrice = p["proposal nightly price"] || 0;
      const listingName = listing?.Name || "Unknown listing";
      return `${i + 1}. ${listingName} - ${weeks} weeks, $${nightlyPrice}/night`;
    }).join("\n");
  } catch (err) {
    console.error(`[negotiationSummary] Error formatting previous proposals:`, err);
    return "";
  }
}

// ============================================
// HELPER: DAY FORMATTING
// ============================================

/**
 * Day names for formatting (0=Sunday)
 */
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Convert day indices to readable range string
 * Input: [0, 1, 2, 5, 6] (0=Sunday)
 * Output: "Friday through Tuesday" (detects wrap-around week stays)
 *
 * Special cases:
 * - Empty/null: "No days selected"
 * - Full week: "Full week"
 * - Single day: Day name
 * - Two non-consecutive: "Day1 and Day2"
 * - Consecutive: "Day1 through DayN"
 */
export function formatDaysAsRange(dayIndices: number[]): string {
  if (!dayIndices || dayIndices.length === 0) return "No days selected";
  if (dayIndices.length === 7) return "Full week";

  const sorted = [...dayIndices].sort((a, b) => a - b);
  const names = sorted.map(d => DAY_NAMES[d]);

  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;

  // Check if consecutive (simple linear case)
  const isSimpleConsecutive = sorted.every((val, idx) =>
    idx === 0 || val === sorted[idx - 1] + 1
  );

  if (isSimpleConsecutive) {
    return `${names[0]} through ${names[names.length - 1]}`;
  }

  // Check for wrap-around consecutive (e.g., Fri-Sat-Sun-Mon = [0, 1, 5, 6])
  // This happens when the stay spans across Saturday/Sunday
  const hasWeekWrap = sorted.includes(0) && sorted.includes(6);

  if (hasWeekWrap) {
    // Find the gap to determine actual check-in day
    // Gap is the missing days between non-consecutive elements
    let gapStart = -1;
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i + 1] - sorted[i] > 1) {
        gapStart = i;
        break;
      }
    }

    if (gapStart >= 0) {
      // Reorder: days after gap first, then days before gap
      const checkInDay = sorted[gapStart + 1]; // First day after gap is check-in
      const checkOutDay = sorted[gapStart]; // Last day before gap is check-out
      return `${DAY_NAMES[checkInDay]} through ${DAY_NAMES[checkOutDay]}`;
    }
  }

  // Fallback: just show first through last of sorted
  return `${names[0]} through ${names[names.length - 1]}`;
}

/**
 * Format a date string for display
 * Converts ISO date to readable format
 */
export function formatDateForDisplay(dateStr: string): string {
  if (!dateStr) return "TBD";

  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}
