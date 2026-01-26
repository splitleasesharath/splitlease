/**
 * ResponseListItem - Individual response item in the list
 *
 * Props:
 * - response: Response object with name, type, date
 * - isSelected: Boolean indicating if this item is selected
 * - onSelect: Handler for clicking this item
 */

export default function ResponseListItem({ response, isSelected, onSelect }) {
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <button
      type="button"
      className={`er-list-item ${isSelected ? 'er-list-item--selected' : ''}`}
      onClick={onSelect}
      aria-pressed={isSelected}
    >
      <div className="er-list-item-header">
        <span className="er-list-item-name">{response.name || 'Anonymous'}</span>
        <span
          className={`er-list-item-type er-list-item-type--${response.type?.toLowerCase() || 'unknown'}`}
        >
          {response.type || 'Unknown'}
        </span>
      </div>
      <div className="er-list-item-date">{formatDate(response.date)}</div>
    </button>
  );
}
