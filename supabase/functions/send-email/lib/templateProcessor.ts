/**
 * Template Processor for Email Templates
 * Split Lease - send-email Edge Function
 *
 * Handles placeholder replacement for multiple syntaxes:
 * - Double dollar-sign style: $$variable$$ (Bubble templates)
 * - Jinja-style: {{ variable }} (legacy support)
 */

/**
 * Replace placeholders in a template string (HTML content)
 * Supports both $$variable$$ (primary) and {{ variable }} (fallback) syntaxes
 *
 * @param template - The HTML template with placeholders
 * @param variables - Key-value pairs for replacement
 * @returns Processed HTML string
 */
export function processTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return processTemplateInternal(template, variables, false);
}

/**
 * Replace placeholders in a JSON template string
 * Values are escaped to be JSON-safe (handles quotes, newlines, backslashes)
 *
 * @param template - The JSON template string with placeholders
 * @param variables - Key-value pairs for replacement
 * @returns Processed JSON string (valid JSON after replacement)
 */
export function processTemplateJson(
  template: string,
  variables: Record<string, string>
): string {
  return processTemplateInternal(template, variables, true);
}

/**
 * Internal function to process templates with configurable escaping
 */
function processTemplateInternal(
  template: string,
  variables: Record<string, string>,
  jsonSafe: boolean
): string {
  if (!template) {
    throw new Error('Template content is empty');
  }

  const escapeValue = jsonSafe ? escapeJsonString : escapeHtml;

  let processedTemplate = template;

  // First pass: Replace $$variable$$ placeholders (Bubble template style - double dollar signs)
  // Supports: $$var$$, $$var_name$$, $$var-name$$
  const dollarRegex = /\$\$([a-zA-Z0-9_\-]+)\$\$/g;

  processedTemplate = processedTemplate.replace(dollarRegex, (match, variableName) => {
    const value = variables[variableName];

    if (value === undefined) {
      console.warn(`[templateProcessor] Dollar placeholder "${variableName}" not found in variables, keeping original`);
      // For JSON templates, return empty string for missing placeholders to keep JSON valid
      return jsonSafe ? '' : match;
    }

    return escapeValue(String(value));
  });

  // Second pass: Replace {{ variable }} placeholders (Jinja-style fallback)
  const jinjaRegex = /\{\{\s*([a-zA-Z0-9_\-.]+)\s*\}\}/g;

  processedTemplate = processedTemplate.replace(jinjaRegex, (match, variableName) => {
    const value = variables[variableName];

    if (value === undefined) {
      console.warn(`[templateProcessor] Jinja placeholder "${variableName}" not found in variables, keeping original`);
      return jsonSafe ? '' : match;
    }

    return escapeValue(String(value));
  });

  return processedTemplate;
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  return text.replace(/[&<>"']/g, (char) => escapeMap[char] || char);
}

/**
 * Escape a string to be safely embedded in a JSON string value
 * Handles: quotes, backslashes, newlines, tabs, and other control characters
 */
function escapeJsonString(text: string): string {
  // Use JSON.stringify to properly escape, then strip the surrounding quotes
  const escaped = JSON.stringify(text);
  // JSON.stringify adds quotes around the string, remove them
  return escaped.slice(1, -1);
}

/**
 * Extract all placeholder names from a template
 * Supports both $$variable$$ and {{ variable }} syntaxes
 * Useful for validation and debugging
 */
export function extractPlaceholders(template: string): string[] {
  const placeholders: string[] = [];

  // Extract $$variable$$ placeholders (Bubble style - double dollar signs)
  const dollarRegex = /\$\$([a-zA-Z0-9_\-]+)\$\$/g;
  let match;

  while ((match = dollarRegex.exec(template)) !== null) {
    if (!placeholders.includes(match[1])) {
      placeholders.push(match[1]);
    }
  }

  // Extract {{ variable }} placeholders (Jinja style)
  const jinjaRegex = /\{\{\s*([a-zA-Z0-9_\-.]+)\s*\}\}/g;

  while ((match = jinjaRegex.exec(template)) !== null) {
    if (!placeholders.includes(match[1])) {
      placeholders.push(match[1]);
    }
  }

  return placeholders;
}

/**
 * Validate that all required placeholders have values
 * Returns list of missing placeholders
 */
export function validatePlaceholders(
  template: string,
  variables: Record<string, string>
): string[] {
  const required = extractPlaceholders(template);
  return required.filter(placeholder => variables[placeholder] === undefined);
}
