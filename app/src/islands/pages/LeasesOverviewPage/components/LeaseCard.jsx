/**
 * LeaseCard - Individual lease card component
 *
 * Displays lease summary with:
 * - Selection checkbox
 * - Status badge
 * - Guest/Host info
 * - Date range
 * - Financial summary
 * - Action menu
 */

import { useState, useRef, useEffect } from 'react';
import { formatLeaseDisplay } from '../../../../logic/processors/leases/formatLeaseDisplay';

export default function LeaseCard({
  lease,
  isSelected,
  onSelect,
  onStatusChange,
  onSoftDelete,
  onHardDelete,
  onViewDocuments,
  onUploadDocument,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const formatted = formatLeaseDisplay(lease);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const statusClass = `lease-card__status--${lease.status || 'unknown'}`;

  return (
    <article className={`lease-card ${isSelected ? 'lease-card--selected' : ''}`}>
      {/* Selection Checkbox */}
      <div className="lease-card__select">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(lease.id)}
          aria-label={`Select lease ${lease.agreementNumber || lease.id}`}
        />
      </div>

      {/* Header with Status */}
      <header className="lease-card__header">
        <div className="lease-card__id-group">
          <span className="lease-card__agreement-number">
            {lease.agreementNumber || 'No Agreement #'}
          </span>
          <span className="lease-card__id" title={lease.id}>
            {formatted.truncatedId}
          </span>
        </div>
        <span className={`lease-card__status ${statusClass}`}>
          {formatted.statusLabel}
        </span>
      </header>

      {/* Main Content */}
      <div className="lease-card__content">
        {/* Guest Info */}
        <div className="lease-card__row">
          <span className="lease-card__label">Guest</span>
          <span className="lease-card__value">
            {lease.guest?.email ? formatted.maskedGuestEmail : 'Unknown'}
          </span>
        </div>

        {/* Host Info */}
        <div className="lease-card__row">
          <span className="lease-card__label">Host</span>
          <span className="lease-card__value">
            {lease.host?.email ? formatted.maskedHostEmail : 'Unknown'}
          </span>
        </div>

        {/* Listing */}
        {lease.listing && (
          <div className="lease-card__row">
            <span className="lease-card__label">Listing</span>
            <span className="lease-card__value lease-card__value--truncate" title={lease.listing.name}>
              {lease.listing.name || 'Unnamed Listing'}
            </span>
          </div>
        )}

        {/* Date Range */}
        <div className="lease-card__row">
          <span className="lease-card__label">Period</span>
          <span className="lease-card__value">
            {formatted.dateRange}
          </span>
        </div>

        {/* Financial */}
        <div className="lease-card__row lease-card__row--highlight">
          <span className="lease-card__label">Total Rent</span>
          <span className="lease-card__value lease-card__value--money">
            {formatted.totalRent}
          </span>
        </div>

        {/* Stays Count */}
        <div className="lease-card__row">
          <span className="lease-card__label">Stays</span>
          <span className="lease-card__value">
            {lease.stays?.length || 0} stay(s)
          </span>
        </div>
      </div>

      {/* Footer with Actions */}
      <footer className="lease-card__footer">
        <span className="lease-card__created">
          Created {formatted.createdAt}
        </span>

        {/* Action Menu */}
        <div className="lease-card__actions" ref={menuRef}>
          <button
            className="lease-card__menu-trigger"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Actions"
            aria-expanded={isMenuOpen}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>

          {isMenuOpen && (
            <div className="lease-card__menu">
              <button
                className="lease-card__menu-item"
                onClick={() => {
                  onViewDocuments(lease.id);
                  setIsMenuOpen(false);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                View Documents
              </button>

              <button
                className="lease-card__menu-item"
                onClick={() => {
                  onUploadDocument(lease.id);
                  setIsMenuOpen(false);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload Document
              </button>

              <hr className="lease-card__menu-divider" />

              {/* Status Change Options */}
              {lease.status !== 'active' && (
                <button
                  className="lease-card__menu-item"
                  onClick={() => {
                    onStatusChange(lease.id, 'active');
                    setIsMenuOpen(false);
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  Mark Active
                </button>
              )}

              {lease.status !== 'completed' && (
                <button
                  className="lease-card__menu-item"
                  onClick={() => {
                    onStatusChange(lease.id, 'completed');
                    setIsMenuOpen(false);
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 11 12 14 22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                  Mark Completed
                </button>
              )}

              <hr className="lease-card__menu-divider" />

              {/* Delete Options */}
              {lease.status !== 'cancelled' && (
                <button
                  className="lease-card__menu-item lease-card__menu-item--warning"
                  onClick={() => {
                    onSoftDelete(lease.id);
                    setIsMenuOpen(false);
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  Cancel Lease
                </button>
              )}

              <button
                className="lease-card__menu-item lease-card__menu-item--danger"
                onClick={() => {
                  onHardDelete(lease.id);
                  setIsMenuOpen(false);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
                Delete Permanently
              </button>
            </div>
          )}
        </div>
      </footer>
    </article>
  );
}
