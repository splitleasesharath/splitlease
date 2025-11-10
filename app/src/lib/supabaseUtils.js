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

/**
 * Parse a value that may be a native array or stringified JSON array
 *
 * Supabase JSONB fields can be returned as either:
 * - Native JavaScript arrays: ["Monday", "Tuesday"]
 * - Stringified JSON arrays: '["Monday", "Tuesday"]'
 *
 * This utility handles both cases robustly, following the NO FALLBACK principle.
 *
 * @param {any} value - Value from Supabase JSONB field
 * @returns {Array} - Parsed array or empty array if parsing fails
 */
export function parseJsonArray(value) {
  // Already a native array? Return as-is
  if (Array.isArray(value)) {
    return value;
  }

  // Stringified JSON? Try to parse
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      // Verify the parsed result is actually an array
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('Failed to parse JSON array:', { value, error: error.message });
      return []; // Return empty array - NO FALLBACK to hardcoded data
    }
  }

  // Unexpected type (null, undefined, object, number, etc.)
  if (value != null) {
    console.warn('Unexpected type for JSONB array field:', { type: typeof value, value });
  }
  return []; // Return empty array - NO FALLBACK
}

/**
 * Fetch photo URLs in batch from database
 * @param {Array<string>} photoIds - Array of photo IDs to fetch
 * @returns {Promise<Object>} Map of photo ID to photo URL
 */
export async function fetchPhotoUrls(photoIds) {
  if (!photoIds || photoIds.length === 0) {
    return {};
  }

  try {
    const { data, error } = await supabase
      .from('listing_photo')
      .select('_id, Photo')
      .in('_id', photoIds);

    if (error) {
      console.error('❌ Error fetching photos:', error);
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

    console.log(`✅ Fetched ${Object.keys(photoMap).length} photo URLs`);
    return photoMap;
  } catch (error) {
    console.error('❌ Error in fetchPhotoUrls:', error);
    return {};
  }
}

/**
 * Fetch host data in batch from database
 * @param {Array<string>} hostIds - Array of account_host IDs
 * @returns {Promise<Object>} Map of account_host ID to host data {name, image, verified}
 */
export async function fetchHostData(hostIds) {
  if (!hostIds || hostIds.length === 0) {
    return {};
  }

  try {
    // Fetch account_host records
    const { data: accountHostData, error: accountError } = await supabase
      .from('account_host')
      .select('_id, User')
      .in('_id', hostIds);

    if (accountError) {
      console.error('❌ Error fetching account_host data:', accountError);
      return {};
    }

    // Collect user IDs
    const userIds = new Set();
    accountHostData.forEach(account => {
      if (account.User) {
        userIds.add(account.User);
      }
    });

    if (userIds.size === 0) {
      return {};
    }

    // Fetch user records
    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('_id, "Name - Full", "Profile Photo"')
      .in('_id', Array.from(userIds));

    if (userError) {
      console.error('❌ Error fetching user data:', userError);
      return {};
    }

    // Create user map
    const userMap = {};
    userData.forEach(user => {
      // Add https: protocol if profile photo URL starts with //
      let profilePhoto = user['Profile Photo'];
      if (profilePhoto && profilePhoto.startsWith('//')) {
        profilePhoto = 'https:' + profilePhoto;
      }

      userMap[user._id] = {
        name: user['Name - Full'] || null,
        image: profilePhoto || null,
        verified: false // TODO: Add verification logic when available
      };
    });

    // Create host map keyed by account_host ID
    const hostMap = {};
    accountHostData.forEach(account => {
      const userId = account.User;
      if (userId && userMap[userId]) {
        hostMap[account._id] = userMap[userId];
      }
    });

    console.log(`✅ Fetched host data for ${Object.keys(hostMap).length} hosts`);
    return hostMap;
  } catch (error) {
    console.error('❌ Error in fetchHostData:', error);
    return {};
  }
}

/**
 * Extract photos from Supabase photos field and convert IDs to URLs
 * @param {Array|string} photosField - Array of photo IDs or JSON string (double-encoded JSONB)
 * @param {Object} photoMap - Map of photo IDs to actual URLs
 * @param {string} listingId - Listing ID for debugging purposes
 * @returns {Array<string>} Array of photo URLs (empty array if none found)
 */
export function extractPhotos(photosField, photoMap = {}, listingId = null) {
  console.log(`📸 Processing photos for listing ${listingId}:`, {
    photosField,
    photoFieldType: typeof photosField,
    photoMapKeys: Object.keys(photoMap).length,
    photoMapSample: Object.keys(photoMap).slice(0, 3)
  });

  // Handle double-encoded JSONB using the centralized parser
  const photos = parseJsonArray(photosField);

  if (photos.length === 0) {
    console.error(`❌ Listing ${listingId}: Photos array is empty or failed to parse`);
    return []; // Return empty array - NO FALLBACK
  }

  // Convert photo IDs to actual URLs using photoMap
  const photoUrls = [];
  const missingPhotoIds = [];

  for (const photoId of photos) {
    if (typeof photoId !== 'string') {
      console.error(`❌ Listing ${listingId}: Invalid photo ID type:`, typeof photoId, photoId);
      continue;
    }

    const url = photoMap[photoId];
    if (!url) {
      console.error(`❌ Listing ${listingId}: Photo ID "${photoId}" NOT FOUND in photoMap`);
      missingPhotoIds.push(photoId);
    } else {
      console.log(`✅ Listing ${listingId}: Photo ID "${photoId}" → ${url.substring(0, 60)}...`);
      photoUrls.push(url);
    }
  }

  if (missingPhotoIds.length > 0) {
    console.error(`❌ Listing ${listingId}: Missing ${missingPhotoIds.length} photo URLs:`, missingPhotoIds);
  }

  if (photoUrls.length === 0) {
    console.error(`❌ Listing ${listingId}: NO VALID PHOTO URLS RESOLVED - returning empty array`);
  } else {
    console.log(`✅ Listing ${listingId}: Resolved ${photoUrls.length} photo URLs`);
  }

  return photoUrls.slice(0, 5); // Return actual photos only, limit to 5
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
