/**
 * Logic Constants Barrel Export
 *
 * Centralizes exports for all logic constants, making imports cleaner
 * and refactoring easier.
 *
 * Usage:
 *   import { PROPOSAL_STATUSES, PROPOSAL_STAGES, PRICING_CONSTANTS } from '../logic/constants';
 */

// Proposal Statuses
export {
  PROPOSAL_STATUSES,
  getStatusConfig,
  getStageFromStatus,
  getUsualOrder,
  shouldShowStatusBanner,
  getActionsForStatus,
  isActiveStatus,
  isTerminalStatus,
  isCompletedStatus,
  isSuggestedProposal,
  getStatusesByColor,
  getStatusesByStage,
  isPendingConfirmationProposal
} from './proposalStatuses.js';

// Proposal Stages
export {
  PROPOSAL_STAGES,
  getStageById,
  getStageByName,
  getStageProgress,
  getCompletedStages,
  getRemainingStages,
  isStageCompleted,
  isCurrentStage,
  isStagePending,
  getPreviousStage,
  getNextStage,
  formatStageDisplay,
  getAllStagesFormatted
} from './proposalStages.js';

// Pricing Constants
export {
  DEFAULT_ZAT_CONFIG,
  PRICE_TIERS,
  RENTAL_TYPES
} from './pricingConstants.js';

// Search Constants
export {
  SORT_OPTIONS,
  DEFAULT_FILTERS
} from './searchConstants.js';

// Review Categories
export {
  REVIEW_CATEGORIES,
  REVIEW_RATING_SCALE
} from './reviewCategories.js';
