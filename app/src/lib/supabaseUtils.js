/**
 * Supabase Utilities Module
 *
 * Centralized data fetching logic for photos, hosts, and amenities.
 * Follows NO FALLBACK principle - returns real data or empty/null values.
 *
 * @module supabaseUtils
 */

import { supabase } from './supabase.js';
import { DATABASE } from './constants.js';
import { logger } from './logger.js';

/**
 * Parse a value that may be a native array or stringified JSON array
 * Re-exported from logic layer to maintain backward compatibility.
 *
 * @deprecated Prefer importing parseJsonArrayFieldOptional directly from logic layer
 * @see app/src/logic/processors/listing/parseJsonArrayField.js
 */
export { parseJsonArrayFieldOptional as parseJsonArray } from '../logic/processors/listing/parseJsonArrayField.js';

/**
 * Fetch photo URLs in batch from database
 * @param {Array<string>} photoIds - Array of photo IDs to fetch
 * @returns {Promise<Object>} Map of photo ID to photo URL
 */
export async function fetchPhotoUrls(photoIds) {
  logger.debug('fetchPhotoUrls called', { count: photoIds?.length || 0 });

  if (!photoIds || photoIds.length === 0) {
    return {};
  }

  try {
    const { data, error } = await supabase
      .from('listing_photo')
      .select('_id, Photo')
      .in('_id', photoIds);

    if (error) {
      logger.error('Error fetching photos:', error);
      return {};
    }

    if (!data || data.length === 0) {
      return {};
    }

    // Create a map of photo ID to URL
    const photoMap = {};
    data.forEach(photo => {
      if (photo.Photo) {
        // Add https: protocol if URL starts with //
        let photoUrl = photo.Photo;
        if (photoUrl.startsWith('//')) {
          photoUrl = 'https:' + photoUrl;
        }
        photoMap[photo._id] = photoUrl;
      }
    });

    logger.debug('Fetched photo URLs', { count: Object.keys(photoMap).length });
    return photoMap;
  } catch (error) {
    logger.error('Error in fetchPhotoUrls:', error);
    return {};
  }
}

/**
 * Fetch host data in batch from database
 * After migration, hostIds are always user._id values (Host User column)
 * @param {Array<string>} hostIds - Array of host IDs (user._id)
 * @returns {Promise<Object>} Map of host ID to host data {name, image, verified}
 */
export async function fetchHostData(hostIds) {
  if (!hostIds || hostIds.length === 0) {
    return {};
  }

  const hostMap = {};

  try {
    // hostIds are user._id values (Host User column contains user._id directly)
    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('_id, "Name - Full", "Profile Photo"')
      .in('_id', hostIds);

    if (userError) {
      logger.error('Error fetching user data by _id:', userError);
    }

    // Process users found by _id
    if (userData && userData.length > 0) {
      userData.forEach(user => {
        let profilePhoto = user['Profile Photo'];
        if (profilePhoto && profilePhoto.startsWith('//')) {
          profilePhoto = 'https:' + profilePhoto;
        }
        hostMap[user._id] = {
          name: user['Name - Full'] || null,
          image: profilePhoto || null,
          verified: false,
          userId: user._id
        };
      });
    }

    logger.debug('Fetched host data', { count: Object.keys(hostMap).length });
    return hostMap;
  } catch (error) {
    logger.error('Error in fetchHostData:', error);
    return {};
  }
}

/**
 * Extract photos from Supabase photos field.
 * Handles three formats:
 * 1. Embedded objects: [{id, url, Photo, ...}, ...]
 * 2. Direct URL strings: ["https://...", "https://...", ...]
 * 3. Legacy IDs (deprecated): ["photoId1", "photoId2"] - requires photoMap
 *
 * @param {Array|string} photosField - Array of photo objects/URLs/IDs or JSON string
 * @param {Object} photoMap - Map of photo IDs to URLs (only needed for legacy ID format)
 * @param {string} listingId - Listing ID for debugging purposes
 * @returns {Array<string>} Array of photo URLs (empty array if none found)
 */
export function extractPhotos(photosField, photoMap = {}, listingId = null) {
  // Handle double-encoded JSONB using the centralized parser
  const photos = parseJsonArray({ field: photosField, fieldName: 'photos' });

  if (photos.length === 0) {
    return []; // Return empty array - NO FALLBACK
  }

  const photoUrls = [];

  for (const photo of photos) {
    // New embedded format: photo is an object with url/Photo field
    if (typeof photo === 'object' && photo !== null) {
      // Extract URL from object (prefer 'url' then 'Photo')
      let photoUrl = photo.url || photo.Photo || null;

      if (photoUrl) {
        // Add https: protocol if URL starts with //
        if (photoUrl.startsWith('//')) {
          photoUrl = 'https:' + photoUrl;
        }
        photoUrls.push(photoUrl);
      }
      continue;
    }

    // String format: could be a direct URL or a legacy ID
    if (typeof photo === 'string') {
      // Check if it's already a valid URL (starts with http://, https://, or //)
      if (photo.startsWith('http://') || photo.startsWith('https://') || photo.startsWith('//')) {
        let photoUrl = photo;
        // Add https: protocol if URL starts with //
        if (photoUrl.startsWith('//')) {
          photoUrl = 'https:' + photoUrl;
        }
        photoUrls.push(photoUrl);
        continue;
      }

      // Legacy format: photo is an ID string - look up in photoMap
      const url = photoMap[photo];
      if (url) {
        photoUrls.push(url);
      }
      continue;
    }
  }

  if (photoUrls.length === 0) {
    logger.warn(`Listing ${listingId}: NO VALID PHOTO URLS RESOLVED`);
  }

  return photoUrls; // Return all actual photos
}

/**
 * Parse amenities from database fields and return prioritized list with icons
 * @param {Object} dbListing - Raw listing from database
 * @returns {Array} Array of amenity objects with icon, name, and priority
 */
export function parseAmenities(dbListing) {
  // Amenities map with icons and priority (lower = higher priority)
  const amenitiesMap = {
    'wifi': { icon: '📶', name: 'WiFi', priority: 1 },
    'furnished': { icon: '🛋️', name: 'Furnished', priority: 2 },
    'pet': { icon: '🐕', name: 'Pet-Friendly', priority: 3 },
    'dog': { icon: '🐕', name: 'Pet-Friendly', priority: 3 },
    'cat': { icon: '🐕', name: 'Pet-Friendly', priority: 3 },
    'washer': { icon: '🧺', name: 'Washer/Dryer', priority: 4 },
    'dryer': { icon: '🧺', name: 'Washer/Dryer', priority: 4 },
    'parking': { icon: '🅿️', name: 'Parking', priority: 5 },
    'elevator': { icon: '🏢', name: 'Elevator', priority: 6 },
    'gym': { icon: '💪', name: 'Gym', priority: 7 },
    'doorman': { icon: '🚪', name: 'Doorman', priority: 8 },
    'ac': { icon: '❄️', name: 'A/C', priority: 9 },
    'air conditioning': { icon: '❄️', name: 'A/C', priority: 9 },
    'kitchen': { icon: '🍳', name: 'Kitchen', priority: 10 },
    'balcony': { icon: '🌿', name: 'Balcony', priority: 11 },
    'workspace': { icon: '💻', name: 'Workspace', priority: 12 },
    'desk': { icon: '💻', name: 'Workspace', priority: 12 }
  };

  const amenities = [];
  const foundAmenities = new Set(); // Track which amenities we've already added

  // Check Features field (if it exists as a string or array)
  const features = dbListing['Features'];
  if (features) {
    const featureText = typeof features === 'string' ? features.toLowerCase() : '';

    for (const [key, amenity] of Object.entries(amenitiesMap)) {
      if (featureText.includes(key) && !foundAmenities.has(amenity.name)) {
        amenities.push(amenity);
        foundAmenities.add(amenity.name);
      }
    }
  }

  // Check Kitchen Type field - if it's "Full Kitchen", add kitchen amenity
  const kitchenType = dbListing['Kitchen Type'];
  if (kitchenType && kitchenType.toLowerCase().includes('kitchen') && !foundAmenities.has('Kitchen')) {
    amenities.push(amenitiesMap['kitchen']);
    foundAmenities.add('Kitchen');
  }

  // Sort by priority (lower number = higher priority)
  amenities.sort((a, b) => a.priority - b.priority);

  return amenities; // Return empty array if no amenities found - this is truthful, not a fallback
}
