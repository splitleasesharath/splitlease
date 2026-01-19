/**
 * Process raw user data from Supabase into a clean, validated user object.
 *
 * @intent Transform raw user rows from Supabase into consistent, UI-ready format.
 * @rule NO FALLBACK - Throws explicit errors for missing critical fields.
 *
 * @param {object} rawUser - Raw user object from Supabase.
 * @returns {object} Clean, validated user object.
 *
 * @throws {Error} If rawUser is null/undefined.
 * @throws {Error} If critical _id field is missing.
 *
 * @example
 * const user = processUserData({
 *   _id: '123',
 *   'Name - Full': 'Jane Doe',
 *   'Name - First': 'Jane',
 *   'Profile Photo': 'https://...',
 *   'About Me / Bio': 'Software engineer...',
 *   'user verified?': true
 * })
 */
export function processUserData(rawUser) {
  if (!rawUser) {
    throw new Error('processUserData: User data is required');
  }

  if (!rawUser._id) {
    throw new Error('processUserData: User ID (_id) is required');
  }

  return {
    id: rawUser._id,
    firstName: rawUser['Name - First'] || null,
    lastName: rawUser['Name - Last'] || null,
    fullName: rawUser['Name - Full'] || null,
    profilePhoto: rawUser['Profile Photo'] || null,
    bio: rawUser['About Me / Bio'] || null,
    linkedInVerified: rawUser['Verify - Linked In ID'] || false,
    phoneVerified: rawUser['Verify - Phone'] || false,
    userVerified: rawUser['user verified?'] || false,
    proposalsList: rawUser['Proposals List'] || []
  };
}
