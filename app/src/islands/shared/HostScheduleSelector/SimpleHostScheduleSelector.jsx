/**
 * Simple Host Schedule Selector with Supabase Integration
 * - Enforces contiguous night selections
 * - Auto-saves to Supabase on changes
 * - Larger cells with more spacing
 */

import { useState, useEffect, useCallback } from 'react'
import { ALL_NIGHTS } from './constants.js'
import { checkContiguity, getNotSelectedNights, nightsToDays } from './utils.js'
import './SimpleHostScheduleSelector.css'

/**
 * SimpleHostScheduleSelector component
 * @param {import('./types.js').SimpleHostScheduleSelectorProps} props
 */
export function SimpleHostScheduleSelector({
  listing,
  supabase,
  onUpdate,
  onError,
  disabled = false,
}) {
  const [selectedNights, setSelectedNights] = useState(
    listing.nights_available || []
  )
  const [isUpdating, setIsUpdating] = useState(false)

  // Sync with listing prop
  useEffect(() => {
    setSelectedNights(listing.nights_available || [])
  }, [listing.nights_available])

  /**
   * Update listing in Supabase
   */
  const updateSupabase = useCallback(
    async (nights) => {
      if (!supabase || !listing.id) return

      setIsUpdating(true)

      try {
        const notSelected = getNotSelectedNights(nights)
        const selectedDays = nightsToDays(nights)
        const notSelectedDays = nightsToDays(notSelected)

        // Calculate all fields
        const updates = {
          nights_available: nights,
          nights_number: nights.length,
          min_nights: Math.max(1, nights.length), // At least 1 night
          max_nights: nights.length,
          days_selected: selectedDays,
          days_not_available: notSelectedDays,
          nights_not_available: notSelected,
        }

        // Update in Supabase
        const { data, error } = await supabase
          .from('listing')
          .update(updates)
          .eq('id', listing.id)
          .select()
          .single()

        if (error) throw error

        // Call onUpdate callback
        if (onUpdate && data) {
          onUpdate(data)
        }
      } catch (error) {
        console.error('Error updating listing:', error)
        if (onError) {
          onError(error)
        }
      } finally {
        setIsUpdating(false)
      }
    },
    [supabase, listing.id, onUpdate, onError]
  )

  /**
   * Check if a selection would be contiguous
   */
  const wouldBeContiguous = useCallback((nights) => {
    if (nights.length === 0) return true
    const result = checkContiguity(nights)
    return result.isContiguous
  }, [])

  /**
   * Handle night click
   */
  const handleNightClick = useCallback(
    (nightId) => {
      if (disabled || isUpdating) return

      const isSelected = selectedNights.includes(nightId)

      if (isSelected) {
        // Remove night
        const newSelection = selectedNights.filter((id) => id !== nightId)

        // Check if removal would maintain contiguity
        if (newSelection.length > 0 && !wouldBeContiguous(newSelection)) {
          alert('Removing this night would break the contiguous selection. Please maintain consecutive nights.')
          return
        }

        setSelectedNights(newSelection)
        updateSupabase(newSelection)
      } else {
        // Add night
        const newSelection = [...selectedNights, nightId].sort((a, b) => {
          const aIndex = ALL_NIGHTS.findIndex((n) => n.id === a)
          const bIndex = ALL_NIGHTS.findIndex((n) => n.id === b)
          return aIndex - bIndex
        })

        // Check if addition would maintain contiguity
        if (!wouldBeContiguous(newSelection)) {
          alert('Selected nights must be consecutive (contiguous). Please select consecutive nights only.')
          return
        }

        setSelectedNights(newSelection)
        updateSupabase(newSelection)
      }
    },
    [selectedNights, disabled, isUpdating, wouldBeContiguous, updateSupabase]
  )

  /**
   * Get CSS classes for a night cell
   */
  const getNightCellClasses = useCallback(
    (nightId) => {
      const classes = ['shss-night-cell']
      const isSelected = selectedNights.includes(nightId)

      if (isSelected) {
        classes.push('shss-selected')
      }

      if (disabled || isUpdating) {
        classes.push('shss-disabled')
      }

      return classes.join(' ')
    },
    [selectedNights, disabled, isUpdating]
  )

  return (
    <div className="shss-container" role="group" aria-label="Night schedule selector">
      {isUpdating && (
        <div className="shss-loading-indicator">
          <span>Updating...</span>
        </div>
      )}

      <div className="shss-nights-grid" role="list">
        {ALL_NIGHTS.map((night) => {
          const isSelected = selectedNights.includes(night.id)

          return (
            <div
              key={night.id}
              className={getNightCellClasses(night.id)}
              onClick={() => handleNightClick(night.id)}
              role="checkbox"
              aria-checked={isSelected}
              aria-label={`${night.display} night`}
              aria-disabled={disabled || isUpdating}
              tabIndex={disabled || isUpdating ? -1 : 0}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault()
                  handleNightClick(night.id)
                }
              }}
            >
              <span className="shss-night-letter">{night.singleLetter}</span>
            </div>
          )
        })}
      </div>

      <div className="shss-info">
        <span className="shss-info-text">
          {selectedNights.length} {selectedNights.length === 1 ? 'night' : 'nights'} selected
        </span>
        {selectedNights.length > 0 && (
          <span className="shss-info-subtext">
            (Nights must be consecutive)
          </span>
        )}
      </div>
    </div>
  )
}

export default SimpleHostScheduleSelector
