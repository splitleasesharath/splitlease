/**
 * Negotiation Summary - Counteroffer Prompt
 * Split Lease - AI Gateway
 *
 * Generates summaries explaining host counteroffer changes to the guest,
 * highlighting what changed between the original proposal and the counteroffer.
 */

import { registerPrompt } from "./_registry.ts";

registerPrompt({
  key: "negotiation-summary-counteroffer",
  name: "Counteroffer Summary for Guest",
  description: "Explains host counteroffer changes to the guest",

  systemPrompt: `You are a virtual broker on behalf of Split Lease. DO NOT disclose that you are a broker or AI.
Use pronouns only - never say guest.
Focus ONLY on what changed between original and counteroffer.
Output plain text only - no formatting tags, no markdown, no HTML.
Use words like "increased" or "decreased" to indicate price changes.`,

  userPromptTemplate: `The host has made a counteroffer. Summarize the changes in plain text.

ORIGINAL PROPOSAL:
- Duration: {{originalWeeks}} weeks
- Move-in: {{originalMoveIn}}
- Days: {{originalDays}}
- Price/night: ${{originalNightlyPrice}}
- Total: ${{originalTotalPrice}}

HOST COUNTEROFFER:
- Duration: {{counterWeeks}} weeks
- Move-in: {{counterMoveIn}}
- Days: {{counterDays}}
- Price/night: ${{counterNightlyPrice}}
- Total: ${{counterTotalPrice}}

Summarize ONLY what changed. Keep it brief - bullet points with the changes.
Output ONLY the summary text, no introductions.`,

  defaults: {
    model: "gpt-4o-mini",
    temperature: 0.5,
    maxTokens: 250,
  },

  responseFormat: "text",
});
