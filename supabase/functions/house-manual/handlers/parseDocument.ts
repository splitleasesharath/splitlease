/**
 * Parse Document Handler
 *
 * Extracts text from PDF files and parses into house manual structure.
 * Uses GPT-4 Vision for PDF processing since direct text extraction
 * in Deno is complex - Vision API handles it well.
 *
 * @module house-manual/handlers/parseDocument
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError } from "../../_shared/errors.ts";

interface ParseDocumentPayload {
  document: string; // Base64 encoded document
  fileName: string;
  mimeType: string;
}

interface HandlerContext {
  userId: string;
  supabaseClient: SupabaseClient;
  payload: ParseDocumentPayload;
}

interface ParsedDocument {
  extractedText?: string;
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

// Allowed document MIME types
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png", // Scanned document as image
  "image/jpeg",
];

// Maximum document size (20MB)
const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024 * 1.37;

// Extraction prompt
const EXTRACTION_PROMPT = `Analyze this document and extract house manual information.

This is a host's house manual or guest instructions document. Extract:
- wifi_name: WiFi network name/SSID
- wifi_password: WiFi password
- check_in_instructions: How to check in, key/access codes, arrival procedures
- check_out_instructions: What to do when leaving
- parking_info: Parking rules and instructions
- emergency_contacts: Array of {name, phone, role} for emergencies
- house_rules: Array of rules guests should follow
- appliance_instructions: How to use appliances (thermostat, washer, TV, etc.)
- local_recommendations: Array of {name, type, description} for nearby places
- additional_notes: Any other important information

Return a JSON object with only fields that have actual content from the document.
Be thorough - scan the entire document for all relevant information.`;

/**
 * Parse a document (PDF or image) into house manual structure
 */
export async function handleParseDocument(
  context: HandlerContext
): Promise<ParsedDocument> {
  const { payload } = context;
  const { document, fileName, mimeType } = payload;

  // Validate input
  if (!document || typeof document !== "string") {
    throw new ValidationError("document is required and must be a base64 string");
  }

  if (!fileName || typeof fileName !== "string") {
    throw new ValidationError("fileName is required");
  }

  if (!mimeType || typeof mimeType !== "string") {
    throw new ValidationError("mimeType is required");
  }

  // Validate MIME type
  const normalizedMimeType = mimeType.toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(normalizedMimeType)) {
    throw new ValidationError(
      `Invalid mimeType: ${mimeType}. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`
    );
  }

  // Check document size
  if (document.length > MAX_DOCUMENT_SIZE) {
    throw new ValidationError("Document exceeds maximum size of 20MB");
  }

  console.log(`[parseDocument] Processing document: ${fileName}, type: ${mimeType}, size: ${Math.round(document.length / 1024)}KB`);

  // Get OpenAI API key
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  // For PDFs, we'll use Vision API which can read PDF content
  // Build data URL
  const dataUrl = `data:${normalizedMimeType};base64,${document}`;

  console.log(`[parseDocument] Calling GPT-4 Vision for document analysis...`);

  // Call OpenAI Vision API
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
          role: "user",
          content: [
            {
              type: "text",
              text: EXTRACTION_PROMPT,
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 3000,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[parseDocument] OpenAI Vision API error: ${errorText}`);
    throw new Error(`OpenAI Vision API error: ${response.status}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in OpenAI response");
  }

  console.log(`[parseDocument] Received response from OpenAI`);

  // Parse the JSON response
  const parsed: ParsedDocument = JSON.parse(content);

  console.log(`[parseDocument] Extracted fields:`, Object.keys(parsed));

  return parsed;
}

export default handleParseDocument;
