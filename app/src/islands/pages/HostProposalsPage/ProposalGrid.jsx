/**
 * ProposalGrid Component
 *
 * Grid layout for displaying proposal cards.
 */

import ProposalCard from './ProposalCard.jsx';
import EmptyState from './EmptyState.jsx';

/**
 * @param {Object} props
 * @param {Array} props.proposals - Array of proposal objects
 * @param {Function} props.onProposalClick - Callback when a proposal card is clicked
 * @param {Function} [props.onDeleteProposal] - Callback to delete a proposal
 * @param {Function} [props.onEditListing] - Callback to edit the listing
 */
export default function ProposalGrid({
  proposals = [],
  onProposalClick,
  onDeleteProposal,
  onEditListing
}) {
  if (proposals.length === 0) {
    return <EmptyState onEditListing={onEditListing} />;
  }

  return (
    <div className="proposal-grid-container">
      <div className="proposal-grid">
        {proposals.map((proposal) => (
          <ProposalCard
            key={proposal._id || proposal.id}
            proposal={proposal}
            onClick={onProposalClick}
            onDelete={onDeleteProposal}
          />
        ))}
      </div>

      <div className="complementary-schedules">
        Check if any <strong><em>complementary schedules</em></strong> available
      </div>
    </div>
  );
}
