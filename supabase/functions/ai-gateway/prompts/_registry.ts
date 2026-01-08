/**
 * Prompt Registry
 * Split Lease - AI Gateway
 *
 * Central registry of all prompt configurations and data loaders
 * NO FALLBACK PRINCIPLE: Unknown prompts/loaders throw errors
 *
 * @module ai-gateway/prompts/_registry
 */

import {
  PromptConfig,
  DataLoader,
  DataLoaderContext,
} from "../../_shared/aiTypes.ts";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX_PROMPTS = '[Prompts]'
const LOG_PREFIX_LOADERS = '[Loaders]'
const NO_ITEMS_PLACEHOLDER = '(none)'
const LIST_SEPARATOR = ', '

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if prompts map has key
 * @pure
 */
const hasPrompt = (key: string): boolean =>
  prompts.has(key)

/**
 * Check if loaders map has key
 * @pure
 */
const hasLoader = (key: string): boolean =>
  loaders.has(key)

/**
 * Check if array is empty
 * @pure
 */
const isEmpty = <T>(arr: ReadonlyArray<T>): boolean =>
  arr.length === 0

// ─────────────────────────────────────────────────────────────
// Error Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build unknown prompt error message
 * @pure
 */
const buildUnknownPromptError = (key: string, availableKeys: ReadonlyArray<string>): string =>
  `Unknown prompt: "${key}". Available: ${isEmpty(availableKeys) ? NO_ITEMS_PLACEHOLDER : availableKeys.join(LIST_SEPARATOR)}`

/**
 * Build unknown loader error message
 * @pure
 */
const buildUnknownLoaderError = (key: string, availableKeys: ReadonlyArray<string>): string =>
  `Unknown loader: "${key}". Available: ${isEmpty(availableKeys) ? NO_ITEMS_PLACEHOLDER : availableKeys.join(LIST_SEPARATOR)}`

// ─────────────────────────────────────────────────────────────
// PROMPT REGISTRY
// ─────────────────────────────────────────────────────────────

const prompts = new Map<string, PromptConfig>();

/**
 * Register a prompt configuration
 * @effectful (mutates prompts Map, console logging)
 */
export function registerPrompt(config: PromptConfig): void {
  if (hasPrompt(config.key)) {
    console.warn(`${LOG_PREFIX_PROMPTS} Overwriting existing prompt: ${config.key}`);
  }
  prompts.set(config.key, config);
  console.log(`${LOG_PREFIX_PROMPTS} Registered: ${config.key}`);
}

/**
 * Get prompt by key
 * @pure (throws on unknown key)
 */
export function getPrompt(key: string): PromptConfig {
  const prompt = prompts.get(key);
  if (!prompt) {
    throw new Error(buildUnknownPromptError(key, Array.from(prompts.keys())));
  }
  return prompt;
}

/**
 * List all registered prompt keys
 * @pure
 */
export function listPrompts(): ReadonlyArray<string> {
  return Object.freeze(Array.from(prompts.keys()));
}

// ─────────────────────────────────────────────────────────────
// DATA LOADER REGISTRY
// ─────────────────────────────────────────────────────────────

const loaders = new Map<string, DataLoader>();

/**
 * Register a data loader
 * @effectful (mutates loaders Map, console logging)
 */
export function registerLoader(loader: DataLoader): void {
  loaders.set(loader.key, loader);
  console.log(`${LOG_PREFIX_LOADERS} Registered: ${loader.key}`);
}

/**
 * Get loader by key
 * @pure (throws on unknown key)
 */
export function getLoader(key: string): DataLoader {
  const loader = loaders.get(key);
  if (!loader) {
    throw new Error(buildUnknownLoaderError(key, Array.from(loaders.keys())));
  }
  return loader;
}

/**
 * Merge loader results into single object
 * @pure
 */
const mergeLoaderResults = (
  results: ReadonlyArray<{ key: string; data: Record<string, unknown> }>
): Record<string, unknown> => {
  const merged: Record<string, unknown> = {};
  for (const { key, data } of results) {
    merged[key] = data;
  }
  return merged;
}

/**
 * Load all required data for a prompt
 * Returns merged data object with loader keys as namespaces
 * @effectful (executes loaders, console logging)
 */
export async function loadAllData(
  loaderKeys: ReadonlyArray<string>,
  context: DataLoaderContext
): Promise<Record<string, unknown>> {
  if (isEmpty(loaderKeys)) {
    return {};
  }

  console.log(`${LOG_PREFIX_LOADERS} Loading ${loaderKeys.length} data sources...`);

  const results = await Promise.all(
    loaderKeys.map(async (key) => {
      const loader = getLoader(key);
      const startTime = Date.now();
      const data = await loader.load(context);
      console.log(`${LOG_PREFIX_LOADERS} ${key} loaded in ${Date.now() - startTime}ms`);
      return { key, data };
    })
  );

  return mergeLoaderResults(results);
}

// ─────────────────────────────────────────────────────────────
// Built-in Constants
// ─────────────────────────────────────────────────────────────

/**
 * Echo test prompt configuration
 * @immutable
 */
const ECHO_TEST_PROMPT = Object.freeze({
  key: "echo-test",
  name: "Echo Test",
  description: "Simple test prompt for verifying the gateway works",
  systemPrompt: "You are a helpful assistant. Respond concisely.",
  userPromptTemplate: "The user says: {{message}}",
  defaults: Object.freeze({
    model: "gpt-4o-mini",
    temperature: 0.7,
    maxTokens: 500,
  }),
  responseFormat: "text",
} as const)

const LOG_PREFIX_USER_PROFILE = '[Loader:user-profile]'

/**
 * User profile loader select fields
 * @immutable
 */
const USER_PROFILE_SELECT_FIELDS = "_id, email, first_name, last_name, phone, bio, profile_photo"

// ─────────────────────────────────────────────────────────────
// User Profile Loader Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Build user profile result from database row
 * @pure
 */
const buildUserProfileResult = (data: Record<string, unknown>): Record<string, unknown> =>
  Object.freeze({
    id: data._id,
    email: data.email,
    firstName: data.first_name,
    lastName: data.last_name,
    fullName: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
    phone: data.phone,
    bio: data.bio,
    profilePhoto: data.profile_photo,
    loaded: true,
  })

/**
 * Build user profile error result
 * @pure
 */
const buildUserProfileErrorResult = (userId: string, errorMessage: string): Record<string, unknown> =>
  Object.freeze({
    id: userId,
    loaded: false,
    error: errorMessage,
  })

// ─────────────────────────────────────────────────────────────
// BUILT-IN TEST PROMPT
// ─────────────────────────────────────────────────────────────

registerPrompt(ECHO_TEST_PROMPT as PromptConfig);

// ─────────────────────────────────────────────────────────────
// BUILT-IN DATA LOADERS
// ─────────────────────────────────────────────────────────────

registerLoader({
  key: "user-profile",
  name: "User Profile",
  /**
   * Load user profile from database
   * @effectful (database I/O, console logging)
   */
  async load(context: DataLoaderContext): Promise<Record<string, unknown>> {
    const { userId, supabaseClient } = context;

    const { data, error } = await supabaseClient
      .from("users")
      .select(USER_PROFILE_SELECT_FIELDS)
      .eq("_id", userId)
      .single();

    if (error) {
      console.error(`${LOG_PREFIX_USER_PROFILE} Error: ${error.message}`);
      return buildUserProfileErrorResult(userId, error.message);
    }

    return buildUserProfileResult(data);
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

// ─────────────────────────────────────────────────────────────
// Exported Test Constants
// ─────────────────────────────────────────────────────────────

/**
 * Exported for testing purposes
 * @test
 */
export const __test__ = Object.freeze({
  // Constants
  LOG_PREFIX_PROMPTS,
  LOG_PREFIX_LOADERS,
  LOG_PREFIX_USER_PROFILE,
  NO_ITEMS_PLACEHOLDER,
  LIST_SEPARATOR,
  USER_PROFILE_SELECT_FIELDS,
  ECHO_TEST_PROMPT,

  // Predicates
  hasPrompt,
  hasLoader,
  isEmpty,

  // Error builders
  buildUnknownPromptError,
  buildUnknownLoaderError,

  // Result builders
  mergeLoaderResults,
  buildUserProfileResult,
  buildUserProfileErrorResult,
})
