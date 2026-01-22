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
 * Uses ARIA accordion pattern for accessible expand/collapse
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
  const headerId = `proposal-header-${proposalId}`;
  const bodyId = `proposal-body-${proposalId}`;

  // Build class name
  let className = 'hp7-proposal-card';
  if (variant === 'action-needed') className += ' action-needed';
  if (isExpanded) className += ' expanded';

  return (
    <article
      className={className}
      data-proposal-id={proposalId}
      data-expanded={isExpanded}
    >
      <ProposalCardHeader
        proposal={proposal}
        isExpanded={isExpanded}
        onToggle={onToggle}
        headerId={headerId}
        bodyId={bodyId}
      />
      <div
        className="hp7-card-body"
        id={bodyId}
        role="region"
        aria-labelledby={headerId}
        hidden={!isExpanded}
      >
        <ProposalCardBody
          proposal={proposal}
          handlers={handlers}
        />
      </div>
    </article>
  );
}

export default CollapsibleProposalCard;
