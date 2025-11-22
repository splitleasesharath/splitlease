/**
 * Validate token and fetch user data workflow.
 * Three-step process to validate authentication and retrieve user profile.
 *
 * @intent Validate user's authentication token and fetch their profile data.
 * @rule Step 1: Validate token via Bubble API (authentication check).
 * @rule Step 2: Fetch user display data from Supabase.
 * @rule Step 3: Fetch and cache user type if not already stored.
 *
 * This is an orchestration workflow that coordinates:
 * - External API validation (Bubble)
 * - Database queries (Supabase)
 * - Data transformation (user profile)
 *
 * @param {object} params - Named parameters.
 * @param {string} params.token - Authentication token to validate.
 * @param {string} params.userId - User ID for fetching profile.
 * @param {Function} params.bubbleValidateFn - Function to validate token with Bubble API.
 * @param {Function} params.supabaseFetchUserFn - Function to fetch user from Supabase.
 * @param {string|null} params.cachedUserType - Cached user type (if available).
 * @returns {Promise<object|null>} User data object or null if invalid.
 *
 * @throws {Error} If required parameters are missing.
 * @throws {Error} If validation or fetch functions are not provided.
 *
 * @example
 * const userData = await validateTokenWorkflow({
 *   token: 'abc123',
 *   userId: 'user_456',
 *   bubbleValidateFn: async (token, userId) => { ... },
 *   supabaseFetchUserFn: async (userId) => { ... },
 *   cachedUserType: 'Guest'
 * })
 * // => { userId: 'user_456', firstName: 'John', userType: 'Guest', ... }
 */
export async function validateTokenWorkflow({
  token,
  userId,
  bubbleValidateFn,
  supabaseFetchUserFn,
  cachedUserType = null
}) {
  // No Fallback: Strict validation
  if (!token || typeof token !== 'string') {
    throw new Error(
      'validateTokenWorkflow: token is required and must be a string'
    )
  }

  if (!userId || typeof userId !== 'string') {
    throw new Error(
      'validateTokenWorkflow: userId is required and must be a string'
    )
  }

  if (typeof bubbleValidateFn !== 'function') {
    throw new Error(
      'validateTokenWorkflow: bubbleValidateFn must be a function'
    )
  }

  if (typeof supabaseFetchUserFn !== 'function') {
    throw new Error(
      'validateTokenWorkflow: supabaseFetchUserFn must be a function'
    )
  }

  // Step 1: Validate token via Bubble API
  const isValidToken = await bubbleValidateFn(token, userId)

  if (!isValidToken) {
    // Token is invalid
    return null
  }

  // Step 2: Fetch user data from Supabase
  const userData = await supabaseFetchUserFn(userId)

  if (!userData) {
    // User not found
    return null
  }

  // Step 3: Handle user type (use cached or fetch from userData)
  let userType = cachedUserType

  if (!userType || userType === '') {
    userType = userData['Type - User Current'] || null
  }

  // Handle protocol-relative URLs for profile photos
  let profilePhoto = userData['Profile Photo']
  if (profilePhoto && profilePhoto.startsWith('//')) {
    profilePhoto = 'https:' + profilePhoto
  }

  // Return user data object
  return {
    userId: userData._id,
    firstName: userData['Name - First'] || null,
    fullName: userData['Name - Full'] || null,
    profilePhoto: profilePhoto || null,
    userType: userType
  }
}
