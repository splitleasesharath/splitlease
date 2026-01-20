/**
 * PublicView.jsx
 *
 * Public/read-only mode wrapper that renders profile cards for viewing.
 * Shown when user is viewing someone else's profile.
 *
 * Design Reference: Guest_Profile_Public_v3.html
 */

import React from 'react';
import AboutCard from './cards/AboutCard.jsx';
import WhySplitLeaseCard from './cards/WhySplitLeaseCard.jsx';
import MyRequirementsCard from './cards/MyRequirementsCard.jsx';
import ScheduleCard from './cards/ScheduleCard.jsx';
import TransportCard from './cards/TransportCard.jsx';
import ReasonsCard from './cards/ReasonsCard.jsx';
import StorageItemsCard from './cards/StorageItemsCard.jsx';
import ListingsCard from './cards/ListingsCard.jsx';

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
  storageItemsList,
  // Host-specific props
  isHostUser = false,
  hostListings = [],
  onListingClick
}) {
  // Extract data from profile
  const bio = profileData?.['About Me / Bio'] || '';
  const needForSpace = profileData?.['need for Space'] || '';
  const specialNeeds = profileData?.['special needs'] || '';
  const selectedDays = dayNamesToIndices(profileData?.['Recent Days Selected'] || []);

  // Parse transportation medium - handle both legacy string and new array format
  const rawTransport = profileData?.['transportation medium'];
  let transportationTypes = [];
  if (Array.isArray(rawTransport)) {
    transportationTypes = rawTransport;
  } else if (rawTransport && typeof rawTransport === 'string') {
    // Legacy: single string value - convert to array
    transportationTypes = [rawTransport];
  }

  const goodGuestReasons = profileData?.['Good Guest Reasons'] || [];
  const storageItems = profileData?.['storage'] || [];
  const firstName = profileData?.['Name - First'] || 'this guest';

  // Transportation options for display
  const transportationOptions = [
    { value: '', label: 'Not specified' },
    { value: 'car', label: 'Mostly drive', icon: 'car' },
    { value: 'public_transit', label: 'Public transit', icon: 'train' },
    { value: 'bicycle', label: 'Bicycle', icon: 'bike' },
    { value: 'walking', label: 'Walk', icon: 'footprints' },
    { value: 'rideshare', label: 'Rideshare', icon: 'car' },
    { value: 'other', label: 'Other', icon: 'compass' }
  ];

  return (
    <>
      {/* About - Always shown */}
      <AboutCard
        bio={bio}
        readOnly={true}
        firstName={firstName}
      />

      {/* Guest-only: Why I Want a Split Lease */}
      {!isHostUser && needForSpace && (
        <WhySplitLeaseCard
          content={needForSpace}
        />
      )}

      {/* Guest-only: My Requirements */}
      {!isHostUser && specialNeeds && (
        <MyRequirementsCard
          content={specialNeeds}
        />
      )}

      {/* Guest-only: Schedule */}
      {!isHostUser && selectedDays.length > 0 && (
        <ScheduleCard
          selectedDays={selectedDays}
          readOnly={true}
        />
      )}

      {/* Guest-only: Transport (multi-select) */}
      {!isHostUser && transportationTypes.length > 0 && (
        <TransportCard
          transportationTypes={transportationTypes}
          transportationOptions={transportationOptions}
          readOnly={true}
        />
      )}

      {/* Guest-only: Reasons to Host */}
      {!isHostUser && goodGuestReasons.length > 0 && (
        <ReasonsCard
          selectedReasons={goodGuestReasons}
          reasonsList={goodGuestReasonsList}
          readOnly={true}
        />
      )}

      {/* Guest-only: Storage Items */}
      {!isHostUser && storageItems.length > 0 && (
        <StorageItemsCard
          selectedItems={storageItems}
          itemsList={storageItemsList}
          readOnly={true}
        />
      )}

      {/* Host-only: Listings */}
      {isHostUser && hostListings.length > 0 && (
        <ListingsCard
          listings={hostListings}
          loading={false}
          onListingClick={onListingClick}
          readOnly={true}
        />
      )}
    </>
  );
}
