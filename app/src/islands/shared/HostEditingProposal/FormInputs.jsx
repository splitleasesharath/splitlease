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
// Chip-and-dropdown pattern (like NeighborhoodSearchFilter)
// ============================================================================

/**
 * Multi-select with compact chips and "+" add button
 * Pattern: Selected items as chips + add button to expand dropdown
 */
export function HouseRulesMultiSelect({
  value = [],
  onChange,
  options = [],
  placeholder = 'Add house rules...',
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleAddRule = (rule) => {
    const isSelected = value.some((r) => r.id === rule.id)
    if (!isSelected) {
      onChange([...value, rule])
    }
    setIsOpen(false)
  }

  const handleRemove = (rule) => {
    onChange(value.filter((r) => r.id !== rule.id))
  }

  // Filter out already selected options from dropdown
  const availableOptions = options.filter(
    (option) => !value.some((r) => r.id === option.id)
  )

  return (
    <div ref={wrapperRef} className="hep-rules-selector">
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

          {/* Add button (only if there are more options) */}
          {availableOptions.length > 0 && !disabled && (
            <button
              type="button"
              className="hep-rules-add-btn"
              onClick={() => setIsOpen(!isOpen)}
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
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <span className="hep-rules-empty-text">{placeholder}</span>
          <span className="hep-rules-empty-icon">+</span>
        </button>
      )}

      {/* Dropdown with available options */}
      {isOpen && availableOptions.length > 0 && (
        <div className="hep-rules-dropdown">
          {availableOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className="hep-rules-option"
              onClick={() => handleAddRule(option)}
            >
              {option.name || option.Display}
            </button>
          ))}
        </div>
      )}

      {/* Dropdown empty state */}
      {isOpen && availableOptions.length === 0 && (
        <div className="hep-rules-dropdown">
          <div className="hep-rules-dropdown-empty">
            All rules selected
          </div>
        </div>
      )}
    </div>
  )
}
