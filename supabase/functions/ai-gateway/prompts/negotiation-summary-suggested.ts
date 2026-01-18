/**
 * Negotiation Summary - Suggested Proposal Prompt
 * Split Lease - AI Gateway
 *
 * Generates personalized summaries explaining why Split Lease is suggesting
 * a proposal to a guest, based on their history and preferences.
 */

import { registerPrompt } from "./_registry.ts";

registerPrompt({
  key: "negotiation-summary-suggested",
  name: "Suggested Proposal Summary for Guest",
  description:
    "Explains why Split Lease is suggesting a proposal based on guest's history",

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
