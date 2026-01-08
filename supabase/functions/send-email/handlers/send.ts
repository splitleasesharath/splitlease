/**
 * Send Email Handler
 * Split Lease - send-email Edge Function
 *
 * Handles the 'send' action:
 * 1. Fetch template from database
 * 2. Process placeholders
 * 3. Send via SendGrid
 *
 * FP PATTERN: Separates pure data builders from effectful database operations
 * All data transformations are pure with @pure annotations
 * All database operations are explicit with @effectful annotations
 *
 * @module send-email/handlers/send
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateRequiredFields, validateEmail } from '../../_shared/validation.ts';
import type { SendEmailPayload, EmailTemplate, SendEmailResult, SendGridResponse } from '../lib/types.ts';
import { processTemplateJson, validatePlaceholders } from '../lib/templateProcessor.ts';
import { sendEmailRaw, isSuccessResponse } from '../lib/sendgridClient.ts';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[send-email:send]'
const DEFAULT_FROM_EMAIL = 'noreply@splitlease.com'
const DEFAULT_FROM_NAME = 'Split Lease'
const DEFAULT_SUBJECT = 'Message from Split Lease'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface EnvConfig {
  readonly supabaseUrl: string;
  readonly supabaseServiceKey: string;
  readonly sendgridApiKey: string;
  readonly sendgridEmailEndpoint: string;
}

// ─────────────────────────────────────────────────────────────
// Pure Data Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build complete variables object with defaults
 * @pure
 */
const buildVariables = (
  payload: SendEmailPayload
): Readonly<Record<string, string>> => {
  const vars: Record<string, string> = {
    ...payload.variables,
    to_email: payload.to_email,
    from_email: payload.from_email || DEFAULT_FROM_EMAIL,
    from_name: payload.from_name || DEFAULT_FROM_NAME,
    subject: payload.subject || payload.variables.subject || DEFAULT_SUBJECT,
  }

  if (payload.to_name) {
    vars.to_name = payload.to_name
  }

  return Object.freeze(vars)
}

/**
 * Filter valid email addresses
 * @pure
 */
const filterValidEmails = (emails: readonly string[] | undefined): readonly string[] => {
  if (!emails) return []
  return emails.filter(email => email && email.trim() && email.includes('@'))
}

/**
 * Build recipient list from emails
 * @pure
 */
const buildRecipientList = (emails: readonly string[]): readonly { email: string }[] =>
  Object.freeze(emails.map(email => Object.freeze({ email: email.trim() })))

/**
 * Inject CC and BCC into SendGrid body
 * @pure
 */
const injectCcBcc = (
  body: Record<string, unknown>,
  ccEmails: readonly string[] | undefined,
  bccEmails: readonly string[] | undefined
): Record<string, unknown> => {
  const validCcEmails = filterValidEmails(ccEmails)
  const validBccEmails = filterValidEmails(bccEmails)

  if (validCcEmails.length === 0 && validBccEmails.length === 0) {
    return body
  }

  const personalizations = body.personalizations as Array<Record<string, unknown>> | undefined
  if (!personalizations || personalizations.length === 0) {
    return body
  }

  const updatedPersonalizations = [...personalizations]
  const first = { ...updatedPersonalizations[0] }

  if (validCcEmails.length > 0) {
    first.cc = buildRecipientList(validCcEmails)
    console.log(`${LOG_PREFIX} Added CC recipients: ${validCcEmails.length}`)
  }

  if (validBccEmails.length > 0) {
    first.bcc = buildRecipientList(validBccEmails)
    console.log(`${LOG_PREFIX} Added BCC recipients: ${validBccEmails.length}`)
  }

  updatedPersonalizations[0] = first
  return { ...body, personalizations: updatedPersonalizations }
}

/**
 * Build success response
 * @pure
 */
const buildSuccessResponse = (
  messageId: string | undefined,
  templateId: string,
  toEmail: string
): SendEmailResult =>
  Object.freeze({
    message_id: messageId,
    template_id: templateId,
    to_email: toEmail,
    status: 'sent' as const,
    sent_at: new Date().toISOString(),
  })

/**
 * Extract message ID from SendGrid response
 * @pure
 */
const extractMessageId = (response: SendGridResponse): string | undefined =>
  response.body && typeof response.body === 'object'
    ? (response.body as { messageId?: string }).messageId
    : undefined

// ─────────────────────────────────────────────────────────────
// Environment Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Get and validate environment configuration
 * @effectful - Reads environment variables
 */
const getEnvConfig = (): EnvConfig => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY')
  const sendgridEmailEndpoint = Deno.env.get('SENDGRID_EMAIL_ENDPOINT')

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  if (!sendgridApiKey) {
    throw new Error('Missing SENDGRID_API_KEY environment variable')
  }

  if (!sendgridEmailEndpoint) {
    throw new Error('Missing SENDGRID_EMAIL_ENDPOINT environment variable')
  }

  return Object.freeze({
    supabaseUrl,
    supabaseServiceKey,
    sendgridApiKey,
    sendgridEmailEndpoint,
  })
}

/**
 * Create Supabase client for reference_table schema
 * @effectful - Creates client
 */
const createReferenceTableClient = (url: string, key: string): SupabaseClient =>
  createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'reference_table',
    },
  })

// ─────────────────────────────────────────────────────────────
// Database Query Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Fetch email template from database
 * @effectful - Database read operation
 */
const fetchTemplate = async (
  supabase: SupabaseClient,
  templateId: string
): Promise<EmailTemplate> => {
  console.log(`${LOG_PREFIX} Looking up template_id: ${templateId}`)

  const { data: template, error } = await supabase
    .from('zat_email_html_template_eg_sendbasicemailwf_')
    .select('_id, "Name", "Email Template JSON", "Description", "Email Reference", "Logo", "Placeholder"')
    .eq('_id', templateId)
    .single()

  console.log(`${LOG_PREFIX} Query result - data: ${template ? 'found' : 'null'}`)
  console.log(`${LOG_PREFIX} Query result - error: ${error ? JSON.stringify(error) : 'none'}`)

  if (error || !template) {
    console.error(`${LOG_PREFIX} Template fetch error:`, error)
    throw new Error(`Template not found: ${templateId}. Error: ${error?.message || 'No data returned'}`)
  }

  return template as EmailTemplate
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle send email action
 * @effectful - Orchestrates database and API operations
 */
export async function handleSend(
  payload: Record<string, unknown>
): Promise<SendEmailResult> {
  console.log(`${LOG_PREFIX} ========== SEND EMAIL ==========`)
  console.log(`${LOG_PREFIX} Payload:`, JSON.stringify({
    ...payload,
    variables: '(redacted for logging)'
  }, null, 2))

  // ================================================
  // VALIDATION
  // ================================================

  validateRequiredFields(payload, ['template_id', 'to_email', 'variables'])

  const typedPayload = payload as SendEmailPayload
  validateEmail(typedPayload.to_email)

  // ================================================
  // ENVIRONMENT CONFIG
  // ================================================

  const config = getEnvConfig()

  // ================================================
  // STEP 1: FETCH TEMPLATE
  // ================================================

  console.log(`${LOG_PREFIX} Step 1/3: Fetching template...`)

  const supabase = createReferenceTableClient(config.supabaseUrl, config.supabaseServiceKey)
  const emailTemplate = await fetchTemplate(supabase, typedPayload.template_id)

  console.log(`${LOG_PREFIX} Template found: ${emailTemplate.Name || typedPayload.template_id}`)

  const templateJsonString = emailTemplate['Email Template JSON']
  if (!templateJsonString) {
    throw new Error(`Template ${typedPayload.template_id} has no content (Email Template JSON is empty)`)
  }

  // ================================================
  // STEP 2: PROCESS PLACEHOLDERS
  // ================================================

  console.log(`${LOG_PREFIX} Step 2/3: Processing template placeholders...`)

  const allVariables = buildVariables(typedPayload)
  console.log(`${LOG_PREFIX} Placeholder replacements:`, JSON.stringify(allVariables, null, 2))

  // Validate placeholders (warning only)
  const missingPlaceholders = validatePlaceholders(templateJsonString, allVariables)
  if (missingPlaceholders.length > 0) {
    console.warn(`${LOG_PREFIX} Missing placeholder values: ${missingPlaceholders.join(', ')}`)
  }

  const processedJsonString = processTemplateJson(templateJsonString, allVariables)
  console.log(`${LOG_PREFIX} Template processed successfully`)

  // ================================================
  // STEP 3: SEND VIA SENDGRID
  // ================================================

  console.log(`${LOG_PREFIX} Step 3/3: Sending via SendGrid...`)

  let sendGridBody: Record<string, unknown>
  try {
    sendGridBody = JSON.parse(processedJsonString)
  } catch (parseError) {
    console.error(`${LOG_PREFIX} Failed to parse processed template as JSON:`, parseError)
    throw new Error(`Template ${typedPayload.template_id} produced invalid JSON after placeholder processing`)
  }

  // Inject CC/BCC if provided
  sendGridBody = injectCcBcc(sendGridBody, typedPayload.cc_emails, typedPayload.bcc_emails)

  const sendGridResponse = await sendEmailRaw(
    config.sendgridApiKey,
    config.sendgridEmailEndpoint,
    sendGridBody
  )

  if (!isSuccessResponse(sendGridResponse)) {
    const errorMessage = typeof sendGridResponse.body === 'object'
      ? JSON.stringify(sendGridResponse.body)
      : String(sendGridResponse.body)
    throw new Error(`SendGrid API error (${sendGridResponse.statusCode}): ${errorMessage}`)
  }

  console.log(`${LOG_PREFIX} ========== SUCCESS ==========`)

  return buildSuccessResponse(
    extractMessageId(sendGridResponse),
    typedPayload.template_id,
    typedPayload.to_email
  )
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
  DEFAULT_FROM_EMAIL,
  DEFAULT_FROM_NAME,
  DEFAULT_SUBJECT,

  // Pure Data Builders
  buildVariables,
  filterValidEmails,
  buildRecipientList,
  injectCcBcc,
  buildSuccessResponse,
  extractMessageId,

  // Environment Helpers
  getEnvConfig,
  createReferenceTableClient,

  // Database Query Helpers
  fetchTemplate,

  // Main Handler
  handleSend,
})
