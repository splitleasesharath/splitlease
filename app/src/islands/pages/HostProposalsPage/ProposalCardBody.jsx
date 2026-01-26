/**
 * ProposalCardBody Component (V7 Design)
 *
 * The expanded view of a proposal card, composed of:
 * - StatusBanner (always)
 * - AISummaryCard (only for new proposals)
 * - GuestInfoCard (always)
 * - QuickLinksRow (always)
 * - InfoGrid (always)
 * - DayPillsRow (always, hidden on mobile)
 * - PricingRow (always)
 * - ProgressTrackerV7 (only for accepted proposals)
 * - ActionButtonsRow (always)
 *
 * Part of the Host Proposals V7 redesign.
 */
import React from 'react';
import StatusBanner from './StatusBanner.jsx';
import AISummaryCard from './AISummaryCard.jsx';
import GuestInfoCard from './GuestInfoCard.jsx';
import QuickLinksRow from './QuickLinksRow.jsx';
import InfoGrid from './InfoGrid.jsx';
import DayPillsRow from './DayPillsRow.jsx';
import PricingRow from './PricingRow.jsx';
import ProgressTrackerV7 from './ProgressTrackerV7.jsx';
import ActionButtonsRow from './ActionButtonsRow.jsx';

/**
 * Check if proposal is declined/cancelled
 * @param {Object} proposal - The proposal object
 * @returns {boolean} True if declined
 */
function isDeclined(proposal) {
  const status = typeof proposal?.status === 'string'
    ? proposal.status
    : (proposal?.status?.id || proposal?.status?._id || '');

  return [
    'rejected_by_host',
    'cancelled_by_guest',
    'cancelled_by_splitlease'
  ].includes(status);
}

/**
 * Check if proposal has guest counteroffer
 * @param {Object} proposal - The proposal object
 * @returns {boolean} True if has guest counteroffer
 */
function hasGuestCounteroffer(proposal) {
  if (proposal?.has_guest_counteroffer) return true;
  if (proposal?.guest_counteroffer) return true;
  const status = typeof proposal?.status === 'string'
    ? proposal.status
    : (proposal?.status?.id || proposal?.status?._id || '');
  if (
    proposal?.last_modified_by === 'guest' &&
    (status === 'host_review' || status === 'proposal_submitted')
  ) {
    return true;
  }
  return false;
}

/**
 * ProposalCardBody displays the expanded content
 *
 * @param {Object} props
 * @param {Object} props.proposal - The proposal object
 * @param {Object} props.handlers - Object containing all action handlers
 */
export function ProposalCardBody({ proposal, handlers = {} }) {
  const guest = proposal?.guest || proposal?.user || {};
  // Use nights_selected for the pill display (hosts see nights, not days)
  const nightsSelected = proposal?.nights_selected || proposal?.['Nights Selected (Nights list)'] || [];
  const declined = isDeclined(proposal);
  const showCompareTerms = hasGuestCounteroffer(proposal);

  return (
    <div className="hp7-card-body-inner">
      {/* Status Banner - Always shown */}
      <StatusBanner proposal={proposal} />

      {/* AI Summary - Only for new proposals */}
      <AISummaryCard proposal={proposal} />

      {/* Guest Info - Always shown (except declined) */}
      {!declined && (
        <GuestInfoCard guest={guest} />
      )}

      {/* Quick Links - Always shown (except declined) */}
      {!declined && (
        <QuickLinksRow
          onViewProfile={() => handlers.onViewProfile?.(proposal)}
          onMessage={() => handlers.onMessage?.(proposal)}
          onScheduleMeeting={() => handlers.onScheduleMeeting?.(proposal)}
          onCompareTerms={() => handlers.onCompareTerms?.(proposal)}
          showCompareTerms={showCompareTerms}
        />
      )}

      {/* Info Grid - Always shown */}
      <InfoGrid proposal={proposal} />

      {/* Night Pills - Always shown (CSS hides on mobile) */}
      {/* Hosts see nights (when guest sleeps), not days (when guest is present) */}
      {!declined && (
        <DayPillsRow nightsSelected={nightsSelected} />
      )}

      {/* Pricing - Always shown */}
      <PricingRow proposal={proposal} isDeclined={declined} />

      {/* Progress Tracker - Only for accepted proposals */}
      <ProgressTrackerV7 proposal={proposal} />

      {/* Action Buttons - Always shown */}
      <ActionButtonsRow
        proposal={proposal}
        onAccept={() => handlers.onAccept?.(proposal)}
        onModify={() => handlers.onModify?.(proposal)}
        onDecline={() => handlers.onDecline?.(proposal)}
        onRemindGuest={() => handlers.onRemindGuest?.(proposal)}
        onMessage={() => handlers.onMessage?.(proposal)}
        onScheduleMeeting={() => handlers.onScheduleMeeting?.(proposal)}
        onEditCounter={() => handlers.onEditCounter?.(proposal)}
        onWithdraw={() => handlers.onWithdraw?.(proposal)}
        onRemove={() => handlers.onRemove?.(proposal)}
        onRequestRentalApp={() => handlers.onRequestRentalApp?.(proposal)}
      />
    </div>
  );
}

export default ProposalCardBody;
