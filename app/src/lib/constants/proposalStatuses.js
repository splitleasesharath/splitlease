/**
 * @deprecated This file re-exports from the canonical location.
 * Import directly from 'src/logic/constants/proposalStatuses.js' instead.
 */

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
} from '../../logic/constants/proposalStatuses.js';
