/**
 * SearchPage Logic Hook
 *
 * Orchestrates all business logic for the SearchPage component following the
 * "Hollow Component" pattern. This hook manages React state and effects while
 * delegating all business logic to Logic Core functions.
 *
 * @intent Provide pre-calculated data and handlers to SearchPage component.
 * @pattern Logic Hook (orchestration layer between Component and Logic Core).
 *
 * Architecture:
 * - React state management (hooks, effects)
 * - Calls Logic Core functions for calculations/validation
 * - Infrastructure layer (Supabase queries, data fetching)
 * - Returns pre-processed data to component
 *
 * Component receives:
 * - Pre-calculated values (no inline calculations)
 * - Event handlers (no inline logic)
 * - Loading/error states
 * - Modal controls
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { supabase } from '../../lib/supabase.js'
import {
  PRICE_TIERS,
  SORT_OPTIONS,
  WEEK_PATTERNS,
  LISTING_CONFIG
} from '../../lib/constants.js'
import {
  initializeLookups,
  getNeighborhoodName,
  getBoroughName,
  getPropertyTypeLabel,
  isInitialized
} from '../../lib/dataLookups.js'
import { parseUrlToFilters, updateUrlParams, watchUrlChanges } from '../../lib/urlParams.js'
import {
  fetchPhotoUrls,
  fetchHostData,
  extractPhotos,
  parseAmenities,
  parseJsonArray
} from '../../lib/supabaseUtils.js'
import { sanitizeNeighborhoodSearch } from '../../lib/sanitize.js'

// Logic Core imports
import {
  calculateGuestFacingPrice,
  formatHostName,
  extractListingCoordinates,
  isValidPriceTier,
  isValidWeekPattern,
  isValidSortOption
} from '../../logic/index.js'

/**
 * Fetch informational texts from Supabase.
 * Infrastructure layer - not business logic.
 */
async function fetchInformationalTexts() {
  try {
    const { data, error } = await supabase
      .from('informationaltexts')
      .select(
        '_id, "Information Tag-Title", "Desktop copy", "Mobile copy", "Desktop+ copy", "show more available?"'
      )

    if (error) throw error

    // Transform data into a map keyed by tag title
    const textsMap = {}
    data.forEach((item) => {
      textsMap[item['Information Tag-Title']] = {
        desktop: item['Desktop copy'],
        mobile: item['Mobile copy'],
        desktopPlus: item['Desktop+ copy'],
        showMore: item['show more available?']
      }
    })

    return textsMap
  } catch (error) {
    console.error('Failed to fetch informational texts:', error)
    return {}
  }
}

/**
 * Main SearchPage logic hook.
 *
 * @returns {object} Pre-calculated state and handlers for SearchPage component.
 */
export function useSearchPageLogic() {
  // ============================================================================
  // State Management
  // ============================================================================

  // Loading & Error State
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Listings State
  const [allActiveListings, setAllActiveListings] = useState([]) // ALL active (green pins)
  const [allListings, setAllListings] = useState([]) // Filtered (purple pins)
  const [displayedListings, setDisplayedListings] = useState([]) // Lazy-loaded subset
  const [loadedCount, setLoadedCount] = useState(0)

  // Modal State
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
  const [isAIResearchModalOpen, setIsAIResearchModalOpen] = useState(false)
  const [selectedListing, setSelectedListing] = useState(null)
  const [infoModalTriggerRef, setInfoModalTriggerRef] = useState(null)
  const [informationalTexts, setInformationalTexts] = useState({})

  // Geography State
  const [boroughs, setBoroughs] = useState([])
  const [neighborhoods, setNeighborhoods] = useState([])

  // Parse URL parameters for initial filter state
  const urlFilters = useMemo(() => parseUrlToFilters(), [])

  // Filter State (initialized from URL if available)
  const [selectedBorough, setSelectedBorough] = useState(urlFilters.selectedBorough)
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState(
    urlFilters.selectedNeighborhoods
  )
  const [weekPattern, setWeekPattern] = useState(urlFilters.weekPattern)
  const [priceTier, setPriceTier] = useState(urlFilters.priceTier)
  const [sortBy, setSortBy] = useState(urlFilters.sortBy)
  const [neighborhoodSearch, setNeighborhoodSearch] = useState('')

  // UI State
  const [filterPanelActive, setFilterPanelActive] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileMapVisible, setMobileMapVisible] = useState(false)

  // Refs
  const mapRef = useRef(null)
  const fetchInProgressRef = useRef(false)
  const lastFetchParamsRef = useRef(null)
  const isInitialMount = useRef(true)

  // ============================================================================
  // Logic Core Integration - Filter Validation
  // ============================================================================

  /**
   * Validate filter selections using Logic Core rules.
   * Pre-calculate validation results for component display.
   */
  const filterValidation = useMemo(() => {
    return {
      isPriceTierValid: isValidPriceTier({ priceTier }),
      isWeekPatternValid: isValidWeekPattern({ weekPattern }),
      isSortOptionValid: isValidSortOption({ sortBy })
    }
  }, [priceTier, weekPattern, sortBy])

  // ============================================================================
  // Data Fetching - Infrastructure Layer
  // ============================================================================

  /**
   * Transform raw Supabase listing data to UI format.
   * Uses Logic Core processors for data transformation.
   */
  const transformListing = useCallback((dbListing, images, hostData) => {
    // Resolve human-readable names from database IDs
    const neighborhoodName = getNeighborhoodName(dbListing['Location - Hood'])
    const boroughName = getBoroughName(dbListing['Location - Borough'])
    const propertyType = getPropertyTypeLabel(dbListing['Features - Type of Space'])

    // Build location string
    const locationParts = []
    if (neighborhoodName) locationParts.push(neighborhoodName)
    if (boroughName) locationParts.push(boroughName)
    const location = locationParts.join(', ') || 'New York, NY'

    // Logic Core: Extract coordinates with priority logic
    const coordinatesResult = extractListingCoordinates({
      locationSlightlyDifferent: dbListing['Location - slightly different address'],
      locationAddress: dbListing['Location - Address'],
      listingId: dbListing._id
    })

    return {
      id: dbListing._id,
      title: dbListing.Name || 'Unnamed Listing',
      location: location,
      neighborhood: neighborhoodName || '',
      borough: boroughName || '',
      coordinates: coordinatesResult
        ? { lat: coordinatesResult.lat, lng: coordinatesResult.lng }
        : null,
      price: {
        starting: dbListing['Standarized Minimum Nightly Price (Filter)'] || 0,
        full: dbListing['💰Nightly Host Rate for 7 nights'] || 0
      },
      'Starting nightly price': dbListing['Standarized Minimum Nightly Price (Filter)'] || 0,
      'Price 2 nights selected': dbListing['💰Nightly Host Rate for 2 nights'] || null,
      'Price 3 nights selected': dbListing['💰Nightly Host Rate for 3 nights'] || null,
      'Price 4 nights selected': dbListing['💰Nightly Host Rate for 4 nights'] || null,
      'Price 5 nights selected': dbListing['💰Nightly Host Rate for 5 nights'] || null,
      'Price 6 nights selected': null,
      'Price 7 nights selected': dbListing['💰Nightly Host Rate for 7 nights'] || null,
      type: propertyType,
      squareFeet: dbListing['Features - SQFT Area'] || null,
      maxGuests: dbListing['Features - Qty Guests'] || 1,
      bedrooms: dbListing['Features - Qty Bedrooms'] || 0,
      bathrooms: dbListing['Features - Qty Bathrooms'] || 0,
      amenities: parseAmenities(dbListing),
      host: hostData || {
        name: null,
        image: null,
        verified: false
      },
      images: images || [],
      description: `${(dbListing['Features - Qty Bedrooms'] || 0) === 0 ? 'Studio' : `${dbListing['Features - Qty Bedrooms']} bedroom`} • ${dbListing['Features - Qty Bathrooms'] || 0} bathroom`,
      weeks_offered: dbListing['Weeks offered'] || 'Every week',
      days_available: parseJsonArray(dbListing['Days Available (List of Days)']),
      isNew: false
    }
  }, [])

  /**
   * Fetch ALL active listings for map background (green pins).
   * Runs once on mount, no filters applied.
   */
  const fetchAllActiveListings = useCallback(async () => {
    console.log('🌍 Fetching ALL active listings for map background (green pins)...')

    try {
      const { data, error } = await supabase
        .from('listing')
        .select('*')
        .eq('Active', true)
        .eq('isForUsability', false)
        .or(
          '"Location - Address".not.is.null,"Location - slightly different address".not.is.null'
        )

      if (error) throw error

      console.log('📊 fetchAllActiveListings: Supabase returned', data.length, 'active listings')

      // Batch fetch photos
      const allPhotoIds = new Set()
      data.forEach((listing) => {
        const photosField = listing['Features - Photos']
        if (Array.isArray(photosField)) {
          photosField.forEach((id) => allPhotoIds.add(id))
        } else if (typeof photosField === 'string') {
          try {
            const parsed = JSON.parse(photosField)
            if (Array.isArray(parsed)) {
              parsed.forEach((id) => allPhotoIds.add(id))
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      })

      const photoMap = await fetchPhotoUrls(Array.from(allPhotoIds))

      // Extract photos per listing
      const resolvedPhotos = {}
      data.forEach((listing) => {
        resolvedPhotos[listing._id] = extractPhotos(
          listing['Features - Photos'],
          photoMap,
          listing._id
        )
      })

      // Batch fetch host data
      const hostIds = new Set()
      data.forEach((listing) => {
        if (listing['Host / Landlord']) {
          hostIds.add(listing['Host / Landlord'])
        }
      })

      const hostMap = await fetchHostData(Array.from(hostIds))

      // Map host data to listings
      const resolvedHosts = {}
      data.forEach((listing) => {
        const hostId = listing['Host / Landlord']
        resolvedHosts[listing._id] = hostMap[hostId] || null
      })

      // Transform listings using Logic Core
      const transformedListings = data.map((listing) =>
        transformListing(listing, resolvedPhotos[listing._id], resolvedHosts[listing._id])
      )

      // Filter to only listings with valid coordinates (NO FALLBACK)
      const listingsWithCoordinates = transformedListings.filter((listing) => {
        const hasValidCoords =
          listing.coordinates && listing.coordinates.lat && listing.coordinates.lng
        if (!hasValidCoords) {
          console.warn('⚠️ fetchAllActiveListings: Excluding listing without coordinates:', {
            id: listing.id,
            title: listing.title
          })
        }
        return hasValidCoords
      })

      console.log(
        `✅ Fetched ${listingsWithCoordinates.length} active listings with coordinates for green markers`
      )
      setAllActiveListings(listingsWithCoordinates)
    } catch (error) {
      console.error('❌ Failed to fetch all active listings:', error)
      // Don't set error state - this shouldn't block the page
    }
  }, [transformListing])

  /**
   * Fetch filtered listings based on current filter state.
   * Infrastructure layer - Supabase query building.
   */
  const fetchListings = useCallback(async () => {
    if (boroughs.length === 0 || !selectedBorough) return

    // Performance optimization: Prevent duplicate fetches
    const fetchParams = `${selectedBorough}-${selectedNeighborhoods.join(',')}-${weekPattern}-${priceTier}-${sortBy}`

    if (fetchInProgressRef.current) {
      console.log('⏭️ Skipping duplicate fetch - already in progress')
      return
    }

    if (lastFetchParamsRef.current === fetchParams) {
      console.log('⏭️ Skipping duplicate fetch - same parameters')
      return
    }

    fetchInProgressRef.current = true
    lastFetchParamsRef.current = fetchParams

    setIsLoading(true)
    setError(null)

    try {
      const borough = boroughs.find((b) => b.value === selectedBorough)
      if (!borough) throw new Error('Borough not found')

      // Build Supabase query
      let query = supabase
        .from('listing')
        .select('*')
        .eq('"Complete"', true)
        .or('"Active".eq.true,"Active".is.null')
        .eq('"Location - Borough"', borough.id)
        .or(
          '"Location - Address".not.is.null,"Location - slightly different address".not.is.null'
        )

      // Apply week pattern filter
      if (weekPattern !== 'every-week') {
        const weekPatternText = WEEK_PATTERNS[weekPattern]
        if (weekPatternText) {
          query = query.eq('"Weeks offered"', weekPatternText)
        }
      }

      // Apply price filter
      if (priceTier !== 'all') {
        const priceRange = PRICE_TIERS[priceTier]
        if (priceRange) {
          query = query
            .gte('"Standarized Minimum Nightly Price (Filter)"', priceRange.min)
            .lte('"Standarized Minimum Nightly Price (Filter)"', priceRange.max)
        }
      }

      // Apply neighborhood filter
      if (selectedNeighborhoods.length > 0) {
        query = query.in('"Location - Hood"', selectedNeighborhoods)
      }

      // Apply sorting
      const sortConfig = SORT_OPTIONS[sortBy] || SORT_OPTIONS.recommended
      query = query.order(sortConfig.field, { ascending: sortConfig.ascending })

      const { data, error } = await query

      if (error) throw error

      console.log('📊 SearchPage: Supabase query returned', data.length, 'listings')

      // Batch fetch photos
      const allPhotoIds = new Set()
      data.forEach((listing) => {
        const photosField = listing['Features - Photos']
        if (Array.isArray(photosField)) {
          photosField.forEach((id) => allPhotoIds.add(id))
        } else if (typeof photosField === 'string') {
          try {
            const parsed = JSON.parse(photosField)
            if (Array.isArray(parsed)) {
              parsed.forEach((id) => allPhotoIds.add(id))
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      })

      const photoMap = await fetchPhotoUrls(Array.from(allPhotoIds))

      // Extract photos per listing
      const resolvedPhotos = {}
      data.forEach((listing) => {
        resolvedPhotos[listing._id] = extractPhotos(
          listing['Features - Photos'],
          photoMap,
          listing._id
        )
      })

      // Batch fetch host data
      const hostIds = new Set()
      data.forEach((listing) => {
        if (listing['Host / Landlord']) {
          hostIds.add(listing['Host / Landlord'])
        }
      })

      const hostMap = await fetchHostData(Array.from(hostIds))

      // Map host data to listings
      const resolvedHosts = {}
      data.forEach((listing) => {
        const hostId = listing['Host / Landlord']
        resolvedHosts[listing._id] = hostMap[hostId] || null
      })

      // Transform listings using Logic Core
      const transformedListings = data.map((listing) =>
        transformListing(listing, resolvedPhotos[listing._id], resolvedHosts[listing._id])
      )

      // Filter out listings without valid coordinates (NO FALLBACK)
      const listingsWithCoordinates = transformedListings.filter((listing) => {
        const hasValidCoords =
          listing.coordinates && listing.coordinates.lat && listing.coordinates.lng
        if (!hasValidCoords) {
          console.warn('⚠️ SearchPage: Excluding listing without valid coordinates:', {
            id: listing.id,
            title: listing.title
          })
        }
        return hasValidCoords
      })

      setAllListings(listingsWithCoordinates)
      setLoadedCount(0)

      console.log('✅ SearchPage: State updated with', listingsWithCoordinates.length, 'listings')
    } catch (err) {
      console.error('Failed to fetch listings:', {
        message: err.message,
        filters: {
          borough: selectedBorough,
          neighborhoods: selectedNeighborhoods,
          weekPattern,
          priceTier
        }
      })

      setError(
        'We had trouble loading listings. Please try refreshing the page or adjusting your filters.'
      )
    } finally {
      setIsLoading(false)
      fetchInProgressRef.current = false
    }
  }, [
    boroughs,
    selectedBorough,
    selectedNeighborhoods,
    weekPattern,
    priceTier,
    sortBy,
    transformListing
  ])

  // ============================================================================
  // Effects - Data Loading
  // ============================================================================

  // Initialize data lookups on mount
  useEffect(() => {
    const init = async () => {
      if (!isInitialized()) {
        console.log('Initializing data lookups...')
        await initializeLookups()
      }
    }
    init()
  }, [])

  // Fetch informational texts on mount
  useEffect(() => {
    const loadInformationalTexts = async () => {
      const texts = await fetchInformationalTexts()
      setInformationalTexts(texts)
    }
    loadInformationalTexts()
  }, [])

  // Fetch ALL active listings once on mount
  useEffect(() => {
    fetchAllActiveListings()
  }, [fetchAllActiveListings])

  // Load boroughs on mount
  useEffect(() => {
    const loadBoroughs = async () => {
      try {
        const { data, error } = await supabase
          .from('zat_geo_borough_toplevel')
          .select('_id, "Display Borough"')
          .order('"Display Borough"', { ascending: true })

        if (error) throw error

        const boroughList = data
          .filter((b) => b['Display Borough'] && b['Display Borough'].trim())
          .map((b) => ({
            id: b._id,
            name: b['Display Borough'].trim(),
            value: b['Display Borough']
              .trim()
              .toLowerCase()
              .replace(/\s+county\s+nj/i, '')
              .replace(/\s+/g, '-')
          }))

        setBoroughs(boroughList)

        // Only set default borough if not already set from URL
        if (!selectedBorough) {
          const manhattan = boroughList.find((b) => b.value === 'manhattan')
          if (manhattan) {
            setSelectedBorough(manhattan.value)
          }
        } else {
          // Validate borough from URL exists
          const boroughExists = boroughList.find((b) => b.value === selectedBorough)
          if (!boroughExists) {
            console.warn(`Borough "${selectedBorough}" from URL not found, defaulting to Manhattan`)
            const manhattan = boroughList.find((b) => b.value === 'manhattan')
            if (manhattan) {
              setSelectedBorough(manhattan.value)
            }
          }
        }
      } catch (err) {
        console.error('Failed to load boroughs:', err)
      }
    }

    loadBoroughs()
  }, [])

  // Load neighborhoods when borough changes
  useEffect(() => {
    const loadNeighborhoods = async () => {
      if (!selectedBorough || boroughs.length === 0) return

      const borough = boroughs.find((b) => b.value === selectedBorough)
      if (!borough) return

      try {
        const { data, error } = await supabase
          .from('zat_geo_hood_mediumlevel')
          .select('_id, Display, "Geo-Borough"')
          .eq('"Geo-Borough"', borough.id)
          .order('Display', { ascending: true })

        if (error) throw error

        const neighborhoodList = data
          .filter((n) => n.Display && n.Display.trim())
          .map((n) => ({
            id: n._id,
            name: n.Display.trim(),
            boroughId: n['Geo-Borough']
          }))

        setNeighborhoods(neighborhoodList)
        setSelectedNeighborhoods([]) // Clear selections when borough changes
      } catch (err) {
        console.error('Failed to load neighborhoods:', err)
      }
    }

    loadNeighborhoods()
  }, [selectedBorough, boroughs])

  // Fetch listings when filters change
  useEffect(() => {
    fetchListings()
  }, [fetchListings])

  // Lazy load listings
  useEffect(() => {
    if (allListings.length === 0) {
      setDisplayedListings([])
      return
    }

    const initialCount = LISTING_CONFIG.INITIAL_LOAD_COUNT
    setDisplayedListings(allListings.slice(0, initialCount))
    setLoadedCount(initialCount)
  }, [allListings])

  // Sync filter state to URL parameters
  useEffect(() => {
    // Skip URL update on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    const filters = {
      selectedBorough,
      weekPattern,
      priceTier,
      sortBy,
      selectedNeighborhoods
    }

    updateUrlParams(filters, false)
  }, [selectedBorough, weekPattern, priceTier, sortBy, selectedNeighborhoods])

  // Watch for browser back/forward navigation
  useEffect(() => {
    const cleanup = watchUrlChanges((newFilters) => {
      console.log('URL changed via browser navigation, updating filters:', newFilters)

      setSelectedBorough(newFilters.selectedBorough)
      setWeekPattern(newFilters.weekPattern)
      setPriceTier(newFilters.priceTier)
      setSortBy(newFilters.sortBy)
      setSelectedNeighborhoods(newFilters.selectedNeighborhoods)
    })

    return cleanup
  }, [])

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleLoadMore = useCallback(() => {
    const batchSize = LISTING_CONFIG.LOAD_BATCH_SIZE
    const nextCount = Math.min(loadedCount + batchSize, allListings.length)
    setDisplayedListings(allListings.slice(0, nextCount))
    setLoadedCount(nextCount)
  }, [loadedCount, allListings])

  const handleResetFilters = useCallback(() => {
    const manhattan = boroughs.find((b) => b.value === 'manhattan')
    if (manhattan) {
      setSelectedBorough(manhattan.value)
    }
    setSelectedNeighborhoods([])
    setWeekPattern('every-week')
    setPriceTier('all')
    setSortBy('recommended')
    setNeighborhoodSearch('')
  }, [boroughs])

  // Modal handlers
  const handleOpenContactModal = useCallback((listing) => {
    setSelectedListing(listing)
    setIsContactModalOpen(true)
  }, [])

  const handleCloseContactModal = useCallback(() => {
    setIsContactModalOpen(false)
    setSelectedListing(null)
  }, [])

  const handleOpenInfoModal = useCallback((listing, triggerRef) => {
    setSelectedListing(listing)
    setInfoModalTriggerRef(triggerRef)
    setIsInfoModalOpen(true)
  }, [])

  const handleCloseInfoModal = useCallback(() => {
    setIsInfoModalOpen(false)
    setSelectedListing(null)
    setInfoModalTriggerRef(null)
  }, [])

  const handleOpenAIResearchModal = useCallback(() => {
    setIsAIResearchModalOpen(true)
  }, [])

  const handleCloseAIResearchModal = useCallback(() => {
    setIsAIResearchModalOpen(false)
  }, [])

  // ============================================================================
  // Computed Values
  // ============================================================================

  const hasMore = loadedCount < allListings.length

  const filteredNeighborhoods = useMemo(() => {
    return neighborhoods.filter((n) => {
      const sanitizedSearch = sanitizeNeighborhoodSearch(neighborhoodSearch)
      return n.name.toLowerCase().includes(sanitizedSearch.toLowerCase())
    })
  }, [neighborhoods, neighborhoodSearch])

  // ============================================================================
  // Return Pre-Calculated State and Handlers
  // ============================================================================

  return {
    // Loading & Error State
    isLoading,
    error,

    // Listings Data
    allActiveListings,
    allListings,
    displayedListings,
    hasMore,

    // Geography Data
    boroughs,
    neighborhoods: filteredNeighborhoods,

    // Filter State
    selectedBorough,
    selectedNeighborhoods,
    weekPattern,
    priceTier,
    sortBy,
    neighborhoodSearch,

    // Filter Validation (Logic Core)
    filterValidation,

    // UI State
    filterPanelActive,
    menuOpen,
    mobileMapVisible,

    // Modal State
    isContactModalOpen,
    isInfoModalOpen,
    isAIResearchModalOpen,
    selectedListing,
    infoModalTriggerRef,
    informationalTexts,

    // Refs
    mapRef,

    // Filter Handlers
    setSelectedBorough,
    setSelectedNeighborhoods,
    setWeekPattern,
    setPriceTier,
    setSortBy,
    setNeighborhoodSearch,
    handleResetFilters,

    // UI Handlers
    setFilterPanelActive,
    setMenuOpen,
    setMobileMapVisible,

    // Listing Handlers
    handleLoadMore,
    fetchListings, // For retry functionality

    // Modal Handlers
    handleOpenContactModal,
    handleCloseContactModal,
    handleOpenInfoModal,
    handleCloseInfoModal,
    handleOpenAIResearchModal,
    handleCloseAIResearchModal
  }
}
