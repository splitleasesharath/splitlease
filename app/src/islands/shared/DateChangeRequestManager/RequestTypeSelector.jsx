/**
 * Request Type Selector Component
 * Toggle buttons for selecting date change request type
 */

/**
 * @param {Object} props
 * @param {'adding' | 'removing' | 'swapping' | null} props.selectedType - Currently selected type
 * @param {Function} props.onTypeSelect - Handler for type selection
 * @param {boolean} [props.disabled=false] - Whether selector is disabled
 */
export default function RequestTypeSelector({
  selectedType,
  onTypeSelect,
  disabled = false,
}) {
  const requestTypes = [
    {
      id: 'adding',
      label: 'Add Date',
      icon: '➕',
      description: 'Add a new date to your lease',
    },
    {
      id: 'removing',
      label: 'Remove Date',
      icon: '➖',
      description: 'Remove a date from your lease',
    },
    {
      id: 'swapping',
      label: 'Swap Dates',
      icon: '🔄',
      description: 'Exchange one date for another',
    },
  ];

  return (
    <div className="dcr-type-selector">
      <h3 className="dcr-type-selector-title">What would you like to do?</h3>
      <div className="dcr-type-buttons">
        {requestTypes.map((type) => (
          <button
            key={type.id}
            className={`dcr-type-button ${selectedType === type.id ? 'dcr-type-button-active' : ''}`}
            onClick={() => onTypeSelect(type.id)}
            disabled={disabled}
            aria-pressed={selectedType === type.id}
          >
            <span className="dcr-type-icon">{type.icon}</span>
            <span className="dcr-type-label">{type.label}</span>
          </button>
        ))}
      </div>
      {selectedType && (
        <p className="dcr-type-description">
          {requestTypes.find((t) => t.id === selectedType)?.description}
        </p>
      )}
    </div>
  );
}
