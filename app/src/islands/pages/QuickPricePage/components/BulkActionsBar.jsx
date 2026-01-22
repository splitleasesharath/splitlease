/**
 * BulkActionsBar - Toolbar for bulk operations on selected listings
 *
 * Provides actions:
 * - Select/clear all
 * - Export as CSV/JSON
 */

export default function BulkActionsBar({
  selectedCount,
  onSelectAll,
  onClearSelection,
  onBulkExport,
  isAllSelected,
}) {
  return (
    <div className="bulk-actions-bar">
      <div className="bulk-actions-bar__info">
        <span className="bulk-actions-bar__count">
          {selectedCount} listing{selectedCount !== 1 ? 's' : ''} selected
        </span>
        <button
          className="bulk-actions-bar__link-btn"
          onClick={isAllSelected ? onClearSelection : onSelectAll}
          type="button"
        >
          {isAllSelected ? 'Clear selection' : 'Select all'}
        </button>
      </div>

      <div className="bulk-actions-bar__actions">
        <button
          className="bulk-actions-bar__btn"
          onClick={() => onBulkExport('csv')}
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="7,10 12,15 17,10" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round"/>
          </svg>
          Export CSV
        </button>
        <button
          className="bulk-actions-bar__btn"
          onClick={() => onBulkExport('json')}
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="7,10 12,15 17,10" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round"/>
          </svg>
          Export JSON
        </button>
      </div>
    </div>
  );
}
