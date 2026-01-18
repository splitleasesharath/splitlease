/**
 * CTA Configuration
 *
 * Maps CTA types to their routing destinations.
 * Routes are defined in code (not database) for simplicity and type safety.
 *
 * The database table `reference_table.os_messaging_cta` stores:
 * - Display text, button text, messages
 * - Visibility flags (guest_only, host_only)
 *
 * This file stores:
 * - Action types (navigate, modal, external)
 * - Destination URLs/modal names
 */

import { supabase } from './supabase.js';

// ============================================================================
// CTA ROUTES MAPPING
// Maps CTA name (from database) to action configuration
// ============================================================================

export const CTA_ROUTES = {
  // --- Rental Application ---
  'fill_out_rental_application': {
    actionType: 'navigate',
    destination: '/account-profile?section=rental-application&openRentalApp=true'
  },

  // --- Proposal CTAs (Guest) ---
  'view_proposal_guest': {
    actionType: 'navigate',
    destination: '/guest-proposals?proposalId={{proposal_id}}'
  },
  'host_accepted_proposal_guest_view': {
    actionType: 'navigate',
    destination: '/guest-proposals?proposalId={{proposal_id}}'
  },
  'respond_to_counter_offer': {
    actionType: 'navigate',
    destination: '/guest-proposals?proposalId={{proposal_id}}&respondCounter=true'
  },

  // --- Proposal CTAs (Host) ---
  'view_proposal_host': {
    actionType: 'navigate',
    destination: '/host-proposals?proposalId={{proposal_id}}'
  },
  'view_rental_application': {
    actionType: 'navigate',
    destination: '/host-proposals?proposalId={{proposal_id}}&showApplication=true'
  },
  'host_accepted_proposal_host_view': {
    actionType: 'navigate',
    destination: '/host-proposals?proposalId={{proposal_id}}'
  },

  // --- Document Review ---
  'review_documents_guest': {
    actionType: 'navigate',
    destination: '/documents-review?proposalId={{proposal_id}}'
  },
  'review_documents_host': {
    actionType: 'navigate',
    destination: '/documents-review?proposalId={{proposal_id}}'
  },

  // --- Lease Signing ---
  'sign_lease_documents_guest': {
    actionType: 'navigate',
    destination: '/sign-lease?proposalId={{proposal_id}}'
  },
  'sign_lease_documents_host': {
    actionType: 'navigate',
    destination: '/sign-lease?proposalId={{proposal_id}}'
  },
  'lease_docs_signed_guest_view': {
    actionType: 'navigate',
    destination: '/guest-proposals?proposalId={{proposal_id}}&showPayment=true'
  },
  'lease_docs_signed_host_view': {
    actionType: 'navigate',
    destination: '/host-proposals?proposalId={{proposal_id}}'
  },

  // --- Active Lease CTAs ---
  'lease_activated_guest_view': {
    actionType: 'navigate',
    destination: '/guest-leases?leaseId={{lease_id}}'
  },
  'lease_activated_host_view': {
    actionType: 'navigate',
    destination: '/host-leases?leaseId={{lease_id}}'
  },

  // --- Virtual Meeting (Modal) ---
  'view_virtual_meeting_guest': {
    actionType: 'modal',
    destination: 'VirtualMeetingModal'
  },
  'see_virtual_meeting_host': {
    actionType: 'modal',
    destination: 'VirtualMeetingModal'
  },

  // --- Date Change Request (Modal) ---
  'see_date_change_request': {
    actionType: 'modal',
    destination: 'DateChangeRequestModal'
  },
  'accept_date_change_request': {
    actionType: 'modal',
    destination: 'DateChangeRequestModal'
  },
  'decline_date_change_request': {
    actionType: 'modal',
    destination: 'DateChangeRequestModal'
  },

  // --- House Manual ---
  'see_house_manual_guest': {
    actionType: 'navigate',
    destination: '/house-manual?leaseId={{lease_id}}'
  },
  'see_visit_guest_1': {
    actionType: 'navigate',
    destination: '/house-manual?leaseId={{lease_id}}'
  },
  'see_visit_guest_2': {
    actionType: 'navigate',
    destination: '/house-manual?leaseId={{lease_id}}'
  },
  'see_visit_guest_3': {
    actionType: 'navigate',
    destination: '/house-manual?leaseId={{lease_id}}'
  },

  // --- Reviews ---
  'fill_out_review_guest': {
    actionType: 'navigate',
    destination: '/guest-leases?leaseId={{lease_id}}&showReview=true'
  },
  'fill_out_review_host': {
    actionType: 'navigate',
    destination: '/host-leases?leaseId={{lease_id}}&showReview=true'
  },
  'see_review_guest': {
    actionType: 'navigate',
    destination: '/guest-leases?leaseId={{lease_id}}&viewReview=true'
  },
  'see_review_host': {
    actionType: 'navigate',
    destination: '/host-leases?leaseId={{lease_id}}&viewReview=true'
  },

  // --- Split Lease Agent (External - Crisp Chat) ---
  'message_split_lease_agent_guest': {
    actionType: 'external',
    destination: 'crisp_chat'
  },
  'message_split_lease_agent_host': {
    actionType: 'external',
    destination: 'crisp_chat'
  },

  // --- No Action CTAs (acknowledgments, info only) ---
  'acknowledge_reminder_host': {
    actionType: 'none',
    destination: null
  },
  'acknowledge_reminder_guest': {
    actionType: 'none',
    destination: null
  },
  'see_message': {
    actionType: 'none',
    destination: null
  },
  'see_house_manual_host': {
    actionType: 'none',
    destination: null
  }
};

// ============================================================================
// CTA CONFIG CACHE
// Fetches display/visibility config from database, merges with routes
// ============================================================================

let ctaConfigCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch CTA display configuration from Supabase and merge with routes
 * @returns {Promise<Map<string, object>>} Map of CTA display name to full config
 */
export async function fetchCTAConfig() {
  // Return cached if still valid
  if (ctaConfigCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_TTL)) {
    return ctaConfigCache;
  }

  try {
    const { data, error } = await supabase
      .schema('reference_table')
      .from('os_messaging_cta')
      .select('*');

    if (error) {
      console.error('[ctaConfig] Failed to fetch CTA config:', error);
      return new Map();
    }

    // Build map keyed by both display name and internal name
    const configMap = new Map();

    for (const cta of data) {
      // Merge database config with route config
      const routeConfig = CTA_ROUTES[cta.name] || { actionType: 'none', destination: null };

      const fullConfig = {
        ...cta,
        ...routeConfig
      };

      // Map by display name (what comes from messages)
      configMap.set(cta.display, fullConfig);
      // Also map by internal name for flexibility
      configMap.set(cta.name, fullConfig);
    }

    ctaConfigCache = configMap;
    cacheTimestamp = Date.now();

    return configMap;
  } catch (err) {
    console.error('[ctaConfig] Error fetching CTA config:', err);
    return new Map();
  }
}

/**
 * Get CTA config by display name or internal name
 * @param {string} ctaType - CTA display name or internal name
 * @returns {Promise<object|null>}
 */
export async function getCTAConfig(ctaType) {
  const config = await fetchCTAConfig();
  return config.get(ctaType) || null;
}

/**
 * Build destination URL by replacing template variables
 * @param {string} template - URL template with {{variables}}
 * @param {object} context - Variable values (proposal_id, listing_id, lease_id, etc.)
 * @returns {string|null} Resolved URL or null if template is empty
 */
export function buildCTADestination(template, context) {
  if (!template) return null;

  let url = template;
  for (const [key, value] of Object.entries(context)) {
    if (value) {
      url = url.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
  }

  // Clean up any remaining unreplaced template variables
  url = url.replace(/\{\{[^}]+\}\}/g, '');

  // Clean up empty query params that might result
  url = url.replace(/[?&][^=]+=(?=&|$)/g, '');
  url = url.replace(/\?$/, '');

  return url;
}

/**
 * Clear the CTA config cache (useful for testing)
 */
export function clearCTAConfigCache() {
  ctaConfigCache = null;
  cacheTimestamp = null;
}
