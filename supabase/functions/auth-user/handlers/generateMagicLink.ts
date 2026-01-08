/**
 * Generate Magic Link Handler - Generate magic link without sending email
 * Split Lease - auth-user
 *
 * Flow:
 * 1. Validate email in payload
 * 2. Call Supabase Auth admin.generateLink() with type 'magiclink'
 * 3. Return action_link and token data (NO email sent)
 *
 * Use Case: Custom email delivery - caller handles sending the link
 *
 * @module auth-user/handlers/generateMagicLink
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubbleApiError } from '../../_shared/errors.ts';
import { validateRequiredFields, validateEmail } from '../../_shared/validation.ts';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[generate-magic-link]'
const LINK_TYPE = 'magiclink'
const DEFAULT_STATUS_CODE = 500

/**
 * Error messages
 * @immutable
 */
const ERROR_MESSAGES = Object.freeze({
  NO_LINK_RETURNED: 'Magic link generation failed - no link returned',
  GENERATION_FAILED: 'Failed to generate magic link',
} as const)

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface GenerateMagicLinkPayload {
  readonly email: string;
  readonly redirectTo?: string;
}

interface MagicLinkProperties {
  readonly action_link?: string;
  readonly hashed_token?: string;
  readonly redirect_to?: string;
  readonly verification_type?: string;
}

interface GenerateLinkResponse {
  readonly properties?: MagicLinkProperties;
  readonly user?: {
    readonly id?: string;
  };
}

interface MagicLinkResult {
  readonly action_link: string;
  readonly hashed_token?: string;
  readonly redirect_to?: string;
  readonly verification_type?: string;
  readonly user_id?: string;
  readonly email: string;
}

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if magic link data contains a valid action link
 * @pure
 */
const hasActionLink = (data: GenerateLinkResponse | null): boolean =>
  data !== null && data?.properties?.action_link !== undefined

// ─────────────────────────────────────────────────────────────
// Data Transformers
// ─────────────────────────────────────────────────────────────

/**
 * Normalize email to lowercase and trimmed
 * @pure
 */
const normalizeEmail = (email: string): string =>
  email.toLowerCase().trim()

// ─────────────────────────────────────────────────────────────
// Result Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build magic link result from response data
 * @pure
 */
const buildMagicLinkResult = (
  data: GenerateLinkResponse,
  email: string
): MagicLinkResult =>
  Object.freeze({
    action_link: data.properties!.action_link!,
    hashed_token: data.properties?.hashed_token,
    redirect_to: data.properties?.redirect_to,
    verification_type: data.properties?.verification_type,
    user_id: data.user?.id,
    email,
  })

/**
 * Build link generation options
 * @pure
 */
const buildLinkOptions = (redirectTo?: string) =>
  Object.freeze({
    type: LINK_TYPE as const,
    options: {
      redirectTo: redirectTo || undefined
    }
  })

// ─────────────────────────────────────────────────────────────
// Client Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build Supabase client configuration
 * @pure
 */
const buildClientConfig = () =>
  Object.freeze({
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle magic link generation request
 * @effectful (authentication API, console logging)
 */
export async function handleGenerateMagicLink(
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: GenerateMagicLinkPayload
): Promise<MagicLinkResult> {
  console.log(`${LOG_PREFIX} ========== GENERATE MAGIC LINK ==========`);

  // Validate required fields
  validateRequiredFields(payload, ['email']);
  const { email, redirectTo } = payload;

  // Validate email format
  validateEmail(email);

  const emailLower = normalizeEmail(email);
  console.log(`${LOG_PREFIX} Generating magic link for: ${emailLower}`);

  // Initialize Supabase admin client
  const supabaseAdmin: SupabaseClient = createClient(
    supabaseUrl,
    supabaseServiceKey,
    buildClientConfig()
  );

  try {
    // Generate magic link WITHOUT sending email
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      ...buildLinkOptions(redirectTo),
      email: emailLower,
    });

    if (error) {
      console.error(`${LOG_PREFIX} Error generating link:`, error.message);
      throw new BubbleApiError(
        `${ERROR_MESSAGES.GENERATION_FAILED}: ${error.message}`,
        error.status || DEFAULT_STATUS_CODE
      );
    }

    if (!hasActionLink(data)) {
      console.error(`${LOG_PREFIX} No action_link in response`);
      throw new BubbleApiError(ERROR_MESSAGES.NO_LINK_RETURNED, DEFAULT_STATUS_CODE);
    }

    console.log(`${LOG_PREFIX} Magic link generated successfully`);
    console.log(`${LOG_PREFIX} User ID:`, data?.user?.id);

    return buildMagicLinkResult(data as GenerateLinkResponse, emailLower);

  } catch (error) {
    if (error instanceof BubbleApiError) {
      throw error;
    }

    console.error(`${LOG_PREFIX} ========== ERROR ==========`);
    console.error(`${LOG_PREFIX} Error:`, error);

    throw new BubbleApiError(
      `${ERROR_MESSAGES.GENERATION_FAILED}: ${(error as Error).message}`,
      DEFAULT_STATUS_CODE,
      error
    );
  }
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
  LINK_TYPE,
  DEFAULT_STATUS_CODE,
  ERROR_MESSAGES,

  // Predicates
  hasActionLink,

  // Transformers
  normalizeEmail,

  // Builders
  buildMagicLinkResult,
  buildLinkOptions,
  buildClientConfig,
})
