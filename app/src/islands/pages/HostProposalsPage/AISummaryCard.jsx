/**
 * AISummaryCard Component (V7 Design)
 *
 * Displays an AI-generated summary of the guest for new proposals.
 * Features a gradient purple background and CPU icon.
 *
 * Only renders if:
 * - Summary text exists
 * - Proposal is in a "new" or "review" status
 *
 * Part of the Host Proposals V7 redesign.
 */
import React from 'react';
import { Cpu } from 'lucide-react';

/**
 * Check if AI summary should be shown
 * @param {Object} proposal - The proposal object
 * @returns {boolean} True if should show summary
 */
function shouldShowAISummary(proposal) {
  // Must have a summary
  const summary = proposal?.ai_summary || proposal?.guest_summary || proposal?.summary;
  if (!summary) return false;

  // Only show for new/review statuses
  const status = typeof proposal?.status === 'string'
    ? proposal.status
    : (proposal?.status?.id || proposal?.status?._id || '');

  const showStatuses = ['proposal_submitted', 'host_review'];
  return showStatuses.includes(status);
}

/**
 * AISummaryCard displays AI-generated guest summary
 *
 * @param {Object} props
 * @param {Object} props.proposal - The proposal object
 */
export function AISummaryCard({ proposal }) {
  const summary = proposal?.ai_summary || proposal?.guest_summary || proposal?.summary;

  if (!shouldShowAISummary(proposal)) {
    return null;
  }

  return (
    <div className="hp7-ai-summary-card">
      <div className="hp7-ai-summary-icon">
        <Cpu size={12} />
      </div>
      <div className="hp7-ai-summary-content">
        <div className="hp7-ai-summary-title">AI Summary</div>
        <div className="hp7-ai-summary-text">{summary}</div>
      </div>
    </div>
  );
}

export default AISummaryCard;
