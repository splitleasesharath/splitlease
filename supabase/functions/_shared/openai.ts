/**
 * OpenAI Client Wrapper
 * Split Lease - Supabase Edge Functions
 *
 * NO FALLBACK PRINCIPLE: Fails fast if API key missing or API errors
 */

import {
  ChatMessage,
  CompletionOptions,
  CompletionResult,
} from "./aiTypes.ts";
import { OpenAIError } from "./errors.ts";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

/**
 * Get the OpenAI API key from environment
 * Throws immediately if not configured
 */
function getApiKey(): string {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) {
    throw new OpenAIError("OPENAI_API_KEY not configured in Supabase secrets", 500);
  }
  return key;
}

/**
 * Non-streaming completion
 * NO FALLBACK: Throws on any API error
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

  if (options.responseFormat === "json_object") {
    requestBody.response_format = { type: "json_object" };
  }

  console.log(`[OpenAI] Calling ${options.model} with ${messages.length} messages`);

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
    console.error(`[OpenAI] API error: ${response.status}`, errorBody);
    throw new OpenAIError(
      `OpenAI API error: ${response.status}`,
      response.status,
      errorBody
    );
  }

  const result = await response.json();

  console.log(`[OpenAI] ✅ Completed. Tokens: ${result.usage.total_tokens}`);

  return {
    content: result.choices[0].message.content,
    model: result.model,
    usage: {
      prompt_tokens: result.usage.prompt_tokens,
      completion_tokens: result.usage.completion_tokens,
      total_tokens: result.usage.total_tokens,
    },
  };
}

/**
 * Streaming completion - returns a ReadableStream for SSE
 * NO FALLBACK: Throws on any API error
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

  console.log(`[OpenAI] Streaming ${options.model} with ${messages.length} messages`);

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
    console.error(`[OpenAI] Stream API error: ${response.status}`, errorBody);
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
