# AI Gateway Implementation Plan v2

## Overview

A standardized Edge Function for OpenAI API calls that supports dynamic prompts with variable interpolation and optional user data injection. Follows existing codebase patterns (NO FALLBACK principle, atomic operations, structured logging).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           CLIENT                                 │
│                                                                  │
│   POST /functions/v1/ai-gateway                                 │
│   Authorization: Bearer <supabase_token>                        │
│   {                                                              │
│     "action": "complete" | "stream",                            │
│     "payload": {                                                 │
│       "prompt_key": "listing-description",                      │
│       "variables": { "listingId": "abc123" },                   │
│       "options": { "model": "gpt-4o-mini" }                     │
│     }                                                            │
│   }                                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ai-gateway Edge Function                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Authenticate (Supabase token validation)                    │
│  2. Validate request (action, prompt_key, variables)            │
│  3. Resolve prompt template from registry                       │
│  4. Load required data (optional, per prompt config)            │
│  5. Interpolate variables into prompt template                  │
│  6. Call OpenAI API                                             │
│  7. Return response (JSON or SSE stream)                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
supabase/functions/
├── _shared/
│   ├── cors.ts                    # (existing)
│   ├── errors.ts                  # (existing) - add OpenAIError class
│   ├── validation.ts              # (existing)
│   ├── types.ts                   # (existing)
│   ├── openai.ts                  # NEW: OpenAI client wrapper
│   └── aiTypes.ts                 # NEW: AI-specific types
│
└── ai-gateway/
    ├── index.ts                   # Router (complete/stream actions)
    ├── deno.json                  # Import map
    │
    ├── handlers/
    │   ├── complete.ts            # Non-streaming completion
    │   └── stream.ts              # SSE streaming
    │
    └── prompts/
        ├── _registry.ts           # Prompt registry + loader definitions
        ├── _template.ts           # Template interpolation engine
        └── [prompt-name].ts       # Individual prompt definitions
```

---

## Phase 1: Shared Utilities

### 1.1 AI Types (`_shared/aiTypes.ts`)

```typescript
// ─────────────────────────────────────────────────────────────
// AI Gateway Type Definitions
// ─────────────────────────────────────────────────────────────

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
  userPromptTemplate: string;  // Supports {{variable}} interpolation

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
```

---

### 1.2 OpenAI Client (`_shared/openai.ts`)

```typescript
// ─────────────────────────────────────────────────────────────
// OpenAI Client Wrapper
// NO FALLBACK: Fails fast if API key missing or API errors
// ─────────────────────────────────────────────────────────────

import {
  ChatMessage,
  CompletionOptions,
  CompletionResult,
} from "./aiTypes.ts";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

/**
 * Custom error for OpenAI API failures
 */
export class OpenAIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public openaiResponse?: unknown
  ) {
    super(message);
    this.name = "OpenAIError";
  }
}

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

  return response.body!;
}
```

---

### 1.3 Update Errors (`_shared/errors.ts`)

Add to existing file:

```typescript
// Add OpenAIError to imports in other files
export class OpenAIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public openaiResponse?: unknown
  ) {
    super(message);
    this.name = "OpenAIError";
  }
}

// Update getStatusCodeFromError to handle OpenAIError
export function getStatusCodeFromError(error: Error): number {
  if (error instanceof ValidationError) return 400;
  if (error instanceof AuthenticationError) return 401;
  if (error instanceof BubbleApiError) return error.statusCode;
  if (error instanceof OpenAIError) return error.statusCode;  // ADD THIS
  return 500;
}
```

---

## Phase 2: Prompt System

### 2.1 Template Engine (`ai-gateway/prompts/_template.ts`)

```typescript
// ─────────────────────────────────────────────────────────────
// Template Interpolation Engine
// Supports {{variable}} and {{nested.path}} syntax
// NO FALLBACK: Missing variables throw errors
// ─────────────────────────────────────────────────────────────

/**
 * Interpolate template with context values
 * Throws if required variable is missing
 */
export function interpolate(
  template: string,
  context: Record<string, unknown>
): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = getNestedValue(context, path.trim());

    if (value === undefined || value === null) {
      // Log warning but keep placeholder for debugging
      console.warn(`[Template] Missing variable: ${path}`);
      return `[MISSING: ${path}]`;
    }

    // Handle arrays and objects
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }

    return String(value);
  });
}

/**
 * Get nested value from object using dot notation
 * e.g., "user.profile.name" -> obj.user.profile.name
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

/**
 * List all variables used in a template
 * Useful for validation and debugging
 */
export function extractVariables(template: string): string[] {
  const matches = template.matchAll(/\{\{([^}]+)\}\}/g);
  return [...new Set([...matches].map(m => m[1].trim()))];
}
```

---

### 2.2 Prompt Registry (`ai-gateway/prompts/_registry.ts`)

```typescript
// ─────────────────────────────────────────────────────────────
// Prompt Registry
// Central registry of all prompt configurations and data loaders
// ─────────────────────────────────────────────────────────────

import { PromptConfig, DataLoader, DataLoaderContext } from "../../_shared/aiTypes.ts";

// ─────────────────────────────────────────────────────────────
// PROMPT REGISTRY
// ─────────────────────────────────────────────────────────────

const prompts = new Map<string, PromptConfig>();

export function registerPrompt(config: PromptConfig): void {
  if (prompts.has(config.key)) {
    console.warn(`[Prompts] Overwriting existing prompt: ${config.key}`);
  }
  prompts.set(config.key, config);
  console.log(`[Prompts] Registered: ${config.key}`);
}

export function getPrompt(key: string): PromptConfig {
  const prompt = prompts.get(key);
  if (!prompt) {
    const available = Array.from(prompts.keys()).join(", ");
    throw new Error(`Unknown prompt: "${key}". Available: ${available || "(none)"}`);
  }
  return prompt;
}

export function listPrompts(): string[] {
  return Array.from(prompts.keys());
}

// ─────────────────────────────────────────────────────────────
// DATA LOADER REGISTRY
// ─────────────────────────────────────────────────────────────

const loaders = new Map<string, DataLoader>();

export function registerLoader(loader: DataLoader): void {
  loaders.set(loader.key, loader);
  console.log(`[Loaders] Registered: ${loader.key}`);
}

export function getLoader(key: string): DataLoader {
  const loader = loaders.get(key);
  if (!loader) {
    const available = Array.from(loaders.keys()).join(", ");
    throw new Error(`Unknown loader: "${key}". Available: ${available || "(none)"}`);
  }
  return loader;
}

/**
 * Load all required data for a prompt
 * Returns merged data object with loader keys as namespaces
 */
export async function loadAllData(
  loaderKeys: string[],
  context: DataLoaderContext
): Promise<Record<string, unknown>> {
  if (loaderKeys.length === 0) {
    return {};
  }

  console.log(`[Loaders] Loading ${loaderKeys.length} data sources...`);

  const results = await Promise.all(
    loaderKeys.map(async (key) => {
      const loader = getLoader(key);
      const startTime = Date.now();
      const data = await loader.load(context);
      console.log(`[Loaders] ${key} loaded in ${Date.now() - startTime}ms`);
      return { key, data };
    })
  );

  // Merge results into single object with loader keys as namespaces
  const merged: Record<string, unknown> = {};
  for (const { key, data } of results) {
    merged[key] = data;
  }

  return merged;
}

// ─────────────────────────────────────────────────────────────
// BUILT-IN TEST PROMPT
// ─────────────────────────────────────────────────────────────

registerPrompt({
  key: "echo-test",
  name: "Echo Test",
  description: "Simple test prompt for verifying the gateway works",
  systemPrompt: "You are a helpful assistant. Respond concisely.",
  userPromptTemplate: "The user says: {{message}}",
  defaults: {
    model: "gpt-4o-mini",
    temperature: 0.7,
    maxTokens: 500,
  },
  responseFormat: "text",
});

// ─────────────────────────────────────────────────────────────
// BUILT-IN DATA LOADERS
// ─────────────────────────────────────────────────────────────

registerLoader({
  key: "user-profile",
  name: "User Profile",
  async load(context: DataLoaderContext): Promise<Record<string, unknown>> {
    const { userId, supabaseClient } = context;

    const { data, error } = await supabaseClient
      .from("users")
      .select("_id, email, first_name, last_name, phone, bio, profile_photo")
      .eq("_id", userId)
      .single();

    if (error) {
      console.error(`[Loader:user-profile] Error: ${error.message}`);
      // Return minimal data on error - let prompt handle missing fields
      return { id: userId, loaded: false, error: error.message };
    }

    return {
      id: data._id,
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      fullName: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
      phone: data.phone,
      bio: data.bio,
      profilePhoto: data.profile_photo,
      loaded: true,
    };
  },
});

// ─────────────────────────────────────────────────────────────
// IMPORT CUSTOM PROMPTS HERE
// Add new prompts by creating files and importing them
// ─────────────────────────────────────────────────────────────

// import "./listing-description.ts";
// import "./market-analysis.ts";
```

---

## Phase 3: Handlers

### 3.1 Complete Handler (`ai-gateway/handlers/complete.ts`)

```typescript
// ─────────────────────────────────────────────────────────────
// Non-Streaming Completion Handler
// ─────────────────────────────────────────────────────────────

import { User } from "https://esm.sh/@supabase/supabase-js@2";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../../_shared/cors.ts";
import { AIGatewayRequest, AIGatewayResponse, ChatMessage } from "../../_shared/aiTypes.ts";
import { complete } from "../../_shared/openai.ts";
import { getPrompt, loadAllData } from "../prompts/_registry.ts";
import { interpolate } from "../prompts/_template.ts";

interface HandlerContext {
  user: User;
  serviceClient: SupabaseClient;
  request: AIGatewayRequest;
}

export async function handleComplete(context: HandlerContext): Promise<Response> {
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

  const userPrompt = interpolate(promptConfig.userPromptTemplate, templateContext);

  const messages: ChatMessage[] = [
    { role: "system", content: promptConfig.systemPrompt },
    { role: "user", content: userPrompt },
  ];

  console.log(`[Complete] System prompt: ${promptConfig.systemPrompt.substring(0, 100)}...`);
  console.log(`[Complete] User prompt: ${userPrompt.substring(0, 200)}...`);

  // ─────────────────────────────────────────────────────────
  // 4. Call OpenAI
  // ─────────────────────────────────────────────────────────

  const result = await complete(messages, {
    model: payload.options?.model ?? promptConfig.defaults.model,
    temperature: payload.options?.temperature ?? promptConfig.defaults.temperature,
    maxTokens: payload.options?.max_tokens ?? promptConfig.defaults.maxTokens,
    responseFormat: promptConfig.responseFormat === "json" ? "json_object" : "text",
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
```

---

### 3.2 Stream Handler (`ai-gateway/handlers/stream.ts`)

```typescript
// ─────────────────────────────────────────────────────────────
// Streaming Completion Handler (SSE)
// ─────────────────────────────────────────────────────────────

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

export async function handleStream(context: HandlerContext): Promise<Response> {
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

  const userPrompt = interpolate(promptConfig.userPromptTemplate, templateContext);

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
```

---

### 3.3 Main Router (`ai-gateway/index.ts`)

```typescript
// ─────────────────────────────────────────────────────────────
// AI Gateway Edge Function
// Routes AI requests to appropriate handlers
// ─────────────────────────────────────────────────────────────

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { AIGatewayRequest } from "../_shared/aiTypes.ts";
import { ValidationError, formatErrorResponse, getStatusCodeFromError } from "../_shared/errors.ts";
import { validateRequired, validateAction } from "../_shared/validation.ts";

import { handleComplete } from "./handlers/complete.ts";
import { handleStream } from "./handlers/stream.ts";

// Import prompt registry to register all prompts
import "./prompts/_registry.ts";

// ─────────────────────────────────────────────────────────────
// Allowed actions
// ─────────────────────────────────────────────────────────────

const ALLOWED_ACTIONS = ["complete", "stream"];

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  console.log(`[ai-gateway] ========== REQUEST ==========`);
  console.log(`[ai-gateway] Method: ${req.method}`);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only POST allowed
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // ─────────────────────────────────────────────────────────
    // 1. Authenticate user
    // ─────────────────────────────────────────────────────────

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new ValidationError("Missing Authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client for auth validation
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      console.error(`[ai-gateway] Auth failed:`, authError?.message);
      throw new ValidationError("Invalid or expired token");
    }

    console.log(`[ai-gateway] Authenticated: ${user.email}`);

    // Service client for data operations (bypasses RLS)
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // ─────────────────────────────────────────────────────────
    // 2. Parse and validate request
    // ─────────────────────────────────────────────────────────

    const body: AIGatewayRequest = await req.json();

    validateRequired(body.action, "action");
    validateRequired(body.payload, "payload");
    validateRequired(body.payload.prompt_key, "payload.prompt_key");
    validateAction(body.action, ALLOWED_ACTIONS);

    console.log(`[ai-gateway] Action: ${body.action}`);
    console.log(`[ai-gateway] Prompt: ${body.payload.prompt_key}`);

    // ─────────────────────────────────────────────────────────
    // 3. Route to handler
    // ─────────────────────────────────────────────────────────

    const context = {
      user,
      serviceClient,
      request: body,
    };

    switch (body.action) {
      case "complete":
        return await handleComplete(context);

      case "stream":
        return await handleStream(context);

      default:
        throw new ValidationError(`Unhandled action: ${body.action}`);
    }

  } catch (error) {
    console.error(`[ai-gateway] ========== ERROR ==========`);
    console.error(`[ai-gateway]`, error);

    const statusCode = getStatusCodeFromError(error as Error);
    const errorResponse = formatErrorResponse(error as Error);

    return new Response(
      JSON.stringify(errorResponse),
      {
        status: statusCode,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
```

---

### 3.4 Deno Config (`ai-gateway/deno.json`)

```json
{
  "imports": {}
}
```

---

## Phase 4: Example Prompts

### 4.1 Listing Description Prompt

```typescript
// ai-gateway/prompts/listing-description.ts

import { registerPrompt } from "./_registry.ts";

registerPrompt({
  key: "listing-description",
  name: "Listing Description Generator",
  description: "Generates compelling rental listing descriptions",

  systemPrompt: `You are an expert real estate copywriter specializing in rental listings.
Your descriptions are:
- Compelling and engaging (150-250 words)
- Highlight key features naturally
- Use sensory language
- Professional but warm tone

Never fabricate features not provided. Focus on what's available.`,

  userPromptTemplate: `Generate a rental listing description for:

**Property Details:**
- Type: {{propertyType}}
- Bedrooms: {{bedrooms}}
- Bathrooms: {{bathrooms}}
- Monthly Rent: ${{rent}}

**Location:**
- City: {{city}}
- Neighborhood: {{neighborhood}}

**Features:**
{{features}}

**Additional Notes:**
{{notes}}

Generate an engaging description that would appeal to potential renters.`,

  defaults: {
    model: "gpt-4o",
    temperature: 0.8,
    maxTokens: 1000,
  },

  responseFormat: "text",
});
```

### 4.2 Market Analysis Prompt (with data loader)

```typescript
// ai-gateway/prompts/market-analysis.ts

import { registerPrompt, registerLoader } from "./_registry.ts";

// Register prompt
registerPrompt({
  key: "market-analysis",
  name: "Rental Market Analysis",
  description: "Analyzes rental market for a user's location",

  systemPrompt: `You are a rental market analyst. Provide data-driven insights about rental markets.
Base analysis on the user data provided. Be specific with numbers when available.
Format response as structured JSON.`,

  userPromptTemplate: `Analyze the rental market for this user:

**User Profile:**
- Name: {{user-profile.fullName}}
- Location Interest: {{city}}
- Budget Range: ${{minBudget}} - ${{maxBudget}}

**Request:**
{{analysisType}}

Provide market insights relevant to their situation.`,

  defaults: {
    model: "gpt-4o",
    temperature: 0.3,
    maxTokens: 1500,
  },

  requiredLoaders: ["user-profile"],
  responseFormat: "json",
  jsonSchema: {
    type: "object",
    properties: {
      marketSummary: { type: "string" },
      priceRange: { type: "object" },
      recommendations: { type: "array" },
    },
  },
});
```

---

## Phase 5: Required Secrets

The following secret is already configured:

```bash
# Already set
supabase secrets set OPENAI_API_KEY=sk-...
```

No additional secrets required - the gateway uses existing Supabase environment variables:
- `SUPABASE_URL` (auto-provided)
- `SUPABASE_ANON_KEY` (auto-provided)
- `SUPABASE_SERVICE_ROLE_KEY` (auto-provided)

---

## Implementation Checklist

### Phase 1: Shared Utilities
- [ ] Create `_shared/aiTypes.ts`
- [ ] Create `_shared/openai.ts`
- [ ] Update `_shared/errors.ts` (add OpenAIError)

### Phase 2: Prompt System
- [ ] Create `ai-gateway/prompts/_template.ts`
- [ ] Create `ai-gateway/prompts/_registry.ts`

### Phase 3: Handlers
- [ ] Create `ai-gateway/handlers/complete.ts`
- [ ] Create `ai-gateway/handlers/stream.ts`
- [ ] Create `ai-gateway/index.ts`
- [ ] Create `ai-gateway/deno.json`

### Phase 4: Testing
- [ ] Deploy edge function
- [ ] Test `echo-test` prompt (no loaders)
- [ ] Test with variables
- [ ] Test streaming endpoint

### Phase 5: Custom Prompts
- [ ] Create prompts for your specific use cases
- [ ] Add data loaders as needed

---

## Client Usage Examples

### Basic Completion

```typescript
const response = await supabase.functions.invoke('ai-gateway', {
  body: {
    action: 'complete',
    payload: {
      prompt_key: 'echo-test',
      variables: {
        message: 'Hello, how are you?'
      }
    }
  }
});

console.log(response.data.data.content);
```

### With Custom Options

```typescript
const response = await supabase.functions.invoke('ai-gateway', {
  body: {
    action: 'complete',
    payload: {
      prompt_key: 'listing-description',
      variables: {
        propertyType: 'Apartment',
        bedrooms: 2,
        bathrooms: 1,
        rent: 2500,
        city: 'San Francisco',
        neighborhood: 'Mission District',
        features: '- In-unit laundry\n- Hardwood floors\n- Updated kitchen',
        notes: 'Pet-friendly, close to BART'
      },
      options: {
        model: 'gpt-4o-mini',  // Use cheaper model
        temperature: 0.9       // More creative
      }
    }
  }
});
```

### Streaming

```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-gateway`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  },
  body: JSON.stringify({
    action: 'stream',
    payload: {
      prompt_key: 'listing-description',
      variables: { /* ... */ }
    }
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  // Handle SSE chunks
  console.log(chunk);
}
```

---

## Differences from Original Plan (v1)

| Feature | v1 (Original) | v2 (This Plan) |
|---------|---------------|----------------|
| Caching | Supabase table + TTL | **Removed** - adds complexity, can add later |
| Deduplication | In-memory Map | **Removed** - edge cases, can add later |
| File count | 15+ files | **8 files** - simpler structure |
| Data loaders | Separate directory | **Inline in registry** - easier to manage |
| Error handling | Custom classes | **Use existing** `_shared/errors.ts` |
| Logging | Custom format | **Match existing** `[prefix]` pattern |

---

## Future Enhancements (Not in v1)

1. **Response Caching** - Add Supabase table for caching (when needed)
2. **Rate Limiting** - Per-user limits to prevent abuse
3. **Usage Tracking** - Log requests for analytics/billing
4. **Conversation Memory** - Multi-turn context with conversation_id
5. **Multiple Providers** - Abstract to support Claude, Gemini
6. **Prompt Versioning** - A/B testing different prompts

---

## Notes

- Follows **NO FALLBACK** principle throughout
- Uses existing codebase patterns for consistency
- Minimal viable implementation - expand as needed
- All validation happens before API calls
- Errors fail fast with descriptive messages
