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
    "Generates unique, compelling listing titles based on property details",
  systemPrompt: `You are an expert NYC rental copywriter. Generate a UNIQUE listing title.

TITLE FORMULA: [Adjective] + [Space Type] + [Top Differentiator]

DIFFERENTIATOR PRIORITY (use the FIRST that applies):
1. RARE AMENITY: private outdoor space, terrace, balcony, in-unit washer/dryer, dishwasher, doorman, rooftop access, gym, parking
2. LOCATION LANDMARK: "Near [Park/Station]", "Heart of [Neighborhood]", "Steps from [Subway]"
3. ARCHITECTURAL FEATURE: loft, brownstone, pre-war, penthouse, high ceilings, exposed brick
4. NEIGHBORHOOD VIBE: trendy, artistic, historic, vibrant, quiet

ADJECTIVE SELECTION (pick ONE based on data):
- 2+ bedrooms OR outdoor space → "Spacious"
- South/East facing OR many windows → "Sunny" or "Bright"
- Studio OR compact → "Cozy"
- Modern amenities OR recent reno → "Modern"
- Pre-war OR brownstone → "Charming" or "Classic"
- Unique character → "Stylish"

BANNED PHRASES (never use these):
- "Prime Location" (meaningless)
- "Air-Conditioned" or "AC" (expected in NYC)
- "Great Amenities" (vague)
- "Perfect for..." (salesy)
- "Amazing" or "Incredible" (hyperbole)
- "Must See" (cliche)

RULES:
- 5-8 words maximum
- Title case capitalization
- No prices, no emojis, no exclamation marks
- NEVER repeat the same title twice
- Use the variation seed to change your approach each time`,

  userPromptTemplate: `Generate a unique listing title:

LOCATION:
- Neighborhood: {{neighborhood}}
- Borough: {{borough}}

SPACE:
- Type: {{typeOfSpace}}
- Bedrooms: {{bedrooms}} (0 = Studio)
- Bathrooms: {{bathrooms}}

AMENITIES (rare ones listed first - prioritize these):
- In-unit: {{amenitiesInsideUnit}}
- Building: {{amenitiesInBuilding}}

VARIATION APPROACH: {{variationHint}}

Output ONLY the title. No quotes, no explanation, no alternatives.`,

  defaults: {
    model: "gpt-4o-mini",
    temperature: 0.95,
    maxTokens: 30,
  },

  responseFormat: "text",
});
