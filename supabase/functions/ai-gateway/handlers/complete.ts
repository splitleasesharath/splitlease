/**
 * Non-Streaming Completion Handler
 * Split Lease - AI Gateway
 *
 * NO FALLBACK PRINCIPLE: Fails fast on any error
 *
 * @module ai-gateway/handlers/complete
 */

import { User } from "https://esm.sh/@supabase/supabase-js@2";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../../_shared/cors.ts";
import {
  AIGatewayRequest,
  AIGatewayResponse,
  ChatMessage,
} from "../../_shared/aiTypes.ts";
import { complete } from "../../_shared/openai.ts";
import { getPrompt, loadAllData } from "../prompts/_registry.ts";
import { interpolate } from "../prompts/_template.ts";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[Complete]'
const ANONYMOUS_USER = 'anonymous'

/**
 * Content type headers
 * @immutable
 */
const CONTENT_HEADERS = Object.freeze({
  JSON: 'application/json',
} as const)

/**
 * Response format mapping
 * @immutable
 */
const RESPONSE_FORMATS = Object.freeze({
  JSON: 'json',
  JSON_OBJECT: 'json_object',
  TEXT: 'text',
} as const)

// ─────────────────────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────────────────────

interface HandlerContext {
  readonly user: User | null;
  readonly serviceClient: SupabaseClient;
  readonly request: AIGatewayRequest;
}

// ─────────────────────────────────────────────────────────────
// Pure Functions
// ─────────────────────────────────────────────────────────────

/**
 * Check if user exists
 * @pure
 */
const hasUser = (user: User | null): user is User =>
  user !== null

/**
 * Get user email safely
 * @pure
 */
const getUserEmail = (user: User | null): string =>
  hasUser(user) ? (user.email ?? ANONYMOUS_USER) : ANONYMOUS_USER

/**
 * Get user ID safely
 * @pure
 */
const getUserId = (user: User | null): string =>
  hasUser(user) ? user.id : ANONYMOUS_USER

/**
 * Determine response format for OpenAI
 * @pure
 */
const getOpenAIResponseFormat = (promptFormat: string): 'json_object' | 'text' =>
  promptFormat === RESPONSE_FORMATS.JSON ? RESPONSE_FORMATS.JSON_OBJECT : RESPONSE_FORMATS.TEXT

/**
 * Build loader context
 * @pure
 */
const buildLoaderContext = (
  user: User | null,
  serviceClient: SupabaseClient,
  variables: Record<string, unknown> | undefined
): Readonly<{
  userId: string;
  userEmail: string;
  supabaseClient: SupabaseClient;
  variables: Record<string, unknown>;
}> => Object.freeze({
  userId: getUserId(user),
  userEmail: getUserEmail(user),
  supabaseClient: serviceClient,
  variables: variables ?? {},
})

/**
 * Build template context
 * @pure
 */
const buildTemplateContext = (
  loadedData: Record<string, unknown>,
  variables: Record<string, unknown> | undefined,
  user: User | null
): Record<string, unknown> => ({
  ...loadedData,
  ...variables,
  user: hasUser(user) ? { id: user.id, email: user.email } : null,
})

/**
 * Build chat messages array
 * @pure
 */
const buildChatMessages = (
  systemPrompt: string,
  userPrompt: string
): ReadonlyArray<ChatMessage> => Object.freeze([
  { role: "system" as const, content: systemPrompt },
  { role: "user" as const, content: userPrompt },
])

/**
 * Build success response object
 * @pure
 */
const buildSuccessResponse = (
  content: string,
  model: string,
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
): AIGatewayResponse => Object.freeze({
  success: true,
  data: Object.freeze({
    content,
    model,
    usage: Object.freeze(usage),
  }),
})

// ─────────────────────────────────────────────────────────────
// Effect Boundary
// ─────────────────────────────────────────────────────────────

/**
 * Handle non-streaming completion request
 * @effectful (database I/O, OpenAI API call, console logging)
 */
export async function handleComplete(
  context: HandlerContext
): Promise<Response> {
  const { user, serviceClient, request } = context;
  const { payload } = request;

  console.log(`${LOG_PREFIX} ========== PROCESSING ==========`);
  console.log(`${LOG_PREFIX} Prompt: ${payload.prompt_key}`);
  console.log(`${LOG_PREFIX} User: ${getUserEmail(user)}`);

  // ─────────────────────────────────────────────────────────
  // 1. Get prompt configuration
  // ─────────────────────────────────────────────────────────

  const promptConfig = getPrompt(payload.prompt_key);

  // ─────────────────────────────────────────────────────────
  // 2. Load required data (if any loaders specified)
  // ─────────────────────────────────────────────────────────

  const loaderContext = buildLoaderContext(user, serviceClient, payload.variables);

  const loadedData = await loadAllData(
    promptConfig.requiredLoaders ?? [],
    loaderContext
  );

  // ─────────────────────────────────────────────────────────
  // 3. Build messages with interpolated templates
  // ─────────────────────────────────────────────────────────

  const templateContext = buildTemplateContext(loadedData, payload.variables, user);

  const userPrompt = interpolate(
    promptConfig.userPromptTemplate,
    templateContext
  );

  const messages = buildChatMessages(promptConfig.systemPrompt, userPrompt);

  console.log(
    `${LOG_PREFIX} System prompt: ${promptConfig.systemPrompt.substring(0, 100)}...`
  );
  console.log(`${LOG_PREFIX} User prompt: ${userPrompt.substring(0, 200)}...`);

  // ─────────────────────────────────────────────────────────
  // 4. Call OpenAI
  // ─────────────────────────────────────────────────────────

  const result = await complete(messages as ChatMessage[], {
    model: payload.options?.model ?? promptConfig.defaults.model,
    temperature: payload.options?.temperature ?? promptConfig.defaults.temperature,
    maxTokens: payload.options?.max_tokens ?? promptConfig.defaults.maxTokens,
    responseFormat: getOpenAIResponseFormat(promptConfig.responseFormat),
  });

  // ─────────────────────────────────────────────────────────
  // 5. Return response
  // ─────────────────────────────────────────────────────────

  console.log(`${LOG_PREFIX} ✅ Success. Tokens used: ${result.usage.total_tokens}`);

  const response = buildSuccessResponse(result.content, result.model, result.usage);

  return new Response(JSON.stringify(response), {
    headers: { ...corsHeaders, "Content-Type": CONTENT_HEADERS.JSON },
  });
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
  ANONYMOUS_USER,
  CONTENT_HEADERS,
  RESPONSE_FORMATS,

  // Pure functions
  hasUser,
  getUserEmail,
  getUserId,
  getOpenAIResponseFormat,
  buildLoaderContext,
  buildTemplateContext,
  buildChatMessages,
  buildSuccessResponse,
})
