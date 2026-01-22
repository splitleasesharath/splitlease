import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../../lib/supabase.js';
import { useToast } from '../../shared/Toast';

/**
 * useSimulationAdminPageLogic - Logic hook for Simulation Admin Page
 *
 * Hollow Component Pattern: ALL business logic lives here.
 * The page component only handles rendering.
 *
 * Handles:
 * - Fetching and displaying usability testers with pagination
 * - Search filtering by name/email
 * - Selecting testers from dropdown
 * - Resetting testers to Day 1 (step 0)
 * - Advancing testers to Day 2 (step 4)
 * - Statistics dashboard
 * - URL parameter support (?tester=id)
 *
 * Database table: user
 * Edge Function: simulation-admin
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Items per page for tester list
const PAGE_SIZE = 50;

/**
 * @typedef {Object} Tester
 * @property {string} id - User ID (_id from database)
 * @property {string} email - User email
 * @property {string} firstName - First name
 * @property {string} lastName - Last name
 * @property {number} usabilityStep - Current step (0-7)
 * @property {string} stepKey - Step key (e.g., 'not_started')
 * @property {string} stepLabel - Display label (e.g., 'Not Started')
 * @property {boolean} canAdvance - Whether tester can be advanced
 * @property {boolean} canReset - Whether tester can be reset
 * @property {string|null} modifiedDate - Last modified timestamp
 */

/**
 * @typedef {Object} StepStat
 * @property {number} step - Step number (0-7)
 * @property {string} key - Step key
 * @property {string} label - Display label
 * @property {number} count - Number of testers at this step
 */

export default function useSimulationAdminPageLogic() {
  const { showToast } = useToast();

  // ===== LIST STATE =====
  const [testers, setTesters] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // ===== FILTER STATE =====
  const [searchText, setSearchText] = useState('');

  // ===== STEP CONFIG STATE =====
  const [stepConfig, setStepConfig] = useState({});

  // ===== SELECTION STATE =====
  const [selectedTester, setSelectedTester] = useState(null);

  // ===== STATISTICS STATE =====
  const [statistics, setStatistics] = useState(null);

  // ===== MODAL STATE =====
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);

  // ===== PROCESSING STATE =====
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  // ===== EFFECTS =====

  // Initial data fetch
  useEffect(() => {
    fetchTesters();
    fetchStatistics();
  }, []);

  // Refetch when filters change
  useEffect(() => {
    fetchTesters();
  }, [searchText, currentPage]);

  // Handle URL parameter for direct tester selection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const testerId = params.get('tester');
    if (testerId && testers.length > 0 && !selectedTester) {
      const tester = testers.find(t => t.id === testerId);
      if (tester) {
        setSelectedTester(tester);
      } else {
        // Tester not in current list, fetch directly
        fetchTesterById(testerId);
      }
    }
  }, [testers]);

  // ===== API HELPERS =====

  /**
   * Call the Edge Function with an action
   */
  async function callEdgeFunction(action, payload = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('You must be logged in to perform this action');
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/simulation-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action, payload }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Request failed');
    }

    return result.data;
  }

  // ===== DATA FETCHING =====

  /**
   * Fetch testers with current filters
   */
  const fetchTesters = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await callEdgeFunction('listTesters', {
        limit: PAGE_SIZE,
        offset: (currentPage - 1) * PAGE_SIZE,
        search: searchText || undefined,
      });

      setTesters(data.testers || []);
      setTotalCount(data.total || 0);
      if (data.stepConfig) {
        setStepConfig(data.stepConfig);
      }
    } catch (err) {
      console.error('[useSimulationAdminPageLogic] Fetch error:', err);
      setError(err.message);
      showToast(err.message || 'Failed to fetch testers', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchText, showToast]);

  /**
   * Fetch statistics (counts by step)
   */
  const fetchStatistics = useCallback(async () => {
    try {
      const data = await callEdgeFunction('getStatistics');
      setStatistics(data);
      if (data.stepConfig) {
        setStepConfig(data.stepConfig);
      }
    } catch (err) {
      console.error('[useSimulationAdminPageLogic] Stats error:', err);
      // Don't show error toast for stats - not critical
    }
  }, []);

  /**
   * Fetch single tester by ID
   */
  const fetchTesterById = useCallback(async (testerId) => {
    try {
      const data = await callEdgeFunction('getTester', { testerId });
      if (data.tester) {
        setSelectedTester(data.tester);
      }
    } catch (err) {
      console.error('[useSimulationAdminPageLogic] Fetch tester error:', err);
      showToast(err.message || 'Failed to fetch tester', 'error');
    }
  }, [showToast]);

  // ===== ACTION HANDLERS =====

  /**
   * Reset tester to Day 1 (step 0)
   */
  const resetToDay1 = useCallback(async () => {
    if (!selectedTester) return;

    try {
      setIsProcessing(true);
      const data = await callEdgeFunction('resetToDay1', {
        testerId: selectedTester.id,
      });

      // Update local state
      const updatedTester = data.tester;
      setSelectedTester(updatedTester);
      setTesters(prev => prev.map(t => t.id === updatedTester.id ? updatedTester : t));

      // Close modal
      setIsResetModalOpen(false);

      // Refresh statistics
      fetchStatistics();

      showToast(`${updatedTester.firstName || 'Tester'} has been reset to Day 1`, 'success');
    } catch (err) {
      console.error('[useSimulationAdminPageLogic] Reset error:', err);
      showToast(err.message || 'Failed to reset tester', 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedTester, fetchStatistics, showToast]);

  /**
   * Advance tester to Day 2 (step 4)
   */
  const advanceToDay2 = useCallback(async () => {
    if (!selectedTester) return;

    try {
      setIsProcessing(true);
      const data = await callEdgeFunction('advanceToDay2', {
        testerId: selectedTester.id,
      });

      // Update local state
      const updatedTester = data.tester;
      setSelectedTester(updatedTester);
      setTesters(prev => prev.map(t => t.id === updatedTester.id ? updatedTester : t));

      // Close modal
      setIsAdvanceModalOpen(false);

      // Refresh statistics
      fetchStatistics();

      showToast(`${updatedTester.firstName || 'Tester'} has been advanced to Day 2`, 'success');
    } catch (err) {
      console.error('[useSimulationAdminPageLogic] Advance error:', err);
      showToast(err.message || 'Failed to advance tester', 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedTester, fetchStatistics, showToast]);

  // ===== UI HANDLERS =====

  /**
   * Handle tester selection from dropdown
   */
  const handleTesterSelect = useCallback((tester) => {
    setSelectedTester(tester);
    // Update URL without page reload
    const url = new URL(window.location.href);
    if (tester) {
      url.searchParams.set('tester', tester.id);
    } else {
      url.searchParams.delete('tester');
    }
    window.history.replaceState({}, '', url.toString());
  }, []);

  /**
   * Handle search text change
   */
  const handleSearchChange = useCallback((text) => {
    setSearchText(text);
    setCurrentPage(1); // Reset to first page
  }, []);

  /**
   * Handle page change
   */
  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  /**
   * Clear search and selection
   */
  const clearSelection = useCallback(() => {
    setSelectedTester(null);
    setSearchText('');
    // Clear URL param
    const url = new URL(window.location.href);
    url.searchParams.delete('tester');
    window.history.replaceState({}, '', url.toString());
  }, []);

  /**
   * Open reset confirmation modal
   */
  const openResetModal = useCallback(() => {
    if (selectedTester && selectedTester.canReset) {
      setIsResetModalOpen(true);
    }
  }, [selectedTester]);

  /**
   * Close reset modal
   */
  const closeResetModal = useCallback(() => {
    setIsResetModalOpen(false);
  }, []);

  /**
   * Open advance confirmation modal
   */
  const openAdvanceModal = useCallback(() => {
    if (selectedTester && selectedTester.canAdvance) {
      setIsAdvanceModalOpen(true);
    }
  }, [selectedTester]);

  /**
   * Close advance modal
   */
  const closeAdvanceModal = useCallback(() => {
    setIsAdvanceModalOpen(false);
  }, []);

  // ===== COMPUTED VALUES =====

  /**
   * Total number of pages
   */
  const totalPages = useMemo(() => {
    return Math.ceil(totalCount / PAGE_SIZE);
  }, [totalCount]);

  /**
   * Formatted statistics for display
   */
  const formattedStats = useMemo(() => {
    if (!statistics?.stats) return [];
    return statistics.stats;
  }, [statistics]);

  /**
   * Get step label by step number
   */
  const getStepLabel = useCallback((step) => {
    const config = stepConfig[step];
    return config?.label || `Step ${step}`;
  }, [stepConfig]);

  /**
   * Get step color by step number (for progress visualization)
   */
  const getStepColor = useCallback((step) => {
    if (step === 0) return 'gray';
    if (step <= 3) return 'blue'; // Day 1
    if (step <= 6) return 'green'; // Day 2
    return 'purple'; // Completed
  }, []);

  /**
   * Format date for display
   */
  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  /**
   * Get tester display name
   */
  const getTesterDisplayName = useCallback((tester) => {
    if (!tester) return '';
    const name = `${tester.firstName || ''} ${tester.lastName || ''}`.trim();
    return name || tester.email || 'Unknown';
  }, []);

  return {
    // ===== LIST STATE =====
    testers,
    totalCount,
    currentPage,
    totalPages,
    isLoading,

    // ===== FILTER STATE =====
    searchText,

    // ===== SELECTION STATE =====
    selectedTester,

    // ===== STATISTICS STATE =====
    statistics,
    formattedStats,

    // ===== STEP CONFIG =====
    stepConfig,

    // ===== MODAL STATE =====
    isResetModalOpen,
    isAdvanceModalOpen,

    // ===== PROCESSING STATE =====
    isProcessing,
    error,

    // ===== DATA FETCHING =====
    fetchTesters,
    fetchStatistics,
    fetchTesterById,

    // ===== ACTION HANDLERS =====
    resetToDay1,
    advanceToDay2,

    // ===== UI HANDLERS =====
    handleTesterSelect,
    handleSearchChange,
    handlePageChange,
    clearSelection,
    openResetModal,
    closeResetModal,
    openAdvanceModal,
    closeAdvanceModal,

    // ===== COMPUTED VALUES =====
    getStepLabel,
    getStepColor,
    formatDate,
    getTesterDisplayName,
  };
}
