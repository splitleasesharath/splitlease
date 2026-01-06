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
    loading,
    error,
    toggleChannel,
    isTogglePending,
    isChannelEnabled,
    refetch,
    CHANNELS
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
            smsEnabled={isChannelEnabled(category.dbColumn, CHANNELS.SMS)}
            emailEnabled={isChannelEnabled(category.dbColumn, CHANNELS.EMAIL)}
            onToggleSms={() => toggleChannel(category.dbColumn, CHANNELS.SMS)}
            onToggleEmail={() => toggleChannel(category.dbColumn, CHANNELS.EMAIL)}
            smsPending={isTogglePending(category.dbColumn, CHANNELS.SMS)}
            emailPending={isTogglePending(category.dbColumn, CHANNELS.EMAIL)}
            isLast={index === NOTIFICATION_CATEGORIES.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
