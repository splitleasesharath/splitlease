import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { logger } from '../../../../lib/logger';
import { checkAuthStatus, validateTokenAndFetchUser } from '../../../../lib/auth/tokenValidation.js';
import { getFirstName } from '../../../../lib/auth/session.js';
import { getUserId } from '../../../../lib/secureStorage';

/**
 * Hook for handling authentication state and current user data
 * Follows Gold Standard auth pattern with fallback to session metadata
 */
export function useListingAuth() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authState, setAuthState] = useState({
    isChecking: true,
    shouldRedirect: false
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Step 1: Quick auth check
        const isAuthenticated = await checkAuthStatus();

        if (!isAuthenticated) {
          logger.debug('[useListingAuth] User not authenticated, redirecting to home');
          setAuthState({ isChecking: false, shouldRedirect: true });
          setTimeout(() => {
            window.location.href = '/?login=true';
          }, 100);
          return;
        }

        // Step 2: Deep validation with clearOnFailure: false
        const userData = await validateTokenAndFetchUser({ clearOnFailure: false });

        if (userData) {
          // Success path: Use validated user data
          setCurrentUser(userData);
          setAuthState({ isChecking: false, shouldRedirect: false });
          logger.debug('[useListingAuth] User data loaded:', userData['Name - First'] || userData.firstName);
        } else {
          // Step 3: Fallback to Supabase session metadata
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            // Session valid but profile fetch failed - use session metadata
            const fallbackUser = {
              _id: session.user.user_metadata?.user_id || getUserId() || session.user.id,
              id: session.user.id,
              'Name - First': session.user.user_metadata?.first_name || getFirstName() || session.user.email?.split('@')[0] || 'Host',
              'Name - Last': session.user.user_metadata?.last_name || '',
              email: session.user.email,
              firstName: session.user.user_metadata?.first_name || getFirstName() || session.user.email?.split('@')[0] || 'Host',
              lastName: session.user.user_metadata?.last_name || ''
            };
            setCurrentUser(fallbackUser);
            setAuthState({ isChecking: false, shouldRedirect: false });
            logger.debug('[useListingAuth] Using fallback user data from session:', fallbackUser.firstName);
          } else {
            // No valid session - redirect
            logger.debug('[useListingAuth] No valid session, redirecting');
            setAuthState({ isChecking: false, shouldRedirect: true });
            setTimeout(() => {
              window.location.href = '/?login=true';
            }, 100);
          }
        }
      } catch (err) {
        logger.warn('[useListingAuth] Could not fetch user data:', err);
        setAuthState({ isChecking: false, shouldRedirect: false });
      }
    };
    fetchUser();
  }, []);

  return {
    currentUser,
    authState
  };
}
