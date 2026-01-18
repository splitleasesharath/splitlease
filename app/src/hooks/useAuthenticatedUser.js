import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import { validateTokenAndFetchUser, getSessionId, getUserId, getFirstName } from '../lib/auth.js';

/**
 * Gold Standard Auth Pattern - consolidated hook
 * 3-step fallback: Token → Session → Guest fallback
 *
 * This hook consolidates the authentication logic used across SearchPage and FavoriteListingsPage.
 * It follows the established pattern:
 * 1. Try token validation via validateTokenAndFetchUser (with clearOnFailure: false)
 * 2. Fall back to Supabase session metadata if token validation fails
 * 3. Return null user if no auth found
 *
 * @param {Object} options - Configuration options
 * @param {boolean} options.requireGuest - If true, only allow guest users (future use)
 * @param {boolean} options.requireHost - If true, only allow host users (future use)
 * @returns {Object} { user, userId, loading, error, isAuthenticated }
 */
export function useAuthenticatedUser({ requireGuest = false, requireHost = false } = {}) {
  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const authenticate = async () => {
      try {
        // ========================================================================
        // GOLD STANDARD AUTH PATTERN - Step 1: Token validation with clearOnFailure: false
        // ========================================================================
        const userData = await validateTokenAndFetchUser({ clearOnFailure: false });
        const sessionId = getSessionId();

        if (userData) {
          // Success path: Use validated user data
          const finalUserId = sessionId || userData.userId || userData._id;
          setUser({
            id: finalUserId,
            name: userData.fullName || userData.firstName || '',
            email: userData.email || '',
            userType: userData.userType || 'GUEST',
            avatarUrl: userData.profilePhoto || null,
            proposalCount: userData.proposalCount ?? 0
          });
          setUserId(finalUserId);
          setLoading(false);
          return;
        }

        // ========================================================================
        // GOLD STANDARD AUTH PATTERN - Step 2: Fallback to Supabase session metadata
        // ========================================================================
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          // Session valid but profile fetch failed - use session metadata
          const finalUserId = session.user.user_metadata?.user_id || getUserId() || session.user.id;
          setUser({
            id: finalUserId,
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.first_name || getFirstName() || session.user.email?.split('@')[0] || 'User',
            email: session.user.email || '',
            userType: session.user.user_metadata?.user_type || 'GUEST',
            avatarUrl: session.user.user_metadata?.avatar_url || null,
            proposalCount: 0
          });
          setUserId(finalUserId);
          setLoading(false);
          return;
        }

        // ========================================================================
        // Step 3: No auth found
        // ========================================================================
        setUser(null);
        setUserId(null);
        setLoading(false);
      } catch (err) {
        console.error('[useAuthenticatedUser] Authentication error:', err);
        setError(err);
        setUser(null);
        setUserId(null);
        setLoading(false);
      }
    };

    authenticate();
  }, []);

  return {
    user,
    userId,
    loading,
    error,
    isAuthenticated: !!user
  };
}
