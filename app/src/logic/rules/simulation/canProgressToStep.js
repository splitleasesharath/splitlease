/**
 * canProgressToStep
 *
 * Business rules for step progression in the guest simulation.
 * Each step has prerequisites that must be met before it can be activated.
 *
 * @module logic/rules/simulation/canProgressToStep
 */

/**
 * Step dependencies map
 * Each step (except A) requires the previous step to be completed.
 */
const STEP_DEPENDENCIES = {
  A: null,      // Step A has no dependencies, starts when simulation begins
  B: 'A',       // Step B requires Step A completed
  C: 'B',       // Step C requires Step B completed
  D: 'C',       // Step D requires Step C completed
  E: 'D',       // Step E requires Step D completed
  F: 'E'        // Step F requires Step E completed
};

/**
 * Check if user can progress to/activate a given step
 *
 * @param {string} stepId - 'A', 'B', 'C', 'D', 'E', or 'F'
 * @param {Object} stepStatuses - Current status of all steps { A: 'pending'|'active'|'completed', ... }
 * @returns {boolean} True if the step can be activated/progressed
 */
export function canProgressToStep(stepId, stepStatuses) {
  // Invalid step ID
  if (!STEP_DEPENDENCIES.hasOwnProperty(stepId)) {
    return false;
  }

  // Step A can always be started if simulation has begun (it's active)
  if (stepId === 'A') {
    return stepStatuses.A === 'active';
  }

  const previousStep = STEP_DEPENDENCIES[stepId];

  // Previous step must be completed and current step must be active
  return stepStatuses[previousStep] === 'completed' && stepStatuses[stepId] === 'active';
}

/**
 * Check if simulation is complete
 * Simulation is complete when Step F reaches 'completed' status.
 *
 * @param {Object} stepStatuses - Status object for all steps
 * @returns {boolean} True if all steps are completed
 */
export function isSimulationComplete(stepStatuses) {
  return stepStatuses.F === 'completed';
}

/**
 * Get the next step ID after the current one
 *
 * @param {string} currentStepId - Current step ('A' through 'E')
 * @returns {string|null} Next step ID or null if at final step
 */
export function getNextStepId(currentStepId) {
  const stepOrder = ['A', 'B', 'C', 'D', 'E', 'F'];
  const currentIndex = stepOrder.indexOf(currentStepId);

  if (currentIndex === -1 || currentIndex >= stepOrder.length - 1) {
    return null;
  }

  return stepOrder[currentIndex + 1];
}

/**
 * Validate that step statuses follow correct progression
 * Used to ensure state consistency.
 *
 * @param {Object} stepStatuses - Status object for all steps
 * @returns {boolean} True if statuses are valid
 */
export function isValidStepProgression(stepStatuses) {
  const stepOrder = ['A', 'B', 'C', 'D', 'E', 'F'];
  let foundActive = false;
  let foundPending = false;

  for (const stepId of stepOrder) {
    const status = stepStatuses[stepId];

    // Once we find a pending step, all following must be pending
    if (foundPending && status !== 'pending') {
      return false;
    }

    // Once we find an active step, next non-completed must be pending
    if (foundActive && status === 'active') {
      return false; // Only one active step allowed
    }

    if (status === 'active') {
      foundActive = true;
    }

    if (status === 'pending') {
      foundPending = true;
    }
  }

  return true;
}
