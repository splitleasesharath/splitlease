/**
 * Prompt Registry
 * Split Lease - AI Gateway
 *
 * Central registry of all prompt configurations and data loaders
 * NO FALLBACK PRINCIPLE: Unknown prompts/loaders throw errors
 */

import {
  PromptConfig,
  DataLoader,
  DataLoaderContext,
} from "../../_shared/aiTypes.ts";

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
    throw new Error(
      `Unknown prompt: "${key}". Available: ${available || "(none)"}`
    );
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
    throw new Error(
      `Unknown loader: "${key}". Available: ${available || "(none)"}`
    );
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
// PROMPT REGISTRATION
// ─────────────────────────────────────────────────────────────
// IMPORTANT: Do NOT import prompt files here!
// ES Module import hoisting causes circular dependency issues.
// Prompt files must be imported from index.ts AFTER this registry.
// See: ReferenceError: Cannot access 'prompts' before initialization
// ─────────────────────────────────────────────────────────────
