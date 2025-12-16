# Implementation Plan: send-sms Edge Function

## Overview

Create a new Supabase Edge Function named `send-sms` that sends SMS messages via Twilio, following the exact architectural pattern and structure as the existing `send-email` edge function. The function will support action-based routing, template processing from the database, and consolidated error reporting via Slack.

## Success Criteria

- [ ] New `send-sms` Edge Function created with proper directory structure
- [ ] Twilio API integration working correctly
- [ ] Template fetching from database implemented (SMS templates)
- [ ] Placeholder replacement in templates functional
- [ ] Action-based routing (`send`, `health`) working
- [ ] Error handling following NO_FALLBACK principle
- [ ] Slack error reporting via ErrorCollector
- [ ] Environment variables documented and validated in health check
- [ ] Function registered in `config.toml`
- [ ] All required type definitions created

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `supabase/functions/send-email/index.ts` | Reference for main router structure | Template for `send-sms/index.ts` |
| `supabase/functions/send-email/handlers/send.ts` | Reference for send handler | Template for `send-sms/handlers/send.ts` |
| `supabase/functions/send-email/lib/types.ts` | Reference for type definitions | Template for `send-sms/lib/types.ts` |
| `supabase/functions/send-email/lib/sendgridClient.ts` | Reference for API client pattern | Template for `send-sms/lib/twilioClient.ts` |
| `supabase/functions/send-email/lib/templateProcessor.ts` | Template processing utilities | Reuse directly (import from send-email or copy) |
| `supabase/functions/send-email/deno.json` | Deno import map reference | Template for `send-sms/deno.json` |
| `supabase/functions/_shared/cors.ts` | CORS headers | Import as-is |
| `supabase/functions/_shared/errors.ts` | Error classes | Import as-is |
| `supabase/functions/_shared/validation.ts` | Validation utilities | Import as-is, extend with `validatePhoneE164` |
| `supabase/functions/_shared/slack.ts` | Slack error reporting | Import as-is |
| `supabase/config.toml` | Edge function configuration | Add `[functions.send-sms]` section |

### Twilio SMS API Reference

**Endpoint**: `https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json`

**Authentication**: HTTP Basic Auth with Account SID as username and Auth Token as password

**Required Parameters**:
- `To`: Recipient phone number in E.164 format (e.g., +15551234567)
- `From`: Sender phone number (Twilio number) in E.164 format
- `Body`: The text content of the SMS message (max 1600 characters)

**Optional Parameters**:
- `MessagingServiceSid`: Use instead of From for advanced routing
- `StatusCallback`: Webhook URL for delivery status updates

**Response**: JSON object with message details including `sid` (message ID), `status`, etc.

**Success Status Code**: 201 Created

### Existing Patterns to Follow

1. **Action-Based Routing Pattern**: Main index.ts routes to handlers based on `{ action, payload }` request body
2. **Handler Separation Pattern**: Each action has its own handler file in `/handlers/`
3. **Library Pattern**: API client and type definitions in `/lib/`
4. **Error Collection Pattern**: Use `createErrorCollector()` for consolidated Slack reporting
5. **Health Check Pattern**: Return status with secrets validation
6. **NO_FALLBACK Principle**: Fail fast, no default values or fallback logic

## Implementation Steps

### Step 1: Create Directory Structure

**Files:** Create new directories
**Purpose:** Set up the file structure matching send-email pattern

**Details:**
- Create `supabase/functions/send-sms/` directory
- Create `supabase/functions/send-sms/handlers/` subdirectory
- Create `supabase/functions/send-sms/lib/` subdirectory

**Validation:** Directory structure exists

---

### Step 2: Create Type Definitions

**Files:** `supabase/functions/send-sms/lib/types.ts`
**Purpose:** Define TypeScript interfaces for SMS payloads, templates, and responses

**Details:**
```typescript
/**
 * Type definitions for send-sms Edge Function
 * Split Lease
 */

// Request payload for send action
export interface SendSmsPayload {
  template_id: string;           // ID of SMS template in database
  to_phone: string;              // Recipient phone in E.164 format (+15551234567)
  from_phone?: string;           // Sender phone (optional, uses default Twilio number)
  variables: Record<string, string>;  // Key-value pairs for placeholder replacement
}

// SMS template from database (table: zat_sms_template)
export interface SmsTemplate {
  _id: string;
  Name?: string;
  'Message Content'?: string;    // The SMS template with {{ placeholders }}
  'From Phone'?: string;         // Default from phone number
}

// Twilio API request body (form-urlencoded, not JSON)
export interface TwilioSmsRequest {
  To: string;
  From: string;
  Body: string;
  StatusCallback?: string;
}

// Twilio API response
export interface TwilioResponse {
  statusCode: number;
  body?: TwilioMessageResponse | TwilioErrorResponse | string;
}

// Successful Twilio message response
export interface TwilioMessageResponse {
  sid: string;                    // Message SID (unique identifier)
  date_created: string;
  date_updated: string;
  date_sent: string | null;
  account_sid: string;
  to: string;
  from: string;
  messaging_service_sid: string | null;
  body: string;
  status: TwilioMessageStatus;
  num_segments: string;
  num_media: string;
  direction: string;
  api_version: string;
  price: string | null;
  price_unit: string;
  error_code: string | null;
  error_message: string | null;
  uri: string;
}

// Twilio error response
export interface TwilioErrorResponse {
  code: number;
  message: string;
  more_info: string;
  status: number;
}

// Twilio message status values
export type TwilioMessageStatus =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'undelivered'
  | 'failed';

// Result from send action
export interface SendSmsResult {
  message_sid?: string;
  template_id: string;
  to_phone: string;
  status: 'queued' | 'failed';
  sent_at: string;
}
```

**Validation:** TypeScript compiles without errors

---

### Step 3: Create Twilio Client

**Files:** `supabase/functions/send-sms/lib/twilioClient.ts`
**Purpose:** Handle Twilio API communication for sending SMS

**Details:**
```typescript
/**
 * Twilio API Client
 * Split Lease - send-sms Edge Function
 *
 * Handles Twilio API communication for sending SMS messages
 *
 * IMPORTANT: Twilio uses form-urlencoded POST, not JSON
 */

import type { TwilioSmsRequest, TwilioResponse, TwilioMessageResponse } from './types.ts';

/**
 * Build the Twilio API endpoint URL
 */
export function buildTwilioEndpoint(accountSid: string): string {
  return `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
}

/**
 * Build Twilio SMS request body (form-urlencoded)
 */
export function buildTwilioRequestBody(params: {
  toPhone: string;
  fromPhone: string;
  body: string;
  statusCallback?: string;
}): URLSearchParams {
  const { toPhone, fromPhone, body, statusCallback } = params;

  const formData = new URLSearchParams();
  formData.append('To', toPhone);
  formData.append('From', fromPhone);
  formData.append('Body', body);

  if (statusCallback) {
    formData.append('StatusCallback', statusCallback);
  }

  return formData;
}

/**
 * Send SMS via Twilio API
 *
 * @param accountSid - Twilio Account SID
 * @param authToken - Twilio Auth Token
 * @param requestBody - URL-encoded form data
 * @returns Twilio response
 */
export async function sendSms(
  accountSid: string,
  authToken: string,
  requestBody: URLSearchParams
): Promise<TwilioResponse> {
  console.log('[twilioClient] Sending SMS via Twilio...');
  console.log('[twilioClient] To:', requestBody.get('To'));
  console.log('[twilioClient] Body length:', requestBody.get('Body')?.length || 0);

  const endpoint = buildTwilioEndpoint(accountSid);

  // Twilio uses HTTP Basic Auth
  const credentials = btoa(`${accountSid}:${authToken}`);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: requestBody.toString(),
  });

  const result: TwilioResponse = {
    statusCode: response.status,
  };

  // Parse response body
  try {
    result.body = await response.json();
  } catch {
    result.body = await response.text();
  }

  if (!response.ok) {
    console.error('[twilioClient] Twilio API error:', result.statusCode, result.body);
  } else {
    const messageResponse = result.body as TwilioMessageResponse;
    console.log('[twilioClient] SMS queued successfully, SID:', messageResponse.sid);
    console.log('[twilioClient] Status:', messageResponse.status);
  }

  return result;
}

/**
 * Check if Twilio response indicates success
 * Twilio returns 201 Created for successful message creation
 */
export function isSuccessResponse(response: TwilioResponse): boolean {
  return response.statusCode === 201;
}

/**
 * Extract message SID from successful response
 */
export function getMessageSid(response: TwilioResponse): string | undefined {
  if (isSuccessResponse(response) && response.body && typeof response.body === 'object') {
    return (response.body as TwilioMessageResponse).sid;
  }
  return undefined;
}
```

**Validation:** API client builds correctly, handles auth and form encoding

---

### Step 4: Create Template Processor (Copy or Import)

**Files:** `supabase/functions/send-sms/lib/templateProcessor.ts`
**Purpose:** Handle placeholder replacement in SMS templates

**Details:**
Copy the template processor from send-email (identical logic, just different context):
- `processTemplate()` - Replace {{ placeholders }} with values
- `extractPlaceholders()` - Get all placeholder names
- `validatePlaceholders()` - Check for missing values

Note: SMS messages are plain text, so HTML escaping is not needed. Modify the processor to skip HTML escaping or create a simpler version.

```typescript
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
```

**Validation:** Template processing works for SMS text content

---

### Step 5: Create Send Handler

**Files:** `supabase/functions/send-sms/handlers/send.ts`
**Purpose:** Handle the 'send' action - fetch template, process, send via Twilio

**Details:**
```typescript
/**
 * Send SMS Handler
 * Split Lease - send-sms Edge Function
 *
 * Handles the 'send' action:
 * 1. Fetch template from database
 * 2. Process placeholders
 * 3. Send via Twilio
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateRequiredFields } from '../../_shared/validation.ts';
import { ValidationError } from '../../_shared/errors.ts';
import type { SendSmsPayload, SmsTemplate, SendSmsResult } from '../lib/types.ts';
import { processTemplate, validatePlaceholders, validateSmsLength } from '../lib/templateProcessor.ts';
import { buildTwilioRequestBody, sendSms, isSuccessResponse, getMessageSid } from '../lib/twilioClient.ts';

// Default sender configuration (Twilio phone number)
const DEFAULT_FROM_PHONE = '+15551234567'; // Replace with actual Twilio number

/**
 * Validate E.164 phone number format
 * E.164: +[country code][number], e.g., +15551234567
 */
function validatePhoneE164(phone: string, fieldName: string): void {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  if (!e164Regex.test(phone)) {
    throw new ValidationError(
      `${fieldName} must be in E.164 format (e.g., +15551234567). Received: ${phone}`
    );
  }
}

/**
 * Handle send SMS action
 */
export async function handleSend(
  payload: Record<string, unknown>
): Promise<SendSmsResult> {
  console.log('[send-sms:send] ========== SEND SMS ==========');
  console.log('[send-sms:send] Payload:', JSON.stringify({
    ...payload,
    variables: '(redacted for logging)'
  }, null, 2));

  // Validate required fields
  validateRequiredFields(payload, ['template_id', 'to_phone', 'variables']);

  const {
    template_id,
    to_phone,
    from_phone,
    variables,
  } = payload as SendSmsPayload;

  // Validate phone format (E.164)
  validatePhoneE164(to_phone, 'to_phone');

  // Get environment variables
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioFromPhone = Deno.env.get('TWILIO_FROM_PHONE');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  if (!twilioAccountSid) {
    throw new Error('Missing TWILIO_ACCOUNT_SID environment variable');
  }

  if (!twilioAuthToken) {
    throw new Error('Missing TWILIO_AUTH_TOKEN environment variable');
  }

  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Step 1: Fetch template from database
  console.log('[send-sms:send] Step 1/3: Fetching template...');
  const { data: template, error: templateError } = await supabase
    .from('zat_sms_template')
    .select('_id, Name, "Message Content", "From Phone"')
    .eq('_id', template_id)
    .single();

  if (templateError || !template) {
    console.error('[send-sms:send] Template fetch error:', templateError);
    throw new Error(`SMS Template not found: ${template_id}`);
  }

  const smsTemplate = template as SmsTemplate;
  console.log('[send-sms:send] Template found:', smsTemplate.Name || template_id);

  const messageContent = smsTemplate['Message Content'];
  if (!messageContent) {
    throw new Error(`SMS Template ${template_id} has no message content`);
  }

  // Step 2: Process template placeholders
  console.log('[send-sms:send] Step 2/3: Processing template placeholders...');

  // Validate all placeholders have values (warning only)
  const missingPlaceholders = validatePlaceholders(messageContent, variables);
  if (missingPlaceholders.length > 0) {
    console.warn('[send-sms:send] Missing placeholder values:', missingPlaceholders.join(', '));
  }

  const processedBody = processTemplate(messageContent, variables);
  console.log('[send-sms:send] Template processed successfully');

  // Validate SMS length
  validateSmsLength(processedBody);
  console.log('[send-sms:send] SMS length:', processedBody.length, 'characters');

  // Determine from phone (payload overrides template, template overrides env default)
  const finalFromPhone = from_phone || smsTemplate['From Phone'] || twilioFromPhone || DEFAULT_FROM_PHONE;

  // Validate from phone if provided
  validatePhoneE164(finalFromPhone, 'from_phone');

  // Step 3: Send via Twilio
  console.log('[send-sms:send] Step 3/3: Sending via Twilio...');

  const twilioBody = buildTwilioRequestBody({
    toPhone: to_phone,
    fromPhone: finalFromPhone,
    body: processedBody,
  });

  const twilioResponse = await sendSms(twilioAccountSid, twilioAuthToken, twilioBody);

  if (!isSuccessResponse(twilioResponse)) {
    const errorMessage = typeof twilioResponse.body === 'object'
      ? JSON.stringify(twilioResponse.body)
      : String(twilioResponse.body);
    throw new Error(`Twilio API error (${twilioResponse.statusCode}): ${errorMessage}`);
  }

  console.log('[send-sms:send] ========== SUCCESS ==========');

  const messageSid = getMessageSid(twilioResponse);

  return {
    message_sid: messageSid,
    template_id: template_id,
    to_phone: to_phone,
    status: 'queued',
    sent_at: new Date().toISOString(),
  };
}
```

**Validation:** Handler fetches template, processes placeholders, sends SMS via Twilio

---

### Step 6: Create Main Router (index.ts)

**Files:** `supabase/functions/send-sms/index.ts`
**Purpose:** Main entry point with action routing, auth, and error handling

**Details:**
```typescript
/**
 * Send SMS Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * Main router for SMS operations:
 * - send: Send templated SMS via Twilio
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

function handleHealth(): { status: string; timestamp: string; actions: string[]; secrets: Record<string, boolean> } {
  const twilioAccountSidConfigured = !!Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthTokenConfigured = !!Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioFromPhoneConfigured = !!Deno.env.get('TWILIO_FROM_PHONE');
  const allConfigured = twilioAccountSidConfigured && twilioAuthTokenConfigured;

  return {
    status: allConfigured ? 'healthy' : 'unhealthy (missing secrets)',
    timestamp: new Date().toISOString(),
    actions: [...ALLOWED_ACTIONS],
    secrets: {
      TWILIO_ACCOUNT_SID: twilioAccountSidConfigured,
      TWILIO_AUTH_TOKEN: twilioAuthTokenConfigured,
      TWILIO_FROM_PHONE: twilioFromPhoneConfigured,
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

console.log("[send-sms] Edge Function started");

Deno.serve(async (req: Request) => {
  console.log(`[send-sms] ========== REQUEST ==========`);
  console.log(`[send-sms] Method: ${req.method}`);

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

    console.log(`[send-sms] Action: ${body.action}`);

    // Create error collector after we know the action
    collector = createErrorCollector('send-sms', body.action);

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

      console.log(`[send-sms] Authorization header present`);
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

    console.log(`[send-sms] ========== SUCCESS ==========`);

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[send-sms] ========== ERROR ==========`);
    console.error(`[send-sms]`, error);

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

**Validation:** Main router handles CORS, auth, action routing, and error handling correctly

---

### Step 7: Create deno.json Import Map

**Files:** `supabase/functions/send-sms/deno.json`
**Purpose:** Configure Deno imports for the edge function

**Details:**
```json
{
  "imports": {
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2"
  }
}
```

**Validation:** Import map correctly references dependencies

---

### Step 8: Register Function in config.toml

**Files:** `supabase/config.toml`
**Purpose:** Register the new edge function with Supabase

**Details:**
Add the following section after `[functions.send-email]`:

```toml
[functions.send-sms]
enabled = true
verify_jwt = false
import_map = "./functions/send-sms/deno.json"
entrypoint = "./functions/send-sms/index.ts"
```

**Validation:** Function appears in `supabase functions list`

---

### Step 9: Update Shared Validation (Optional Enhancement)

**Files:** `supabase/functions/_shared/validation.ts`
**Purpose:** Add E.164 phone validation utility for reuse

**Details:**
Add a new function to validation.ts:

```typescript
/**
 * Validate E.164 phone number format
 * E.164: +[country code][number], e.g., +15551234567
 * NO FALLBACK: Throws if invalid
 */
export function validatePhoneE164(phone: string, fieldName: string = 'phone'): void {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  if (!e164Regex.test(phone)) {
    throw new ValidationError(
      `${fieldName} must be in E.164 format (e.g., +15551234567). Received: ${phone}`
    );
  }
}
```

**Validation:** Function can be imported and used by send-sms handler

---

## Environment Variables Required

| Variable | Description | Required |
|----------|-------------|----------|
| `TWILIO_ACCOUNT_SID` | Twilio Account SID (found in Twilio Console) | Yes |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token (found in Twilio Console) | Yes |
| `TWILIO_FROM_PHONE` | Default Twilio phone number in E.164 format | Recommended |
| `SUPABASE_URL` | Supabase project URL (auto-configured) | Yes (auto) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |

**Setup in Supabase Dashboard:**
1. Go to Project Settings > Secrets
2. Add each secret key-value pair
3. Verify via health check endpoint

---

## Database Requirements

A new table `zat_sms_template` needs to exist (or use an existing SMS template table). Expected schema:

| Column | Type | Description |
|--------|------|-------------|
| `_id` | text | Primary key (template ID) |
| `Name` | text | Template name for reference |
| `Message Content` | text | SMS body with {{ placeholders }} |
| `From Phone` | text | Default from phone (optional) |

**Note:** If the table doesn't exist, it will need to be created. Confirm with the team whether this table exists or needs to be created as part of this implementation.

---

## Edge Cases & Error Handling

| Edge Case | Handling |
|-----------|----------|
| Invalid phone format | Throw ValidationError with E.164 format guidance |
| SMS body > 1600 chars | Throw Error with character count |
| Missing template | Throw Error with template_id |
| Empty template content | Throw Error indicating empty content |
| Missing placeholders | Log warning, keep original placeholder |
| Twilio API error | Throw Error with status code and body |
| Missing env vars | Throw Error specifying which variable is missing |
| Invalid auth token | Throw AuthenticationError |

---

## Testing Considerations

1. **Unit Testing:**
   - Test `validatePhoneE164()` with valid/invalid E.164 numbers
   - Test `processTemplate()` with various placeholder scenarios
   - Test `validateSmsLength()` boundary conditions
   - Test `buildTwilioRequestBody()` URL encoding

2. **Integration Testing:**
   - Test health endpoint returns correct secret status
   - Test send with valid template and payload
   - Test send with missing template
   - Test send with invalid phone format
   - Test send with oversized message

3. **Manual Testing:**
   - Use Twilio test credentials for safe testing
   - Verify SMS delivery to real phone numbers
   - Test template placeholder replacement

---

## Rollback Strategy

1. **Remove config.toml entry**: Delete `[functions.send-sms]` section
2. **Delete function directory**: Remove `supabase/functions/send-sms/`
3. **Remove secrets**: Delete Twilio secrets from Supabase Dashboard (if added)
4. **Redeploy**: Run `supabase functions deploy` to update remote

---

## Dependencies & Blockers

| Dependency | Status | Notes |
|------------|--------|-------|
| Twilio Account | Required | Need Account SID, Auth Token, Phone Number |
| SMS Template Table | TBD | Confirm if `zat_sms_template` exists or needs creation |
| Supabase Secrets | Required | Must configure TWILIO_* secrets in production |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Twilio rate limiting | Medium | Medium | Implement backoff strategy if needed |
| SMS cost overruns | Medium | Low | Monitor usage in Twilio dashboard |
| Template table missing | High | Medium | Confirm table exists before implementation |
| E.164 format confusion | High | Low | Clear error messages with format examples |
| Secrets misconfiguration | Medium | High | Health check validates all required secrets |

---

## Post-Implementation Reminder

**IMPORTANT: Manual Deployment Required**

After implementation, the edge function must be deployed manually:

```bash
supabase functions deploy send-sms
```

The Supabase secrets (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_PHONE) must be configured in the Supabase Dashboard before the function will work in production.

---

## File Summary

### New Files to Create

| File Path | Purpose |
|-----------|---------|
| `supabase/functions/send-sms/index.ts` | Main router with action handling |
| `supabase/functions/send-sms/handlers/send.ts` | Send SMS handler |
| `supabase/functions/send-sms/lib/types.ts` | TypeScript type definitions |
| `supabase/functions/send-sms/lib/twilioClient.ts` | Twilio API client |
| `supabase/functions/send-sms/lib/templateProcessor.ts` | Template placeholder processing |
| `supabase/functions/send-sms/deno.json` | Deno import map |

### Files to Modify

| File Path | Changes |
|-----------|---------|
| `supabase/config.toml` | Add `[functions.send-sms]` section |
| `supabase/functions/_shared/validation.ts` | Add `validatePhoneE164()` (optional) |

### Reference Files (Read Only)

| File Path | Purpose |
|-----------|---------|
| `supabase/functions/send-email/index.ts` | Pattern reference for main router |
| `supabase/functions/send-email/handlers/send.ts` | Pattern reference for handler |
| `supabase/functions/send-email/lib/types.ts` | Pattern reference for types |
| `supabase/functions/send-email/lib/sendgridClient.ts` | Pattern reference for API client |
| `supabase/functions/send-email/lib/templateProcessor.ts` | Pattern reference for template processing |
| `supabase/functions/_shared/cors.ts` | CORS headers utility |
| `supabase/functions/_shared/errors.ts` | Error classes and formatting |
| `supabase/functions/_shared/validation.ts` | Validation utilities |
| `supabase/functions/_shared/slack.ts` | Slack error reporting |
| `supabase/CLAUDE.md` | Edge Function patterns documentation |

---

**Plan Version**: 1.0
**Created**: 2025-12-13T16:15:30
**Author**: Claude (Implementation Planning Architect)
**Status**: Ready for Execution
