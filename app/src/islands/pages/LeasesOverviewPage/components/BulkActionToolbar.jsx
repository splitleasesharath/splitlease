/**
 * BulkActionToolbar - Toolbar for bulk operations on selected leases
 */

import { useState } from 'react';

export default function BulkActionToolbar({
  selectedCount,
  onSelectAll,
  onClearSelection,
  onBulkStatusChange,
  onBulkExport,
  onBulkDelete,
  isAllSelected,
  statusOptions,
}) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  return (
    <div className="bulk-toolbar">
      <div className="bulk-toolbar__info">
        <span className="bulk-toolbar__count">
          {selectedCount} selected
        </span>
        <button
          className="bulk-toolbar__select-all"
          onClick={onSelectAll}
        >
          {isAllSelected ? 'Deselect All' : 'Select All'}
        </button>
        <button
          className="bulk-toolbar__clear"
          onClick={onClearSelection}
        >
          Clear Selection
        </button>
      </div>

      <div className="bulk-toolbar__actions">
        {/* Status Change Dropdown */}
        <div className="bulk-toolbar__dropdown">
          <button
            className="bulk-toolbar__btn"
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            aria-expanded={showStatusMenu}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            Change Status
            <svg className="bulk-toolbar__dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {showStatusMenu && (
            <div className="bulk-toolbar__menu">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  className="bulk-toolbar__menu-item"
                  onClick={() => {
                    onBulkStatusChange(option.value);
                    setShowStatusMenu(false);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Export Dropdown */}
        <div className="bulk-toolbar__dropdown">
          <button
            className="bulk-toolbar__btn"
            onClick={() => setShowExportMenu(!showExportMenu)}
            aria-expanded={showExportMenu}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
            <svg className="bulk-toolbar__dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {showExportMenu && (
            <div className="bulk-toolbar__menu">
              <button
                className="bulk-toolbar__menu-item"
                onClick={() => {
                  onBulkExport('csv');
                  setShowExportMenu(false);
                }}
              >
                Export as CSV
              </button>
              <button
                className="bulk-toolbar__menu-item"
                onClick={() => {
                  onBulkExport('json');
                  setShowExportMenu(false);
                }}
              >
                Export as JSON
              </button>
            </div>
          )}
        </div>

        {/* Delete Button */}
        <button
          className="bulk-toolbar__btn bulk-toolbar__btn--danger"
          onClick={onBulkDelete}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          Cancel Selected
        </button>
      </div>
    </div>
  );
}
