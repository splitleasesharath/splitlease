/**
 * Template Interpolation Engine
 * Split Lease - AI Gateway
 *
 * Supports {{variable}} and {{nested.path}} syntax
 * NO FALLBACK PRINCIPLE: Missing variables are marked clearly for debugging
 *
 * @module ai-gateway/prompts/_template
 */

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[Template]'
const VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g
const PATH_SEPARATOR = '.'
const JSON_INDENT_SPACES = 2

/**
 * Missing variable placeholder format
 * @pure
 */
const buildMissingPlaceholder = (path: string): string =>
  `[MISSING: ${path}]`

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if value is null or undefined
 * @pure
 */
const isNullish = (value: unknown): value is null | undefined =>
  value === undefined || value === null

/**
 * Check if value is an object (array or object)
 * @pure
 */
const isObject = (value: unknown): value is object =>
  typeof value === "object" && !isNullish(value)

// ─────────────────────────────────────────────────────────────
// Value Formatters
// ─────────────────────────────────────────────────────────────

/**
 * Format value for template interpolation
 * @pure
 */
const formatValue = (value: unknown): string => {
  if (isObject(value)) {
    return JSON.stringify(value, null, JSON_INDENT_SPACES);
  }
  return String(value);
}

// ─────────────────────────────────────────────────────────────
// Path Resolution
// ─────────────────────────────────────────────────────────────

/**
 * Get nested value from object using dot notation
 * e.g., "user.profile.name" -> obj.user.profile.name
 * @pure
 */
const getNestedValue = (obj: Record<string, unknown>, path: string): unknown => {
  const keys = path.split(PATH_SEPARATOR);
  let current: unknown = obj;

  for (const key of keys) {
    if (isNullish(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

// ─────────────────────────────────────────────────────────────
// Core Functions
// ─────────────────────────────────────────────────────────────

/**
 * Interpolate template with context values
 * NO FALLBACK: Missing variables are marked as [MISSING: path] for debugging
 * @effectful (console logging for warnings)
 */
export function interpolate(
  template: string,
  context: Record<string, unknown>
): string {
  return template.replace(VARIABLE_PATTERN, (_match, path) => {
    const trimmedPath = path.trim();
    const value = getNestedValue(context, trimmedPath);

    if (isNullish(value)) {
      console.warn(`${LOG_PREFIX} Missing variable: ${trimmedPath}`);
      return buildMissingPlaceholder(trimmedPath);
    }

    return formatValue(value);
  });
}

/**
 * List all variables used in a template
 * Useful for validation and debugging
 * @pure
 */
export function extractVariables(template: string): ReadonlyArray<string> {
  const matches = template.matchAll(VARIABLE_PATTERN);
  const variables = [...new Set([...matches].map((m) => m[1].trim()))];
  return Object.freeze(variables);
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
  VARIABLE_PATTERN,
  PATH_SEPARATOR,
  JSON_INDENT_SPACES,

  // Predicates
  isNullish,
  isObject,

  // Helpers
  buildMissingPlaceholder,
  formatValue,
  getNestedValue,
})
