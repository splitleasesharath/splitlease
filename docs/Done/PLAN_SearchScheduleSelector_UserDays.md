# Configuration Plan: SearchScheduleSelector User Days Auto-Load

**Created**: 2025-11-27
**Status**: Ready for Implementation
**Related Component**: `app/src/islands/shared/SearchScheduleSelector.jsx`

---

## Overview

When a user is logged in, the SearchScheduleSelector component should automatically:
1. **Load** the user's `Recent Days Selected` field from the `user` table in Supabase
2. **Pre-populate** the selected days in the component
3. **Save** changes back to the database when the user modifies their selection

---

## Current State Analysis

### Database Location
- **Table**: `user` (Supabase)
- **Field**: `Recent Days Selected` (JSONB)
- **Format**: Array of day name strings: `["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]`
- **Related Fields**:
  - `ideal schedule night selector type` (text) - night selector preference type

### Existing Implementation Reference
The `account-profile.jsx` page already implements this pattern:

```jsx
// account-profile.jsx - ScheduleSelectorWrapper
// 1. Loads user data via window.userProfileData['Recent Days Selected']
// 2. Converts day names to indices (0-6)
// 3. Uses initialSelection prop to set initial state
// 4. On change, calls window.updateRecentDaysSelected(dayNames) to save
```

### Current SearchScheduleSelector Behavior
- **File**: `app/src/islands/shared/SearchScheduleSelector.jsx`
- **Current default**: Monday-Friday (`[1, 2, 3, 4, 5]` 0-based indices)
- **URL sync**: Reads from/writes to `?days-selected=` URL parameter
- **Props**:
  - `initialSelection` - Optional array of day indices (0-6)
  - `onSelectionChange` - Callback when selection changes
  - `updateUrl` - Boolean to enable/disable URL sync (default: true)

### Usage Locations
1. **SearchPage.jsx** (line 1572-1595) - Mounts to `#searchScheduleSelectorDesktop` and `#searchScheduleSelectorMobile`
2. **HomePage.jsx** - Uses schedule card navigation to search
3. **account-profile.jsx** - Already has user data integration via wrapper

---

## Implementation Plan

### Phase 1: Create Auth-Aware Hook

**File**: `app/src/islands/shared/useSearchScheduleSelectorData.js` (new)

```javascript
/**
 * Hook to fetch and persist user's Recent Days Selected
 *
 * @returns {Object}
 *   - userDays: number[] | null - User's saved days (0-based), null if not logged in
 *   - isLoading: boolean
 *   - saveUserDays: (days: number[]) => Promise<void>
 */
export function useSearchScheduleSelectorData() {
  // 1. Check auth status via getSessionId()
  // 2. If logged in, fetch user's Recent Days Selected from Supabase
  // 3. Convert day names to indices using DAY_NAME_TO_INDEX map
  // 4. Return loading state and data
  // 5. Provide saveUserDays function to persist changes
}
```

### Phase 2: Day Index Conversion Utilities

**Location**: `app/src/logic/processors/external/` or inline in hook

| Day Name | JS Index (0-based) | Bubble Index (1-based) |
|----------|-------------------|----------------------|
| Sunday   | 0                 | 1                    |
| Monday   | 1                 | 2                    |
| Tuesday  | 2                 | 3                    |
| Wednesday| 3                 | 4                    |
| Thursday | 4                 | 5                    |
| Friday   | 5                 | 6                    |
| Saturday | 6                 | 7                    |

```javascript
const DAY_NAME_TO_INDEX = {
  'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
  'Thursday': 4, 'Friday': 5, 'Saturday': 6
};

const INDEX_TO_DAY_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Convert from DB format to component format
function dayNamesToIndices(dayNames) {
  if (!Array.isArray(dayNames)) return null;
  return dayNames.map(name => DAY_NAME_TO_INDEX[name]).filter(idx => idx !== undefined);
}

// Convert from component format to DB format
function indicesToDayNames(indices) {
  return indices.map(idx => INDEX_TO_DAY_NAME[idx]);
}
```

### Phase 3: Create Enhanced Wrapper Component

**File**: `app/src/islands/shared/AuthAwareSearchScheduleSelector.jsx` (new)

```jsx
import { useState, useEffect } from 'react';
import SearchScheduleSelector from './SearchScheduleSelector.jsx';
import { getSessionId } from '../../lib/auth.js';
import { supabase } from '../../lib/supabase.js';

/**
 * AuthAwareSearchScheduleSelector
 *
 * Wraps SearchScheduleSelector with user data auto-load/save functionality.
 * - For logged-in users: Loads saved days from DB, saves changes on selection
 * - For logged-out users: Falls back to URL params or default Mon-Fri
 */
export default function AuthAwareSearchScheduleSelector({
  onSelectionChange,
  updateUrl = true,
  ...props
}) {
  const [userDays, setUserDays] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  // Load user's saved days on mount
  useEffect(() => {
    const loadUserDays = async () => {
      const sessionId = getSessionId();
      setUserId(sessionId);

      if (!sessionId) {
        setIsLoading(false);
        return; // Not logged in, use default behavior
      }

      try {
        const { data, error } = await supabase
          .from('user')
          .select('"Recent Days Selected"')
          .eq('_id', sessionId)
          .single();

        if (error) throw error;

        if (data?.['Recent Days Selected'] && Array.isArray(data['Recent Days Selected'])) {
          const indices = dayNamesToIndices(data['Recent Days Selected']);
          if (indices && indices.length > 0) {
            setUserDays(indices);
          }
        }
      } catch (err) {
        console.error('Failed to load user days:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserDays();
  }, []);

  // Save user's selection to DB
  const saveUserDays = async (dayIndices) => {
    if (!userId) return;

    const dayNames = indicesToDayNames(dayIndices);

    try {
      const { error } = await supabase
        .from('user')
        .update({ 'Recent Days Selected': dayNames })
        .eq('_id', userId);

      if (error) throw error;
      console.log('📅 Saved user days selection:', dayNames);
    } catch (err) {
      console.error('Failed to save user days:', err);
    }
  };

  // Handle selection changes
  const handleSelectionChange = (selectedDayObjects) => {
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

  if (isLoading) {
    // Could show loading skeleton or just render with default
    return null;
  }

  return (
    <SearchScheduleSelector
      initialSelection={userDays} // null = use URL/default, array = use user's saved days
      onSelectionChange={handleSelectionChange}
      updateUrl={updateUrl}
      {...props}
    />
  );
}
```

### Phase 4: Update SearchPage.jsx

**File**: `app/src/islands/pages/SearchPage.jsx`

**Change**: Replace direct SearchScheduleSelector usage with AuthAwareSearchScheduleSelector

```jsx
// Before (line 7)
import SearchScheduleSelector from '../shared/SearchScheduleSelector.jsx';

// After
import AuthAwareSearchScheduleSelector from '../shared/AuthAwareSearchScheduleSelector.jsx';

// Before (line ~1589)
rootDesktop.render(<SearchScheduleSelector {...selectorProps} />);

// After
rootDesktop.render(<AuthAwareSearchScheduleSelector {...selectorProps} />);
```

### Phase 5: Update HomePage.jsx (if applicable)

Review HomePage.jsx usage - currently it navigates to search page with days in URL, so no change needed. The search page will then load user's saved days.

---

## Priority Considerations

### High Priority
1. **Loading State**: Don't flash default days before user days load
2. **Auth Check**: Use `getSessionId()` from `lib/auth.js` (synchronous, returns cached value)
3. **Debounce Saves**: Avoid excessive DB writes during rapid selection changes

### Medium Priority
1. **URL vs User Priority**: When both URL params and user data exist, URL should take priority (explicit user action)
2. **Error Handling**: Graceful degradation to default if fetch fails
3. **Cache Invalidation**: Consider when user logs in/out during session

### Low Priority (Future)
1. **Optimistic Updates**: Update UI immediately, save in background
2. **Sync Indicator**: Show save status to user
3. **Offline Support**: Queue saves when offline

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    AuthAwareSearchScheduleSelector              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────┐                                       │
│  │   Mount Component    │                                       │
│  └───────────┬──────────┘                                       │
│              │                                                  │
│              ▼                                                  │
│  ┌──────────────────────┐    No     ┌─────────────────────┐    │
│  │  getSessionId()      │──────────▶│ Use URL / Default   │    │
│  │  (check if logged in)│           └─────────────────────┘    │
│  └───────────┬──────────┘                                       │
│              │ Yes                                              │
│              ▼                                                  │
│  ┌──────────────────────┐                                       │
│  │  Supabase Query:     │                                       │
│  │  SELECT "Recent Days │                                       │
│  │  Selected" FROM user │                                       │
│  └───────────┬──────────┘                                       │
│              │                                                  │
│              ▼                                                  │
│  ┌──────────────────────┐                                       │
│  │  Convert Day Names   │                                       │
│  │  to Indices (0-6)    │                                       │
│  └───────────┬──────────┘                                       │
│              │                                                  │
│              ▼                                                  │
│  ┌──────────────────────┐                                       │
│  │  Pass to             │                                       │
│  │  SearchSchedule-     │                                       │
│  │  Selector as         │                                       │
│  │  initialSelection    │                                       │
│  └──────────────────────┘                                       │
│                                                                 │
│  ┌──────────────────────┐                                       │
│  │  User Changes        │                                       │
│  │  Selection           │                                       │
│  └───────────┬──────────┘                                       │
│              │                                                  │
│              ▼                                                  │
│  ┌──────────────────────┐    No     ┌─────────────────────┐    │
│  │  Is User Logged In?  │──────────▶│ Update URL only     │    │
│  └───────────┬──────────┘           └─────────────────────┘    │
│              │ Yes                                              │
│              ▼                                                  │
│  ┌──────────────────────┐                                       │
│  │  Supabase UPDATE:    │                                       │
│  │  "Recent Days        │                                       │
│  │  Selected" = [names] │                                       │
│  └───────────┬──────────┘                                       │
│              │                                                  │
│              ▼                                                  │
│  ┌──────────────────────┐                                       │
│  │  Call parent         │                                       │
│  │  onSelectionChange   │                                       │
│  └──────────────────────┘                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `app/src/islands/shared/AuthAwareSearchScheduleSelector.jsx` | **CREATE** | New wrapper component with auth integration |
| `app/src/islands/pages/SearchPage.jsx` | **MODIFY** | Import and use AuthAwareSearchScheduleSelector |
| `app/src/islands/shared/SearchScheduleSelector.jsx` | **NO CHANGE** | Keep as pure presentation component |

---

## Testing Checklist

- [ ] Logged out user: Uses URL params or default Mon-Fri
- [ ] Logged in user with no saved days: Uses URL params or default Mon-Fri
- [ ] Logged in user with saved days: Pre-selects saved days
- [ ] Logged in user with URL params: URL takes priority over saved days
- [ ] Selection change (logged in): Saves to database
- [ ] Selection change (logged out): Only updates URL
- [ ] Page refresh: Maintains saved selection for logged-in users
- [ ] User logs in during session: Does NOT reload (would need page refresh)
- [ ] Network error on save: Logs error, does not crash
- [ ] Network error on load: Falls back to URL/default

---

## Notes

### Day Index Systems (CRITICAL)
- **Internal (JS/Component)**: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
- **Bubble API**: 1 = Sunday, 2 = Monday, ..., 7 = Saturday
- **Database Storage**: Day names as strings `["Monday", "Tuesday", ...]`

### Why Not Modify SearchScheduleSelector Directly?
1. **Single Responsibility**: Keep SearchScheduleSelector as pure UI
2. **Testability**: Easier to test logic separately from presentation
3. **Flexibility**: Can use either component depending on context
4. **Backward Compatibility**: Existing usages continue to work

---

**Document Status**: Ready for Review and Implementation
