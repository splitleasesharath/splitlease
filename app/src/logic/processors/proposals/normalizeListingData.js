/**
 * Normalize listing data from Bubble format to V7 component format
 *
 * @intent Transform Bubble-format field names to camelCase for V7 components
 * @rule Always preserves original fields for backwards compatibility
 * @rule Returns null for null/undefined input
 *
 * @param {Object} listing - Raw listing from database
 * @returns {Object|null} Normalized listing or null
 */
export function normalizeListingData(listing) {
  if (!listing) return null;
  return {
    ...listing,
    title: listing.Name || listing.title || listing.name || 'Unnamed Listing',
    name: listing.Name || listing.title || listing.name || 'Unnamed Listing',
    thumbnail: listing['Cover Photo'] || listing.thumbnail || listing.cover_photo || null,
    neighborhood: listing.Neighborhood || listing.neighborhood || null,
    address: listing['Full Address'] || listing.address || listing.full_address || null,
    bedrooms: listing['Bedrooms (number)'] || listing.bedrooms || 0,
    bathrooms: listing['Bathrooms (number)'] || listing.bathrooms || 0,
    monthly_rate: listing['Monthly Rate'] || listing.monthly_rate || 0
  };
}
