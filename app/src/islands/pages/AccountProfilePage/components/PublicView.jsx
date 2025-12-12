/**
 * PublicView.jsx
 *
 * Public/read-only mode wrapper that renders profile cards for viewing.
 * Shown when user is viewing someone else's profile.
 */

import React from 'react';
import AboutCard from './cards/AboutCard.jsx';
import RequirementsCard from './cards/RequirementsCard.jsx';
import ScheduleCommuteCard from './cards/ScheduleCommuteCard.jsx';
import TrustVerificationCard from './cards/TrustVerificationCard.jsx';
import ReasonsCard from './cards/ReasonsCard.jsx';
import StorageItemsCard from './cards/StorageItemsCard.jsx';
import VideoIntroCard from './cards/VideoIntroCard.jsx';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Convert day names to indices (0-6)
 */
function dayNamesToIndices(dayNames) {
  if (!Array.isArray(dayNames)) return [];
  return dayNames
    .map(name => DAY_NAMES.indexOf(name))
    .filter(idx => idx !== -1);
}

export default function PublicView({
  profileData,
  verifications,
  goodGuestReasonsList,
  storageItemsList
}) {
  // Extract data from profile
  const bio = profileData?.['About Me'] || '';
  const needForSpace = profileData?.['Guest Account (Profile) - Need for Space'] || '';
  const specialNeeds = profileData?.['Guest Account (Profile) - Special Needs?'] || '';
  const selectedDays = dayNamesToIndices(profileData?.['Recent Days Selected'] || []);
  const transportationType = profileData?.['Transportation'] || '';
  const goodGuestReasons = profileData?.['Good Guest Reasons'] || [];
  const storageItems = profileData?.['storage'] || [];
  const videoUrl = profileData?.['Video Intro URL'] || null;

  // Transportation options for display
  const transportationOptions = [
    { value: '', label: 'Not specified' },
    { value: 'car', label: 'Car' },
    { value: 'public_transit', label: 'Public Transit' },
    { value: 'bicycle', label: 'Bicycle' },
    { value: 'walking', label: 'Walking' },
    { value: 'rideshare', label: 'Rideshare (Uber/Lyft)' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <>
      {/* About */}
      <AboutCard
        bio={bio}
        readOnly={true}
      />

      {/* Requirements */}
      {(needForSpace || specialNeeds) && (
        <RequirementsCard
          needForSpace={needForSpace}
          specialNeeds={specialNeeds}
          readOnly={true}
        />
      )}

      {/* Schedule & Commute */}
      {(selectedDays.length > 0 || transportationType) && (
        <ScheduleCommuteCard
          selectedDays={selectedDays}
          transportationType={transportationType}
          transportationOptions={transportationOptions}
          readOnly={true}
        />
      )}

      {/* Trust & Verification */}
      <TrustVerificationCard
        verifications={verifications}
        readOnly={true}
      />

      {/* Reasons to Host */}
      {goodGuestReasons.length > 0 && (
        <ReasonsCard
          selectedReasons={goodGuestReasons}
          reasonsList={goodGuestReasonsList}
          readOnly={true}
        />
      )}

      {/* Storage Items */}
      {storageItems.length > 0 && (
        <StorageItemsCard
          selectedItems={storageItems}
          itemsList={storageItemsList}
          readOnly={true}
        />
      )}

      {/* Video Introduction */}
      {videoUrl && (
        <VideoIntroCard
          videoUrl={videoUrl}
          readOnly={true}
        />
      )}
    </>
  );
}
