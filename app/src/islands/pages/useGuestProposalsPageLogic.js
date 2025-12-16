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
 *
 * NO FALLBACK MECHANISMS - Direct database queries, authentic data only
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase.js'
import { getAuthToken, getSessionId } from '../../lib/auth.js'
import {
  fetchUserById,
  fetchProposalsByGuest,
  loadProposalDetails as loadProposalDetailsUtil
} from '../../lib/proposalDataFetcher.js'

// Logic Core imports - Rules
import {
  determineProposalStage,
  canEditProposal,
  canCancelProposal,
  canAcceptProposal,
  canModifyProposal,
  hasReviewableCounteroffer,
  canSubmitRentalApplication,
  canRequestVirtualMeeting,
  getCancelButtonText as getCancelBtnText,
  VM_STATES,
  getVMStateInfo,
  useProposalButtonStates
} from '../../logic/index.js'

// Logic Core imports - Workflows
import {
  loadProposalDetailsWorkflow,
  cancelProposalWorkflow,
  acceptProposalWorkflow,
  executeCancelProposal,
  requestVirtualMeeting,
  requestAlternativeMeeting,
  respondToVirtualMeeting,
  declineVirtualMeeting,
  cancelVirtualMeetingRequest,
  acceptCounteroffer as acceptCounterOfferWorkflow,
  declineCounteroffer as declineCounterOfferWorkflow,
  getTermsComparison,
  navigateToListing as navToListing,
  navigateToMessaging as navToMessaging,
  navigateToRentalApplication as navToRentalApp,
  navigateToDocumentReview as navToDocReview,
  navigateToLeaseDocuments as navToLeases,
  updateUrlWithProposal,
  getProposalIdFromUrl
} from '../../logic/index.js'

// Logic Core imports - Processors
import {
  processProposalData,
  processUserData,
  getProposalDisplayText,
  formatPrice,
  formatDate,
  processFullProposalData
} from '../../logic/index.js'

// Constants
import { getStatusConfig, getStageFromStatus } from '../../lib/constants/proposalStatuses.js'

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
  const [showCancelProposalModal, setShowCancelProposalModal] = useState(false)

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

      // Get authentication token
      const token = getAuthToken()
      console.log('🔑 Auth token present:', !!token)

      // Get user ID from logged-in session (same pattern as account-profile)
      const userId = getSessionId()

      if (!userId) {
        throw new Error(
          'You must be logged in to view your proposals. Please sign in.'
        )
      }

      console.log('👤 Loading user and proposals for logged-in user ID:', userId)

      // Fetch user data from Supabase
      const userData = await fetchUserById(userId)

      if (!userData) {
        throw new Error('Unable to load your profile. Please try logging in again.')
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
   * Load complete details for a specific proposal.
   * Uses the utility function to fetch enriched data, then attempts to process
   * it through Logic Core processors.
   *
   * The returned proposal preserves BOTH raw and processed data:
   * - Raw fields: Directly from Supabase (e.g., 'Status', 'Created Date')
   * - Processed fields: Via Logic Core (e.g., 'status', 'createdDate')
   */
  async function loadProposalDetails(proposal) {
    try {
      console.log('🔍 Loading details for proposal:', proposal._id)

      // Step 1: Use utility function to fetch enriched data
      const enrichedProposal = await loadProposalDetailsUtil(proposal)

      // Step 2: Try to process through Logic Core (non-blocking)
      // This adds normalized fields alongside raw fields
      let processedProposal = enrichedProposal

      try {
        // Process the proposal data for normalized access
        const processed = processProposalData({
          rawProposal: enrichedProposal,
          listing: enrichedProposal._listing,
          guest: enrichedProposal._guest,
          host: enrichedProposal._host
        })

        // Merge processed data with raw data (raw takes precedence for compatibility)
        processedProposal = {
          ...processed, // Processed (normalized) fields
          ...enrichedProposal, // Raw fields (preserve original structure)
          // Explicitly map processed fields for components that need them
          id: processed.id,
          status: processed.status,
          hasCounteroffer: processed.hasCounteroffer,
          currentTerms: processed.currentTerms,
          originalTerms: processed.originalTerms
        }
      } catch (processErr) {
        // Processing failed - use raw data only (non-critical error)
        console.warn('⚠️ Logic Core processing skipped:', processErr.message)
        console.log('📋 Using raw proposal data')
      }

      setSelectedProposal(processedProposal)
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
   * Cancel Proposal - Opens the cancel modal.
   * The actual cancellation happens in handleConfirmCancelProposal.
   */
  function handleCancelProposal() {
    if (!selectedProposal) return
    setShowCancelProposalModal(true)
  }

  /**
   * Close cancel proposal modal
   */
  function closeCancelProposalModal() {
    setShowCancelProposalModal(false)
  }

  /**
   * Confirm Cancel Proposal using Logic Core workflow.
   * Called when user confirms cancellation in the modal.
   * Implements complex decision tree (7 variations).
   *
   * @param {string} reason - Cancellation reason from the modal
   */
  async function handleConfirmCancelProposal(reason = '') {
    if (!selectedProposal) return

    try {
      // Prepare proposal object for Logic Core workflow
      // The workflow expects specific field names
      const proposalForWorkflow = {
        id: selectedProposal._id || selectedProposal.id,
        status: getProposalStatus(),
        deleted: getDeletedStatus(),
        usualOrder: selectedProposal.usualOrder || 0,
        houseManualAccessed: selectedProposal['Did user access house manual?'] || selectedProposal.houseManualAccessed || false
      }

      // Use Logic Core workflow for cancellation
      const result = await cancelProposalWorkflow({
        supabase,
        proposal: proposalForWorkflow,
        source: 'main',
        canCancelProposal,
        reason
      })

      if (result.success) {
        if (result.updated) {
          console.log('✅ Proposal cancelled successfully')
          setShowCancelProposalModal(false)
          alert(result.message)
          // Reload proposals list
          await initializePage()
        } else if (result.requiresPhoneCall) {
          // Show alert to call
          setShowCancelProposalModal(false)
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
      // Prepare proposal object for Logic Core workflow
      const proposalForWorkflow = {
        id: selectedProposal._id || selectedProposal.id,
        status: getProposalStatus(),
        deleted: getDeletedStatus()
      }

      // Use Logic Core workflow for acceptance
      const result = await acceptProposalWorkflow({
        supabase,
        proposal: proposalForWorkflow,
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
   * Get proposal status from either processed or raw field.
   * Handles both 'status' (processed) and 'Status' (raw) field names.
   */
  function getProposalStatus() {
    if (!selectedProposal) return null
    return selectedProposal.status || selectedProposal.Status
  }

  /**
   * Get deleted status from either processed or raw field.
   */
  function getDeletedStatus() {
    if (!selectedProposal) return false
    return selectedProposal.deleted === true || selectedProposal.Deleted === true
  }

  /**
   * Get current proposal stage (1-6) using Logic Core rule.
   */
  function getCurrentStage() {
    const status = getProposalStatus()
    if (!status) return 1

    try {
      return determineProposalStage({
        proposalStatus: status,
        deleted: getDeletedStatus()
      })
    } catch (err) {
      console.warn('⚠️ Error determining proposal stage:', err.message)
      return 1
    }
  }

  /**
   * Check if guest can edit proposal using Logic Core rule.
   */
  function getCanEdit() {
    const status = getProposalStatus()
    if (!status) return false

    try {
      return canEditProposal({
        proposalStatus: status,
        deleted: getDeletedStatus()
      })
    } catch (err) {
      console.warn('⚠️ Error checking canEdit:', err.message)
      return false
    }
  }

  /**
   * Check if guest can cancel proposal using Logic Core rule.
   */
  function getCanCancel() {
    const status = getProposalStatus()
    if (!status) return false

    try {
      return canCancelProposal({
        proposalStatus: status,
        deleted: getDeletedStatus()
      })
    } catch (err) {
      console.warn('⚠️ Error checking canCancel:', err.message)
      return false
    }
  }

  /**
   * Check if guest can accept proposal using Logic Core rule.
   */
  function getCanAccept() {
    const status = getProposalStatus()
    if (!status) return false

    try {
      return canAcceptProposal({
        proposalStatus: status,
        deleted: getDeletedStatus()
      })
    } catch (err) {
      console.warn('⚠️ Error checking canAccept:', err.message)
      return false
    }
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
  // Navigation Handlers
  // ============================================================================

  /**
   * Navigate to full listing details page
   */
  function handleViewListing() {
    if (!selectedProposal?._listing) return

    const listingName = selectedProposal._listing.Name || 'listing'
    const listingSlug = listingName.toLowerCase().replace(/\s+/g, '-')
    window.location.href = `/listing/${listingSlug}?id=${selectedProposal._listing._id}`
  }

  /**
   * Open map modal showing listing location
   */
  function handleViewMap() {
    openMapModal()
  }

  /**
   * Open host profile modal with verification status
   */
  function handleViewHostProfile() {
    openHostProfileModal()
  }

  /**
   * Navigate to messaging page with host pre-selected
   */
  function handleSendMessage() {
    if (!selectedProposal?._host) return

    window.location.href = `/messaging?user=${selectedProposal._host._id}`
  }

  /**
   * Open modify/edit proposal modal
   */
  function handleModifyProposal() {
    openEditProposalModal()
  }

  /**
   * Open compare terms modal to review counteroffer
   */
  function handleReviewCounteroffer() {
    openCompareTermsModal()
  }

  /**
   * Navigate to rental application form
   */
  function handleSubmitRentalApplication() {
    if (!selectedProposal) return

    window.location.href = `/rental-app-new-design?proposal=${selectedProposal._id || selectedProposal.id}`
  }

  /**
   * Navigate to document review page
   */
  function handleReviewDocuments() {
    if (!selectedProposal) return

    window.location.href = `/documents?proposal=${selectedProposal._id || selectedProposal.id}`
  }

  /**
   * Navigate to leases page (for completed proposals)
   */
  function handleGoToLeases() {
    window.location.href = '/leases'
  }

  /**
   * Open proposal details modal with pricing breakdown
   */
  function handleSeeDetails() {
    openProposalDetailsModal()
  }

  /**
   * Request Virtual Meeting - Opens modal with appropriate view based on VM state
   * 5-state workflow:
   * 1. Empty VM → 'request' view
   * 2. Pending request from other party → 'respond' view
   * 3. Meeting booked & confirmed → 'details' view
   * 4. Meeting declined → 'alternative' view
   * 5. User wants to cancel → 'cancel' view
   */
  function handleRequestVirtualMeeting() {
    if (!selectedProposal) return

    const vm = selectedProposal._virtualMeeting
    const currentUserId = currentUser?._id || currentUser?.id

    // Determine which view to show based on VM state
    let view = 'request' // Default

    if (!vm) {
      // No VM exists → Request view
      view = 'request'
    } else if (vm['meeting declined']) {
      // Meeting was declined → Alternative request view
      view = 'alternative'
    } else if (vm['confirmedBySplitLease']) {
      // Meeting confirmed → Details view
      view = 'details'
    } else if (vm['booked date'] && !vm['meeting declined']) {
      // Meeting booked but not confirmed yet
      if (vm['requested by'] === currentUserId) {
        view = 'details'
      } else {
        view = 'respond'
      }
    } else if (vm['requested by'] && vm['requested by'] !== currentUserId) {
      // Pending request from other party → Respond view
      view = 'respond'
    }

    openVirtualMeetingModal(view)
  }

  /**
   * Handler for after VM modal success - reloads proposal details
   */
  async function handleVirtualMeetingSuccess() {
    closeVirtualMeetingModal()
    if (selectedProposal) {
      await loadProposalDetails(selectedProposal)
    }
  }

  /**
   * Handler for after edit modal success - reloads proposal details
   */
  async function handleEditProposalSuccess() {
    closeEditProposalModal()
    if (selectedProposal) {
      await loadProposalDetails(selectedProposal)
    }
  }

  /**
   * Handler for accepting counteroffer from compare modal
   */
  async function handleAcceptCounteroffer() {
    closeCompareTermsModal()
    if (selectedProposal) {
      await loadProposalDetails(selectedProposal)
    }
  }

  // ============================================================================
  // Browser History Handling
  // ============================================================================

  useEffect(() => {
    function handlePopState() {
      const urlParams = new URLSearchParams(window.location.search)
      const proposalId = urlParams.get('proposal')

      if (proposalId && proposals.length > 0) {
        const proposal = proposals.find((p) => p._id === proposalId)
        if (proposal && proposal._id !== (selectedProposal?._id || selectedProposal?.id)) {
          loadProposalDetails(proposal)
        }
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [proposals, selectedProposal])

  // ============================================================================
  // Computed Values (from Logic Core)
  // ============================================================================

  // Use logic core rules to derive computed state
  const statusConfig = selectedProposal ? getStatusConfig(getProposalStatus()) : null
  const canSubmitApp = selectedProposal ? canSubmitRentalApplication(selectedProposal) : false
  const canRequestVM = selectedProposal ? canRequestVirtualMeeting(selectedProposal) : false
  const canModify = getCanEdit()

  // Virtual meeting state info
  const vmStateInfo = selectedProposal?._virtualMeeting
    ? getVMStateInfo(selectedProposal._virtualMeeting, currentUser?._id || currentUser?.id)
    : { state: VM_STATES.NO_MEETING, showButton: true, buttonText: 'Request Virtual Meeting', buttonDisabled: false }

  // Terms comparison for counteroffer
  const termsComparison = selectedProposal?.['counter offer happened']
    ? getTermsComparison(selectedProposal)
    : null

  // Cancel button text
  const cancelButtonText = selectedProposal ? getCancelBtnText(selectedProposal) : 'Cancel Proposal'

  // Button states from new hook (maps Bubble conditionals)
  const buttonStates = useProposalButtonStates({
    proposal: selectedProposal,
    virtualMeeting: selectedProposal?._virtualMeeting,
    guest: selectedProposal?._guest || currentUser,
    listing: selectedProposal?._listing,
    currentUserId: currentUser?._id || currentUser?.id,
  })

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
    statusConfig,
    canEdit: getCanEdit(),
    canCancel: getCanCancel(),
    canAccept: getCanAccept(),
    canSubmitApp,
    canRequestVM,
    canModify,
    vmStateInfo,
    termsComparison,
    cancelButtonText,
    buttonStates,

    // Proposal selection
    handleProposalChange,

    // Action handlers - Proposal Management
    handleDeleteProposal,
    handleCancelProposal,
    handleAcceptProposal,
    handleModifyProposal,
    handleReviewCounteroffer,

    // Action handlers - Navigation
    handleViewListing,
    handleViewMap,
    handleViewHostProfile,
    handleSendMessage,
    handleSubmitRentalApplication,
    handleReviewDocuments,
    handleGoToLeases,
    handleSeeDetails,
    handleRequestVirtualMeeting,

    // Modal state - Host Profile
    showHostProfileModal,
    openHostProfileModal,
    closeHostProfileModal,

    // Modal state - Map
    showMapModal,
    openMapModal,
    closeMapModal,

    // Modal state - Virtual Meeting
    showVirtualMeetingModal,
    vmModalView,
    openVirtualMeetingModal,
    closeVirtualMeetingModal,
    handleVirtualMeetingSuccess,

    // Modal state - Compare Terms
    showCompareTermsModal,
    openCompareTermsModal,
    closeCompareTermsModal,
    handleAcceptCounteroffer,

    // Modal state - Edit Proposal
    showEditProposalModal,
    openEditProposalModal,
    closeEditProposalModal,
    handleEditProposalSuccess,

    // Modal state - Proposal Details
    showProposalDetailsModal,
    openProposalDetailsModal,
    closeProposalDetailsModal,

    // Modal state - Cancel Proposal
    showCancelProposalModal,
    closeCancelProposalModal,
    handleConfirmCancelProposal,

    // Utilities (from Logic Core)
    formatPrice,
    formatDate,
    getProposalDisplayText,

    // Refresh function
    refreshProposals: initializePage
  }
}
