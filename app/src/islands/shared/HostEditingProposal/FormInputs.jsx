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
// ============================================================================

/**
 * Multi-select dropdown for house rules
 */
export function HouseRulesMultiSelect({
  value = [],
  onChange,
  options = [],
  placeholder = 'Choose some options...',
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

  const handleToggleOption = (rule) => {
    const isSelected = value.some((r) => r.id === rule.id)
    if (isSelected) {
      onChange(value.filter((r) => r.id !== rule.id))
    } else {
      onChange([...value, rule])
    }
  }

  const handleRemove = (rule, e) => {
    e.stopPropagation()
    onChange(value.filter((r) => r.id !== rule.id))
  }

  return (
    <div ref={wrapperRef} className="hep-multiselect-wrapper">
      <div
        className={`hep-multiselect ${disabled ? 'hep-multiselect--disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        {value.length === 0 ? (
          <span className="hep-placeholder">{placeholder}</span>
        ) : (
          value.map((rule) => (
            <span key={rule.id} className="hep-tag">
              {rule.name || rule.Display || rule}
              <button
                type="button"
                className="hep-tag-remove"
                onClick={(e) => handleRemove(rule, e)}
                aria-label={`Remove ${rule.name || rule.Display || rule}`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </span>
          ))
        )}
      </div>

      {isOpen && (
        <div className="hep-multiselect-menu">
          {options.map((option) => {
            const isSelected = value.some((r) => r.id === option.id)
            return (
              <div
                key={option.id}
                className={`hep-multiselect-option ${isSelected ? 'hep-multiselect-option--selected' : ''}`}
                onClick={() => handleToggleOption(option)}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                  className="hep-checkbox"
                />
                <span>{option.name || option.Display}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
