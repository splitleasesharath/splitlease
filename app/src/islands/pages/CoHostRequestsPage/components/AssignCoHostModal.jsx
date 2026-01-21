/**
 * AssignCoHostModal - Modal for selecting and assigning a co-host
 *
 * Features:
 * - Search co-hosts by name/email
 * - Display list of available co-hosts
 * - One-click assignment
 */

import { useState } from 'react';

export default function AssignCoHostModal({
  requestId,
  cohosts,
  isLoading,
  onAssign,
  onClose,
  onSearch,
  isProcessing,
}) {
  const [searchText, setSearchText] = useState('');
  const [selectedCohost, setSelectedCohost] = useState(null);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchText(value);
    onSearch(value);
  };

  const handleAssign = () => {
    if (selectedCohost) {
      onAssign(requestId, selectedCohost.id);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className="modal-content modal-medium">
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">Assign Co-Host</h2>
          <button onClick={onClose} className="modal-close-button" title="Close">
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Search Input */}
          <div className="assign-search-container">
            <SearchIcon />
            <input
              type="text"
              placeholder="Search co-hosts by name or email..."
              value={searchText}
              onChange={handleSearchChange}
              className="assign-search-input"
            />
          </div>

          {/* Co-Host List */}
          <div className="cohost-list">
            {isLoading ? (
              <div className="cohost-list-loading">
                <div className="loading-spinner-small" />
                <span>Loading co-hosts...</span>
              </div>
            ) : cohosts.length === 0 ? (
              <div className="cohost-list-empty">
                <p>No co-hosts found</p>
                {searchText && (
                  <p className="cohost-list-hint">Try a different search term</p>
                )}
              </div>
            ) : (
              cohosts.map((cohost) => (
                <div
                  key={cohost.id}
                  onClick={() => setSelectedCohost(cohost)}
                  className={`cohost-list-item ${
                    selectedCohost?.id === cohost.id ? 'cohost-list-item-selected' : ''
                  }`}
                >
                  {/* Avatar */}
                  {cohost.photo ? (
                    <img
                      src={cohost.photo}
                      alt={cohost.name}
                      className="cohost-avatar"
                    />
                  ) : (
                    <div className="cohost-avatar-placeholder">
                      <span>{cohost.name?.charAt(0) || '?'}</span>
                    </div>
                  )}

                  {/* Info */}
                  <div className="cohost-info">
                    <p className="cohost-name">{cohost.name}</p>
                    <p className="cohost-email">{cohost.email}</p>
                  </div>

                  {/* Selection indicator */}
                  {selectedCohost?.id === cohost.id && (
                    <CheckIcon />
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button onClick={onClose} className="modal-action-button modal-action-cancel">
            Cancel
          </button>
          <button
            onClick={handleAssign}
            className="modal-action-button modal-action-primary"
            disabled={!selectedCohost || isProcessing}
          >
            {isProcessing ? 'Assigning...' : 'Assign Co-Host'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== ICONS =====

function CloseIcon() {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="assign-search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="cohost-check-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
