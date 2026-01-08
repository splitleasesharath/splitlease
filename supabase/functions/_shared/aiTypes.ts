/**
 * AI Gateway Type Definitions
 * Split Lease - Supabase Edge Functions
 *
 * NO FALLBACK PRINCIPLE: Types enforce strict data shapes
 * All interfaces use readonly modifiers for immutability
 *
 * @module _shared/aiTypes
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

/**
 * Supported OpenAI models
 * @immutable
 */
export const SUPPORTED_MODELS = Object.freeze([
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
  'gpt-3.5-turbo',
] as const)

/**
 * Supported response formats
 * @immutable
 */
export const RESPONSE_FORMATS = Object.freeze([
  'text',
  'json',
] as const)

/**
 * Supported actions for AI Gateway
 * @immutable
 */
export const AI_ACTIONS = Object.freeze([
  'complete',
  'stream',
] as const)

// ─────────────────────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────────────────────

export type SupportedModel = typeof SUPPORTED_MODELS[number]
export type ResponseFormat = typeof RESPONSE_FORMATS[number]
export type AIAction = typeof AI_ACTIONS[number]

/**
 * Prompt configuration - defines a reusable prompt template
 */
export interface PromptConfig {
  readonly key: string;
  readonly name: string;
  readonly description: string;

  // Template configuration
  readonly systemPrompt: string;
  readonly userPromptTemplate: string; // Supports {{variable}} interpolation

  // Model defaults (can be overridden per-request)
  readonly defaults: Readonly<{
    model: SupportedModel;
    temperature: number;
    maxTokens: number;
  }>;

  // Data loaders required for this prompt (load user data from Supabase)
  readonly requiredLoaders?: ReadonlyArray<string>;

  // Response format
  readonly responseFormat?: ResponseFormat;
  readonly jsonSchema?: Readonly<Record<string, unknown>>;
}

/**
 * Data loader - fetches user-specific data for prompt injection
 */
export interface DataLoader {
  readonly key: string;
  readonly name: string;
  readonly load: (context: DataLoaderContext) => Promise<Record<string, unknown>>;
}

export interface DataLoaderContext {
  readonly userId: string;
  readonly userEmail: string;
  readonly supabaseClient: SupabaseClient;
  readonly variables: Readonly<Record<string, unknown>>;
}

// ─────────────────────────────────────────────────────────────
// Request/Response Types
// ─────────────────────────────────────────────────────────────

export interface AIGatewayRequest {
  readonly action: AIAction;
  readonly payload: Readonly<{
    prompt_key: string;
    variables?: Readonly<Record<string, unknown>>;
    options?: Readonly<{
      model?: string;
      temperature?: number;
      max_tokens?: number;
    }>;
  }>;
}

export interface AIGatewayResponse {
  readonly success: boolean;
  readonly data?: Readonly<{
    content: string;
    model: string;
    usage: Readonly<{
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    }>;
  }>;
  readonly error?: string;
}

// ─────────────────────────────────────────────────────────────
// OpenAI Types
// ─────────────────────────────────────────────────────────────

export type ChatRole = 'system' | 'user' | 'assistant'
export type CompletionResponseFormat = 'text' | 'json_object'

export interface ChatMessage {
  readonly role: ChatRole;
  readonly content: string;
}

export interface CompletionOptions {
  readonly model: string;
  readonly temperature: number;
  readonly maxTokens: number;
  readonly responseFormat?: CompletionResponseFormat;
}

export interface CompletionResult {
  readonly content: string;
  readonly model: string;
  readonly usage: Readonly<{
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  }>;
}

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if model is a supported model
 * @pure
 */
export const isSupportedModel = (model: string): model is SupportedModel =>
  SUPPORTED_MODELS.includes(model as SupportedModel)

/**
 * Check if action is a valid AI action
 * @pure
 */
export const isValidAIAction = (action: string): action is AIAction =>
  AI_ACTIONS.includes(action as AIAction)

/**
 * Check if response indicates success
 * @pure
 */
export const isAISuccess = (response: AIGatewayResponse): boolean =>
  response.success === true && response.data !== undefined

// ─────────────────────────────────────────────────────────────
// Exported Test Constants
// ─────────────────────────────────────────────────────────────

/**
 * Exported for testing purposes
 * @test
 */
export const __test__ = Object.freeze({
  // Constants
  SUPPORTED_MODELS,
  RESPONSE_FORMATS,
  AI_ACTIONS,

  // Predicates
  isSupportedModel,
  isValidAIAction,
  isAISuccess,
})
