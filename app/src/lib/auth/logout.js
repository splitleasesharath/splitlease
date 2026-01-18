/**
 * Split Lease Authentication - Logout
 * Handles user logout and session cleanup
 */

import { supabase } from '../supabase.js';
import { getAuthToken } from './tokenValidation.js';
import { clearAuthData } from './session.js';

// ============================================================================
// User Logout
// ============================================================================

/**
 * Logout user via Supabase Edge Function (auth-user)
 * Calls logout endpoint with stored Bearer token
 * Clears all authentication data from localStorage
 *
 * ✅ MIGRATED: Now uses Edge Functions instead of direct Bubble API calls
 * API key is stored server-side in Supabase Secrets
 *
 * @returns {Promise<Object>} Response object with success status or error
 */
export async function logoutUser() {
  const token = getAuthToken();

  if (!token) {
    console.log('❌ No token found for logout');
    // Clear any remaining auth data even if no token
    clearAuthData();
    return {
      success: true,
      message: 'No active session to logout'
    };
  }

  console.log('🔓 Attempting logout via Edge Function...');

  // Sign out from Supabase Auth client explicitly
  // This ensures the client-side session is cleared from localStorage
  try {
    await supabase.auth.signOut();
    console.log('✅ Signed out from Supabase Auth client');
  } catch (err) {
    console.warn('⚠️ Error signing out from Supabase Auth client:', err);
    // Continue with legacy logout...
  }

  try {
    const { data, error } = await supabase.functions.invoke('auth-user', {
      body: {
        action: 'logout',
        payload: {
          token
        }
      }
    });

    // Clear auth data regardless of API response
    // This ensures clean logout even if API call fails
    clearAuthData();

    if (error || !data.success) {
      console.log('⚠️ Logout API returned error, but local data cleared');
      return {
        success: true,
        message: 'Logged out locally'
      };
    }

    console.log('✅ Logout successful');
    return {
      success: true,
      message: data.data.message || 'Logout successful'
    };

  } catch (error) {
    console.error('❌ Logout error:', error);
    // Auth data already cleared above
    clearAuthData();
    return {
      success: true,
      message: 'Logged out locally (network error)'
    };
  }
}
