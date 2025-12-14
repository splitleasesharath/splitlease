# Implementation Plan: Notification Settings Shared Island Component

## Overview
Create a comprehensive shared island component for managing notification preferences that integrates a full UI with 11 notification categories (each with SMS/Email toggles) and connects directly to the Supabase `notification_preferences` table. This replaces the current 2-toggle stub modal with a fully functional, reusable notification preference manager.

## Success Criteria
- [ ] Shared island component displays all 11 notification categories with SMS + Email toggles per category
- [ ] Component fetches and displays current user preferences from Supabase on mount
- [ ] Individual toggle changes trigger optimistic updates with automatic rollback on failure
- [ ] Existing modal wrapper updated to embed the shared island component
- [ ] Toast notifications display on success/error for each toggle action
- [ ] Loading states shown during initial fetch
- [ ] Component can be embedded in modal or directly in a page section
- [ ] All styling uses inline styles (compatible with pages not using Tailwind CSS)

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/modals/NotificationSettingsModal.jsx` | Current stub modal with 2 toggles | Replace body content with NotificationSettingsIsland component |
| `app/src/lib/supabase.js` | Supabase client initialization | No changes - use as-is |
| `app/src/islands/shared/Toast.jsx` | Toast notification system | No changes - use existing `window.showToast` |
| `app/src/islands/pages/AccountProfilePage/AccountProfilePage.jsx` | Consumer of the modal | No changes needed - already passes userId and handlers |
| `app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js` | Logic hook managing modal state | No changes - already handles showNotificationModal state |

### Database Schema Reference

```sql
-- Table: notification_preferences
-- All columns are boolean with default false
CREATE TABLE notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  message_forwarding_sms BOOLEAN DEFAULT false,
  message_forwarding_email BOOLEAN DEFAULT false,
  payment_reminders_sms BOOLEAN DEFAULT false,
  payment_reminders_email BOOLEAN DEFAULT false,
  promotional_sms BOOLEAN DEFAULT false,
  promotional_email BOOLEAN DEFAULT false,
  reservation_updates_sms BOOLEAN DEFAULT false,
  reservation_updates_email BOOLEAN DEFAULT false,
  lease_requests_sms BOOLEAN DEFAULT false,
  lease_requests_email BOOLEAN DEFAULT false,
  proposal_updates_sms BOOLEAN DEFAULT false,
  proposal_updates_email BOOLEAN DEFAULT false,
  checkin_checkout_sms BOOLEAN DEFAULT false,
  checkin_checkout_email BOOLEAN DEFAULT false,
  reviews_sms BOOLEAN DEFAULT false,
  reviews_email BOOLEAN DEFAULT false,
  tips_insights_sms BOOLEAN DEFAULT false,
  tips_insights_email BOOLEAN DEFAULT false,
  account_assistance_sms BOOLEAN DEFAULT false,
  account_assistance_email BOOLEAN DEFAULT false,
  virtual_meetings_sms BOOLEAN DEFAULT false,
  virtual_meetings_email BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Notification Categories (11 total)

| Category ID | Label | Description | SMS Column | Email Column |
|-------------|-------|-------------|------------|--------------|
| message_forwarding | Message Forwarding | For forwarded messages | message_forwarding_sms | message_forwarding_email |
| payment_reminders | Payment Reminders | Billing and payment notifications | payment_reminders_sms | payment_reminders_email |
| promotional | Promotional | Marketing and promotional content | promotional_sms | promotional_email |
| reservation_updates | Reservation Updates | Changes to bookings | reservation_updates_sms | reservation_updates_email |
| lease_requests | Lease Requests | Lease-related inquiries | lease_requests_sms | lease_requests_email |
| proposal_updates | Proposal Updates | Changes to proposals | proposal_updates_sms | proposal_updates_email |
| checkin_checkout | Check-in/Check-out | Guest arrival/departure alerts | checkin_checkout_sms | checkin_checkout_email |
| reviews | Reviews | Rating and feedback notifications | reviews_sms | reviews_email |
| tips_insights | Tips / Market Insights | Educational content and market analysis | tips_insights_sms | tips_insights_email |
| account_assistance | Account Assistance | Help with account login/permissions | account_assistance_sms | account_assistance_email |
| virtual_meetings | Virtual Meetings | Video/online meeting notifications | virtual_meetings_sms | virtual_meetings_email |

### Existing Patterns to Follow

1. **Shared Island Component Pattern** (from VirtualMeetingManager):
   - Main component file with props interface
   - Self-contained styling (CSS file or inline styles)
   - Custom hook for data fetching/state management
   - Index.js for barrel exports

2. **Inline Styles Pattern** (from NotificationSettingsModal.jsx):
   - Use JavaScript style objects for compatibility
   - Define styles constant at top of file
   - No external CSS dependencies for modals

3. **Toast Integration Pattern**:
   - Use `window.showToast(message, type)` for notifications
   - Types: 'success', 'error', 'warning', 'info'

4. **Supabase Direct Query Pattern**:
   - Import supabase client from `lib/supabase.js`
   - Use `.select()`, `.upsert()`, `.update()` methods
   - Handle errors with try-catch

## Implementation Steps

### Step 1: Create Directory Structure
**Files:** Create new directory
**Purpose:** Establish folder structure for the shared island component

**Details:**
- Create directory: `app/src/islands/shared/NotificationSettingsIsland/`
- This directory will contain:
  - `NotificationSettingsIsland.jsx` - Main component
  - `useNotificationSettings.js` - Custom hook for data management
  - `NotificationCategoryRow.jsx` - Row component for each category
  - `NotificationToggle.jsx` - Switch toggle component
  - `notificationCategories.js` - Category configuration data
  - `index.js` - Barrel exports

**Validation:** Directory exists at expected path

---

### Step 2: Create Category Configuration File
**Files:** `app/src/islands/shared/NotificationSettingsIsland/notificationCategories.js`
**Purpose:** Define the 11 notification categories with metadata

**Details:**
```javascript
/**
 * Notification Categories Configuration
 * Maps UI display to database column names
 */
export const NOTIFICATION_CATEGORIES = [
  {
    id: 'message_forwarding',
    label: 'Message Forwarding',
    description: 'Receive forwarded messages via your preferred channel',
    smsColumn: 'message_forwarding_sms',
    emailColumn: 'message_forwarding_email'
  },
  {
    id: 'payment_reminders',
    label: 'Payment Reminders',
    description: 'Billing and payment notifications',
    smsColumn: 'payment_reminders_sms',
    emailColumn: 'payment_reminders_email'
  },
  {
    id: 'promotional',
    label: 'Promotional',
    description: 'Marketing and promotional content',
    smsColumn: 'promotional_sms',
    emailColumn: 'promotional_email'
  },
  {
    id: 'reservation_updates',
    label: 'Reservation Updates',
    description: 'Changes to your bookings',
    smsColumn: 'reservation_updates_sms',
    emailColumn: 'reservation_updates_email'
  },
  {
    id: 'lease_requests',
    label: 'Lease Requests',
    description: 'Lease-related inquiries',
    smsColumn: 'lease_requests_sms',
    emailColumn: 'lease_requests_email'
  },
  {
    id: 'proposal_updates',
    label: 'Proposal Updates',
    description: 'Changes to proposals',
    smsColumn: 'proposal_updates_sms',
    emailColumn: 'proposal_updates_email'
  },
  {
    id: 'checkin_checkout',
    label: 'Check-in/Check-out Reminders',
    description: 'Guest arrival and departure alerts',
    smsColumn: 'checkin_checkout_sms',
    emailColumn: 'checkin_checkout_email'
  },
  {
    id: 'reviews',
    label: 'Reviews',
    description: 'Rating and feedback notifications',
    smsColumn: 'reviews_sms',
    emailColumn: 'reviews_email'
  },
  {
    id: 'tips_insights',
    label: 'Tips / Market Insights',
    description: 'Educational content and market analysis',
    smsColumn: 'tips_insights_sms',
    emailColumn: 'tips_insights_email'
  },
  {
    id: 'account_assistance',
    label: 'Account Access Assistance',
    description: 'Help with account login and permissions',
    smsColumn: 'account_assistance_sms',
    emailColumn: 'account_assistance_email'
  },
  {
    id: 'virtual_meetings',
    label: 'Virtual Meetings',
    description: 'Video and online meeting notifications',
    smsColumn: 'virtual_meetings_sms',
    emailColumn: 'virtual_meetings_email'
  }
];

/**
 * Get all column names for database queries
 */
export function getAllPreferenceColumns() {
  const columns = ['id', 'user_id', 'created_at', 'updated_at'];
  NOTIFICATION_CATEGORIES.forEach(cat => {
    columns.push(cat.smsColumn);
    columns.push(cat.emailColumn);
  });
  return columns;
}

/**
 * Get default preferences object (all false)
 */
export function getDefaultPreferences() {
  const defaults = {};
  NOTIFICATION_CATEGORIES.forEach(cat => {
    defaults[cat.smsColumn] = false;
    defaults[cat.emailColumn] = false;
  });
  return defaults;
}
```

**Validation:** File exports NOTIFICATION_CATEGORIES array with 11 items

---

### Step 3: Create useNotificationSettings Hook
**Files:** `app/src/islands/shared/NotificationSettingsIsland/useNotificationSettings.js`
**Purpose:** Handle data fetching, state management, and optimistic updates

**Details:**
- Import supabase client
- Fetch preferences on mount (create row if not exists)
- Provide optimistic toggle with rollback on error
- Track loading and error states
- Use upsert pattern for create-or-update

```javascript
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
      if (window.showToast) {
        window.showToast('Preference updated', 'success');
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
      if (window.showToast) {
        window.showToast('Failed to update preference', 'error');
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
```

**Validation:** Hook exports object with preferences, loading, error, togglePreference, isTogglePending, refetch

---

### Step 4: Create NotificationToggle Component
**Files:** `app/src/islands/shared/NotificationSettingsIsland/NotificationToggle.jsx`
**Purpose:** Reusable switch-style toggle component

**Details:**
- iOS-style toggle switch (51px x 31px per GitHub reference)
- Animated state transitions
- Disabled state during pending operations
- Accessible with keyboard support
- Inline styles for compatibility

```javascript
/**
 * NotificationToggle - Switch-style toggle component
 *
 * iOS-style toggle switch for notification preferences.
 */

import React from 'react';

const styles = {
  container: {
    position: 'relative',
    width: '51px',
    height: '31px',
    flexShrink: 0,
  },
  input: {
    opacity: 0,
    width: 0,
    height: 0,
    position: 'absolute',
  },
  slider: {
    position: 'absolute',
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#E0E0E0',
    transition: 'background-color 0.3s ease',
    borderRadius: '31px',
  },
  sliderChecked: {
    backgroundColor: '#8B5CF6', // Royal Purple from GitHub reference
  },
  sliderDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  knob: {
    position: 'absolute',
    content: '',
    height: '27px',
    width: '27px',
    left: '2px',
    bottom: '2px',
    backgroundColor: '#FFFFFF',
    transition: 'transform 0.3s ease',
    borderRadius: '50%',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
  },
  knobChecked: {
    transform: 'translateX(20px)',
  },
};

export default function NotificationToggle({
  checked = false,
  onChange,
  disabled = false,
  ariaLabel = 'Toggle notification',
}) {
  const handleChange = (e) => {
    if (!disabled && onChange) {
      onChange(e.target.checked);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!disabled && onChange) {
        onChange(!checked);
      }
    }
  };

  return (
    <label style={styles.container}>
      <input
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        style={styles.input}
        aria-label={ariaLabel}
      />
      <span
        style={{
          ...styles.slider,
          ...(checked ? styles.sliderChecked : {}),
          ...(disabled ? styles.sliderDisabled : {}),
        }}
        role="switch"
        aria-checked={checked}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
      >
        <span
          style={{
            ...styles.knob,
            ...(checked ? styles.knobChecked : {}),
          }}
        />
      </span>
    </label>
  );
}
```

**Validation:** Toggle renders correctly, animates on state change, handles disabled state

---

### Step 5: Create NotificationCategoryRow Component
**Files:** `app/src/islands/shared/NotificationSettingsIsland/NotificationCategoryRow.jsx`
**Purpose:** Display a single category with SMS and Email toggles

**Details:**
- Display category label and description
- Two toggle columns: SMS and Email
- Pass through pending state to toggles
- Consistent layout across all rows

```javascript
/**
 * NotificationCategoryRow - Single category row with SMS/Email toggles
 */

import React from 'react';
import NotificationToggle from './NotificationToggle.jsx';

const styles = {
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 0',
    borderBottom: '1px solid #F0F0F0',
  },
  rowLast: {
    borderBottom: 'none',
  },
  labelSection: {
    flex: 1,
    marginRight: '16px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#000000',
    marginBottom: '4px',
  },
  description: {
    fontSize: '12px',
    color: '#666666',
    lineHeight: '1.4',
  },
  toggleSection: {
    display: 'flex',
    gap: '24px',
    alignItems: 'center',
  },
  toggleWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  toggleLabel: {
    fontSize: '10px',
    fontWeight: '500',
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
};

export default function NotificationCategoryRow({
  category,
  smsEnabled,
  emailEnabled,
  onToggleSms,
  onToggleEmail,
  smsPending = false,
  emailPending = false,
  isLast = false,
}) {
  return (
    <div style={{ ...styles.row, ...(isLast ? styles.rowLast : {}) }}>
      <div style={styles.labelSection}>
        <div style={styles.label}>{category.label}</div>
        <div style={styles.description}>{category.description}</div>
      </div>
      <div style={styles.toggleSection}>
        <div style={styles.toggleWrapper}>
          <span style={styles.toggleLabel}>SMS</span>
          <NotificationToggle
            checked={smsEnabled}
            onChange={() => onToggleSms(category.smsColumn)}
            disabled={smsPending}
            ariaLabel={`${category.label} SMS notifications`}
          />
        </div>
        <div style={styles.toggleWrapper}>
          <span style={styles.toggleLabel}>Email</span>
          <NotificationToggle
            checked={emailEnabled}
            onChange={() => onToggleEmail(category.emailColumn)}
            disabled={emailPending}
            ariaLabel={`${category.label} Email notifications`}
          />
        </div>
      </div>
    </div>
  );
}
```

**Validation:** Row displays label, description, and two toggle columns properly aligned

---

### Step 6: Create Main NotificationSettingsIsland Component
**Files:** `app/src/islands/shared/NotificationSettingsIsland/NotificationSettingsIsland.jsx`
**Purpose:** Main shared island component that can be embedded anywhere

**Details:**
- Accept userId as required prop
- Use custom hook for data management
- Render loading, error, and content states
- Map through categories to render rows
- No modal-specific code (just the content)

```javascript
/**
 * NotificationSettingsIsland - Shared island for notification preferences
 *
 * Embeddable component that displays all 11 notification categories
 * with SMS and Email toggles for each.
 *
 * Usage:
 *   <NotificationSettingsIsland userId="user_123" />
 */

import React from 'react';
import { useNotificationSettings } from './useNotificationSettings.js';
import { NOTIFICATION_CATEGORIES } from './notificationCategories.js';
import NotificationCategoryRow from './NotificationCategoryRow.jsx';

const styles = {
  container: {
    width: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'flex-end',
    paddingBottom: '12px',
    borderBottom: '1px solid #E0E0E0',
    marginBottom: '8px',
  },
  headerLabels: {
    display: 'flex',
    gap: '24px',
  },
  headerLabel: {
    width: '51px',
    textAlign: 'center',
    fontSize: '12px',
    fontWeight: '600',
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    color: '#666666',
  },
  loadingSpinner: {
    width: '24px',
    height: '24px',
    border: '3px solid #E0E0E0',
    borderTopColor: '#8B5CF6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginRight: '12px',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    textAlign: 'center',
  },
  errorIcon: {
    width: '48px',
    height: '48px',
    marginBottom: '16px',
    color: '#EF4444',
  },
  errorText: {
    fontSize: '14px',
    color: '#EF4444',
    marginBottom: '16px',
  },
  retryButton: {
    padding: '8px 16px',
    backgroundColor: '#8B5CF6',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  categoriesList: {
    // Container for category rows
  },
};

// Inject keyframe animation for spinner
const injectSpinnerAnimation = () => {
  if (typeof document !== 'undefined' && !document.getElementById('notification-spinner-style')) {
    const style = document.createElement('style');
    style.id = 'notification-spinner-style';
    style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(style);
  }
};

export default function NotificationSettingsIsland({ userId }) {
  // Inject spinner animation on mount
  React.useEffect(() => {
    injectSpinnerAnimation();
  }, []);

  const {
    preferences,
    loading,
    error,
    togglePreference,
    isTogglePending,
    refetch
  } = useNotificationSettings(userId);

  // Loading state
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner} />
          <span>Loading notification settings...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <svg style={styles.errorIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div style={styles.errorText}>{error}</div>
          <button style={styles.retryButton} onClick={refetch}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Content
  return (
    <div style={styles.container}>
      {/* Column headers */}
      <div style={styles.header}>
        <div style={styles.headerLabels}>
          <span style={styles.headerLabel}>SMS</span>
          <span style={styles.headerLabel}>Email</span>
        </div>
      </div>

      {/* Category rows */}
      <div style={styles.categoriesList}>
        {NOTIFICATION_CATEGORIES.map((category, index) => (
          <NotificationCategoryRow
            key={category.id}
            category={category}
            smsEnabled={preferences[category.smsColumn] || false}
            emailEnabled={preferences[category.emailColumn] || false}
            onToggleSms={togglePreference}
            onToggleEmail={togglePreference}
            smsPending={isTogglePending(category.smsColumn)}
            emailPending={isTogglePending(category.emailColumn)}
            isLast={index === NOTIFICATION_CATEGORIES.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
```

**Validation:** Component renders all 11 categories, handles loading/error states, toggles update preferences

---

### Step 7: Create Barrel Export File
**Files:** `app/src/islands/shared/NotificationSettingsIsland/index.js`
**Purpose:** Clean exports for the module

**Details:**
```javascript
/**
 * NotificationSettingsIsland - Module exports
 */

export { default as NotificationSettingsIsland } from './NotificationSettingsIsland.jsx';
export { default as NotificationCategoryRow } from './NotificationCategoryRow.jsx';
export { default as NotificationToggle } from './NotificationToggle.jsx';
export { useNotificationSettings } from './useNotificationSettings.js';
export { NOTIFICATION_CATEGORIES, getAllPreferenceColumns, getDefaultPreferences } from './notificationCategories.js';

// Default export
export { default } from './NotificationSettingsIsland.jsx';
```

**Validation:** All exports accessible via `import { ... } from 'islands/shared/NotificationSettingsIsland'`

---

### Step 8: Update NotificationSettingsModal to Use Shared Island
**Files:** `app/src/islands/modals/NotificationSettingsModal.jsx`
**Purpose:** Replace stub content with the shared island component

**Details:**
- Import NotificationSettingsIsland
- Remove old state (emailNotifications, smsNotifications)
- Remove old handlers (handleSave)
- Replace body content with the island component
- Remove footer (no explicit save button needed - optimistic updates)
- Keep modal wrapper structure (overlay, close button, escape key handling)

```javascript
/**
 * Notification Settings Modal
 * Modal wrapper for NotificationSettingsIsland
 * Workflow: T:Notifications is clicked (Workflow 49)
 */

import { useEffect } from 'react';
import { NotificationSettingsIsland } from '../shared/NotificationSettingsIsland/index.js';

// Inline styles for modal (compatible with pages not using Tailwind CSS)
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '15px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    maxWidth: '450px',
    width: '100%',
    maxHeight: '728px',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e5e5',
    position: 'sticky',
    top: 0,
    backgroundColor: '#ffffff',
    zIndex: 1,
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#333333',
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#999999',
    padding: '0',
    lineHeight: 1,
    transition: 'color 0.2s',
  },
  body: {
    padding: '16px 24px 24px',
  },
};

export default function NotificationSettingsModal({ isOpen, userId, onClose }) {
  // Handle backdrop click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={handleOverlayClick}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h3 style={styles.title}>Notification Settings</h3>
          <button
            style={styles.closeButton}
            onClick={onClose}
            aria-label="Close modal"
            onMouseOver={(e) => e.target.style.color = '#666666'}
            onMouseOut={(e) => e.target.style.color = '#999999'}
          >
            &times;
          </button>
        </div>

        {/* Body - Shared Island Component */}
        <div style={styles.body}>
          <NotificationSettingsIsland userId={userId} />
        </div>
      </div>
    </div>
  );
}
```

**Validation:** Modal opens, displays all 11 categories, toggles work with optimistic updates, closes properly

---

### Step 9: Create CLAUDE.md Documentation
**Files:** `app/src/islands/shared/NotificationSettingsIsland/CLAUDE.md`
**Purpose:** LLM-optimized documentation for the module

**Details:**
- Follow established CLAUDE.md format
- Document all files, exports, patterns
- Include usage examples
- Document database table structure

**Validation:** Documentation file exists and follows project conventions

---

## Edge Cases & Error Handling

1. **New User (No Preferences Row)**:
   - Hook creates default row on first access
   - All preferences default to false
   - Gracefully handles missing data

2. **Network Failure During Toggle**:
   - Optimistic update shows immediate feedback
   - Rollback restores previous state on error
   - Toast notification explains the error

3. **User Not Authenticated**:
   - If userId is null/undefined, show empty state
   - Hook returns early without querying

4. **Concurrent Toggles**:
   - Each toggle tracked independently via pendingToggles Set
   - Multiple toggles can be pending simultaneously
   - Each resolves independently

5. **Supabase Connection Issues**:
   - Error state displayed with retry button
   - Console logging for debugging

## Testing Considerations

1. **Unit Tests for Hook**:
   - Test fetchPreferences creates row for new user
   - Test togglePreference optimistic update
   - Test rollback on error
   - Test isTogglePending returns correct state

2. **Component Tests**:
   - Test loading state renders correctly
   - Test error state renders with retry button
   - Test all 11 categories render
   - Test toggle interaction calls hook method

3. **Integration Tests**:
   - Test modal opens from AccountProfilePage
   - Test preference changes persist to database
   - Test toast notifications appear

4. **Manual Testing Scenarios**:
   - Toggle multiple preferences quickly
   - Disconnect network, toggle preference, verify rollback
   - Verify preferences persist after page reload
   - Test keyboard navigation (Tab, Enter, Space)

## Rollback Strategy

If issues arise after deployment:

1. **Revert Modal Only**: Restore `NotificationSettingsModal.jsx` from git history
2. **Keep Island**: The shared island can remain for future use
3. **Database Safe**: No schema changes required; existing data unchanged

## Dependencies & Blockers

- **No Blockers**: All dependencies already exist
- **Supabase Client**: Already configured in `lib/supabase.js`
- **Toast System**: Already available via `window.showToast`
- **Database Table**: `notification_preferences` table already exists

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Supabase query fails | Low | Medium | Proper error handling with retry |
| Optimistic update causes UI flicker | Low | Low | Smooth transitions, immediate feedback |
| Database row creation race condition | Very Low | Low | Single user context, no concurrent access |
| Style conflicts with existing CSS | Low | Low | All styles are inline JavaScript objects |

---

## Files Summary

### New Files to Create (8 total)

| Path | Purpose |
|------|---------|
| `app/src/islands/shared/NotificationSettingsIsland/` | New directory for shared island |
| `app/src/islands/shared/NotificationSettingsIsland/notificationCategories.js` | Category configuration |
| `app/src/islands/shared/NotificationSettingsIsland/useNotificationSettings.js` | Data management hook |
| `app/src/islands/shared/NotificationSettingsIsland/NotificationToggle.jsx` | Toggle switch component |
| `app/src/islands/shared/NotificationSettingsIsland/NotificationCategoryRow.jsx` | Category row component |
| `app/src/islands/shared/NotificationSettingsIsland/NotificationSettingsIsland.jsx` | Main island component |
| `app/src/islands/shared/NotificationSettingsIsland/index.js` | Barrel exports |
| `app/src/islands/shared/NotificationSettingsIsland/CLAUDE.md` | Module documentation |

### Files to Modify (1 total)

| Path | Changes |
|------|---------|
| `app/src/islands/modals/NotificationSettingsModal.jsx` | Replace stub with island component wrapper |

### Files Referenced (Read Only)

| Path | Why Referenced |
|------|----------------|
| `app/src/lib/supabase.js` | Supabase client import |
| `app/src/islands/shared/Toast.jsx` | Toast notification pattern |
| `app/src/islands/pages/AccountProfilePage/AccountProfilePage.jsx` | Consumer of modal |
| `app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js` | Modal state management |
| `app/src/islands/shared/VirtualMeetingManager/` | Pattern reference for shared islands |

---

**VERSION**: 1.0
**CREATED**: 2025-12-14
**AUTHOR**: Implementation Planner
