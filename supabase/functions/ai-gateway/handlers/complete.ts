/**
 * Non-Streaming Completion Handler
 * Split Lease - AI Gateway
 *
 * NO FALLBACK PRINCIPLE: Fails fast on any error
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

interface HandlerContext {
  user: User;
  serviceClient: SupabaseClient;
  request: AIGatewayRequest;
}

export async function handleComplete(
  context: HandlerContext
): Promise<Response> {
  const { user, serviceClient, request } = context;
  const { payload } = request;

  console.log(`[Complete] ========== PROCESSING ==========`);
  console.log(`[Complete] Prompt: ${payload.prompt_key}`);
  console.log(`[Complete] User: ${user.email}`);

  // ─────────────────────────────────────────────────────────
  // 1. Get prompt configuration
  // ─────────────────────────────────────────────────────────

  const promptConfig = getPrompt(payload.prompt_key);

  // ─────────────────────────────────────────────────────────
  // 2. Load required data (if any loaders specified)
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
  // 3. Build messages with interpolated templates
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

  console.log(
    `[Complete] System prompt: ${promptConfig.systemPrompt.substring(0, 100)}...`
  );
  console.log(`[Complete] User prompt: ${userPrompt.substring(0, 200)}...`);

  // ─────────────────────────────────────────────────────────
  // 4. Call OpenAI
  // ─────────────────────────────────────────────────────────

  const result = await complete(messages, {
    model: payload.options?.model ?? promptConfig.defaults.model,
    temperature: payload.options?.temperature ?? promptConfig.defaults.temperature,
    maxTokens: payload.options?.max_tokens ?? promptConfig.defaults.maxTokens,
    responseFormat:
      promptConfig.responseFormat === "json" ? "json_object" : "text",
  });

  // ─────────────────────────────────────────────────────────
  // 5. Return response
  // ─────────────────────────────────────────────────────────

  console.log(`[Complete] ✅ Success. Tokens used: ${result.usage.total_tokens}`);

  const response: AIGatewayResponse = {
    success: true,
    data: {
      content: result.content,
      model: result.model,
      usage: result.usage,
    },
  };

  return new Response(JSON.stringify(response), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
