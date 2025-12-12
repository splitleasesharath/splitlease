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

export default function EditorView({
  formData,
  formErrors,
  profileData,
  verifications,
  goodGuestReasonsList,
  storageItemsList,
  transportationOptions,
  onFieldChange,
  onDayToggle,
  onChipToggle,
  onVerifyEmail,
  onVerifyPhone,
  onVerifyGovId,
  onConnectLinkedIn,
  onEditPhone,
  onOpenNotificationSettings,
  onChangePassword
}) {
  return (
    <>
      {/* Basic Information */}
      <BasicInfoCard
        firstName={formData.firstName}
        lastName={formData.lastName}
        jobTitle={formData.jobTitle}
        errors={formErrors}
        onFieldChange={onFieldChange}
      />

      {/* About You */}
      <AboutCard
        bio={formData.bio}
        onFieldChange={onFieldChange}
      />

      {/* Why Split Lease? */}
      <RequirementsCard
        needForSpace={formData.needForSpace}
        specialNeeds={formData.specialNeeds}
        onFieldChange={onFieldChange}
      />

      {/* Schedule & Commute */}
      <ScheduleCommuteCard
        selectedDays={formData.selectedDays}
        transportationType={formData.transportationType}
        transportationOptions={transportationOptions}
        onDayToggle={onDayToggle}
        onFieldChange={onFieldChange}
      />

      {/* Trust & Verification */}
      <TrustVerificationCard
        verifications={verifications}
        onVerifyEmail={onVerifyEmail}
        onVerifyPhone={onVerifyPhone}
        onVerifyGovId={onVerifyGovId}
        onConnectLinkedIn={onConnectLinkedIn}
        onEditPhone={onEditPhone}
      />

      {/* Reasons to Host Me */}
      <ReasonsCard
        selectedReasons={formData.goodGuestReasons}
        reasonsList={goodGuestReasonsList}
        onChipToggle={onChipToggle}
      />

      {/* Storage Items */}
      <StorageItemsCard
        selectedItems={formData.storageItems}
        itemsList={storageItemsList}
        onChipToggle={onChipToggle}
      />

      {/* Video Introduction */}
      <VideoIntroCard
        videoUrl={profileData?.['Video Intro URL'] || null}
        onUpload={() => console.log('Video upload clicked')}
      />

      {/* Account Settings */}
      <AccountSettingsCard
        onOpenNotificationSettings={onOpenNotificationSettings}
        onChangePassword={onChangePassword}
      />
    </>
  );
}
