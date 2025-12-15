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
