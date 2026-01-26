/**
 * useExperienceResponsesPageLogic - All business logic for ExperienceResponsesPage
 *
 * This hook follows the Hollow Component pattern - ALL logic lives here,
 * the page component is purely presentational.
 *
 * State Management:
 * - responses: Raw response data from Supabase
 * - filteredResponses: Filtered view based on search/type
 * - selectedId: Currently selected response ID
 * - filters: { name: string, types: string[] }
 *
 * Data Source:
 * - Supabase table: experiencesurvey
 * - Column names use Bubble convention with spaces (e.g., "Created Date")
 *
 * @returns {Object} All state and handlers for the page
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { checkAuthStatus } from '../../../lib/auth';
import { supabase } from '../../../lib/supabase';

/**
 * Adapt response data from Supabase (Bubble column names) to frontend model
 * Bubble columns have spaces; we map them to camelCase properties
 *
 * @param {Object} rawResponse - Raw response from Supabase
 * @returns {Object} Adapted response object
 */
function adaptResponse(rawResponse) {
  return {
    id: rawResponse._id,
    name: rawResponse['Name'] || null,
    type: rawResponse['Type'] || null, // 'Guest' | 'Host'
    date: rawResponse['Created Date'] || null,
    experience: rawResponse['Experience'] || null,
    challenge: rawResponse['Challenge'] || null,
    challengeExperience: rawResponse['Challenge Experience'] || null,
    change: rawResponse['Change'] || null,
    service: rawResponse['Service'] || null,
    additionalService: rawResponse['Additional Service'] || null,
    share: rawResponse['Share'] === true || rawResponse['Share'] === 'Yes',
    recommend: rawResponse['Recommend'] ?? null, // NPS score 0-10
    staff: rawResponse['Split Lease Staff'] || null,
    questions: rawResponse['Questions'] || null,
  };
}

export function useExperienceResponsesPageLogic() {
  // ===== AUTH STATE =====
  const [authState, setAuthState] = useState('checking'); // 'checking' | 'authorized' | 'unauthorized'

  // ===== DATA STATE =====
  const [responses, setResponses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // ===== FILTER STATE =====
  const [filters, setFilters] = useState({
    name: '',
    types: ['Guest', 'Host'], // Both selected by default
  });

  // ===== SELECTION STATE =====
  const [selectedId, setSelectedId] = useState(null);

  // ===== AUTH CHECK =====
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { user, session } = await checkAuthStatus();

        if (!user || !session) {
          setAuthState('unauthorized');
          toast.error('Authentication required');
          window.location.href =
            '/?auth=login&redirect=' + encodeURIComponent(window.location.pathname);
          return;
        }

        // Admin check will be done server-side via RLS policies
        // For now, assume authorized if authenticated
        setAuthState('authorized');
      } catch (err) {
        console.error('[ExperienceResponses] Auth check failed:', err);
        setAuthState('unauthorized');
        toast.error('Authentication failed');
      }
    };

    checkAuth();
  }, []);

  // ===== FETCH RESPONSES =====
  const fetchResponses = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Query experiencesurvey table with Bubble column names
      const { data, error: fetchError } = await supabase
        .from('experiencesurvey')
        .select(
          `
          "_id",
          "Name",
          "Type",
          "Created Date",
          "Experience",
          "Challenge",
          "Challenge Experience",
          "Change",
          "Service",
          "Additional Service",
          "Share",
          "Recommend",
          "Split Lease Staff",
          "Questions"
        `
        )
        .order('Created Date', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      const adaptedResponses = (data || []).map(adaptResponse);
      setResponses(adaptedResponses);

      // Auto-select first response if available
      if (adaptedResponses.length > 0 && !selectedId) {
        setSelectedId(adaptedResponses[0].id);
      }
    } catch (err) {
      console.error('[ExperienceResponses] Fetch error:', err);
      setError(err.message || 'Failed to load responses');
      toast.error('Failed to load responses');
    } finally {
      setIsLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    if (authState === 'authorized') {
      fetchResponses();
    }
  }, [authState, fetchResponses]);

  // ===== FILTERING =====
  const hasActiveFilters = useMemo(() => {
    const hasNameFilter = filters.name.trim() !== '';
    const hasTypeFilter = filters.types.length < 2; // Not all types selected
    return hasNameFilter || hasTypeFilter;
  }, [filters]);

  const filteredResponses = useMemo(() => {
    return responses.filter((response) => {
      // Name filter (case-insensitive partial match)
      const matchesName =
        filters.name === '' ||
        (response.name &&
          response.name.toLowerCase().includes(filters.name.toLowerCase()));

      // Type filter
      const matchesType =
        filters.types.length === 0 || filters.types.includes(response.type);

      return matchesName && matchesType;
    });
  }, [responses, filters]);

  // Update selection when filtered results change
  useEffect(() => {
    if (filteredResponses.length > 0) {
      // If current selection is not in filtered results, select first
      const isSelectedInResults = filteredResponses.some((r) => r.id === selectedId);
      if (!isSelectedInResults) {
        setSelectedId(filteredResponses[0].id);
      }
    } else {
      setSelectedId(null);
    }
  }, [filteredResponses, selectedId]);

  // ===== HANDLERS =====
  const handleSearchChange = useCallback((value) => {
    setFilters((prev) => ({ ...prev, name: value }));
  }, []);

  const handleTypeToggle = useCallback((type) => {
    setFilters((prev) => {
      const types = prev.types.includes(type)
        ? prev.types.filter((t) => t !== type)
        : [...prev.types, type];
      return { ...prev, types };
    });
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      name: '',
      types: ['Guest', 'Host'],
    });
  }, []);

  const handleSelectResponse = useCallback((id) => {
    setSelectedId(id);
  }, []);

  const handleRetry = useCallback(() => {
    fetchResponses();
  }, [fetchResponses]);

  // ===== RETURN =====
  return {
    // Auth
    authState,

    // Data
    responses,
    filteredResponses,

    // Loading & Error
    isLoading,
    error,

    // Selection
    selectedId,
    handleSelectResponse,

    // Filters
    filters,
    hasActiveFilters,
    handleSearchChange,
    handleTypeToggle,
    handleClearFilters,

    // Utility
    handleRetry,
  };
}
