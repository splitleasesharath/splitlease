/**
 * QRCodeGrid Component
 *
 * Displays a responsive grid of QR code cards with selection controls.
 */

import PropTypes from 'prop-types';
import QRCodeCard from './QRCodeCard.jsx';

/**
 * Empty State Component
 */
const EmptyState = ({ onCreateClick }) => (
  <div className="qrcd-grid__empty">
    <div className="qrcd-grid__empty-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="4" height="4" />
        <path d="M21 14h-3v3h3" />
        <path d="M18 21v-3" />
        <path d="M21 21h-3" />
      </svg>
    </div>
    <h3 className="qrcd-grid__empty-title">No QR Codes Yet</h3>
    <p className="qrcd-grid__empty-text">
      Create QR codes to help guests access important information about your property.
    </p>
    {onCreateClick && (
      <button
        type="button"
        className="qrcd-grid__empty-button"
        onClick={onCreateClick}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Create QR Code
      </button>
    )}
  </div>
);

EmptyState.propTypes = {
  onCreateClick: PropTypes.func
};

/**
 * Grid Toolbar Component
 */
const GridToolbar = ({
  totalCount,
  selectedCount,
  allSelected,
  onSelectAll,
  onDeleteSelected,
  onPrintSelected,
  onCreateClick,
  disabled
}) => (
  <div className="qrcd-grid__toolbar">
    <div className="qrcd-grid__toolbar-left">
      <label className="qrcd-grid__select-all">
        <input
          type="checkbox"
          checked={allSelected && totalCount > 0}
          onChange={onSelectAll}
          disabled={disabled || totalCount === 0}
        />
        <span>
          {selectedCount > 0
            ? `${selectedCount} of ${totalCount} selected`
            : `Select all (${totalCount})`
          }
        </span>
      </label>
    </div>

    <div className="qrcd-grid__toolbar-right">
      {selectedCount > 0 && (
        <>
          <button
            type="button"
            className="qrcd-grid__toolbar-btn qrcd-grid__toolbar-btn--print"
            onClick={onPrintSelected}
            disabled={disabled}
            title="Print selected"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print ({selectedCount})
          </button>
          <button
            type="button"
            className="qrcd-grid__toolbar-btn qrcd-grid__toolbar-btn--delete"
            onClick={onDeleteSelected}
            disabled={disabled}
            title="Delete selected"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Delete ({selectedCount})
          </button>
        </>
      )}
      <button
        type="button"
        className="qrcd-grid__toolbar-btn qrcd-grid__toolbar-btn--create"
        onClick={onCreateClick}
        disabled={disabled}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        New QR Code
      </button>
    </div>
  </div>
);

GridToolbar.propTypes = {
  totalCount: PropTypes.number.isRequired,
  selectedCount: PropTypes.number.isRequired,
  allSelected: PropTypes.bool.isRequired,
  onSelectAll: PropTypes.func.isRequired,
  onDeleteSelected: PropTypes.func.isRequired,
  onPrintSelected: PropTypes.func.isRequired,
  onCreateClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool
};

/**
 * QRCodeGrid Component
 */
const QRCodeGrid = ({
  qrCodes = [],
  selectedIds = new Set(),
  allSelected = false,
  onSelect,
  onSelectAll,
  onEdit,
  onDelete,
  onDeleteSelected,
  onPrintSelected,
  onCreateClick,
  disabled = false
}) => {
  const selectedCount = selectedIds.size;
  const totalCount = qrCodes.length;

  // Empty state
  if (totalCount === 0) {
    return <EmptyState onCreateClick={onCreateClick} />;
  }

  return (
    <div className="qrcd-grid">
      {/* Toolbar */}
      <GridToolbar
        totalCount={totalCount}
        selectedCount={selectedCount}
        allSelected={allSelected}
        onSelectAll={onSelectAll}
        onDeleteSelected={onDeleteSelected}
        onPrintSelected={onPrintSelected}
        onCreateClick={onCreateClick}
        disabled={disabled}
      />

      {/* Grid of Cards */}
      <div className="qrcd-grid__cards">
        {qrCodes.map(qrCode => (
          <QRCodeCard
            key={qrCode.id}
            qrCode={qrCode}
            isSelected={selectedIds.has(qrCode.id)}
            onSelect={onSelect}
            onEdit={onEdit}
            onDelete={onDelete}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
};

QRCodeGrid.propTypes = {
  qrCodes: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      content: PropTypes.string,
      useCaseId: PropTypes.string
    })
  ),
  selectedIds: PropTypes.instanceOf(Set),
  allSelected: PropTypes.bool,
  onSelect: PropTypes.func.isRequired,
  onSelectAll: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onDeleteSelected: PropTypes.func.isRequired,
  onPrintSelected: PropTypes.func.isRequired,
  onCreateClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool
};

export default QRCodeGrid;
