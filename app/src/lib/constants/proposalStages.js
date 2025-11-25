/**
 * Proposal Progress Stage Configuration System
 *
 * This module defines the 6 stages of the proposal-to-lease workflow,
 * replacing hardcoded stage arrays with rich configuration objects.
 *
 * Each stage includes:
 * - id: Stage number (1-6)
 * - name: Full stage name
 * - shortName: Abbreviated name for compact displays
 * - icon: Emoji or icon identifier
 * - description: User-friendly explanation of the stage
 * - helpText: Additional guidance for guests
 */

export const PROPOSAL_STAGES = [
  {
    id: 1,
    name: 'Proposal Submitted',
    shortName: 'Submitted',
    icon: '1',
    description: 'Your proposal has been submitted to the host',
    helpText: 'The next step is to complete your rental application so the host can review your profile.'
  },
  {
    id: 2,
    name: 'Rental App Submitted',
    shortName: 'Application',
    icon: '2',
    description: 'Your rental application is complete',
    helpText: 'The host is reviewing your application and will respond soon.'
  },
  {
    id: 3,
    name: 'Host Review',
    shortName: 'Review',
    icon: '3',
    description: 'Host is reviewing your proposal',
    helpText: 'The host may accept your proposal, request changes, or propose a counteroffer.'
  },
  {
    id: 4,
    name: 'Review Documents',
    shortName: 'Documents',
    icon: '4',
    description: 'Review proposal documents and terms',
    helpText: 'Carefully review all documents before proceeding to the lease agreement.'
  },
  {
    id: 5,
    name: 'Lease Documents',
    shortName: 'Lease',
    icon: '5',
    description: 'Review and sign lease documents',
    helpText: 'Read the lease agreement thoroughly and sign when ready.'
  },
  {
    id: 6,
    name: 'Initial Payment',
    shortName: 'Payment',
    icon: '6',
    description: 'Submit initial payment to activate lease',
    helpText: 'Submit your first payment to activate the lease and finalize your reservation.'
  }
];

/**
 * Get stage configuration by ID
 * @param {number} stageId - Stage ID (1-6)
 * @returns {Object|null} Stage configuration object or null if not found
 */
export function getStageById(stageId) {
  if (!stageId || stageId < 1 || stageId > 6) {
    return null;
  }
  return PROPOSAL_STAGES.find(s => s.id === stageId) || null;
}

/**
 * Get stage configuration by name (case-insensitive)
 * @param {string} stageName - Stage name
 * @returns {Object|null} Stage configuration object or null if not found
 */
export function getStageByName(stageName) {
  if (!stageName) {
    return null;
  }
  const normalizedName = stageName.toLowerCase();
  return PROPOSAL_STAGES.find(
    s => s.name.toLowerCase() === normalizedName || s.shortName.toLowerCase() === normalizedName
  ) || null;
}

/**
 * Check if a stage is completed
 * @param {number} stageId - Stage ID to check
 * @param {number} currentStage - Current stage ID
 * @returns {boolean} True if stage is completed
 */
export function isStageCompleted(stageId, currentStage) {
  if (!stageId || !currentStage) {
    return false;
  }
  return stageId < currentStage;
}

/**
 * Check if a stage is the current active stage
 * @param {number} stageId - Stage ID to check
 * @param {number} currentStage - Current stage ID
 * @returns {boolean} True if stage is current
 */
export function isCurrentStage(stageId, currentStage) {
  if (!stageId || !currentStage) {
    return false;
  }
  return stageId === currentStage;
}

/**
 * Format stage for display with status indicator
 * @param {number} stageId - Stage ID
 * @param {number} currentStage - Current stage ID
 * @returns {Object} Formatted stage object with status
 */
export function formatStageDisplay(stageId, currentStage) {
  const stage = getStageById(stageId);
  if (!stage) {
    return null;
  }

  let status = 'pending';
  let statusLabel = 'Pending';

  if (isStageCompleted(stageId, currentStage)) {
    status = 'completed';
    statusLabel = 'Completed';
  } else if (isCurrentStage(stageId, currentStage)) {
    status = 'current';
    statusLabel = 'In Progress';
  }

  return {
    ...stage,
    status,
    statusLabel,
    isCompleted: status === 'completed',
    isCurrent: status === 'current',
    isPending: status === 'pending'
  };
}

/**
 * Get all stages formatted for display
 * @param {number} currentStage - Current stage ID
 * @returns {Array<Object>} Array of formatted stage objects
 */
export function getAllStagesFormatted(currentStage) {
  return PROPOSAL_STAGES.map(stage => formatStageDisplay(stage.id, currentStage));
}
