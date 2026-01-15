/**
 * Proposal Selector Component (V3 List Layout)
 *
 * Displays all proposals as clickable rows with thumbnails and status badges.
 * Replaces the old dropdown selector for better visibility.
 *
 * Note: Count excludes deleted proposals and proposals cancelled by guest
 * (filtering handled in userProposalQueries.js)
 */

import { getStatusConfig, shouldShowStatusBanner } from '../../../logic/constants/proposalStatuses.js';

/**
 * Get status badge class based on proposal status
 */
function getStatusBadgeClass(status) {
  if (!status) return '';

  const normalizedStatus = status.trim();

  // Success states (accepted, completed)
  if (normalizedStatus.includes('Accepted') ||
      normalizedStatus.includes('activated') ||
      normalizedStatus.includes('Signed')) {
    return 'success';
  }

  // Attention states (counteroffer, awaiting action)
  if (normalizedStatus.includes('Counteroffer') ||
      normalizedStatus.includes('Awaiting') ||
      normalizedStatus.includes('Review')) {
    return 'attention';
  }

  return '';
}

/**
 * Get short status label for display
 */
function getStatusLabel(status) {
  if (!status) return 'Pending';

  const normalizedStatus = status.trim();

  if (normalizedStatus.includes('Counteroffer')) return 'Review Counteroffer';
  if (normalizedStatus.includes('Accepted')) return 'Accepted';
  if (normalizedStatus.includes('activated')) return 'Active';
  if (normalizedStatus.includes('Signed')) return 'Lease Signed';
  if (normalizedStatus.includes('Awaiting Rental Application')) return 'Complete Application';
  if (normalizedStatus.includes('Rental Application Submitted')) return 'Under Review';
  if (normalizedStatus.includes('Lease Documents')) return 'Review Lease';
  if (normalizedStatus.includes('Cancelled')) return 'Cancelled';
  if (normalizedStatus.includes('Rejected')) return 'Declined';

  return 'Pending';
}

export default function ProposalSelector({ proposals, selectedId, onSelect, count, fullProposals = [] }) {
  if (!proposals || proposals.length === 0) {
    return null;
  }

  const handleRowClick = (proposalId) => {
    onSelect(proposalId);
  };

  return (
    <div className="proposal-selector">
      <div className="selector-header">
        <h2>My Proposals ({count})</h2>
      </div>

      <div className="proposal-list">
        {proposals.map((proposal) => {
          // Find full proposal data for additional info
          const fullProposal = fullProposals.find(p => p._id === proposal.id) || {};
          const listing = fullProposal.listing || {};
          const status = fullProposal.Status || '';
          const daysSelected = fullProposal['Days Selected'] || [];
          const weeks = fullProposal['Reservation Span (Weeks)'] || fullProposal['hc reservation span (weeks)'] || '';

          // Get photo URL
          const photoUrl = listing.featuredPhotoUrl ||
            listing['Features - Photos']?.[0] ||
            null;

          // Build meta string (e.g., "Mon-Fri · 12 weeks")
          const daysCount = Array.isArray(daysSelected) ? daysSelected.length : 0;
          const metaText = weeks ? `${daysCount} days · ${weeks} weeks` : `${daysCount} days`;

          const isActive = proposal.id === selectedId;
          const statusClass = getStatusBadgeClass(status);
          const statusLabel = getStatusLabel(status);

          return (
            <div
              key={proposal.id}
              className={`proposal-row ${isActive ? 'active' : ''}`}
              onClick={() => handleRowClick(proposal.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleRowClick(proposal.id)}
            >
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt=""
                  className="proposal-thumb"
                />
              ) : (
                <div className="proposal-thumb" />
              )}

              <div className="proposal-info">
                <div className="proposal-name">{listing.Name || proposal.label}</div>
                <div className="proposal-meta">{metaText}</div>
              </div>

              <div className={`proposal-status ${statusClass}`}>
                {statusLabel}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
