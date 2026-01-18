/**
 * QR Code Use Cases Configuration
 *
 * Defines the available use cases for QR codes in house manuals.
 * Maps both repository use cases and Split Lease database values.
 */

export const QR_CODE_USE_CASES = [
  {
    id: 'check-in',
    name: 'Check In',
    description: 'Instructions for guest arrival and property access',
    category: 'Arrival',
    icon: 'key'
  },
  {
    id: 'check-out',
    name: 'Check Out',
    description: 'Departure checklist and key return instructions',
    category: 'Departure',
    icon: 'logout'
  },
  {
    id: 'check-out-review',
    name: 'Check Out & Review',
    description: 'Checkout instructions combined with review request',
    category: 'Departure',
    icon: 'star-logout'
  },
  {
    id: 'wifi',
    name: 'WiFi Connection',
    description: 'Network name and password for internet access',
    category: 'Connectivity',
    icon: 'wifi'
  },
  {
    id: 'emergency',
    name: 'Emergency Lock Out',
    description: 'Emergency contact and lockout assistance info',
    category: 'Safety',
    icon: 'alert'
  },
  {
    id: 'kitchen',
    name: 'Instructions for Kitchen',
    description: 'How to use kitchen appliances and equipment',
    category: 'Appliances',
    icon: 'kitchen'
  },
  {
    id: 'laundry',
    name: 'Instructions for Laundry',
    description: 'Washer/dryer usage and laundry guidelines',
    category: 'Appliances',
    icon: 'laundry'
  },
  {
    id: 'trash',
    name: 'Instructions for Trash',
    description: 'Garbage disposal and recycling instructions',
    category: 'Guidelines',
    icon: 'trash'
  },
  {
    id: 'entertainment',
    name: 'Entertainment System',
    description: 'TV, streaming, and audio system instructions',
    category: 'Appliances',
    icon: 'tv'
  },
  {
    id: 'review',
    name: 'Review',
    description: 'Link to leave a guest review',
    category: 'Feedback',
    icon: 'star'
  },
  {
    id: 'house-rules',
    name: 'House Rules',
    description: 'Property rules and guest guidelines',
    category: 'Guidelines',
    icon: 'rules'
  },
  {
    id: 'parking',
    name: 'Parking Instructions',
    description: 'Parking location and permit information',
    category: 'Logistics',
    icon: 'car'
  },
  {
    id: 'local',
    name: 'Local Recommendations',
    description: 'Nearby restaurants, attractions, and services',
    category: 'Exploration',
    icon: 'map'
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Custom QR code for any purpose',
    category: 'Other',
    icon: 'qr'
  }
];

/**
 * Get a use case by its ID.
 * @param {string} id - Use case ID
 * @returns {object|undefined} Use case object or undefined
 */
export const getUseCaseById = (id) =>
  QR_CODE_USE_CASES.find(uc => uc.id === id);

/**
 * Get a use case by its display name.
 * @param {string} name - Use case name (e.g., "Check In")
 * @returns {object|undefined} Use case object or undefined
 */
export const getUseCaseByName = (name) =>
  QR_CODE_USE_CASES.find(uc => uc.name === name);

/**
 * Get all use cases for a specific category.
 * @param {string} category - Category name
 * @returns {Array} Array of use cases in that category
 */
export const getUseCasesByCategory = (category) =>
  QR_CODE_USE_CASES.filter(uc => uc.category === category);

/**
 * Get unique categories from all use cases.
 * @returns {Array<string>} Array of unique category names
 */
export const getCategories = () =>
  [...new Set(QR_CODE_USE_CASES.map(uc => uc.category))];

export default QR_CODE_USE_CASES;
