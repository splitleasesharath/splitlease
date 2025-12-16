/**
 * useNotificationSettings Hook
 *
 * Manages notification preferences with optimistic updates.
 * Directly queries Supabase notification_preferences table.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase.js';
import { getDefaultPreferences } from './notificationCategories.js';

export function useNotificationSettings(userId) {
  const [preferences, setPreferences] = useState(getDefaultPreferences());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingToggles, setPendingToggles] = useState(new Set());

  /**
   * Fetch user's notification preferences
   */
  const fetchPreferences = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Try to fetch existing preferences
      const { data, error: fetchError } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is expected for new users
        throw fetchError;
      }

      if (data) {
        // User has existing preferences
        setPreferences(data);
      } else {
        // Create default preferences for new user
        const defaultPrefs = {
          user_id: userId,
          ...getDefaultPreferences()
        };

        const { data: newData, error: insertError } = await supabase
          .from('notification_preferences')
          .insert(defaultPrefs)
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        setPreferences(newData);
      }
    } catch (err) {
      console.error('[useNotificationSettings] Error fetching preferences:', err);
      setError(err.message || 'Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /**
   * Toggle a specific preference with optimistic update
   * @param {string} column - The database column name (e.g., 'message_forwarding_sms')
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const togglePreference = useCallback(async (column) => {
    if (!userId || !preferences.id) {
      return { success: false, error: 'User not loaded' };
    }

    // Mark this toggle as pending
    setPendingToggles(prev => new Set([...prev, column]));

    // Store previous value for rollback
    const previousValue = preferences[column];
    const newValue = !previousValue;

    // Optimistic update
    setPreferences(prev => ({
      ...prev,
      [column]: newValue
    }));

    try {
      const { error: updateError } = await supabase
        .from('notification_preferences')
        .update({
          [column]: newValue,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        throw updateError;
      }

      // Success - show toast
      console.log('[useNotificationSettings] ✅ Preference saved:', column, '→', newValue);
      if (window.showToast) {
        window.showToast('Preference updated', 'success');
      } else {
        console.warn('[useNotificationSettings] window.showToast not available - Toast system may not be initialized');
      }

      return { success: true };
    } catch (err) {
      console.error('[useNotificationSettings] Error toggling preference:', err);

      // Rollback on error
      setPreferences(prev => ({
        ...prev,
        [column]: previousValue
      }));

      // Show error toast
      console.log('[useNotificationSettings] ❌ Preference save failed:', column, err.message);
      if (window.showToast) {
        window.showToast('Failed to update preference', 'error');
      } else {
        console.warn('[useNotificationSettings] window.showToast not available - Toast system may not be initialized');
      }

      return { success: false, error: err.message };
    } finally {
      // Remove from pending
      setPendingToggles(prev => {
        const next = new Set(prev);
        next.delete(column);
        return next;
      });
    }
  }, [userId, preferences]);

  /**
   * Check if a specific toggle is currently being saved
   */
  const isTogglePending = useCallback((column) => {
    return pendingToggles.has(column);
  }, [pendingToggles]);

  // Fetch on mount
  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    loading,
    error,
    togglePreference,
    isTogglePending,
    refetch: fetchPreferences
  };
}

export default useNotificationSettings;
