/**
 * useCTAHandler Hook
 *
 * Handles CTA button clicks with role-based routing.
 * Determines user role from thread context and routes to appropriate destination.
 *
 * Action Types:
 * - navigate: Redirect to a page URL
 * - modal: Open a modal component (returns modal info for parent to handle)
 * - external: Trigger external service (e.g., Crisp chat)
 * - none: No action (informational CTAs)
 */

import { useState, useCallback, useEffect } from 'react';
import { fetchCTAConfig, buildCTADestination } from '../../../lib/ctaConfig.js';

/**
 * @param {object} options
 * @param {object} options.user - Current user object with bubbleId
 * @param {object} options.selectedThread - Currently selected thread with -Host User, -Guest User
 * @param {object} options.threadInfo - Thread info from getMessages (has proposal_id, listing_id)
 * @param {function} options.onOpenModal - Callback to open a modal (modalName, context) => void
 */
export function useCTAHandler({ user, selectedThread, threadInfo, onOpenModal }) {
  const [ctaConfig, setCtaConfig] = useState(new Map());
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  // Load CTA config on mount
  useEffect(() => {
    async function loadConfig() {
      try {
        const config = await fetchCTAConfig();
        setCtaConfig(config);
      } catch (err) {
        console.error('[useCTAHandler] Failed to load CTA config:', err);
      } finally {
        setIsLoadingConfig(false);
      }
    }
    loadConfig();
  }, []);

  /**
   * Determine if current user is the host in this thread
   */
  const isUserHost = useCallback(() => {
    if (!selectedThread || !user?.bubbleId) return false;
    return selectedThread['-Host User'] === user.bubbleId;
  }, [selectedThread, user?.bubbleId]);

  /**
   * Get the user's role in the current thread
   */
  const getUserRole = useCallback(() => {
    return isUserHost() ? 'host' : 'guest';
  }, [isUserHost]);

  /**
   * Handle external actions (Crisp chat, etc.)
   */
  const handleExternalAction = useCallback((action) => {
    switch (action) {
      case 'crisp_chat':
        if (window.$crisp) {
          window.$crisp.push(['do', 'chat:open']);
        } else {
          console.warn('[useCTAHandler] Crisp chat not available');
        }
        break;
      default:
        console.warn('[useCTAHandler] Unknown external action:', action);
    }
  }, []);

  /**
   * Handle CTA button click
   * @param {string} ctaDisplay - The CTA display name (from message.call_to_action.type)
   * @param {object} messageContext - Additional context from the message (date_change_request_id, etc.)
   * @returns {object|undefined} Modal info if action is 'modal', undefined otherwise
   */
  const handleCTAClick = useCallback((ctaDisplay, messageContext = {}) => {
    if (!ctaDisplay) {
      console.warn('[useCTAHandler] No CTA type provided');
      return;
    }

    const config = ctaConfig.get(ctaDisplay);
    if (!config) {
      console.warn('[useCTAHandler] Unknown CTA type:', ctaDisplay);
      return;
    }

    const { actionType, destination } = config;

    if (!actionType || actionType === 'none' || !destination) {
      // No action for this CTA
      return;
    }

    // Build context for URL interpolation
    const context = {
      proposal_id: messageContext.proposalId || threadInfo?.proposal_id,
      listing_id: messageContext.listingId || threadInfo?.listing_id,
      lease_id: messageContext.leaseId || threadInfo?.lease_id,
      date_change_request_id: messageContext.dateChangeRequestId,
      ...messageContext,
    };

    switch (actionType) {
      case 'navigate': {
        const url = buildCTADestination(destination, context);
        if (url) {
          window.location.href = url;
        }
        break;
      }

      case 'modal': {
        if (onOpenModal) {
          onOpenModal(destination, context);
        }
        // Return modal info for cases where caller needs it
        return { modal: destination, context };
      }

      case 'external': {
        handleExternalAction(destination);
        break;
      }

      default:
        console.warn('[useCTAHandler] Unknown action type:', actionType);
    }
  }, [ctaConfig, threadInfo, onOpenModal, handleExternalAction]);

  /**
   * Get button configuration for a CTA
   * Returns text, visibility, disabled state based on CTA config and user role
   *
   * @param {string} ctaDisplay - The CTA display name
   * @returns {object} { text, hidden, disabled, actionType }
   */
  const getCTAButtonConfig = useCallback((ctaDisplay) => {
    if (!ctaDisplay) {
      return { text: 'View Details', hidden: false, disabled: false };
    }

    const config = ctaConfig.get(ctaDisplay);
    if (!config) {
      // Unknown CTA - show generic button
      return { text: 'View Details', hidden: false, disabled: false };
    }

    const userRole = getUserRole();

    // Check visibility based on user role
    if (config.visible_to_guest_only && userRole !== 'guest') {
      return { hidden: true };
    }
    if (config.visible_to_host_only && userRole !== 'host') {
      return { hidden: true };
    }

    // Check if button has no action
    if (!config.button_text) {
      return { hidden: true };
    }

    // Check if CTA has no action type (informational only)
    const hasAction = config.actionType && config.actionType !== 'none' && config.destination;

    return {
      text: config.button_text,
      hidden: false,
      disabled: !hasAction,
      actionType: config.actionType,
    };
  }, [ctaConfig, getUserRole]);

  return {
    handleCTAClick,
    getCTAButtonConfig,
    isLoadingConfig,
    isUserHost,
    getUserRole,
  };
}
