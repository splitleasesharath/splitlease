/**
 * SendGrid API Client
 * Split Lease - send-email Edge Function
 *
 * Handles SendGrid API communication for sending emails
 *
 * FP PATTERN: Separates pure data builders from effectful API operations
 * All data transformations are pure with @pure annotations
 * All API operations are explicit with @effectful annotations
 *
 * @module send-email/lib/sendgridClient
 */

import type { SendGridMailRequest, SendGridResponse, SendGridRecipient } from './types.ts';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[send-email:sendgridClient]'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface BuildRequestParams {
  readonly toEmail: string;
  readonly toName?: string;
  readonly fromEmail: string;
  readonly fromName?: string;
  readonly subject: string;
  readonly htmlContent: string;
}

// ─────────────────────────────────────────────────────────────
// Pure Data Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build recipient object
 * @pure
 */
const buildRecipient = (email: string, name?: string): SendGridRecipient =>
  Object.freeze(
    name
      ? { email, name }
      : { email }
  )

/**
 * Build SendGrid mail request body
 * @pure
 */
export function buildSendGridRequestBody(params: BuildRequestParams): SendGridMailRequest {
  const { toEmail, toName, fromEmail, fromName, subject, htmlContent } = params

  return Object.freeze({
    personalizations: Object.freeze([
      Object.freeze({
        to: Object.freeze([buildRecipient(toEmail, toName)]),
        subject,
      }),
    ]),
    from: buildRecipient(fromEmail, fromName),
    content: Object.freeze([
      Object.freeze({
        type: 'text/html' as const,
        value: htmlContent,
      }),
    ]),
  })
}

/**
 * Build response object from API response
 * @pure
 */
const buildResponse = (
  statusCode: number,
  headers: Headers,
  body?: unknown
): SendGridResponse =>
  Object.freeze({
    statusCode,
    headers: Object.freeze(Object.fromEntries(headers.entries())),
    body,
  })

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if SendGrid response indicates success
 * SendGrid returns 202 Accepted for successful email sends
 * @pure
 */
export function isSuccessResponse(response: SendGridResponse): boolean {
  return response.statusCode === 202 || response.statusCode === 200
}

// ─────────────────────────────────────────────────────────────
// API Operations
// ─────────────────────────────────────────────────────────────

/**
 * Extract logging info from request body
 * @pure
 */
const extractLoggingInfo = (
  requestBody: Readonly<Record<string, unknown>>
): { toEmail: string; subject: string } => {
  const personalizations = requestBody.personalizations as
    | readonly { to?: readonly { email?: string }[]; subject?: string }[]
    | undefined

  return {
    toEmail: personalizations?.[0]?.to?.[0]?.email || 'unknown',
    subject: personalizations?.[0]?.subject || (requestBody.subject as string) || 'unknown',
  }
}

/**
 * Send email via SendGrid API
 * @effectful - HTTP API operation
 *
 * @param apiKey - SendGrid API key
 * @param emailEndpoint - SendGrid API endpoint
 * @param requestBody - SendGrid mail request body
 * @returns SendGrid response
 */
export async function sendEmail(
  apiKey: string,
  emailEndpoint: string,
  requestBody: SendGridMailRequest
): Promise<SendGridResponse> {
  console.log(`${LOG_PREFIX} Sending email via SendGrid...`)
  console.log(`${LOG_PREFIX} To:`, requestBody.personalizations[0].to[0].email)
  console.log(`${LOG_PREFIX} Subject:`, requestBody.personalizations[0].subject)

  return sendEmailRaw(apiKey, emailEndpoint, requestBody)
}

/**
 * Send email via SendGrid API with raw JSON body
 * Used when the template already contains the full SendGrid payload structure
 * @effectful - HTTP API operation
 *
 * @param apiKey - SendGrid API key
 * @param emailEndpoint - SendGrid API endpoint
 * @param requestBody - Pre-built SendGrid request body (already processed)
 * @returns SendGrid response
 */
export async function sendEmailRaw(
  apiKey: string,
  emailEndpoint: string,
  requestBody: Readonly<Record<string, unknown>>
): Promise<SendGridResponse> {
  console.log(`${LOG_PREFIX} Sending email via SendGrid (raw)...`)

  const loggingInfo = extractLoggingInfo(requestBody)
  console.log(`${LOG_PREFIX} To:`, loggingInfo.toEmail)
  console.log(`${LOG_PREFIX} Subject:`, loggingInfo.subject)

  const response = await fetch(emailEndpoint, {
    method: 'POST',
    headers: Object.freeze({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(requestBody),
  })

  // Handle error responses
  if (!response.ok) {
    let body: unknown
    try {
      body = await response.json()
    } catch {
      body = await response.text()
    }
    console.error(`${LOG_PREFIX} SendGrid API error:`, response.status, body)
    return buildResponse(response.status, response.headers, body)
  }

  // Handle success responses
  console.log(`${LOG_PREFIX} Email sent successfully, status:`, response.status)

  // Get message ID from headers if available
  const messageId = response.headers.get('x-message-id')
  const body = messageId ? Object.freeze({ messageId }) : undefined

  return buildResponse(response.status, response.headers, body)
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

  // Pure Data Builders
  buildRecipient,
  buildSendGridRequestBody,
  buildResponse,
  extractLoggingInfo,

  // Validation Predicates
  isSuccessResponse,

  // API Operations
  sendEmail,
  sendEmailRaw,
})
