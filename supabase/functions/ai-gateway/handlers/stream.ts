/**
 * Streaming Completion Handler (SSE)
 * Split Lease - AI Gateway
 *
 * NO FALLBACK PRINCIPLE: Fails fast on any error
 *
 * @module ai-gateway/handlers/stream
 */

import { User } from "https://esm.sh/@supabase/supabase-js@2";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../../_shared/cors.ts";
import { AIGatewayRequest, ChatMessage } from "../../_shared/aiTypes.ts";
import { stream } from "../../_shared/openai.ts";
import { getPrompt, loadAllData } from "../prompts/_registry.ts";
import { interpolate } from "../prompts/_template.ts";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[Stream]'
const ANONYMOUS_USER = 'anonymous'

/**
 * SSE content type headers
 * @immutable
 */
const SSE_HEADERS = Object.freeze({
  CONTENT_TYPE: 'text/event-stream',
  CACHE_CONTROL: 'no-cache',
  CONNECTION: 'keep-alive',
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
 * Build SSE response headers
 * @pure
 */
const buildSSEHeaders = (): Record<string, string> => ({
  ...corsHeaders,
  "Content-Type": SSE_HEADERS.CONTENT_TYPE,
  "Cache-Control": SSE_HEADERS.CACHE_CONTROL,
  "Connection": SSE_HEADERS.CONNECTION,
})

// ─────────────────────────────────────────────────────────────
// Effect Boundary
// ─────────────────────────────────────────────────────────────

/**
 * Handle SSE streaming completion request
 * @effectful (database I/O, OpenAI API call, console logging)
 */
export async function handleStream(
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
  // 2. Load required data
  // ─────────────────────────────────────────────────────────

  const loaderContext = buildLoaderContext(user, serviceClient, payload.variables);

  const loadedData = await loadAllData(
    promptConfig.requiredLoaders ?? [],
    loaderContext
  );

  // ─────────────────────────────────────────────────────────
  // 3. Build messages
  // ─────────────────────────────────────────────────────────

  const templateContext = buildTemplateContext(loadedData, payload.variables, user);

  const userPrompt = interpolate(
    promptConfig.userPromptTemplate,
    templateContext
  );

  const messages = buildChatMessages(promptConfig.systemPrompt, userPrompt);

  // ─────────────────────────────────────────────────────────
  // 4. Get stream from OpenAI
  // ─────────────────────────────────────────────────────────

  const openaiStream = await stream(messages as ChatMessage[], {
    model: payload.options?.model ?? promptConfig.defaults.model,
    temperature: payload.options?.temperature ?? promptConfig.defaults.temperature,
    maxTokens: payload.options?.max_tokens ?? promptConfig.defaults.maxTokens,
  });

  console.log(`${LOG_PREFIX} ✅ Stream started`);

  // ─────────────────────────────────────────────────────────
  // 5. Return SSE response (passthrough from OpenAI)
  // ─────────────────────────────────────────────────────────

  return new Response(openaiStream, {
    headers: buildSSEHeaders(),
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
  SSE_HEADERS,

  // Pure functions
  hasUser,
  getUserEmail,
  getUserId,
  buildLoaderContext,
  buildTemplateContext,
  buildChatMessages,
  buildSSEHeaders,
})
