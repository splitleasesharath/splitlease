# AI-Powered Negotiation Summary Implementation Plan

**Created**: 2026-01-16 01:05:00
**Status**: Ready for Implementation
**Complexity**: Medium-High (Multi-file, AI integration)

---

## Overview

Implement AI-powered negotiation summaries that generate personalized messages when:
1. **Split Lease suggests a proposal** to a guest (explains WHY this listing matches their needs)
2. **Host sends a counteroffer** to guest (explains what changed)
3. **Initial proposal submitted** to host (summarizes the proposal for host review)

This mirrors the Bubble `CORE-create-summary-of-proposal` workflow but implemented natively in Supabase Edge Functions.

---

## Requirements (from Bubble Workflow)

### Scenario 1: Split Lease Suggested Proposal → Guest
**Trigger**: Status = "Proposal Submitted for guest by Split Lease - Pending Confirmation" OR "Awaiting Rental Application"
**Recipient**: Guest
**Content Should Include**:
- Why Split Lease is suggesting this listing
- Comparison with guest's previous 3 proposals (days, pricing, boroughs)
- Guest's bio/needs matched to listing
- Clear CTA to accept/confirm or discard

### Scenario 2: Host Counteroffer → Guest
**Trigger**: Status = "Host Counteroffer Submitted / Awaiting Guest Review"
**Recipient**: Guest
**Content Should Include**:
- Summary of DIFFERENCES between original proposal and counteroffer
- Highlight price changes (green for decrease, red for increase)
- New move-in date, days selected, duration if changed

### Scenario 3: Initial Proposal → Host (Weekly/Nightly/Monthly)
**Trigger**: Status order ≤ 1 (initial submission)
**Recipient**: Host
**Content Should Include**:
- Reservation span in weeks
- Move-in date range
- Selected days formatted as range (e.g., "Friday through Tuesday")
- Price per night/week and total compensation

---

## Architecture Decision

**Approach**: Enhance the existing `create_suggested.ts` action to call the AI gateway asynchronously after proposal creation, then update the SplitBot message with the AI-generated summary.

**Why not a separate negotiation_summary table?**
- The summary is transient messaging content, not persistent data
- Storing in messages keeps the conversation context intact
- Simpler architecture, no additional schema migration needed

---

## Implementation Steps

### Phase 1: Create AI Prompts (ai-gateway)

#### File: `supabase/functions/ai-gateway/prompts/negotiation-summary-suggested.ts`

```typescript
// Prompt for Split Lease suggested proposals to guests
registerPrompt({
  key: "negotiation-summary-suggested",
  name: "Suggested Proposal Summary for Guest",
  description: "Explains why Split Lease is suggesting a proposal based on guest's history",

  systemPrompt: `You are a virtual broker on behalf of Split Lease. DO NOT disclose that you're a broker or AI.
Use pronouns only - never refer to the user as "guest".
Keep responses concise but informative.
Format key information with [b][/b] tags for bold.
All prices in dollars with $ prefix.`,

  userPromptTemplate: `Split Lease found a great match for {{guestFirstName}}. Create a personalized summary explaining why.

SUGGESTED PROPOSAL:
- Listing: {{listingName}} in {{listingBorough}}
- Reservation: {{reservationWeeks}} weeks
- Move-in window: {{moveInStart}} to {{moveInEnd}}
- Weekly schedule: {{selectedDays}}
- Price per night: ${{nightlyPrice}}
- Total price: ${{totalPrice}}

GUEST'S PREVIOUS PROPOSALS (for comparison):
{{#if previousProposals}}
{{previousProposals}}
{{else}}
No previous proposals on record.
{{/if}}

GUEST PROFILE:
- About: {{guestBio}}
- Need for space: {{needForSpace}}

Create a 2-3 sentence summary that:
1. Highlights why this listing matches their needs/preferences
2. Mentions the key terms (days, price, duration)
3. Ends with encouragement to confirm or let us know if it's not a fit

Output ONLY the summary text, nothing else.`,

  defaults: {
    model: "gpt-4o-mini",
    temperature: 0.7,
    maxTokens: 300,
  },
  responseFormat: "text",
});
```

#### File: `supabase/functions/ai-gateway/prompts/negotiation-summary-counteroffer.ts`

```typescript
// Prompt for host counteroffer summaries to guests
registerPrompt({
  key: "negotiation-summary-counteroffer",
  name: "Counteroffer Summary for Guest",
  description: "Explains host's counteroffer changes to the guest",

  systemPrompt: `You are a virtual broker on behalf of Split Lease. DO NOT disclose that you're a broker or AI.
Use pronouns only - never say "guest".
Focus ONLY on what changed between original and counteroffer.
Use [b][/b] for bold, [color=#ff0000][/color] for price increases, [color=#008000][/color] for decreases.`,

  userPromptTemplate: `The host has made a counteroffer. Summarize the changes.

ORIGINAL PROPOSAL:
- Duration: {{originalWeeks}} weeks
- Move-in: {{originalMoveIn}}
- Days: {{originalDays}}
- Price/night: ${{originalNightlyPrice}}
- Total: ${{originalTotalPrice}}

HOST'S COUNTEROFFER:
- Duration: {{counterWeeks}} weeks
- Move-in: {{counterMoveIn}}
- Days: {{counterDays}}
- Price/night: ${{counterNightlyPrice}}
- Total: ${{counterTotalPrice}}

Summarize ONLY what changed. If price increased, use red color tag. If decreased, use green.
Keep it brief - 2-3 sentences max.
Output ONLY the summary text.`,

  defaults: {
    model: "gpt-4o-mini",
    temperature: 0.5,
    maxTokens: 250,
  },
  responseFormat: "text",
});
```

#### File: `supabase/functions/ai-gateway/prompts/negotiation-summary-host.ts`

```typescript
// Prompt for initial proposal summaries to hosts
registerPrompt({
  key: "negotiation-summary-host",
  name: "Proposal Summary for Host",
  description: "Summarizes a new proposal for the host's review",

  systemPrompt: `You are a virtual broker on behalf of Split Lease. DO NOT disclose that you're a broker or AI.
Use pronouns only - never say "host".
Convert day lists to ranges (Sunday, Monday, Tuesday → "Sunday through Tuesday").
Format with [b][/b] for key info. All prices in dollars.`,

  userPromptTemplate: `A guest has submitted a proposal for {{listingName}}.

PROPOSAL DETAILS:
- Duration: {{reservationWeeks}} weeks
- Move-in window: {{moveInStart}} to {{moveInEnd}}
- Weekly schedule: {{selectedDays}}
- Your compensation per night: ${{hostCompensation}}
- Total compensation: ${{totalCompensation}}

{{#if guestComment}}
Guest's message: "{{guestComment}}"
{{/if}}

Create a brief summary (2-3 sentences) highlighting the reservation span, schedule, and compensation.
Convert the days to a range format (e.g., "Friday through Monday" not "Friday, Saturday, Sunday, Monday").
Output ONLY the summary text.`,

  defaults: {
    model: "gpt-4o-mini",
    temperature: 0.6,
    maxTokens: 200,
  },
  responseFormat: "text",
});
```

### Phase 2: Register Prompts in AI Gateway

#### File: `supabase/functions/ai-gateway/index.ts`

Add imports after existing prompt imports:

```typescript
// After line ~15 (existing prompt imports)
import "./prompts/negotiation-summary-suggested.ts";
import "./prompts/negotiation-summary-counteroffer.ts";
import "./prompts/negotiation-summary-host.ts";
```

These should NOT be added to `PUBLIC_PROMPTS` - they require authentication.

### Phase 3: Create Summary Generation Helper

#### File: `supabase/functions/_shared/negotiationSummaryHelpers.ts` (NEW)

```typescript
/**
 * Negotiation Summary Helpers
 *
 * Generates AI-powered summaries for proposal negotiations.
 * Uses the ai-gateway Edge Function for text generation.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

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

/**
 * Internal: Call AI Gateway with prompt key and variables
 */
async function callAIGateway(
  supabase: SupabaseClient,
  promptKey: string,
  variables: Record<string, unknown>
): Promise<string | null> {
  try {
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

    return data?.data?.content || null;
  } catch (err) {
    console.error(`[negotiationSummary] Failed to generate summary:`, err);
    return null;
  }
}

/**
 * Format previous proposals for the suggested proposal prompt
 */
export async function formatPreviousProposals(
  supabase: SupabaseClient,
  guestId: string,
  excludeProposalId?: string
): Promise<string> {
  const { data: proposals } = await supabase
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
    .eq("Guest", guestId)
    .neq("_id", excludeProposalId || "")
    .order("Created Date", { ascending: false })
    .limit(3);

  if (!proposals || proposals.length === 0) {
    return "";
  }

  return proposals.map((p, i) => {
    const listing = p.Listing as { Name?: string; "Location - Borough"?: string } | null;
    return `${i + 1}. ${listing?.Name || "Unknown"} - ${p["Reservation Span (Weeks)"]} weeks, $${p["proposal nightly price"]}/night`;
  }).join("\n");
}

/**
 * Convert day indices to readable range string
 * Input: [0, 1, 2, 5, 6] (0=Sunday)
 * Output: "Friday through Tuesday"
 */
export function formatDaysAsRange(dayIndices: number[]): string {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  if (!dayIndices || dayIndices.length === 0) return "No days selected";
  if (dayIndices.length === 7) return "Full week";

  const sorted = [...dayIndices].sort((a, b) => a - b);

  // Find the longest consecutive run considering week wrap-around
  // For simplicity, just list first and last for now
  // A more sophisticated version would detect actual ranges

  const names = sorted.map(d => dayNames[d]);

  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;

  // Check if consecutive
  const isConsecutive = sorted.every((val, idx) =>
    idx === 0 || val === sorted[idx - 1] + 1
  );

  if (isConsecutive) {
    return `${names[0]} through ${names[names.length - 1]}`;
  }

  // Non-consecutive: find the check-in day (first day) through check-out
  return `${names[0]} through ${names[names.length - 1]}`;
}
```

### Phase 4: Integrate into create_suggested.ts

#### File: `supabase/functions/proposal/actions/create_suggested.ts`

**Modify the SplitBot message section** (around line 520-580):

```typescript
// Import at top of file
import {
  generateSuggestedProposalSummary,
  formatPreviousProposals,
  formatDaysAsRange,
} from "../../_shared/negotiationSummaryHelpers.ts";

// ... existing code ...

// In the SplitBot messages section (after thread creation succeeds):

// Generate AI summary for suggested proposal (async, non-blocking)
let aiSummary: string | null = null;
if (status.includes("Split Lease")) {
  try {
    const previousProposals = await formatPreviousProposals(
      supabase,
      input.guestId,
      proposalId
    );

    aiSummary = await generateSuggestedProposalSummary(supabase, {
      guestFirstName: guestProfile?.firstName || "there",
      guestBio: input.aboutMe || guestData["About Me / Bio"] || "",
      needForSpace: input.needForSpace || guestData["need for Space"] || "",
      listingName: resolvedListingName,
      listingBorough: listingData["Location - Borough"] || "NYC",
      reservationWeeks: input.reservationSpanWeeks,
      moveInStart: input.moveInStartRange,
      moveInEnd: input.moveInEndRange,
      selectedDays: formatDaysAsRange(input.daysSelected),
      nightlyPrice: nightlyPrice,
      totalPrice: totalGuestPrice,
      previousProposals,
    });

    console.log(`[proposal:create_suggested] AI summary generated`);
  } catch (aiError) {
    console.warn(`[proposal:create_suggested] AI summary failed, using default:`, aiError);
  }
}

// Update guest message to use AI summary if available
const guestMessageBody = aiSummary ||
  guestCTA?.message ||
  getDefaultMessage(status, "guest", templateContext);
```

### Phase 5: Add to Proposal Update Action (for Counteroffers)

#### File: `supabase/functions/proposal/actions/update.ts`

When status changes to "Host Counteroffer Submitted", generate and send counteroffer summary:

```typescript
// After counteroffer fields are saved and status updated:

if (newStatus === "Host Counteroffer Submitted / Awaiting Guest Review") {
  const counterSummary = await generateCounterOfferSummary(supabase, {
    originalWeeks: proposal["Reservation Span (Weeks)"],
    originalMoveIn: proposal["Move in range start"],
    originalDays: formatDaysAsRange(proposal["Days Selected"]),
    originalNightlyPrice: proposal["proposal nightly price"],
    originalTotalPrice: proposal["Total Price for Reservation (guest)"],
    counterWeeks: input.hc_reservation_span_weeks || proposal["Reservation Span (Weeks)"],
    counterMoveIn: input.hc_move_in_date || proposal["Move in range start"],
    counterDays: formatDaysAsRange(input.hc_days_selected || proposal["Days Selected"]),
    counterNightlyPrice: input.hc_nightly_price || proposal["proposal nightly price"],
    counterTotalPrice: input.hc_total_price || proposal["Total Price for Reservation (guest)"],
  });

  // Send SplitBot message to guest with counteroffer summary
  if (counterSummary) {
    await createSplitBotMessage(supabase, {
      threadId: existingThreadId,
      messageBody: counterSummary,
      callToAction: "Respond to Counter Offer",
      visibleToHost: false,
      visibleToGuest: true,
      recipientUserId: proposal.Guest,
    });
  }
}
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/ai-gateway/prompts/negotiation-summary-suggested.ts` | CREATE | AI prompt for suggested proposals |
| `supabase/functions/ai-gateway/prompts/negotiation-summary-counteroffer.ts` | CREATE | AI prompt for counteroffers |
| `supabase/functions/ai-gateway/prompts/negotiation-summary-host.ts` | CREATE | AI prompt for host notifications |
| `supabase/functions/ai-gateway/index.ts` | MODIFY | Import new prompt files |
| `supabase/functions/_shared/negotiationSummaryHelpers.ts` | CREATE | Helper functions for summary generation |
| `supabase/functions/proposal/actions/create_suggested.ts` | MODIFY | Integrate AI summary for suggested proposals |
| `supabase/functions/proposal/actions/update.ts` | MODIFY | Integrate AI summary for counteroffers |

---

## Testing Plan

1. **Test AI Prompts Directly**:
   ```bash
   curl -X POST https://qzsmhgyojmwvtjmnrdea.supabase.co/functions/v1/ai-gateway \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{
       "action": "complete",
       "payload": {
         "prompt_key": "negotiation-summary-suggested",
         "variables": {
           "guestFirstName": "Terrence",
           "listingName": "One Platt | Studio",
           "reservationWeeks": 4,
           ...
         }
       }
     }'
   ```

2. **Test Create Suggested Proposal**:
   - Create proposal via `/_internal/create-suggested-proposal`
   - Verify AI-generated message appears in thread
   - Check message explains WHY this listing was suggested

3. **Test Counteroffer Flow**:
   - Submit counteroffer as host
   - Verify guest receives summary of changes
   - Check price changes are color-coded

---

## Deployment Checklist

- [ ] Create 3 new prompt files in `ai-gateway/prompts/`
- [ ] Import prompts in `ai-gateway/index.ts`
- [ ] Create `negotiationSummaryHelpers.ts`
- [ ] Modify `create_suggested.ts` to use AI summary
- [ ] Modify `update.ts` for counteroffer summaries
- [ ] Deploy ai-gateway: `supabase functions deploy ai-gateway --project-ref qzsmhgyojmwvtjmnrdea`
- [ ] Deploy proposal: `supabase functions deploy proposal --project-ref qzsmhgyojmwvtjmnrdea`
- [ ] Test all 3 scenarios
- [ ] Deploy to production after validation

---

## Dependencies

- OpenAI API key must be set in Supabase secrets (`OPENAI_API_KEY`)
- AI Gateway Edge Function must be deployed
- Proposal Edge Function must be deployed

---

## Rollback Plan

If AI summaries cause issues:
1. The code includes fallback to default messages if AI fails
2. Can quickly disable by commenting out AI call in `create_suggested.ts`
3. No database schema changes to revert

---

## References

- Requirements doc: `create summary of proposal - context extraction.md` (attached in conversation)
- AI Gateway structure: `supabase/functions/ai-gateway/`
- Existing prompts: `supabase/functions/ai-gateway/prompts/`
- CTA helpers: `supabase/functions/_shared/ctaHelpers.ts`
- Messaging helpers: `supabase/functions/_shared/messagingHelpers.ts`
