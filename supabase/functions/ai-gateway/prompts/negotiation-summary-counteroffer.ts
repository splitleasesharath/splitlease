/**
 * Negotiation Summary - Counteroffer Prompt
 * Split Lease - AI Gateway
 *
 * Generates summaries explaining host's counteroffer changes to the guest,
 * highlighting what changed between the original proposal and the counteroffer.
 */

import { registerPrompt } from "./_registry.ts";

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
