/**
 * GuestProposalsPage Logic Hook
 *
 * Orchestrates all business logic for the GuestProposalsPage component following the
 * "Hollow Component" pattern. This hook manages React state and effects while
 * delegating all business logic to Logic Core functions.
 *
 * @intent Provide pre-calculated data and handlers to GuestProposalsPage component.
 * @pattern Logic Hook (orchestration layer between Component and Logic Core).
 *
 * Architecture:
 * - React state management (hooks, effects)
 * - Calls Logic Core workflows for proposal operations
 * - Calls Logic Core processors for data transformation
 * - Calls Logic Core rules for business validation
 * - Infrastructure layer (Supabase queries, data fetching)
 * - Returns pre-processed data to component
 */

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'
import { getAuthToken } from '../../lib/auth.js'
import { getUserIdFromUrl, fetchUserById, fetchProposalsByGuest } from '../../lib/proposalDataFetcher.js'

// Logic Core imports
import {
  loadProposalDetailsWorkflow,
  cancelProposalWorkflow,
  acceptProposalWorkflow,
  processProposalData,
  processUserData,
  determineProposalStage,
  canEditProposal,
  canCancelProposal,
  canAcceptProposal
} from '../../logic/index.js'

/**
 * Main GuestProposalsPage logic hook.
 *
 * @returns {object} Pre-calculated state and handlers for GuestProposalsPage component.
 */
export function useGuestProposalsPageLogic() {
  // ============================================================================
  // State Management
  // ============================================================================

  // Core data
  const [proposals, setProposals] = useState([])
  const [selectedProposal, setSelectedProposal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)

  // Modal visibility states
  const [showHostProfileModal, setShowHostProfileModal] = useState(false)
  const [showMapModal, setShowMapModal] = useState(false)
  const [showVirtualMeetingModal, setShowVirtualMeetingModal] = useState(false)
  const [vmModalView, setVmModalView] = useState('request') // VM 5-state workflow
  const [showCompareTermsModal, setShowCompareTermsModal] = useState(false)
  const [showEditProposalModal, setShowEditProposalModal] = useState(false)
  const [showProposalDetailsModal, setShowProposalDetailsModal] = useState(false)

  // ============================================================================
  // Initialization - Load user and proposals
  // ============================================================================

  useEffect(() => {
    initializePage()
  }, [])

  async function initializePage() {
    try {
      setLoading(true)
      setError(null)

      // Get authentication token (optional for now during testing)
      const token = getAuthToken()
      console.log('🔑 Auth token present:', !!token)

      // Extract user ID from URL path
      const userId = getUserIdFromUrl()

      if (!userId) {
        throw new Error(
          'No user ID provided in URL. Please access this page via /guest-proposals/[userId]'
        )
      }

      console.log('👤 Loading user and proposals for user ID:', userId)

      // Fetch user data from Supabase
      const userData = await fetchUserById(userId)

      if (!userData) {
        throw new Error('User not found. Please check the user ID in the URL.')
      }

      // Process user data through Logic Core
      const processedUser = processUserData({ rawUser: userData })
      setCurrentUser(processedUser)
      console.log('✅ User loaded:', processedUser.fullName)

      // Fetch all proposals for this user (where they are the guest)
      const proposalsData = await fetchProposalsByGuest(userId)

      console.log(`✅ Loaded ${proposalsData.length} proposals`)
      setProposals(proposalsData)

      // Implement loading strategy
      if (proposalsData.length > 0) {
        const urlParams = new URLSearchParams(window.location.search)
        const proposalIdFromURL = urlParams.get('proposal')

        let proposalToLoad

        if (proposalIdFromURL) {
          // Strategy 1: URL parameter
          proposalToLoad = proposalsData.find((p) => p._id === proposalIdFromURL)
          if (!proposalToLoad) {
            console.warn('⚠️ Proposal from URL not found, using first proposal')
            proposalToLoad = proposalsData[0]
          }
        } else {
          // Strategy 3: First proposal (strategy 2 dropdown handled by user interaction)
          proposalToLoad = proposalsData[0]
        }

        await loadProposalDetails(proposalToLoad)
      }
    } catch (err) {
      console.error('❌ Error initializing page:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Load complete details for a specific proposal using Logic Core workflow.
   * Uses loadProposalDetailsWorkflow to orchestrate fetching and processing.
   */
  async function loadProposalDetails(proposal) {
    try {
      console.log('🔍 Loading details for proposal:', proposal._id)

      // Use Logic Core workflow to load and process proposal
      const enrichedProposal = await loadProposalDetailsWorkflow({
        supabase,
        rawProposal: proposal,
        processProposalData,
        processUserData,
        processListingData: null // We don't have listing processor yet, can add later
      })

      setSelectedProposal(enrichedProposal)
      console.log('✅ Proposal details loaded successfully')
    } catch (err) {
      console.error('❌ Error loading proposal details:', err)
    }
  }

  /**
   * Handle proposal selection from dropdown.
   * Updates URL and loads new proposal details.
   */
  async function handleProposalChange(proposalId) {
    const proposal = proposals.find((p) => p._id === proposalId)
    if (!proposal) return

    // Update URL (Strategy 1: URL parameter)
    const url = new URL(window.location)
    url.searchParams.set('proposal', proposalId)
    window.history.pushState({}, '', url)

    // Load proposal details
    await loadProposalDetails(proposal)
  }

  // ============================================================================
  // Action Handlers - Proposal Management
  // ============================================================================

  /**
   * Delete Proposal (soft delete).
   * Sets Deleted = true instead of hard delete.
   */
  async function handleDeleteProposal() {
    if (!selectedProposal) return

    const confirmed = window.confirm(
      'Are you sure you want to delete this proposal? This action cannot be undone.'
    )

    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('proposal')
        .update({
          Deleted: true,
          'Modified Date': new Date().toISOString()
        })
        .eq('_id', selectedProposal.id)

      if (error) throw error

      console.log('✅ Proposal deleted successfully')
      alert('Proposal deleted successfully')

      // Reload proposals list
      await initializePage()
    } catch (err) {
      console.error('❌ Error deleting proposal:', err)
      alert('Failed to delete proposal. Please try again.')
    }
  }

  /**
   * Cancel Proposal using Logic Core workflow.
   * Implements complex decision tree (7 variations).
   *
   * @param {string} source - 'main' | 'compare-modal' | 'other'
   */
  async function handleCancelProposal(source = 'main') {
    if (!selectedProposal) return

    const confirmed = window.confirm(
      'Are you sure you want to cancel this proposal? This may affect your booking.'
    )

    if (!confirmed) return

    try {
      // Use Logic Core workflow for cancellation
      const result = await cancelProposalWorkflow({
        supabase,
        proposal: selectedProposal,
        source,
        canCancelProposal
      })

      if (result.success) {
        if (result.updated) {
          console.log('✅ Proposal cancelled successfully')
          alert(result.message)
          // Reload proposals list
          await initializePage()
        } else if (result.requiresPhoneCall) {
          // Show alert to call
          alert(result.message)
        }
      } else {
        alert(result.message)
      }
    } catch (err) {
      console.error('❌ Error cancelling proposal:', err)
      alert('Failed to cancel proposal. Please try again.')
    }
  }

  /**
   * Accept Proposal (Host's counteroffer) using Logic Core workflow.
   */
  async function handleAcceptProposal() {
    if (!selectedProposal) return

    const confirmed = window.confirm(
      'Are you sure you want to accept this proposal? The host will be notified.'
    )

    if (!confirmed) return

    try {
      // Use Logic Core workflow for acceptance
      const result = await acceptProposalWorkflow({
        supabase,
        proposal: selectedProposal,
        canAcceptProposal
      })

      if (result.success) {
        console.log('✅ Proposal accepted successfully')
        alert(result.message)
        // Reload proposals list
        await initializePage()
      } else {
        alert(result.message)
      }
    } catch (err) {
      console.error('❌ Error accepting proposal:', err)
      alert('Failed to accept proposal. Please try again.')
    }
  }

  // ============================================================================
  // Business Logic - Computed Values using Logic Core
  // ============================================================================

  /**
   * Get current proposal stage (1-6) using Logic Core rule.
   */
  function getCurrentStage() {
    if (!selectedProposal) return 1

    return determineProposalStage({
      proposalStatus: selectedProposal.status,
      deleted: selectedProposal.deleted
    })
  }

  /**
   * Check if guest can edit proposal using Logic Core rule.
   */
  function getCanEdit() {
    if (!selectedProposal) return false

    return canEditProposal({
      proposalStatus: selectedProposal.status,
      deleted: selectedProposal.deleted
    })
  }

  /**
   * Check if guest can cancel proposal using Logic Core rule.
   */
  function getCanCancel() {
    if (!selectedProposal) return false

    return canCancelProposal({
      proposalStatus: selectedProposal.status,
      deleted: selectedProposal.deleted
    })
  }

  /**
   * Check if guest can accept proposal using Logic Core rule.
   */
  function getCanAccept() {
    if (!selectedProposal) return false

    return canAcceptProposal({
      proposalStatus: selectedProposal.status,
      deleted: selectedProposal.deleted
    })
  }

  // ============================================================================
  // Modal Handlers
  // ============================================================================

  function openHostProfileModal() {
    setShowHostProfileModal(true)
  }

  function closeHostProfileModal() {
    setShowHostProfileModal(false)
  }

  function openMapModal() {
    setShowMapModal(true)
  }

  function closeMapModal() {
    setShowMapModal(false)
  }

  function openVirtualMeetingModal(view = 'request') {
    setVmModalView(view)
    setShowVirtualMeetingModal(true)
  }

  function closeVirtualMeetingModal() {
    setShowVirtualMeetingModal(false)
  }

  function openCompareTermsModal() {
    setShowCompareTermsModal(true)
  }

  function closeCompareTermsModal() {
    setShowCompareTermsModal(false)
  }

  function openEditProposalModal() {
    setShowEditProposalModal(true)
  }

  function closeEditProposalModal() {
    setShowEditProposalModal(false)
  }

  function openProposalDetailsModal() {
    setShowProposalDetailsModal(true)
  }

  function closeProposalDetailsModal() {
    setShowProposalDetailsModal(false)
  }

  // ============================================================================
  // Return Hook API
  // ============================================================================

  return {
    // Core data
    proposals,
    selectedProposal,
    loading,
    error,
    currentUser,

    // Computed values (using Logic Core)
    currentStage: getCurrentStage(),
    canEdit: getCanEdit(),
    canCancel: getCanCancel(),
    canAccept: getCanAccept(),

    // Actions
    handleProposalChange,
    handleDeleteProposal,
    handleCancelProposal,
    handleAcceptProposal,

    // Modal state
    showHostProfileModal,
    openHostProfileModal,
    closeHostProfileModal,

    showMapModal,
    openMapModal,
    closeMapModal,

    showVirtualMeetingModal,
    vmModalView,
    openVirtualMeetingModal,
    closeVirtualMeetingModal,

    showCompareTermsModal,
    openCompareTermsModal,
    closeCompareTermsModal,

    showEditProposalModal,
    openEditProposalModal,
    closeEditProposalModal,

    showProposalDetailsModal,
    openProposalDetailsModal,
    closeProposalDetailsModal
  }
}
