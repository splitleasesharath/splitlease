/**
 * AccountSettingsCard.jsx
 *
 * Account settings section with clickable items.
 * Editor view only - notification settings, password change.
 */

import React from 'react';
import ProfileCard from '../shared/ProfileCard.jsx';
import { Bell, Lock, ChevronRight } from 'lucide-react';

export default function AccountSettingsCard({
  onOpenNotificationSettings,
  onChangePassword
}) {
  const settingsItems = [
    {
      id: 'notifications',
      icon: Bell,
      label: 'Notification Settings',
      onClick: onOpenNotificationSettings
    },
    {
      id: 'password',
      icon: Lock,
      label: 'Change Password',
      onClick: onChangePassword
    }
  ];

  return (
    <ProfileCard title="Account Settings">
      <div className="settings-list">
        {settingsItems.map(item => {
          const IconComponent = item.icon;

          return (
            <div
              key={item.id}
              className="settings-item"
              onClick={item.onClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  item.onClick?.();
                }
              }}
            >
              <div className="settings-item-left">
                <IconComponent size={20} />
                <span className="settings-item-text">{item.label}</span>
              </div>
              <div className="settings-item-right">
                <ChevronRight size={16} />
              </div>
            </div>
          );
        })}
      </div>
    </ProfileCard>
  );
}
