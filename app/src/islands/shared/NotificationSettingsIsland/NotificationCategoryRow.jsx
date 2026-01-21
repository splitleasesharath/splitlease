/**
 * NotificationCategoryRow - Single category row with SMS/Email toggles
 *
 * Updated to follow POPUP_REPLICATION_PROTOCOL.md design system.
 * Uses CSS classes instead of inline styles for protocol compliance.
 */

import React from 'react';
import NotificationToggle from './NotificationToggle.jsx';

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
    <div className={`notification-category-row${isLast ? ' notification-category-row--last' : ''}`}>
      <div className="notification-category-label-section">
        <div className="notification-category-label">{category.label}</div>
        <div className="notification-category-description">{category.description}</div>
      </div>
      <div className="notification-toggle-section">
        <div className="notification-toggle-wrapper">
          <NotificationToggle
            checked={smsEnabled}
            onChange={onToggleSms}
            disabled={smsPending}
            ariaLabel={`${category.label} SMS notifications`}
          />
        </div>
        <div className="notification-toggle-wrapper">
          <NotificationToggle
            checked={emailEnabled}
            onChange={onToggleEmail}
            disabled={emailPending}
            ariaLabel={`${category.label} Email notifications`}
          />
        </div>
      </div>
    </div>
  );
}
