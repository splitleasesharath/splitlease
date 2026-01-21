/**
 * Simulation Steps Configuration
 *
 * Defines all steps in the guest-side usability simulation,
 * including their labels, descriptions, and flow dependencies.
 *
 * Step Flow:
 * login → A → B → C (branching) → D → E → complete
 *
 * Branching at Step C:
 * - Path 1 (Ending 1): Host #2 Accepts proposal
 * - Path 2 (Ending 2): Host #3 Counteroffers, Guest accepts
 */

/**
 * Step definitions with metadata for UI rendering
 */
export const SIMULATION_STEPS = {
  login: {
    id: 'login',
    label: 'Log In',
    description: 'Sign in to start the simulation',
    order: 0
  },
  A: {
    id: 'A',
    label: 'Mark as Usability Tester',
    description: 'Mark yourself as a usability tester and autofill your rental application',
    fullLabel: 'Step A - Mark myself as usability tester & Autofill Rental Application',
    order: 1
  },
  B: {
    id: 'B',
    label: 'Virtual Meeting Invitation',
    description: 'Receive a virtual meeting invitation from Host #1',
    fullLabel: 'Step B - Virtual Meeting Invitation from Host #1',
    instruction: 'Between Step A & Step B: Review your rental application in the dashboard',
    order: 2
  },
  C: {
    id: 'C',
    label: 'Host Response',
    description: 'Choose between two scenarios: Host accepts or Host counteroffers',
    instruction: 'Between Step B & Step C: Choose your path - Accept or Counteroffer',
    order: 3,
    isBranching: true,
    paths: {
      1: {
        title: 'Ending 1: Host #2 Accepts',
        label: 'Host #2 Accepts your Proposal',
        description: 'The host accepts your proposal as submitted'
      },
      2: {
        title: 'Ending 2: Host #3 Counteroffers',
        label: 'Host #3 Counteroffers your Proposal',
        description: 'The host sends a counteroffer with modified terms, which you accept'
      }
    }
  },
  D: {
    id: 'D',
    label: 'Lease Drafting',
    description: 'Drafting of lease documents and house manual',
    fullLabel: 'Step D - Drafting of Lease & House Manual Created',
    order: 4
  },
  E: {
    id: 'E',
    label: 'Signing & Payment',
    description: 'Sign the lease and make initial payment',
    fullLabel: 'Step E - Signing of Lease & Initial Payment Made',
    order: 5
  },
  complete: {
    id: 'complete',
    label: 'Complete',
    description: 'Simulation completed successfully',
    order: 6
  }
};

/**
 * Proposal status mapping for each simulation step
 * Maps to reference_table.os_proposal_status values
 */
export const STEP_STATUS_MAPPING = {
  A: 'pending_guest_info',
  B: 'host_review',
  C1: 'accepted_drafting_lease',
  C2_counter: 'host_counteroffer',
  C2_accept: 'accepted_drafting_lease',
  D: 'lease_docs_for_review',
  E_signing: 'lease_docs_for_signatures',
  E_payment: 'lease_signed_awaiting_payment',
  complete: 'payment_submitted_lease_activated'
};

/**
 * User "Usability Step" field values for progress tracking
 * Stored in user."Usability Step" column
 */
export const USER_STEP_VALUES = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  complete: 6
};

/**
 * Counteroffer default values for Path 2 (Ending 2)
 * These are the modified terms the host sends
 */
export const DEFAULT_COUNTEROFFER = {
  nightlyPrice: 150,
  nightsPerWeek: 3,
  checkInDay: 5, // Friday (0-indexed)
  checkOutDay: 1  // Monday (0-indexed)
};

/**
 * Test data cleanup configuration
 * Data will be auto-deleted after this duration
 */
export const TEST_DATA_CLEANUP = {
  retentionHours: 72, // 72 hours as specified in requirements
  cleanupFields: ['proposal', 'bookings_leases', 'virtualmeetingschedulesandlinks']
};

/**
 * Get the ordered list of completed steps based on current step
 * @param {string} currentStep - Current step ID
 * @param {number} selectedPath - Selected ending path (1 or 2)
 * @returns {string[]} Array of completed step IDs
 */
export function getCompletedSteps(currentStep, selectedPath) {
  const order = ['login', 'A', 'B', 'C', 'D', 'E', 'complete'];
  const currentIndex = order.indexOf(currentStep);

  if (currentIndex <= 0) return [];

  const completed = [];
  for (let i = 0; i < currentIndex; i++) {
    const step = order[i];
    if (step === 'C' && selectedPath) {
      completed.push(`C${selectedPath}`);
    } else if (step !== 'C') {
      completed.push(step);
    }
  }

  // Include D and E with path suffix for later steps
  if (currentStep === 'E' || currentStep === 'complete') {
    completed.push(`D${selectedPath}`);
  }
  if (currentStep === 'complete') {
    completed.push(`E${selectedPath}`);
  }

  return completed;
}

/**
 * Check if a step can be activated based on completed steps
 * @param {string} stepId - Step to check
 * @param {string[]} completedSteps - Array of completed step IDs
 * @param {number} selectedPath - Selected ending path
 * @returns {boolean}
 */
export function canActivateStep(stepId, completedSteps, selectedPath) {
  switch (stepId) {
    case 'A':
      return true; // Always can start
    case 'B':
      return completedSteps.includes('A');
    case 'C':
    case 'C1':
    case 'C2':
      return completedSteps.includes('B');
    case 'D':
    case 'D1':
    case 'D2':
      return completedSteps.includes(`C${selectedPath}`);
    case 'E':
    case 'E1':
    case 'E2':
      return completedSteps.includes(`D${selectedPath}`);
    default:
      return false;
  }
}

export default SIMULATION_STEPS;
