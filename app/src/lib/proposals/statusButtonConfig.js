/**
 * Status Button Configuration System
 *
 * Fetches and caches os_proposal_status table data for dynamic button labels.
 * This replaces hardcoded button labels with database-driven configuration.
 *
 * Table: os_proposal_status
 * Columns used:
 * - name: Status key (snake_case)
 * - display: Full status text that matches proposal.Status field
 * - guest_action_1: Button label for Guest Action 1
 * - guest_action_2: Button label for Guest Action 2
 * - sort_order: Workflow progression order (used for visibility logic)
 */

import { supabase } from '../supabase.js';

// In-memory cache for status configurations
let statusConfigCache = null;
let statusConfigByDisplayCache = null;
let fetchPromise = null;

/**
 * Fetch all status configurations from os_proposal_status table
 * Caches the result in memory for subsequent lookups
 *
 * @returns {Promise<Array>} Array of status configuration objects
 */
export async function fetchStatusConfigurations() {
  // Return cached data if available
  if (statusConfigCache) {
    return statusConfigCache;
  }

  // If a fetch is already in progress, wait for it
  if (fetchPromise) {
    return fetchPromise;
  }

  // Start new fetch
  fetchPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('os_proposal_status')
        .select(`
          id,
          name,
          display,
          displayed_on_screen,
          guest_action_1,
          guest_action_2,
          host_action_1,
          host_action_2,
          sort_order
        `)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('fetchStatusConfigurations: Error fetching status config:', error);
        throw error;
      }

      // Cache the data
      statusConfigCache = data || [];

      // Also create a lookup map by display value (matches proposal.Status)
      statusConfigByDisplayCache = new Map(
        (data || []).map(config => [config.display, config])
      );

      console.log(`fetchStatusConfigurations: Cached ${statusConfigCache.length} status configurations`);
      return statusConfigCache;
    } catch (err) {
      console.error('fetchStatusConfigurations: Failed to fetch status configurations:', err);
      // Return empty array on error (no fallback)
      return [];
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

/**
 * Get status configuration by the display value (matches proposal.Status)
 *
 * @param {string} statusDisplay - The status display text from proposal.Status
 * @returns {Object|null} Status configuration or null if not found
 */
export function getStatusConfigByDisplay(statusDisplay) {
  if (!statusConfigByDisplayCache) {
    console.warn('getStatusConfigByDisplay: Cache not initialized. Call fetchStatusConfigurations first.');
    return null;
  }

  if (!statusDisplay) {
    return null;
  }

  // Normalize status (trim whitespace from Bubble data)
  const normalizedStatus = typeof statusDisplay === 'string' ? statusDisplay.trim() : statusDisplay;
  return statusConfigByDisplayCache.get(normalizedStatus) || null;
}

/**
 * Get Guest Action 1 button label for a status
 *
 * @param {string} statusDisplay - The status display text from proposal.Status
 * @returns {string|null} Button label or null if invisible/not found
 */
export function getGuestAction1Label(statusDisplay) {
  const config = getStatusConfigByDisplay(statusDisplay);
  if (!config) return null;

  const label = config.guest_action_1;
  if (!label || label === 'Invisible') return null;

  return label;
}

/**
 * Get Guest Action 2 button label for a status
 *
 * @param {string} statusDisplay - The status display text from proposal.Status
 * @returns {string|null} Button label or null if invisible/not found
 */
export function getGuestAction2Label(statusDisplay) {
  const config = getStatusConfigByDisplay(statusDisplay);
  if (!config) return null;

  const label = config.guest_action_2;
  if (!label || label === 'Invisible') return null;

  return label;
}

/**
 * Get sort order (usual order) for a status
 * Used for visibility logic (e.g., show house manual when order > 5)
 *
 * @param {string} statusDisplay - The status display text from proposal.Status
 * @returns {number} Sort order, or -99 if not found
 */
export function getStatusSortOrder(statusDisplay) {
  const config = getStatusConfigByDisplay(statusDisplay);
  if (!config) return -99;

  return config.sort_order ?? -99;
}

/**
 * Check if a status is a terminal/cancelled state
 * Terminal states have sort_order = -1
 *
 * @param {string} statusDisplay - The status display text from proposal.Status
 * @returns {boolean} True if terminal state
 */
export function isTerminalStatusFromConfig(statusDisplay) {
  const sortOrder = getStatusSortOrder(statusDisplay);
  return sortOrder === -1;
}

/**
 * Check if a status is a suggested proposal (created by Split Lease)
 *
 * @param {string} statusDisplay - The status display text from proposal.Status
 * @returns {boolean} True if suggested by Split Lease
 */
export function isSuggestedProposalFromConfig(statusDisplay) {
  if (!statusDisplay) return false;
  const normalized = typeof statusDisplay === 'string' ? statusDisplay.trim() : statusDisplay;
  return normalized.includes('Submitted for guest by Split Lease');
}

/**
 * Check if Virtual Meeting button should be hidden for a status
 * Hidden for: rejected, cancelled, activated, and SL-suggested awaiting statuses
 *
 * @param {string} statusDisplay - The status display text from proposal.Status
 * @returns {boolean} True if VM button should be hidden
 */
export function shouldHideVirtualMeetingButton(statusDisplay) {
  if (!statusDisplay) return true;

  const normalized = typeof statusDisplay === 'string' ? statusDisplay.trim() : statusDisplay;

  // Hidden for rejected/cancelled/activated statuses
  const hiddenStatuses = [
    'Proposal Rejected by Host',
    'Proposal Cancelled by Split Lease',
    'Initial Payment Submitted / Lease activated',
    'Proposal Submitted for guest by Split Lease - Awaiting Rental Application',
    'Proposal Submitted for guest by Split Lease - Pending Confirmation'
  ];

  return hiddenStatuses.includes(normalized);
}

/**
 * Get all button configuration for a proposal
 * Combines status config with proposal-specific overrides
 *
 * @param {Object} proposal - The proposal object
 * @returns {Object} Button configuration object
 */
export function getButtonConfigForProposal(proposal) {
  if (!proposal) {
    return {
      guestAction1: { visible: false, label: null, action: null },
      guestAction2: { visible: false, label: null, action: null },
      cancelButton: { visible: false, label: 'Cancel Proposal', action: null },
      vmButton: { visible: false, label: 'Request Virtual Meeting', action: null }
    };
  }

  const status = proposal.Status;
  const config = getStatusConfigByDisplay(status);
  const sortOrder = config?.sort_order ?? -99;

  // Extract proposal-specific data
  const remindersByGuest = proposal['remindersByGuest (number)'] || 0;
  const guestDocsFinalized = proposal['guest documents review finalized?'] === true;
  const idDocsSubmitted = proposal.guest?.['ID documents submitted?'] === true;
  const hasHouseManual = proposal.listing?.hasHouseManual === true;
  const isCounteroffer = status === 'Host Counteroffer Submitted / Awaiting Guest Review';
  const isTerminal = sortOrder === -1;
  const isRejectedByHost = status === 'Proposal Rejected by Host';
  const isSLSuggested = isSuggestedProposalFromConfig(status);
  const isLeaseDocsReview = status === 'Lease Documents Sent for Review';

  // === Guest Action 1 Button ===
  let guestAction1 = { visible: false, label: null, action: null, style: null };
  const action1Label = getGuestAction1Label(status);

  if (action1Label) {
    guestAction1.visible = true;
    guestAction1.label = action1Label;

    // Special handling: Hide "Remind Split Lease" after 3 reminders
    if (action1Label === 'Remind Split Lease' && remindersByGuest >= 3) {
      guestAction1.visible = false;
    }

    // Special handling: Hide "Review Documents" when docs finalized
    if (action1Label === 'Review Documents' && guestDocsFinalized && isLeaseDocsReview) {
      guestAction1.visible = false;
    }

    // Special handling: "Delete Proposal" has red background for rejected
    if (action1Label === 'Delete Proposal' && isRejectedByHost) {
      guestAction1.style = { backgroundColor: '#EF4444', color: 'white' };
    }

    // Determine action type
    switch (action1Label) {
      case 'Interested':
        guestAction1.action = 'confirm_interest';
        break;
      case 'Submit Rental App':
        guestAction1.action = 'submit_rental_app';
        break;
      case 'Modify Proposal':
        guestAction1.action = 'modify_proposal';
        break;
      case 'Accept Host Terms':
        guestAction1.action = 'accept_counteroffer';
        break;
      case 'Remind Split Lease':
        guestAction1.action = 'remind_sl';
        break;
      case 'Review Documents':
        guestAction1.action = 'review_documents';
        break;
      case 'Resend Lease Docs':
        guestAction1.action = 'resend_lease_docs';
        break;
      case 'Submit Initial Payment':
        guestAction1.action = 'submit_payment';
        break;
      case 'Go to Leases':
        guestAction1.action = 'go_to_leases';
        break;
      case 'Delete Proposal':
        guestAction1.action = 'delete_proposal';
        break;
      default:
        guestAction1.action = null;
    }
  }

  // === Guest Action 2 Button ===
  let guestAction2 = { visible: false, label: null, action: null, style: null };
  const action2Label = getGuestAction2Label(status);

  if (action2Label) {
    guestAction2.visible = true;
    guestAction2.label = action2Label;

    // Special handling: Hide "Verify Your Identity" when ID docs already submitted
    if (action2Label === 'Verify Your Identity' && idDocsSubmitted && isLeaseDocsReview) {
      guestAction2.visible = false;
    }

    // Determine action type
    switch (action2Label) {
      case 'Not Interested':
        guestAction2.action = 'reject_suggestion';
        break;
      case 'Review Host Terms':
        guestAction2.action = 'review_counteroffer';
        break;
      case 'See Details':
        guestAction2.action = 'see_details';
        break;
      case 'Verify Your Identity':
        guestAction2.action = 'verify_identity';
        break;
      default:
        guestAction2.action = null;
    }
  }

  // === Cancel/Delete Button ===
  let cancelButton = { visible: false, label: 'Cancel Proposal', action: 'cancel_proposal', style: null, disabled: false };

  // Check for lease-activated status (completed flow - no cancel button)
  const isLeaseActivated = status === 'Initial Payment Submitted / Lease activated';

  // Determine cancel button visibility and label based on Bubble conditionals
  if (isTerminal) {
    // Terminal states show "Delete Proposal"
    cancelButton.visible = true;
    cancelButton.label = 'Delete Proposal';
    cancelButton.action = 'delete_proposal';
  } else if (isLeaseActivated) {
    // Lease activated: Cancel button is HIDDEN (lease is complete, only "Go to Leases" shows)
    cancelButton.visible = false;
  } else if (sortOrder > 5 && hasHouseManual) {
    // After lease docs stage with house manual: Show "See House Manual" (purple, non-clickable)
    cancelButton.visible = true;
    cancelButton.label = 'See House Manual';
    cancelButton.action = 'see_house_manual';
    cancelButton.style = { backgroundColor: '#6D31C2', color: 'white' };
    cancelButton.disabled = true;
  } else if (isCounteroffer) {
    // Counteroffer status: "Reject Modified Terms"
    cancelButton.visible = true;
    cancelButton.label = 'Reject Modified Terms';
    cancelButton.action = 'reject_counteroffer';
  } else if (isSLSuggested) {
    // SL-suggested proposals: "Reject Proposal"
    cancelButton.visible = true;
    cancelButton.label = 'Reject Proposal';
    cancelButton.action = 'reject_proposal';
  } else if (sortOrder > 5) {
    // After lease docs stage (no house manual): Show cancel with visibility based on sort_order
    cancelButton.visible = true;
    cancelButton.label = 'Cancel Proposal';
    cancelButton.action = 'cancel_proposal';
  } else if (sortOrder >= 0 && sortOrder <= 5) {
    // Active proposal stages: Show "Cancel Proposal"
    cancelButton.visible = true;
    cancelButton.label = 'Cancel Proposal';
    cancelButton.action = 'cancel_proposal';
  }

  // === Virtual Meeting Button ===
  let vmButton = { visible: false, label: 'Request Virtual Meeting', action: 'request_vm', style: null, disabled: false };

  // VM button hidden for certain statuses
  if (!shouldHideVirtualMeetingButton(status) && !isTerminal) {
    vmButton.visible = true;

    // The actual VM state (requested, accepted, etc.) is determined in ProposalCard
    // This just handles status-based visibility
  }

  return {
    guestAction1,
    guestAction2,
    cancelButton,
    vmButton,
    sortOrder,
    isTerminal,
    isCounteroffer,
    isSLSuggested
  };
}

/**
 * Clear the status configuration cache
 * Useful for testing or when data needs to be refreshed
 */
export function clearStatusConfigCache() {
  statusConfigCache = null;
  statusConfigByDisplayCache = null;
  fetchPromise = null;
  console.log('clearStatusConfigCache: Cache cleared');
}

/**
 * Check if the cache is initialized
 * @returns {boolean} True if cache is ready
 */
export function isStatusConfigCacheReady() {
  return statusConfigCache !== null && statusConfigByDisplayCache !== null;
}
