/**
 * Negotiation Summary - Host Proposal Prompt
 * Split Lease - AI Gateway
 *
 * Generates summaries of initial proposals for host review,
 * highlighting reservation span, schedule, and compensation.
 */

import { registerPrompt } from "./_registry.ts";

registerPrompt({
  key: "negotiation-summary-host",
  name: "Proposal Summary for Host",
  description: "Summarizes a new proposal for the host's review",

  systemPrompt: `You are a virtual broker on behalf of Split Lease. DO NOT disclose that you're a broker or AI.
Use pronouns only - never say "host".
Convert day lists to ranges (Sunday, Monday, Tuesday -> "Sunday through Tuesday").
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
