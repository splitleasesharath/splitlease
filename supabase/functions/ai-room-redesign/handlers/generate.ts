/**
 * Generate Handler - Calls Gemini Vision API for room redesign
 *
 * This handler:
 * 1. Validates the incoming payload (base64 image, style, optional room type)
 * 2. Builds the prompt using the style and room type
 * 3. Calls Gemini Vision API with image + prompt
 * 4. Returns the generated image as base64 data URL
 *
 * NO FALLBACK PRINCIPLE: Errors fail fast with clear messages
 */

import { buildRedesignPrompt, STYLE_PROMPTS } from '../prompts/room-redesign.ts';
import { ValidationError, ExternalAPIError } from '../../_shared/errors.ts';
import { formatSuccessResponse, formatErrorResponseHttp } from '../../_shared/functional/orchestration.ts';

// Gemini API Configuration
const GEMINI_MODEL = 'gemini-2.0-flash-exp';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

interface GeneratePayload {
  base64Image: string;
  styleId: string;
  stylePrompt?: string;
  photoType?: string | null;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        inlineData?: {
          mimeType: string;
          data: string;
        };
      }>;
    };
  }>;
  error?: {
    message: string;
    code: number;
  };
}

/**
 * Validate the generate request payload
 */
const validatePayload = (payload: unknown): payload is GeneratePayload => {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const p = payload as Record<string, unknown>;

  if (typeof p.base64Image !== 'string' || p.base64Image.length === 0) {
    return false;
  }

  if (typeof p.styleId !== 'string' || p.styleId.length === 0) {
    return false;
  }

  return true;
};

/**
 * Detect MIME type from base64 data
 */
const detectMimeType = (base64: string): string => {
  // Check if it's a data URL and extract MIME type
  if (base64.startsWith('data:')) {
    const match = base64.match(/^data:([^;]+);base64,/);
    if (match) {
      return match[1];
    }
  }

  // Try to detect from magic bytes (first few chars of base64)
  const header = base64.substring(0, 16);

  if (header.startsWith('/9j/')) {
    return 'image/jpeg';
  }
  if (header.startsWith('iVBOR')) {
    return 'image/png';
  }
  if (header.startsWith('UklGR')) {
    return 'image/webp';
  }

  // Default to JPEG as it's most common
  return 'image/jpeg';
};

/**
 * Extract raw base64 data (remove data URL prefix if present)
 */
const extractBase64Data = (base64: string): string => {
  if (base64.startsWith('data:')) {
    const parts = base64.split(',');
    return parts.length > 1 ? parts[1] : base64;
  }
  return base64;
};

/**
 * Call Gemini Vision API to generate redesigned room image
 */
const callGeminiAPI = async (
  apiKey: string,
  base64Image: string,
  prompt: string
): Promise<{ success: true; imageUrl: string } | { success: false; error: string }> => {
  const mimeType = detectMimeType(base64Image);
  const rawBase64 = extractBase64Data(base64Image);

  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: rawBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ['image', 'text'],
      responseMimeType: 'image/png',
    },
  };

  const url = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  console.log(`[ai-room-redesign] Calling Gemini API...`);
  console.log(`[ai-room-redesign] Model: ${GEMINI_MODEL}`);
  console.log(`[ai-room-redesign] Image MIME type: ${mimeType}`);
  console.log(`[ai-room-redesign] Prompt length: ${prompt.length} chars`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[ai-room-redesign] Gemini API error: ${response.status} ${errorText}`);
    return {
      success: false,
      error: `Gemini API error: ${response.status} - ${errorText.substring(0, 200)}`,
    };
  }

  const data: GeminiResponse = await response.json();

  // Check for API-level error
  if (data.error) {
    console.error(`[ai-room-redesign] Gemini API returned error:`, data.error);
    return {
      success: false,
      error: `Gemini API error: ${data.error.message}`,
    };
  }

  // Extract the generated image from response
  const candidates = data.candidates;
  if (!candidates || candidates.length === 0) {
    console.error(`[ai-room-redesign] No candidates in response`);
    return {
      success: false,
      error: 'Gemini API returned no results. Please try again.',
    };
  }

  const parts = candidates[0]?.content?.parts;
  if (!parts || parts.length === 0) {
    console.error(`[ai-room-redesign] No parts in response`);
    return {
      success: false,
      error: 'Gemini API returned empty content. Please try again.',
    };
  }

  // Find the image part in the response
  const imagePart = parts.find((part) => part.inlineData?.data);
  if (!imagePart?.inlineData) {
    console.error(`[ai-room-redesign] No image data in response`);
    // Log what we did receive for debugging
    const textParts = parts.filter((part) => part.text);
    if (textParts.length > 0) {
      console.log(`[ai-room-redesign] Received text response instead:`, textParts[0].text?.substring(0, 200));
    }
    return {
      success: false,
      error: 'Gemini API did not return an image. The model may have declined the request.',
    };
  }

  // Return as data URL for easy frontend consumption
  const imageUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;

  console.log(`[ai-room-redesign] Successfully generated image`);
  console.log(`[ai-room-redesign] Response MIME type: ${imagePart.inlineData.mimeType}`);

  return {
    success: true,
    imageUrl,
  };
};

/**
 * Main generate handler
 */
export const handleGenerate = async (context: {
  request: { payload: unknown };
}): Promise<Response> => {
  try {
    const { payload } = context.request;

    console.log(`[ai-room-redesign/generate] Processing request...`);

    // Validate payload
    if (!validatePayload(payload)) {
      throw new ValidationError(
        'Invalid payload. Required: base64Image (string), styleId (string). Optional: stylePrompt (string), photoType (string)'
      );
    }

    const { base64Image, styleId, stylePrompt, photoType } = payload;

    // Get API key from environment
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new ExternalAPIError('GEMINI_API_KEY is not configured');
    }

    // Build prompt - use provided stylePrompt or look up from STYLE_PROMPTS
    const finalStylePrompt = stylePrompt || STYLE_PROMPTS[styleId];
    if (!finalStylePrompt) {
      throw new ValidationError(`Unknown style ID: ${styleId}. Provide stylePrompt or use a known styleId.`);
    }

    const fullPrompt = buildRedesignPrompt(finalStylePrompt, photoType || null);

    console.log(`[ai-room-redesign/generate] Style: ${styleId}`);
    console.log(`[ai-room-redesign/generate] Photo type: ${photoType || 'not specified'}`);

    // Call Gemini API
    const result = await callGeminiAPI(apiKey, base64Image, fullPrompt);

    if (!result.success) {
      throw new ExternalAPIError(result.error);
    }

    return formatSuccessResponse({
      imageUrl: result.imageUrl,
    });
  } catch (error) {
    console.error(`[ai-room-redesign/generate] Error:`, error);
    return formatErrorResponseHttp(error as Error);
  }
};
