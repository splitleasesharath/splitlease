/**
 * EditorView.jsx
 *
 * Editor mode wrapper that renders all editable profile cards.
 * Shown when user is viewing their own profile.
 */

import React from 'react';
import BasicInfoCard from './cards/BasicInfoCard.jsx';
import AboutCard from './cards/AboutCard.jsx';
import RequirementsCard from './cards/RequirementsCard.jsx';
import ScheduleCommuteCard from './cards/ScheduleCommuteCard.jsx';
import TrustVerificationCard from './cards/TrustVerificationCard.jsx';
import ReasonsCard from './cards/ReasonsCard.jsx';
import StorageItemsCard from './cards/StorageItemsCard.jsx';
import VideoIntroCard from './cards/VideoIntroCard.jsx';
import AccountSettingsCard from './cards/AccountSettingsCard.jsx';
import ListingsCard from './cards/ListingsCard.jsx';
import RentalApplicationCard from './RentalApplicationCard.jsx';

export default function EditorView({
  formData,
  formErrors,
  profileData,
  verifications,
  goodGuestReasonsList,
  storageItemsList,
  transportationOptions,
  showDateOfBirthField = false,
  onFieldChange,
  onDayToggle,
  onChipToggle,
  onVerifyEmail,
  onVerifyPhone,
  onVerifyGovId,
  onConnectLinkedIn,
  onEditPhone,
  onOpenNotificationSettings,
  onChangePassword,
  // Host-specific props
  isHostUser = false,
  hostListings = [],
  loadingListings = false,
  onListingClick,
  onCreateListing,
  // Rental application props (guest-only)
  rentalApplicationStatus = 'not_started',
  rentalApplicationProgress = 0,
  onOpenRentalWizard
}) {
  return (
    <>
      {/* Basic Information - Always shown */}
      <BasicInfoCard
        firstName={formData.firstName}
        lastName={formData.lastName}
        jobTitle={formData.jobTitle}
        dateOfBirth={formData.dateOfBirth}
        showDateOfBirthField={showDateOfBirthField}
        errors={formErrors}
        onFieldChange={onFieldChange}
      />

      {/* About You - Always shown */}
      <AboutCard
        bio={formData.bio}
        onFieldChange={onFieldChange}
      />

      {/* Guest-only: Why Split Lease? */}
      {!isHostUser && (
        <RequirementsCard
          needForSpace={formData.needForSpace}
          specialNeeds={formData.specialNeeds}
          onFieldChange={onFieldChange}
        />
      )}

      {/* Guest-only: Schedule & Commute */}
      {!isHostUser && (
        <ScheduleCommuteCard
          selectedDays={formData.selectedDays}
          transportationType={formData.transportationType}
          transportationOptions={transportationOptions}
          onDayToggle={onDayToggle}
          onFieldChange={onFieldChange}
        />
      )}

      {/* Trust & Verification - Always shown */}
      <TrustVerificationCard
        verifications={verifications}
        onVerifyEmail={onVerifyEmail}
        onVerifyPhone={onVerifyPhone}
        onVerifyGovId={onVerifyGovId}
        onConnectLinkedIn={onConnectLinkedIn}
        onEditPhone={onEditPhone}
      />

      {/* Guest-only: Reasons to Host Me */}
      {!isHostUser && (
        <ReasonsCard
          selectedReasons={formData.goodGuestReasons}
          reasonsList={goodGuestReasonsList}
          onChipToggle={onChipToggle}
        />
      )}

      {/* Guest-only: Storage Items */}
      {!isHostUser && (
        <StorageItemsCard
          selectedItems={formData.storageItems}
          itemsList={storageItemsList}
          onChipToggle={onChipToggle}
        />
      )}

      {/* Host-only: My Listings */}
      {isHostUser && (
        <ListingsCard
          listings={hostListings}
          loading={loadingListings}
          onListingClick={onListingClick}
          onCreateListing={onCreateListing}
        />
      )}

      {/* Video Introduction - Always shown */}
      <VideoIntroCard
        videoUrl={profileData?.['Video Intro URL'] || null}
        onUpload={() => console.log('Video upload clicked')}
      />

      {/* Guest-only: Rental Application */}
      {!isHostUser && (
        <div id="rental-application-section">
          <RentalApplicationCard
            applicationStatus={rentalApplicationStatus}
            progress={rentalApplicationProgress}
            onOpenWizard={onOpenRentalWizard}
          />
        </div>
      )}

      {/* Account Settings - Always shown */}
      <AccountSettingsCard
        onOpenNotificationSettings={onOpenNotificationSettings}
        onChangePassword={onChangePassword}
      />
    </>
  );
}
