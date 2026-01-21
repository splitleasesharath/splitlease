/**
 * Normalize guest data from Bubble format to V7 component format
 *
 * @intent Transform Bubble-format field names to camelCase for V7 components
 * @rule Determines verification status from multiple Bubble fields
 * @rule Returns null for null/undefined input
 *
 * @param {Object} guest - Raw guest from database
 * @returns {Object|null} Normalized guest or null
 */
export function normalizeGuestData(guest) {
  if (!guest) return null;

  // Determine verification status from Bubble fields
  // "user verified?" is the main verification flag
  // "Selfie with ID" indicates ID verification was completed
  // "Verify - Linked In ID" indicates work/LinkedIn verification
  const isUserVerified = guest['user verified?'] || guest.id_verified || false;
  const hasIdVerification = !!(guest['Selfie with ID'] || guest.id_verified);
  const hasWorkVerification = !!(guest['Verify - Linked In ID'] || guest.work_verified);

  return {
    ...guest,
    // Add normalized aliases for V7 components
    name: guest['Name - Full'] || guest.name || guest.full_name || 'Guest',
    full_name: guest['Name - Full'] || guest.full_name || guest.name || 'Guest',
    first_name: guest['Name - First'] || guest.first_name || guest.firstName || 'Guest',
    profilePhoto: guest['Profile Photo'] || guest.profilePhoto || guest.profile_photo || null,
    avatar: guest['Profile Photo'] || guest.profilePhoto || guest.avatar || null,
    bio: guest['About Me / Bio'] || guest.Bio || guest.bio || guest.about || null,
    id_verified: hasIdVerification || isUserVerified,
    work_verified: hasWorkVerification,
    is_verified: isUserVerified,
    review_count: guest['Review Count'] || guest.review_count || 0,
    created_at: guest['Created Date'] || guest.created_at || null
  };
}
