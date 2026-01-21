/**
 * RoomStyleSelector Component
 *
 * Grid display of interior design style options.
 * Shows 12 styles with thumbnail images and selection indicators.
 */

import clsx from 'clsx';

/**
 * @typedef {Object} RoomStyle
 * @property {string} id - Style identifier
 * @property {string} name - Display name
 * @property {string} description - Style description
 * @property {string} imageUrl - Preview image URL
 * @property {string} prompt - AI prompt
 */

/**
 * @typedef {Object} RoomStyleSelectorProps
 * @property {RoomStyle[]} styles - Available styles
 * @property {RoomStyle|null} selectedStyle - Currently selected style
 * @property {(style: RoomStyle) => void} onSelectStyle - Selection callback
 * @property {boolean} [disabled=false] - Whether selector is disabled
 */

/**
 * Grid selector for room design styles
 * @param {RoomStyleSelectorProps} props
 */
export const RoomStyleSelector = ({
  styles,
  selectedStyle,
  onSelectStyle,
  disabled = false,
}) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">Select Design Style</h3>
        {selectedStyle && (
          <span className="text-xs text-indigo-600 font-medium">
            Selected: {selectedStyle.name}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto pr-1">
        {styles.map((style) => (
          <button
            key={style.id}
            onClick={() => onSelectStyle(style)}
            disabled={disabled}
            className={clsx(
              'relative rounded-lg overflow-hidden border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2',
              selectedStyle?.id === style.id
                ? 'border-indigo-600 ring-2 ring-indigo-600 ring-offset-2'
                : 'border-transparent hover:border-gray-300',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div className="aspect-[3/2] relative">
              <img
                src={style.imageUrl}
                alt={style.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div
                className={clsx(
                  'absolute inset-0 transition-opacity duration-200',
                  selectedStyle?.id === style.id
                    ? 'bg-indigo-600/20'
                    : 'bg-black/0 hover:bg-black/10'
                )}
              />
              {selectedStyle?.id === style.id && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}
            </div>
            <div className="p-2 bg-white">
              <p
                className={clsx(
                  'text-sm font-medium truncate',
                  selectedStyle?.id === style.id
                    ? 'text-indigo-600'
                    : 'text-gray-800'
                )}
              >
                {style.name}
              </p>
              <p className="text-xs text-gray-500 truncate">{style.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
