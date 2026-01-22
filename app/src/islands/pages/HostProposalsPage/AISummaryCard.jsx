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
 * Get summary text from proposal
 * Checks multiple possible sources in priority order:
 * 1. negotiationSummaries array (most recent summary intended for host)
 * 2. Direct ai_summary/guest_summary/summary fields (legacy)
 * @param {Object} proposal - The proposal object
 * @returns {string|null} Summary text or null if none found
 */
function getSummaryText(proposal) {
  // Check negotiationSummaries array first (new approach)
  const negotiationSummaries = proposal?.negotiationSummaries || [];
  if (negotiationSummaries.length > 0) {
    const latestSummary = negotiationSummaries[0]; // Already sorted by date desc
    return latestSummary?.Summary || latestSummary?.summary || null;
  }

  // Fallback to direct fields (legacy)
  return proposal?.ai_summary || proposal?.guest_summary || proposal?.summary || null;
}

/**
 * Parse text with [b]...[/b] tags into React elements with bold formatting
 * @param {string} text - Text potentially containing [b]...[/b] tags
 * @returns {React.ReactNode} Parsed content with <strong> elements
 */
function parseFormattedText(text) {
  if (!text) return null;

  // Split by [b] and [/b] tags, keeping track of whether we're in a bold section
  const parts = text.split(/\[b\]|\[\/b\]/);

  // The pattern alternates: normal, bold, normal, bold, ...
  // First part is always normal (before any [b])
  return parts.map((part, index) => {
    // Even indices are normal text, odd indices are bold
    if (index % 2 === 1) {
      return <strong key={index}>{part}</strong>;
    }
    return part;
  });
}

/**
 * Check if AI summary should be shown
 * @param {Object} proposal - The proposal object
 * @returns {boolean} True if should show summary
 */
function shouldShowAISummary(proposal) {
  // Must have a summary
  const summary = getSummaryText(proposal);
  if (!summary) return false;

  // Only show for new/review statuses (pending statuses where host needs to take action)
  const status = typeof proposal?.status === 'string'
    ? proposal.status
    : (proposal?.status?.id || proposal?.status?._id || '');

  // Match statuses that start with common pending prefixes
  // Handles variations like "proposal_submitted_by_guest_-_awaiting_rental_application"
  const showStatusPrefixes = [
    'proposal_submitted',
    'host_review',
    'pending',
    'awaiting',
    'new'
  ];

  return showStatusPrefixes.some(prefix => status.startsWith(prefix));
}

/**
 * AISummaryCard displays AI-generated guest summary
 *
 * @param {Object} props
 * @param {Object} props.proposal - The proposal object
 */
export function AISummaryCard({ proposal }) {
  const summary = getSummaryText(proposal);

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
        <div className="hp7-ai-summary-text">{parseFormattedText(summary)}</div>
      </div>
    </div>
  );
}

export default AISummaryCard;
