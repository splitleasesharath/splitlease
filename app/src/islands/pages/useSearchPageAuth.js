/**
 * SearchPage Auth Hook
 *
 * Manages all authentication-related state and logic for SearchPage.
 * Follows the "Hollow Component" pattern - orchestrates auth state while
 * delegating to existing auth utilities.
 *
 * @intent Provide pre-calculated auth data and handlers to SearchPage component.
 * @pattern Logic Hook (orchestration layer for auth concerns).
 *
 * SECURITY NOTES:
 * - All user IDs derived from JWT via useAuthenticatedUser()
 * - Never reads user ID from payload or localStorage for sensitive operations
 * - Favorites use user table JSONB field (server-validated)
 *
 * MOVED FROM SearchPage.jsx - consolidates all auth state (~380 lines)
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase.js'
import { logger } from '../../lib/logger.js'
import { getUserId, getFirstName, getAvatarUrl } from '../../lib/auth.js'
import { getUserType as getStoredUserType, getAuthState } from '../../lib/secureStorage.js'
import { useAuthenticatedUser } from '../../hooks/useAuthenticatedUser.js'
import { fetchProposalsByGuest, fetchLastProposalDefaults } from '../../lib/proposalDataFetcher.js'
import { fetchZatPriceConfiguration } from '../../lib/listingDataFetcher.js'
import { isGuest } from '../../logic/rules/users/isGuest.js'

/**
 * Auth hook for SearchPage.
 *
 * @returns {Object} Auth state and handlers for SearchPage component.
 */
export function useSearchPageAuth() {
  // GOLD STANDARD AUTH PATTERN - JWT-based authentication
  const {
    user: authenticatedUser,
    userId: authUserId,
    loading: authLoading,
    isAuthenticated
  } = useAuthenticatedUser()

  // ============================================================================
  // Optimistic Auth State (prevents flash of logged-out UI)
  // ============================================================================

  const cachedFirstName = getFirstName()
  const cachedAvatarUrl = getAvatarUrl()
  const cachedUserType = getStoredUserType()
  const hasCachedAuth = !!(cachedFirstName && getAuthState())

  const [isLoggedIn, setIsLoggedIn] = useState(hasCachedAuth)
  const [currentUser, setCurrentUser] = useState(() => {
    if (hasCachedAuth) {
      return {
        id: getUserId(),
        name: cachedFirstName,
        email: '',
        userType: cachedUserType || 'GUEST',
        avatarUrl: cachedAvatarUrl || null,
        proposalCount: 0,
        _isOptimistic: true // Flag for optimistic data
      }
    }
    return null
  })

  // ============================================================================
  // Favorites State
  // ============================================================================

  const [favoritesCount, setFavoritesCount] = useState(0)
  const [favoritedListingIds, setFavoritedListingIds] = useState(new Set())

  // ============================================================================
  // Proposals State
  // ============================================================================

  const [proposalsByListingId, setProposalsByListingId] = useState(new Map())

  // ============================================================================
  // Proposal Flow State
  // ============================================================================

  const [zatConfig, setZatConfig] = useState(null)
  const [loggedInUserData, setLoggedInUserData] = useState(null)
  const [lastProposalDefaults, setLastProposalDefaults] = useState(null)
  const [reservationSpanForProposal, setReservationSpanForProposal] = useState(13)
  const [pendingProposalData, setPendingProposalData] = useState(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successProposalId, setSuccessProposalId] = useState(null)
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false)
  const [showAuthModalForProposal, setShowAuthModalForProposal] = useState(false)

  // ============================================================================
  // Effects: Initialize ZAT Config
  // ============================================================================

  useEffect(() => {
    const loadZatConfig = async () => {
      try {
        const config = await fetchZatPriceConfiguration()
        setZatConfig(config)
      } catch (error) {
        logger.warn('[useSearchPageAuth] Failed to load ZAT config:', error)
      }
    }
    loadZatConfig()
  }, [])

  // ============================================================================
  // Effects: Auth State Sync
  // ============================================================================

  useEffect(() => {
    const syncAuthState = async () => {
      try {
        if (authLoading) return

        setIsLoggedIn(isAuthenticated)

        if (!isAuthenticated || !authUserId) {
          setCurrentUser(null)
          setFavoritesCount(0)
          setFavoritedListingIds(new Set())
          setProposalsByListingId(new Map())
          return
        }

        // Set user from hook
        setCurrentUser(authenticatedUser)

        // Parallel fetch: profile + junction counts
        const [userResult, countsResult] = await Promise.all([
          supabase
            .from('user')
            .select('"About Me / Bio", "need for Space", "special needs", "Favorited Listings"')
            .eq('_id', authUserId)
            .single(),
          supabase.rpc('get_user_junction_counts', { p_user_id: authUserId })
        ])

        const userRecord = userResult.data
        const error = userResult.error

        // Process favorites from JSONB field
        const favorites = userRecord?.['Favorited Listings'] || []
        if (Array.isArray(favorites) && favorites.length > 0) {
          // Validate Bubble ID format (digits + 'x' + digits)
          const validFavorites = favorites.filter(
            id => typeof id === 'string' && /^\d+x\d+$/.test(id)
          )
          setFavoritedListingIds(new Set(validFavorites))
          setFavoritesCount(validFavorites.length)
        } else {
          setFavoritesCount(0)
          setFavoritedListingIds(new Set())
        }

        // Process proposal count from junction RPC
        const junctionCounts = countsResult.data?.[0] || {}
        const proposalCount = Number(junctionCounts.proposals_count) || 0

        if (!error && userRecord) {
          setCurrentUser(prev => ({
            ...prev,
            proposalCount,
            _isOptimistic: false
          }))

          setLoggedInUserData({
            userId: authUserId,
            aboutMe: userRecord['About Me / Bio'] || '',
            needForSpace: userRecord['need for Space'] || '',
            specialNeeds: userRecord['special needs'] || '',
            proposalCount
          })

          // Fetch last proposal defaults for form pre-fill
          const proposalDefaults = await fetchLastProposalDefaults(authUserId)
          if (proposalDefaults) {
            setLastProposalDefaults(proposalDefaults)
          }

          // Fetch user's existing proposals
          const userIsGuest = isGuest({ userType: authenticatedUser.userType })
          if (userIsGuest && proposalCount > 0) {
            try {
              const proposals = await fetchProposalsByGuest(authUserId)
              const proposalsMap = new Map()
              proposals.forEach(proposal => {
                const listingId = proposal.Listing
                if (listingId && !proposalsMap.has(listingId)) {
                  proposalsMap.set(listingId, proposal)
                }
              })
              setProposalsByListingId(proposalsMap)
            } catch (err) {
              logger.warn('[useSearchPageAuth] Failed to fetch proposals:', err)
            }
          }
        }

      } catch (error) {
        logger.error('[useSearchPageAuth] Auth sync error:', error)
        setIsLoggedIn(false)
        setCurrentUser(null)
      }
    }

    syncAuthState()
  }, [authLoading, isAuthenticated, authUserId, authenticatedUser])

  // ============================================================================
  // Handlers: Favorite Toggle
  // ============================================================================

  const handleToggleFavorite = useCallback((listingId, listingTitle, newState) => {
    logger.debug('[useSearchPageAuth] handleToggleFavorite called:', {
      listingId,
      listingTitle,
      newState
    })

    // Update the local set to keep heart icon state in sync
    const newFavoritedIds = new Set(favoritedListingIds)
    if (newState) {
      newFavoritedIds.add(listingId)
    } else {
      newFavoritedIds.delete(listingId)
    }
    setFavoritedListingIds(newFavoritedIds)
    // Update count to match the set size
    setFavoritesCount(newFavoritedIds.size)

    return { success: true, isFavorited: newState }
  }, [favoritedListingIds])

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // Core Auth
    isLoggedIn,
    currentUser,
    authLoading,
    authUserId,
    isAuthenticated,
    authenticatedUser,

    // Favorites
    favoritesCount,
    favoritedListingIds,
    handleToggleFavorite,
    setFavoritesCount,
    setFavoritedListingIds,

    // Proposals
    proposalsByListingId,
    setProposalsByListingId,
    zatConfig,
    loggedInUserData,
    setLoggedInUserData,
    lastProposalDefaults,
    reservationSpanForProposal,
    setReservationSpanForProposal,

    // Proposal Flow
    pendingProposalData,
    setPendingProposalData,
    showSuccessModal,
    setShowSuccessModal,
    successProposalId,
    setSuccessProposalId,
    isSubmittingProposal,
    setIsSubmittingProposal,
    showAuthModalForProposal,
    setShowAuthModalForProposal
  }
}
