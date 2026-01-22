/**
 * ProposalListSection Component (V7 Design)
 *
 * Section container with:
 * - Header: icon, title, count badge
 * - List of CollapsibleProposalCard components
 * - Action Needed section gets purple styling
 *
 * Only renders if it has proposals to show.
 *
 * Part of the Host Proposals V7 redesign.
 */
import React from 'react';
import { AlertCircle, Loader, Archive } from 'lucide-react';
import CollapsibleProposalCard from './CollapsibleProposalCard.jsx';

/**
 * Get section icon component
 * @param {string} sectionKey - The section key
 * @returns {React.Component} Icon component
 */
function getSectionIcon(sectionKey) {
  const icons = {
    actionNeeded: AlertCircle,
    inProgress: Loader,
    closed: Archive
  };
  return icons[sectionKey] || AlertCircle;
}

/**
 * Get section display title
 * @param {string} sectionKey - The section key
 * @returns {string} Display title
 */
function getSectionTitle(sectionKey) {
  const titles = {
    actionNeeded: 'Action Needed',
    inProgress: 'In Progress',
    closed: 'Closed'
  };
  return titles[sectionKey] || 'Proposals';
}

/**
 * ProposalListSection renders a section with its proposals
 * Uses semantic HTML section with proper heading hierarchy
 *
 * @param {Object} props
 * @param {string} props.sectionKey - Section identifier ('actionNeeded', 'inProgress', 'closed')
 * @param {Array} props.proposals - Array of proposals for this section
 * @param {string} props.expandedProposalId - ID of currently expanded proposal
 * @param {Function} props.onToggleExpand - Callback when card is toggled
 * @param {Object} props.handlers - Object containing all action handlers
 */
export function ProposalListSection({
  sectionKey,
  proposals = [],
  expandedProposalId,
  onToggleExpand,
  handlers = {}
}) {
  // Don't render empty sections
  if (!proposals || proposals.length === 0) {
    return null;
  }

  const IconComponent = getSectionIcon(sectionKey);
  const title = getSectionTitle(sectionKey);
  const isActionNeeded = sectionKey === 'actionNeeded';
  const sectionId = `section-${sectionKey}`;
  const headingId = `${sectionId}-heading`;

  return (
    <section aria-labelledby={headingId}>
      <h2
        id={headingId}
        className={`hp7-section-header${isActionNeeded ? ' action-needed' : ''}`}
      >
        <IconComponent className="icon" size={14} aria-hidden="true" />
        {title}
        <span
          className="hp7-section-count"
          aria-label={`${proposals.length} proposal${proposals.length !== 1 ? 's' : ''}`}
        >
          {proposals.length}
        </span>
      </h2>

      <div className="hp7-proposal-list" role="list">
        {proposals.map((proposal) => {
          const proposalId = proposal?._id || proposal?.id;
          const isExpanded = expandedProposalId === proposalId;

          return (
            <CollapsibleProposalCard
              key={proposalId}
              proposal={proposal}
              isExpanded={isExpanded}
              onToggle={() => onToggleExpand?.(proposalId)}
              handlers={handlers}
            />
          );
        })}
      </div>

      <div className="hp7-list-divider" aria-hidden="true" />
    </section>
  );
}

export default ProposalListSection;
