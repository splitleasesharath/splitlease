/**
 * Template Processor for SMS Templates
 * Split Lease - send-sms Edge Function
 *
 * Handles Jinja-style placeholder replacement ({{ variable }})
 * NOTE: Unlike email, SMS does NOT escape HTML (plain text only)
 */

/**
 * Replace Jinja-style placeholders in a template string
 *
 * @param template - The SMS template with {{ placeholders }}
 * @param variables - Key-value pairs for replacement
 * @returns Processed SMS string
 */
export function processTemplate(
  template: string,
  variables: Record<string, string>
): string {
  if (!template) {
    throw new Error('Template content is empty');
  }

  const placeholderRegex = /\{\{\s*([a-zA-Z0-9_\-.]+)\s*\}\}/g;

  const processedTemplate = template.replace(placeholderRegex, (match, variableName) => {
    const value = variables[variableName];

    if (value === undefined) {
      console.warn(`[templateProcessor] Placeholder "${variableName}" not found in variables, keeping original`);
      return match;
    }

    // For SMS, return value as-is (no HTML escaping needed)
    return String(value);
  });

  return processedTemplate;
}

/**
 * Extract all placeholder names from a template
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
 */
export function validatePlaceholders(
  template: string,
  variables: Record<string, string>
): string[] {
  const required = extractPlaceholders(template);
  return required.filter(placeholder => variables[placeholder] === undefined);
}

/**
 * Validate SMS body length (Twilio limit: 1600 characters)
 */
export function validateSmsLength(body: string): void {
  const MAX_SMS_LENGTH = 1600;
  if (body.length > MAX_SMS_LENGTH) {
    throw new Error(`SMS body exceeds maximum length of ${MAX_SMS_LENGTH} characters (current: ${body.length})`);
  }
}
