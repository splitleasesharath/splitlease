/**
 * Host Schedule Selector Component
 * A reusable React component for selecting nights of the week
 * Based on Bubble.io implementation with complete workflow logic
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { ALL_NIGHTS } from './constants.js'
import {
  checkContiguity,
  autoFillSequence,
  autoCompleteToSeven,
  getNotSelectedNights,
  nightsToDays,
  isNightAvailable,
} from './utils.js'
import './HostScheduleSelector.css'

/**
 * Main HostScheduleSelector component
 * @param {import('./types.js').HostScheduleSelectorProps} props
 */
export function HostScheduleSelector({
  listing,
  selectedNights: controlledSelectedNights,
  onSelectionChange,
  isClickable = true,
  inProposal = false,
  mode = 'normal',
  doNotChangeListing = false,
  onListingUpdate,
  onAlert,
  showAlertsOnLive = true,
  isLiveVersion = true,
  className,
}) {
  // State management
  const [selectedNights, setSelectedNights] = useState(
    controlledSelectedNights || listing?.nightsAvailable || []
  )
  const [isContiguous, setIsContiguous] = useState(true)
  const [errorClickCount, setErrorClickCount] = useState(0)

  // Ref to track if we should trigger recalc
  const triggerRecalc = useRef(false)

  // Available nights from listing (or all nights if no listing)
  const availableNights = listing?.nightsAvailable || ALL_NIGHTS.map((n) => n.id)

  // Sync with controlled prop
  useEffect(() => {
    if (controlledSelectedNights !== undefined) {
      setSelectedNights(controlledSelectedNights)
    }
  }, [controlledSelectedNights])

  // Initialize from listing when it changes
  useEffect(() => {
    if (listing && !inProposal) {
      setSelectedNights(listing.nightsAvailable || [])
    }
  }, [listing, inProposal])

  // Check contiguity whenever selection changes
  useEffect(() => {
    const result = checkContiguity(selectedNights)
    setIsContiguous(result.isContiguous)
  }, [selectedNights])

  // Workflow 3: Alert when no nights selected for Nightly rental
  useEffect(() => {
    if (
      selectedNights.length === 0 &&
      listing?.rentalType === 'Nightly' &&
      mode !== 'proposal' &&
      !window.location.pathname.includes('host-proposal') &&
      !window.location.pathname.includes('leases')
    ) {
      setTimeout(() => {
        triggerAlert(
          'No nights selected',
          'Please select at least one night for your listing',
          'error'
        )
      }, 100)
    }
  }, [selectedNights.length, listing?.rentalType, mode])

  // Workflow 4: Handle recalc trigger
  useEffect(() => {
    if (triggerRecalc.current) {
      calculateAndUpdateState(selectedNights)
      triggerRecalc.current = false
    }
  }, [triggerRecalc.current])

  /**
   * Trigger alert notification
   */
  const triggerAlert = useCallback(
    (title, content, type = 'information') => {
      if (onAlert && (showAlertsOnLive || !isLiveVersion)) {
        onAlert(title, content, type)
      }
    },
    [onAlert, showAlertsOnLive, isLiveVersion]
  )

  /**
   * Calculate and update all derived state
   * Implements Workflow 2: calculate nights, then sort nights and set states
   */
  const calculateAndUpdateState = useCallback(
    (nights) => {
      const notSelected = getNotSelectedNights(nights)

      // Update listing if allowed
      if (!doNotChangeListing && onListingUpdate && listing) {
        const updates = {
          nightsAvailable: nights,
          selectedDays: nightsToDays(nights),
          notSelectedDays: nightsToDays(notSelected),
        }

        // Update maximum nights if needed
        if (listing.maximumNights < nights.length) {
          updates.maximumNights = nights.length
        }

        // Set to 7 if all nights selected
        if (nights.length === 7) {
          updates.maximumNights = 7
        }

        onListingUpdate(updates)
      }
    },
    [doNotChangeListing, onListingUpdate, listing]
  )

  /**
   * Handle night click
   * Implements Workflow 9 (Adding) and Workflow 10 (Removing)
   */
  const handleNightClick = useCallback(
    (nightId) => {
      // Check if night is available
      if (!isNightAvailable(nightId, availableNights)) {
        return
      }

      // Check if clickable
      if (!isClickable) {
        return
      }

      const isSelected = selectedNights.includes(nightId)

      if (isSelected) {
        // WORKFLOW 10: Remove a night
        if (!inProposal) {
          const newSelection = selectedNights.filter((id) => id !== nightId)

          // Show message if deselecting from 7 to 6
          if (selectedNights.length === 7 && newSelection.length === 6) {
            triggerAlert(
              'Deselect one more night',
              'You need to deselect one more night to avoid having exactly 6 nights selected',
              'warning'
            )
          }

          setSelectedNights(newSelection)
          calculateAndUpdateState(newSelection)

          if (onSelectionChange) {
            onSelectionChange(newSelection)
          }
        }
      } else {
        // WORKFLOW 9: Add a night

        // Check if already at 7 nights
        if (selectedNights.length >= 7) {
          setErrorClickCount((prev) => prev + 1)
          if (errorClickCount >= 2) {
            triggerAlert(
              'Maximum nights reached',
              'You can only select up to 7 nights per week',
              'error'
            )
          }
          return
        }

        if (!inProposal) {
          let newSelection

          // Auto-fill sequence if this is the second night selected
          if (selectedNights.length === 1) {
            newSelection = autoFillSequence(selectedNights, nightId)
          } else {
            newSelection = [...selectedNights, nightId]
          }

          // Auto-complete to 7 if we hit 6 nights
          if (newSelection.length === 6) {
            newSelection = autoCompleteToSeven(newSelection)
            triggerAlert(
              'Auto-completed to 7 nights',
              'All 7 nights have been automatically selected',
              'information'
            )
          }

          setSelectedNights(newSelection)
          calculateAndUpdateState(newSelection)

          if (onSelectionChange) {
            onSelectionChange(newSelection)
          }
        }
      }
    },
    [
      selectedNights,
      availableNights,
      isClickable,
      inProposal,
      errorClickCount,
      onSelectionChange,
      calculateAndUpdateState,
      triggerAlert,
    ]
  )

  /**
   * Get CSS classes for a night cell
   */
  const getNightCellClasses = useCallback(
    (nightId) => {
      const classes = ['hss-night-cell']
      const isSelected = selectedNights.includes(nightId)
      const isAvailable = isNightAvailable(nightId, availableNights)

      // Selected state
      if (isSelected) {
        classes.push('hss-selected')

        // Non-contiguous in proposal mode
        if (inProposal && !isContiguous) {
          classes.push('hss-non-contiguous')
        }
      }

      // Unavailable state
      if (!isAvailable) {
        classes.push('hss-unavailable')
      }

      // Disabled state
      if (!isClickable || (mode === 'preview' && !isAvailable)) {
        classes.push('hss-disabled')
      }

      return classes.join(' ')
    },
    [selectedNights, availableNights, isClickable, inProposal, isContiguous, mode]
  )

  /**
   * Get tooltip text for a night cell
   */
  const getTooltipText = useCallback(
    (nightId) => {
      const isAvailable = isNightAvailable(nightId, availableNights)
      const isSelected = selectedNights.includes(nightId)

      if (!isAvailable) {
        if (mode === 'step-by-step-guide' && isSelected) {
          return 'Not Available Night Selected'
        }
        if (mode === 'preview') {
          return 'Unavailable'
        }
        return 'Not Available Night'
      }

      return undefined
    },
    [availableNights, selectedNights, mode]
  )

  /**
   * Get container classes based on mode
   */
  const getContainerClasses = useCallback(() => {
    const classes = ['hss-host-schedule-selector']

    if (mode === 'preview') {
      classes.push('hss-preview-mode')
    } else if (mode === 'step-by-step-guide') {
      classes.push('hss-step-by-step-mode')
    } else if (mode === 'proposal' || inProposal) {
      classes.push('hss-proposal-mode')
    }

    if (className) {
      classes.push(className)
    }

    return classes.join(' ')
  }, [mode, inProposal, className])

  return (
    <div className={getContainerClasses()} role="group" aria-label="Schedule selector">
      <div className="hss-nights-grid" role="list">
        {ALL_NIGHTS.map((night) => {
          const isAvailable = isNightAvailable(night.id, availableNights)
          const isSelected = selectedNights.includes(night.id)
          const tooltip = getTooltipText(night.id)

          return (
            <div
              key={night.id}
              className={getNightCellClasses(night.id)}
              onClick={() => handleNightClick(night.id)}
              data-night={night.id}
              data-available={isAvailable}
              data-tooltip={tooltip}
              role="checkbox"
              aria-checked={isSelected}
              aria-label={`${night.display} night`}
              aria-disabled={!isClickable || !isAvailable}
              tabIndex={isClickable && isAvailable ? 0 : -1}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault()
                  handleNightClick(night.id)
                }
              }}
            >
              <span className="hss-night-letter">{night.singleLetter}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default HostScheduleSelector
