/**
 * ListingsTable - Main data table for Quick Price page
 *
 * Displays listing pricing data in a scrollable table with:
 * - Selection checkboxes
 * - Listing name and location
 * - Key pricing fields
 * - Action buttons (edit, toggle active, override)
 */

import { formatCurrency } from '../../proposals/displayUtils';

export default function ListingsTable({
  listings,
  selectedListings,
  onSelectListing,
  onSelectAll,
  isAllSelected,
  onEditListing,
  onToggleActive,
  onSetOverride,
}) {
  return (
    <div className="listings-table-container">
      <table className="listings-table">
        <thead>
          <tr>
            <th className="listings-table__th listings-table__th--checkbox">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={onSelectAll}
                aria-label="Select all listings"
              />
            </th>
            <th className="listings-table__th">Name</th>
            <th className="listings-table__th">Type</th>
            <th className="listings-table__th">Location</th>
            <th className="listings-table__th listings-table__th--number">Weekly Rate</th>
            <th className="listings-table__th listings-table__th--number">Monthly Rate</th>
            <th className="listings-table__th listings-table__th--number">Override</th>
            <th className="listings-table__th listings-table__th--center">Active</th>
            <th className="listings-table__th listings-table__th--actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {listings.map((listing) => (
            <ListingRow
              key={listing.id}
              listing={listing}
              isSelected={selectedListings.includes(listing.id)}
              onSelect={onSelectListing}
              onEdit={onEditListing}
              onToggleActive={onToggleActive}
              onSetOverride={onSetOverride}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ListingRow({
  listing,
  isSelected,
  onSelect,
  onEdit,
  onToggleActive,
  onSetOverride,
}) {
  const handleOverrideClick = () => {
    if (listing.priceOverride != null) {
      // Clear override
      onSetOverride(listing.id, null);
    } else {
      // Set override - prompt for value
      const value = prompt('Enter price override (or leave empty to cancel):');
      if (value !== null && value !== '') {
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue >= 0) {
          onSetOverride(listing.id, numValue);
        }
      }
    }
  };

  return (
    <tr className={`listings-table__row ${isSelected ? 'listings-table__row--selected' : ''} ${!listing.active ? 'listings-table__row--inactive' : ''}`}>
      <td className="listings-table__td listings-table__td--checkbox">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(listing.id)}
          aria-label={`Select ${listing.name}`}
        />
      </td>
      <td className="listings-table__td listings-table__td--name">
        <div className="listings-table__name-cell">
          <span className="listings-table__name">{listing.name}</span>
          <span className="listings-table__host">{listing.hostName}</span>
        </div>
      </td>
      <td className="listings-table__td">
        <span className={`listings-table__type listings-table__type--${listing.rentalType?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`}>
          {listing.rentalType || 'N/A'}
        </span>
      </td>
      <td className="listings-table__td listings-table__td--location">
        <span className="listings-table__borough">{listing.borough || 'N/A'}</span>
        {listing.neighborhood && (
          <span className="listings-table__neighborhood">{listing.neighborhood}</span>
        )}
      </td>
      <td className="listings-table__td listings-table__td--number">
        {listing.weeklyHostRate != null ? formatCurrency(listing.weeklyHostRate) : '—'}
      </td>
      <td className="listings-table__td listings-table__td--number">
        {listing.monthlyHostRate != null ? formatCurrency(listing.monthlyHostRate) : '—'}
      </td>
      <td className="listings-table__td listings-table__td--number">
        {listing.priceOverride != null ? (
          <span className="listings-table__override listings-table__override--set">
            {formatCurrency(listing.priceOverride)}
          </span>
        ) : (
          <span className="listings-table__override listings-table__override--none">—</span>
        )}
      </td>
      <td className="listings-table__td listings-table__td--center">
        <button
          className={`listings-table__status-btn ${listing.active ? 'listings-table__status-btn--active' : 'listings-table__status-btn--inactive'}`}
          onClick={() => onToggleActive(listing.id, !listing.active)}
          title={listing.active ? 'Click to deactivate' : 'Click to activate'}
        >
          {listing.active ? 'Active' : 'Inactive'}
        </button>
      </td>
      <td className="listings-table__td listings-table__td--actions">
        <div className="listings-table__actions">
          <button
            className="listings-table__action-btn listings-table__action-btn--edit"
            onClick={() => onEdit(listing)}
            title="Edit pricing"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            className={`listings-table__action-btn ${listing.priceOverride != null ? 'listings-table__action-btn--override-active' : 'listings-table__action-btn--override'}`}
            onClick={handleOverrideClick}
            title={listing.priceOverride != null ? 'Clear override' : 'Set override'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <line x1="12" y1="1" x2="12" y2="23" strokeLinecap="round"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}
