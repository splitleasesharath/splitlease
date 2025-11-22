/**
 * useViewSplitLeasePageLogic - Logic Hook for ViewSplitLeasePage
 * Orchestrates all business logic using Logic Core functions.
 *
 * ARCHITECTURE: This hook is the orchestration layer between React and Logic Core.
 * - Manages React state (useState, useEffect, useCallback, useMemo)
 * - Calls Logic Core functions for all business logic
 * - Returns pre-calculated data to component
 * - Component using this hook is "hollow" (presentation only)
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { initializeLookups } from '../../lib/dataLookups.js'
import { fetchListingComplete, getListingIdFromUrl, fetchZatPriceConfiguration } from '../../lib/listingDataFetcher.js'
import { calculateNextAvailableCheckIn } from '../../logic/calculators/scheduling/calculateNextAvailableCheckIn.js'
import { validateScheduleWorkflow } from '../../logic/workflows/scheduling/validateScheduleWorkflow.js'
import { validateMoveInDateWorkflow } from '../../logic/workflows/scheduling/validateMoveInDateWorkflow.js'
import { isScheduleContiguous } from '../../logic/rules/scheduling/isScheduleContiguous.js'

/**
 * Custom hook for ViewSplitLeasePage business logic
 * @returns {object} Page state and handlers
 */
export function useViewSplitLeasePageLogic() {
  // ============================================================================
  // STATE
  // ============================================================================

  // Core data state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [listing, setListing] = useState(null)
  const [zatConfig, setZatConfig] = useState(null)
  const [informationalTexts, setInformationalTexts] = useState({})

  // Booking widget state
  const [moveInDate, setMoveInDate] = useState(null)
  const [strictMode, setStrictMode] = useState(false)
  const [selectedDayObjects, setSelectedDayObjects] = useState([])
  const [reservationSpan, setReservationSpan] = useState(13)
  const [priceBreakdown, setPriceBreakdown] = useState(null)

  // UI state
  const [showTutorialModal, setShowTutorialModal] = useState(false)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [showContactHostModal, setShowContactHostModal] = useState(false)
  const [activeInfoTooltip, setActiveInfoTooltip] = useState(null)
  const [isMobile, setIsMobile] = useState(false)
  const [shouldLoadMap, setShouldLoadMap] = useState(false)
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false)

  // Expanded sections
  const [expandedSections, setExpandedSections] = useState({
    description: false,
    neighborhood: false,
    blockedDates: false
  })

  // ============================================================================
  // LOGIC CORE CALCULATIONS
  // ============================================================================

  // Calculate minimum move-in date (2 weeks from today)
  const minMoveInDate = useMemo(() => {
    const today = new Date()
    const twoWeeksFromNow = new Date(today)
    twoWeeksFromNow.setDate(today.getDate() + 14)
    return twoWeeksFromNow.toISOString().split('T')[0]
  }, [])

  // Convert Day objects to array of indices for Logic Core
  const selectedDayIndices = useMemo(() => {
    return selectedDayObjects.map(day => day.dayOfWeek)
  }, [selectedDayObjects])

  // Calculate smart default move-in date using Logic Core
  const smartMoveInDate = useMemo(() => {
    if (!selectedDayIndices || selectedDayIndices.length === 0) {
      return minMoveInDate
    }

    try {
      return calculateNextAvailableCheckIn({
        selectedDayIndices,
        minDate: minMoveInDate
      })
    } catch (err) {
      console.error('Error calculating smart move-in date:', err)
      return minMoveInDate
    }
  }, [selectedDayIndices, minMoveInDate])

  // Validate schedule using Logic Core workflow
  const scheduleValidation = useMemo(() => {
    if (!listing || selectedDayIndices.length === 0) {
      return { valid: false, errorCode: 'NO_DAYS_SELECTED', nightsCount: 0 }
    }

    return validateScheduleWorkflow({
      selectedDayIndices,
      listing: {
        minimumNights: listing['Minimum Nights'],
        maximumNights: listing['Maximum Nights'],
        daysNotAvailable: listing['Days Not Available']
      }
    })
  }, [selectedDayIndices, listing])

  // Validate move-in date using Logic Core workflow
  const moveInValidation = useMemo(() => {
    if (!moveInDate || !listing || selectedDayIndices.length === 0) {
      return { valid: false, errorCode: 'NO_MOVE_IN_DATE' }
    }

    try {
      const moveInDateObj = new Date(moveInDate)
      return validateMoveInDateWorkflow({
        moveInDate: moveInDateObj,
        listing: {
          firstAvailable: listing['First Available'] || listing[' First Available'],
          lastAvailable: listing['Last Available'],
          blockedDates: listing['Dates - Blocked'] || []
        },
        selectedDayIndices
      })
    } catch (err) {
      console.error('Error validating move-in date:', err)
      return { valid: false, errorCode: 'VALIDATION_ERROR' }
    }
  }, [moveInDate, listing, selectedDayIndices])

  // Check if schedule is contiguous using Logic Core rule
  const isContiguous = useMemo(() => {
    if (selectedDayIndices.length === 0) return false
    return isScheduleContiguous({ selectedDayIndices })
  }, [selectedDayIndices])

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  useEffect(() => {
    async function initialize() {
      try {
        // Initialize lookup caches
        await initializeLookups()

        // Fetch ZAT price configuration
        const zatConfigData = await fetchZatPriceConfiguration()
        setZatConfig(zatConfigData)

        // Fetch informational texts (keep existing implementation)
        // TODO: Move to Logic Core processor if needed
        const infoTexts = await fetchInformationalTexts()
        setInformationalTexts(infoTexts)

        // Get listing ID from URL
        const listingId = getListingIdFromUrl()
        if (!listingId) {
          throw new Error('No listing ID provided in URL')
        }

        // Fetch complete listing data
        const listingData = await fetchListingComplete(listingId)
        setListing(listingData)
        setLoading(false)

      } catch (err) {
        console.error('Error initializing page:', err)
        setError(err.message)
        setLoading(false)
      }
    }

    initialize()

    // Set up responsive listener
    const mediaQuery = window.matchMedia('(max-width: 900px)')
    setIsMobile(mediaQuery.matches)

    const handleResize = (e) => setIsMobile(e.matches)
    mediaQuery.addEventListener('change', handleResize)

    return () => mediaQuery.removeEventListener('change', handleResize)
  }, [])

  // ============================================================================
  // HANDLERS (User interactions)
  // ============================================================================

  const handleDaySelectionChange = useCallback((newSelectedDays) => {
    setSelectedDayObjects(newSelectedDays)

    // Check if non-contiguous (triggers tutorial)
    const dayIndices = newSelectedDays.map(d => d.dayOfWeek)
    if (dayIndices.length > 0 && !isScheduleContiguous({ selectedDayIndices: dayIndices })) {
      setShowTutorialModal(true)
    }

    // Automatically set smart default move-in date when days are selected
    if (dayIndices.length > 0) {
      const smartDate = calculateNextAvailableCheckIn({
        selectedDayIndices: dayIndices,
        minDate: minMoveInDate
      })
      setMoveInDate(smartDate)
    }
  }, [minMoveInDate])

  const handlePriceChange = useCallback((newPriceBreakdown) => {
    setPriceBreakdown(newPriceBreakdown)
  }, [])

  const handleMoveInDateChange = useCallback((newDate) => {
    setMoveInDate(newDate)
  }, [])

  const handleReservationSpanChange = useCallback((newSpan) => {
    setReservationSpan(newSpan)
  }, [])

  const handleStrictModeChange = useCallback((newMode) => {
    setStrictMode(newMode)
  }, [])

  const toggleSection = useCallback((section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }, [])

  const handlePhotoClick = useCallback((index) => {
    setCurrentPhotoIndex(index)
    setShowPhotoModal(true)
  }, [])

  const handleInfoTooltipToggle = useCallback((tooltipId) => {
    setActiveInfoTooltip(prev => prev === tooltipId ? null : tooltipId)
  }, [])

  const openProposalModal = useCallback(() => {
    setIsProposalModalOpen(true)
  }, [])

  const closeProposalModal = useCallback(() => {
    setIsProposalModalOpen(false)
  }, [])

  // ============================================================================
  // RETURN API (Data and handlers for component)
  // ============================================================================

  return {
    // Data state
    loading,
    error,
    listing,
    zatConfig,
    informationalTexts,

    // Booking state
    moveInDate,
    strictMode,
    selectedDayObjects,
    selectedDayIndices,
    reservationSpan,
    priceBreakdown,
    minMoveInDate,
    smartMoveInDate,

    // Validation results (from Logic Core)
    scheduleValidation,
    moveInValidation,
    isContiguous,

    // UI state
    showTutorialModal,
    showPhotoModal,
    currentPhotoIndex,
    showContactHostModal,
    activeInfoTooltip,
    isMobile,
    shouldLoadMap,
    isProposalModalOpen,
    expandedSections,

    // Handlers
    handleDaySelectionChange,
    handlePriceChange,
    handleMoveInDateChange,
    handleReservationSpanChange,
    handleStrictModeChange,
    toggleSection,
    handlePhotoClick,
    handleInfoTooltipToggle,
    openProposalModal,
    closeProposalModal,
    setShowTutorialModal,
    setShowPhotoModal,
    setShowContactHostModal,
    setShouldLoadMap
  }
}

// Helper function for informational texts (keep existing implementation)
async function fetchInformationalTexts() {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase environment variables')
    return {}
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/informationaltexts?select=*`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      console.error('❌ Failed to fetch informational texts:', response.statusText)
      return {}
    }

    const data = await response.json()
    const textsByTag = {}

    data.forEach((item) => {
      const tag = item['Information Tag-Title']
      if (!tag) return

      textsByTag[tag] = {
        id: item._id,
        title: tag,
        desktop: item['Desktop copy'],
        mobile: item['Mobile copy'],
        desktopPlus: item['Desktop+ copy'],
        showMore: item['show more available?']
      }
    })

    return textsByTag
  } catch (error) {
    console.error('Error fetching informational texts:', error)
    return {}
  }
}
