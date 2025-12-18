/**
 * Constants for the Host Schedule Selector component
 * Defines the 7 nights of the week with all their attributes
 *
 * Day indices use JavaScript's 0-based standard (matching Date.getDay()):
 * 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
 */

/**
 * All 7 nights of the week with complete metadata
 * @type {import('./types.js').Night[]}
 */
export const ALL_NIGHTS = [
  {
    id: 'sunday',
    display: 'Sunday',
    singleLetter: 'S',
    first3Letters: 'Sun',
    dayIndex: 0,
    associatedCheckin: 'Sunday',
    associatedCheckout: 'Monday',
    nextDay: 'Monday',
    nextNight: 'monday',
    previousDay: 'Saturday',
    sameDay: 'Sunday',
  },
  {
    id: 'monday',
    display: 'Monday',
    singleLetter: 'M',
    first3Letters: 'Mon',
    dayIndex: 1,
    associatedCheckin: 'Monday',
    associatedCheckout: 'Tuesday',
    nextDay: 'Tuesday',
    nextNight: 'tuesday',
    previousDay: 'Sunday',
    sameDay: 'Monday',
  },
  {
    id: 'tuesday',
    display: 'Tuesday',
    singleLetter: 'T',
    first3Letters: 'Tue',
    dayIndex: 2,
    associatedCheckin: 'Tuesday',
    associatedCheckout: 'Wednesday',
    nextDay: 'Wednesday',
    nextNight: 'wednesday',
    previousDay: 'Monday',
    sameDay: 'Tuesday',
  },
  {
    id: 'wednesday',
    display: 'Wednesday',
    singleLetter: 'W',
    first3Letters: 'Wed',
    dayIndex: 3,
    associatedCheckin: 'Wednesday',
    associatedCheckout: 'Thursday',
    nextDay: 'Thursday',
    nextNight: 'thursday',
    previousDay: 'Tuesday',
    sameDay: 'Wednesday',
  },
  {
    id: 'thursday',
    display: 'Thursday',
    singleLetter: 'T',
    first3Letters: 'Thu',
    dayIndex: 4,
    associatedCheckin: 'Thursday',
    associatedCheckout: 'Friday',
    nextDay: 'Friday',
    nextNight: 'friday',
    previousDay: 'Wednesday',
    sameDay: 'Thursday',
  },
  {
    id: 'friday',
    display: 'Friday',
    singleLetter: 'F',
    first3Letters: 'Fri',
    dayIndex: 5,
    associatedCheckin: 'Friday',
    associatedCheckout: 'Saturday',
    nextDay: 'Saturday',
    nextNight: 'saturday',
    previousDay: 'Thursday',
    sameDay: 'Friday',
  },
  {
    id: 'saturday',
    display: 'Saturday',
    singleLetter: 'S',
    first3Letters: 'Sat',
    dayIndex: 6,
    associatedCheckin: 'Saturday',
    associatedCheckout: 'Sunday',
    nextDay: 'Sunday',
    nextNight: 'sunday',
    previousDay: 'Friday',
    sameDay: 'Saturday',
  },
]

/**
 * Map of night IDs to Night objects for quick lookup
 * @type {Map<import('./types.js').NightId, import('./types.js').Night>}
 */
export const NIGHTS_MAP = new Map(
  ALL_NIGHTS.map((night) => [night.id, night])
)

/**
 * Get a Night object by its ID
 * @param {import('./types.js').NightId} id
 * @returns {import('./types.js').Night}
 */
export function getNightById(id) {
  const night = NIGHTS_MAP.get(id)
  if (!night) {
    throw new Error(`Night with id "${id}" not found`)
  }
  return night
}

/**
 * Get a Night object by its day index (0-6, JS format)
 * 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
 * @param {number} dayIndex - 0-based day index
 * @returns {import('./types.js').Night}
 */
export function getNightByDayIndex(dayIndex) {
  const night = ALL_NIGHTS.find((n) => n.dayIndex === dayIndex)
  if (!night) {
    throw new Error(`Night with day index ${dayIndex} not found`)
  }
  return night
}

/**
 * @deprecated Use getNightByDayIndex instead. This function is kept for backwards compatibility.
 * @param {number} num - 0-based day index (NOT 1-based Bubble number)
 * @returns {import('./types.js').Night}
 */
export function getNightByNumber(num) {
  console.warn('getNightByNumber is deprecated. Use getNightByDayIndex instead.')
  return getNightByDayIndex(num)
}
