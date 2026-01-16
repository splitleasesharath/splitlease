/**
 * Parse Google Doc Handler
 *
 * Fetches and parses Google Docs via their public export URL.
 * Works with publicly shared Google Docs or Docs shared with "anyone with link".
 *
 * @module house-manual/handlers/parseGoogleDoc
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError } from "../../_shared/errors.ts";

interface ParseGoogleDocPayload {
  url: string; // Google Doc URL
}

interface HandlerContext {
  userId: string;
  supabaseClient: SupabaseClient;
  payload: ParseGoogleDocPayload;
}

interface ParsedGoogleDoc {
  rawText?: string;
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

// Google Doc URL patterns
const DOC_ID_PATTERNS = [
  /docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/,
  /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
  /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
];

/**
 * Extract Google Doc ID from URL
 */
function extractDocId(url: string): string | null {
  for (const pattern of DOC_ID_PATTERNS) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

/**
 * Parse a Google Doc into house manual structure
 */
export async function handleParseGoogleDoc(
  context: HandlerContext
): Promise<ParsedGoogleDoc> {
  const { payload } = context;
  const { url } = payload;

  // Validate input
  if (!url || typeof url !== "string") {
    throw new ValidationError("url is required and must be a string");
  }

  // Extract document ID
  const docId = extractDocId(url);
  if (!docId) {
    throw new ValidationError(
      "Invalid Google Doc URL. Please provide a valid docs.google.com or drive.google.com URL"
    );
  }

  console.log(`[parseGoogleDoc] Extracted doc ID: ${docId}`);

  // Google Docs export URL (publicly accessible if doc is shared)
  // Using plain text export for simplicity
  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;

  console.log(`[parseGoogleDoc] Fetching document...`);

  // Fetch the document content
  const response = await fetch(exportUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; SplitLease/1.0)",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new ValidationError("Google Doc not found. Please check the URL and sharing settings.");
    }
    if (response.status === 403) {
      throw new ValidationError(
        "Access denied. Please make sure the Google Doc is shared as 'Anyone with the link can view'."
      );
    }
    throw new Error(`Failed to fetch Google Doc: ${response.status}`);
  }

  const rawText = await response.text();

  if (!rawText || rawText.length < 10) {
    throw new ValidationError("Google Doc appears to be empty or inaccessible");
  }

  console.log(`[parseGoogleDoc] Fetched ${rawText.length} characters`);

  // Get OpenAI API key
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  // Parse the document content with GPT-4
  console.log(`[parseGoogleDoc] Parsing document content...`);

  const parseResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
          content: `You are an expert at extracting structured house manual information from documents.

Extract the following fields if present:
- wifi_name: WiFi network name/SSID
- wifi_password: WiFi password
- check_in_instructions: How to check in, key/access codes, arrival procedures
- check_out_instructions: What to do when leaving
- parking_info: Parking rules and instructions
- emergency_contacts: Array of {name, phone, role}
- house_rules: Array of rules
- appliance_instructions: How to use appliances
- local_recommendations: Array of {name, type, description}
- additional_notes: Any other important information

Return a JSON object with only fields that have actual content.`,
        },
        {
          role: "user",
          content: `Extract house manual information from this Google Doc:\n\n${rawText.substring(0, 50000)}`, // Limit to 50k chars
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    }),
  });

  if (!parseResponse.ok) {
    const errorText = await parseResponse.text();
    console.error(`[parseGoogleDoc] OpenAI API error: ${errorText}`);
    throw new Error(`OpenAI API error: ${parseResponse.status}`);
  }

  const parseResult = await parseResponse.json();
  const content = parseResult.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in OpenAI response");
  }

  const parsed: ParsedGoogleDoc = JSON.parse(content);

  // Include raw text for reference
  parsed.rawText = rawText.substring(0, 5000); // First 5k chars for preview

  console.log(`[parseGoogleDoc] Extracted fields:`, Object.keys(parsed).filter(k => k !== 'rawText'));

  return parsed;
}

export default handleParseGoogleDoc;
