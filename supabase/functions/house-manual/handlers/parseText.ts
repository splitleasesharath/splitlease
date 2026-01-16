/**
 * Parse Text Handler
 *
 * Parses freeform text input into structured house manual data using GPT-4.
 * Extracts WiFi credentials, check-in/out instructions, house rules, etc.
 *
 * @module house-manual/handlers/parseText
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError } from "../../_shared/errors.ts";

interface ParseTextPayload {
  text: string;
}

interface HandlerContext {
  userId: string;
  supabaseClient: SupabaseClient;
  payload: ParseTextPayload;
}

interface ParsedHouseManual {
  wifi_name?: string;
  wifi_password?: string;
  check_in_instructions?: string;
  check_out_instructions?: string;
  parking_info?: string;
  emergency_contacts?: Array<{ name: string; phone: string; role: string }>;
  house_rules?: string[];
  appliance_instructions?: string;
  local_recommendations?: Array<{ name: string; type: string; description: string }>;
  additional_notes?: string;
}

// System prompt for house manual parsing
const SYSTEM_PROMPT = `You are an expert at extracting structured house manual information from freeform text.

Extract the following fields if present in the text:
- wifi_name: WiFi network name/SSID
- wifi_password: WiFi password
- check_in_instructions: Detailed check-in process (how to access, key location, etc.)
- check_out_instructions: What guests should do when checking out
- parking_info: Parking instructions and rules
- emergency_contacts: Array of contacts with name, phone, and role (e.g., host, building manager)
- house_rules: Array of specific rules (no smoking, quiet hours, etc.)
- appliance_instructions: How to use specific appliances (thermostat, washer, etc.)
- local_recommendations: Array of nearby places with name, type (restaurant, cafe, etc.), and description
- additional_notes: Any other important information

Return a JSON object with only the fields that have actual content extracted from the text.
Do not include fields that have no corresponding information in the input.
For arrays, only include items if there's clear content for them.

Be thorough but accurate - only extract information that's explicitly stated or very clearly implied.`;

/**
 * Parse freeform text into structured house manual data
 */
export async function handleParseText(
  context: HandlerContext
): Promise<ParsedHouseManual> {
  const { payload } = context;
  const { text } = payload;

  // Validate input
  if (!text || typeof text !== "string") {
    throw new ValidationError("text is required and must be a string");
  }

  if (text.trim().length < 10) {
    throw new ValidationError("text must be at least 10 characters");
  }

  if (text.length > 50000) {
    throw new ValidationError("text exceeds maximum length of 50000 characters");
  }

  console.log(`[parseText] Processing text of length: ${text.length}`);

  // Get OpenAI API key
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  // Call OpenAI API
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `Extract house manual information from the following text:\n\n${text}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[parseText] OpenAI API error: ${errorText}`);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in OpenAI response");
  }

  console.log(`[parseText] Received response from OpenAI`);

  // Parse the JSON response
  const parsed: ParsedHouseManual = JSON.parse(content);

  console.log(`[parseText] Extracted fields:`, Object.keys(parsed));

  return parsed;
}

export default handleParseText;
