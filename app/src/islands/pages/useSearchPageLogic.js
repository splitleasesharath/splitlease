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
 *
 * REFACTORED: Added fallback listings logic and transformListing export
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
import { fetchInformationalTexts } from '../../lib/informationalTextsFetcher.js'
import { logger } from '../../lib/logger.js'

// Logic Core imports - direct imports from source files
import { calculateGuestFacingPrice } from '../../logic/calculators/pricing/calculateGuestFacingPrice.js';
import { formatHostName } from '../../logic/processors/display/formatHostName.js';
import { extractListingCoordinates } from '../../logic/processors/listing/extractListingCoordinates.js';
import { isValidPriceTier } from '../../logic/rules/search/isValidPriceTier.js';
import { isValidWeekPattern } from '../../logic/rules/search/isValidWeekPattern.js';
import { isValidSortOption } from '../../logic/rules/search/isValidSortOption.js';

/**
 * Extract unique photo IDs from an array of listings.
 * @param {Array} listings - Array of listing objects
 * @returns {Array} Array of unique photo IDs
 */
function extractPhotoIdsFromListings(listings) {
  const photoIds = new Set()
  listings.forEach((listing) => {
    const photosField = listing['Features - Photos']
    // parseJsonArray expects { field, fieldName } object, not raw value
    const parsed = parseJsonArray({ field: photosField, fieldName: 'Features - Photos' })
    parsed.forEach((id) => photoIds.add(id))
  })
  return Array.from(photoIds)
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

  // ============================================================================
  // Fallback Listings State (when filters return no results)
  // MOVED FROM SearchPage.jsx - consolidated into hook
  // ============================================================================
  const [fallbackListings, setFallbackListings] = useState([])
  const [fallbackDisplayedListings, setFallbackDisplayedListings] = useState([])
  const [fallbackLoadedCount, setFallbackLoadedCount] = useState(0)
  const [isFallbackLoading, setIsFallbackLoading] = useState(false)
  const [fallbackFetchFailed, setFallbackFetchFailed] = useState(false)

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
  const [selectedBoroughs, setSelectedBoroughs] = useState(urlFilters.selectedBoroughs)
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
   *
   * EXPORTED: This function is now exported for use by consumers
   * that need the same transformation logic (e.g., fallback listings).
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

    // Helper to safely coerce to number (handles string numbers from Supabase)
    const toNumber = (val, fallback = null) => {
      if (val === null || val === undefined) return fallback
      const num = Number(val)
      return isNaN(num) ? fallback : num
    }

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
        starting: toNumber(dbListing['Standarized Minimum Nightly Price (Filter)'], 0),
        full: toNumber(dbListing['💰Nightly Host Rate for 7 nights'], 0)
      },
      'Starting nightly price': toNumber(dbListing['Standarized Minimum Nightly Price (Filter)'], 0),
      'Price 2 nights selected': toNumber(dbListing['💰Nightly Host Rate for 2 nights']),
      'Price 3 nights selected': toNumber(dbListing['💰Nightly Host Rate for 3 nights']),
      'Price 4 nights selected': toNumber(dbListing['💰Nightly Host Rate for 4 nights']),
      'Price 5 nights selected': toNumber(dbListing['💰Nightly Host Rate for 5 nights']),
      'Price 6 nights selected': null,
      'Price 7 nights selected': toNumber(dbListing['💰Nightly Host Rate for 7 nights']),
      // 7 REQUIRED FIELDS (Golden Rule B) - with numeric coercion
      'rental type': dbListing['rental type'] || 'Nightly',
      rentalType: dbListing['rental type'] || 'Nightly',
      '💰Monthly Host Rate': toNumber(dbListing['💰Monthly Host Rate']),
      '💰Weekly Host Rate': toNumber(dbListing['💰Weekly Host Rate']),
      '💰Cleaning Cost / Maintenance Fee': toNumber(dbListing['💰Cleaning Cost / Maintenance Fee'], 0),
      '💰Damage Deposit': toNumber(dbListing['💰Damage Deposit'], 0),
      '💰Unit Markup': toNumber(dbListing['💰Unit Markup'], 0),
      'Weeks offered': dbListing['Weeks offered'] || 'Every week',
      weeksOffered: dbListing['Weeks offered'] || 'Every week',
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
      days_available: parseJsonArray({ field: dbListing['Days Available (List of Days)'], fieldName: 'Days Available' }),
      isNew: false
    }
  }, [])

  /**
   * Fetch ALL active listings for map background (green pins).
   * Runs once on mount, no filters applied.
   */
  const fetchAllActiveListings = useCallback(async () => {
    logger.debug('Fetching ALL active listings for map background (green pins)...')

    try {
      const { data, error } = await supabase
        .from('listing')
        .select('*')
        .eq('Active', true)
        .eq('Deleted', false)
        .eq('isForUsability', false)
        .or(
          '"Location - Address".not.is.null,"Location - slightly different address".not.is.null'
        )

      if (error) throw error

      logger.debug('fetchAllActiveListings: Supabase returned', data.length, 'active listings')

      // Batch fetch photos
      const photoIdsArray = extractPhotoIdsFromListings(data)
      const photoMap = await fetchPhotoUrls(photoIdsArray)

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
        if (listing['Host User']) {
          hostIds.add(listing['Host User'])
        }
      })

      const hostMap = await fetchHostData(Array.from(hostIds))

      // Map host data to listings
      const resolvedHosts = {}
      data.forEach((listing) => {
        const hostId = listing['Host User']
        resolvedHosts[listing._id] = hostMap[hostId] || null
      })

      // Transform listings using Logic Core
      const transformedListings = data.map((listing) =>
        transformListing(listing, resolvedPhotos[listing._id], resolvedHosts[listing._id])
      )

      // Filter to only listings with valid coordinates
      const listingsWithCoordinates = transformedListings.filter((listing) => {
        const hasValidCoords =
          listing.coordinates && listing.coordinates.lat && listing.coordinates.lng
        return hasValidCoords
      })

      // Filter out listings without photos
      const listingsWithPhotos = listingsWithCoordinates.filter((listing) => {
        return listing.images && listing.images.length > 0
      })

      logger.debug(`Fetched ${listingsWithPhotos.length} active listings with coordinates and photos`)
      setAllActiveListings(listingsWithPhotos)
    } catch (error) {
      logger.error('Failed to fetch all active listings:', error)
      // Don't set error state - this shouldn't block the page
    }
  }, [transformListing])

  /**
   * Fetch filtered listings based on current filter state.
   * Infrastructure layer - Supabase query building.
   */
  const fetchListings = useCallback(async () => {
    // Wait for boroughs to load (needed for ID lookup when filtering)
    if (boroughs.length === 0) return

    // Performance optimization: Prevent duplicate fetches
    const fetchParams = `${selectedBoroughs.join(',')}-${selectedNeighborhoods.join(',')}-${weekPattern}-${priceTier}-${sortBy}`

    if (fetchInProgressRef.current) {
      logger.debug('Skipping duplicate fetch - already in progress')
      return
    }

    if (lastFetchParamsRef.current === fetchParams) {
      logger.debug('Skipping duplicate fetch - same parameters')
      return
    }

    fetchInProgressRef.current = true
    lastFetchParamsRef.current = fetchParams

    setIsLoading(true)
    setError(null)

    try {
      // Build Supabase query
      let query = supabase
        .from('listing')
        .select('*')
        .eq('"Complete"', true)
        .or('"Active".eq.true,"Active".is.null')
        .eq('Deleted', false)
        .or(
          '"Location - Address".not.is.null,"Location - slightly different address".not.is.null'
        )

      // Apply borough filter only when boroughs are selected (empty = show all)
      if (selectedBoroughs.length > 0) {
        const selectedBoroughIds = selectedBoroughs
          .map(value => boroughs.find(b => b.value === value)?.id)
          .filter(Boolean)
        if (selectedBoroughIds.length > 0) {
          query = query.in('"Location - Borough"', selectedBoroughIds)
        }
      }

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

      logger.debug('SearchPage: Supabase query returned', data.length, 'listings')

      // Batch fetch photos
      const photoIdsArray = extractPhotoIdsFromListings(data)
      const photoMap = await fetchPhotoUrls(photoIdsArray)

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
        if (listing['Host User']) {
          hostIds.add(listing['Host User'])
        }
      })

      const hostMap = await fetchHostData(Array.from(hostIds))

      // Map host data to listings
      const resolvedHosts = {}
      data.forEach((listing) => {
        const hostId = listing['Host User']
        resolvedHosts[listing._id] = hostMap[hostId] || null
      })

      // Transform listings using Logic Core
      const transformedListings = data.map((listing) =>
        transformListing(listing, resolvedPhotos[listing._id], resolvedHosts[listing._id])
      )

      // Filter out listings without valid coordinates
      const listingsWithCoordinates = transformedListings.filter((listing) => {
        const hasValidCoords =
          listing.coordinates && listing.coordinates.lat && listing.coordinates.lng
        return hasValidCoords
      })

      // Filter out listings without photos
      const listingsWithPhotos = listingsWithCoordinates.filter((listing) => {
        return listing.images && listing.images.length > 0
      })

      setAllListings(listingsWithPhotos)
      setLoadedCount(0)

      logger.debug('SearchPage: State updated with', listingsWithPhotos.length, 'listings')
    } catch (err) {
      logger.error('Failed to fetch listings:', err)
      setError(
        'We had trouble loading listings. Please try refreshing the page or adjusting your filters.'
      )
    } finally {
      setIsLoading(false)
      fetchInProgressRef.current = false
    }
  }, [
    boroughs,
    selectedBoroughs,
    selectedNeighborhoods,
    weekPattern,
    priceTier,
    sortBy,
    transformListing
  ])

  // ============================================================================
  // Fallback Listings Logic (MOVED FROM SearchPage.jsx)
  // ============================================================================

  /**
   * Fetch all listings with basic constraints only (for fallback display when filtered results are empty).
   * Infrastructure layer - Supabase query with minimal filtering.
   */
  const fetchFallbackListings = useCallback(async () => {
    setIsFallbackLoading(true)

    try {
      // Build query with ONLY basic constraints - no borough, neighborhood, price, or week pattern filters
      const query = supabase
        .from('listing')
        .select('*')
        .eq('"Complete"', true)
        .or('"Active".eq.true,"Active".is.null')
        .or('"Location - Address".not.is.null,"Location - slightly different address".not.is.null')
        .not('"Features - Photos"', 'is', null)
        .order('"Modified Date"', { ascending: false })

      const { data, error } = await query

      if (error) throw error

      logger.debug('Fallback query returned', data.length, 'listings')

      // Collect legacy photo IDs (strings) for batch fetch
      // New format has embedded objects with URLs, no fetch needed
      const legacyPhotoIds = new Set()
      data.forEach(listing => {
        const photosField = listing['Features - Photos']
        let photos = []

        if (Array.isArray(photosField)) {
          photos = photosField
        } else if (typeof photosField === 'string') {
          try {
            photos = JSON.parse(photosField)
          } catch (e) {
            // Ignore parse errors
          }
        }

        // Only collect string IDs (legacy format), not objects (new format)
        if (Array.isArray(photos)) {
          photos.forEach(photo => {
            if (typeof photo === 'string') {
              legacyPhotoIds.add(photo)
            }
          })
        }
      })

      // Only fetch from listing_photo table if there are legacy photo IDs
      const photoMap = legacyPhotoIds.size > 0
        ? await fetchPhotoUrls(Array.from(legacyPhotoIds))
        : {}

      // Extract photos per listing (handles both embedded objects and legacy IDs)
      const resolvedPhotos = {}
      data.forEach(listing => {
        resolvedPhotos[listing._id] = extractPhotos(
          listing['Features - Photos'],
          photoMap,
          listing._id
        )
      })

      // Batch fetch host data for all listings
      const hostIds = new Set()
      data.forEach(listing => {
        if (listing['Host User']) {
          hostIds.add(listing['Host User'])
        }
      })

      const hostMap = await fetchHostData(Array.from(hostIds))

      // Map host data to listings
      const resolvedHosts = {}
      data.forEach(listing => {
        const hostId = listing['Host User']
        resolvedHosts[listing._id] = hostMap[hostId] || null
      })

      // Transform listings
      const transformedListings = data.map(listing =>
        transformListing(listing, resolvedPhotos[listing._id], resolvedHosts[listing._id])
      )

      // Filter out listings without valid coordinates
      const listingsWithCoordinates = transformedListings.filter(listing => {
        return listing.coordinates && listing.coordinates.lat && listing.coordinates.lng
      })

      // Filter out listings without photos
      const listingsWithPhotos = listingsWithCoordinates.filter(listing => {
        return listing.images && listing.images.length > 0
      })

      logger.debug('Fallback listings ready:', listingsWithPhotos.length)

      setFallbackListings(listingsWithPhotos)
      setFallbackLoadedCount(0)
    } catch (err) {
      logger.error('Failed to fetch fallback listings:', err)
      // Don't set error state - this is a fallback, so we just show nothing
      setFallbackListings([])
      // Mark that fetch failed to prevent infinite retry loop
      setFallbackFetchFailed(true)
    } finally {
      setIsFallbackLoading(false)
    }
  }, [transformListing])

  // ============================================================================
  // Effects - Data Loading
  // ============================================================================

  // Initialize data lookups on mount
  useEffect(() => {
    const init = async () => {
      if (!isInitialized()) {
        logger.debug('Initializing data lookups...')
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
          .schema('reference_table')
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

        // Validate boroughs from URL exist (remove invalid ones)
        if (selectedBoroughs.length > 0) {
          const validBoroughs = selectedBoroughs.filter(value =>
            boroughList.some(b => b.value === value)
          )
          if (validBoroughs.length !== selectedBoroughs.length) {
            logger.warn('Some boroughs from URL not found, filtering to valid ones')
            setSelectedBoroughs(validBoroughs)
          }
        }
        // Empty selectedBoroughs is valid - means "all boroughs"
      } catch (err) {
        logger.error('Failed to load boroughs:', err)
      }
    }

    loadBoroughs()
  }, [])

  // Load neighborhoods when selected boroughs change
  useEffect(() => {
    const loadNeighborhoods = async () => {
      if (boroughs.length === 0) return

      try {
        let query = supabase
          .schema('reference_table')
          .from('zat_geo_hood_mediumlevel')
          .select('_id, Display, "Geo-Borough"')
          .order('Display', { ascending: true })

        // If boroughs are selected, filter neighborhoods to those boroughs
        // If no boroughs selected (all boroughs), load all neighborhoods
        if (selectedBoroughs.length > 0) {
          const selectedBoroughIds = selectedBoroughs
            .map(value => boroughs.find(b => b.value === value)?.id)
            .filter(Boolean)
          if (selectedBoroughIds.length > 0) {
            query = query.in('"Geo-Borough"', selectedBoroughIds)
          }
        }

        const { data, error } = await query

        if (error) throw error

        const neighborhoodList = data
          .filter((n) => n.Display && n.Display.trim())
          .map((n) => ({
            id: n._id,
            name: n.Display.trim(),
            boroughId: n['Geo-Borough']
          }))

        setNeighborhoods(neighborhoodList)

        // Clear neighborhood selections that are no longer valid for the selected boroughs
        if (selectedNeighborhoods.length > 0) {
          const validNeighborhoodIds = new Set(neighborhoodList.map(n => n.id))
          const stillValidNeighborhoods = selectedNeighborhoods.filter(id => validNeighborhoodIds.has(id))
          if (stillValidNeighborhoods.length !== selectedNeighborhoods.length) {
            setSelectedNeighborhoods(stillValidNeighborhoods)
          }
        }
      } catch (err) {
        logger.error('Failed to load neighborhoods:', err)
      }
    }

    loadNeighborhoods()
  }, [selectedBoroughs, boroughs])

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

  // ============================================================================
  // Fallback Listings Effects (MOVED FROM SearchPage.jsx)
  // ============================================================================

  // Fetch fallback listings when filtered results are empty
  useEffect(() => {
    // Don't retry if fetch already failed (prevents infinite loop)
    if (!isLoading && allListings.length === 0 && fallbackListings.length === 0 && !isFallbackLoading && !fallbackFetchFailed) {
      fetchFallbackListings()
    }
  }, [isLoading, allListings.length, fallbackListings.length, isFallbackLoading, fallbackFetchFailed, fetchFallbackListings])

  // Clear fallback listings when filtered results are found
  useEffect(() => {
    if (allListings.length > 0 && fallbackListings.length > 0) {
      setFallbackListings([])
      setFallbackDisplayedListings([])
      setFallbackLoadedCount(0)
    }
  }, [allListings.length, fallbackListings.length])

  // Lazy load fallback listings
  useEffect(() => {
    if (fallbackListings.length === 0) {
      setFallbackDisplayedListings([])
      return
    }

    const initialCount = LISTING_CONFIG.INITIAL_LOAD_COUNT
    setFallbackDisplayedListings(fallbackListings.slice(0, initialCount))
    setFallbackLoadedCount(initialCount)
  }, [fallbackListings])

  // Sync filter state to URL parameters
  useEffect(() => {
    // Skip URL update on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    const filters = {
      selectedBoroughs,
      weekPattern,
      priceTier,
      sortBy,
      selectedNeighborhoods
    }

    updateUrlParams(filters, false)
  }, [selectedBoroughs, weekPattern, priceTier, sortBy, selectedNeighborhoods])

  // Watch for browser back/forward navigation
  useEffect(() => {
    const cleanup = watchUrlChanges((newFilters) => {
      logger.debug('URL changed via browser navigation, updating filters:', newFilters)

      setSelectedBoroughs(newFilters.selectedBoroughs)
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

  // Fallback listings load more handler
  const handleFallbackLoadMore = useCallback(() => {
    const batchSize = LISTING_CONFIG.LOAD_BATCH_SIZE
    const nextCount = Math.min(fallbackLoadedCount + batchSize, fallbackListings.length)
    setFallbackDisplayedListings(fallbackListings.slice(0, nextCount))
    setFallbackLoadedCount(nextCount)
  }, [fallbackLoadedCount, fallbackListings])

  const handleResetFilters = useCallback(() => {
    setSelectedBoroughs([]) // Empty = all boroughs
    setSelectedNeighborhoods([])
    setWeekPattern('every-week')
    setPriceTier('all')
    setSortBy('recommended')
    setNeighborhoodSearch('')
  }, [])

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
  const hasFallbackMore = fallbackLoadedCount < fallbackListings.length

  const filteredNeighborhoods = useMemo(() => {
    const filtered = neighborhoods.filter((n) => {
      const sanitizedSearch = sanitizeNeighborhoodSearch(neighborhoodSearch)
      return n.name.toLowerCase().includes(sanitizedSearch.toLowerCase())
    })
    return filtered
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

    // Fallback Listings (when filters return no results)
    fallbackListings,
    fallbackDisplayedListings,
    isFallbackLoading,
    hasFallbackMore,
    handleFallbackLoadMore,

    // Geography Data
    boroughs,
    neighborhoods: filteredNeighborhoods,

    // Filter State
    selectedBoroughs,
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
    setSelectedBoroughs,
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
    handleCloseAIResearchModal,

    // Utility Functions (exported for consumers)
    transformListing
  }
}
