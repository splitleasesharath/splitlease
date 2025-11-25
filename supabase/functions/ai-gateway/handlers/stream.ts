/**
 * Streaming Completion Handler (SSE)
 * Split Lease - AI Gateway
 *
 * NO FALLBACK PRINCIPLE: Fails fast on any error
 */

import { User } from "https://esm.sh/@supabase/supabase-js@2";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../../_shared/cors.ts";
import { AIGatewayRequest, ChatMessage } from "../../_shared/aiTypes.ts";
import { stream } from "../../_shared/openai.ts";
import { getPrompt, loadAllData } from "../prompts/_registry.ts";
import { interpolate } from "../prompts/_template.ts";

interface HandlerContext {
  user: User;
  serviceClient: SupabaseClient;
  request: AIGatewayRequest;
}

export async function handleStream(
  context: HandlerContext
): Promise<Response> {
  const { user, serviceClient, request } = context;
  const { payload } = request;

  console.log(`[Stream] ========== PROCESSING ==========`);
  console.log(`[Stream] Prompt: ${payload.prompt_key}`);
  console.log(`[Stream] User: ${user.email}`);

  // ─────────────────────────────────────────────────────────
  // 1. Get prompt configuration
  // ─────────────────────────────────────────────────────────

  const promptConfig = getPrompt(payload.prompt_key);

  // ─────────────────────────────────────────────────────────
  // 2. Load required data
  // ─────────────────────────────────────────────────────────

  const loaderContext = {
    userId: user.id,
    userEmail: user.email!,
    supabaseClient: serviceClient,
    variables: payload.variables ?? {},
  };

  const loadedData = await loadAllData(
    promptConfig.requiredLoaders ?? [],
    loaderContext
  );

  // ─────────────────────────────────────────────────────────
  // 3. Build messages
  // ─────────────────────────────────────────────────────────

  const templateContext = {
    ...loadedData,
    ...payload.variables,
    user: {
      id: user.id,
      email: user.email,
    },
  };

  const userPrompt = interpolate(
    promptConfig.userPromptTemplate,
    templateContext
  );

  const messages: ChatMessage[] = [
    { role: "system", content: promptConfig.systemPrompt },
    { role: "user", content: userPrompt },
  ];

  // ─────────────────────────────────────────────────────────
  // 4. Get stream from OpenAI
  // ─────────────────────────────────────────────────────────

  const openaiStream = await stream(messages, {
    model: payload.options?.model ?? promptConfig.defaults.model,
    temperature: payload.options?.temperature ?? promptConfig.defaults.temperature,
    maxTokens: payload.options?.max_tokens ?? promptConfig.defaults.maxTokens,
  });

  console.log(`[Stream] ✅ Stream started`);

  // ─────────────────────────────────────────────────────────
  // 5. Return SSE response (passthrough from OpenAI)
  // ─────────────────────────────────────────────────────────

  return new Response(openaiStream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
