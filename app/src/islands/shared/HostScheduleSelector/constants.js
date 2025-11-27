/**
 * Constants for the Host Schedule Selector component
 * Defines the 7 nights of the week with all their attributes
 */

/**
 * All 7 nights of the week with complete metadata
 * This replicates the "Nights" option set from Bubble
 * @type {import('./types.js').Night[]}
 */
export const ALL_NIGHTS = [
  {
    id: 'sunday',
    display: 'Sunday',
    singleLetter: 'S',
    first3Letters: 'Sun',
    bubbleNumber: 1,
    bubbleNumberText: '1',
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
    bubbleNumber: 2,
    bubbleNumberText: '2',
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
    bubbleNumber: 3,
    bubbleNumberText: '3',
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
    bubbleNumber: 4,
    bubbleNumberText: '4',
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
    bubbleNumber: 5,
    bubbleNumberText: '5',
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
    bubbleNumber: 6,
    bubbleNumberText: '6',
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
    bubbleNumber: 7,
    bubbleNumberText: '7',
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
 * Get a Night object by its bubble number (1-7)
 * @param {number} num
 * @returns {import('./types.js').Night}
 */
export function getNightByNumber(num) {
  const night = ALL_NIGHTS.find((n) => n.bubbleNumber === num)
  if (!night) {
    throw new Error(`Night with bubble number ${num} not found`)
  }
  return night
}
