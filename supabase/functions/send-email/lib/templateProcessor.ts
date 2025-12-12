/**
 * Template Processor for Email Templates
 * Split Lease - send-email Edge Function
 *
 * Handles Jinja-style placeholder replacement ({{ variable }})
 */

/**
 * Replace Jinja-style placeholders in a template string
 * Supports: {{ variable }}, {{ variable_name }}, {{ some.nested }}
 *
 * @param template - The HTML template with {{ placeholders }}
 * @param variables - Key-value pairs for replacement
 * @returns Processed HTML string
 */
export function processTemplate(
  template: string,
  variables: Record<string, string>
): string {
  if (!template) {
    throw new Error('Template content is empty');
  }

  // Match {{ variable }} pattern with optional whitespace
  // Supports: {{ var }}, {{var}}, {{ var_name }}, {{ var-name }}
  const placeholderRegex = /\{\{\s*([a-zA-Z0-9_\-.]+)\s*\}\}/g;

  const processedTemplate = template.replace(placeholderRegex, (match, variableName) => {
    const value = variables[variableName];

    if (value === undefined) {
      console.warn(`[templateProcessor] Placeholder "${variableName}" not found in variables, keeping original`);
      // Keep the original placeholder if not found (could be intentional)
      return match;
    }

    // Escape HTML in values to prevent XSS
    return escapeHtml(String(value));
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
 * Extract all placeholder names from a template
 * Useful for validation and debugging
 */
export function extractPlaceholders(template: string): string[] {
  const placeholderRegex = /\{\{\s*([a-zA-Z0-9_\-.]+)\s*\}\}/g;
  const placeholders: string[] = [];
  let match;

  while ((match = placeholderRegex.exec(template)) !== null) {
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
