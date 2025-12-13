# Implementation Plan: send-email Edge Function

## Overview

Create a new Supabase Edge Function named `send-email` that fetches HTML email templates from the `zat_email_html_template_eg_sendbasicemailwf_` table, performs Jinja-style placeholder replacement (`{{ variable }}`), and sends the final email via the SendGrid API using a Bearer token for authorization.

## Success Criteria

- [ ] Edge Function `send-email` created with action-based routing pattern
- [ ] Template fetching from `zat_email_html_template_eg_sendbasicemailwf_` table works correctly
- [ ] Jinja-style placeholder replacement (`{{ variable }}`) functions properly
- [ ] SendGrid API integration sends emails successfully
- [ ] Proper error handling and Slack error reporting implemented
- [ ] Function registered in `config.toml`
- [ ] Authorization via Bearer token header works

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `supabase/functions/send-email/index.ts` | Main router | **CREATE** - New file |
| `supabase/functions/send-email/handlers/send.ts` | Send email handler | **CREATE** - New file |
| `supabase/functions/send-email/lib/templateProcessor.ts` | Template replacement logic | **CREATE** - New file |
| `supabase/functions/send-email/lib/sendgridClient.ts` | SendGrid API client | **CREATE** - New file |
| `supabase/functions/send-email/lib/types.ts` | TypeScript interfaces | **CREATE** - New file |
| `supabase/functions/send-email/deno.json` | Import map | **CREATE** - New file |
| `supabase/config.toml` | Edge Function config | **MODIFY** - Add send-email function |
| `supabase/functions/_shared/cors.ts` | CORS headers | Reference only |
| `supabase/functions/_shared/errors.ts` | Error classes | Reference only |
| `supabase/functions/_shared/validation.ts` | Validation utilities | Reference only |
| `supabase/functions/_shared/slack.ts` | Error collection | Reference only |

### Related Documentation

- [supabase/CLAUDE.md](../../supabase/CLAUDE.md) - Edge Function patterns and guidelines
- [Documentation/Backend(EDGE - Functions)/](../../.claude/Documentation/Backend(EDGE%20-%20Functions)/) - Edge function documentation

### Existing Patterns to Follow

1. **Action-Based Routing Pattern** (from `listing/index.ts`, `communications/index.ts`):
   - Request body: `{ action: string, payload: {...} }`
   - Response: `{ success: true, data: {...} }` or `{ success: false, error: "..." }`

2. **Error Collection Pattern** (from `_shared/slack.ts`):
   - Use `createErrorCollector()` for consolidated error reporting
   - Fire-and-forget Slack notifications

3. **Handler Separation Pattern** (from `listing/handlers/`):
   - Main index.ts routes to handler files
   - Each handler is a separate file in `handlers/` directory

4. **Validation Pattern** (from `_shared/validation.ts`):
   - Use `validateRequiredFields()` for payload validation
   - Use `validateAction()` for action validation

## Implementation Steps

### Step 1: Create Directory Structure

**Files:** Create new directories and files
**Purpose:** Establish the file structure for the new Edge Function
**Details:**
- Create `supabase/functions/send-email/` directory
- Create subdirectories: `handlers/`, `lib/`
- Create empty files for the structure

**Validation:** Directory structure exists

### Step 2: Create Type Definitions

**Files:** `supabase/functions/send-email/lib/types.ts`
**Purpose:** Define TypeScript interfaces for the function
**Details:**

```typescript
/**
 * Type definitions for send-email Edge Function
 * Split Lease
 */

// Request payload for send action
export interface SendEmailPayload {
  template_id: string;           // ID of template in zat_email_html_template_eg_sendbasicemailwf_
  to_email: string;              // Recipient email address
  to_name?: string;              // Recipient name (optional)
  from_email?: string;           // Sender email (optional, uses default)
  from_name?: string;            // Sender name (optional, uses default)
  subject?: string;              // Email subject (optional, may come from template)
  variables: Record<string, string>;  // Key-value pairs for placeholder replacement
}

// Email template from database
export interface EmailTemplate {
  _id: string;
  Name?: string;
  'HTML Content'?: string;       // The HTML template with {{ placeholders }}
  Subject?: string;              // Default subject line
  'From Email'?: string;         // Default from email
  'From Name'?: string;          // Default from name
}

// SendGrid request body structure
export interface SendGridMailRequest {
  personalizations: Array<{
    to: Array<{ email: string; name?: string }>;
    subject?: string;
  }>;
  from: {
    email: string;
    name?: string;
  };
  content: Array<{
    type: 'text/html' | 'text/plain';
    value: string;
  }>;
  reply_to?: {
    email: string;
    name?: string;
  };
}

// SendGrid API response
export interface SendGridResponse {
  statusCode: number;
  body?: unknown;
  headers?: Record<string, string>;
}

// Result from send action
export interface SendEmailResult {
  message_id?: string;
  template_id: string;
  to_email: string;
  status: 'sent' | 'failed';
  sent_at: string;
}
```

**Validation:** Types compile without errors

### Step 3: Create Template Processor Utility

**Files:** `supabase/functions/send-email/lib/templateProcessor.ts`
**Purpose:** Handle Jinja-style placeholder replacement
**Details:**

```typescript
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
```

**Validation:** Test with sample template and variables

### Step 4: Create SendGrid Client Utility

**Files:** `supabase/functions/send-email/lib/sendgridClient.ts`
**Purpose:** Handle SendGrid API communication
**Details:**

```typescript
/**
 * SendGrid API Client
 * Split Lease - send-email Edge Function
 *
 * Handles SendGrid API communication for sending emails
 */

import type { SendGridMailRequest, SendGridResponse } from './types.ts';

const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';

/**
 * Build SendGrid mail request body
 */
export function buildSendGridRequestBody(params: {
  toEmail: string;
  toName?: string;
  fromEmail: string;
  fromName?: string;
  subject: string;
  htmlContent: string;
}): SendGridMailRequest {
  const { toEmail, toName, fromEmail, fromName, subject, htmlContent } = params;

  return {
    personalizations: [
      {
        to: [
          {
            email: toEmail,
            ...(toName && { name: toName }),
          },
        ],
        subject: subject,
      },
    ],
    from: {
      email: fromEmail,
      ...(fromName && { name: fromName }),
    },
    content: [
      {
        type: 'text/html',
        value: htmlContent,
      },
    ],
  };
}

/**
 * Send email via SendGrid API
 *
 * @param apiKey - SendGrid API key
 * @param requestBody - SendGrid mail request body
 * @returns SendGrid response
 */
export async function sendEmail(
  apiKey: string,
  requestBody: SendGridMailRequest
): Promise<SendGridResponse> {
  console.log('[sendgridClient] Sending email via SendGrid...');
  console.log('[sendgridClient] To:', requestBody.personalizations[0].to[0].email);
  console.log('[sendgridClient] Subject:', requestBody.personalizations[0].subject);

  const response = await fetch(SENDGRID_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  // SendGrid returns 202 Accepted for successful sends
  const result: SendGridResponse = {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers.entries()),
  };

  // Try to parse body if present
  if (!response.ok) {
    try {
      result.body = await response.json();
    } catch {
      result.body = await response.text();
    }
    console.error('[sendgridClient] SendGrid API error:', result.statusCode, result.body);
  } else {
    console.log('[sendgridClient] Email sent successfully, status:', result.statusCode);
    // Get message ID from headers if available
    const messageId = response.headers.get('x-message-id');
    if (messageId) {
      result.body = { messageId };
    }
  }

  return result;
}

/**
 * Check if SendGrid response indicates success
 * SendGrid returns 202 Accepted for successful email sends
 */
export function isSuccessResponse(response: SendGridResponse): boolean {
  return response.statusCode === 202 || response.statusCode === 200;
}
```

**Validation:** API structure matches SendGrid documentation

### Step 5: Create Send Handler

**Files:** `supabase/functions/send-email/handlers/send.ts`
**Purpose:** Handle the send email action
**Details:**

```typescript
/**
 * Send Email Handler
 * Split Lease - send-email Edge Function
 *
 * Handles the 'send' action:
 * 1. Fetch template from database
 * 2. Process placeholders
 * 3. Send via SendGrid
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateRequiredFields, validateEmail } from '../../_shared/validation.ts';
import type { SendEmailPayload, EmailTemplate, SendEmailResult } from '../lib/types.ts';
import { processTemplate, validatePlaceholders } from '../lib/templateProcessor.ts';
import { buildSendGridRequestBody, sendEmail, isSuccessResponse } from '../lib/sendgridClient.ts';

// Default sender configuration
const DEFAULT_FROM_EMAIL = 'noreply@splitlease.com';
const DEFAULT_FROM_NAME = 'Split Lease';

/**
 * Handle send email action
 */
export async function handleSend(
  payload: Record<string, unknown>
): Promise<SendEmailResult> {
  console.log('[send-email:send] ========== SEND EMAIL ==========');
  console.log('[send-email:send] Payload:', JSON.stringify({
    ...payload,
    variables: '(redacted for logging)'
  }, null, 2));

  // Validate required fields
  validateRequiredFields(payload, ['template_id', 'to_email', 'variables']);

  const {
    template_id,
    to_email,
    to_name,
    from_email,
    from_name,
    subject: providedSubject,
    variables,
  } = payload as SendEmailPayload;

  // Validate email format
  validateEmail(to_email);

  // Get environment variables
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  if (!sendgridApiKey) {
    throw new Error('Missing SENDGRID_API_KEY environment variable');
  }

  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Step 1: Fetch template from database
  console.log('[send-email:send] Step 1/3: Fetching template...');
  const { data: template, error: templateError } = await supabase
    .from('zat_email_html_template_eg_sendbasicemailwf_')
    .select('_id, Name, "HTML Content", Subject, "From Email", "From Name"')
    .eq('_id', template_id)
    .single();

  if (templateError || !template) {
    console.error('[send-email:send] Template fetch error:', templateError);
    throw new Error(`Template not found: ${template_id}`);
  }

  const emailTemplate = template as EmailTemplate;
  console.log('[send-email:send] Template found:', emailTemplate.Name || template_id);

  const htmlContent = emailTemplate['HTML Content'];
  if (!htmlContent) {
    throw new Error(`Template ${template_id} has no HTML content`);
  }

  // Step 2: Process template placeholders
  console.log('[send-email:send] Step 2/3: Processing template placeholders...');

  // Validate all placeholders have values (warning only)
  const missingPlaceholders = validatePlaceholders(htmlContent, variables);
  if (missingPlaceholders.length > 0) {
    console.warn('[send-email:send] Missing placeholder values:', missingPlaceholders.join(', '));
  }

  const processedHtml = processTemplate(htmlContent, variables);
  console.log('[send-email:send] Template processed successfully');

  // Determine email parameters (payload overrides template defaults)
  const finalFromEmail = from_email || emailTemplate['From Email'] || DEFAULT_FROM_EMAIL;
  const finalFromName = from_name || emailTemplate['From Name'] || DEFAULT_FROM_NAME;
  const finalSubject = providedSubject || emailTemplate.Subject || 'Message from Split Lease';

  // Also process subject if it contains placeholders
  const processedSubject = processTemplate(finalSubject, variables);

  // Step 3: Send via SendGrid
  console.log('[send-email:send] Step 3/3: Sending via SendGrid...');

  const sendGridBody = buildSendGridRequestBody({
    toEmail: to_email,
    toName: to_name,
    fromEmail: finalFromEmail,
    fromName: finalFromName,
    subject: processedSubject,
    htmlContent: processedHtml,
  });

  const sendGridResponse = await sendEmail(sendgridApiKey, sendGridBody);

  if (!isSuccessResponse(sendGridResponse)) {
    const errorMessage = typeof sendGridResponse.body === 'object'
      ? JSON.stringify(sendGridResponse.body)
      : String(sendGridResponse.body);
    throw new Error(`SendGrid API error (${sendGridResponse.statusCode}): ${errorMessage}`);
  }

  console.log('[send-email:send] ========== SUCCESS ==========');

  // Extract message ID if available
  const messageId = sendGridResponse.body && typeof sendGridResponse.body === 'object'
    ? (sendGridResponse.body as { messageId?: string }).messageId
    : undefined;

  return {
    message_id: messageId,
    template_id: template_id,
    to_email: to_email,
    status: 'sent',
    sent_at: new Date().toISOString(),
  };
}
```

**Validation:** Handler can fetch template and process it

### Step 6: Create Main Index Router

**Files:** `supabase/functions/send-email/index.ts`
**Purpose:** Main entry point with action-based routing
**Details:**

```typescript
/**
 * Send Email Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * Main router for email operations:
 * - send: Send templated email via SendGrid
 *
 * Authorization: Bearer token in Authorization header
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  ValidationError,
  AuthenticationError,
  formatErrorResponse,
  getStatusCodeFromError,
} from "../_shared/errors.ts";
import { validateRequired, validateAction } from "../_shared/validation.ts";
import { createErrorCollector, ErrorCollector } from "../_shared/slack.ts";

import { handleSend } from "./handlers/send.ts";

// ─────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────

const ALLOWED_ACTIONS = ["send", "health"] as const;

type Action = (typeof ALLOWED_ACTIONS)[number];

interface RequestBody {
  action: Action;
  payload: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────
// Health Check Handler
// ─────────────────────────────────────────────────────────────

function handleHealth(): { status: string; timestamp: string; actions: string[] } {
  const sendgridConfigured = !!Deno.env.get('SENDGRID_API_KEY');

  return {
    status: sendgridConfigured ? 'healthy' : 'unhealthy (missing SENDGRID_API_KEY)',
    timestamp: new Date().toISOString(),
    actions: [...ALLOWED_ACTIONS],
  };
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

console.log("[send-email] Edge Function started");

Deno.serve(async (req: Request) => {
  console.log(`[send-email] ========== REQUEST ==========`);
  console.log(`[send-email] Method: ${req.method}`);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  // Only POST allowed
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Error collector for consolidated error reporting (ONE RUN = ONE LOG)
  let collector: ErrorCollector | null = null;

  try {
    // ─────────────────────────────────────────────────────────
    // 1. Parse and validate request
    // ─────────────────────────────────────────────────────────

    const body: RequestBody = await req.json();

    validateRequired(body.action, "action");
    validateAction(body.action, [...ALLOWED_ACTIONS]);

    console.log(`[send-email] Action: ${body.action}`);

    // Create error collector after we know the action
    collector = createErrorCollector('send-email', body.action);

    // ─────────────────────────────────────────────────────────
    // 2. Check authorization for send action
    // ─────────────────────────────────────────────────────────

    if (body.action === 'send') {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new AuthenticationError("Missing or invalid Authorization header. Use Bearer token.");
      }

      // For now, we validate that a token is present
      // Future: Validate token against Supabase Auth or API key whitelist
      const token = authHeader.replace("Bearer ", "");
      if (!token) {
        throw new AuthenticationError("Empty Bearer token");
      }

      console.log(`[send-email] Authorization header present`);
    }

    // ─────────────────────────────────────────────────────────
    // 3. Route to handler
    // ─────────────────────────────────────────────────────────

    let result;

    switch (body.action) {
      case "send":
        validateRequired(body.payload, "payload");
        result = await handleSend(body.payload);
        break;

      case "health":
        result = handleHealth();
        break;

      default:
        throw new ValidationError(`Unhandled action: ${body.action}`);
    }

    console.log(`[send-email] ========== SUCCESS ==========`);

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[send-email] ========== ERROR ==========`);
    console.error(`[send-email]`, error);

    // Report to Slack (ONE RUN = ONE LOG, fire-and-forget)
    if (collector) {
      collector.add(error as Error, 'Fatal error in main handler');
      collector.reportToSlack();
    }

    const statusCode = getStatusCodeFromError(error as Error);
    const errorResponse = formatErrorResponse(error as Error);

    return new Response(JSON.stringify(errorResponse), {
      status: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

**Validation:** Function starts and responds to health check

### Step 7: Create deno.json Import Map

**Files:** `supabase/functions/send-email/deno.json`
**Purpose:** Configure imports for the Edge Function
**Details:**

```json
{
  "imports": {
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2"
  }
}
```

**Validation:** Imports resolve correctly

### Step 8: Register Function in config.toml

**Files:** `supabase/config.toml`
**Purpose:** Register the new Edge Function
**Details:**

Add the following section after the existing function configurations (around line 425):

```toml
[functions.send-email]
enabled = true
verify_jwt = false
import_map = "./functions/send-email/deno.json"
entrypoint = "./functions/send-email/index.ts"
```

**Validation:** Function appears in `supabase functions serve` output

## Edge Cases & Error Handling

| Edge Case | How to Handle |
|-----------|---------------|
| Template not found | Throw error with template ID |
| Template has no HTML content | Throw descriptive error |
| Missing placeholder values | Log warning, keep original placeholder |
| SendGrid API failure | Throw error with status code and body |
| Missing SENDGRID_API_KEY | Throw error in handler |
| Invalid email format | Use `validateEmail()` to throw ValidationError |
| Empty Bearer token | Throw AuthenticationError |
| Malformed request body | JSON parse error caught at top level |

## Testing Considerations

### Manual Testing

1. **Health Check:**
   ```bash
   curl -X POST http://localhost:54321/functions/v1/send-email \
     -H "Content-Type: application/json" \
     -d '{"action": "health"}'
   ```

2. **Send Email:**
   ```bash
   curl -X POST http://localhost:54321/functions/v1/send-email \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer test-token" \
     -d '{
       "action": "send",
       "payload": {
         "template_id": "<template_id_from_db>",
         "to_email": "test@example.com",
         "to_name": "Test User",
         "variables": {
           "first_name": "John",
           "confirmation_link": "https://example.com/confirm"
         }
       }
     }'
   ```

### Key Test Scenarios

- [ ] Health check returns status and available actions
- [ ] Missing Authorization header returns 401
- [ ] Invalid template_id returns error
- [ ] Template with placeholders is processed correctly
- [ ] HTML special characters in variables are escaped
- [ ] SendGrid receives correctly formatted request
- [ ] Success response includes message_id and sent_at

## Rollback Strategy

1. Remove `[functions.send-email]` section from `config.toml`
2. Delete `supabase/functions/send-email/` directory
3. If deployed, remove from Supabase Dashboard

## Dependencies & Blockers

| Dependency | Status | Notes |
|------------|--------|-------|
| `SENDGRID_API_KEY` secret | Required | Must be set in Supabase secrets |
| `zat_email_html_template_eg_sendbasicemailwf_` table | Exists | Contains email templates |
| Shared utilities | Exist | `_shared/cors.ts`, `_shared/errors.ts`, etc. |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| SendGrid API rate limiting | Low | Medium | Implement retry logic if needed in future |
| Template injection attacks | Medium | High | HTML escape all variable values |
| Missing environment variables | Low | High | Explicit error messages, health check |
| Database connection failures | Low | High | Error collection and Slack reporting |

## Post-Implementation Reminder

**IMPORTANT**: After implementing this Edge Function, remember to:

1. **Deploy the function**: `supabase functions deploy send-email`
2. **Set the SENDGRID_API_KEY secret** in Supabase Dashboard if not already set:
   - Go to Project Settings > Secrets
   - Add `SENDGRID_API_KEY` with your SendGrid API key value

---

## File Summary

### Files to CREATE

| File Path | Description |
|-----------|-------------|
| `C:\Users\Split Lease\Documents\Split Lease\supabase\functions\send-email\index.ts` | Main router with action-based routing |
| `C:\Users\Split Lease\Documents\Split Lease\supabase\functions\send-email\handlers\send.ts` | Send email handler |
| `C:\Users\Split Lease\Documents\Split Lease\supabase\functions\send-email\lib\types.ts` | TypeScript interfaces |
| `C:\Users\Split Lease\Documents\Split Lease\supabase\functions\send-email\lib\templateProcessor.ts` | Jinja-style placeholder replacement |
| `C:\Users\Split Lease\Documents\Split Lease\supabase\functions\send-email\lib\sendgridClient.ts` | SendGrid API client |
| `C:\Users\Split Lease\Documents\Split Lease\supabase\functions\send-email\deno.json` | Import map configuration |

### Files to MODIFY

| File Path | Description |
|-----------|-------------|
| `C:\Users\Split Lease\Documents\Split Lease\supabase\config.toml` | Add send-email function configuration |

### Files to REFERENCE (Read Only)

| File Path | Description |
|-----------|-------------|
| `C:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\cors.ts` | CORS headers |
| `C:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\errors.ts` | Error classes and formatters |
| `C:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\validation.ts` | Validation utilities |
| `C:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\slack.ts` | Error collection and Slack reporting |
| `C:\Users\Split Lease\Documents\Split Lease\supabase\functions\listing\index.ts` | Pattern reference for router |
| `C:\Users\Split Lease\Documents\Split Lease\supabase\functions\listing\handlers\create.ts` | Pattern reference for handlers |
| `C:\Users\Split Lease\Documents\Split Lease\supabase\CLAUDE.md` | Edge Function guidelines |

---

**PLAN VERSION**: 1.0
**CREATED**: 2025-12-12T14:30:00
**AUTHOR**: Implementation Planner
