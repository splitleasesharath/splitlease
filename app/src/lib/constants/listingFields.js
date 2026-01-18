/**
 * Database field names for listings table
 * Single source of truth for all field references
 */
export const LISTING_FIELDS = {
  // Identification
  ID: '_id',
  ACTIVE: 'Active?',

  // Location
  LOCATION_HOOD: 'Location - Hood',
  LOCATION_BOROUGH: 'Location - Borough',
  LOCATION_ADDRESS: 'Location - Address',
  LOCATION_LAT: 'Location - Latitude',
  LOCATION_LNG: 'Location - Longitude',

  // Features
  FEATURE_TYPE: 'Features - Type of Space',
  FEATURE_PHOTOS: 'Features - Photos',
  FEATURE_SQFT: 'Features - SQFT Area',
  FEATURE_BEDROOMS: 'Features - Qty Bedrooms',
  FEATURE_BATHROOMS: 'Features - Qty Bathrooms',
  FEATURE_AMENITIES: 'Features - Amenities',

  // Pricing
  PRICING_MONTHLY: 'Pricing - Monthly',
  PRICING_WEEKLY: 'Pricing - Weekly',
  PRICING_DEPOSIT: 'Pricing - Deposit',

  // Scheduling
  WEEKS_OFFERED: 'Weeks offered',
  DAYS_AVAILABLE: 'Days Available',
  MIN_MOVE_IN: 'Min Move-In Date',

  // Host
  HOST_USER: 'Host User',
  HOST_NAME: 'Host Name'
};
