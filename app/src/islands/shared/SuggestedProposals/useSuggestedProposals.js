/**
 * useSuggestedProposals Hook
 *
 * State management for the suggested proposals popup.
 * Handles fetching, filtering, navigation, and user actions.
 *
 * Uses native Supabase field names - no mapping layer.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchSuggestedProposals, markProposalInterested, dismissProposal } from './suggestedProposalService.js';

/**
 * @typedef {Object} UseSuggestedProposalsOptions
 * @property {string} userId - Current user's _id
 * @property {function} [onInterested] - Callback after marking interested
 * @property {function} [onRemove] - Callback after removing/dismissing
 * @property {Array} [initialProposals] - Pre-loaded proposals (optional)
 */

/**
 * Hook for managing suggested proposals state and actions
 * @param {UseSuggestedProposalsOptions} options
 */
export function useSuggestedProposals({
  userId,
  onInterested,
  onRemove,
  initialProposals = null
}) {
  // Core state
  const [proposals, setProposals] = useState(initialProposals || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(!initialProposals);
  const [error, setError] = useState(null);

  // Filtered proposals (only non-deleted suggested ones)
  const filteredProposals = useMemo(() => {
    return proposals.filter(p => !p.Deleted && !p._dismissed);
  }, [proposals]);

  // Current proposal
  const currentProposal = filteredProposals[currentIndex] || null;
  const totalCount = filteredProposals.length;

  // Fetch proposals on mount if not provided
  useEffect(() => {
    if (initialProposals) return;
    if (!userId) return;

    let mounted = true;

    async function loadProposals() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchSuggestedProposals(userId);
        if (mounted) {
          setProposals(data);
        }
      } catch (err) {
        console.error('Failed to fetch suggested proposals:', err);
        if (mounted) {
          setError(err.message || 'Failed to load suggestions');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadProposals();

    return () => {
      mounted = false;
    };
  }, [userId, initialProposals]);

  // Reset index when proposals change
  useEffect(() => {
    if (currentIndex >= filteredProposals.length && filteredProposals.length > 0) {
      setCurrentIndex(filteredProposals.length - 1);
    }
  }, [filteredProposals.length, currentIndex]);

  // Navigation
  const goToNext = useCallback(() => {
    if (filteredProposals.length <= 1) return;
    setCurrentIndex(prev =>
      prev >= filteredProposals.length - 1 ? 0 : prev + 1
    );
  }, [filteredProposals.length]);

  const goToPrevious = useCallback(() => {
    if (filteredProposals.length <= 1) return;
    setCurrentIndex(prev =>
      prev <= 0 ? filteredProposals.length - 1 : prev - 1
    );
  }, [filteredProposals.length]);

  const goToIndex = useCallback((index) => {
    if (index >= 0 && index < filteredProposals.length) {
      setCurrentIndex(index);
    }
  }, [filteredProposals.length]);

  // Visibility
  const show = useCallback(() => setIsVisible(true), []);
  const hide = useCallback(() => setIsVisible(false), []);
  const toggle = useCallback(() => setIsVisible(prev => !prev), []);

  // Action: Mark as interested
  const handleInterested = useCallback(async () => {
    if (!currentProposal || isProcessing) return;

    setIsProcessing(true);

    try {
      await markProposalInterested(currentProposal._id);

      // Update local state - mark as no longer suggested
      setProposals(prev => prev.map(p =>
        p._id === currentProposal._id
          ? { ...p, _dismissed: true }
          : p
      ));

      // Call callback
      if (onInterested) {
        await onInterested(currentProposal);
      }

      // Auto-close if no more proposals
      if (filteredProposals.length <= 1) {
        hide();
      }
    } catch (err) {
      console.error('Failed to mark interested:', err);
      throw err; // Re-throw for caller to handle
    } finally {
      setIsProcessing(false);
    }
  }, [currentProposal, isProcessing, filteredProposals.length, onInterested, hide]);

  // Action: Remove/dismiss suggestion
  const handleRemove = useCallback(async () => {
    if (!currentProposal || isProcessing) return;

    setIsProcessing(true);

    try {
      await dismissProposal(currentProposal._id);

      // Update local state
      setProposals(prev => prev.map(p =>
        p._id === currentProposal._id
          ? { ...p, _dismissed: true }
          : p
      ));

      // Call callback
      if (onRemove) {
        await onRemove(currentProposal);
      }

      // Auto-close if no more proposals
      if (filteredProposals.length <= 1) {
        hide();
      }
    } catch (err) {
      console.error('Failed to dismiss proposal:', err);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [currentProposal, isProcessing, filteredProposals.length, onRemove, hide]);

  // Keyboard navigation
  useEffect(() => {
    if (!isVisible) return;

    function handleKeyDown(e) {
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          goToNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevious();
          break;
        case 'Escape':
          e.preventDefault();
          hide();
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, goToNext, goToPrevious, hide]);

  // Refresh proposals
  const refresh = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const data = await fetchSuggestedProposals(userId);
      setProposals(data);
      setCurrentIndex(0);
    } catch (err) {
      console.error('Failed to refresh proposals:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  return {
    // State
    proposals: filteredProposals,
    currentProposal,
    currentIndex,
    totalCount,
    isVisible,
    isProcessing,
    isLoading,
    error,

    // Navigation
    goToNext,
    goToPrevious,
    goToIndex,
    canGoNext: filteredProposals.length > 1,
    canGoPrevious: filteredProposals.length > 1,

    // Visibility
    show,
    hide,
    toggle,

    // Actions
    handleInterested,
    handleRemove,
    refresh,

    // Setters for external control
    setProposals
  };
}

export default useSuggestedProposals;
