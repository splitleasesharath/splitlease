/**
 * Template Interpolation Engine
 * Split Lease - AI Gateway
 *
 * Supports {{variable}} and {{nested.path}} syntax
 * NO FALLBACK PRINCIPLE: Missing variables are marked clearly for debugging
 */

/**
 * Interpolate template with context values
 * NO FALLBACK: Missing variables are marked as [MISSING: path] for debugging
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
  return [...new Set([...matches].map((m) => m[1].trim()))];
}
