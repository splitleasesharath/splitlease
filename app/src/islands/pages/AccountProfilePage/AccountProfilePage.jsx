/**
 * AccountProfilePage.jsx
 *
 * Main page component for the Account Profile dual-view system.
 * Following the Hollow Component Pattern - delegates ALL logic to useAccountProfilePageLogic hook.
 *
 * Views:
 * - Editor View: User viewing/editing their own profile
 * - Public View: User viewing someone else's profile (read-only)
 */

import React, { useState } from 'react';
import Header from '../../shared/Header.jsx';
import Footer from '../../shared/Footer.jsx';
import { ToastProvider } from '../../shared/Toast.jsx';
import NotificationSettingsModal from '../../modals/NotificationSettingsModal.jsx';
import EditPhoneNumberModal from '../../modals/EditPhoneNumberModal.jsx';
import { useAccountProfilePageLogic } from './useAccountProfilePageLogic.js';
import ProfileSidebar from './components/ProfileSidebar.jsx';
import EditorView from './components/EditorView.jsx';
import PublicView from './components/PublicView.jsx';
import FixedSaveBar from './components/shared/FixedSaveBar.jsx';
import ReferralBanner from './components/ReferralBanner.jsx';
import ReferralModal from './components/ReferralModal.jsx';
import RentalApplicationWizardModal from '../../shared/RentalApplicationWizardModal/RentalApplicationWizardModal.jsx';
import './AccountProfilePage.css';

// ============================================================================
// LOADING STATE
// ============================================================================

function LoadingState() {
  return (
    <div className="profile-loading">
      <span>Loading profile...</span>
    </div>
  );
}

// ============================================================================
// ERROR STATE
// ============================================================================

function ErrorState({ error }) {
  return (
    <div className="profile-error">
      <svg className="profile-error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <h2 className="profile-error-title">Unable to load profile</h2>
      <p className="profile-error-message">{error}</p>
      <button
        className="save-bar-btn save-bar-btn--preview"
        onClick={() => window.location.href = '/'}
      >
        Go to Home
      </button>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AccountProfilePage() {
  const logic = useAccountProfilePageLogic();
  const [showReferralModal, setShowReferralModal] = useState(false);

  // Show loading state
  if (logic.loading) {
    return (
      <ToastProvider>
        <div className="account-profile-page">
          <Header />
          <LoadingState />
          <Footer />
        </div>
      </ToastProvider>
    );
  }

  // Show error state
  if (logic.error) {
    return (
      <ToastProvider>
        <div className="account-profile-page">
          <Header />
          <ErrorState error={logic.error} />
          <Footer />
        </div>
      </ToastProvider>
    );
  }

  // Sidebar props based on view mode
  // Database columns use 'Name - First', 'Name - Last' naming convention
  const sidebarProps = {
    isEditorView: logic.isEditorView,
    coverPhotoUrl: logic.profileData?.['Cover Photo'] || null,
    avatarUrl: logic.profileData?.['Profile Photo'] || null,
    firstName: logic.formData.firstName || logic.profileData?.['Name - First'] || '',
    lastName: logic.formData.lastName || logic.profileData?.['Name - Last'] || '',
    jobTitle: logic.displayJobTitle,
    profileStrength: logic.profileStrength,
    verifications: logic.verifications,
    nextActions: logic.nextActions,
    onCoverPhotoChange: logic.handleCoverPhotoChange,
    onAvatarChange: logic.handleAvatarChange,
    // Public view specific
    responseTime: logic.profileData?.['Response Time'] || 'Within 24 hours',
    responseRate: logic.profileData?.['Response Rate'] || 95,
    memberSince: logic.profileData?.['Created Date'] || logic.profileData?.['_created_date']
  };

  return (
    <ToastProvider>
      <div className="account-profile-page">
        <Header />

        <main className="account-profile-container">
          {/* Sidebar */}
          <ProfileSidebar {...sidebarProps} />

          {/* Main Feed */}
          <div className="account-profile-feed">
            {/* Referral Banner - shown only in Editor View (user viewing own profile) */}
            {logic.isEditorView && (
              <ReferralBanner
                onInviteClick={() => setShowReferralModal(true)}
                userType={logic.isHostUser ? 'host' : 'guest'}
              />
            )}

            {logic.isEditorView ? (
              <EditorView
                formData={logic.formData}
                formErrors={logic.formErrors}
                profileData={logic.profileData}
                verifications={logic.verifications}
                goodGuestReasonsList={logic.goodGuestReasonsList}
                storageItemsList={logic.storageItemsList}
                transportationOptions={logic.transportationOptions}
                onFieldChange={logic.handleFieldChange}
                onDayToggle={logic.handleDayToggle}
                onChipToggle={logic.handleChipToggle}
                onVerifyEmail={logic.handleVerifyEmail}
                onVerifyPhone={logic.handleVerifyPhone}
                onVerifyGovId={logic.handleVerifyGovId}
                onConnectLinkedIn={logic.handleConnectLinkedIn}
                onEditPhone={logic.handleEditPhone}
                onOpenNotificationSettings={logic.handleOpenNotificationSettings}
                onChangePassword={logic.handleChangePassword}
                // Host-specific props
                isHostUser={logic.isHostUser}
                hostListings={logic.hostListings}
                loadingListings={logic.loadingListings}
                onListingClick={logic.handleListingClick}
                onCreateListing={logic.handleCreateListing}
                // Rental application props (guest-only)
                rentalApplicationStatus={logic.rentalApplicationStatus}
                rentalApplicationProgress={logic.rentalApplicationProgress}
                onOpenRentalWizard={logic.handleOpenRentalWizard}
              />
            ) : (
              <PublicView
                profileData={logic.profileData}
                verifications={logic.verifications}
                goodGuestReasonsList={logic.goodGuestReasonsList}
                storageItemsList={logic.storageItemsList}
                // Host-specific props
                isHostUser={logic.isHostUser}
                hostListings={logic.hostListings}
                onListingClick={logic.handleListingClick}
              />
            )}
          </div>
        </main>

        {/* Fixed Save Bar (Editor View or Preview Mode for own profile) */}
        {(logic.isEditorView || logic.previewMode) && (
          <FixedSaveBar
            onPreview={logic.handlePreviewProfile}
            onSave={logic.handleSave}
            saving={logic.saving}
            disabled={!logic.isDirty}
            previewMode={logic.previewMode}
          />
        )}

        {/* Modals */}
        <NotificationSettingsModal
          isOpen={logic.showNotificationModal}
          userId={logic.profileUserId}
          onClose={logic.handleCloseNotificationModal}
        />

        <EditPhoneNumberModal
          isOpen={logic.showPhoneEditModal}
          currentPhoneNumber={logic.profileData?.['Phone Number (as text)'] || ''}
          onSave={async (newPhone) => {
            // Phone save is handled by the modal
            logic.handleClosePhoneEditModal();
          }}
          onClose={logic.handleClosePhoneEditModal}
        />

        <ReferralModal
          isOpen={showReferralModal}
          onClose={() => setShowReferralModal(false)}
          referralCode={logic.profileData?.['Referral Code'] || logic.profileUserId || 'user'}
          stats={{
            friendsReferred: logic.profileData?.['Friends Referred'] || 0,
            rewardsClaimed: logic.profileData?.['Rewards Claimed'] || 0,
            totalRewards: logic.profileData?.['Total Rewards'] || 0
          }}
          userType={logic.isHostUser ? 'host' : 'guest'}
          referrerName={logic.profileData?.['Name - First'] || logic.profileData?.firstName || ''}
        />

        {/* Rental Application Wizard (Guest-only) */}
        {!logic.isHostUser && (
          <RentalApplicationWizardModal
            isOpen={logic.showRentalWizardModal}
            onClose={logic.handleCloseRentalWizard}
            onSuccess={logic.handleRentalWizardSuccess}
            applicationStatus={logic.rentalApplicationStatus}
            userProfileData={{
              email: logic.profileData?.email || logic.profileData?.['Email'] || '',
              firstName: logic.profileData?.['Name - First'] || '',
              lastName: logic.profileData?.['Name - Last'] || '',
              phone: logic.profileData?.['Phone Number (as text)'] || '',
              dob: logic.profileData?.['Date of Birth'] || '',
            }}
          />
        )}

        <Footer />
      </div>
    </ToastProvider>
  );
}
