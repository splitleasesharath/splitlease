/**
 * NotificationToggle - Switch-style toggle component
 *
 * iOS-style toggle switch for notification preferences.
 * Updated to follow POPUP_REPLICATION_PROTOCOL.md design system.
 * Uses CSS classes instead of inline styles for protocol compliance.
 *
 * Color when enabled: #31135D (protocol primary purple)
 */

import React from 'react';

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

  // Build class names
  const sliderClasses = [
    'notification-toggle-slider',
    checked && 'notification-toggle-slider--checked',
    disabled && 'notification-toggle-slider--disabled',
  ].filter(Boolean).join(' ');

  const knobClasses = [
    'notification-toggle-knob',
    checked && 'notification-toggle-knob--checked',
  ].filter(Boolean).join(' ');

  return (
    <label className="notification-toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        className="notification-toggle-input"
        aria-label={ariaLabel}
      />
      <span
        className={sliderClasses}
        role="switch"
        aria-checked={checked}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
      >
        <span className={knobClasses} />
      </span>
    </label>
  );
}
