/**
 * Host-Side Simulation Steps Configuration
 *
 * Defines all steps in the host-side usability simulation:
 * - Step A: Mark yourself as a Usability Tester
 * - Step B: Receive 3 Proposals (from simulated guests)
 * - Step C: Mariska Accepts VM Invite
 * - Step D: Draft Lease Docs for Proposal #2
 * - Step E: VM invite from Guest Jacques
 *
 * This is a linear flow (no branching like the guest-side simulation).
 *
 * @module pages/SimulationHostsideDemoPage/constants/simulationSteps
 */

/**
 * Step definitions with metadata for UI rendering
 */
export const SIMULATION_STEPS = {
  A: {
    id: 'A',
    number: 1,
    label: 'Mark yourself as a Usability Tester',
    shortLabel: 'Usability Tester',
    description: 'Mark your account as a usability tester to enable simulation features',
    betweenText: null,
    order: 1
  },
  B: {
    id: 'B',
    number: 2,
    label: 'Receive 3 Proposals',
    shortLabel: '3 Proposals',
    description: 'Receive simulated proposals from three test guests: Jacques, Mariska, and Lukas',
    betweenText: 'Return to the Google Doc Instructions and follow it until you are instructed to return to the simulation page',
    order: 2
  },
  C: {
    id: 'C',
    number: 3,
    label: 'Mariska Accepts VM Invite',
    shortLabel: 'VM Accepted',
    description: 'Simulate Mariska accepting your virtual meeting invitation',
    betweenText: 'Return to the Google Doc Instructions and follow it until you are instructed to return to the simulation page',
    order: 3
  },
  D: {
    id: 'D',
    number: 4,
    label: 'Draft Lease Docs for Proposal #2',
    shortLabel: 'Draft Lease',
    description: 'Generate lease documents for the second proposal (Mariska)',
    betweenText: 'Return to the Google Doc Instructions and follow it until you are instructed to return to the simulation page',
    order: 4
  },
  E: {
    id: 'E',
    number: 5,
    label: 'VM invite from Guest Jacques',
    shortLabel: 'Jacques VM',
    description: 'Receive a virtual meeting invite from Jacques (guest-initiated)',
    betweenText: 'Return to the Google Doc Instructions and follow it until you are instructed to return to the simulation page',
    order: 5
  }
};

/**
 * Ordered array of step IDs for iteration
 */
export const STEP_ORDER = ['A', 'B', 'C', 'D', 'E'];

/**
 * Total number of steps in the simulation
 */
export const TOTAL_STEPS = 5;

/**
 * localStorage key for persisting simulation progress
 */
export const STORAGE_KEY = 'splitlease_hostside_simulation_progress';

/**
 * Get completed steps array based on current step number
 *
 * @param {number} currentStepNumber - Current step (0-5, where 0 = not started)
 * @returns {string[]} Array of completed step IDs
 */
export function getCompletedSteps(currentStepNumber) {
  if (currentStepNumber <= 0) return [];

  const completed = [];
  for (let i = 0; i < currentStepNumber && i < STEP_ORDER.length; i++) {
    completed.push(STEP_ORDER[i]);
  }
  return completed;
}

/**
 * Check if a step can be activated based on current progress
 *
 * @param {string} stepId - Step to check (A, B, C, D, or E)
 * @param {number} currentStepNumber - Current step number (0-5)
 * @returns {boolean} Whether the step can be clicked
 */
export function canClickStep(stepId, currentStepNumber) {
  const stepIndex = STEP_ORDER.indexOf(stepId);
  if (stepIndex === -1) return false;

  // Can click the step if current progress is at this step
  // (i.e., all previous steps are complete)
  return stepIndex === currentStepNumber;
}

/**
 * Check if a step is completed
 *
 * @param {string} stepId - Step to check
 * @param {number} currentStepNumber - Current step number (0-5)
 * @returns {boolean} Whether the step is completed
 */
export function isStepCompleted(stepId, currentStepNumber) {
  const stepIndex = STEP_ORDER.indexOf(stepId);
  if (stepIndex === -1) return false;

  return stepIndex < currentStepNumber;
}

/**
 * Get the "between" instruction text that appears after a step is clicked
 * but before the next step is available.
 *
 * @param {string} stepId - Current step ID
 * @returns {string|null} The instruction text or null
 */
export function getBetweenStepText(stepId) {
  return SIMULATION_STEPS[stepId]?.betweenText || null;
}

export default SIMULATION_STEPS;
