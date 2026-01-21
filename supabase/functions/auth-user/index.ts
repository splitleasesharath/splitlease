/**
 * Auth User - Authentication Router
 * Split Lease - Edge Function
 *
 * Routes authentication requests to appropriate handlers
 * NO USER AUTHENTICATION REQUIRED - These ARE the auth endpoints
 *
 * Supported Actions:
 * - login: User login (email/password) - via Supabase Auth (native)
 * - signup: New user registration - via Supabase Auth (native)
 * - logout: User logout (invalidate token) - via Bubble (legacy)
 * - validate: Validate token and fetch user data - via Bubble + Supabase
 * - request_password_reset: Send password reset email - via Supabase Auth (native)
 * - update_password: Update password after reset link clicked - via Supabase Auth (native)
 * - generate_magic_link: Generate magic link without sending email - via Supabase Auth (native)
 * - oauth_signup: Create user record from OAuth provider data - via Supabase Auth
 * - oauth_login: Verify user exists and return session data - via Supabase Auth
 *
 * Security:
 * - NO user authentication on these endpoints (you can't require auth to log in!)
 * - API keys stored server-side in Supabase Secrets
 * - Validates request format only
 * - Password reset always returns success to prevent email enumeration
 *
 * FP ARCHITECTURE:
 * - Pure functions for validation, routing, and response formatting
 * - Immutable data structures (no let reassignment in orchestration)
 * - Side effects isolated to boundaries (entry/exit of handler)
 * - Result type for error propagation (exceptions only at outer boundary)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from '../_shared/cors.ts';

// FP Utilities
import { Result, ok, err } from "../_shared/functional/result.ts";
import {
  parseRequest,
  validateAction,
  routeToHandler,
  getSupabaseConfig,
  getBubbleConfig,
  formatSuccessResponse,
  formatErrorResponseHttp,
  formatCorsResponse,
  CorsPreflightSignal,
} from "../_shared/functional/orchestration.ts";
import { createErrorLog, addError, setAction, ErrorLog } from "../_shared/functional/errorLog.ts";
import { reportErrorLog } from "../_shared/slack.ts";

// Import handlers
import { handleLogin } from './handlers/login.ts';
import { handleSignup } from './handlers/signup.ts';
import { handleLogout } from './handlers/logout.ts';
import { handleValidate } from './handlers/validate.ts';
import { handleRequestPasswordReset } from './handlers/resetPassword.ts';
import { handleUpdatePassword } from './handlers/updatePassword.ts';
import { handleGenerateMagicLink } from './handlers/generateMagicLink.ts';
import { handleOAuthSignup } from './handlers/oauthSignup.ts';
import { handleOAuthLogin } from './handlers/oauthLogin.ts';
import { handleSendMagicLinkSms } from './handlers/sendMagicLinkSms.ts';

// ─────────────────────────────────────────────────────────────
// Configuration (Immutable)
// ─────────────────────────────────────────────────────────────

const ALLOWED_ACTIONS = [
  'login',
  'signup',
  'logout',
  'validate',
  'request_password_reset',
  'update_password',
  'generate_magic_link',
  'oauth_signup',
  'oauth_login',
  'send_magic_link_sms',
] as const;

type Action = typeof ALLOWED_ACTIONS[number];

// Actions that require Bubble API configuration
// NOTE: validate was removed - it no longer uses Bubble API (uses Supabase only)
const BUBBLE_REQUIRED_ACTIONS: ReadonlySet<string> = new Set([]);

// Handler map (immutable record) - replaces switch statement
const handlers: Readonly<Record<Action, Function>> = {
  login: handleLogin,
  signup: handleSignup,
  logout: handleLogout,
  validate: handleValidate,
  request_password_reset: handleRequestPasswordReset,
  update_password: handleUpdatePassword,
  generate_magic_link: handleGenerateMagicLink,
  oauth_signup: handleOAuthSignup,
  oauth_login: handleOAuthLogin,
  send_magic_link_sms: handleSendMagicLinkSms,
};

// ─────────────────────────────────────────────────────────────
// Pure Functions
// ─────────────────────────────────────────────────────────────

/**
 * Get combined configuration for auth operations
 * Some actions need both Supabase and Bubble config
 */
interface AuthConfig {
  readonly supabaseUrl: string;
  readonly supabaseServiceKey: string;
  readonly bubbleBaseUrl?: string;
  readonly bubbleApiKey?: string;
}

const getAuthConfig = (action: string): Result<AuthConfig, Error> => {
  // Supabase config is always required
  const supabaseResult = getSupabaseConfig();
  if (!supabaseResult.ok) {
    return supabaseResult;
  }

  const { supabaseUrl, supabaseServiceKey } = supabaseResult.value;

  // Bubble config only required for validate action
  if (BUBBLE_REQUIRED_ACTIONS.has(action)) {
    const bubbleResult = getBubbleConfig();
    if (!bubbleResult.ok) {
      return bubbleResult;
    }

    return ok({
      supabaseUrl,
      supabaseServiceKey,
      bubbleBaseUrl: bubbleResult.value.bubbleBaseUrl,
      bubbleApiKey: bubbleResult.value.bubbleApiKey,
    });
  }

  return ok({ supabaseUrl, supabaseServiceKey });
};

// ─────────────────────────────────────────────────────────────
// Effect Boundary (Side Effects Isolated Here)
// ─────────────────────────────────────────────────────────────

console.log('[auth-user] Edge Function started (FP mode)');

Deno.serve(async (req) => {
  // Initialize immutable error log with correlation ID
  const correlationId = crypto.randomUUID().slice(0, 8);
  let errorLog: ErrorLog = createErrorLog('auth-user', 'unknown', correlationId);

  try {
    console.log(`[auth-user] ========== NEW AUTH REQUEST ==========`);
    console.log(`[auth-user] Method: ${req.method}`);
    console.log(`[auth-user] URL: ${req.url}`);

    // ─────────────────────────────────────────────────────────
    // Step 1: Parse request (side effect boundary for req.json())
    // ─────────────────────────────────────────────────────────

    const parseResult = await parseRequest(req);

    if (!parseResult.ok) {
      // Handle CORS preflight (not an error, just control flow)
      if (parseResult.error instanceof CorsPreflightSignal) {
        return formatCorsResponse();
      }
      throw parseResult.error;
    }

    const { action, payload } = parseResult.value;

    // Update error log with action (immutable transformation)
    errorLog = setAction(errorLog, action);
    console.log(`[auth-user] Request body:`, JSON.stringify({ action, payload }, null, 2));

    // ─────────────────────────────────────────────────────────
    // Step 2: Validate action (pure)
    // ─────────────────────────────────────────────────────────

    const actionResult = validateAction(ALLOWED_ACTIONS, action);
    if (!actionResult.ok) {
      throw actionResult.error;
    }

    console.log(`[auth-user] Action: ${action}`);

    // ─────────────────────────────────────────────────────────
    // Step 3: Get configuration (pure with env read)
    // ─────────────────────────────────────────────────────────

    const configResult = getAuthConfig(action);
    if (!configResult.ok) {
      throw configResult.error;
    }
    const config = configResult.value;

    console.log(`[auth-user] Action: ${action}, Supabase URL: ${config.supabaseUrl}`);

    // ─────────────────────────────────────────────────────────
    // Step 4: Route to handler (pure lookup + execution)
    // ─────────────────────────────────────────────────────────

    const handlerResult = routeToHandler(handlers, action);
    if (!handlerResult.ok) {
      throw handlerResult.error;
    }

    // Execute handler - the only remaining side effect
    const handler = handlerResult.value;
    const result = await executeHandler(handler, action as Action, payload, config);

    console.log(`[auth-user] Handler completed successfully`);
    console.log(`[auth-user] ========== REQUEST COMPLETE ==========`);

    return formatSuccessResponse(result);

  } catch (error) {
    console.error('[auth-user] ========== ERROR ==========');
    console.error('[auth-user] Error:', error);
    console.error('[auth-user] Error stack:', (error as Error).stack);

    // Add error to log (immutable)
    errorLog = addError(errorLog, error as Error, 'Fatal error in main handler');

    // Report to Slack (side effect at boundary)
    reportErrorLog(errorLog);

    return formatErrorResponseHttp(error as Error);
  }
});

// ─────────────────────────────────────────────────────────────
// Handler Execution (Encapsulates action-specific logic)
// ─────────────────────────────────────────────────────────────

/**
 * Execute the appropriate handler with correct parameters
 * This function handles the different signatures of each handler
 */
async function executeHandler(
  handler: Function,
  action: Action,
  payload: Record<string, unknown>,
  config: AuthConfig
): Promise<unknown> {
  const { supabaseUrl, supabaseServiceKey, bubbleBaseUrl, bubbleApiKey } = config;

  switch (action) {
    case 'login':
      // Login uses Supabase Auth natively (no Bubble dependency)
      return handler(supabaseUrl, supabaseServiceKey, payload);

    case 'signup':
      // Signup uses Supabase Auth natively (no Bubble dependency)
      return handler(supabaseUrl, supabaseServiceKey, payload);

    case 'logout':
      // Logout happens client-side (Supabase Auth), this is just a stub
      return handler(payload);

    case 'validate':
      // Validate uses Supabase only (Bubble params passed for signature compatibility but unused)
      return handler('', '', supabaseUrl, supabaseServiceKey, payload);

    case 'request_password_reset':
      // Password reset uses Supabase Auth natively
      return handler(supabaseUrl, supabaseServiceKey, payload);

    case 'update_password':
      // Password update uses Supabase Auth natively
      return handler(supabaseUrl, supabaseServiceKey, payload);

    case 'generate_magic_link':
      // Generate magic link without sending email
      return handler(supabaseUrl, supabaseServiceKey, payload);

    case 'oauth_signup':
      // OAuth signup - create user record from OAuth provider data
      return handler(supabaseUrl, supabaseServiceKey, payload);

    case 'oauth_login':
      // OAuth login - verify user exists and return session data
      return handler(supabaseUrl, supabaseServiceKey, payload);

    case 'send_magic_link_sms':
      // Generate magic link and send via SMS (atomic operation for usability testing)
      return handler(supabaseUrl, supabaseServiceKey, payload);

    default: {
      // Exhaustive check - TypeScript ensures all cases are handled
      const _exhaustive: never = action;
      throw new Error(`Unknown action: ${action}`);
    }
  }
}
