// ─────────────────────────────────────────────────────────────
// Constants (Immutable)
// ─────────────────────────────────────────────────────────────
const PROTECTED_PATHS = Object.freeze([
  '/account-profile',
  '/host-dashboard'
])

const HTML_EXTENSION_REGEX = /\.html$/

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────
const isString = (value) => typeof value === 'string'

// ─────────────────────────────────────────────────────────────
// Path Helpers (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Remove .html extension from path (immutable)
 * @pure
 */
const normalizePathname = (pathname) =>
  pathname.replace(HTML_EXTENSION_REGEX, '')

/**
 * Check if normalized path matches a protected path
 * @pure
 */
const matchesProtectedPath = (normalizedPath, protectedPath) =>
  normalizedPath === protectedPath ||
  normalizedPath.startsWith(protectedPath + '/')

/**
 * Check if current page is a protected page requiring authentication.
 *
 * @intent Determine if the current URL requires user authentication.
 * @rule Protected pages redirect to home if user is not logged in.
 * @rule Handles both clean URLs (/account-profile) and .html URLs (/account-profile.html).
 * @pure Yes - deterministic, no side effects
 *
 * @param {object} params - Named parameters.
 * @param {string} params.pathname - Current URL pathname.
 * @returns {boolean} True if current page requires authentication.
 *
 * @throws {Error} If pathname is not a string.
 *
 * @example
 * const protected = isProtectedPage({ pathname: '/account-profile' })
 * // => true
 *
 * const public = isProtectedPage({ pathname: '/search' })
 * // => false
 */
export function isProtectedPage({ pathname }) {
  // Validation: Type check
  if (!isString(pathname)) {
    throw new Error(
      `isProtectedPage: pathname must be a string, got ${typeof pathname}`
    )
  }

  // Pure transformation pipeline
  const normalizedPath = normalizePathname(pathname)

  // Declarative check using array method
  return PROTECTED_PATHS.some((path) =>
    matchesProtectedPath(normalizedPath, path)
  )
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export { PROTECTED_PATHS }
