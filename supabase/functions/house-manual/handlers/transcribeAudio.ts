/**
 * Transcribe Audio Handler
 *
 * Transcribes audio recordings using OpenAI Whisper API,
 * then parses the transcription into structured house manual data.
 *
 * @module house-manual/handlers/transcribeAudio
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError } from "../../_shared/errors.ts";

interface TranscribeAudioPayload {
  audio: string; // Base64 encoded audio
  format?: string; // Audio format hint (webm, mp3, etc.)
  parseAfterTranscribe?: boolean; // Whether to parse the text after transcription
}

interface HandlerContext {
  userId: string;
  supabaseClient: SupabaseClient;
  payload: TranscribeAudioPayload;
}

interface TranscriptionResult {
  text: string;
  parsed?: Record<string, unknown>;
}

// Allowed audio formats for Whisper
const ALLOWED_FORMATS = ["mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm", "ogg", "flac"];

// Maximum audio size (25MB - Whisper limit)
const MAX_AUDIO_SIZE = 25 * 1024 * 1024 * 1.37; // ~34MB base64 for 25MB binary

// MIME type mapping
const FORMAT_TO_MIME: Record<string, string> = {
  mp3: "audio/mpeg",
  mp4: "audio/mp4",
  mpeg: "audio/mpeg",
  mpga: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  webm: "audio/webm",
  ogg: "audio/ogg",
  flac: "audio/flac",
};

/**
 * Transcribe audio and optionally parse into house manual structure
 */
export async function handleTranscribeAudio(
  context: HandlerContext
): Promise<TranscriptionResult> {
  const { payload } = context;
  const { audio, format = "webm", parseAfterTranscribe = true } = payload;

  // Validate input
  if (!audio || typeof audio !== "string") {
    throw new ValidationError("audio is required and must be a base64 string");
  }

  // Validate format
  const normalizedFormat = format.toLowerCase();
  if (!ALLOWED_FORMATS.includes(normalizedFormat)) {
    throw new ValidationError(
      `Invalid format: ${format}. Allowed: ${ALLOWED_FORMATS.join(", ")}`
    );
  }

  // Check audio size
  if (audio.length > MAX_AUDIO_SIZE) {
    throw new ValidationError("Audio exceeds maximum size of 25MB");
  }

  console.log(`[transcribeAudio] Processing audio of format: ${format}, size: ${Math.round(audio.length / 1024)}KB`);

  // Get OpenAI API key
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  // Decode base64 to binary
  const binaryString = atob(audio);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Create form data for Whisper API
  const formData = new FormData();
  const mimeType = FORMAT_TO_MIME[normalizedFormat] || "audio/webm";
  const blob = new Blob([bytes], { type: mimeType });
  formData.append("file", blob, `recording.${normalizedFormat}`);
  formData.append("model", "whisper-1");
  formData.append("response_format", "json");
  formData.append("language", "en");

  console.log(`[transcribeAudio] Calling Whisper API...`);

  // Call Whisper API
  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[transcribeAudio] Whisper API error: ${errorText}`);
    throw new Error(`Whisper API error: ${response.status}`);
  }

  const result = await response.json();
  const transcribedText = result.text;

  if (!transcribedText) {
    throw new Error("No transcription in Whisper response");
  }

  console.log(`[transcribeAudio] Transcribed ${transcribedText.length} characters`);

  // If parsing requested, parse the transcription into house manual structure
  if (parseAfterTranscribe && transcribedText.length > 20) {
    console.log(`[transcribeAudio] Parsing transcription into house manual structure...`);

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
            content: `You are an expert at extracting structured house manual information from spoken transcriptions.

Extract the following fields if present:
- wifi_name: WiFi network name/SSID
- wifi_password: WiFi password
- check_in_instructions: Check-in process
- check_out_instructions: Check-out process
- parking_info: Parking instructions
- emergency_contacts: Array of {name, phone, role}
- house_rules: Array of rules
- appliance_instructions: How to use appliances
- local_recommendations: Array of {name, type, description}
- additional_notes: Other important information

Return a JSON object with only fields that have content. Account for speech patterns and natural language.`,
          },
          {
            role: "user",
            content: `Extract house manual information from this transcription:\n\n${transcribedText}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
    });

    if (parseResponse.ok) {
      const parseResult = await parseResponse.json();
      const parsedContent = parseResult.choices?.[0]?.message?.content;

      if (parsedContent) {
        const parsed = JSON.parse(parsedContent);
        console.log(`[transcribeAudio] Parsed fields:`, Object.keys(parsed));

        return {
          text: transcribedText,
          parsed,
        };
      }
    }
  }

  return {
    text: transcribedText,
  };
}

export default handleTranscribeAudio;
