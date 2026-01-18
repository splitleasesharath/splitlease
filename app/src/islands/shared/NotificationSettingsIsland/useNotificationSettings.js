/**
 * useNotificationSettings Hook
 *
 * Manages notification preferences stored in notificationsettingsos_lists_ table.
 * Each category stores an array of enabled channels: ['Email', 'SMS', 'In-App Message']
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase.js';
import {
  getDefaultPreferences,
  toggleChannelInArray,
  NOTIFICATION_CHANNELS
} from './notificationCategories.js';

const TABLE_NAME = 'notificationsettingsos_lists_';

export function useNotificationSettings(userId) {
  const [preferences, setPreferences] = useState(getDefaultPreferences());
  const [recordId, setRecordId] = useState(null);
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
      // Query by "Created By" column (reliable user identifier)
      const { data, error: fetchError } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('Created By', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is expected for new users
        throw fetchError;
      }

      if (data) {
        // User has existing preferences
        setRecordId(data._id);
        setPreferences(data);
      } else {
        // No preferences found - user will need to have a record created
        // For now, use defaults (creation should happen elsewhere in user setup)
        console.log('[useNotificationSettings] No preferences found for user:', userId);
        setPreferences(getDefaultPreferences());
      }
    } catch (err) {
      console.error('[useNotificationSettings] Error fetching preferences:', err);
      setError(err.message || 'Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /**
   * Toggle a specific channel for a category
   * @param {string} dbColumn - The database column name (e.g., 'Message Forwarding')
   * @param {string} channel - The channel to toggle (e.g., 'Email', 'SMS')
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const toggleChannel = useCallback(async (dbColumn, channel) => {
    if (!userId || !recordId) {
      console.warn('[useNotificationSettings] Cannot toggle: missing userId or recordId');
      return { success: false, error: 'User preferences not loaded' };
    }

    // Create a unique key for this specific toggle
    const toggleKey = `${dbColumn}:${channel}`;

    // Mark this toggle as pending
    setPendingToggles(prev => new Set([...prev, toggleKey]));

    // Get current array and compute new array
    const currentArray = preferences[dbColumn] || [];
    const newArray = toggleChannelInArray(currentArray, channel);

    // Store previous value for rollback
    const previousArray = currentArray;

    // Optimistic update
    setPreferences(prev => ({
      ...prev,
      [dbColumn]: newArray
    }));

    try {
      const { error: updateError } = await supabase
        .from(TABLE_NAME)
        .update({
          [dbColumn]: newArray,
          updated_at: new Date().toISOString()
        })
        .eq('_id', recordId);

      if (updateError) {
        throw updateError;
      }

      // Success
      const action = newArray.includes(channel) ? 'enabled' : 'disabled';
      console.log(`[useNotificationSettings] ✅ ${channel} ${action} for ${dbColumn}`);

      if (window.showToast) {
        window.showToast('Preference updated', 'success');
      }

      return { success: true };
    } catch (err) {
      console.error('[useNotificationSettings] Error toggling channel:', err);

      // Rollback on error
      setPreferences(prev => ({
        ...prev,
        [dbColumn]: previousArray
      }));

      if (window.showToast) {
        window.showToast('Failed to update preference', 'error');
      }

      return { success: false, error: err.message };
    } finally {
      // Remove from pending
      setPendingToggles(prev => {
        const next = new Set(prev);
        next.delete(toggleKey);
        return next;
      });
    }
  }, [userId, recordId, preferences]);

  /**
   * Check if a specific toggle is currently being saved
   * @param {string} dbColumn - The database column name
   * @param {string} channel - The channel ('Email' or 'SMS')
   */
  const isTogglePending = useCallback((dbColumn, channel) => {
    return pendingToggles.has(`${dbColumn}:${channel}`);
  }, [pendingToggles]);

  /**
   * Check if a channel is enabled for a category
   * @param {string} dbColumn - The database column name
   * @param {string} channel - The channel to check
   * @returns {boolean}
   */
  const isChannelEnabled = useCallback((dbColumn, channel) => {
    const arr = preferences[dbColumn];
    return Array.isArray(arr) && arr.includes(channel);
  }, [preferences]);

  // Fetch on mount
  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    loading,
    error,
    toggleChannel,
    isTogglePending,
    isChannelEnabled,
    refetch: fetchPreferences,
    // Expose channel constants for convenience
    CHANNELS: NOTIFICATION_CHANNELS
  };
}

export default useNotificationSettings;
