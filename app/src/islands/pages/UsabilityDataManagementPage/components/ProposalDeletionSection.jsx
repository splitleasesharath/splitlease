/**
 * ProposalDeletionSection Component
 * Section for deleting proposals
 */

import React from 'react';

export default function ProposalDeletionSection({
  proposalIdInput,
  onProposalIdChange,
  loading,
  onDelete,
}) {
  return (
    <section className="section">
      <h2 className="section-heading">Proposal Deletion</h2>
      <div className="section-content proposal-deletion">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="deleteProposalId">Enter ID of Proposal you want to delete:</label>
            <input
              type="text"
              id="deleteProposalId"
              className="text-input"
              placeholder="Enter Proposal ID"
              value={proposalIdInput}
              onChange={(e) => onProposalIdChange(e.target.value)}
            />
          </div>
          <button
            className={`btn btn-danger ${loading ? 'loading' : ''}`}
            onClick={onDelete}
            disabled={loading}
          >
            Delete
          </button>
        </div>
      </div>
    </section>
  );
}
