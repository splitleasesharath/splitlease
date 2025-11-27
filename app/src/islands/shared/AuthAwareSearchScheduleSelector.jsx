import { useState, useEffect, useRef } from 'react';
import SearchScheduleSelector from './SearchScheduleSelector.jsx';
import { getSessionId } from '../../lib/auth.js';
import { supabase } from '../../lib/supabase.js';

// ============================================================================
// DAY NAME <-> INDEX CONVERSION UTILITIES
// ============================================================================

/**
 * Map day names to 0-based JavaScript indices
 * Database stores day names as strings: ["Monday", "Tuesday", ...]
 * Component uses 0-based indices: 0=Sunday, 1=Monday, ..., 6=Saturday
 */
const DAY_NAME_TO_INDEX = {
  'Sunday': 0,
  'Monday': 1,
  'Tuesday': 2,
  'Wednesday': 3,
  'Thursday': 4,
  'Friday': 5,
  'Saturday': 6
};

const INDEX_TO_DAY_NAME = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

/**
 * Parse day names from database - handles both string and array formats
 * Database may store as:
 * - Native array: ["Monday", "Tuesday"]
 * - JSON string: "[\"Monday\", \"Tuesday\"]"
 *
 * @param {string|string[]} rawData - Raw data from database
 * @returns {string[]|null} - Parsed array of day names, or null if invalid
 */
function parseDayNamesFromDB(rawData) {
  if (!rawData) {
    return null;
  }

  // If it's already an array, return it
  if (Array.isArray(rawData)) {
    return rawData.length > 0 ? rawData : null;
  }

  // If it's a string, try to parse it as JSON
  if (typeof rawData === 'string') {
    try {
      const parsed = JSON.parse(rawData);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.warn('📅 Failed to parse day names string:', rawData, e);
    }
  }

  return null;
}

/**
 * Convert day names array from database to 0-based indices
 * @param {string|string[]} rawDayNames - Raw day names from DB (string or array)
 * @returns {number[]|null} - Array of 0-based day indices, or null if invalid
 */
function dayNamesToIndices(rawDayNames) {
  const dayNames = parseDayNamesFromDB(rawDayNames);

  if (!dayNames) {
    return null;
  }

  const indices = dayNames
    .map(name => DAY_NAME_TO_INDEX[name])
    .filter(idx => idx !== undefined);

  return indices.length > 0 ? indices : null;
}

/**
 * Convert 0-based day indices to day names for database storage
 * @param {number[]} indices - Array of 0-based day indices
 * @returns {string[]} - Array of day name strings
 */
function indicesToDayNames(indices) {
  if (!Array.isArray(indices)) {
    return [];
  }

  return indices
    .filter(idx => idx >= 0 && idx <= 6)
    .map(idx => INDEX_TO_DAY_NAME[idx]);
}

// ============================================================================
// AUTH-AWARE SEARCH SCHEDULE SELECTOR COMPONENT
// ============================================================================

/**
 * AuthAwareSearchScheduleSelector
 *
 * Wraps SearchScheduleSelector with user data auto-load/save functionality.
 * - For logged-in users: Loads saved days from DB, saves changes on selection
 * - For logged-out users: Falls back to URL params or default Mon-Fri
 *
 * @param {Object} props - Component props
 * @param {Function} [props.onSelectionChange] - Callback fired when selection changes
 * @param {boolean} [props.updateUrl=true] - Whether to sync selection with URL
 * @param {number} [props.debounceMs=1000] - Debounce delay for saving to DB
 * @param {...any} props - Additional props passed to SearchScheduleSelector
 */
export default function AuthAwareSearchScheduleSelector({
  onSelectionChange,
  updateUrl = true,
  debounceMs = 1000,
  ...props
}) {
  const [userDays, setUserDays] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const saveTimeoutRef = useRef(null);

  // ============================================================================
  // LOAD USER'S SAVED DAYS ON MOUNT
  // ============================================================================

  useEffect(() => {
    const loadUserDays = async () => {
      const sessionId = getSessionId();
      console.log('📅 AuthAwareSearchScheduleSelector: getSessionId() returned:', sessionId);
      setUserId(sessionId);

      if (!sessionId) {
        console.log('📅 AuthAwareSearchScheduleSelector: No session, using default behavior');
        setIsLoading(false);
        return;
      }

      try {
        console.log('📅 AuthAwareSearchScheduleSelector: Fetching user days for:', sessionId);

        const { data, error } = await supabase
          .from('user')
          .select('"Recent Days Selected"')
          .eq('_id', sessionId)
          .maybeSingle(); // Use maybeSingle to avoid error when no row found

        console.log('📅 AuthAwareSearchScheduleSelector: Supabase response:', { data, error });

        if (error) {
          console.error('📅 AuthAwareSearchScheduleSelector: Supabase error:', error);
          setIsLoading(false);
          return;
        }

        const recentDays = data?.['Recent Days Selected'];
        console.log('📅 AuthAwareSearchScheduleSelector: Recent Days Selected raw value:', recentDays, 'type:', typeof recentDays);

        if (recentDays) {
          // dayNamesToIndices handles both string and array formats
          const indices = dayNamesToIndices(recentDays);

          if (indices && indices.length > 0) {
            console.log('📅 AuthAwareSearchScheduleSelector: Loaded user days:', {
              fromDB: recentDays,
              asIndices: indices
            });
            setUserDays(indices);
          } else {
            console.log('📅 AuthAwareSearchScheduleSelector: No valid days in DB, using default');
          }
        } else {
          console.log('📅 AuthAwareSearchScheduleSelector: No saved days in DB, using default');
        }
      } catch (err) {
        console.error('📅 AuthAwareSearchScheduleSelector: Failed to load user days:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserDays();

    // Cleanup any pending save on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // ============================================================================
  // SAVE USER'S SELECTION TO DATABASE (DEBOUNCED)
  // ============================================================================

  const saveUserDays = (dayIndices) => {
    if (!userId) {
      return;
    }

    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce the save operation
    saveTimeoutRef.current = setTimeout(async () => {
      const dayNames = indicesToDayNames(dayIndices);

      try {
        console.log('📅 AuthAwareSearchScheduleSelector: Saving user days:', dayNames);

        const { error } = await supabase
          .from('user')
          .update({ 'Recent Days Selected': dayNames })
          .eq('_id', userId);

        if (error) {
          console.error('📅 AuthAwareSearchScheduleSelector: Failed to save:', error);
          return;
        }

        console.log('📅 AuthAwareSearchScheduleSelector: Saved successfully');
      } catch (err) {
        console.error('📅 AuthAwareSearchScheduleSelector: Save error:', err);
      }
    }, debounceMs);
  };

  // ============================================================================
  // HANDLE SELECTION CHANGES
  // ============================================================================

  const handleSelectionChange = (selectedDayObjects) => {
    // Extract day indices from the day objects
    const dayIndices = selectedDayObjects.map(day => day.index);

    // Save to DB if user is logged in
    if (userId) {
      saveUserDays(dayIndices);
    }

    // Pass through to parent callback
    if (onSelectionChange) {
      onSelectionChange(selectedDayObjects);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  // Show nothing while loading to prevent flash of default days
  if (isLoading) {
    return null;
  }

  return (
    <SearchScheduleSelector
      initialSelection={userDays}
      onSelectionChange={handleSelectionChange}
      updateUrl={updateUrl}
      {...props}
    />
  );
}
