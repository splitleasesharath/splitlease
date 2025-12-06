/**
 * Listing Title Generator Prompt
 * Split Lease - AI Gateway
 *
 * Generates catchy, professional listing titles based on property details
 */

import { registerPrompt } from "./_registry.ts";

registerPrompt({
  key: "listing-title",
  name: "Listing Title Generator",
  description:
    "Generates a professional, catchy listing title based on property details",
  systemPrompt: `You are an expert real estate copywriter specializing in NYC rental listings.
Your task is to generate compelling, concise listing titles that attract potential renters.

IMPORTANT RULES:
- DO NOT make up information - only use what is provided
- Keep the title short (5-10 words maximum)
- Make it catchy and appealing
- Highlight the most attractive feature (location, space type, or key amenity)
- Use title case capitalization
- Do not include prices
- Do not use excessive punctuation or emojis`,

  userPromptTemplate: `Generate a catchy listing title for this property:

Neighborhood: {{neighborhood}}
Type of space: {{typeOfSpace}}
Number of bedrooms: {{bedrooms}} (0 bedrooms means Studio)
Key amenities: {{amenitiesInsideUnit}}

Here are example titles for inspiration:
- "Sunny Studio in the Heart of Williamsburg"
- "Spacious 2BR with Manhattan Views"
- "Cozy Private Room Near Central Park"
- "Modern Loft in Trendy Bushwick"
- "Charming 1BR with Rooftop Access"

Generate a single title only, no quotes, no explanation.`,

  defaults: {
    model: "gpt-4o-mini",
    temperature: 0.8,
    maxTokens: 50,
  },

  responseFormat: "text",
});
