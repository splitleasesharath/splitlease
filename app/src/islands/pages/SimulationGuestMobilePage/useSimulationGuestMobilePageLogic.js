/**
 * Simulation Guest Mobile Page Logic Hook
 *
 * Manages all state and business logic for the guest simulation workflow.
 * Follows the Hollow Component Pattern - the page component contains ONLY JSX.
 *
 * State Organization:
 * - authState: Authentication status and user data
 * - currentStep: 0-6 (0 = pre-start, 1-6 = steps A-F)
 * - stepStatuses: { A: 'pending'|'active'|'completed', ... }
 * - simulationData: Runtime simulation data (proposals, lease, etc.)
 * - UI state: loading, errors, mobile confirmation
 *
 * Step Numbering:
 * - Steps A-F are displayed as numbers 7-12 (continuing from Day 1 simulation)
 * - Internally tracked as steps 1-6 in currentStep
 *
 * @module islands/pages/SimulationGuestMobilePage/useSimulationGuestMobilePageLogic
 */

import { useState, useEffect, useCallback } from 'react';
import { checkAuthStatus, validateTokenAndFetchUser, getUserType } from '../../../lib/auth.js';
import { supabase } from '../../../lib/supabase.js';
import * as simulationService from '../../../lib/simulationGuestService.js';
import { canProgressToStep, getNextStepId } from '../../../logic/rules/simulation/canProgressToStep.js';
import { selectProposalByScheduleType } from '../../../logic/processors/simulation/selectProposalByScheduleType.js';

/**
 * Initial step statuses - all pending before simulation starts
 */
const INITIAL_STEP_STATUSES = {
  A: 'pending',
  B: 'pending',
  C: 'pending',
  D: 'pending',
  E: 'pending',
  F: 'pending'
};

/**
 * Main logic hook for Guest Simulation Mobile Page
 * @returns {Object} All state and handlers for the page
 */
export function useSimulationGuestMobilePageLogic() {
  // ============================================================================
  // AUTH STATE
  // ============================================================================

  const [authState, setAuthState] = useState({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    userType: null
  });

  // ============================================================================
  // SIMULATION STATE
  // ============================================================================

  const [currentStep, setCurrentStep] = useState(0);
  const [stepStatuses, setStepStatuses] = useState(INITIAL_STEP_STATUSES);
  const [simulationData, setSimulationData] = useState({
    simulationId: null,
    proposals: [],
    selectedProposal: null,
    lease: null,
    houseManual: null,
    dateChangeRequest: null
  });

  // ============================================================================
  // UI STATE
  // ============================================================================

  const [mobileConfirmed, setMobileConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState(null);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  // ============================================================================
  // AUTH CHECK ON MOUNT
  // ============================================================================

  useEffect(() => {
    async function checkAuth() {
      console.log('🔐 Simulation Guest: Checking authentication...');

      try {
        // Step 1: Lightweight auth check
        const hasAuth = await checkAuthStatus();

        if (!hasAuth) {
          console.log('❌ User not authenticated, redirecting to home');
          setAuthState(prev => ({
            ...prev,
            isLoading: false,
            isAuthenticated: false
          }));
          window.location.href = '/';
          return;
        }

        // Step 2: Validate token and fetch user data
        const userData = await validateTokenAndFetchUser({ clearOnFailure: false });

        let userType = null;
        let effectiveUser = userData;

        if (userData) {
          userType = userData.userType;
          console.log('✅ User data loaded, userType:', userType);
        } else {
          // Fallback: Check Supabase session
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            userType = session.user.user_metadata?.user_type || getUserType();
            console.log('⚠️ Using fallback session data, userType:', userType);

            effectiveUser = {
              _id: session.user.user_metadata?.user_id || session.user.id,
              email: session.user.email,
              firstName: session.user.user_metadata?.first_name || 'User'
            };
          } else {
            console.log('❌ No valid session, redirecting');
            window.location.href = '/';
            return;
          }
        }

        // Check if user is a Guest (required for this simulation)
        const isGuest = userType === 'Guest' || userType?.includes?.('Guest');

        if (!isGuest) {
          console.log('❌ User is not a Guest, redirecting to home');
          window.location.href = '/';
          return;
        }

        setAuthState({
          isLoading: false,
          isAuthenticated: true,
          user: effectiveUser,
          userType
        });

      } catch (err) {
        console.error('Auth check failed:', err);
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          isAuthenticated: false
        }));
        window.location.href = '/';
      }
    }

    checkAuth();
  }, []);

  // ============================================================================
  // DATETIME UPDATE INTERVAL
  // ============================================================================

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // ============================================================================
  // SIMULATION HANDLERS
  // ============================================================================

  /**
   * Start the simulation
   * Initializes test data and activates Step A
   */
  const handleStartSimulation = useCallback(async () => {
    if (!mobileConfirmed) return;

    setIsLoading(true);
    setLoadingMessage('Initializing simulation...');
    setError(null);

    try {
      const initData = await simulationService.initializeSimulation({
        guestId: authState.user._id || authState.user.userId
      });

      setSimulationData(prev => ({
        ...prev,
        simulationId: initData.simulationId,
        proposals: initData.proposals || []
      }));

      setCurrentStep(1);
      setStepStatuses(prev => ({ ...prev, A: 'active' }));

      console.log('✅ Simulation initialized:', initData.simulationId);
    } catch (err) {
      console.error('Failed to initialize simulation:', err);
      setError(err.message || 'Failed to initialize simulation');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [mobileConfirmed, authState.user]);

  /**
   * Step A: Lease Documents Signed
   * Simulates the guest signing lease documents
   */
  const handleStepA = useCallback(async () => {
    if (!canProgressToStep('A', stepStatuses)) return;

    setIsLoading(true);
    setLoadingMessage('Signing lease documents...');

    try {
      // Select a proposal (use nightly type for simulation)
      const selectedProposal = selectProposalByScheduleType(
        simulationData.proposals,
        'nightly'
      );

      if (!selectedProposal) {
        throw new Error('No proposals available for simulation');
      }

      const result = await simulationService.stepALeaseDocuments({
        simulationId: simulationData.simulationId,
        proposalId: selectedProposal._id || selectedProposal.id
      });

      setSimulationData(prev => ({
        ...prev,
        selectedProposal,
        lease: result.lease
      }));

      setStepStatuses(prev => ({
        ...prev,
        A: 'completed',
        B: 'active'
      }));
      setCurrentStep(2);

      console.log('✅ Step A completed: Lease signed');
    } catch (err) {
      console.error('Step A failed:', err);
      setError(err.message || 'Failed to complete Step A');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [simulationData, stepStatuses]);

  /**
   * Step B: Receive House Manual
   * Simulates receiving the house manual from the host
   */
  const handleStepB = useCallback(async () => {
    if (!canProgressToStep('B', stepStatuses)) return;

    setIsLoading(true);
    setLoadingMessage('Receiving house manual...');

    try {
      const result = await simulationService.stepBHouseManual({
        simulationId: simulationData.simulationId,
        leaseId: simulationData.lease?._id || simulationData.lease?.id
      });

      setSimulationData(prev => ({
        ...prev,
        houseManual: result.houseManual
      }));

      setStepStatuses(prev => ({
        ...prev,
        B: 'completed',
        C: 'active'
      }));
      setCurrentStep(3);

      console.log('✅ Step B completed: House manual received');
    } catch (err) {
      console.error('Step B failed:', err);
      setError(err.message || 'Failed to complete Step B');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [simulationData, stepStatuses]);

  /**
   * Step C: Date Change Request
   * Simulates a host-initiated date change that guest must handle
   */
  const handleStepC = useCallback(async () => {
    if (!canProgressToStep('C', stepStatuses)) return;

    setIsLoading(true);
    setLoadingMessage('Processing date change request...');

    try {
      const result = await simulationService.stepCDateChange({
        simulationId: simulationData.simulationId,
        leaseId: simulationData.lease?._id || simulationData.lease?.id
      });

      setSimulationData(prev => ({
        ...prev,
        dateChangeRequest: result.dateChangeRequest
      }));

      setStepStatuses(prev => ({
        ...prev,
        C: 'completed',
        D: 'active'
      }));
      setCurrentStep(4);

      console.log('✅ Step C completed: Date change handled');
    } catch (err) {
      console.error('Step C failed:', err);
      setError(err.message || 'Failed to complete Step C');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [simulationData, stepStatuses]);

  /**
   * Step D: Lease Reaching End
   * Simulates the lease approaching its end date
   */
  const handleStepD = useCallback(async () => {
    if (!canProgressToStep('D', stepStatuses)) return;

    setIsLoading(true);
    setLoadingMessage('Viewing lease ending details...');

    try {
      const result = await simulationService.stepDLeaseEnding({
        simulationId: simulationData.simulationId,
        leaseId: simulationData.lease?._id || simulationData.lease?.id
      });

      setStepStatuses(prev => ({
        ...prev,
        D: 'completed',
        E: 'active'
      }));
      setCurrentStep(5);

      console.log('✅ Step D completed: Lease ending viewed');
    } catch (err) {
      console.error('Step D failed:', err);
      setError(err.message || 'Failed to complete Step D');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [simulationData, stepStatuses]);

  /**
   * Step E: Host Sent SMS
   * Simulates receiving an SMS notification from the host
   */
  const handleStepE = useCallback(async () => {
    if (!canProgressToStep('E', stepStatuses)) return;

    setIsLoading(true);
    setLoadingMessage('Reading host message...');

    try {
      const result = await simulationService.stepEHostSms({
        simulationId: simulationData.simulationId
      });

      setStepStatuses(prev => ({
        ...prev,
        E: 'completed',
        F: 'active'
      }));
      setCurrentStep(6);

      console.log('✅ Step E completed: Host SMS read');
    } catch (err) {
      console.error('Step E failed:', err);
      setError(err.message || 'Failed to complete Step E');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [simulationData, stepStatuses]);

  /**
   * Step F: Finish Simulation
   * Completes the usability test simulation
   */
  const handleStepF = useCallback(async () => {
    if (!canProgressToStep('F', stepStatuses)) return;

    setIsLoading(true);
    setLoadingMessage('Completing simulation...');

    try {
      const result = await simulationService.stepFComplete({
        simulationId: simulationData.simulationId
      });

      setStepStatuses(prev => ({
        ...prev,
        F: 'completed'
      }));

      console.log('✅ Simulation complete!');
    } catch (err) {
      console.error('Step F failed:', err);
      setError(err.message || 'Failed to complete simulation');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [simulationData, stepStatuses]);

  /**
   * Cleanup simulation data
   * Removes all test data and resets the simulation
   */
  const handleCleanup = useCallback(async () => {
    if (!simulationData.simulationId) return;

    setIsLoading(true);
    setLoadingMessage('Cleaning up test data...');

    try {
      await simulationService.cleanup({
        simulationId: simulationData.simulationId
      });

      // Reset all state
      setCurrentStep(0);
      setStepStatuses(INITIAL_STEP_STATUSES);
      setSimulationData({
        simulationId: null,
        proposals: [],
        selectedProposal: null,
        lease: null,
        houseManual: null,
        dateChangeRequest: null
      });
      setMobileConfirmed(false);
      setError(null);

      console.log('✅ Simulation cleaned up');
    } catch (err) {
      console.error('Cleanup failed:', err);
      setError(err.message || 'Failed to cleanup simulation');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [simulationData.simulationId]);

  // ============================================================================
  // RETURN API
  // ============================================================================

  return {
    // Auth state
    authState,

    // Simulation state
    currentStep,
    stepStatuses,
    simulationData,

    // UI state
    mobileConfirmed,
    isLoading,
    loadingMessage,
    error,
    currentDateTime,

    // Handlers
    handleMobileConfirmChange: setMobileConfirmed,
    handleStartSimulation,
    handleStepA,
    handleStepB,
    handleStepC,
    handleStepD,
    handleStepE,
    handleStepF,
    handleCleanup,
    clearError: () => setError(null)
  };
}
