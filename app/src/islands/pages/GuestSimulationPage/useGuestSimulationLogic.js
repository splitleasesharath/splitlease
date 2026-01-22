/**
 * useGuestSimulationLogic - Day 1 Guest Proposal Simulation Logic Hook
 *
 * Manages all state and business logic for the guest proposal simulation workflow.
 * Follows the Hollow Component Pattern - the page component contains ONLY JSX.
 *
 * State Organization:
 * - authState: Authentication status and user data
 * - currentStep: 0-6 (0 = pre-start, 1-6 = steps A-F)
 * - stepStatuses: { A: 'pending'|'active'|'completed', ... }
 * - simulationData: Runtime simulation data (proposals, results, etc.)
 * - UI state: loading, errors, mobile confirmation
 *
 * Steps correspond to Bubble's "simulation-guest-proposals-mobile-day1" page:
 *   Step A (1): Mark as Usability Tester
 *   Step B (2): Receive 2 Suggested Proposals
 *   Step C (3): Receive Counteroffer from Host
 *   Step D (4): Email Response (disabled - not implemented in original)
 *   Step E (5): Virtual Meeting from Host
 *   Step F (6): Acceptance of 2 Proposals
 *
 * @module islands/pages/GuestSimulationPage/useGuestSimulationLogic
 */

import { useState, useEffect, useCallback } from 'react';
import { checkAuthStatus, validateTokenAndFetchUser, loginUser, getSessionId } from '../../../lib/auth.js';
import { supabase } from '../../../lib/supabase.js';
import { showToast } from '../../shared/Toast.jsx';

/**
 * Initial step statuses - all pending before simulation starts
 */
const INITIAL_STEP_STATUSES = {
  A: 'pending',
  B: 'pending',
  C: 'pending',
  D: 'disabled', // Step D is not implemented
  E: 'pending',
  F: 'pending'
};

/**
 * Main logic hook for Guest Simulation Page (Day 1)
 * @returns {Object} All state and handlers for the page
 */
export function useGuestSimulationLogic() {
  // ============================================================================
  // AUTH STATE
  // ============================================================================

  const [authState, setAuthState] = useState({
    isLoading: true,
    isAuthenticated: false,
    user: null
  });

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // ============================================================================
  // SIMULATION STATE
  // ============================================================================

  const [currentStep, setCurrentStep] = useState(0);
  const [stepStatuses, setStepStatuses] = useState(INITIAL_STEP_STATUSES);
  const [simulationData, setSimulationData] = useState({
    userId: null,
    proposals: [],
    stepAResult: null,
    stepBResult: null,
    stepCResult: null,
    stepEResult: null,
    stepFResult: null
  });

  // ============================================================================
  // UI STATE
  // ============================================================================

  const [mobileConfirmed, setMobileConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState(null);

  // ============================================================================
  // AUTH CHECK ON MOUNT
  // ============================================================================

  useEffect(() => {
    async function checkAuth() {
      console.log('🔐 Guest Simulation: Checking authentication...');

      try {
        // Step 1: Lightweight auth check
        const hasAuth = await checkAuthStatus();

        if (!hasAuth) {
          console.log('ℹ️ User not authenticated - showing login form');
          setAuthState({
            isLoading: false,
            isAuthenticated: false,
            user: null
          });
          return;
        }

        // Step 2: Validate token and fetch user data
        const userData = await validateTokenAndFetchUser({ clearOnFailure: false });

        if (userData) {
          console.log('✅ User authenticated:', userData.email);
          setAuthState({
            isLoading: false,
            isAuthenticated: true,
            user: userData
          });
          setSimulationData(prev => ({
            ...prev,
            userId: userData.userId
          }));
        } else {
          // Fallback: Check Supabase session
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            const userId = session.user.user_metadata?.user_id || session.user.id;
            console.log('⚠️ Using fallback session data');

            setAuthState({
              isLoading: false,
              isAuthenticated: true,
              user: {
                userId,
                email: session.user.email,
                firstName: session.user.user_metadata?.first_name || 'User'
              }
            });
            setSimulationData(prev => ({
              ...prev,
              userId
            }));
          } else {
            console.log('ℹ️ No valid session - showing login form');
            setAuthState({
              isLoading: false,
              isAuthenticated: false,
              user: null
            });
          }
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        setAuthState({
          isLoading: false,
          isAuthenticated: false,
          user: null
        });
      }
    }

    checkAuth();
  }, []);

  // ============================================================================
  // AUTH HANDLERS
  // ============================================================================

  const handleEmailChange = useCallback((e) => {
    setLoginEmail(e.target.value);
    setLoginError('');
  }, []);

  const handlePasswordChange = useCallback((e) => {
    setLoginPassword(e.target.value);
    setLoginError('');
  }, []);

  const handleLogin = useCallback(async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError('');

    try {
      const result = await loginUser(loginEmail, loginPassword);

      if (result.success) {
        // Fetch user data after login
        const userData = await validateTokenAndFetchUser({ clearOnFailure: false });

        setAuthState({
          isLoading: false,
          isAuthenticated: true,
          user: userData || {
            userId: result.user_id,
            email: loginEmail,
            firstName: 'User'
          }
        });

        setSimulationData(prev => ({
          ...prev,
          userId: result.user_id
        }));

        showToast({ title: 'Login successful', type: 'success' });
      } else {
        setLoginError(result.error || 'Login failed. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setLoginError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [loginEmail, loginPassword]);

  // ============================================================================
  // SIMULATION HANDLERS
  // ============================================================================

  /**
   * Step A: Mark as Usability Tester
   * Updates user.is_usability_tester = true
   */
  const handleStepA = useCallback(async () => {
    if (!mobileConfirmed && currentStep === 0) {
      showToast({ title: 'Please confirm you are testing on mobile', type: 'warning' });
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Step A: Marking as usability tester...');
    setError(null);

    try {
      const userId = simulationData.userId || getSessionId();

      if (!userId) {
        throw new Error('User ID not found');
      }

      // Update user record in Supabase
      const { error: updateError } = await supabase
        .from('user')
        .update({ 'is usability tester': true })
        .eq('_id', userId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      const timestamp = new Date().toLocaleTimeString();
      setSimulationData(prev => ({
        ...prev,
        stepAResult: { success: true, message: `Marked as tester at ${timestamp}` }
      }));

      setStepStatuses(prev => ({
        ...prev,
        A: 'completed',
        B: 'active'
      }));
      setCurrentStep(1);

      showToast({ title: 'Step A Complete', content: 'Marked as usability tester', type: 'success' });
      console.log('✅ Step A completed');
    } catch (err) {
      console.error('Step A failed:', err);
      setError(err.message || 'Failed to complete Step A');
      setSimulationData(prev => ({
        ...prev,
        stepAResult: { success: false, message: err.message }
      }));
      showToast({ title: 'Step A Failed', content: err.message, type: 'error' });
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [mobileConfirmed, currentStep, simulationData.userId]);

  /**
   * Step B: Receive 2 Suggested Proposals
   * Creates 2 test proposals linked to usability test listings
   */
  const handleStepB = useCallback(async () => {
    if (stepStatuses.B !== 'active') return;

    setIsLoading(true);
    setLoadingMessage('Step B: Creating test proposals...');
    setError(null);

    try {
      const userId = simulationData.userId || getSessionId();

      if (!userId) {
        throw new Error('User ID not found');
      }

      // Find usability test listings
      const { data: listings, error: listingError } = await supabase
        .from('listing')
        .select('_id, Title, "Neighborhood (Text)"')
        .eq('isForUsability', true)
        .eq('Active', true)
        .limit(2);

      if (listingError) {
        throw new Error(listingError.message);
      }

      if (!listings || listings.length < 2) {
        throw new Error('Not enough usability test listings found. Need at least 2 listings with isForUsability = true.');
      }

      // Create 2 test proposals
      const proposalPromises = listings.slice(0, 2).map(async (listing, index) => {
        const proposalData = {
          guest: userId,
          listing: listing._id,
          Status: 'Suggested',
          'Days of Week Count': 7,
          check_in_day_index: 0, // Sunday
          check_out_day_index: 6, // Saturday
          'Reservation Length (weeks)': 4,
          'Price Per Night (GC Guest pays)': 150 + (index * 25),
          isForUsability: true
        };

        const { data, error: proposalError } = await supabase
          .from('proposal')
          .insert(proposalData)
          .select('_id, Status, listing')
          .single();

        if (proposalError) {
          throw new Error(`Failed to create proposal ${index + 1}: ${proposalError.message}`);
        }

        return data;
      });

      const createdProposals = await Promise.all(proposalPromises);

      const timestamp = new Date().toLocaleTimeString();
      setSimulationData(prev => ({
        ...prev,
        proposals: createdProposals,
        stepBResult: {
          success: true,
          message: `Created proposals ${createdProposals.map(p => p._id).join(', ')} at ${timestamp}`
        }
      }));

      setStepStatuses(prev => ({
        ...prev,
        B: 'completed',
        C: 'active'
      }));
      setCurrentStep(2);

      showToast({ title: 'Step B Complete', content: `Created ${createdProposals.length} test proposals`, type: 'success' });
      console.log('✅ Step B completed:', createdProposals);
    } catch (err) {
      console.error('Step B failed:', err);
      setError(err.message || 'Failed to complete Step B');
      setSimulationData(prev => ({
        ...prev,
        stepBResult: { success: false, message: err.message }
      }));
      showToast({ title: 'Step B Failed', content: err.message, type: 'error' });
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [stepStatuses.B, simulationData.userId]);

  /**
   * Step C: Receive Counteroffer from Host
   * Updates first proposal with hc_* (host counter-offer) fields
   */
  const handleStepC = useCallback(async () => {
    if (stepStatuses.C !== 'active') return;

    setIsLoading(true);
    setLoadingMessage('Step C: Applying host counteroffer...');
    setError(null);

    try {
      const firstProposal = simulationData.proposals[0];

      if (!firstProposal) {
        throw new Error('No proposals found from Step B');
      }

      // Apply counter-offer fields to first proposal
      const counterOfferData = {
        Status: 'Host Counter-Offered',
        'hc_Days of Week Count': 5,
        hc_check_in_day_index: 1, // Monday
        hc_check_out_day_index: 5, // Friday
        'hc_Price Per Night': 175,
        'hc_Reservation Length': 8
      };

      const { error: updateError } = await supabase
        .from('proposal')
        .update(counterOfferData)
        .eq('_id', firstProposal._id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      const timestamp = new Date().toLocaleTimeString();
      setSimulationData(prev => ({
        ...prev,
        stepCResult: {
          success: true,
          message: `Counteroffer applied to proposal ${firstProposal._id} at ${timestamp}`
        }
      }));

      // Skip to Step E since Step D is disabled
      setStepStatuses(prev => ({
        ...prev,
        C: 'completed',
        E: 'active'
      }));
      setCurrentStep(4); // Jump to step 4 (E) since D is disabled

      showToast({ title: 'Step C Complete', content: 'Counteroffer applied', type: 'success' });
      console.log('✅ Step C completed');
    } catch (err) {
      console.error('Step C failed:', err);
      setError(err.message || 'Failed to complete Step C');
      setSimulationData(prev => ({
        ...prev,
        stepCResult: { success: false, message: err.message }
      }));
      showToast({ title: 'Step C Failed', content: err.message, type: 'error' });
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [stepStatuses.C, simulationData.proposals]);

  /**
   * Step E: Virtual Meeting from Host
   * Sets virtual_meeting fields on proposal
   */
  const handleStepE = useCallback(async () => {
    if (stepStatuses.E !== 'active') return;

    setIsLoading(true);
    setLoadingMessage('Step E: Scheduling virtual meeting...');
    setError(null);

    try {
      const firstProposal = simulationData.proposals[0];

      if (!firstProposal) {
        throw new Error('No proposals found');
      }

      // Set virtual meeting fields
      const meetingData = {
        'virtual meeting': true,
        'virtual meeting confirmed': true,
        'virtual meeting date': new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Tomorrow
      };

      const { error: updateError } = await supabase
        .from('proposal')
        .update(meetingData)
        .eq('_id', firstProposal._id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      const timestamp = new Date().toLocaleTimeString();
      setSimulationData(prev => ({
        ...prev,
        stepEResult: {
          success: true,
          message: `Virtual meeting scheduled at ${timestamp}`
        }
      }));

      setStepStatuses(prev => ({
        ...prev,
        E: 'completed',
        F: 'active'
      }));
      setCurrentStep(5);

      showToast({ title: 'Step E Complete', content: 'Virtual meeting scheduled', type: 'success' });
      console.log('✅ Step E completed');
    } catch (err) {
      console.error('Step E failed:', err);
      setError(err.message || 'Failed to complete Step E');
      setSimulationData(prev => ({
        ...prev,
        stepEResult: { success: false, message: err.message }
      }));
      showToast({ title: 'Step E Failed', content: err.message, type: 'error' });
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [stepStatuses.E, simulationData.proposals]);

  /**
   * Step F: Acceptance of 2 Proposals
   * Updates both proposals to Status = 'Accepted'
   */
  const handleStepF = useCallback(async () => {
    if (stepStatuses.F !== 'active') return;

    setIsLoading(true);
    setLoadingMessage('Step F: Accepting proposals...');
    setError(null);

    try {
      const { proposals } = simulationData;

      if (!proposals || proposals.length === 0) {
        throw new Error('No proposals found');
      }

      // Accept all proposals
      const proposalIds = proposals.map(p => p._id);

      const { error: updateError } = await supabase
        .from('proposal')
        .update({ Status: 'Accepted' })
        .in('_id', proposalIds);

      if (updateError) {
        throw new Error(updateError.message);
      }

      const timestamp = new Date().toLocaleTimeString();
      setSimulationData(prev => ({
        ...prev,
        stepFResult: {
          success: true,
          message: `Both proposals accepted at ${timestamp}`
        }
      }));

      setStepStatuses(prev => ({
        ...prev,
        F: 'completed'
      }));
      setCurrentStep(6);

      showToast({ title: 'Simulation Complete!', content: 'Both proposals accepted', type: 'success' });
      console.log('✅ Step F completed - Simulation finished!');
    } catch (err) {
      console.error('Step F failed:', err);
      setError(err.message || 'Failed to complete Step F');
      setSimulationData(prev => ({
        ...prev,
        stepFResult: { success: false, message: err.message }
      }));
      showToast({ title: 'Step F Failed', content: err.message, type: 'error' });
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [stepStatuses.F, simulationData.proposals]);

  /**
   * Reset simulation to initial state
   */
  const handleReset = useCallback(() => {
    setCurrentStep(0);
    setStepStatuses(INITIAL_STEP_STATUSES);
    setSimulationData(prev => ({
      ...prev,
      proposals: [],
      stepAResult: null,
      stepBResult: null,
      stepCResult: null,
      stepEResult: null,
      stepFResult: null
    }));
    setMobileConfirmed(false);
    setError(null);
    showToast({ title: 'Simulation Reset', type: 'info' });
  }, []);

  // ============================================================================
  // RETURN API
  // ============================================================================

  return {
    // Auth state
    authState,
    loginEmail,
    loginPassword,
    loginError,

    // Simulation state
    currentStep,
    stepStatuses,
    simulationData,
    mobileConfirmed,

    // UI state
    isLoading,
    loadingMessage,
    error,

    // Auth handlers
    handleEmailChange,
    handlePasswordChange,
    handleLogin,

    // Simulation handlers
    handleMobileConfirmChange: setMobileConfirmed,
    handleStepA,
    handleStepB,
    handleStepC,
    handleStepE,
    handleStepF,
    handleReset,
    clearError: () => setError(null)
  };
}
