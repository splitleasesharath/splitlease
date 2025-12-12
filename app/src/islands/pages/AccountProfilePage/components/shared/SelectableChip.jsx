/**
 * SelectableChip.jsx
 *
 * Selectable tag chip for reasons and storage items.
 * Supports interactive and read-only modes, plus success (green) variant.
 */

import React from 'react';

export default function SelectableChip({
  label,
  selected = false,
  onChange,
  readOnly = false,
  variant = 'default' // 'default' | 'success'
}) {
  const handleClick = () => {
    if (readOnly || !onChange) return;
    onChange(!selected);
  };

  const classNames = [
    'selectable-chip',
    selected && 'selectable-chip--selected',
    selected && variant === 'success' && 'selectable-chip--success',
    readOnly && 'selectable-chip--readonly'
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={classNames}
      onClick={handleClick}
      disabled={readOnly}
      aria-pressed={selected}
    >
      {label}
    </button>
  );
}
