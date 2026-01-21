/**
 * NotificationSettingsIsland - Shared island for notification preferences
 *
 * Embeddable component that displays all 11 notification categories
 * with SMS and Email toggles for each.
 *
 * Updated to follow POPUP_REPLICATION_PROTOCOL.md design system.
 *
 * Usage:
 *   <NotificationSettingsIsland userId="user_123" />
 */

import React from 'react';
import { useNotificationSettings } from './useNotificationSettings.js';
import { NOTIFICATION_CATEGORIES } from './notificationCategories.js';
import NotificationCategoryRow from './NotificationCategoryRow.jsx';

// Alert Circle icon for error state (Feather style)
function AlertCircleIcon() {
  return (
    <svg
      className="notification-error-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export default function NotificationSettingsIsland({ userId }) {
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
      <div className="notification-settings-container">
        <div className="notification-loading-container">
          <div className="notification-loading-spinner" />
          <span>Loading notification settings...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="notification-settings-container">
        <div className="notification-error-container">
          <AlertCircleIcon />
          <div className="notification-error-text">{error}</div>
          <button className="notification-retry-btn" onClick={refetch}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Content
  return (
    <div className="notification-settings-container">
      {/* Column headers */}
      <div className="notification-settings-header">
        <div className="notification-settings-header-labels">
          <span className="notification-settings-header-label">SMS</span>
          <span className="notification-settings-header-label">Email</span>
        </div>
      </div>

      {/* Category rows */}
      <div className="notification-categories-list">
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
