/**
 * SimulatedProposalCard Component
 *
 * Displays a single simulated proposal with guest info and status indicators.
 * Shows updates as steps progress (VM accepted, lease drafted, VM invite received).
 *
 * @module pages/SimulationHostsideDemoPage/components/SimulatedProposalCard
 */

import { User, Calendar, DollarSign, Check, FileText, Mail } from 'lucide-react';

/**
 * Format a date string for display
 */
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * SimulatedProposalCard component
 *
 * @param {Object} props
 * @param {Object} props.proposal - The proposal object
 * @param {number} props.index - Index for display (0-based)
 */
export function SimulatedProposalCard({ proposal, index }) {
  const proposalNumber = index + 1;

  // Determine status badges
  const hasVmAccepted = proposal.vmStatus === 'accepted';
  const hasLeaseDrafted = proposal.leaseStatus === 'draft';
  const hasVmInviteReceived = proposal.hasIncomingVmInvite;

  return (
    <div className="simulated-proposal-card">
      <div className="simulated-proposal-card__header">
        <span className="simulated-proposal-card__number">#{proposalNumber}</span>
        <h3 className="simulated-proposal-card__guest-name">
          {proposal.guest.fullName}
        </h3>
      </div>

      <div className="simulated-proposal-card__details">
        <div className="simulated-proposal-card__detail">
          <Calendar size={14} />
          <span>{formatDate(proposal.moveInDate)} → {formatDate(proposal.moveOutDate)}</span>
        </div>
        <div className="simulated-proposal-card__detail">
          <DollarSign size={14} />
          <span>${proposal.nightlyPrice}/night · {proposal.nightsPerWeek} nights/week</span>
        </div>
        <div className="simulated-proposal-card__detail">
          <User size={14} />
          <span>{proposal.guest.occupation}</span>
        </div>
      </div>

      {/* Status badges */}
      <div className="simulated-proposal-card__status-badges">
        {hasVmAccepted && (
          <span className="simulated-proposal-card__badge simulated-proposal-card__badge--success">
            <Check size={12} />
            VM Accepted
          </span>
        )}
        {hasLeaseDrafted && (
          <span className="simulated-proposal-card__badge simulated-proposal-card__badge--info">
            <FileText size={12} />
            Lease Drafted
          </span>
        )}
        {hasVmInviteReceived && (
          <span className="simulated-proposal-card__badge simulated-proposal-card__badge--warning">
            <Mail size={12} />
            VM Invite Received
          </span>
        )}
        {!hasVmAccepted && !hasLeaseDrafted && !hasVmInviteReceived && (
          <span className="simulated-proposal-card__badge simulated-proposal-card__badge--neutral">
            Pending
          </span>
        )}
      </div>
    </div>
  );
}

export default SimulatedProposalCard;
