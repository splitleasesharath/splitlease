/**
 * Simulation Steps Configuration
 *
 * Defines the 6-step host-side simulation workflow:
 * A: Mark as Tester
 * B: Receive Proposals (create test guest + proposals)
 * C: Counteroffer Rejected (send counteroffer, guest rejects)
 * D: Accept Proposal & Create Lease
 * E: Handle Guest Request
 * F: Complete Stay & Reviews
 */

export const SIMULATION_STEPS = {
  A: {
    id: 'A',
    label: 'Mark as Tester',
    shortLabel: 'Tester',
    description: 'Mark yourself as a usability tester to enable simulation features',
    action: 'mark_tester'
  },
  B: {
    id: 'B',
    label: 'Receive Proposals',
    shortLabel: 'Proposals',
    description: 'A test guest will submit 3 proposals (Weekly, Monthly, Nightly) to your listing',
    action: 'create_test_proposals'
  },
  C: {
    id: 'C',
    label: 'Counteroffer Rejected',
    shortLabel: 'Counteroffer',
    description: 'Send a counteroffer to the guest, who will reject it',
    action: 'send_counteroffer'
  },
  D: {
    id: 'D',
    label: 'Accept & Create Lease',
    shortLabel: 'Lease',
    description: 'Accept a different proposal and create a lease document',
    action: 'accept_proposal'
  },
  E: {
    id: 'E',
    label: 'Guest Request',
    shortLabel: 'Request',
    description: 'Guest submits a request, you respond to it',
    action: 'handle_guest_request'
  },
  F: {
    id: 'F',
    label: 'Complete Stay',
    shortLabel: 'Complete',
    description: 'Mark the stay as complete and exchange reviews',
    action: 'complete_stay'
  }
};

export const STEP_ORDER = ['A', 'B', 'C', 'D', 'E', 'F'];

export const RENTAL_TYPES = [
  { id: 'weekly', label: 'Weekly', description: '4 nights per week' },
  { id: 'monthly', label: 'Monthly', description: '7 nights per week (full time)' },
  { id: 'nightly', label: 'Nightly', description: '2 nights per week' }
];

/**
 * Get the step index (0-based) for a step ID
 * @param {string} stepId - The step ID (A-F)
 * @returns {number} The 0-based index
 */
export function getStepIndex(stepId) {
  return STEP_ORDER.indexOf(stepId);
}

/**
 * Get the next step ID
 * @param {string} currentStepId - The current step ID
 * @returns {string|null} The next step ID or null if complete
 */
export function getNextStep(currentStepId) {
  const currentIndex = getStepIndex(currentStepId);
  if (currentIndex === -1 || currentIndex >= STEP_ORDER.length - 1) {
    return null;
  }
  return STEP_ORDER[currentIndex + 1];
}

/**
 * Check if a step can be activated
 * @param {string} stepId - The step to check
 * @param {string[]} completedSteps - Array of completed step IDs
 * @returns {boolean} Whether the step can be activated
 */
export function canActivateStep(stepId, completedSteps) {
  const stepIndex = getStepIndex(stepId);
  if (stepIndex === 0) return true; // Step A is always activatable

  // Previous step must be completed
  const previousStep = STEP_ORDER[stepIndex - 1];
  return completedSteps.includes(previousStep);
}

/**
 * Get all steps that should be marked as completed given the current step
 * @param {string} currentStepId - The current step ID
 * @returns {string[]} Array of completed step IDs
 */
export function getCompletedSteps(currentStepId) {
  const currentIndex = getStepIndex(currentStepId);
  if (currentIndex === -1) return [];
  return STEP_ORDER.slice(0, currentIndex);
}

/**
 * Get step status for display
 * @param {string} stepId - The step ID
 * @param {string} currentStep - The current active step
 * @param {string[]} completedSteps - Array of completed step IDs
 * @returns {'pending'|'active'|'completed'} The step status
 */
export function getStepStatus(stepId, currentStep, completedSteps) {
  if (completedSteps.includes(stepId)) return 'completed';
  if (stepId === currentStep) return 'active';
  return 'pending';
}

export default {
  SIMULATION_STEPS,
  STEP_ORDER,
  RENTAL_TYPES,
  getStepIndex,
  getNextStep,
  canActivateStep,
  getCompletedSteps,
  getStepStatus
};
