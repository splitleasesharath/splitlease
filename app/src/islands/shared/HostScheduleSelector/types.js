/**
 * Type definitions for the Host Schedule Selector component
 *
 * Day indices use JavaScript's 0-based standard (matching Date.getDay()):
 * 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
 *
 * @typedef {'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'} NightId
 * Night IDs (lowercase)
 *
 * @typedef {'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'} DayId
 * Day IDs for check-in/check-out calculations
 *
 * @typedef {'Nightly' | 'Monthly'} RentalType
 * Rental type for listings
 *
 * @typedef {'normal' | 'proposal' | 'preview' | 'step-by-step-guide'} ComponentMode
 * Component mode types
 *
 * @typedef {'error' | 'information' | 'warning' | 'success'} AlertType
 * Alert types for notifications
 */

/**
 * @typedef {Object} Night
 * Represents a single night of the week
 * @property {NightId} id
 * @property {string} display
 * @property {string} singleLetter
 * @property {string} first3Letters
 * @property {number} dayIndex - 0-based day index (0=Sunday through 6=Saturday)
 * @property {DayId} associatedCheckin
 * @property {DayId} associatedCheckout
 * @property {DayId} nextDay
 * @property {NightId} nextNight
 * @property {DayId} previousDay
 * @property {DayId} sameDay
 */

/**
 * @typedef {Object} Listing
 * Listing data structure
 * @property {string} id
 * @property {NightId[]} nightsAvailable
 * @property {RentalType} rentalType
 * @property {number} maximumNights
 * @property {number} [minimumNights]
 * @property {DayId[]} [selectedDays]
 * @property {DayId[]} [notSelectedDays]
 */

/**
 * @typedef {Object} HostScheduleSelectorProps
 * Props for the HostScheduleSelector component
 * @property {Listing} [listing] - The listing being edited
 * @property {NightId[]} [selectedNights] - Initially selected nights (controlled component)
 * @property {function(NightId[]): void} [onSelectionChange] - Callback when selection changes
 * @property {boolean} [isClickable=true] - Whether the selector is clickable (read-only mode)
 * @property {boolean} [inProposal=false] - Whether in proposal mode
 * @property {ComponentMode} [mode='normal'] - Component mode (affects styling and behavior)
 * @property {boolean} [doNotChangeListing=false] - Whether to update the listing object directly
 * @property {function(Partial<Listing>): void} [onListingUpdate] - Callback for when listing data should be updated
 * @property {function(string, string=, AlertType=): void} [onAlert] - Callback for alerts/notifications
 * @property {boolean} [showAlertsOnLive=true] - Whether to show alerts on live version
 * @property {boolean} [isLiveVersion=true] - Whether the component is in live version
 * @property {string} [className] - Custom class name for styling
 * @property {boolean} [enforceContiguous=false] - Whether to enforce contiguous nights
 */

/**
 * @typedef {Object} ContiguityResult
 * Contiguity check result
 * @property {boolean} isContiguous
 * @property {number[]} [gaps]
 */

/**
 * @typedef {Object} SimpleHostScheduleSelectorProps
 * Props for the SimpleHostScheduleSelector component
 * @property {Object} listing - The listing object with nights_available
 * @property {string} listing.id - The listing ID
 * @property {NightId[]} [listing.nights_available] - Available nights
 * @property {Object} supabase - Supabase client
 * @property {function(Object): void} [onUpdate] - Callback when listing is updated
 * @property {function(Error): void} [onError] - Callback when an error occurs
 * @property {boolean} [disabled=false] - Whether the selector is disabled
 */

// Export empty object to mark as module
export {}
