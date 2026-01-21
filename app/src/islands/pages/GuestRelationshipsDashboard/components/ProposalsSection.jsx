/**
 * Proposals Section Component
 *
 * Display and manage current and suggested proposals.
 * Converted from TypeScript to JavaScript following Split Lease patterns.
 */

import { useState } from 'react';
import { FileText, Plus, Trash2, DollarSign, MoreHorizontal, Calendar, Moon, Home } from 'lucide-react';

export default function ProposalsSection({
  currentProposals,
  suggestedProposals,
  availableListings,
  isLoading,
  onRemoveProposal,
  onConfirmPricing,
  onAddSuggestedProposal
}) {
  const [showAddProposal, setShowAddProposal] = useState(false);
  const [selectedListing, setSelectedListing] = useState('');

  function handleAddProposal() {
    if (selectedListing) {
      onAddSuggestedProposal(selectedListing);
      setSelectedListing('');
      setShowAddProposal(false);
    }
  }

  function formatProposalId(id) {
    return `#P${id.slice(0, 8).toUpperCase()}`;
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount || 0);
  }

  function ProposalCard({ proposal, type }) {
    const listing = proposal.listing || {};
    const photos = listing.photos || [];

    return (
      <div className="grd-proposal-card">
        <div className="grd-proposal-image">
          {photos[0]?.url ? (
            <img src={photos[0].url} alt={listing.name || 'Listing'} />
          ) : (
            <div className="grd-placeholder-image">
              <Home size={32} />
            </div>
          )}
        </div>
        <div className="grd-proposal-details">
          <h4 className="grd-proposal-listing-name">
            {listing.name || 'Unknown Listing'}
          </h4>
          <div className="grd-proposal-info-grid">
            <div className="grd-proposal-info-item">
              <Calendar size={14} />
              <span>Move in: {formatDate(proposal.moveInDate)}</span>
            </div>
            <div className="grd-proposal-info-item">
              <Moon size={14} />
              <span>{proposal.nights || 7} nights</span>
            </div>
            <div className="grd-proposal-info-item">
              <span className="grd-duration-badge">{proposal.duration || '1 week'}</span>
            </div>
            <div className="grd-proposal-info-item grd-price">
              <DollarSign size={14} />
              <span>{formatCurrency(proposal.nightlyPrice)}/night</span>
            </div>
          </div>
          <div className="grd-proposal-id">{formatProposalId(proposal.id || proposal._id)}</div>
        </div>
        <div className="grd-proposal-actions">
          {type === 'current' && (
            <button
              className="grd-btn grd-btn-secondary grd-btn-sm"
              onClick={() => onConfirmPricing(proposal.id || proposal._id)}
            >
              <DollarSign size={14} />
              Confirm Pricing
            </button>
          )}
          <button
            className="grd-btn grd-btn-icon"
            onClick={() => onRemoveProposal(proposal.id || proposal._id)}
            title="Remove"
          >
            <Trash2 size={16} />
          </button>
          <button className="grd-btn grd-btn-icon" title="More options">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grd-proposals-section">
      {/* Current Proposals */}
      <div className="grd-proposals-group">
        <div className="grd-proposals-header">
          <h2 className="grd-section-title">
            <FileText size={20} />
            Current Proposals
          </h2>
          <span className="grd-proposals-count">{currentProposals.length}</span>
        </div>
        <div className="grd-proposals-list">
          {currentProposals.length > 0 ? (
            currentProposals.map(proposal => (
              <ProposalCard key={proposal.id || proposal._id} proposal={proposal} type="current" />
            ))
          ) : (
            <div className="grd-empty-state">
              <FileText size={32} />
              <p>No current proposals</p>
            </div>
          )}
        </div>
      </div>

      {/* Suggested Proposals */}
      <div className="grd-proposals-group">
        <div className="grd-proposals-header">
          <h2 className="grd-section-title">
            <FileText size={20} />
            Suggested Proposals
          </h2>
          <button
            className="grd-btn grd-btn-primary grd-btn-sm"
            onClick={() => setShowAddProposal(!showAddProposal)}
          >
            <Plus size={14} />
            Add Suggested Proposal
          </button>
        </div>

        {showAddProposal && (
          <div className="grd-add-proposal-form">
            <select
              className="grd-form-select"
              value={selectedListing}
              onChange={(e) => setSelectedListing(e.target.value)}
            >
              <option value="">Select a listing...</option>
              {availableListings.map(listing => (
                <option key={listing._id || listing.id} value={listing._id || listing.id}>
                  {listing.name || listing['Listing Name']} - {listing.location?.hood || listing['Hood - Text'] || 'NYC'}
                </option>
              ))}
            </select>
            <button
              className="grd-btn grd-btn-primary grd-btn-sm"
              onClick={handleAddProposal}
              disabled={!selectedListing}
            >
              Add
            </button>
          </div>
        )}

        <div className="grd-proposals-list">
          {suggestedProposals.length > 0 ? (
            suggestedProposals.map(proposal => (
              <ProposalCard key={proposal.id || proposal._id} proposal={proposal} type="suggested" />
            ))
          ) : (
            <div className="grd-empty-state">
              <FileText size={32} />
              <p>No suggested proposals</p>
            </div>
          )}
        </div>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="grd-loading-indicator">
          <div className="grd-spinner-sm"></div>
          <span>Loading proposals...</span>
        </div>
      )}
    </div>
  );
}
