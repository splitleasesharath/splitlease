/**
 * CTA (Call-to-Action) Helpers
 * Split Lease - Edge Functions
 *
 * Pure functions for CTA lookup and template rendering.
 * Mirrors Bubble's "find & replace" pattern for message templates.
 *
 * Template Variables:
 * - [Host name] → Host's first name
 * - [Guest name] → Guest's first name
 * - [Listing name] → Listing title/name
 * - [proposal's Listing's Name] → Same as [Listing name]
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================
// CONSTANTS
// ============================================

/**
 * SplitBot user ID for automated messages
 */
export const SPLITBOT_USER_ID = '1634177189464x117577733821174320';

/**
 * Mapping from proposal status to CTA names
 * Each status can have different CTAs for guest and host
 */
export const STATUS_TO_CTA: Record<string, { guest?: string; host?: string }> = {
  // Pre-submission states
  'Proposal Submitted by guest - Awaiting Rental Application': {
    guest: 'fill_out_rental_application',
  },
  'Proposal Submitted for guest by Split Lease - Awaiting Rental Application': {
    guest: 'fill_out_rental_application',
  },
  'Proposal Submitted for guest by Split Lease - Pending Confirmation': {
    guest: 'view_proposal_guest',
    host: 'view_proposal_host',
  },

  // Active workflow states
  'Host Review': {
    guest: 'view_proposal_guest',
    host: 'view_proposal_host',
  },
  'Host Counteroffer Submitted / Awaiting Guest Review': {
    guest: 'respond_to_counter_offer',
  },
  'Proposal or Counteroffer Accepted / Drafting Lease Documents': {
    guest: 'host_accepted_proposal_guest_view',
    host: 'host_accepted_proposal_host_view',
  },
  'Lease Documents Sent for Review': {
    guest: 'review_documents_guest',
    host: 'review_documents_host',
  },
  'Lease Documents Sent for Signatures': {
    guest: 'sign_lease_documents_guest',
    host: 'sign_lease_documents_host',
  },
  'Lease Documents Signed / Awaiting Initial payment': {
    guest: 'sign_lease_documents_guest',
    host: 'sign_lease_documents_host',
  },
  'Initial Payment Submitted / Lease activated ': {
    guest: 'lease_activated_guest_view',
    host: 'lease_activated_host_view',
  },
};

// ============================================
// TYPES
// ============================================

export interface CTARecord {
  id: number;
  name: string;
  display: string;
  message: string | null;
  button_text: string | null;
  is_proposal_cta: boolean;
  is_lease_cta: boolean;
  is_review_cta: boolean;
  is_house_manual_cta: boolean;
  visible_to_guest_only: boolean;
  visible_to_host_only: boolean;
}

export interface TemplateContext {
  hostName?: string;
  guestName?: string;
  listingName?: string;
}

export interface RenderedCTA {
  display: string;
  message: string;
  buttonText: string | null;
  visibleToGuestOnly: boolean;
  visibleToHostOnly: boolean;
}

// ============================================
// PURE FUNCTIONS - Template Rendering
// ============================================

/**
 * Replace template placeholders with actual values
 * Mirrors Bubble's "find & replace" workflow steps
 *
 * @param template - String with [placeholder] syntax
 * @param context - Values to substitute
 * @returns String with placeholders replaced
 */
export function renderTemplate(template: string, context: TemplateContext): string {
  if (!template) return '';

  let result = template;

  // Replace host name placeholders
  if (context.hostName) {
    result = result.replace(/\[Host name\]/gi, context.hostName);
    result = result.replace(/\[Host Name\]/gi, context.hostName);
  }

  // Replace guest name placeholders
  if (context.guestName) {
    result = result.replace(/\[Guest name\]/gi, context.guestName);
    result = result.replace(/\[Guest Name\]/gi, context.guestName);
  }

  // Replace listing name placeholders (multiple formats)
  if (context.listingName) {
    result = result.replace(/\[Listing name\]/gi, context.listingName);
    result = result.replace(/\[Listing Name\]/gi, context.listingName);
    result = result.replace(/\[proposal's Listing's Name\]/gi, context.listingName);
  }

  return result;
}

/**
 * Get the CTA name for a given proposal status and recipient role
 *
 * @param status - Proposal status string
 * @param role - 'guest' or 'host'
 * @returns CTA name or null if no CTA for this status/role
 */
export function getCTANameForStatus(
  status: string,
  role: 'guest' | 'host'
): string | null {
  const mapping = STATUS_TO_CTA[status];
  if (!mapping) {
    console.log(`[ctaHelpers] No CTA mapping for status: ${status}`);
    return null;
  }

  return mapping[role] || null;
}

/**
 * Determine visibility flags based on recipient role
 *
 * @param role - 'guest' or 'host'
 * @returns Visibility flags for message creation
 */
export function getVisibilityForRole(role: 'guest' | 'host'): {
  visibleToHost: boolean;
  visibleToGuest: boolean;
} {
  return {
    visibleToHost: role === 'host',
    visibleToGuest: role === 'guest',
  };
}

// ============================================
// DATABASE FUNCTIONS - CTA Lookup
// ============================================

/**
 * Fetch a CTA record by name from the reference table
 *
 * @param supabase - Supabase client
 * @param ctaName - The CTA name (e.g., 'view_proposal_guest')
 * @returns CTA record or null if not found
 */
export async function getCTAByName(
  supabase: SupabaseClient,
  ctaName: string
): Promise<CTARecord | null> {
  const { data, error } = await supabase
    .from('os_messaging_cta')
    .select('*')
    .eq('name', ctaName)
    .single();

  if (error) {
    console.error(`[ctaHelpers] Failed to fetch CTA '${ctaName}':`, error);
    return null;
  }

  return data as CTARecord;
}

/**
 * Fetch a CTA record by display name
 *
 * @param supabase - Supabase client
 * @param displayName - The CTA display name (e.g., 'View Proposal (Guest View)')
 * @returns CTA record or null if not found
 */
export async function getCTAByDisplay(
  supabase: SupabaseClient,
  displayName: string
): Promise<CTARecord | null> {
  const { data, error } = await supabase
    .from('os_messaging_cta')
    .select('*')
    .eq('display', displayName)
    .single();

  if (error) {
    console.error(`[ctaHelpers] Failed to fetch CTA by display '${displayName}':`, error);
    return null;
  }

  return data as CTARecord;
}

/**
 * Get CTA for a proposal status and render with context
 *
 * @param supabase - Supabase client
 * @param status - Proposal status
 * @param role - 'guest' or 'host'
 * @param context - Template context for rendering
 * @returns Rendered CTA or null if not found/configured
 */
export async function getCTAForProposalStatus(
  supabase: SupabaseClient,
  status: string,
  role: 'guest' | 'host',
  context: TemplateContext
): Promise<RenderedCTA | null> {
  // Get CTA name for this status/role
  const ctaName = getCTANameForStatus(status, role);
  if (!ctaName) {
    console.log(`[ctaHelpers] No CTA for status '${status}' role '${role}'`);
    return null;
  }

  // Fetch CTA record
  const cta = await getCTAByName(supabase, ctaName);
  if (!cta) {
    console.error(`[ctaHelpers] CTA '${ctaName}' not found in database`);
    return null;
  }

  // Check if CTA has a message template
  if (!cta.message) {
    console.warn(`[ctaHelpers] CTA '${ctaName}' has no message template`);
    // Return with empty message - caller can decide to use default or skip
  }

  // Render template with context
  const renderedMessage = renderTemplate(cta.message || '', context);

  return {
    display: cta.display,
    message: renderedMessage,
    buttonText: cta.button_text,
    visibleToGuestOnly: cta.visible_to_guest_only,
    visibleToHostOnly: cta.visible_to_host_only,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Build template context from user and listing data
 *
 * @param hostFirstName - Host's first name
 * @param guestFirstName - Guest's first name
 * @param listingName - Listing name/title
 * @returns TemplateContext object
 */
export function buildTemplateContext(
  hostFirstName?: string,
  guestFirstName?: string,
  listingName?: string
): TemplateContext {
  return {
    hostName: hostFirstName || 'Host',
    guestName: guestFirstName || 'Guest',
    listingName: listingName || 'this listing',
  };
}

/**
 * Generate a default message when CTA template is missing
 *
 * @param status - Proposal status
 * @param role - 'guest' or 'host'
 * @param context - Template context
 * @returns Default message string
 */
export function getDefaultMessage(
  status: string,
  role: 'guest' | 'host',
  context: TemplateContext
): string {
  const listingName = context.listingName || 'your listing';

  if (role === 'guest') {
    return `Your proposal for ${listingName} has been updated. Status: ${status}`;
  } else {
    const guestName = context.guestName || 'A guest';
    return `${guestName}'s proposal for ${listingName} has been updated. Status: ${status}`;
  }
}
