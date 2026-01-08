/**
 * OpenAI Client Wrapper
 * Split Lease - Supabase Edge Functions
 *
 * NO FALLBACK PRINCIPLE: Fails fast if API key missing or API errors
 *
 * @module _shared/openai
 */

import {
  ChatMessage,
  CompletionOptions,
  CompletionResult,
} from "./aiTypes.ts";
import { OpenAIError } from "./errors.ts";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[OpenAI]'
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
const API_KEY_ENV_VAR = 'OPENAI_API_KEY'

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if API key is present
 * @pure
 */
const hasApiKey = (key: string | undefined): key is string =>
  key !== undefined && key.length > 0

/**
 * Check if response status indicates success
 * @pure
 */
const isSuccessStatus = (status: number): boolean =>
  status >= 200 && status < 300

/**
 * Check if response format is JSON object
 * @pure
 */
const isJsonResponseFormat = (format: string | undefined): boolean =>
  format === 'json_object'

// ─────────────────────────────────────────────────────────────
// Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build completion result from API response
 * @pure
 */
const buildCompletionResult = (
  content: string,
  model: string,
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
): CompletionResult => Object.freeze({
  content,
  model,
  usage: Object.freeze({
    prompt_tokens: usage.prompt_tokens,
    completion_tokens: usage.completion_tokens,
    total_tokens: usage.total_tokens,
  }),
})

// ─────────────────────────────────────────────────────────────
// API Key Retrieval
// ─────────────────────────────────────────────────────────────

/**
 * Get the OpenAI API key from environment
 * Throws immediately if not configured
 * @effectful (reads environment)
 */
function getApiKey(): string {
  const key = Deno.env.get(API_KEY_ENV_VAR);
  if (!hasApiKey(key)) {
    throw new OpenAIError(`${API_KEY_ENV_VAR} not configured in Supabase secrets`, 500);
  }
  return key;
}

/**
 * Non-streaming completion
 * NO FALLBACK: Throws on any API error
 * @effectful (network I/O, console logging)
 */
export async function complete(
  messages: ChatMessage[],
  options: CompletionOptions
): Promise<CompletionResult> {
  const apiKey = getApiKey();

  const requestBody: Record<string, unknown> = {
    model: options.model,
    messages,
    temperature: options.temperature,
    max_tokens: options.maxTokens,
  };

  if (isJsonResponseFormat(options.responseFormat)) {
    requestBody.response_format = { type: "json_object" };
  }

  console.log(`${LOG_PREFIX} Calling ${options.model} with ${messages.length} messages`);

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`${LOG_PREFIX} API error: ${response.status}`, errorBody);
    throw new OpenAIError(
      `OpenAI API error: ${response.status}`,
      response.status,
      errorBody
    );
  }

  const result = await response.json();

  console.log(`${LOG_PREFIX} ✅ Completed. Tokens: ${result.usage.total_tokens}`);

  return buildCompletionResult(
    result.choices[0].message.content,
    result.model,
    result.usage
  );
}

/**
 * Streaming completion - returns a ReadableStream for SSE
 * NO FALLBACK: Throws on any API error
 * @effectful (network I/O, console logging)
 */
export async function stream(
  messages: ChatMessage[],
  options: CompletionOptions
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = getApiKey();

  const requestBody = {
    model: options.model,
    messages,
    temperature: options.temperature,
    max_tokens: options.maxTokens,
    stream: true,
  };

  console.log(`${LOG_PREFIX} Streaming ${options.model} with ${messages.length} messages`);

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`${LOG_PREFIX} Stream API error: ${response.status}`, errorBody);
    throw new OpenAIError(
      `OpenAI API error: ${response.status}`,
      response.status,
      errorBody
    );
  }

  if (!response.body) {
    throw new OpenAIError("OpenAI response body is null", 500);
  }

  return response.body;
}

// ─────────────────────────────────────────────────────────────
// Exported Test Constants
// ─────────────────────────────────────────────────────────────

/**
 * Exported for testing purposes
 * @test
 */
export const __test__ = Object.freeze({
  // Constants
  LOG_PREFIX,
  OPENAI_API_URL,
  API_KEY_ENV_VAR,

  // Predicates
  hasApiKey,
  isSuccessStatus,
  isJsonResponseFormat,

  // Builders
  buildCompletionResult,
})
