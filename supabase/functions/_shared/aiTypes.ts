/**
 * AI Gateway Type Definitions
 * Split Lease - Supabase Edge Functions
 *
 * NO FALLBACK PRINCIPLE: Types enforce strict data shapes
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Prompt configuration - defines a reusable prompt template
 */
export interface PromptConfig {
  key: string;
  name: string;
  description: string;

  // Template configuration
  systemPrompt: string;
  userPromptTemplate: string; // Supports {{variable}} interpolation

  // Model defaults (can be overridden per-request)
  defaults: {
    model: "gpt-4o" | "gpt-4o-mini" | "gpt-4-turbo" | "gpt-3.5-turbo";
    temperature: number;
    maxTokens: number;
  };

  // Data loaders required for this prompt (load user data from Supabase)
  requiredLoaders?: string[];

  // Response format
  responseFormat?: "text" | "json";
  jsonSchema?: Record<string, unknown>;
}

/**
 * Data loader - fetches user-specific data for prompt injection
 */
export interface DataLoader {
  key: string;
  name: string;
  load: (context: DataLoaderContext) => Promise<Record<string, unknown>>;
}

export interface DataLoaderContext {
  userId: string;
  userEmail: string;
  supabaseClient: SupabaseClient;
  variables: Record<string, unknown>;
}

/**
 * Request/Response types
 */
export interface AIGatewayRequest {
  action: "complete" | "stream";
  payload: {
    prompt_key: string;
    variables?: Record<string, unknown>;
    options?: {
      model?: string;
      temperature?: number;
      max_tokens?: number;
    };
  };
}

export interface AIGatewayResponse {
  success: boolean;
  data?: {
    content: string;
    model: string;
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  };
  error?: string;
}

/**
 * OpenAI types
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionOptions {
  model: string;
  temperature: number;
  maxTokens: number;
  responseFormat?: "text" | "json_object";
}

export interface CompletionResult {
  content: string;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
