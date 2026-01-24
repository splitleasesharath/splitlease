/**
 * FormInputs - Reusable form input components for HostEditingProposal
 */

import { useState, useRef, useEffect } from 'react'
import { formatDateForInput, RESERVATION_SPANS } from './types'

// ============================================================================
// DateInput Component
// ============================================================================

/**
 * Date input with calendar icon
 */
export function DateInput({
  value,
  onChange,
  placeholder = 'Select date',
  disabled = false,
  minDate,
  maxDate
}) {
  const inputRef = useRef(null)

  const handleChange = (e) => {
    const newDate = new Date(e.target.value)
    if (!isNaN(newDate.getTime())) {
      onChange(newDate)
    }
  }

  return (
    <div className="hep-date-input-wrapper">
      <input
        ref={inputRef}
        type="date"
        className="hep-input-base hep-input-date"
        value={formatDateForInput(value)}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        min={minDate ? formatDateForInput(minDate) : undefined}
        max={maxDate ? formatDateForInput(maxDate) : undefined}
      />
      <svg
        className="hep-date-icon"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
        <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
        <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </div>
  )
}

// ============================================================================
// ReservationSpanDropdown Component
// ============================================================================

/**
 * Dropdown for selecting reservation span
 */
export function ReservationSpanDropdown({
  value,
  onChange,
  options = RESERVATION_SPANS,
  placeholder = 'Select reservation span',
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (option) => {
    onChange(option)
    setIsOpen(false)
  }

  return (
    <div ref={dropdownRef} className="hep-dropdown-wrapper">
      <button
        type="button"
        className="hep-input-base hep-dropdown"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className={value ? '' : 'hep-placeholder'}>
          {value ? value.label : placeholder}
        </span>
        <svg
          className={`hep-dropdown-chevron ${isOpen ? 'hep-dropdown-chevron--open' : ''}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {isOpen && (
        <div className="hep-dropdown-menu">
          {options.map((option) => (
            <div
              key={option.value}
              className={`hep-dropdown-option ${value?.value === option.value ? 'hep-dropdown-option--selected' : ''}`}
              onClick={() => handleSelect(option)}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// NumberInput Component
// ============================================================================

/**
 * Number input for weeks
 */
export function NumberInput({
  value,
  onChange,
  placeholder = 'Enter number',
  disabled = false,
  min,
  max
}) {
  const handleChange = (e) => {
    const newValue = parseInt(e.target.value, 10)
    if (!isNaN(newValue)) {
      onChange(newValue)
    }
  }

  return (
    <input
      type="number"
      className="hep-input-base hep-input-number"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      min={min}
      max={max}
    />
  )
}

// ============================================================================
// HouseRulesMultiSelect Component
// Chip-and-popup pattern for selecting house rules
// ============================================================================

/**
 * Multi-select with compact chips and centered popup for selection
 * Pattern: Selected items as chips + add button to open popup modal
 */
export function HouseRulesMultiSelect({
  value = [],
  onChange,
  options = [],
  placeholder = 'Add house rules...',
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false)

  const handleToggleRule = (rule) => {
    const isSelected = value.some((r) => r.id === rule.id)
    if (isSelected) {
      onChange(value.filter((r) => r.id !== rule.id))
    } else {
      onChange([...value, rule])
    }
  }

  const handleRemove = (rule) => {
    onChange(value.filter((r) => r.id !== rule.id))
  }

  const handleDone = () => {
    setIsOpen(false)
  }

  return (
    <div className="hep-rules-selector">
      {/* Selected rules as chips */}
      {value.length > 0 && (
        <div className="hep-rules-chips">
          {value.map((rule) => (
            <span key={rule.id} className="hep-rule-chip">
              {rule.name || rule.Display || rule}
              <button
                type="button"
                className="hep-rule-chip-remove"
                onClick={() => handleRemove(rule)}
                disabled={disabled}
                aria-label={`Remove ${rule.name || rule.Display || rule}`}
              >
                ×
              </button>
            </span>
          ))}

          {/* Add button */}
          {!disabled && (
            <button
              type="button"
              className="hep-rules-add-btn"
              onClick={() => setIsOpen(true)}
              aria-label="Add house rule"
            >
              +
            </button>
          )}
        </div>
      )}

      {/* Empty state - show placeholder with add button */}
      {value.length === 0 && (
        <button
          type="button"
          className={`hep-rules-empty ${disabled ? 'hep-rules-empty--disabled' : ''}`}
          onClick={() => !disabled && setIsOpen(true)}
          disabled={disabled}
        >
          <span className="hep-rules-empty-text">{placeholder}</span>
          <span className="hep-rules-empty-icon">+</span>
        </button>
      )}

      {/* Popup modal for selecting rules */}
      {isOpen && (
        <div className="hep-rules-popup-overlay" onClick={handleDone}>
          <div className="hep-rules-popup" onClick={(e) => e.stopPropagation()}>
            <div className="hep-rules-popup-header">
              <span className="hep-rules-popup-title">House Rules</span>
              <button
                type="button"
                className="hep-rules-popup-close"
                onClick={handleDone}
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="hep-rules-popup-body">
              {options.map((option) => {
                const isSelected = value.some((r) => r.id === option.id)
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`hep-rules-popup-option ${isSelected ? 'hep-rules-popup-option--selected' : ''}`}
                    onClick={() => handleToggleRule(option)}
                  >
                    <span className="hep-rules-popup-option-text">
                      {option.name || option.Display}
                    </span>
                    <span className={`hep-rules-popup-checkbox ${isSelected ? 'hep-rules-popup-checkbox--checked' : ''}`}>
                      {isSelected && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="hep-rules-popup-footer">
              <button
                type="button"
                className="hep-rules-popup-done"
                onClick={handleDone}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
