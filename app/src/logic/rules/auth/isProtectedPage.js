/**
 * Check if current page is a protected page requiring authentication.
 *
 * @intent Determine if the current URL requires user authentication.
 * @rule Protected pages redirect to home if user is not logged in.
 * @rule Handles both clean URLs (/guest-proposals) and .html URLs (/guest-proposals.html).
 *
 * @param {object} params - Named parameters.
 * @param {string} params.pathname - Current URL pathname.
 * @returns {boolean} True if current page requires authentication.
 *
 * @throws {Error} If pathname is not a string.
 *
 * @example
 * const protected = isProtectedPage({ pathname: '/guest-proposals' })
 * // => true
 *
 * const public = isProtectedPage({ pathname: '/search' })
 * // => false
 */
export function isProtectedPage({ pathname }) {
  // No Fallback: Validate input
  if (typeof pathname !== 'string') {
    throw new Error(
      `isProtectedPage: pathname must be a string, got ${typeof pathname}`
    )
  }

  const protectedPaths = [
    '/guest-proposals',
    '/account-profile',
    '/host-dashboard'
  ]

  // Normalize path by removing .html extension for consistent matching
  const normalizedPath = pathname.replace(/\.html$/, '')

  // Check if current path matches any protected path exactly or starts with it
  return protectedPaths.some(path =>
    normalizedPath === path || normalizedPath.startsWith(path + '/')
  )
}
