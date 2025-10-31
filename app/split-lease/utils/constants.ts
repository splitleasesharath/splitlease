/**
 * Application-wide constants
 */

/**
 * Days of the week
 */
export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export const DAYS_OF_WEEK_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/**
 * Schedule pattern presets
 */
export const SCHEDULE_PRESETS = {
  WEEKNIGHTS: {
    name: 'Weeknights',
    description: 'Monday through Thursday',
    days: [1, 2, 3, 4],
  },
  WEEKENDS: {
    name: 'Weekends',
    description: 'Friday through Sunday',
    days: [5, 6, 0],
  },
  FULL_WEEK: {
    name: 'Full Week',
    description: 'All 7 days',
    days: [0, 1, 2, 3, 4, 5, 6],
  },
} as const;

/**
 * Date formats
 */
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  DISPLAY_WITH_TIME: 'MMM dd, yyyy h:mm a',
  API: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
  SHORT: 'MM/dd/yyyy',
  ISO: 'yyyy-MM-dd',
} as const;

/**
 * Currency settings
 */
export const CURRENCY = {
  CODE: 'USD',
  SYMBOL: '$',
  LOCALE: 'en-US',
} as const;

/**
 * Amenities available for listings
 */
export const AMENITIES = [
  'WiFi',
  'Kitchen',
  'Washer',
  'Dryer',
  'Air Conditioning',
  'Heating',
  'TV',
  'Parking',
  'Pool',
  'Hot Tub',
  'Gym',
  'Workspace',
  'Pets Allowed',
  'Smoking Allowed',
] as const;

/**
 * Property types
 */
export const PROPERTY_TYPES = [
  'House',
  'Apartment',
  'Condo',
  'Townhouse',
  'Studio',
  'Loft',
  'Villa',
  'Cabin',
] as const;

/**
 * Listing statuses
 */
export const LISTING_STATUSES = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
} as const;

/**
 * Booking statuses
 */
export const BOOKING_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
} as const;

/**
 * Proposal statuses
 */
export const PROPOSAL_STATUSES = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  COUNTERED: 'countered',
} as const;

/**
 * User roles
 */
export const USER_ROLES = {
  GUEST: 'guest',
  OWNER: 'owner',
  ADMIN: 'admin',
} as const;

/**
 * Review rating range
 */
export const REVIEW_RATING = {
  MIN: 1,
  MAX: 5,
} as const;

/**
 * Pagination defaults
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

/**
 * Image constraints
 */
export const IMAGE_CONSTRAINTS = {
  MAX_SIZE_MB: 5,
  MAX_COUNT: 10,
  ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'],
} as const;

/**
 * Validation constraints
 */
export const VALIDATION = {
  TITLE_MIN_LENGTH: 1,
  TITLE_MAX_LENGTH: 200,
  DESCRIPTION_MIN_LENGTH: 1,
  DESCRIPTION_MAX_LENGTH: 5000,
  NAME_MIN_LENGTH: 1,
  NAME_MAX_LENGTH: 100,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  PHONE_REGEX: /^[\d\s\-\+\(\)]+$/,
  ZIP_CODE_REGEX: /^\d{5}(-\d{4})?$/,
} as const;

/**
 * Local storage keys (exported from API config for consistency)
 */
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'splitlease_access_token',
  REFRESH_TOKEN: 'splitlease_refresh_token',
  USER: 'splitlease_user',
  PREFERENCES: 'splitlease_preferences',
  SEARCH_HISTORY: 'splitlease_search_history',
  RECENT_LISTINGS: 'splitlease_recent_listings',
} as const;

/**
 * Analytics event names
 */
export const ANALYTICS_EVENTS = {
  PAGE_VIEW: 'page_view',
  LISTING_VIEW: 'listing_view',
  LISTING_SEARCH: 'listing_search',
  BOOKING_INITIATED: 'booking_initiated',
  BOOKING_COMPLETED: 'booking_completed',
  PROPOSAL_SUBMITTED: 'proposal_submitted',
  USER_REGISTERED: 'user_registered',
  USER_LOGIN: 'user_login',
  ERROR_OCCURRED: 'error_occurred',
} as const;

/**
 * Routes
 */
export const ROUTES = {
  HOME: '/',
  SEARCH: '/search',
  LISTING_DETAIL: (id: string) => `/view-split-lease?id=${id}`,
  MY_LISTINGS: '/my-listings',
  MY_BOOKINGS: '/my-bookings',
  LOGIN: '/login',
  REGISTER: '/register',
  PROFILE: '/profile',
} as const;

/**
 * Breakpoints for responsive design
 */
export const BREAKPOINTS = {
  XS: 320,
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  XXL: 1536,
} as const;
