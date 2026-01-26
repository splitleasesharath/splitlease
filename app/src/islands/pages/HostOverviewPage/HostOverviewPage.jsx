/**
 * Host Overview Page - HOLLOW COMPONENT PATTERN
 *
 * This is the central dashboard for property hosts to manage their:
 * - Listings (owned/managed properties)
 * - Listings to claim (unclaimed listings)
 * - House manuals (documentation for guests)
 * - Virtual meetings (scheduled video calls with guests)
 *
 * Architecture:
 * - NO business logic in this file
 * - ALL state and handlers come from useHostOverviewPageLogic hook
 * - ONLY renders UI based on pre-calculated state
 */

import Header from '../../shared/Header.jsx';
import Footer from '../../shared/Footer.jsx';
import CreateDuplicateListingModal from '../../shared/CreateDuplicateListingModal/CreateDuplicateListingModal.jsx';
import ImportListingModal from '../../shared/ImportListingModal/ImportListingModal.jsx';
import ConfirmDeleteModal from '../../shared/ConfirmDeleteModal/ConfirmDeleteModal.jsx';
import ScheduleCohost from '../../shared/ScheduleCohost/ScheduleCohost.jsx';

// Local components
import { ListingCard, ClaimListingCard, HouseManualCard, VirtualMeetingCard } from './components/HostOverviewCards.jsx';
import { ToastContainer } from './components/HostOverviewToast.jsx';
import { Button } from './components/HostOverviewButton.jsx';

// Logic Hook
import { useHostOverviewPageLogic } from './useHostOverviewPageLogic.js';

// Styles
import './HostOverviewPage.css';

export default function HostOverviewPage({ requireAuth = false, isAuthenticated = true }) {
  // ============================================================================
  // LOGIC HOOK - Provides all state and handlers
  // ============================================================================

  const {
    // Core data
    user,
    listingsToClaim,
    myListings,
    houseManuals,
    virtualMeetings,
    loading,
    error,

    // UI State
    showHelpBanner,
    setShowHelpBanner,
    toasts,
    removeToast,

    // Modal state
    showDeleteConfirm,
    itemToDelete,
    deleteType,
    showCreateListingModal,
    showImportListingModal,
    importListingLoading,
    showScheduleCohost,

    // Action handlers
    handleCreateNewListing,
    handleCloseCreateListingModal,
    handleImportListing,
    handleCloseImportListingModal,
    handleImportListingSubmit,
    handleScheduleCohost,
    handleCloseScheduleCohost,
    handleCohostRequestSubmitted,
    handleCreateNewManual,
    handleEditListing,
    handlePreviewListing,
    handleViewProposals,
    handleListingCardClick,
    handleSeeDetails,
    handleEditManual,
    handleViewVisits,
    handleDeleteClick,
    handleConfirmDelete,
    handleCancelDelete,
    handleRespondToVirtualMeeting
  } = useHostOverviewPageLogic();

  // ============================================================================
  // RENDER - Loading State
  // ============================================================================

  if (loading) {
    return (
      <div className="host-overview-page-wrapper">
        <Header autoShowLogin={requireAuth && !isAuthenticated} />
        <main className="host-overview-main">
          <div className="host-overview-container">
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading your dashboard...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ============================================================================
  // RENDER - Error State
  // ============================================================================

  if (error) {
    return (
      <div className="host-overview-page-wrapper">
        <Header autoShowLogin={requireAuth && !isAuthenticated} />
        <main className="host-overview-main">
          <div className="host-overview-container">
            <div className="error-state">
              <div className="error-icon">&#9888;</div>
              <h2>Unable to Load Dashboard</h2>
              <p className="error-message">{error}</p>
              <button onClick={() => window.location.reload()} className="btn btn--primary">
                Reload Page
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ============================================================================
  // RENDER - Main Page
  // ============================================================================

  return (
    <div className="host-overview-page-wrapper">
      <Header autoShowLogin={requireAuth && !isAuthenticated} />

      <main className="host-overview-main">
        <div className="host-overview-container">
          {/* Welcome Section */}
          <section className="welcome-section">
            <h1 className="welcome-title">Welcome back, {user?.firstName || 'Host'}</h1>

            {showHelpBanner && (
              <div className="help-banner">
                <button
                  className="help-banner__content"
                  onClick={handleScheduleCohost}
                  type="button"
                >
                  <span className="help-banner__icon">
                    {/* Feather lightbulb icon - monochromatic per popup redesign protocol */}
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="9" y1="18" x2="15" y2="18"></line>
                      <line x1="10" y1="22" x2="14" y2="22"></line>
                      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"></path>
                    </svg>
                  </span>
                  <p className="help-banner__text">
                    Need help setting up? Ask a Specialist Co-host!
                  </p>
                </button>
                <button
                  className="help-banner__close"
                  onClick={() => setShowHelpBanner(false)}
                  aria-label="Dismiss help banner"
                >
                  {/* Feather x icon - monochromatic per popup redesign protocol */}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            )}

            <div className="action-buttons">
              <Button variant="primary" onClick={handleCreateNewListing}>
                + Create New Listing
              </Button>
              <Button variant="secondary" onClick={handleImportListing}>
                Import Listing
              </Button>
            </div>
          </section>

          {/* Listings to Claim Section */}
          {listingsToClaim.length > 0 && (
            <section className="page-section">
              <h2 className="section-heading">Listings to Claim</h2>
              <div className="listings-grid">
                {listingsToClaim.map(listing => (
                  <ClaimListingCard
                    key={listing.id || listing._id}
                    listing={listing}
                    onSeeDetails={handleSeeDetails}
                    onDelete={() => handleDeleteClick(listing, 'claim')}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Your Listings Section */}
          <section className="page-section">
            <h2 className="section-heading">Your Listings</h2>
            {myListings.length === 0 ? (
              <div className="empty-state">
                <p>You don't have any listings yet.</p>
                <Button variant="primary" onClick={handleCreateNewListing}>
                  Create Your First Listing
                </Button>
              </div>
            ) : (
              <div className="listings-grid">
                {myListings.map(listing => (
                  <ListingCard
                    key={listing.id || listing._id}
                    listing={listing}
                    onEdit={handleEditListing}
                    onPreview={handlePreviewListing}
                    onProposals={handleViewProposals}
                    onCardClick={handleListingCardClick}
                    onDelete={() => handleDeleteClick(listing, 'listing')}
                    onCreateHouseManual={handleCreateNewManual}
                  />
                ))}
              </div>
            )}
          </section>

          {/* House Manuals Section */}
          <section className="page-section">
            <div className="section-header">
              <h2 className="section-heading">House Manuals</h2>
              <Button variant="primary" onClick={handleCreateNewManual}>
                + Create New Manual
              </Button>
            </div>
            {houseManuals.length === 0 ? (
              <div className="empty-state">
                <p>You don't have any house manuals yet.</p>
              </div>
            ) : (
              <div className="manuals-grid">
                {houseManuals.map(manual => (
                  <HouseManualCard
                    key={manual.id || manual._id}
                    manual={manual}
                    onEdit={handleEditManual}
                    onDelete={() => handleDeleteClick(manual, 'manual')}
                    onViewVisits={handleViewVisits}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Virtual Meetings Section */}
          {virtualMeetings.length > 0 && (
            <section className="page-section">
              <h2 className="section-heading">Virtual Meetings</h2>
              <div className="meetings-grid">
                {virtualMeetings.map(meeting => (
                  <VirtualMeetingCard
                    key={meeting.id || meeting._id}
                    meeting={meeting}
                    onRespond={handleRespondToVirtualMeeting}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={showDeleteConfirm}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title={`Delete ${deleteType === 'manual' ? 'House Manual' : deleteType === 'claim' ? 'Claim' : 'Listing'}`}
        itemName={itemToDelete?.name || itemToDelete?.Name || itemToDelete?.display || itemToDelete?.Display || ''}
        warning={deleteType === 'listing' ? 'Deleting a listing with active leases may affect your guests.' : ''}
        confirmText="Delete"
        cancelText="Cancel"
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Create Listing Modal - redirects to self-listing (v1) page */}
      <CreateDuplicateListingModal
        isVisible={showCreateListingModal}
        onClose={handleCloseCreateListingModal}
        currentUser={user}
        existingListings={myListings}
      />

      {/* Import Listing Modal */}
      <ImportListingModal
        isOpen={showImportListingModal}
        onClose={handleCloseImportListingModal}
        onSubmit={handleImportListingSubmit}
        currentUserEmail={user?.email || ''}
        isLoading={importListingLoading}
      />

      {/* Schedule Cohost Modal */}
      {showScheduleCohost && (
        <ScheduleCohost
          userId={user?.userId || user?.id}
          userEmail={user?.email}
          userName={`${user?.firstName || ''} ${user?.lastName || ''}`.trim()}
          onRequestSubmitted={handleCohostRequestSubmitted}
          onClose={handleCloseScheduleCohost}
        />
      )}
    </div>
  );
}
