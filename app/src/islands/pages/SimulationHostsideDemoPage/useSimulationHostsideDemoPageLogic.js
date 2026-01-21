/**
 * Simulation Hostside Demo Page Logic Hook
 *
 * Follows the Hollow Component Pattern:
 * - ALL business logic is contained in this hook
 * - Page component only handles rendering
 *
 * This hook manages the complete host-side usability simulation flow:
 * Step A: Mark as usability tester
 * Step B: Receive 3 proposals from simulated guests
 * Step C: Mariska accepts VM invite
 * Step D: Draft lease docs for Proposal #2
 * Step E: VM invite from Guest Jacques
 *
 * Key Architectural Adaptations from Bubble:
 * - Bubble's "Custom States" → React useState hooks
 * - Bubble's "Workflows" → Event handlers calling async functions
 * - Bubble's "Usability Step" field → localStorage (MVP decision)
 *
 * @module pages/SimulationHostsideDemoPage/useSimulationHostsideDemoPageLogic
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { checkAuthStatus, validateTokenAndFetchUser } from '../../../lib/auth.js';
import { generateSimulatedProposals, updateSimulatedProposalByGuest } from '../../../logic/simulators/generateSimulatedProposals.js';
import { generateSimulatedGuests } from '../../../logic/simulators/generateSimulatedGuests.js';
import {
  SIMULATION_STEPS,
  STEP_ORDER,
  TOTAL_STEPS,
  STORAGE_KEY,
  getCompletedSteps,
  canClickStep,
  isStepCompleted,
  getBetweenStepText
} from './constants/simulationSteps.js';

/**
 * Load saved progress from localStorage
 *
 * @param {string} userId - Current user's ID
 * @returns {Object|null} Saved progress or null
 */
function loadSavedProgress(userId) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const data = JSON.parse(stored);

    // Only restore if same user
    if (data.userId !== userId) return null;

    return data;
  } catch (error) {
    console.warn('[SimulationHostsideDemo] Failed to load saved progress:', error);
    return null;
  }
}

/**
 * Save progress to localStorage
 *
 * @param {Object} progress - Progress data to save
 */
function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...progress,
      savedAt: new Date().toISOString()
    }));
  } catch (error) {
    console.warn('[SimulationHostsideDemo] Failed to save progress:', error);
  }
}

/**
 * Clear saved progress from localStorage
 */
function clearProgress() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('[SimulationHostsideDemo] Failed to clear progress:', error);
  }
}

/**
 * Main logic hook for the Simulation Hostside Demo Page
 */
export function useSimulationHostsideDemoPageLogic() {
  // ============================================================================
  // AUTH STATE
  // ============================================================================
  const [authState, setAuthState] = useState({
    isChecking: true,
    isAuthenticated: false
  });

  // ============================================================================
  // USER STATE
  // ============================================================================
  const [currentUser, setCurrentUser] = useState(null);

  // ============================================================================
  // SIMULATION STATE
  // ============================================================================
  const [simulationState, setSimulationState] = useState({
    // Progress tracking (0 = not started, 1-5 = steps completed)
    currentStep: 0,

    // Individual step clicked states (for showing "between" text)
    stepClicked: {
      A: false,
      B: false,
      C: false,
      D: false,
      E: false
    },

    // Simulated data
    simulatedGuests: [],
    simulatedProposals: [],

    // UI state
    isLoading: false,
    loadingStep: null,
    error: null,

    // Toast messages
    toast: null
  });

  // ============================================================================
  // DERIVED STATE
  // ============================================================================
  const isAuthenticated = authState.isAuthenticated;
  const currentStep = simulationState.currentStep;
  const stepClicked = simulationState.stepClicked;
  const simulatedProposals = simulationState.simulatedProposals;
  const isLoading = simulationState.isLoading;
  const loadingStep = simulationState.loadingStep;

  // Computed: which steps are completed
  const completedSteps = useMemo(() =>
    getCompletedSteps(currentStep),
    [currentStep]
  );

  // Compute current date/time for header display
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
  // AUTH CHECK
  // ============================================================================
  useEffect(() => {
    async function checkAuth() {
      try {
        const isLoggedIn = await checkAuthStatus();

        if (!isLoggedIn) {
          setAuthState({
            isChecking: false,
            isAuthenticated: false
          });
          return;
        }

        // Deep validation with user data fetch
        const userData = await validateTokenAndFetchUser({ clearOnFailure: false });

        if (userData) {
          setCurrentUser(userData);
          setAuthState({
            isChecking: false,
            isAuthenticated: true
          });

          // Restore progress from localStorage
          const userId = userData.userId || userData._id;
          const savedProgress = loadSavedProgress(userId);

          if (savedProgress) {
            console.log('[SimulationHostsideDemo] Restoring saved progress:', savedProgress);
            setSimulationState(prev => ({
              ...prev,
              currentStep: savedProgress.currentStep || 0,
              stepClicked: savedProgress.stepClicked || prev.stepClicked,
              simulatedGuests: savedProgress.simulatedGuests || [],
              simulatedProposals: savedProgress.simulatedProposals || []
            }));
          }
        } else {
          setAuthState({
            isChecking: false,
            isAuthenticated: false
          });
        }
      } catch (err) {
        console.error('[SimulationHostsideDemo] Auth check failed:', err);
        setAuthState({
          isChecking: false,
          isAuthenticated: false
        });
      }
    }

    checkAuth();
  }, []);

  // ============================================================================
  // TOAST HELPER
  // ============================================================================
  const showToast = useCallback((toast) => {
    setSimulationState(prev => ({ ...prev, toast }));
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setSimulationState(prev => ({ ...prev, toast: null }));
    }, 5000);
  }, []);

  const dismissToast = useCallback(() => {
    setSimulationState(prev => ({ ...prev, toast: null }));
  }, []);

  // ============================================================================
  // SAVE PROGRESS HELPER
  // ============================================================================
  const persistProgress = useCallback((updates) => {
    if (!currentUser) return;

    const userId = currentUser.userId || currentUser._id;

    setSimulationState(prev => {
      const newState = { ...prev, ...updates };

      saveProgress({
        userId,
        currentStep: newState.currentStep,
        stepClicked: newState.stepClicked,
        simulatedGuests: newState.simulatedGuests,
        simulatedProposals: newState.simulatedProposals
      });

      return newState;
    });
  }, [currentUser]);

  // ============================================================================
  // STEP A: Mark yourself as a Usability Tester
  // ============================================================================
  const handleStepAClick = useCallback(async () => {
    if (!currentUser) {
      showToast({ title: 'Not Authenticated', message: 'Please log in first', type: 'error' });
      return;
    }

    setSimulationState(prev => ({
      ...prev,
      isLoading: true,
      loadingStep: 'A'
    }));

    // Simulate a small delay for UX feedback
    await new Promise(resolve => setTimeout(resolve, 500));

    persistProgress({
      currentStep: 1,
      stepClicked: { ...simulationState.stepClicked, A: true },
      isLoading: false,
      loadingStep: null
    });

    showToast({
      title: 'Step A Complete',
      message: 'You are now marked as a usability tester',
      type: 'success'
    });
  }, [currentUser, simulationState.stepClicked, showToast, persistProgress]);

  // ============================================================================
  // STEP B: Receive 3 Proposals
  // ============================================================================
  const handleStepBClick = useCallback(async () => {
    if (!currentUser) return;

    const userId = currentUser.userId || currentUser._id;

    setSimulationState(prev => ({
      ...prev,
      isLoading: true,
      loadingStep: 'B'
    }));

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Generate simulated guests and proposals
    const guests = generateSimulatedGuests();
    const proposals = generateSimulatedProposals({
      listing: null, // Use simulated listing
      hostId: userId
    });

    persistProgress({
      currentStep: 2,
      stepClicked: { ...simulationState.stepClicked, B: true },
      simulatedGuests: guests,
      simulatedProposals: proposals,
      isLoading: false,
      loadingStep: null
    });

    showToast({
      title: 'Step B Complete',
      message: 'You have received 3 proposals from simulated guests',
      type: 'success'
    });
  }, [currentUser, simulationState.stepClicked, showToast, persistProgress]);

  // ============================================================================
  // STEP C: Mariska Accepts VM Invite
  // ============================================================================
  const handleStepCClick = useCallback(async () => {
    if (!currentUser) return;

    setSimulationState(prev => ({
      ...prev,
      isLoading: true,
      loadingStep: 'C'
    }));

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 600));

    // Update Mariska's proposal to show VM accepted
    const updatedProposals = updateSimulatedProposalByGuest(
      simulationState.simulatedProposals,
      'Mariska',
      {
        vmStatus: 'accepted',
        vmAcceptedAt: new Date().toISOString(),
        status: 'vm_scheduled'
      }
    );

    persistProgress({
      currentStep: 3,
      stepClicked: { ...simulationState.stepClicked, C: true },
      simulatedProposals: updatedProposals,
      isLoading: false,
      loadingStep: null
    });

    showToast({
      title: 'Step C Complete',
      message: 'Mariska has accepted your virtual meeting invitation',
      type: 'success'
    });
  }, [currentUser, simulationState.stepClicked, simulationState.simulatedProposals, showToast, persistProgress]);

  // ============================================================================
  // STEP D: Draft Lease Docs for Proposal #2
  // ============================================================================
  const handleStepDClick = useCallback(async () => {
    if (!currentUser) return;

    setSimulationState(prev => ({
      ...prev,
      isLoading: true,
      loadingStep: 'D'
    }));

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 700));

    // Update Mariska's proposal (Proposal #2) to show lease drafted
    const updatedProposals = updateSimulatedProposalByGuest(
      simulationState.simulatedProposals,
      'Mariska',
      {
        leaseStatus: 'draft',
        leaseDraftedAt: new Date().toISOString(),
        status: 'lease_docs_sent'
      }
    );

    persistProgress({
      currentStep: 4,
      stepClicked: { ...simulationState.stepClicked, D: true },
      simulatedProposals: updatedProposals,
      isLoading: false,
      loadingStep: null
    });

    showToast({
      title: 'Step D Complete',
      message: 'Lease documents have been drafted for Proposal #2 (Mariska)',
      type: 'success'
    });
  }, [currentUser, simulationState.stepClicked, simulationState.simulatedProposals, showToast, persistProgress]);

  // ============================================================================
  // STEP E: VM invite from Guest Jacques
  // ============================================================================
  const handleStepEClick = useCallback(async () => {
    if (!currentUser) return;

    setSimulationState(prev => ({
      ...prev,
      isLoading: true,
      loadingStep: 'E'
    }));

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 600));

    // Update Jacques's proposal to show incoming VM invite
    const updatedProposals = updateSimulatedProposalByGuest(
      simulationState.simulatedProposals,
      'Jacques',
      {
        hasIncomingVmInvite: true,
        vmInviteReceivedAt: new Date().toISOString(),
        status: 'vm_invite_received'
      }
    );

    persistProgress({
      currentStep: 5,
      stepClicked: { ...simulationState.stepClicked, E: true },
      simulatedProposals: updatedProposals,
      isLoading: false,
      loadingStep: null
    });

    showToast({
      title: 'Simulation Complete!',
      message: 'Congratulations! You have completed the host-side simulation.',
      type: 'success'
    });
  }, [currentUser, simulationState.stepClicked, simulationState.simulatedProposals, showToast, persistProgress]);

  // ============================================================================
  // RESET SIMULATION
  // ============================================================================
  const handleResetSimulation = useCallback(() => {
    clearProgress();

    setSimulationState({
      currentStep: 0,
      stepClicked: {
        A: false,
        B: false,
        C: false,
        D: false,
        E: false
      },
      simulatedGuests: [],
      simulatedProposals: [],
      isLoading: false,
      loadingStep: null,
      error: null,
      toast: null
    });

    showToast({
      title: 'Simulation Reset',
      message: 'You can start the simulation again from the beginning',
      type: 'info'
    });
  }, [showToast]);

  // ============================================================================
  // LOGIN HANDLER
  // ============================================================================
  const handleLogin = useCallback(() => {
    // Store current URL to return after login
    sessionStorage.setItem('returnTo', window.location.href);
    // Redirect to login page with return URL
    window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
  }, []);

  // ============================================================================
  // STEP HELPERS
  // ============================================================================
  const getStepHandler = useCallback((stepId) => {
    switch (stepId) {
      case 'A': return handleStepAClick;
      case 'B': return handleStepBClick;
      case 'C': return handleStepCClick;
      case 'D': return handleStepDClick;
      case 'E': return handleStepEClick;
      default: return () => {};
    }
  }, [handleStepAClick, handleStepBClick, handleStepCClick, handleStepDClick, handleStepEClick]);

  // ============================================================================
  // RETURN HOOK API
  // ============================================================================
  return {
    // Auth state
    authState,
    isAuthenticated,
    currentUser,
    currentDateTime,

    // Simulation state
    currentStep,
    totalSteps: TOTAL_STEPS,
    completedSteps,
    stepClicked,

    // Simulated data
    simulatedProposals,

    // UI state
    isLoading,
    loadingStep,
    toast: simulationState.toast,

    // Step handlers
    handleStepAClick,
    handleStepBClick,
    handleStepCClick,
    handleStepDClick,
    handleStepEClick,
    handleResetSimulation,

    // Utility
    handleLogin,
    getStepHandler,
    showToast,
    dismissToast,

    // Step validation
    canClickStep: (stepId) => canClickStep(stepId, currentStep),
    isStepCompleted: (stepId) => isStepCompleted(stepId, currentStep),
    getBetweenStepText,

    // Step configuration
    SIMULATION_STEPS,
    STEP_ORDER
  };
}

export default useSimulationHostsideDemoPageLogic;
