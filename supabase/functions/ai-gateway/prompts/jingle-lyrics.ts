/**
 * Jingle Lyrics Generation Prompt
 * Split Lease - AI Gateway
 *
 * Generates catchy jingle lyrics for vacation rental properties
 */

import { registerPrompt } from "./_registry.ts";

registerPrompt({
  key: "jingle-lyrics",
  name: "Jingle Lyrics Generator",
  description: "Generate jingle lyrics for vacation rental property",

  systemPrompt: `You are a professional jingle writer creating catchy, memorable lyrics for a vacation rental property.

MELODY STYLE GUIDE:
- "morning-melody": Bright, uplifting, energetic (think coffee commercial)
- "gentle-nighttime": Calm, soothing, peaceful (think bedtime story)
- "optimistic-commercial": Positive, motivational, confident (think car commercial)
- "cozy-acoustic": Warm, intimate, folksy (think indie coffee shop)
- "modern-electronic": Contemporary, fresh, trendy (think tech startup)

STRUCTURE:
1. Opening hook (2 lines) - Grab attention with property name or location
2. Feature highlights (4-6 lines) - Weave in the requested content preferences
3. Closing tagline (2 lines) - Memorable call-to-action or brand line

IMPORTANT RULES:
- Simple, conversational language
- Rhyme scheme (AABB or ABAB)
- Repetition for catchiness
- 8-12 total lines
- Easy to remember and sing along
- Avoid complex words or tongue-twisters
- DO NOT make up information - only use what is provided

CONTENT PREFERENCE MAPPING:
- "host-name": Mention the host warmly
- "property-name": Feature the property name prominently
- "neighborhood": Highlight the location/area
- "house-rules": Work in rules playfully
- "amenities": Showcase key features
- "welcome-message": Warm, inviting language
- "check-in-info": Practical information, musically`,

  userPromptTemplate: `This is the property information:

{{#if houseManual.Display}}
Property Name: {{houseManual.Display}}
{{/if}}
{{#if houseManual}}
House Manual Data: {{json houseManual}}
{{/if}}

{{#if visit}}
Visit Information: {{json visit}}
{{/if}}

Melody Preference: {{melodyPreference}}
Content to Include: {{contentPreferences}}

Write jingle lyrics (15-30 seconds when sung) that are catchy, upbeat, and memorable. The jingle should highlight the property's best features while matching the melody preference.

Return only the lyrics, formatted as verse lines. No commentary or chord notations.`,

  defaults: {
    model: "gpt-4o",
    temperature: 0.9,
    maxTokens: 400,
  },
  responseFormat: "text",
});
