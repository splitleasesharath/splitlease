/**
 * Guest Proposals Page - HOLLOW COMPONENT PATTERN
 *
 * This is a pure visual component that delegates ALL business logic to useGuestProposalsPageLogic hook.
 * The component only handles:
 * - Rendering UI based on pre-calculated state from the hook
 * - Calling handlers provided by the hook
 *
 * Architecture (per Refactoring Architecture for Logic Core.md):
 * - NO business logic in this file (no calculations, no state derivation)
 * - NO direct database calls
 * - NO URL parsing or data transformation
 * - ONLY receives pre-processed data and pre-bound handlers from the hook
 *
 * Database Tables Used (via hook):
 * - proposal: Main proposal data with original + hc (host-changed/counteroffer) fields
 * - virtualmeetingschedulesandlinks: Virtual meeting data
 * - user: User profile and verification data
 * - listing: Property details, location, amenities
 * - zat_features_houserule: House rules
 */

// Shared components
import Header from '../shared/Header.jsx'
import Footer from '../shared/Footer.jsx'

// Proposal components
import ProposalSelector from '../proposals/ProposalSelector.jsx'
import ProposalCard from '../proposals/ProposalCard.jsx'
import ProgressTracker from '../proposals/ProgressTracker.jsx'
import EmptyState from '../proposals/EmptyState.jsx'

// Modals
import HostProfileModal from '../modals/HostProfileModal.jsx'
import MapModal from '../modals/MapModal.jsx'
import VirtualMeetingModal from '../modals/VirtualMeetingModal.jsx'
import CompareTermsModal from '../modals/CompareTermsModal.jsx'
import EditProposalModal from '../modals/EditProposalModal.jsx'
import ProposalDetailsModal from '../modals/ProposalDetailsModal.jsx'

// Logic Hook - ALL business logic lives here
import { useGuestProposalsPageLogic } from './useGuestProposalsPageLogic.js'

export default function GuestProposalsPage({ requireAuth = false, isAuthenticated = true }) {
  // ============================================================================
  // LOGIC HOOK - Provides all state and handlers
  // ============================================================================

  const {
    // Core data
    proposals,
    selectedProposal,
    loading,
    error,
    currentUser,

    // Computed values (from Logic Core)
    currentStage,
    canEdit,
    canCancel,
    canAccept,

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
    closeHostProfileModal,

    // Modal state - Map
    showMapModal,
    closeMapModal,

    // Modal state - Virtual Meeting
    showVirtualMeetingModal,
    vmModalView,
    closeVirtualMeetingModal,
    handleVirtualMeetingSuccess,

    // Modal state - Compare Terms
    showCompareTermsModal,
    closeCompareTermsModal,
    handleAcceptCounteroffer,

    // Modal state - Edit Proposal
    showEditProposalModal,
    closeEditProposalModal,
    handleEditProposalSuccess,

    // Modal state - Proposal Details
    showProposalDetailsModal,
    closeProposalDetailsModal
  } = useGuestProposalsPageLogic()

  // ============================================================================
  // RENDER - Loading State
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mb-4"></div>
          <p className="text-lg text-gray-700 font-medium">Loading your proposals...</p>
        </div>
      </div>
    )
  }

  // ============================================================================
  // RENDER - Error State
  // ============================================================================

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-4">
          <div className="text-6xl mb-4">&#9888;&#65039;</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Unable to Load Proposals</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    )
  }

  // ============================================================================
  // RENDER - Main Page
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50">
      <Header autoShowLogin={requireAuth && !isAuthenticated} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Empty State: No proposals */}
        {proposals.length === 0 && <EmptyState />}

        {/* Proposals exist */}
        {proposals.length > 0 && (
          <>
            {/* Proposal Selector */}
            <ProposalSelector
              proposals={proposals}
              selectedProposal={selectedProposal}
              onProposalChange={handleProposalChange}
            />

            {/* Selected Proposal Display */}
            {selectedProposal && (
              <div className="mt-6">
                <ProposalCard
                  proposal={selectedProposal}
                  onViewListing={handleViewListing}
                  onViewMap={handleViewMap}
                  onViewHostProfile={handleViewHostProfile}
                  onSendMessage={handleSendMessage}
                  onDeleteProposal={handleDeleteProposal}
                  onCancelProposal={handleCancelProposal}
                  onModifyProposal={handleModifyProposal}
                  onReviewCounteroffer={handleReviewCounteroffer}
                  onRequestVirtualMeeting={handleRequestVirtualMeeting}
                  onSubmitRentalApplication={handleSubmitRentalApplication}
                  onReviewDocuments={handleReviewDocuments}
                  onGoToLeases={handleGoToLeases}
                  onSeeDetails={handleSeeDetails}
                />

                {/* Progress Tracker */}
                <div className="mt-8">
                  <ProgressTracker
                    status={selectedProposal.Status || selectedProposal.status}
                    proposalId={selectedProposal._id || selectedProposal.id}
                    createdDate={selectedProposal['Created Date'] || selectedProposal.createdDate}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />

      {/* ====================================================================
          MODALS - All controlled by hook state
          ==================================================================== */}

      {/* Host Profile Modal */}
      {showHostProfileModal && selectedProposal?._host && (
        <HostProfileModal
          host={selectedProposal._host}
          listing={selectedProposal._listing}
          onClose={closeHostProfileModal}
        />
      )}

      {/* Map Modal */}
      {showMapModal && selectedProposal?._listing && (
        <MapModal
          listing={selectedProposal._listing}
          address={selectedProposal._listing['Location - Address']}
          onClose={closeMapModal}
        />
      )}

      {/* Virtual Meeting Modal - 5-state workflow */}
      {showVirtualMeetingModal && selectedProposal && (
        <VirtualMeetingModal
          proposal={selectedProposal}
          virtualMeeting={selectedProposal._virtualMeeting}
          currentUser={currentUser}
          view={vmModalView}
          onClose={closeVirtualMeetingModal}
          onSuccess={handleVirtualMeetingSuccess}
        />
      )}

      {/* Compare Terms Modal (Counteroffer) */}
      {showCompareTermsModal &&
        selectedProposal &&
        (selectedProposal['counter offer happened'] || selectedProposal.hasCounteroffer) && (
          <CompareTermsModal
            proposal={selectedProposal}
            onClose={closeCompareTermsModal}
            onAcceptCounteroffer={handleAcceptCounteroffer}
          />
        )}

      {/* Edit Proposal Modal */}
      {showEditProposalModal && selectedProposal && (
        <EditProposalModal
          proposal={selectedProposal}
          listing={selectedProposal._listing}
          onClose={closeEditProposalModal}
          onSuccess={handleEditProposalSuccess}
        />
      )}

      {/* Proposal Details Modal */}
      {showProposalDetailsModal && selectedProposal && (
        <ProposalDetailsModal
          proposal={selectedProposal}
          listing={selectedProposal._listing}
          onClose={closeProposalDetailsModal}
        />
      )}
    </div>
  )
}
