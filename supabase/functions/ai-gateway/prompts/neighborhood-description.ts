/**
 * Neighborhood Description Generator Prompt
 * Split Lease - AI Gateway
 *
 * Generates neighborhood descriptions for listings when ZIP code lookup fails
 * Used as fallback when zat_geo_hood_mediumlevel table has no match
 *
 * @module ai-gateway/prompts/neighborhood-description
 */

import { registerPrompt } from "./_registry.ts";

// ─────────────────────────────────────────────────────────────
// Prompt Configuration
// ─────────────────────────────────────────────────────────────

/**
 * Neighborhood description prompt configuration
 * @immutable
 */
const NEIGHBORHOOD_DESCRIPTION_PROMPT = Object.freeze({
  key: "neighborhood-description",
  name: "Neighborhood Description Generator",
  description: "Generates neighborhood descriptions for listings when ZIP lookup fails",
  systemPrompt: `You are an expert NYC real estate copywriter specializing in neighborhood descriptions.
Your task is to generate engaging, accurate neighborhood descriptions that help potential renters understand the area.

IMPORTANT RULES:
- Generate 2-3 sentences describing the neighborhood
- Focus on lifestyle, atmosphere, accessibility, and general amenities
- DO NOT make up specific business names, restaurant names, or landmarks
- DO NOT mention specific prices or costs
- Use positive, inviting language
- If you cannot determine the neighborhood from the address, provide a generic but welcoming description
- Highlight proximity to transit, parks, dining options in general terms`,

  userPromptTemplate: `Please generate a neighborhood description for a rental listing at this address:

Address: {{address}}
City: {{city}}
State: {{state}}
ZIP Code: {{zipCode}}

Generate a welcoming 2-3 sentence description of the neighborhood that would appeal to potential renters. Focus on the lifestyle and atmosphere of the area.`,

  defaults: Object.freeze({
    model: "gpt-4o-mini",
    temperature: 0.7,
    maxTokens: 300,
  }),

  responseFormat: "text",
})

registerPrompt(NEIGHBORHOOD_DESCRIPTION_PROMPT);

// ─────────────────────────────────────────────────────────────
// Exported Test Constants
// ─────────────────────────────────────────────────────────────

/**
 * Exported for testing purposes
 * @test
 */
export const __test__ = Object.freeze({
  NEIGHBORHOOD_DESCRIPTION_PROMPT,
})
