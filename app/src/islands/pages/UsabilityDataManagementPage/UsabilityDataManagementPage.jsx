/**
 * UsabilityDataManagementPage
 *
 * Hollow Component - contains NO logic, delegates everything to hook.
 * Internal admin tool for managing usability test data.
 */

import React from 'react';
import { useUsabilityDataManagementPageLogic } from './useUsabilityDataManagementPageLogic';
import HostDataSection from './components/HostDataSection';
import GuestDataSection from './components/GuestDataSection';
import ProposalCreationSection from './components/ProposalCreationSection';
import ProposalDeletionSection from './components/ProposalDeletionSection';
import ProposalConfirmationModal from './components/ProposalConfirmationModal';
import AlertOverlay from './components/AlertOverlay';

export default function UsabilityDataManagementPage() {
  const logic = useUsabilityDataManagementPageLogic();

  // Loading state
  if (logic.authLoading) {
    return (
      <div className="usability-page-container">
        <div className="loading-container">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Auth error state
  if (logic.authError || !logic.isAuthenticated || !logic.isAuthorized) {
    return (
      <div className="usability-page-container">
        <div className="auth-error-container">
          <h1>Access Denied</h1>
          <p>{logic.authError || 'Admin or corporate access required.'}</p>
          <a href="/" className="btn btn-purple">Return to Home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="usability-page-container">
      <h1 className="page-title">Usability Test Data Deletion &amp; Creation</h1>

      {/* Section 1: Delete Host Account Data */}
      <HostDataSection
        hosts={logic.hosts}
        hostsLoading={logic.hostsLoading}
        selectedHost={logic.selectedHost}
        hostActionLoading={logic.hostActionLoading}
        onHostSelection={logic.handleHostSelection}
        onClearHostData={logic.handleClearHostData}
        onDeleteHostListings={logic.handleDeleteHostListings}
        onDeleteHostTestStatus={logic.handleDeleteHostTestStatus}
      />

      {/* Section 2: Delete Guest Account Data */}
      <GuestDataSection
        guests={logic.guests}
        guestsLoading={logic.guestsLoading}
        selectedGuest={logic.selectedGuest}
        guestActionLoading={logic.guestActionLoading}
        onGuestSelection={logic.handleGuestSelection}
        onClearGuestData={logic.handleClearGuestData}
        onDeleteGuestTestStatus={logic.handleDeleteGuestTestStatus}
      />

      {/* Section 3: Quick Proposal Creation */}
      <ProposalCreationSection
        // Listing
        listingIdInput={logic.listingIdInput}
        onListingIdChange={logic.setListingIdInput}
        selectedListing={logic.selectedListing}
        listingLoading={logic.listingLoading}
        onLoadListing={logic.handleLoadListing}
        // Guest
        guests={logic.guests}
        selectedProposalGuest={logic.selectedProposalGuest}
        onProposalGuestSelection={logic.handleProposalGuestSelection}
        // Date
        moveInDate={logic.moveInDate}
        onMoveInDateChange={logic.setMoveInDate}
        // Days
        dayLabels={logic.dayLabels}
        selectedDayIndices={logic.selectedDayIndices}
        onDayToggle={logic.handleDayToggle}
        onSelectFullTime={logic.handleSelectFullTime}
        // Reservation
        reservationSpans={logic.reservationSpans}
        reservationWeeks={logic.reservationWeeks}
        onReservationWeeksChange={logic.setReservationWeeks}
        // Pricing
        pricing={logic.pricing}
        dayPattern={logic.dayPattern}
        // Metadata
        recentProposalId={logic.recentProposalId}
        recentThreadId={logic.recentThreadId}
        // Actions
        onCreateProposal={logic.handleOpenProposalModal}
      />

      {/* Section 4: Proposal Deletion */}
      <ProposalDeletionSection
        proposalIdInput={logic.deleteProposalIdInput}
        onProposalIdChange={logic.setDeleteProposalIdInput}
        loading={logic.deleteProposalLoading}
        onDelete={logic.handleDeleteProposal}
      />

      {/* Proposal Confirmation Modal */}
      {logic.showProposalModal && (
        <ProposalConfirmationModal
          listing={logic.selectedListing}
          guest={logic.selectedProposalGuest}
          moveInDate={logic.moveInDate}
          selectedDayIndices={logic.selectedDayIndices}
          reservationWeeks={logic.reservationWeeks}
          pricing={logic.pricing}
          notes={logic.proposalNotes}
          onNotesChange={logic.setProposalNotes}
          loading={logic.proposalLoading}
          onConfirm={logic.handleConfirmProposal}
          onCancel={logic.handleCloseProposalModal}
        />
      )}

      {/* Alert Overlay */}
      {logic.alert && (
        <AlertOverlay
          title={logic.alert.title}
          content={logic.alert.content}
          onClose={logic.closeAlert}
        />
      )}
    </div>
  );
}
