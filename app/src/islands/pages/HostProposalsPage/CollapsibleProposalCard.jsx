/**
 * CollapsibleProposalCard Component (V7 Design)
 *
 * Main card component with expand/collapse behavior:
 * - Controlled expansion via parent
 * - Renders ProposalCardHeader + ProposalCardBody
 * - CSS class based on status for styling variants
 * - max-height animation for smooth expand/collapse
 *
 * Part of the Host Proposals V7 redesign.
 */
import React from 'react';
import ProposalCardHeader from './ProposalCardHeader.jsx';
import ProposalCardBody from './ProposalCardBody.jsx';
import { getCardVariant } from './types.js';

/**
 * CollapsibleProposalCard wraps the header and body with expansion logic
 *
 * @param {Object} props
 * @param {Object} props.proposal - The proposal object
 * @param {boolean} props.isExpanded - Whether the card is expanded
 * @param {Function} props.onToggle - Callback to toggle expansion
 * @param {Object} props.handlers - Object containing all action handlers
 */
export function CollapsibleProposalCard({
  proposal,
  isExpanded = false,
  onToggle,
  handlers = {}
}) {
  const variant = getCardVariant(proposal);
  const proposalId = proposal?._id || proposal?.id;
  const contentId = `proposal-content-${proposalId}`;

  // Build class name
  let className = 'hp7-proposal-card';
  if (variant === 'action-needed') className += ' action-needed';
  if (isExpanded) className += ' expanded';

  return (
    <div
      className={className}
      data-proposal-id={proposalId}
      role="listitem"
    >
      <ProposalCardHeader
        proposal={proposal}
        isExpanded={isExpanded}
        onToggle={onToggle}
        contentId={contentId}
      />
      <div
        id={contentId}
        className="hp7-card-body"
        role="region"
        aria-label={`Details for proposal from ${proposal?.guest?.name || 'guest'}`}
        hidden={!isExpanded}
      >
        <ProposalCardBody
          proposal={proposal}
          handlers={handlers}
        />
      </div>
    </div>
  );
}

export default CollapsibleProposalCard;
