/**
 * Simulation Host Mobile Page Logic Hook
 *
 * Follows the Hollow Component Pattern:
 * - ALL business logic is contained in this hook
 * - Page component only handles rendering
 *
 * This hook manages the complete host-side usability simulation flow:
 * Step A: Mark as tester
 * Step B: Receive proposals (create test guest + 3 proposals)
 * Step C: Send counteroffer (guest rejects)
 * Step D: Accept proposal & create lease
 * Step E: Handle guest request
 * Step F: Complete stay & reviews
 *
 * Features:
 * - localStorage persistence for simulation state
 * - URL parameter persistence for reload resilience
 * - Progress tracking via usability steps
 * - Full cleanup capability
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { checkAuthStatus, validateTokenAndFetchUser } from '../../../lib/auth.js';
import { supabase } from '../../../lib/supabase.js';
import * as simulationService from '../../../lib/simulationHostService.js';
import {
  SIMULATION_STEPS,
  STEP_ORDER,
  RENTAL_TYPES,
  getNextStep,
  canActivateStep,
  getCompletedSteps,
  getStepStatus
} from './constants/simulationSteps.js';

// Storage key for persisting simulation state
const STORAGE_KEY = 'simulation_host_mobile_state';

/**
 * Parse URL parameters for state persistence
 */
function parseURLParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    step: params.get('step') || null,
    simulationId: params.get('simId') || null
  };
}

/**
 * Update URL parameters without page reload
 */
function updateURLParams(simulationId, currentStep) {
  const params = new URLSearchParams();
  if (simulationId) {
    params.set('simId', simulationId);
  }
  if (currentStep && currentStep !== 'pre-start') {
    params.set('step', currentStep);
  }
  const newURL = params.toString() ? `?${params.toString()}` : window.location.pathname;
  window.history.replaceState({}, '', newURL);
}

/**
 * Load persisted state from localStorage
 */
function loadPersistedState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (err) {
    console.warn('[useSimulationHostMobilePageLogic] Failed to load persisted state:', err);
  }
  return null;
}

/**
 * Save state to localStorage
 */
function persistState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('[useSimulationHostMobilePageLogic] Failed to persist state:', err);
  }
}

/**
 * Clear persisted state
 */
function clearPersistedState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[useSimulationHostMobilePageLogic] Failed to clear persisted state:', err);
  }
}

/**
 * Main logic hook for Simulation Host Mobile Page
 */
export function useSimulationHostMobilePageLogic() {
  // ============================================================================
  // AUTH STATE
  // ============================================================================
  const [authState, setAuthState] = useState({
    isChecking: true,
    isAuthenticated: false,
    isHost: false,
    shouldRedirect: false
  });

  // ============================================================================
  // USER STATE
  // ============================================================================
  const [currentUser, setCurrentUser] = useState(null);
  const [hostListings, setHostListings] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);

  // ============================================================================
  // SIMULATION STATE
  // ============================================================================
  const urlParams = parseURLParams();
  const persistedState = loadPersistedState();

  const [simulationState, setSimulationState] = useState({
    // Session tracking
    simulationId: urlParams.simulationId || persistedState?.simulationId || null,
    hostId: persistedState?.hostId || null,

    // Progress tracking
    currentStep: urlParams.step || persistedState?.currentStep || 'pre-start',
    completedSteps: persistedState?.completedSteps || [],

    // Test data references
    testGuestId: persistedState?.testGuestId || null,
    testGuestName: persistedState?.testGuestName || null,
    testProposals: persistedState?.testProposals || [],
    testLeaseId: persistedState?.testLeaseId || null,
    selectedProposalId: persistedState?.selectedProposalId || null,

    // UI state
    selectedRentalType: persistedState?.selectedRentalType || 'weekly',
    mobileConfirmed: persistedState?.mobileConfirmed || false,
    isLoading: false,
    stepInProgress: null,
    error: null,

    // Toast messages
    toast: null
  });

  // ============================================================================
  // DERIVED STATE
  // ============================================================================
  const isAuthenticated = authState.isAuthenticated;
  const isHost = authState.isHost;
  const currentStep = simulationState.currentStep;
  const completedSteps = simulationState.completedSteps;
  const isLoading = simulationState.isLoading;
  const stepInProgress = simulationState.stepInProgress;
  const mobileConfirmed = simulationState.mobileConfirmed;
  const selectedRentalType = simulationState.selectedRentalType;
  const simulationId = simulationState.simulationId;

  // Current date/time for display
  const currentDateTime = useMemo(() => {
    return new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  // ============================================================================
  // PERSISTENCE EFFECT
  // ============================================================================
  useEffect(() => {
    if (simulationState.simulationId) {
      persistState({
        simulationId: simulationState.simulationId,
        hostId: simulationState.hostId,
        currentStep: simulationState.currentStep,
        completedSteps: simulationState.completedSteps,
        testGuestId: simulationState.testGuestId,
        testGuestName: simulationState.testGuestName,
        testProposals: simulationState.testProposals,
        testLeaseId: simulationState.testLeaseId,
        selectedProposalId: simulationState.selectedProposalId,
        selectedRentalType: simulationState.selectedRentalType,
        mobileConfirmed: simulationState.mobileConfirmed
      });
      updateURLParams(simulationState.simulationId, simulationState.currentStep);
    }
  }, [
    simulationState.simulationId,
    simulationState.hostId,
    simulationState.currentStep,
    simulationState.completedSteps,
    simulationState.testGuestId,
    simulationState.testProposals,
    simulationState.testLeaseId,
    simulationState.selectedProposalId,
    simulationState.selectedRentalType,
    simulationState.mobileConfirmed
  ]);

  // ============================================================================
  // AUTH CHECK
  // ============================================================================
  useEffect(() => {
    async function checkAuth() {
      console.log('[SimulationHostMobile] Checking authentication...');

      try {
        const isLoggedIn = await checkAuthStatus();

        if (!isLoggedIn) {
          setAuthState({
            isChecking: false,
            isAuthenticated: false,
            isHost: false,
            shouldRedirect: false
          });
          return;
        }

        // Deep validation with user data fetch
        const userData = await validateTokenAndFetchUser({ clearOnFailure: false });

        if (userData) {
          setCurrentUser(userData);

          // Check if user is a host
          const userType = userData.userType || '';
          const isHost = userType.includes('Host') || userType.includes('Landlord');

          setAuthState({
            isChecking: false,
            isAuthenticated: true,
            isHost,
            shouldRedirect: false
          });

          if (isHost) {
            // Load host's listings
            await loadHostListings(userData._id || userData.userId);
          }
        } else {
          // Fallback to session data
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            const userMetadata = session.user.user_metadata || {};
            setCurrentUser({
              userId: userMetadata.user_id || session.user.id,
              _id: userMetadata.user_id || session.user.id,
              firstName: userMetadata.first_name || session.user.email?.split('@')[0] || 'User',
              email: session.user.email,
              userType: userMetadata.user_type || ''
            });

            const isHost = (userMetadata.user_type || '').includes('Host');
            setAuthState({
              isChecking: false,
              isAuthenticated: true,
              isHost,
              shouldRedirect: false
            });

            if (isHost && userMetadata.user_id) {
              await loadHostListings(userMetadata.user_id);
            }
          } else {
            setAuthState({
              isChecking: false,
              isAuthenticated: false,
              isHost: false,
              shouldRedirect: false
            });
          }
        }
      } catch (err) {
        console.error('[SimulationHostMobile] Auth check failed:', err);
        setAuthState({
          isChecking: false,
          isAuthenticated: false,
          isHost: false,
          shouldRedirect: false
        });
      }
    }

    checkAuth();
  }, []);

  // ============================================================================
  // LOAD HOST LISTINGS
  // ============================================================================
  const loadHostListings = async (hostUserId) => {
    console.log('[SimulationHostMobile] Loading host listings for:', hostUserId);

    try {
      const { data: listings, error } = await supabase
        .from('listing')
        .select('_id, "Name", "Cover Photo", "Primary Address", "Listing Status"')
        .eq('Host User', hostUserId)
        .eq('Listing Status', 'Published')
        .limit(10);

      if (error) {
        console.error('[SimulationHostMobile] Failed to load listings:', error);
        return;
      }

      setHostListings(listings || []);

      // Auto-select first listing if none selected
      if (listings?.length > 0 && !selectedListing) {
        setSelectedListing(listings[0]);
      }

      console.log('[SimulationHostMobile] Loaded', listings?.length || 0, 'listings');
    } catch (err) {
      console.error('[SimulationHostMobile] Error loading listings:', err);
    }
  };

  // ============================================================================
  // TOAST HELPER
  // ============================================================================
  const showToast = useCallback((toast) => {
    setSimulationState(prev => ({ ...prev, toast }));
    setTimeout(() => {
      setSimulationState(prev => ({ ...prev, toast: null }));
    }, 5000);
  }, []);

  const dismissToast = useCallback(() => {
    setSimulationState(prev => ({ ...prev, toast: null }));
  }, []);

  // ============================================================================
  // ERROR HANDLER
  // ============================================================================
  const handleStepError = useCallback((stepId, error) => {
    console.error(`[SimulationHostMobile] Step ${stepId} failed:`, error);
    showToast({
      title: `Step ${stepId} Failed`,
      message: error.message || 'An unexpected error occurred',
      type: 'error'
    });
    setSimulationState(prev => ({
      ...prev,
      isLoading: false,
      stepInProgress: null,
      error: error.message
    }));
  }, [showToast]);

  // ============================================================================
  // MOBILE CONFIRMATION HANDLER
  // ============================================================================
  const handleMobileConfirmChange = useCallback((confirmed) => {
    setSimulationState(prev => ({ ...prev, mobileConfirmed: confirmed }));
  }, []);

  // ============================================================================
  // RENTAL TYPE SELECTION
  // ============================================================================
  const handleSelectRentalType = useCallback((rentalType) => {
    setSimulationState(prev => ({ ...prev, selectedRentalType: rentalType }));
  }, []);

  // ============================================================================
  // START SIMULATION
  // ============================================================================
  const handleStartSimulation = useCallback(async () => {
    if (!mobileConfirmed) {
      showToast({
        title: 'Confirmation Required',
        message: 'Please confirm you are testing on a mobile device',
        type: 'error'
      });
      return;
    }

    if (!selectedListing) {
      showToast({
        title: 'Listing Required',
        message: 'Please select a listing to use for the simulation',
        type: 'error'
      });
      return;
    }

    setSimulationState(prev => ({ ...prev, isLoading: true }));

    try {
      // Initialize simulation session
      const result = await simulationService.initSimulation();

      setSimulationState(prev => ({
        ...prev,
        simulationId: result.simulationId,
        hostId: result.hostId,
        currentStep: 'A',
        isLoading: false
      }));

      showToast({
        title: 'Simulation Started',
        message: `Session ID: ${result.simulationId.substring(0, 10)}...`,
        type: 'success'
      });
    } catch (error) {
      handleStepError('init', error);
    }
  }, [mobileConfirmed, selectedListing, showToast, handleStepError]);

  // ============================================================================
  // STEP A: Mark as Tester
  // ============================================================================
  const handleStepA = useCallback(async () => {
    if (!simulationId) return;

    setSimulationState(prev => ({ ...prev, isLoading: true, stepInProgress: 'A' }));

    try {
      await simulationService.markAsTester(simulationId);

      setSimulationState(prev => ({
        ...prev,
        isLoading: false,
        stepInProgress: null,
        currentStep: 'B',
        completedSteps: [...prev.completedSteps, 'A']
      }));

      showToast({
        title: 'Step A Complete',
        message: 'You are now marked as a usability tester',
        type: 'success'
      });
    } catch (error) {
      handleStepError('A', error);
    }
  }, [simulationId, showToast, handleStepError]);

  // ============================================================================
  // STEP B: Receive Proposals
  // ============================================================================
  const handleStepB = useCallback(async () => {
    if (!simulationId || !selectedListing) return;

    setSimulationState(prev => ({ ...prev, isLoading: true, stepInProgress: 'B' }));

    try {
      // First create test guest
      const guestResult = await simulationService.createTestGuest(simulationId);

      // Then create proposals
      const proposalResult = await simulationService.createTestProposals(
        simulationId,
        guestResult.guestId,
        selectedListing._id,
        simulationState.hostId,
        selectedRentalType
      );

      setSimulationState(prev => ({
        ...prev,
        isLoading: false,
        stepInProgress: null,
        currentStep: 'C',
        completedSteps: [...prev.completedSteps, 'B'],
        testGuestId: guestResult.guestId,
        testGuestName: guestResult.guestName,
        testProposals: proposalResult.proposals
      }));

      showToast({
        title: 'Step B Complete',
        message: `Created ${proposalResult.proposals.length} test proposals from ${guestResult.guestName}`,
        type: 'success'
      });
    } catch (error) {
      handleStepError('B', error);
    }
  }, [simulationId, selectedListing, simulationState.hostId, selectedRentalType, showToast, handleStepError]);

  // ============================================================================
  // STEP C: Counteroffer (Guest Rejects)
  // ============================================================================
  const handleStepC = useCallback(async () => {
    if (!simulationId) return;

    // Use first proposal for counteroffer
    const proposalForCounter = simulationState.testProposals[0];
    if (!proposalForCounter) {
      showToast({
        title: 'No Proposal Found',
        message: 'Complete Step B first to create test proposals',
        type: 'error'
      });
      return;
    }

    setSimulationState(prev => ({ ...prev, isLoading: true, stepInProgress: 'C' }));

    try {
      await simulationService.sendCounteroffer(simulationId, proposalForCounter.proposalId);

      setSimulationState(prev => ({
        ...prev,
        isLoading: false,
        stepInProgress: null,
        currentStep: 'D',
        completedSteps: [...prev.completedSteps, 'C']
      }));

      showToast({
        title: 'Step C Complete',
        message: 'Counteroffer sent - Guest rejected it (simulated)',
        type: 'success'
      });
    } catch (error) {
      handleStepError('C', error);
    }
  }, [simulationId, simulationState.testProposals, showToast, handleStepError]);

  // ============================================================================
  // STEP D: Accept Proposal & Create Lease
  // ============================================================================
  const handleStepD = useCallback(async () => {
    if (!simulationId) return;

    // Use second proposal for acceptance (first was rejected via counteroffer)
    const proposalToAccept = simulationState.testProposals[1] || simulationState.testProposals[0];
    if (!proposalToAccept) {
      showToast({
        title: 'No Proposal Found',
        message: 'Complete Step B first to create test proposals',
        type: 'error'
      });
      return;
    }

    setSimulationState(prev => ({ ...prev, isLoading: true, stepInProgress: 'D' }));

    try {
      const result = await simulationService.acceptProposal(simulationId, proposalToAccept.proposalId);

      setSimulationState(prev => ({
        ...prev,
        isLoading: false,
        stepInProgress: null,
        currentStep: 'E',
        completedSteps: [...prev.completedSteps, 'D'],
        testLeaseId: result.leaseId,
        selectedProposalId: proposalToAccept.proposalId
      }));

      showToast({
        title: 'Step D Complete',
        message: result.leaseId ? 'Proposal accepted & lease created' : 'Proposal accepted',
        type: 'success'
      });
    } catch (error) {
      handleStepError('D', error);
    }
  }, [simulationId, simulationState.testProposals, showToast, handleStepError]);

  // ============================================================================
  // STEP E: Handle Guest Request
  // ============================================================================
  const handleStepE = useCallback(async () => {
    if (!simulationId) return;

    setSimulationState(prev => ({ ...prev, isLoading: true, stepInProgress: 'E' }));

    try {
      await simulationService.handleGuestRequest(
        simulationId,
        simulationState.testLeaseId,
        'early_checkin',
        'approve'
      );

      setSimulationState(prev => ({
        ...prev,
        isLoading: false,
        stepInProgress: null,
        currentStep: 'F',
        completedSteps: [...prev.completedSteps, 'E']
      }));

      showToast({
        title: 'Step E Complete',
        message: 'Guest request handled - Early check-in approved',
        type: 'success'
      });
    } catch (error) {
      handleStepError('E', error);
    }
  }, [simulationId, simulationState.testLeaseId, showToast, handleStepError]);

  // ============================================================================
  // STEP F: Complete Stay & Reviews
  // ============================================================================
  const handleStepF = useCallback(async () => {
    if (!simulationId) return;

    setSimulationState(prev => ({ ...prev, isLoading: true, stepInProgress: 'F' }));

    try {
      const result = await simulationService.completeStay(
        simulationId,
        simulationState.testLeaseId,
        simulationState.selectedProposalId
      );

      setSimulationState(prev => ({
        ...prev,
        isLoading: false,
        stepInProgress: null,
        currentStep: 'complete',
        completedSteps: [...prev.completedSteps, 'F']
      }));

      showToast({
        title: 'Simulation Complete! 🎉',
        message: `Stay completed with ${result.reviews.length} reviews generated`,
        type: 'success'
      });
    } catch (error) {
      handleStepError('F', error);
    }
  }, [simulationId, simulationState.testLeaseId, simulationState.selectedProposalId, showToast, handleStepError]);

  // ============================================================================
  // CLEANUP / RESET
  // ============================================================================
  const handleCleanup = useCallback(async () => {
    if (!simulationId) {
      // Just reset local state if no simulation
      clearPersistedState();
      window.history.replaceState({}, '', window.location.pathname);
      setSimulationState({
        simulationId: null,
        hostId: null,
        currentStep: 'pre-start',
        completedSteps: [],
        testGuestId: null,
        testGuestName: null,
        testProposals: [],
        testLeaseId: null,
        selectedProposalId: null,
        selectedRentalType: 'weekly',
        mobileConfirmed: false,
        isLoading: false,
        stepInProgress: null,
        error: null,
        toast: null
      });
      return;
    }

    setSimulationState(prev => ({ ...prev, isLoading: true }));

    try {
      const result = await simulationService.cleanupSimulation(simulationId);

      // Clear persisted state
      clearPersistedState();
      window.history.replaceState({}, '', window.location.pathname);

      // Reset state
      setSimulationState({
        simulationId: null,
        hostId: null,
        currentStep: 'pre-start',
        completedSteps: [],
        testGuestId: null,
        testGuestName: null,
        testProposals: [],
        testLeaseId: null,
        selectedProposalId: null,
        selectedRentalType: 'weekly',
        mobileConfirmed: false,
        isLoading: false,
        stepInProgress: null,
        error: null,
        toast: null
      });

      const totalDeleted = Object.values(result.deletedCounts).reduce((a, b) => a + b, 0);
      showToast({
        title: 'Cleanup Complete',
        message: `Deleted ${totalDeleted} test records`,
        type: 'info'
      });
    } catch (error) {
      console.error('[SimulationHostMobile] Cleanup failed:', error);
      showToast({
        title: 'Cleanup Failed',
        message: error.message,
        type: 'error'
      });
      setSimulationState(prev => ({ ...prev, isLoading: false }));
    }
  }, [simulationId, showToast]);

  // ============================================================================
  // LOGIN REDIRECT
  // ============================================================================
  const handleLogin = useCallback(() => {
    sessionStorage.setItem('returnTo', window.location.href);
    window.dispatchEvent(new CustomEvent('openLoginModal'));
  }, []);

  // ============================================================================
  // LISTING SELECTION
  // ============================================================================
  const handleSelectListing = useCallback((listing) => {
    setSelectedListing(listing);
  }, []);

  // ============================================================================
  // GENERIC STEP ACTION
  // ============================================================================
  const handleStepAction = useCallback((stepId) => {
    switch (stepId) {
      case 'A': return handleStepA();
      case 'B': return handleStepB();
      case 'C': return handleStepC();
      case 'D': return handleStepD();
      case 'E': return handleStepE();
      case 'F': return handleStepF();
      default: console.warn('Unknown step:', stepId);
    }
  }, [handleStepA, handleStepB, handleStepC, handleStepD, handleStepE, handleStepF]);

  // ============================================================================
  // RETURN HOOK API
  // ============================================================================
  return {
    // Auth state
    authState,
    isAuthenticated,
    isHost,
    currentUser,
    currentDateTime,

    // Host data
    hostListings,
    selectedListing,

    // Simulation state
    simulationId,
    currentStep,
    completedSteps,
    selectedRentalType,
    mobileConfirmed,
    isLoading,
    stepInProgress,

    // Test data
    testGuestId: simulationState.testGuestId,
    testGuestName: simulationState.testGuestName,
    testProposals: simulationState.testProposals,
    testLeaseId: simulationState.testLeaseId,

    // Toast state
    toast: simulationState.toast,
    error: simulationState.error,

    // Constants
    SIMULATION_STEPS,
    STEP_ORDER,
    RENTAL_TYPES,

    // Handlers
    handleLogin,
    handleMobileConfirmChange,
    handleSelectRentalType,
    handleSelectListing,
    handleStartSimulation,
    handleStepAction,
    handleStepA,
    handleStepB,
    handleStepC,
    handleStepD,
    handleStepE,
    handleStepF,
    handleCleanup,

    // Utility handlers
    showToast,
    dismissToast,

    // Step utilities
    canActivateStep: (stepId) => canActivateStep(stepId, completedSteps),
    getStepStatus: (stepId) => getStepStatus(stepId, currentStep, completedSteps)
  };
}

export default useSimulationHostMobilePageLogic;
