/**
 * Template Processor for Email Templates
 * Split Lease - send-email Edge Function
 *
 * Handles placeholder replacement for multiple syntaxes:
 * - Double dollar-sign style: $$variable$$ (Bubble templates)
 * - Jinja-style: {{ variable }} (legacy support)
 *
 * FP PATTERN: All functions are pure with explicit inputs and outputs
 * No side effects except logging (which is informational only)
 *
 * @module send-email/lib/templateProcessor
 */

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[send-email:templateProcessor]'

/** Regex for $$variable$$ placeholders (Bubble template style) */
const DOLLAR_REGEX = /\$\$([a-zA-Z0-9_\-]+)\$\$/g

/** Regex for {{ variable }} placeholders (Jinja-style) */
const JINJA_REGEX = /\{\{\s*([a-zA-Z0-9_\-.]+)\s*\}\}/g

/** HTML escape character map */
const HTML_ESCAPE_MAP: Readonly<Record<string, string>> = Object.freeze({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
})

// ─────────────────────────────────────────────────────────────
// Escape Functions
// ─────────────────────────────────────────────────────────────

/**
 * Escape HTML special characters to prevent XSS
 * @pure
 */
const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] || char)

/**
 * Escape a string to be safely embedded in a JSON string value
 * Handles: quotes, backslashes, newlines, tabs, and other control characters
 * @pure
 */
const escapeJsonString = (text: string): string => {
  // Use JSON.stringify to properly escape, then strip the surrounding quotes
  const escaped = JSON.stringify(text)
  // JSON.stringify adds quotes around the string, remove them
  return escaped.slice(1, -1)
}

// ─────────────────────────────────────────────────────────────
// Placeholder Replacement Functions
// ─────────────────────────────────────────────────────────────

/**
 * Replace dollar-sign placeholders in template
 * @pure (except logging)
 */
const replaceDollarPlaceholders = (
  template: string,
  variables: Readonly<Record<string, string>>,
  escapeValue: (text: string) => string,
  jsonSafe: boolean
): string =>
  template.replace(DOLLAR_REGEX, (match, variableName) => {
    const value = variables[variableName]

    if (value === undefined) {
      console.warn(`${LOG_PREFIX} Dollar placeholder "${variableName}" not found in variables, keeping original`)
      // For JSON templates, return empty string for missing placeholders to keep JSON valid
      return jsonSafe ? '' : match
    }

    return escapeValue(String(value))
  })

/**
 * Replace Jinja-style placeholders in template
 * @pure (except logging)
 */
const replaceJinjaPlaceholders = (
  template: string,
  variables: Readonly<Record<string, string>>,
  escapeValue: (text: string) => string,
  jsonSafe: boolean
): string =>
  template.replace(JINJA_REGEX, (match, variableName) => {
    const value = variables[variableName]

    if (value === undefined) {
      console.warn(`${LOG_PREFIX} Jinja placeholder "${variableName}" not found in variables, keeping original`)
      return jsonSafe ? '' : match
    }

    return escapeValue(String(value))
  })

/**
 * Internal function to process templates with configurable escaping
 * @pure (except logging)
 */
const processTemplateInternal = (
  template: string,
  variables: Readonly<Record<string, string>>,
  jsonSafe: boolean
): string => {
  if (!template) {
    throw new Error('Template content is empty')
  }

  const escapeValue = jsonSafe ? escapeJsonString : escapeHtml

  // First pass: Replace $$variable$$ placeholders
  const afterDollar = replaceDollarPlaceholders(template, variables, escapeValue, jsonSafe)

  // Second pass: Replace {{ variable }} placeholders
  return replaceJinjaPlaceholders(afterDollar, variables, escapeValue, jsonSafe)
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Replace placeholders in a template string (HTML content)
 * Supports both $$variable$$ (primary) and {{ variable }} (fallback) syntaxes
 * @pure (except logging)
 *
 * @param template - The HTML template with placeholders
 * @param variables - Key-value pairs for replacement
 * @returns Processed HTML string
 */
export function processTemplate(
  template: string,
  variables: Readonly<Record<string, string>>
): string {
  return processTemplateInternal(template, variables, false)
}

/**
 * Replace placeholders in a JSON template string
 * Values are escaped to be JSON-safe (handles quotes, newlines, backslashes)
 * @pure (except logging)
 *
 * @param template - The JSON template string with placeholders
 * @param variables - Key-value pairs for replacement
 * @returns Processed JSON string (valid JSON after replacement)
 */
export function processTemplateJson(
  template: string,
  variables: Readonly<Record<string, string>>
): string {
  return processTemplateInternal(template, variables, true)
}

/**
 * Extract all placeholder names from a template
 * Supports both $$variable$$ and {{ variable }} syntaxes
 * Useful for validation and debugging
 * @pure
 */
export function extractPlaceholders(template: string): readonly string[] {
  const placeholders: string[] = []

  // Extract $$variable$$ placeholders (Bubble style)
  // Need to reset regex state between uses
  const dollarRegex = new RegExp(DOLLAR_REGEX.source, 'g')
  let match

  while ((match = dollarRegex.exec(template)) !== null) {
    if (!placeholders.includes(match[1])) {
      placeholders.push(match[1])
    }
  }

  // Extract {{ variable }} placeholders (Jinja style)
  const jinjaRegex = new RegExp(JINJA_REGEX.source, 'g')

  while ((match = jinjaRegex.exec(template)) !== null) {
    if (!placeholders.includes(match[1])) {
      placeholders.push(match[1])
    }
  }

  return Object.freeze(placeholders)
}

/**
 * Validate that all required placeholders have values
 * Returns list of missing placeholders
 * @pure
 */
export function validatePlaceholders(
  template: string,
  variables: Readonly<Record<string, string>>
): readonly string[] {
  const required = extractPlaceholders(template)
  const missing = required.filter(placeholder => variables[placeholder] === undefined)
  return Object.freeze(missing)
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
  DOLLAR_REGEX,
  JINJA_REGEX,
  HTML_ESCAPE_MAP,

  // Escape Functions
  escapeHtml,
  escapeJsonString,

  // Placeholder Replacement Functions
  replaceDollarPlaceholders,
  replaceJinjaPlaceholders,
  processTemplateInternal,

  // Public API
  processTemplate,
  processTemplateJson,
  extractPlaceholders,
  validatePlaceholders,
})
