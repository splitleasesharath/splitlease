import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase.js';

/**
 * QuickMatchPage Logic Hook
 *
 * Orchestrates all business logic for the QuickMatchPage component following the
 * "Hollow Component" pattern. This hook manages React state and effects while
 * delegating all business logic to the quick-match Edge Function.
 *
 * @intent Provide pre-calculated data and handlers to QuickMatchPage component.
 * @pattern Logic Hook (orchestration layer between Component and Edge Function).
 *
 * Architecture:
 * - React state management (hooks, effects)
 * - Calls quick-match Edge Function for proposal/candidate operations
 * - Infrastructure layer (Supabase Edge Functions)
 * - Returns pre-processed data to component
 */
export function useQuickMatchPageLogic() {
  // ============================================================================
  // State Management
  // ============================================================================

  // Proposal State
  const [proposalId, setProposalId] = useState(null);
  const [proposal, setProposal] = useState(null);

  // Candidates State
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // Filter State
  const [filters, setFilters] = useState({
    borough: '',
    maxPrice: null,
    minScore: 0
  });

  // Loading States
  const [isLoadingProposal, setIsLoadingProposal] = useState(false);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Error State
  const [error, setError] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Success State
  const [matchSaved, setMatchSaved] = useState(false);

  // ============================================================================
  // Edge Function Helper
  // ============================================================================

  /**
   * Call the quick-match Edge Function
   */
  const callQuickMatchFunction = useCallback(async (action, payload) => {
    const { data, error } = await supabase.functions.invoke('quick-match', {
      body: { action, payload }
    });

    if (error) {
      console.error('[useQuickMatchPageLogic] Edge Function error:', error);
      throw new Error(error.message || 'Edge Function call failed');
    }

    return data;
  }, []);

  // ============================================================================
  // Effects
  // ============================================================================

  /**
   * Get proposal_id from URL on mount
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('proposal_id');
    if (id) {
      setProposalId(id);
    }
  }, []);

  /**
   * Fetch proposal when proposalId changes
   */
  useEffect(() => {
    if (proposalId) {
      fetchProposal(proposalId);
    }
  }, [proposalId]);

  // ============================================================================
  // API Calls
  // ============================================================================

  /**
   * Fetch proposal details from Edge Function
   */
  const fetchProposal = useCallback(async (id) => {
    setIsLoadingProposal(true);
    setError(null);

    try {
      const response = await callQuickMatchFunction('get_proposal', {
        proposal_id: id
      });

      if (response.proposal) {
        setProposal(response.proposal);
      } else {
        throw new Error('No proposal data returned');
      }
    } catch (err) {
      console.error('[useQuickMatchPageLogic] fetchProposal error:', err);
      setError(`Failed to load proposal: ${err.message}`);
    } finally {
      setIsLoadingProposal(false);
    }
  }, [callQuickMatchFunction]);

  /**
   * Search for candidate listings
   */
  const searchCandidates = useCallback(async () => {
    if (!proposalId) {
      setError('No proposal selected. Add proposal_id to the URL.');
      return;
    }

    setIsLoadingCandidates(true);
    setError(null);

    try {
      const response = await callQuickMatchFunction('search_candidates', {
        proposal_id: proposalId,
        filters: {
          borough: filters.borough || undefined,
          max_price: filters.maxPrice || undefined,
          min_score: filters.minScore || undefined
        },
        limit: 20
      });

      if (response.candidates) {
        setCandidates(response.candidates);
      } else {
        setCandidates([]);
      }
    } catch (err) {
      console.error('[useQuickMatchPageLogic] searchCandidates error:', err);
      setError(`Failed to search candidates: ${err.message}`);
    } finally {
      setIsLoadingCandidates(false);
    }
  }, [proposalId, filters, callQuickMatchFunction]);

  /**
   * Save the selected match choice
   */
  const saveChoice = useCallback(async (reason) => {
    if (!selectedCandidate || !proposalId) {
      setError('No candidate selected');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await callQuickMatchFunction('save_choice', {
        proposal_id: proposalId,
        matched_listing_id: selectedCandidate.listing.id,
        match_score: selectedCandidate.score,
        match_reason: reason || null
      });

      // Success - close modal and show confirmation
      setIsModalOpen(false);
      setMatchSaved(true);

      // Clear selected candidate
      setSelectedCandidate(null);
    } catch (err) {
      console.error('[useQuickMatchPageLogic] saveChoice error:', err);
      setError(`Failed to save match: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [proposalId, selectedCandidate, callQuickMatchFunction]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Update a filter value
   */
  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  /**
   * Apply filters and search
   */
  const handleApplyFilters = useCallback(() => {
    searchCandidates();
  }, [searchCandidates]);

  /**
   * Reset filters to defaults
   */
  const handleResetFilters = useCallback(() => {
    setFilters({
      borough: '',
      maxPrice: null,
      minScore: 0
    });
  }, []);

  /**
   * Select a candidate and open modal
   */
  const handleSelectCandidate = useCallback((candidate) => {
    setSelectedCandidate(candidate);
    setIsModalOpen(true);
  }, []);

  /**
   * Close the selection modal
   */
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedCandidate(null);
  }, []);

  /**
   * Confirm the match choice
   */
  const handleConfirmChoice = useCallback((notesOrReason) => {
    // Handle both { notes } object format and plain string
    const reason = typeof notesOrReason === 'object' ? notesOrReason.notes : notesOrReason;
    saveChoice(reason);
  }, [saveChoice]);

  /**
   * Reset the entire page state
   */
  const handleReset = useCallback(() => {
    setProposal(null);
    setCandidates([]);
    setSelectedCandidate(null);
    setFilters({ borough: '', maxPrice: null, minScore: 0 });
    setError(null);
    setMatchSaved(false);
    setIsModalOpen(false);
  }, []);

  /**
   * Dismiss success message
   */
  const handleDismissSuccess = useCallback(() => {
    setMatchSaved(false);
  }, []);

  // ============================================================================
  // Return Pre-Calculated State and Handlers
  // ============================================================================

  return {
    // Proposal Data
    proposalId,
    proposal,

    // Candidates Data
    candidates,
    selectedCandidate,

    // Filters
    filters,

    // Loading States
    isLoadingProposal,
    isLoadingCandidates,
    isSubmitting,

    // Error State
    error,

    // Modal State
    isModalOpen,

    // Success State
    matchSaved,

    // Filter Handlers
    handleFilterChange,
    handleApplyFilters,
    handleResetFilters,

    // Candidate Handlers
    handleSelectCandidate,
    handleCloseModal,
    handleConfirmChoice,

    // Search Handler
    searchCandidates,

    // Reset Handlers
    handleReset,
    handleDismissSuccess
  };
}
