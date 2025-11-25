# AI Gateway Implementation Plan

## Executive Summary

A flexible, extensible Edge Function architecture for ChatGPT integration that supports:
- Dynamic prompt templates (code-defined, easily extensible)
- Selective user data injection
- Both streaming and completion endpoints
- Request deduplication and optional caching
- User-specific responses with configurable behavior per use case

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT                                          │
│                                                                              │
│   POST /functions/v1/ai-gateway                                             │
│   {                                                                          │
│     action: "complete" | "stream",                                          │
│     payload: {                                                               │
│       prompt_key: string,           // Which prompt template                │
│       data_loaders: string[],       // Which user data to inject            │
│       variables: Record<string,any>,// Custom template variables            │
│       options?: {                                                            │
│         cache_ttl?: number,         // 0 = no cache (default)               │
│         model?: string,             // Override default model               │
│         temperature?: number        // Override default temp                │
│       }                                                                      │
│     }                                                                        │
│   }                                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ai-gateway Edge Function                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │   Router     │───▶│  Deduplicator│───▶│ Prompt       │                   │
│  │              │    │  (in-flight) │    │ Resolver     │                   │
│  └──────────────┘    └──────────────┘    └──────────────┘                   │
│                                                 │                            │
│                                                 ▼                            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │   Response   │◀───│   OpenAI     │◀───│ Data Loader  │                   │
│  │   Handler    │    │   Client     │    │ Aggregator   │                   │
│  └──────────────┘    └──────────────┘    └──────────────┘                   │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────┐                                                           │
│  │ Cache Writer │ (optional, based on options.cache_ttl)                    │
│  └──────────────┘                                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
supabase/functions/
├── ai-gateway/
│   ├── index.ts                    # Main router (action dispatch)
│   ├── deno.json                   # Import map
│   │
│   ├── handlers/
│   │   ├── complete.ts             # Non-streaming completion handler
│   │   └── stream.ts               # SSE streaming handler
│   │
│   ├── prompts/
│   │   ├── _registry.ts            # Prompt registry (maps keys to configs)
│   │   ├── _base.ts                # Base types and template engine
│   │   │
│   │   │── example-listing-description.ts    # Example prompt (delete later)
│   │   └── example-market-analysis.ts        # Example prompt (delete later)
│   │
│   └── loaders/
│       ├── _registry.ts            # Data loader registry
│       ├── _base.ts                # Base loader interface
│       │
│       ├── user-profile.ts         # Loads user profile from Supabase
│       ├── user-listings.ts        # Loads user's listings
│       └── user-preferences.ts     # Loads user preferences/settings
│
├── _shared/
│   ├── ... (existing files)
│   │
│   ├── openai.ts                   # OpenAI client wrapper
│   ├── aiTypes.ts                  # AI-specific TypeScript types
│   ├── aiCache.ts                  # Cache utilities (Supabase table)
│   └── aiDedup.ts                  # In-flight request deduplication
```

---

## Phase 1: Foundation

### 1.1 Create Shared AI Types

**File: `supabase/functions/_shared/aiTypes.ts`**

```typescript
// ─────────────────────────────────────────────────────────────
// AI Gateway Type Definitions
// ─────────────────────────────────────────────────────────────

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

  // Required data loaders for this prompt
  requiredLoaders: string[];

  // Optional: response format
  responseFormat?: "text" | "json";
  jsonSchema?: Record<string, unknown>;  // For structured outputs
}

export interface DataLoaderResult {
  key: string;
  data: Record<string, unknown>;
  loadedAt: number;
}

export interface DataLoaderContext {
  userId: string;
  userEmail: string;
  supabaseClient: SupabaseClient;  // Service role client for data access
  variables: Record<string, unknown>;  // Request variables (may contain IDs)
}

export interface DataLoader {
  key: string;
  name: string;
  description: string;
  load: (context: DataLoaderContext) => Promise<DataLoaderResult>;
}

export interface AIGatewayRequest {
  action: "complete" | "stream";
  payload: {
    prompt_key: string;
    data_loaders?: string[];  // Optional override of required loaders
    variables?: Record<string, unknown>;
    options?: {
      cache_ttl?: number;      // Seconds. 0 or undefined = no cache
      model?: string;          // Override prompt default
      temperature?: number;    // Override prompt default
      max_tokens?: number;     // Override prompt default
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
    cached: boolean;
    cache_key?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface CacheEntry {
  id: string;
  cache_key: string;
  prompt_key: string;
  user_id: string;
  request_hash: string;
  response_content: string;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  created_at: string;
  expires_at: string;
}
```

---

### 1.2 Create OpenAI Client Wrapper

**File: `supabase/functions/_shared/openai.ts`**

```typescript
// ─────────────────────────────────────────────────────────────
// OpenAI Client Wrapper
// NO FALLBACK: Fails fast if API key missing or API errors
// ─────────────────────────────────────────────────────────────

import { PromptConfig } from "./aiTypes.ts";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

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

/**
 * Get the OpenAI API key from environment
 * Throws if not configured
 */
function getApiKey(): string {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) {
    throw new Error("OPENAI_API_KEY not configured in Supabase secrets");
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
    throw new Error(`OpenAI API error: ${response.status} - ${errorBody}`);
  }

  const result = await response.json();

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
    throw new Error(`OpenAI API error: ${response.status} - ${errorBody}`);
  }

  // Return the response body directly for SSE passthrough
  return response.body!;
}

/**
 * Build chat messages from a prompt config and loaded data
 */
export function buildMessages(
  config: PromptConfig,
  loadedData: Record<string, unknown>,
  variables: Record<string, unknown>
): ChatMessage[] {
  // Merge loaded data and variables for template interpolation
  const templateContext = { ...loadedData, ...variables };

  // Interpolate user prompt template
  const userPrompt = interpolateTemplate(config.userPromptTemplate, templateContext);

  return [
    { role: "system", content: config.systemPrompt },
    { role: "user", content: userPrompt },
  ];
}

/**
 * Simple template interpolation: {{variable}} -> value
 * Supports nested access: {{user.name}}, {{listing.address.city}}
 */
function interpolateTemplate(
  template: string,
  context: Record<string, unknown>
): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = getNestedValue(context, path.trim());
    if (value === undefined) {
      console.warn(`[Template] Missing variable: ${path}`);
      return match;  // Keep placeholder if not found
    }
    return String(value);
  });
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}
```

---

### 1.3 Cache Utilities

**File: `supabase/functions/_shared/aiCache.ts`**

```typescript
// ─────────────────────────────────────────────────────────────
// AI Response Cache Utilities
// Uses Supabase table for persistent caching
// ─────────────────────────────────────────────────────────────

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CacheEntry } from "./aiTypes.ts";

const CACHE_TABLE = "ai_response_cache";

/**
 * Generate a deterministic cache key from request parameters
 */
export function generateCacheKey(
  promptKey: string,
  userId: string,
  variables: Record<string, unknown>,
  loadedData: Record<string, unknown>
): string {
  const payload = JSON.stringify({
    prompt: promptKey,
    user: userId,
    vars: variables,
    data: loadedData,
  });

  // Simple hash using Web Crypto API
  return hashString(payload);
}

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Check cache for existing response
 */
export async function checkCache(
  client: SupabaseClient,
  cacheKey: string
): Promise<CacheEntry | null> {
  const { data, error } = await client
    .from(CACHE_TABLE)
    .select("*")
    .eq("cache_key", cacheKey)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error || !data) {
    return null;
  }

  console.log(`[Cache] HIT for key: ${cacheKey.substring(0, 16)}...`);
  return data as CacheEntry;
}

/**
 * Store response in cache
 */
export async function storeInCache(
  client: SupabaseClient,
  entry: Omit<CacheEntry, "id" | "created_at">
): Promise<void> {
  const { error } = await client
    .from(CACHE_TABLE)
    .upsert({
      ...entry,
      created_at: new Date().toISOString(),
    }, {
      onConflict: "cache_key",
    });

  if (error) {
    console.error(`[Cache] Failed to store: ${error.message}`);
    // Non-fatal: don't throw, just log
  } else {
    console.log(`[Cache] Stored key: ${entry.cache_key.substring(0, 16)}...`);
  }
}

/**
 * Create Supabase client with service role for cache operations
 */
export function createCacheClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase configuration missing for cache");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}
```

---

### 1.4 Request Deduplication

**File: `supabase/functions/_shared/aiDedup.ts`**

```typescript
// ─────────────────────────────────────────────────────────────
// In-Flight Request Deduplication
// Prevents duplicate API calls for identical concurrent requests
// ─────────────────────────────────────────────────────────────

// In-memory store for in-flight requests
// Key: request hash, Value: Promise of the result
const inFlightRequests = new Map<string, Promise<unknown>>();

// Cleanup timeout (requests older than this are considered stale)
const DEDUP_WINDOW_MS = 10000;  // 10 seconds

/**
 * Execute a function with deduplication
 * If an identical request is already in-flight, return the same promise
 */
export async function deduplicated<T>(
  requestHash: string,
  executor: () => Promise<T>
): Promise<T> {
  // Check if we have an in-flight request
  const existing = inFlightRequests.get(requestHash);
  if (existing) {
    console.log(`[Dedup] Reusing in-flight request: ${requestHash.substring(0, 16)}...`);
    return existing as Promise<T>;
  }

  // Create new request promise
  const promise = executor();
  inFlightRequests.set(requestHash, promise);

  // Schedule cleanup
  setTimeout(() => {
    inFlightRequests.delete(requestHash);
  }, DEDUP_WINDOW_MS);

  try {
    const result = await promise;
    return result;
  } finally {
    // Remove from in-flight after completion (or error)
    // The setTimeout handles cleanup for truly concurrent requests
  }
}

/**
 * Generate request hash for deduplication
 */
export function generateRequestHash(
  promptKey: string,
  userId: string,
  variables: Record<string, unknown>
): string {
  const payload = JSON.stringify({ promptKey, userId, variables });
  // Simple fast hash for deduplication (doesn't need crypto strength)
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;  // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}
```

---

## Phase 2: Prompt System

### 2.1 Base Prompt Types and Registry

**File: `supabase/functions/ai-gateway/prompts/_base.ts`**

```typescript
// ─────────────────────────────────────────────────────────────
// Prompt Base Types and Utilities
// ─────────────────────────────────────────────────────────────

import { PromptConfig } from "../../_shared/aiTypes.ts";

export type { PromptConfig };

/**
 * Helper to define a prompt with type safety
 */
export function definePrompt(config: PromptConfig): PromptConfig {
  return config;
}

/**
 * Validate that all required loaders are present
 */
export function validateLoaders(
  prompt: PromptConfig,
  providedLoaders: string[]
): void {
  const missing = prompt.requiredLoaders.filter(
    required => !providedLoaders.includes(required)
  );

  if (missing.length > 0) {
    throw new Error(
      `Prompt "${prompt.key}" requires loaders: ${missing.join(", ")}`
    );
  }
}
```

**File: `supabase/functions/ai-gateway/prompts/_registry.ts`**

```typescript
// ─────────────────────────────────────────────────────────────
// Prompt Registry
// Central registry of all available prompt configurations
// Add new prompts here as the application grows
// ─────────────────────────────────────────────────────────────

import { PromptConfig } from "./_base.ts";

// Import prompt definitions
// import { listingDescriptionPrompt } from "./listing-description.ts";
// import { marketAnalysisPrompt } from "./market-analysis.ts";

// ─────────────────────────────────────────────────────────────
// REGISTRY
// Add all prompts to this map
// ─────────────────────────────────────────────────────────────

const prompts = new Map<string, PromptConfig>();

// Register prompts
// prompts.set(listingDescriptionPrompt.key, listingDescriptionPrompt);
// prompts.set(marketAnalysisPrompt.key, marketAnalysisPrompt);

// ─────────────────────────────────────────────────────────────
// Registry Functions
// ─────────────────────────────────────────────────────────────

export function getPrompt(key: string): PromptConfig {
  const prompt = prompts.get(key);
  if (!prompt) {
    const available = Array.from(prompts.keys()).join(", ");
    throw new Error(
      `Unknown prompt key: "${key}". Available: ${available || "(none registered)"}`
    );
  }
  return prompt;
}

export function listPrompts(): string[] {
  return Array.from(prompts.keys());
}

export function registerPrompt(prompt: PromptConfig): void {
  if (prompts.has(prompt.key)) {
    console.warn(`[Prompts] Overwriting existing prompt: ${prompt.key}`);
  }
  prompts.set(prompt.key, prompt);
}

// ─────────────────────────────────────────────────────────────
// Example Prompt (for testing - remove in production)
// ─────────────────────────────────────────────────────────────

registerPrompt({
  key: "echo-test",
  name: "Echo Test",
  description: "Simple test prompt that echoes user input",
  systemPrompt: "You are a helpful assistant. Respond concisely.",
  userPromptTemplate: "The user says: {{message}}",
  defaults: {
    model: "gpt-4o-mini",
    temperature: 0.7,
    maxTokens: 500,
  },
  requiredLoaders: [],  // No data loaders required
  responseFormat: "text",
});
```

---

### 2.2 Example Prompts (Templates for Future Use)

**File: `supabase/functions/ai-gateway/prompts/example-listing-description.ts`**

```typescript
// ─────────────────────────────────────────────────────────────
// Example: Listing Description Generator
// DELETE THIS FILE - It's just an example template
// ─────────────────────────────────────────────────────────────

import { definePrompt } from "./_base.ts";

export const listingDescriptionPrompt = definePrompt({
  key: "listing-description",
  name: "Listing Description Generator",
  description: "Generates compelling rental listing descriptions",

  systemPrompt: `You are an expert real estate copywriter specializing in rental listings.
Your descriptions are:
- Compelling and engaging
- Highlight key features naturally
- Use sensory language
- Include neighborhood context when available
- Appropriate length (150-250 words)
- Professional but warm tone

Never fabricate features not provided. If information is missing, focus on what's available.`,

  userPromptTemplate: `Generate a rental listing description for:

**Property Details:**
- Type: {{listing.propertyType}}
- Bedrooms: {{listing.bedrooms}}
- Bathrooms: {{listing.bathrooms}}
- Square Feet: {{listing.sqft}}
- Monthly Rent: ${{listing.rent}}

**Location:**
- City: {{listing.city}}
- Neighborhood: {{listing.neighborhood}}

**Features:**
{{listing.features}}

**Host Notes:**
{{variables.hostNotes}}

Generate an engaging description that would appeal to potential renters.`,

  defaults: {
    model: "gpt-4o",
    temperature: 0.8,
    maxTokens: 1000,
  },

  requiredLoaders: ["listing-context"],
  responseFormat: "text",
});
```

**File: `supabase/functions/ai-gateway/prompts/example-market-analysis.ts`**

```typescript
// ─────────────────────────────────────────────────────────────
// Example: Market Analysis
// DELETE THIS FILE - It's just an example template
// ─────────────────────────────────────────────────────────────

import { definePrompt } from "./_base.ts";

export const marketAnalysisPrompt = definePrompt({
  key: "market-analysis",
  name: "Rental Market Analysis",
  description: "Analyzes rental market conditions for a location",

  systemPrompt: `You are a rental market analyst. Provide data-driven insights about rental markets.
Base your analysis on the user data and market context provided.
Be specific with numbers when available, otherwise give ranges.
Format your response as structured JSON.`,

  userPromptTemplate: `Analyze the rental market for the following user:

**User Profile:**
- Location Interest: {{user.preferredCity}}
- Budget Range: ${{user.minBudget}} - ${{user.maxBudget}}
- Property Preference: {{user.preferredType}}

**Their Current Listings (if any):**
{{userListings.summary}}

**Request:**
{{variables.analysisType}}

Provide market insights relevant to their situation.`,

  defaults: {
    model: "gpt-4o",
    temperature: 0.3,  // Lower temp for analytical content
    maxTokens: 1500,
  },

  requiredLoaders: ["user-profile", "user-listings"],
  responseFormat: "json",
  jsonSchema: {
    type: "object",
    properties: {
      marketSummary: { type: "string" },
      priceRange: {
        type: "object",
        properties: {
          low: { type: "number" },
          median: { type: "number" },
          high: { type: "number" },
        },
      },
      recommendations: {
        type: "array",
        items: { type: "string" },
      },
      outlook: { type: "string" },
    },
  },
});
```

---

## Phase 3: Data Loaders

### 3.1 Base Loader and Registry

**File: `supabase/functions/ai-gateway/loaders/_base.ts`**

```typescript
// ─────────────────────────────────────────────────────────────
// Data Loader Base Types
// ─────────────────────────────────────────────────────────────

import { DataLoader, DataLoaderContext, DataLoaderResult } from "../../_shared/aiTypes.ts";

export type { DataLoader, DataLoaderContext, DataLoaderResult };

/**
 * Helper to define a loader with type safety
 */
export function defineLoader(loader: DataLoader): DataLoader {
  return loader;
}
```

**File: `supabase/functions/ai-gateway/loaders/_registry.ts`**

```typescript
// ─────────────────────────────────────────────────────────────
// Data Loader Registry
// Central registry for all data loaders
// ─────────────────────────────────────────────────────────────

import { DataLoader, DataLoaderContext, DataLoaderResult } from "./_base.ts";
import { userProfileLoader } from "./user-profile.ts";
// import { userListingsLoader } from "./user-listings.ts";
// import { userPreferencesLoader } from "./user-preferences.ts";

// ─────────────────────────────────────────────────────────────
// REGISTRY
// ─────────────────────────────────────────────────────────────

const loaders = new Map<string, DataLoader>();

// Register loaders
loaders.set(userProfileLoader.key, userProfileLoader);
// loaders.set(userListingsLoader.key, userListingsLoader);
// loaders.set(userPreferencesLoader.key, userPreferencesLoader);

// ─────────────────────────────────────────────────────────────
// Registry Functions
// ─────────────────────────────────────────────────────────────

export function getLoader(key: string): DataLoader {
  const loader = loaders.get(key);
  if (!loader) {
    const available = Array.from(loaders.keys()).join(", ");
    throw new Error(
      `Unknown loader key: "${key}". Available: ${available || "(none registered)"}`
    );
  }
  return loader;
}

export function listLoaders(): string[] {
  return Array.from(loaders.keys());
}

/**
 * Load multiple data sources in parallel
 * Returns merged data object with loader keys as top-level properties
 */
export async function loadAll(
  loaderKeys: string[],
  context: DataLoaderContext
): Promise<Record<string, unknown>> {
  console.log(`[Loaders] Loading ${loaderKeys.length} data sources...`);

  const results = await Promise.all(
    loaderKeys.map(async (key) => {
      const loader = getLoader(key);
      const startTime = Date.now();
      const result = await loader.load(context);
      console.log(`[Loaders] ${key} loaded in ${Date.now() - startTime}ms`);
      return result;
    })
  );

  // Merge results into single object
  const merged: Record<string, unknown> = {};
  for (const result of results) {
    merged[result.key] = result.data;
  }

  return merged;
}
```

---

### 3.2 User Profile Loader

**File: `supabase/functions/ai-gateway/loaders/user-profile.ts`**

```typescript
// ─────────────────────────────────────────────────────────────
// User Profile Data Loader
// Loads user profile from Supabase for prompt injection
// ─────────────────────────────────────────────────────────────

import { defineLoader, DataLoaderContext, DataLoaderResult } from "./_base.ts";

export const userProfileLoader = defineLoader({
  key: "user-profile",
  name: "User Profile",
  description: "Loads user profile data from Supabase",

  async load(context: DataLoaderContext): Promise<DataLoaderResult> {
    const { userId, supabaseClient } = context;

    // Query user profile from Supabase
    // Adjust table/column names to match your schema
    const { data, error } = await supabaseClient
      .from("users")
      .select(`
        _id,
        email,
        first_name,
        last_name,
        phone,
        created_at,
        profile_photo,
        bio
      `)
      .eq("_id", userId)
      .single();

    if (error) {
      console.error(`[UserProfileLoader] Error: ${error.message}`);
      // Return empty profile rather than failing the entire request
      // The prompt can handle missing data gracefully
      return {
        key: "user",
        data: {
          id: userId,
          loaded: false,
          error: error.message,
        },
        loadedAt: Date.now(),
      };
    }

    return {
      key: "user",
      data: {
        id: data._id,
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        fullName: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
        phone: data.phone,
        createdAt: data.created_at,
        profilePhoto: data.profile_photo,
        bio: data.bio,
        loaded: true,
      },
      loadedAt: Date.now(),
    };
  },
});
```

---

## Phase 4: Main Handler

### 4.1 Gateway Router

**File: `supabase/functions/ai-gateway/index.ts`**

```typescript
// ─────────────────────────────────────────────────────────────
// AI Gateway Edge Function
// Routes AI requests to appropriate handlers
// ─────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { AIGatewayRequest } from "../_shared/aiTypes.ts";
import { ValidationError, formatErrorResponse, getStatusCodeFromError } from "../_shared/errors.ts";
import { validateRequired } from "../_shared/validation.ts";

import { handleComplete } from "./handlers/complete.ts";
import { handleStream } from "./handlers/stream.ts";

// ─────────────────────────────────────────────────────────────
// Allowed actions
// ─────────────────────────────────────────────────────────────

const ALLOWED_ACTIONS = ["complete", "stream"] as const;
type AllowedAction = typeof ALLOWED_ACTIONS[number];

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only POST allowed
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
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
      throw new ValidationError("Invalid or expired token");
    }

    console.log(`[AI-Gateway] Authenticated user: ${user.email}`);

    // Service client for data operations (bypasses RLS)
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // ─────────────────────────────────────────────────────────
    // 2. Parse and validate request
    // ─────────────────────────────────────────────────────────

    const body: AIGatewayRequest = await req.json();

    validateRequired(body.action, "action");
    validateRequired(body.payload, "payload");
    validateRequired(body.payload.prompt_key, "payload.prompt_key");

    if (!ALLOWED_ACTIONS.includes(body.action as AllowedAction)) {
      throw new ValidationError(
        `Invalid action: "${body.action}". Allowed: ${ALLOWED_ACTIONS.join(", ")}`
      );
    }

    console.log(`[AI-Gateway] Action: ${body.action}, Prompt: ${body.payload.prompt_key}`);

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
    console.error("[AI-Gateway] Error:", error);

    const statusCode = getStatusCodeFromError(error);
    const errorResponse = formatErrorResponse(error);

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

### 4.2 Completion Handler

**File: `supabase/functions/ai-gateway/handlers/complete.ts`**

```typescript
// ─────────────────────────────────────────────────────────────
// Non-Streaming Completion Handler
// ─────────────────────────────────────────────────────────────

import { User } from "@supabase/supabase-js";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../../_shared/cors.ts";
import { AIGatewayRequest, AIGatewayResponse } from "../../_shared/aiTypes.ts";
import { complete, buildMessages } from "../../_shared/openai.ts";
import { generateCacheKey, checkCache, storeInCache, createCacheClient } from "../../_shared/aiCache.ts";
import { deduplicated, generateRequestHash } from "../../_shared/aiDedup.ts";
import { getPrompt } from "../prompts/_registry.ts";
import { loadAll } from "../loaders/_registry.ts";
import { validateLoaders } from "../prompts/_base.ts";

interface HandlerContext {
  user: User;
  serviceClient: SupabaseClient;
  request: AIGatewayRequest;
}

export async function handleComplete(context: HandlerContext): Promise<Response> {
  const { user, serviceClient, request } = context;
  const { payload } = request;

  console.log(`[Complete] Processing prompt: ${payload.prompt_key}`);

  // ─────────────────────────────────────────────────────────
  // 1. Get prompt configuration
  // ─────────────────────────────────────────────────────────

  const promptConfig = getPrompt(payload.prompt_key);

  // ─────────────────────────────────────────────────────────
  // 2. Determine which loaders to use
  // ─────────────────────────────────────────────────────────

  const loaderKeys = payload.data_loaders ?? promptConfig.requiredLoaders;
  validateLoaders(promptConfig, loaderKeys);

  // ─────────────────────────────────────────────────────────
  // 3. Load user data
  // ─────────────────────────────────────────────────────────

  const loaderContext = {
    userId: user.id,
    userEmail: user.email!,
    supabaseClient: serviceClient,
    variables: payload.variables ?? {},
  };

  const loadedData = await loadAll(loaderKeys, loaderContext);

  // ─────────────────────────────────────────────────────────
  // 4. Check cache (if enabled)
  // ─────────────────────────────────────────────────────────

  const cacheTtl = payload.options?.cache_ttl ?? 0;
  let cacheKey: string | undefined;

  if (cacheTtl > 0) {
    const cacheClient = createCacheClient();
    cacheKey = await generateCacheKey(
      payload.prompt_key,
      user.id,
      payload.variables ?? {},
      loadedData
    );

    const cached = await checkCache(cacheClient, cacheKey);
    if (cached) {
      const response: AIGatewayResponse = {
        success: true,
        data: {
          content: cached.response_content,
          model: cached.model,
          usage: cached.usage,
          cached: true,
          cache_key: cacheKey,
        },
      };

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // ─────────────────────────────────────────────────────────
  // 5. Build messages and call OpenAI (with deduplication)
  // ─────────────────────────────────────────────────────────

  const requestHash = generateRequestHash(
    payload.prompt_key,
    user.id,
    payload.variables ?? {}
  );

  const result = await deduplicated(requestHash, async () => {
    const messages = buildMessages(
      promptConfig,
      loadedData,
      payload.variables ?? {}
    );

    return complete(messages, {
      model: payload.options?.model ?? promptConfig.defaults.model,
      temperature: payload.options?.temperature ?? promptConfig.defaults.temperature,
      maxTokens: payload.options?.max_tokens ?? promptConfig.defaults.maxTokens,
      responseFormat: promptConfig.responseFormat === "json" ? "json_object" : "text",
    });
  });

  // ─────────────────────────────────────────────────────────
  // 6. Store in cache (if enabled)
  // ─────────────────────────────────────────────────────────

  if (cacheTtl > 0 && cacheKey) {
    const cacheClient = createCacheClient();
    const expiresAt = new Date(Date.now() + cacheTtl * 1000).toISOString();

    await storeInCache(cacheClient, {
      cache_key: cacheKey,
      prompt_key: payload.prompt_key,
      user_id: user.id,
      request_hash: requestHash,
      response_content: result.content,
      model: result.model,
      usage: result.usage,
      expires_at: expiresAt,
    });
  }

  // ─────────────────────────────────────────────────────────
  // 7. Return response
  // ─────────────────────────────────────────────────────────

  const response: AIGatewayResponse = {
    success: true,
    data: {
      content: result.content,
      model: result.model,
      usage: result.usage,
      cached: false,
      cache_key: cacheKey,
    },
  };

  return new Response(JSON.stringify(response), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

---

### 4.3 Streaming Handler

**File: `supabase/functions/ai-gateway/handlers/stream.ts`**

```typescript
// ─────────────────────────────────────────────────────────────
// Streaming Completion Handler (SSE)
// ─────────────────────────────────────────────────────────────

import { User } from "@supabase/supabase-js";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../../_shared/cors.ts";
import { AIGatewayRequest } from "../../_shared/aiTypes.ts";
import { stream, buildMessages } from "../../_shared/openai.ts";
import { getPrompt } from "../prompts/_registry.ts";
import { loadAll } from "../loaders/_registry.ts";
import { validateLoaders } from "../prompts/_base.ts";

interface HandlerContext {
  user: User;
  serviceClient: SupabaseClient;
  request: AIGatewayRequest;
}

export async function handleStream(context: HandlerContext): Promise<Response> {
  const { user, serviceClient, request } = context;
  const { payload } = request;

  console.log(`[Stream] Processing prompt: ${payload.prompt_key}`);

  // ─────────────────────────────────────────────────────────
  // 1. Get prompt configuration
  // ─────────────────────────────────────────────────────────

  const promptConfig = getPrompt(payload.prompt_key);

  // ─────────────────────────────────────────────────────────
  // 2. Determine which loaders to use
  // ─────────────────────────────────────────────────────────

  const loaderKeys = payload.data_loaders ?? promptConfig.requiredLoaders;
  validateLoaders(promptConfig, loaderKeys);

  // ─────────────────────────────────────────────────────────
  // 3. Load user data
  // ─────────────────────────────────────────────────────────

  const loaderContext = {
    userId: user.id,
    userEmail: user.email!,
    supabaseClient: serviceClient,
    variables: payload.variables ?? {},
  };

  const loadedData = await loadAll(loaderKeys, loaderContext);

  // ─────────────────────────────────────────────────────────
  // 4. Build messages and get stream
  // ─────────────────────────────────────────────────────────

  const messages = buildMessages(
    promptConfig,
    loadedData,
    payload.variables ?? {}
  );

  const openaiStream = await stream(messages, {
    model: payload.options?.model ?? promptConfig.defaults.model,
    temperature: payload.options?.temperature ?? promptConfig.defaults.temperature,
    maxTokens: payload.options?.max_tokens ?? promptConfig.defaults.maxTokens,
  });

  // ─────────────────────────────────────────────────────────
  // 5. Return SSE response
  // Note: Caching not supported for streaming responses
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

## Phase 5: Database Schema (Cache Table)

### 5.1 Migration for Cache Table

**File: To be applied via Supabase MCP**

```sql
-- ─────────────────────────────────────────────────────────────
-- AI Response Cache Table
-- Stores cached AI responses for deduplication and cost savings
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  prompt_key TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_hash TEXT NOT NULL,
  response_content TEXT NOT NULL,
  model TEXT NOT NULL,
  usage JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  -- Indexes for efficient lookups
  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Index for cache lookups (most common query)
CREATE INDEX idx_ai_cache_lookup
  ON ai_response_cache(cache_key, expires_at);

-- Index for cleanup of expired entries
CREATE INDEX idx_ai_cache_expiry
  ON ai_response_cache(expires_at);

-- Index for user-specific queries
CREATE INDEX idx_ai_cache_user
  ON ai_response_cache(user_id);

-- RLS Policies
ALTER TABLE ai_response_cache ENABLE ROW LEVEL SECURITY;

-- Only service role can access cache (Edge Functions use service role)
-- No direct user access to cache table
CREATE POLICY "Service role full access"
  ON ai_response_cache
  FOR ALL
  USING (auth.role() = 'service_role');

-- Optional: Cleanup function for expired entries
CREATE OR REPLACE FUNCTION cleanup_expired_ai_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ai_response_cache
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Comment for documentation
COMMENT ON TABLE ai_response_cache IS
  'Caches AI/LLM responses to reduce API costs and improve latency';
```

---

## Phase 6: Secrets Setup

### 6.1 Required Secrets

Add to `supabase/SECRETS_SETUP.md`:

```markdown
## AI Gateway Secrets

### OPENAI_API_KEY
- **Required for**: AI Gateway Edge Function
- **Get from**: https://platform.openai.com/api-keys
- **Command**: `supabase secrets set OPENAI_API_KEY=sk-...`

### Usage Notes
- The AI Gateway uses gpt-4o by default (configurable per prompt)
- Monitor usage at https://platform.openai.com/usage
- Set billing limits to prevent unexpected costs
```

---

## Implementation Checklist

### Phase 1: Foundation
- [ ] Create `_shared/aiTypes.ts`
- [ ] Create `_shared/openai.ts`
- [ ] Create `_shared/aiCache.ts`
- [ ] Create `_shared/aiDedup.ts`
- [ ] Set `OPENAI_API_KEY` secret

### Phase 2: Prompt System
- [ ] Create `ai-gateway/prompts/_base.ts`
- [ ] Create `ai-gateway/prompts/_registry.ts`
- [ ] Create example prompts (optional, for testing)

### Phase 3: Data Loaders
- [ ] Create `ai-gateway/loaders/_base.ts`
- [ ] Create `ai-gateway/loaders/_registry.ts`
- [ ] Create `ai-gateway/loaders/user-profile.ts`
- [ ] Create additional loaders as needed

### Phase 4: Handlers
- [ ] Create `ai-gateway/index.ts` (router)
- [ ] Create `ai-gateway/handlers/complete.ts`
- [ ] Create `ai-gateway/handlers/stream.ts`
- [ ] Create `ai-gateway/deno.json`

### Phase 5: Database
- [ ] Apply cache table migration
- [ ] Verify RLS policies

### Phase 6: Testing
- [ ] Test `echo-test` prompt (no loaders)
- [ ] Test with user-profile loader
- [ ] Test streaming endpoint
- [ ] Test caching behavior
- [ ] Test deduplication

### Phase 7: Production
- [ ] Remove example prompts
- [ ] Add real prompts for your use cases
- [ ] Add monitoring/alerting
- [ ] Document usage for frontend team

---

## Client Usage Examples

### Non-Streaming Completion

```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-gateway`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${userToken}`,
  },
  body: JSON.stringify({
    action: "complete",
    payload: {
      prompt_key: "listing-description",
      variables: {
        hostNotes: "Recently renovated kitchen, pet-friendly",
      },
      options: {
        cache_ttl: 3600,  // Cache for 1 hour
      },
    },
  }),
});

const result = await response.json();
console.log(result.data.content);
```

### Streaming

```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-gateway`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${userToken}`,
  },
  body: JSON.stringify({
    action: "stream",
    payload: {
      prompt_key: "market-analysis",
      variables: {
        analysisType: "pricing-recommendation",
      },
    },
  }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  // Parse SSE format and handle chunks
  console.log(chunk);
}
```

---

## Future Extensions

1. **Conversation Memory**: Add `conversation_id` to maintain multi-turn context
2. **Function Calling**: Support OpenAI function calling for structured outputs
3. **Multiple Providers**: Abstract to support Claude, Gemini, etc.
4. **Rate Limiting**: Per-user rate limits to prevent abuse
5. **Usage Tracking**: Log all requests for analytics and billing
6. **Prompt Versioning**: Track prompt versions for A/B testing
7. **Webhooks**: Async processing with webhook callbacks for long-running tasks
