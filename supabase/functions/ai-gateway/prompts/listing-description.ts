/**
 * Listing Description Generator Prompt
 * Split Lease - AI Gateway
 *
 * Generates well-written listing descriptions based on user-provided listing data
 * Mirrors the original Bubble.io ChatGPT implementation
 *
 * @module ai-gateway/prompts/listing-description
 */

import { registerPrompt } from "./_registry.ts";

// ─────────────────────────────────────────────────────────────
// Prompt Configuration
// ─────────────────────────────────────────────────────────────

/**
 * Listing description prompt configuration
 * @immutable
 */
const LISTING_DESCRIPTION_PROMPT = Object.freeze({
  key: "listing-description",
  name: "Listing Description Generator",
  description:
    "Generates a professional listing description based on property details",
  systemPrompt: `You are an expert real estate copywriter specializing in NYC rental listings.
Your task is to generate compelling, accurate listing descriptions that highlight key features.

IMPORTANT RULES:
- DO NOT make up information - only use what is provided
- Keep the description concise (2-4 sentences, similar to the examples)
- Use engaging language that paints a picture for potential renters
- End with a call-to-action
- Ignore any empty or missing fields
- Never mention specific prices
- Focus on lifestyle benefits and unique features`,

  userPromptTemplate: `This is the data we have for a listing a Host is creating on Split Lease:

Listing name: {{listingName}}
Address: {{address}}
Neighborhood: {{neighborhood}}
Type of space: {{typeOfSpace}}
Number of bedrooms: {{bedrooms}} (0 bedrooms means Studio)
Number of beds: {{beds}}
Number of bathrooms: {{bathrooms}}
Kitchen usage/type/allowed: {{kitchenType}}
Amenities in building: {{amenitiesOutsideUnit}}
Amenities in unit: {{amenitiesInsideUnit}}

Based on all this data (ignore empty constraints) please generate a well written description for the listing. Generate descriptions similar to these examples:

"Dive into luxury in this three-bedroom masterpiece located steps away from the city's vibrant arts district. Light-filled living spaces complemented by chic design touches. Enjoy the luxury of granite countertops and a chef's dream kitchen. Evenings on the private terrace promise spectacular sunset views. Secure your slice of the city's best—reach out!"

"Find comfort in this two-bedroom apartment, conveniently situated in the center of town. Neutral tones and practical design ensure it's a blank canvas, ready for your personal touch. Enjoy the functional kitchen, perfect for weeknight dinners, and a living area that offers just the right amount of space for relaxation. Make this your next comfortable haven—set up a viewing to see all it offers!"

Simply answer with the description and nothing else, keep it at a length similar to the examples provided and DO NOT make up information. This description will be used by the host as inspiration to keep highlighting the details of the listing.`,

  defaults: Object.freeze({
    model: "gpt-4o-mini",
    temperature: 0.7,
    maxTokens: 500,
  }),

  responseFormat: "text",
})

registerPrompt(LISTING_DESCRIPTION_PROMPT);

// ─────────────────────────────────────────────────────────────
// Exported Test Constants
// ─────────────────────────────────────────────────────────────

/**
 * Exported for testing purposes
 * @test
 */
export const __test__ = Object.freeze({
  LISTING_DESCRIPTION_PROMPT,
})
