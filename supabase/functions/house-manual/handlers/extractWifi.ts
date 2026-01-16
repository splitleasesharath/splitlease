/**
 * Extract WiFi Handler
 *
 * Extracts WiFi credentials from images using GPT-4 Vision API.
 * Supports photos of router labels, WiFi cards, or any image with credentials.
 *
 * @module house-manual/handlers/extractWifi
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError } from "../../_shared/errors.ts";

interface ExtractWifiPayload {
  image: string; // Base64 encoded image
  mimeType: string; // e.g., "image/jpeg", "image/png"
}

interface HandlerContext {
  userId: string;
  supabaseClient: SupabaseClient;
  payload: ExtractWifiPayload;
}

interface ExtractedWifi {
  wifi_name: string | null;
  wifi_password: string | null;
  confidence: "high" | "medium" | "low";
  notes?: string;
}

// Allowed image MIME types
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

// Maximum image size (10MB in base64)
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 * 1.37; // ~13.7MB base64 for 10MB binary

// Vision prompt for WiFi extraction
const VISION_PROMPT = `Analyze this image and extract WiFi credentials.

Look for:
1. Network name (SSID, WiFi Name, Network)
2. Password (Key, WPA, WPA2, Security Key, Passphrase)

The credentials might be on:
- A router label/sticker
- A WiFi card or sheet
- A printed document
- A screen display
- Handwritten text

Return a JSON object with:
- wifi_name: The network name/SSID (null if not found)
- wifi_password: The password (null if not found)
- confidence: "high" if clearly visible, "medium" if partially visible or might have errors, "low" if uncertain
- notes: Any relevant observations (e.g., "password partially obscured", "multiple networks found - using primary")

Only return credentials you can actually read from the image. Do not guess or fabricate.`;

/**
 * Extract WiFi credentials from an image
 */
export async function handleExtractWifi(
  context: HandlerContext
): Promise<ExtractedWifi> {
  const { payload } = context;
  const { image, mimeType } = payload;

  // Validate input
  if (!image || typeof image !== "string") {
    throw new ValidationError("image is required and must be a base64 string");
  }

  if (!mimeType || typeof mimeType !== "string") {
    throw new ValidationError("mimeType is required");
  }

  // Normalize mimeType
  const normalizedMimeType = mimeType.toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(normalizedMimeType)) {
    throw new ValidationError(
      `Invalid mimeType: ${mimeType}. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`
    );
  }

  // Check image size
  if (image.length > MAX_IMAGE_SIZE) {
    throw new ValidationError("Image exceeds maximum size of 10MB");
  }

  console.log(`[extractWifi] Processing image of type: ${mimeType}, size: ${Math.round(image.length / 1024)}KB`);

  // Get OpenAI API key
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  // Build data URL
  const dataUrl = `data:${normalizedMimeType};base64,${image}`;

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
              text: VISION_PROMPT,
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
                detail: "high", // Use high detail for better text recognition
              },
            },
          ],
        },
      ],
      max_tokens: 500,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[extractWifi] OpenAI Vision API error: ${errorText}`);
    throw new Error(`OpenAI Vision API error: ${response.status}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in OpenAI Vision response");
  }

  console.log(`[extractWifi] Received response from OpenAI Vision`);

  // Parse the JSON response
  const extracted: ExtractedWifi = JSON.parse(content);

  console.log(`[extractWifi] Extracted - Name: ${extracted.wifi_name ? "found" : "not found"}, Password: ${extracted.wifi_password ? "found" : "not found"}, Confidence: ${extracted.confidence}`);

  return extracted;
}

export default handleExtractWifi;
