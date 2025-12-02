/**
 * Host Overview Button Component
 *
 * Button component with multiple variants:
 * - primary: Deep purple background
 * - secondary: White with border
 * - action: Blue for action buttons
 * - danger: Red for destructive actions
 * - ghost: Transparent background
 */

import React from 'react';

export function Button({
  children,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  ...props
}) {
  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth && 'btn--full-width',
    disabled && 'btn--disabled',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
