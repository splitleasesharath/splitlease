/**
 * Simulation Guestside Demo Page Logic Hook
 *
 * Follows the Hollow Component Pattern:
 * - ALL business logic is contained in this hook
 * - Page component only handles rendering
 *
 * This hook manages the complete guest-side usability simulation flow:
 * Step A: Mark as tester + Autofill Rental App
 * Step B: VM Invitation from Host #1
 * Step C: Branching (Accept vs Counteroffer)
 * Step D: Lease drafting
 * Step E: Signing & Payment
 *
 * Features:
 * - URL parameter persistence for reload resilience
 * - Progress tracking via user."Usability Step"
 * - Full email notifications (not suppressed)
 * - Local payment simulation
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { checkAuthStatus, validateTokenAndFetchUser } from '../../../lib/auth.js';
import { supabase } from '../../../lib/supabase.js';
import {
  SIMULATION_STEPS,
  USER_STEP_VALUES,
  DEFAULT_COUNTEROFFER,
  getCompletedSteps,
  canActivateStep
} from './constants/simulationSteps.js';

/**
 * Parse URL parameters for state persistence
 */
function parseURLParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    step: params.get('step') || 'login',
    path: params.get('path') ? parseInt(params.get('path'), 10) : null,
    code: params.get('code') || ''
  };
}

/**
 * Update URL parameters without page reload
 */
function updateURLParams(state) {
  const params = new URLSearchParams();
  if (state.currentStep && state.currentStep !== 'login') {
    params.set('step', state.currentStep);
  }
  if (state.selectedPath) {
    params.set('path', state.selectedPath.toString());
  }
  if (state.usabilityCode) {
    params.set('code', state.usabilityCode);
  }
  const newURL = params.toString() ? `?${params.toString()}` : window.location.pathname;
  window.history.replaceState({}, '', newURL);
}

/**
 * Main logic hook for the Simulation Guestside Demo Page
 */
export function useSimulationGuestsideDemoPageLogic() {
  // ============================================================================
  // AUTH STATE
  // ============================================================================
  const [authState, setAuthState] = useState({
    isChecking: true,
    isAuthenticated: false,
    shouldRedirect: false
  });

  // ============================================================================
  // USER STATE
  // ============================================================================
  const [currentUser, setCurrentUser] = useState(null);

  // ============================================================================
  // SIMULATION STATE
  // ============================================================================
  const urlParams = parseURLParams();

  const [simulationState, setSimulationState] = useState({
    // Progress tracking
    currentStep: urlParams.step,
    selectedPath: urlParams.path,
    completedSteps: [],

    // Test data references
    usabilityCode: urlParams.code,
    testListingIds: [],
    testProposalId: null,
    testLeaseId: null,

    // UI state
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
  const currentStep = simulationState.currentStep;
  const selectedPath = simulationState.selectedPath;
  const completedSteps = simulationState.completedSteps;
  const isLoading = simulationState.isLoading;
  const stepInProgress = simulationState.stepInProgress;
  const usabilityCode = simulationState.usabilityCode;

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
  // URL SYNC EFFECT
  // ============================================================================
  useEffect(() => {
    updateURLParams(simulationState);
  }, [simulationState.currentStep, simulationState.selectedPath, simulationState.usabilityCode]);

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
            isAuthenticated: false,
            shouldRedirect: false // Stay on page, show login prompt
          });
          return;
        }

        // Deep validation with user data fetch
        const userData = await validateTokenAndFetchUser({ clearOnFailure: false });

        if (userData) {
          setCurrentUser(userData);
          setAuthState({
            isChecking: false,
            isAuthenticated: true,
            shouldRedirect: false
          });

          // Restore progress from user's Usability Step if available
          await restoreProgressFromDatabase(userData);
        } else {
          // Fallback to session data
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            setCurrentUser({
              userId: session.user.user_metadata?.user_id || session.user.id,
              _id: session.user.user_metadata?.user_id || session.user.id,
              firstName: session.user.user_metadata?.first_name || session.user.email?.split('@')[0] || 'User',
              email: session.user.email
            });
            setAuthState({
              isChecking: false,
              isAuthenticated: true,
              shouldRedirect: false
            });
          } else {
            setAuthState({
              isChecking: false,
              isAuthenticated: false,
              shouldRedirect: false
            });
          }
        }
      } catch (err) {
        console.error('[SimulationGuestsideDemo] Auth check failed:', err);
        setAuthState({
          isChecking: false,
          isAuthenticated: false,
          shouldRedirect: false
        });
      }
    }

    checkAuth();
  }, []);

  // ============================================================================
  // RESTORE PROGRESS FROM DATABASE
  // ============================================================================
  const restoreProgressFromDatabase = async (user) => {
    try {
      const userId = user.userId || user._id;

      // Check if user is already a usability tester with progress
      const { data: userData, error } = await supabase
        .from('user')
        .select('"is usability tester", "Usability Step"')
        .eq('_id', userId)
        .single();

      if (error) {
        console.warn('[SimulationGuestsideDemo] Could not fetch user progress:', error);
        return;
      }

      if (userData?.['is usability tester'] && userData?.['Usability Step']) {
        const usabilityStep = userData['Usability Step'];
        console.log('[SimulationGuestsideDemo] Restoring progress from step:', usabilityStep);

        // Map database step to current step
        let restoredStep = 'A';
        if (usabilityStep >= 5) restoredStep = 'complete';
        else if (usabilityStep >= 4) restoredStep = 'E';
        else if (usabilityStep >= 3) restoredStep = 'D';
        else if (usabilityStep >= 2) restoredStep = 'C';
        else if (usabilityStep >= 1) restoredStep = 'B';

        // Restore completed steps
        const restored = getCompletedSteps(restoredStep, simulationState.selectedPath);

        setSimulationState(prev => ({
          ...prev,
          currentStep: restoredStep,
          completedSteps: restored
        }));
      }
    } catch (err) {
      console.error('[SimulationGuestsideDemo] Failed to restore progress:', err);
    }
  };

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
  // ERROR HANDLER
  // ============================================================================
  const handleStepError = useCallback((stepId, error) => {
    console.error(`[SimulationGuestsideDemo] Step ${stepId} failed:`, error);
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
  // STEP A: Mark as Usability Tester & Autofill Rental App
  // ============================================================================
  const handleStepA = useCallback(async () => {
    if (!currentUser) {
      showToast({ title: 'Not Authenticated', message: 'Please log in first', type: 'error' });
      return;
    }

    const userId = currentUser.userId || currentUser._id;
    setSimulationState(prev => ({ ...prev, isLoading: true, stepInProgress: 'A' }));

    try {
      // 1. Mark user as usability tester
      const { error: userError } = await supabase
        .from('user')
        .update({
          'is usability tester': true,
          'Usability Step': USER_STEP_VALUES.A
        })
        .eq('_id', userId);

      if (userError) throw userError;

      // 2. Create/update rental application via Edge Function
      const { data: rentalAppResult, error: appError } = await supabase.functions.invoke('proposal', {
        body: {
          action: 'createTestRentalApplication',
          payload: {
            userId: userId,
            isUsabilityTest: true,
            autofillData: {
              // Basic autofill data for testing
              firstName: currentUser.firstName || currentUser['Name - First'] || 'Test',
              lastName: currentUser.lastName || currentUser['Name - Last'] || 'User',
              email: currentUser.email,
              phone: '555-555-5555',
              occupation: 'Software Engineer',
              employer: 'Test Company',
              annualIncome: 100000
            }
          }
        }
      });

      if (appError) {
        console.warn('[SimulationGuestsideDemo] Rental app creation warning:', appError);
        // Continue even if rental app fails - it's not critical for the simulation
      }

      // 3. Update state
      setSimulationState(prev => ({
        ...prev,
        isLoading: false,
        stepInProgress: null,
        currentStep: 'B',
        completedSteps: [...prev.completedSteps, 'A']
      }));

      showToast({ title: 'Step A Complete', message: 'You are now marked as a usability tester', type: 'success' });

    } catch (error) {
      handleStepError('A', error);
    }
  }, [currentUser, showToast, handleStepError]);

  // ============================================================================
  // STEP B: Virtual Meeting Invitation from Host #1
  // ============================================================================
  const handleStepB = useCallback(async () => {
    if (!currentUser) return;

    const userId = currentUser.userId || currentUser._id;
    setSimulationState(prev => ({ ...prev, isLoading: true, stepInProgress: 'B' }));

    try {
      // 1. Get test listing for Host #1 (marked with isForUsability)
      const { data: testListings, error: listingError } = await supabase
        .from('listing')
        .select('_id, "Host User", "Name", "Cover Photo"')
        .eq('isForUsability', true)
        .limit(3);

      if (listingError) throw listingError;

      if (!testListings || testListings.length === 0) {
        throw new Error('No test listings found. Please contact admin to set up usability test listings.');
      }

      const testListing = testListings[0];
      console.log('[SimulationGuestsideDemo] Using test listing:', testListing._id);

      // 2. Create test proposal via Edge Function
      const { data: proposalResult, error: proposalError } = await supabase.functions.invoke('proposal', {
        body: {
          action: 'createTestProposal',
          payload: {
            guestId: userId,
            listingId: testListing._id,
            hostId: testListing['Host User'],
            isUsabilityTest: true,
            proposalData: {
              moveInStart: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week from now
              moveInEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 weeks from now
              moveOut: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 months from now
              nightsPerWeek: 4,
              checkInDay: 2, // Tuesday (0-indexed)
              checkOutDay: 6, // Saturday (0-indexed)
              nightlyPrice: 125
            }
          }
        }
      });

      if (proposalError) throw proposalError;

      const proposalId = proposalResult?.proposalId || proposalResult?.data?.proposalId;

      // 3. Schedule virtual meeting
      const { error: vmError } = await supabase.functions.invoke('bubble-proxy', {
        body: {
          action: 'scheduleVirtualMeeting',
          payload: {
            proposalId: proposalId,
            hostId: testListing['Host User'],
            guestId: userId,
            isUsabilityTest: true
          }
        }
      });

      if (vmError) {
        console.warn('[SimulationGuestsideDemo] VM scheduling warning:', vmError);
        // Continue - VM is not critical for simulation flow
      }

      // 4. Update user step
      await supabase
        .from('user')
        .update({ 'Usability Step': USER_STEP_VALUES.B })
        .eq('_id', userId);

      // 5. Update state
      setSimulationState(prev => ({
        ...prev,
        isLoading: false,
        stepInProgress: null,
        currentStep: 'C',
        completedSteps: [...prev.completedSteps, 'B'],
        testListingIds: testListings.map(l => l._id),
        testProposalId: proposalId
      }));

      showToast({
        title: 'Step B Complete',
        message: 'Virtual meeting invitation sent from Host #1',
        type: 'success'
      });

    } catch (error) {
      handleStepError('B', error);
    }
  }, [currentUser, showToast, handleStepError]);

  // ============================================================================
  // STEP C: Branching Paths
  // ============================================================================

  /**
   * Path 1 (Ending 1): Host #2 Accepts Proposal
   */
  const handleStepC_Ending1 = useCallback(async () => {
    if (!currentUser) return;

    const userId = currentUser.userId || currentUser._id;
    setSimulationState(prev => ({
      ...prev,
      isLoading: true,
      stepInProgress: 'C1',
      selectedPath: 1
    }));

    try {
      // 1. Accept the proposal via Edge Function
      const { error: acceptError } = await supabase.functions.invoke('proposal', {
        body: {
          action: 'acceptProposal',
          payload: {
            proposalId: simulationState.testProposalId,
            isUsabilityTest: true,
            hostPersona: 'Host #2'
          }
        }
      });

      if (acceptError) throw acceptError;

      // 2. Update user step
      await supabase
        .from('user')
        .update({ 'Usability Step': USER_STEP_VALUES.C })
        .eq('_id', userId);

      // 3. Update state
      setSimulationState(prev => ({
        ...prev,
        isLoading: false,
        stepInProgress: null,
        currentStep: 'D',
        completedSteps: [...prev.completedSteps, 'C1']
      }));

      showToast({
        title: 'Path 1 Selected',
        message: 'Host #2 has accepted your proposal',
        type: 'success'
      });

    } catch (error) {
      handleStepError('C1', error);
    }
  }, [currentUser, simulationState.testProposalId, showToast, handleStepError]);

  /**
   * Path 2 (Ending 2): Host #3 Counteroffers, Guest Accepts
   */
  const handleStepC_Ending2 = useCallback(async () => {
    if (!currentUser) return;

    const userId = currentUser.userId || currentUser._id;
    setSimulationState(prev => ({
      ...prev,
      isLoading: true,
      stepInProgress: 'C2',
      selectedPath: 2
    }));

    try {
      // 1. Create counteroffer via Edge Function
      const { error: counterError } = await supabase.functions.invoke('proposal', {
        body: {
          action: 'createCounteroffer',
          payload: {
            proposalId: simulationState.testProposalId,
            counterofferData: {
              'hc nightly price': DEFAULT_COUNTEROFFER.nightlyPrice,
              'hc nights per week': DEFAULT_COUNTEROFFER.nightsPerWeek,
              'hc check in day': DEFAULT_COUNTEROFFER.checkInDay,
              'hc check out day': DEFAULT_COUNTEROFFER.checkOutDay
            },
            isUsabilityTest: true,
            hostPersona: 'Host #3'
          }
        }
      });

      if (counterError) throw counterError;

      // 2. Guest accepts counteroffer
      const { error: acceptError } = await supabase.functions.invoke('proposal', {
        body: {
          action: 'acceptCounteroffer',
          payload: {
            proposalId: simulationState.testProposalId,
            isUsabilityTest: true
          }
        }
      });

      if (acceptError) throw acceptError;

      // 3. Update user step
      await supabase
        .from('user')
        .update({ 'Usability Step': USER_STEP_VALUES.C })
        .eq('_id', userId);

      // 4. Update state
      setSimulationState(prev => ({
        ...prev,
        isLoading: false,
        stepInProgress: null,
        currentStep: 'D',
        completedSteps: [...prev.completedSteps, 'C2']
      }));

      showToast({
        title: 'Path 2 Selected',
        message: 'You accepted Host #3\'s counteroffer',
        type: 'success'
      });

    } catch (error) {
      handleStepError('C2', error);
    }
  }, [currentUser, simulationState.testProposalId, showToast, handleStepError]);

  // ============================================================================
  // STEP D: Drafting Lease & House Manual
  // ============================================================================
  const handleStepD = useCallback(async (ending) => {
    if (!currentUser) return;

    const userId = currentUser.userId || currentUser._id;
    const stepId = `D${ending}`;
    setSimulationState(prev => ({ ...prev, isLoading: true, stepInProgress: stepId }));

    try {
      // 1. Create lease record via Edge Function
      const { data: leaseResult, error: leaseError } = await supabase.functions.invoke('bubble-proxy', {
        body: {
          action: 'createLease',
          payload: {
            proposalId: simulationState.testProposalId,
            isUsabilityTest: true
          }
        }
      });

      if (leaseError) throw leaseError;

      const leaseId = leaseResult?.leaseId || leaseResult?.data?.leaseId;

      // 2. Generate lease documents (simulated)
      const { error: docsError } = await supabase.functions.invoke('bubble-proxy', {
        body: {
          action: 'generateLeaseDocuments',
          payload: {
            leaseId: leaseId,
            isUsabilityTest: true
          }
        }
      });

      if (docsError) {
        console.warn('[SimulationGuestsideDemo] Lease docs warning:', docsError);
        // Continue - not critical
      }

      // 3. Update proposal status directly
      await supabase
        .from('proposal')
        .update({ Status: 'Lease Documents Sent for Review' })
        .eq('_id', simulationState.testProposalId);

      // 4. Update user step
      await supabase
        .from('user')
        .update({ 'Usability Step': USER_STEP_VALUES.D })
        .eq('_id', userId);

      // 5. Update state
      setSimulationState(prev => ({
        ...prev,
        isLoading: false,
        stepInProgress: null,
        currentStep: 'E',
        completedSteps: [...prev.completedSteps, stepId],
        testLeaseId: leaseId
      }));

      showToast({
        title: 'Step D Complete',
        message: 'Lease documents created and sent for review',
        type: 'success'
      });

    } catch (error) {
      handleStepError(stepId, error);
    }
  }, [currentUser, simulationState.testProposalId, showToast, handleStepError]);

  // ============================================================================
  // STEP E: Signing & Initial Payment
  // ============================================================================
  const handleStepE = useCallback(async (ending) => {
    if (!currentUser) return;

    const userId = currentUser.userId || currentUser._id;
    const stepId = `E${ending}`;
    setSimulationState(prev => ({ ...prev, isLoading: true, stepInProgress: stepId }));

    try {
      // 1. Simulate lease signing
      if (simulationState.testLeaseId) {
        await supabase
          .from('bookings_leases')
          .update({ 'Lease signed?': true })
          .eq('_id', simulationState.testLeaseId);
      }

      // 2. Update proposal status for signing
      await supabase
        .from('proposal')
        .update({ Status: 'Lease Documents Signed / Awaiting Initial payment' })
        .eq('_id', simulationState.testProposalId);

      // 3. Simulate payment (local simulation as per requirements)
      const { error: paymentError } = await supabase.functions.invoke('bubble-proxy', {
        body: {
          action: 'processTestPayment',
          payload: {
            leaseId: simulationState.testLeaseId,
            proposalId: simulationState.testProposalId,
            isUsabilityTest: true,
            amount: 1000, // Simulated amount
            paymentMethod: 'test_local_simulation'
          }
        }
      });

      if (paymentError) {
        console.warn('[SimulationGuestsideDemo] Payment simulation warning:', paymentError);
        // Continue - we'll update status anyway for the simulation
      }

      // 4. Activate lease
      await supabase
        .from('proposal')
        .update({ Status: 'Initial Payment Submitted / Lease activated' })
        .eq('_id', simulationState.testProposalId);

      if (simulationState.testLeaseId) {
        await supabase
          .from('bookings_leases')
          .update({ 'Lease Status': 'Active' })
          .eq('_id', simulationState.testLeaseId);
      }

      // 5. Update user step
      await supabase
        .from('user')
        .update({ 'Usability Step': USER_STEP_VALUES.complete })
        .eq('_id', userId);

      // 6. Update state
      setSimulationState(prev => ({
        ...prev,
        isLoading: false,
        stepInProgress: null,
        currentStep: 'complete',
        completedSteps: [...prev.completedSteps, stepId]
      }));

      showToast({
        title: 'Simulation Complete!',
        message: 'Congratulations! You have completed the guest-side rental journey.',
        type: 'success'
      });

    } catch (error) {
      handleStepError(stepId, error);
    }
  }, [currentUser, simulationState.testProposalId, simulationState.testLeaseId, showToast, handleStepError]);

  // ============================================================================
  // RESET SIMULATION
  // ============================================================================
  const handleReset = useCallback(async () => {
    if (!currentUser) return;

    const userId = currentUser.userId || currentUser._id;

    try {
      // Reset user's usability tester status
      await supabase
        .from('user')
        .update({
          'is usability tester': false,
          'Usability Step': null
        })
        .eq('_id', userId);

      // Clear URL params and state
      window.history.replaceState({}, '', window.location.pathname);

      setSimulationState({
        currentStep: 'A',
        selectedPath: null,
        completedSteps: [],
        usabilityCode: '',
        testListingIds: [],
        testProposalId: null,
        testLeaseId: null,
        isLoading: false,
        stepInProgress: null,
        error: null,
        toast: null
      });

      showToast({
        title: 'Simulation Reset',
        message: 'You can start the simulation again',
        type: 'info'
      });

    } catch (error) {
      console.error('[SimulationGuestsideDemo] Reset failed:', error);
    }
  }, [currentUser, showToast]);

  // ============================================================================
  // USABILITY CODE HANDLER
  // ============================================================================
  const setUsabilityCode = useCallback((code) => {
    setSimulationState(prev => ({ ...prev, usabilityCode: code }));
  }, []);

  // ============================================================================
  // LOGIN REDIRECT
  // ============================================================================
  const handleLogin = useCallback(() => {
    // Store current URL to return after login
    sessionStorage.setItem('returnTo', window.location.href);
    // Trigger login modal or redirect to login page
    // For now, we'll use the Header's built-in login functionality
    window.dispatchEvent(new CustomEvent('openLoginModal'));
  }, []);

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
    selectedPath,
    completedSteps,
    usabilityCode,
    isLoading,
    stepInProgress,

    // Test data references
    testProposalId: simulationState.testProposalId,
    testLeaseId: simulationState.testLeaseId,

    // Toast state
    toast: simulationState.toast,

    // Handlers
    handleLogin,
    handleStepA,
    handleStepB,
    handleStepC_Ending1,
    handleStepC_Ending2,
    handleStepD,
    handleStepE,
    handleReset,

    // Utility handlers
    setUsabilityCode,
    showToast,
    dismissToast,

    // Step validation
    canActivateStep: (stepId) => canActivateStep(stepId, completedSteps, selectedPath)
  };
}

export default useSimulationGuestsideDemoPageLogic;
