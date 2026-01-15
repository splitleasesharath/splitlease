/**
 * GuestSearch - Step 2: Search and select a guest
 */

import { getDefaultPhoto } from '../suggestedProposalService.js';

export default function GuestSearch({
  searchTerm,
  searchResults,
  selectedGuest,
  existingProposalsCount,
  isConfirmed,
  isSearching,
  onSearchChange,
  onSelect,
  onConfirm,
  onClear,
  onClearSearch
}) {
  const guestName = selectedGuest?.['Name - Full'] || selectedGuest?.['Name - First'] || 'Unknown';
  const guestFirstName = selectedGuest?.['Name - First'] || guestName;

  return (
    <section className="csp-step-section">
      <div className="csp-section-header">
        <h2>Step 2: Select Guest</h2>
      </div>

      {/* Search Input */}
      <div className="csp-search-container">
        <label htmlFor="guestSearch">Filter by Guest</label>
        <div className="csp-search-input-wrapper">
          <input
            type="text"
            id="guestSearch"
            className="csp-search-input"
            placeholder="Search Guest Name, email, phone number, unique ID"
            value={searchTerm}
            onChange={onSearchChange}
            disabled={!!selectedGuest}
          />
          {searchTerm && (
            <button
              className="csp-btn-clear-search"
              onClick={onClearSearch}
              title="Clear"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>

        {/* Search Results */}
        {searchTerm.length >= 2 && !selectedGuest && (
          <div className="csp-search-results">
            {isSearching ? (
              <div className="csp-loading">Searching...</div>
            ) : searchResults.length === 0 ? (
              <div className="csp-no-results">No guests found</div>
            ) : (
              searchResults.map(guest => (
                <div
                  key={guest._id}
                  className="csp-search-result-item"
                  onClick={() => onSelect(guest)}
                >
                  <img
                    src={guest['Profile Photo'] || getDefaultPhoto()}
                    alt={guest['Name - Full'] || 'Guest'}
                    className="csp-thumbnail csp-user-thumbnail"
                    onError={(e) => { e.target.src = getDefaultPhoto(); }}
                  />
                  <div className="csp-search-result-info">
                    <h4>{guest['Name - Full'] || guest['Name - First'] || 'Unknown'}</h4>
                    <p>{guest.email || ''}</p>
                    <p>{guest['Phone Number (as text)'] || ''}</p>
                    <p className="csp-listing-details-row">unique id: {guest._id}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Selected Guest Card */}
      {selectedGuest && (
        <div className="csp-selected-item-card">
          {/* Always show remove button in top-right corner */}
          <button
            className="csp-btn-remove"
            onClick={onClear}
            title="Remove selection"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <div className="csp-user-avatar">
            <img
              src={selectedGuest['Profile Photo'] || getDefaultPhoto()}
              alt={guestName}
              onError={(e) => { e.target.src = getDefaultPhoto(); }}
            />
          </div>
          <div className="csp-item-details">
            <h3>{guestName}</h3>
            <p className="csp-item-subtitle">{selectedGuest.email || ''}</p>
            <p className="csp-item-meta">{selectedGuest['Phone Number (as text)'] || ''}</p>
            {selectedGuest['Type - User Current'] && (
              <span className="csp-badge">{selectedGuest['Type - User Current']}</span>
            )}
          </div>

          {!isConfirmed && (
            <button
              className="csp-btn-select-user"
              onClick={onConfirm}
            >
              Select User
            </button>
          )}
        </div>
      )}

      {/* Existing Proposals Warning */}
      {selectedGuest && existingProposalsCount > 0 && (
        <div className="csp-warning-message">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>Select Another User, {guestFirstName} already has a proposal for the listing selected</span>
        </div>
      )}
    </section>
  );
}
