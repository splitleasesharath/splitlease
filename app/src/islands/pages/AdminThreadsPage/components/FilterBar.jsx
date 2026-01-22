/**
 * FilterBar - Search and filter controls for threads
 */

import { Search, X } from 'lucide-react';

export default function FilterBar({
  filters,
  onFilterChange,
  onClearFilters,
  onSearch,
}) {
  const hasFilters = Object.values(filters).some(v => v.trim() !== '');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div className="admin-threads__filters">
      <div className="admin-threads__filter-row">
        <div className="admin-threads__filter-group">
          <label className="admin-threads__filter-label">Guest Email</label>
          <input
            type="text"
            className="admin-threads__filter-input"
            placeholder="Search guest email..."
            value={filters.guestEmail}
            onChange={(e) => onFilterChange('guestEmail', e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="admin-threads__filter-group">
          <label className="admin-threads__filter-label">Host Email</label>
          <input
            type="text"
            className="admin-threads__filter-input"
            placeholder="Search host email..."
            value={filters.hostEmail}
            onChange={(e) => onFilterChange('hostEmail', e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="admin-threads__filter-group">
          <label className="admin-threads__filter-label">Thread ID</label>
          <input
            type="text"
            className="admin-threads__filter-input"
            placeholder="Search thread ID..."
            value={filters.threadId}
            onChange={(e) => onFilterChange('threadId', e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="admin-threads__filter-group">
          <label className="admin-threads__filter-label">Proposal ID</label>
          <input
            type="text"
            className="admin-threads__filter-input"
            placeholder="Search proposal ID..."
            value={filters.proposalId}
            onChange={(e) => onFilterChange('proposalId', e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>

      <div className="admin-threads__filter-actions">
        <button
          className="admin-threads__filter-btn admin-threads__filter-btn--search"
          onClick={onSearch}
        >
          <Search size={16} />
          Search
        </button>

        {hasFilters && (
          <button
            className="admin-threads__filter-btn admin-threads__filter-btn--clear"
            onClick={onClearFilters}
          >
            <X size={16} />
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
}
