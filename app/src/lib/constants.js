/**
 * Split Lease Application Constants
 * Centralized configuration for API endpoints, day mappings, schedules, and other constants
 *
 * Usage:
 *   import { BUBBLE_API_URL, DAYS, SCHEDULE_PATTERNS } from './constants.js'
 */

// ============================================================================
// API Endpoints and Domains
// ============================================================================

export const AUTHORIZED_DOMAIN = 'app.split.lease';
export const BUBBLE_API_URL = 'https://app.split.lease';
export const BUBBLE_API_BASE_URL = 'https://upgradefromstr.bubbleapps.io/version-test/api/1.1';
export const SIGNUP_LOGIN_URL = 'https://app.split.lease/signup-login';
export const SEARCH_URL = 'https://app.split.lease/search';
export const VIEW_LISTING_URL = 'https://app.split.lease/view-split-lease';
export const ACCOUNT_PROFILE_URL = 'https://app.split.lease/account-profile';
export const FAQ_URL = 'https://app.split.lease/faq';
export const EMBED_AI_DRAWER_URL = 'https://app.split.lease/embed-ai-drawer';

// API Endpoints
export const REFERRAL_API_ENDPOINT = 'https://app.split.lease/api/1.1/wf/referral-index-lite';
export const BUBBLE_MESSAGING_ENDPOINT = 'https://app.split.lease/api/1.1/wf/core-contact-host-send-message';
export const AI_SIGNUP_WORKFLOW_URL = 'https://app.split.lease/version-test/api/1.1/wf/ai-signup-guest';

// External API Keys and Configuration
export const GOOGLE_MAPS_API_KEY = 'AIzaSyCFcO3jCTvR69iA4UAxPi-sWHJ7zWPMJWo';
export const BUBBLE_API_KEY = '05a7a0d1d2400a0b574acd99748e07a0';
export const AI_SIGNUP_BUBBLE_KEY = '5dbb448f9a6bbb043cb56ac16b8de109';

// Supabase Configuration
export const SUPABASE_URL = 'https://qcfifybkaddcoimjroca.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZmlmeWJrYWRkY29pbWpyb2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NzU0MDUsImV4cCI6MjA3NTA1MTQwNX0.glGwHxds0PzVLF1Y8VBGX0jYz3zrLsgE9KAWWwkYms8';

// ============================================================================
// Lottie Animation URLs
// ============================================================================

export const LOTTIE_ANIMATIONS = {
  HEADER_ICON: 'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1760473171600x280130752685858750/atom%20animation.json',
  PARSING: 'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1722533720265x199451206376484160/Animation%20-%201722533570126.json',
  LOADING: 'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1720724605167x733559911663532000/Animation%20-%201720724343172.lottie',
  SUCCESS: 'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1745939792891x394981453861459140/Report.json',
  ATOM_WHITE: 'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1746105302928x174581704119754800/atom%20white.json'
};

// ============================================================================
// Day Constants and Mappings
// ============================================================================

export const DAYS = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6
};

export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

export const DAY_ABBREVIATIONS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Bubble API day numbering (1-based, Sunday=1)
export const BUBBLE_DAY_NUMBERS = {
  SUNDAY: 1,
  MONDAY: 2,
  TUESDAY: 3,
  WEDNESDAY: 4,
  THURSDAY: 5,
  FRIDAY: 6,
  SATURDAY: 7
};

// ============================================================================
// Schedule Patterns and Presets
// ============================================================================

export const SCHEDULE_PATTERNS = {
  WEEKNIGHT: [1, 2, 3, 4, 5], // Monday-Friday (1-based for Bubble API)
  WEEKEND: [6, 7, 1, 2],      // Friday-Sunday+Monday (1-based for Bubble API)
  WEEKLY: [1, 2, 3, 4, 5, 6, 7], // All days (1-based for Bubble API)
  EVERY_WEEK: 'Every week',
  ONE_ON_OFF: 'One week on, one week off',
  TWO_ON_OFF: 'Two weeks on, two weeks off',
  ONE_THREE_OFF: 'One week on, three weeks off'
};

export const WEEK_PATTERNS = {
  'every-week': 'Every week',
  'one-on-off': 'One week on, one week off',
  'two-on-off': 'Two weeks on, two weeks off',
  'one-three-off': 'One week on, three weeks off'
};

// ============================================================================
// Price Configuration
// ============================================================================

export const PRICE_TIERS = {
  'under-200': { min: 0, max: 199.99, label: 'Under $200' },
  '200-350': { min: 200, max: 350, label: '$200 - $350' },
  '350-500': { min: 350.01, max: 500, label: '$350 - $500' },
  '500-plus': { min: 500.01, max: 999999, label: '$500+' },
  'all': null // No price filter
};

// Price field mappings for nights-based pricing
export const PRICE_FIELD_MAP = {
  2: 'Price 2 nights selected',
  3: 'Price 3 nights selected',
  4: 'Price 4 nights selected',
  5: 'Price 5 nights selected',
  6: 'Price 6 nights selected',
  7: 'Price 7 nights selected'
};

// ============================================================================
// Sort Options
// ============================================================================

export const SORT_OPTIONS = {
  'recommended': {
    field: '"Modified Date"',
    ascending: false,
    label: 'Recommended',
    description: 'Our curated recommendations'
  },
  'price-low': {
    field: '"Standarized Minimum Nightly Price (Filter)"',
    ascending: true,
    label: 'Price: Low to High',
    description: 'Lowest price first'
  },
  'most-viewed': {
    field: '"Metrics - Click Counter"',
    ascending: false,
    label: 'Most Popular',
    description: 'Most popular listings'
  },
  'recent': {
    field: '"Created Date"',
    ascending: false,
    label: 'Newest',
    description: 'Newest listings first'
  }
};

// ============================================================================
// Contact and Support Information
// ============================================================================

export const SUPPORT_CONTACTS = {
  EMAIL: 'support@splitlease.com',
  PHONE: '1-800-SPLIT-LEASE',
  EMERGENCY: '911'
};

// Support action types
export const SUPPORT_ACTIONS = {
  CHAT: 'chat',
  EMAIL: 'email',
  CALL: 'call',
  FAQ: 'faq'
};

// ============================================================================
// Authentication and User Session
// ============================================================================

export const AUTH_STORAGE_KEYS = {
  TOKEN: 'splitlease_auth_token',
  SESSION_ID: 'splitlease_session_id',
  LAST_AUTH: 'splitlease_last_auth',
  USERNAME: 'username',
  LOGGED_IN: 'loggedIn'
};

export const SESSION_VALIDATION = {
  MAX_AGE_MS: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  MAX_AUTH_CHECK_ATTEMPTS: 3,
  CACHE_VALIDITY_MS: 60 * 1000 // 1 minute for auth cache
};

// ============================================================================
// Iframe and Modal Configuration
// ============================================================================

export const IFRAME_LOADER_CONFIG = {
  PRELOAD_THRESHOLD: 30, // Intent score threshold for preloading
  STATES: {
    NOT_LOADED: 'NOT_LOADED',
    LOADING: 'LOADING',
    LOADED: 'LOADED',
    ERROR: 'ERROR'
  }
};

export const INTENT_SCORES = {
  HEADER_PROXIMITY: 10,      // Mouse near header
  HOVER_SIGNIN: 40,          // Hover on Sign In/Up (high intent)
  FOCUS_SIGNIN: 35,          // Focus on Sign In/Up
  SCROLL_DEPTH: 20,          // Scrolled past 50%
  IDLE_TIME: 15,             // User idle for 3 seconds
  MOBILE_TOUCH: 25,          // Mobile touch detected
  TAB_NAVIGATION: 5           // Tab navigation
};

export const ANIMATION_TIMING = {
  INTENT_IDLE_MS: 3000,      // 3 seconds of idle
  SCROLL_DEPTH_THRESHOLD: 50, // 50% scroll depth
  PRELOAD_DELAY_MS: 4000,    // 4 second delay for Market Research preload
  AUTH_CHECK_DELAY_MS: 2000,  // 2 second delay for auth state check
  LOGIN_REDIRECT_MS: 2000,    // 2 second delay before redirect
  ANIMATION_SPEED: 10         // 10fps for Lottie-like animations
};

// ============================================================================
// Listing Configuration
// ============================================================================

export const LISTING_CONFIG = {
  INITIAL_LOAD_COUNT: 6,      // Load first 6 listings initially
  LOAD_BATCH_SIZE: 6,         // Load 6 more listings per scroll
  LAZY_LOAD_MARGIN_PX: 100,   // Load 100px before sentinel becomes visible
  AMENITIES_MAX_VISIBLE: 6,   // Show max 6 amenities, rest in "+X more"
  IMAGE_CAROUSEL_LOOP: true,  // Loop carousel images
  AI_CARD_POSITIONS: [4, 8]   // Insert AI Research card after positions 4 and 8
};

// ============================================================================
// Property IDs (Real Properties from Split Lease)
// ============================================================================

export const PROPERTY_IDS = {
  ONE_PLATT_STUDIO: '1586447992720x748691103167545300',
  PIED_A_TERRE: '1701107772942x447054126943830000',
  FURNISHED_1BR: '1701115344294x620453327586984000',
  FURNISHED_STUDIO: '1701196985127x160157906679627780'
};

// ============================================================================
// Database Table Names and Field Names
// ============================================================================

export const DATABASE = {
  TABLES: {
    BOROUGH: 'zat_geo_borough_toplevel',
    NEIGHBORHOOD: 'zat_geo_hood_mediumlevel',
    LISTING_TYPE: 'zat_features_listingtype'
  },
  BOROUGH_FIELDS: {
    ID: '_id',
    NAME: 'Display',
    VALUE: 'value'
  },
  NEIGHBORHOOD_FIELDS: {
    ID: '_id',
    NAME: 'Display',
    BOROUGH_ID: 'Borough',
    VALUE: 'value'
  }
};

// ============================================================================
// CSS Variables and Styling
// ============================================================================

export const COLORS = {
  PRIMARY: '#5B21B6',      // Purple
  PRIMARY_HOVER: '#4c1d95', // Darker purple
  SECONDARY: '#31135D',     // Deep purple
  SUCCESS: '#00C851',       // Green
  WARNING: '#FFA500',       // Orange
  ERROR: '#EF4444',         // Red
  TEXT_DARK: '#1a1a1a',
  TEXT_LIGHT: '#6b7280',
  BG_LIGHT: '#f3f4f6',
  BG_WHITE: '#ffffff'
};

// ============================================================================
// Environment Detection
// ============================================================================

export const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production'
};

export const ENVIRONMENT_CONFIG = {
  development: { logLevel: 'DEBUG' },
  staging: { logLevel: 'INFO' },
  production: { logLevel: 'WARN' }
};

// ============================================================================
// Toast Notification Configuration
// ============================================================================

export const TOAST_CONFIG = {
  DURATION_MS: 5000,
  TYPES: {
    INFO: 'info',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error'
  }
};

// ============================================================================
// Validation Rules
// ============================================================================

export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_MIN_DIGITS: 10,
  URL_PROTOCOLS: ['http://', 'https://'],
  MIN_DAYS_SELECTED: 1,
  MAX_DAYS_SELECTED: 7,
  MIN_CONTINUOUS_DAYS: 1
};

// ============================================================================
// Aria Labels and Accessibility
// ============================================================================

export const ARIA_LABELS = {
  PRICE_INFO: 'Price information - click for details',
  MESSAGE_HOST: 'Message this host',
  PREVIOUS_IMAGE: 'Previous image',
  NEXT_IMAGE: 'Next image',
  REMOVE_NEIGHBORHOOD: 'Remove {{name}}'
};

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULTS = {
  DEFAULT_BOROUGH: 'manhattan',
  DEFAULT_WEEK_PATTERN: 'every-week',
  DEFAULT_PRICE_TIER: 'all',
  DEFAULT_SORT_BY: 'recommended',
  DEFAULT_SELECTED_DAYS: [1, 2, 3, 4, 5], // Monday-Friday (0-based)
  DEFAULT_SELECTED_DAYS_BUBBLE: [2, 3, 4, 5, 6], // Monday-Friday (1-based for Bubble API)
  NYC_CENTER_LAT: 40.7580,
  NYC_CENTER_LNG: -73.9855,
  MAP_DEFAULT_ZOOM: 13,
  MINUTES_PER_NIGHT: 24 * 60 // 1440 minutes
};

// ============================================================================
// Sidebar and Navigation
// ============================================================================

export const SIDEBAR_CONFIG = {
  FILTER_PANEL_ID: 'filterPanel',
  MAP_SECTION_ID: 'mapSection',
  LISTINGS_CONTAINER_ID: 'listingsContainer',
  BOROUGH_SELECT_ID: 'boroughSelect',
  WEEK_PATTERN_ID: 'weekPattern',
  PRICE_TIER_ID: 'priceTier',
  SORT_BY_ID: 'sortBy',
  NEIGHBORHOOD_SEARCH_ID: 'neighborhoodSearch'
};
