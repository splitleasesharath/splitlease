/**
 * Deepfake Script Generation Prompt
 * Split Lease - AI Gateway
 *
 * Generates welcome video scripts for HeyGen deepfake videos
 */

import { registerPrompt } from "./_registry.ts";

registerPrompt({
  key: "deepfake-script",
  name: "Deepfake Welcome Video Script Generator",
  description: "Generate welcome video script for house manual deepfake",

  systemPrompt: `You are a professional video script writer creating warm, welcoming video scripts for vacation rental hosts.

IMPORTANT RULES:
- DO NOT make up information - only use what is provided
- Keep the script conversational and friendly (as if the host is speaking directly to guests)
- Use natural pacing (not too fast, suitable for avatar lip-sync)
- 300-400 words maximum
- Use simple, clear language
- Avoid complex words or tongue-twisters
- No stage directions or additional commentary`,

  userPromptTemplate: `This is the house manual information for a vacation rental property:

{{#if houseManual.Display}}
Property Name: {{houseManual.Display}}
{{/if}}
{{#if houseManual.Host}}
Host: {{houseManual.Host}}
{{/if}}
{{#if houseManual.Audience}}
Target Audience: {{houseManual.Audience}}
{{/if}}
{{#if houseManual}}
Full House Manual Data: {{json houseManual}}
{{/if}}

Write a 60-90 second video script for a deepfake avatar welcome video. The script should:
- Greet guests warmly and introduce the host/property
- Highlight 2-3 key amenities or unique features
- Mention important house rules in a friendly way
- Provide check-in/check-out times if available
- Include contact information for questions
- End with a warm welcome and wish for a great stay

Return only the script text, no additional commentary or stage directions.`,

  defaults: {
    model: "gpt-4o",
    temperature: 0.7,
    maxTokens: 600,
  },
  responseFormat: "text",
});
