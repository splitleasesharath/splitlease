/**
 * PhotoTypeDropdown Component
 *
 * Dropdown selector for room type (living room, bedroom, etc.)
 * This helps the AI generate more accurate redesigns.
 */

import clsx from 'clsx';

/**
 * @typedef {Object} PhotoTypeOption
 * @property {string} value - Option value
 * @property {string} label - Display label
 */

/**
 * @typedef {Object} PhotoTypeDropdownProps
 * @property {PhotoTypeOption[]} options - Available room types
 * @property {string|null} selectedType - Currently selected type
 * @property {(type: string|null) => void} onSelectType - Selection callback
 * @property {boolean} [disabled=false] - Whether dropdown is disabled
 */

/**
 * Dropdown for selecting room/photo type
 * @param {PhotoTypeDropdownProps} props
 */
export const PhotoTypeDropdown = ({
  options,
  selectedType,
  onSelectType,
  disabled = false,
}) => {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Room Type <span className="text-gray-400">(optional)</span>
      </label>
      <select
        value={selectedType || ''}
        onChange={(e) => onSelectType(e.target.value || null)}
        disabled={disabled}
        className={clsx(
          'w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-800',
          'focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent',
          'transition-all duration-200',
          disabled && 'opacity-50 cursor-not-allowed bg-gray-100'
        )}
      >
        <option value="">Photo Type (optional)</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};
