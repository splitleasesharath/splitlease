/**
 * ProposalSelector Component
 *
 * Dropdown selector showing "My Proposals (count)"
 * Displays: "Host Name - Listing Title" for each proposal
 *
 * Based on live page screenshot: pass1-dropdown-open.png
 */

import { useState } from 'react';

export default function ProposalSelector({ proposals, selectedProposal, onProposalChange }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!proposals || proposals.length === 0) {
    return null;
  }

  /**
   * Get display label for a proposal
   * Format: "Host Name - Listing Title"
   */
  function getProposalLabel(proposal) {
    const hostName = proposal._host?.['Name - First'] || 'Host';
    const listingName = proposal._listing?.Name || 'Property';
    return `${hostName} - ${listingName}`;
  }

  function handleSelect(proposalId) {
    setIsOpen(false);
    onProposalChange(proposalId);
  }

  return (
    <div className="mb-6">
      <div className="relative max-w-2xl">
        {/* Dropdown Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-left flex items-center justify-between hover:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
        >
          <div>
            <div className="text-sm font-medium text-purple-600 mb-1">
              My Proposals ({proposals.length})
            </div>
            <div className="text-base text-gray-900">
              {selectedProposal ? getProposalLabel(selectedProposal) : 'Select a proposal'}
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <>
            {/* Overlay to close dropdown when clicking outside */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown List */}
            <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
              {proposals.map((proposal) => (
                <button
                  key={proposal._id}
                  onClick={() => handleSelect(proposal._id)}
                  className={`w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                    selectedProposal?._id === proposal._id
                      ? 'bg-purple-50 text-purple-900'
                      : 'text-gray-900'
                  }`}
                >
                  <div className="font-medium">{getProposalLabel(proposal)}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {proposal.Status} • Created {new Date(proposal['Created Date']).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
