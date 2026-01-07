import { useState, useEffect } from 'react';
import Header from '../../shared/Header';
import Footer from '../../shared/Footer';
import { EditListingDetails } from '../../shared/EditListingDetails/EditListingDetails';
import ScheduleCohost from '../../shared/ScheduleCohost';
import ImportListingReviewsModal from '../../shared/ImportListingReviewsModal';
import AIImportAssistantModal from '../../shared/AIImportAssistantModal';
import ReferralModal from '../AccountProfilePage/components/ReferralModal';
import useListingDashboardPageLogic from './useListingDashboardPageLogic';
import {
  NavigationHeader,
  ActionCardGrid,
  AlertBanner,
  SecondaryActions,
  PropertyInfoSection,
  DetailsSection,
  AmenitiesSection,
  DescriptionSection,
  PricingSection,
  PricingEditSection,
  RulesSection,
  AvailabilitySection,
  PhotosSection,
  CancellationPolicySection,
} from './components';
import '../../../styles/components/listing-dashboard.css';
import '../AccountProfilePage/AccountProfilePage.css'; // For ReferralModal styles

export default function ListingDashboardPage() {
  const [showReferralModal, setShowReferralModal] = useState(false);

  // Add body class for page-specific header styling
  useEffect(() => {
    document.body.classList.add('listing-dashboard-page');
    return () => {
      document.body.classList.remove('listing-dashboard-page');
    };
  }, []);

  const {
    activeTab,
    listing,
    counts,
    isLoading,
    error,
    editSection,
    showScheduleCohost,
    showImportReviews,
    currentUser,
    existingCohostRequest,
    handleTabChange,
    handleCardClick,
    handleBackClick,
    handleDescriptionChange,
    handleCancellationPolicyChange,
    handleCancellationRestrictionsChange,
    handleCopyLink,
    handleAIAssistant,
    handleScheduleCohost,
    handleCloseScheduleCohost,
    handleCohostRequestSubmitted,
    handleImportReviews,
    handleCloseImportReviews,
    handleSubmitImportReviews,
    isImportingReviews,
    // AI Import Assistant
    showAIImportAssistant,
    handleCloseAIImportAssistant,
    handleAIImportComplete,
    handleStartAIGeneration,
    aiGenerationStatus,
    isAIGenerating,
    isAIComplete,
    aiGeneratedData,
    highlightedFields,
    handleSetCoverPhoto,
    handleDeletePhoto,
    handleReorderPhotos,
    handleEditSection,
    handleCloseEdit,
    handleSaveEdit,
    updateListing,
    editFocusField,
    handleBlockedDatesChange,
    handleAvailabilityChange,
  } = useListingDashboardPageLogic();

  // Loading state
  if (isLoading) {
    return (
      <>
        <Header />
        <div className="listing-dashboard">
          <div className="listing-dashboard__container">
            <div className="listing-dashboard__loading">
              <p>Loading listing...</p>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <Header />
        <div className="listing-dashboard">
          <div className="listing-dashboard__container">
            <div className="listing-dashboard__error">
              <p>Error: {error}</p>
              <button onClick={() => (window.location.href = '/host-overview')}>
                Go to My Listings
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // No listing found
  if (!listing) {
    return (
      <>
        <Header />
        <div className="listing-dashboard">
          <div className="listing-dashboard__container">
            <div className="listing-dashboard__not-found">
              <p>Listing not found</p>
              <button onClick={() => (window.location.href = '/host-dashboard')}>
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="listing-dashboard">
        {/* Main Container */}
        <div className="listing-dashboard__container">
          <div className="listing-dashboard__card">
            {/* Navigation Header */}
            <NavigationHeader
              activeTab={activeTab}
              onTabChange={handleTabChange}
              counts={counts}
              onBackClick={handleBackClick}
              onInviteClick={() => setShowReferralModal(true)}
              listingId={listing.id}
            />

            {/* Alert Banner - Schedule Cohost CTA */}
            <AlertBanner
              onScheduleCohost={handleScheduleCohost}
              existingRequest={existingCohostRequest}
            />

            {/* Action Cards Grid */}
            <ActionCardGrid counts={counts} onCardClick={handleCardClick} />

            {/* Secondary Actions */}
            <SecondaryActions
              onAIAssistant={handleAIAssistant}
            />

            {/* Property Info Section */}
            <div className={highlightedFields?.has('name') ? 'listing-dashboard-section--ai-highlighted' : ''}>
              <PropertyInfoSection
                listing={listing}
                onImportReviews={handleImportReviews}
                onEdit={() => handleEditSection('name')}
                reviewCount={counts.reviews}
              />
            </div>

            {/* Description Section */}
            <div className={
              (highlightedFields?.has('description') || highlightedFields?.has('neighborhood'))
                ? 'listing-dashboard-section--ai-highlighted'
                : ''
            }>
              <DescriptionSection
                listing={listing}
                onEditLodging={() => handleEditSection('description')}
                onEditNeighborhood={() => handleEditSection('neighborhood')}
              />
            </div>

            {/* Amenities Section */}
            <div className={highlightedFields?.has('amenities') ? 'listing-dashboard-section--ai-highlighted' : ''}>
              <AmenitiesSection
                listing={listing}
                onEditInUnit={() => handleEditSection('amenities')}
                onEditBuilding={() => handleEditSection('amenities', 'building')}
              />
            </div>

            {/* Details Section */}
            <DetailsSection
              listing={listing}
              onEdit={() => handleEditSection('details')}
            />

            {/* Pricing & Lease Style Section */}
            <PricingSection
              listing={listing}
              onEdit={() => handleEditSection('pricing')}
            />

            {/* Rules Section */}
            <div className={
              (highlightedFields?.has('rules') || highlightedFields?.has('safety'))
                ? 'listing-dashboard-section--ai-highlighted'
                : ''
            }>
              <RulesSection
                listing={listing}
                onEdit={() => handleEditSection('rules')}
              />
            </div>

            {/* Availability Section */}
            <AvailabilitySection
              listing={listing}
              onEdit={() => handleEditSection('availability')}
              onBlockedDatesChange={handleBlockedDatesChange}
              onAvailabilityChange={handleAvailabilityChange}
            />

            {/* Photos Section */}
            <PhotosSection
              listing={listing}
              onAddPhotos={() => handleEditSection('photos')}
              onDeletePhoto={handleDeletePhoto}
              onSetCover={handleSetCoverPhoto}
              onReorderPhotos={handleReorderPhotos}
            />

            {/* Cancellation Policy Section */}
            <CancellationPolicySection
              listing={listing}
              onPolicyChange={handleCancellationPolicyChange}
              onRestrictionsChange={handleCancellationRestrictionsChange}
            />
          </div>
        </div>
      </div>
      <Footer />

      {/* Pricing Edit Section (Full-screen overlay) */}
      {editSection === 'pricing' && (
        <PricingEditSection
          listing={listing}
          onClose={handleCloseEdit}
          onSave={async (updates) => {
            await updateListing(listing.id, updates);
            handleSaveEdit(updates);
          }}
          isOwner={true}
        />
      )}

      {/* Edit Listing Details Modal */}
      {editSection && editSection !== 'pricing' && (
        <EditListingDetails
          focusField={editFocusField}
          listing={{
            _id: listing.id,
            Name: listing.title,
            Description: listing.description,
            'Description - Neighborhood': listing.descriptionNeighborhood,
            'Location - Address': { address: listing.location?.address },
            'Location - City': listing.location?.city,
            'Location - State': listing.location?.state,
            'Location - Zip Code': listing.location?.zipCode,
            'Location - Borough': listing.location?.boroughDisplay,
            'Location - Hood': listing.location?.hoodsDisplay,
            'Features - Type of Space': listing.features?.typeOfSpace?.id,
            'Features - Qty Bedrooms': listing.features?.bedrooms,
            'Features - Qty Bathrooms': listing.features?.bathrooms,
            'Features - Qty Beds': listing.features?.bedrooms,
            'Features - Qty Guests': listing.maxGuests,
            'Features - SQFT Area': listing.features?.squareFootage,
            'Features - SQFT of Room': listing.features?.squareFootageRoom,
            'Kitchen Type': listing.features?.kitchenType?.id,
            'Features - Parking type': listing.features?.parkingType?.label,
            'Features - Secure Storage Option': listing.features?.storageType?.label,
            'Features - House Rules': listing.houseRules?.map(r => r.name) || [],
            'Features - Photos': listing.photos?.map(p => p.url) || [],
            'Features - Amenities In-Unit': listing.inUnitAmenities?.map(a => a.name) || [],
            'Features - Amenities In-Building': listing.buildingAmenities?.map(a => a.name) || [],
            'Features - Safety': listing.safetyFeatures?.map(s => s.name) || [],
            'First Available': listing.earliestAvailableDate,
            'Minimum Nights': listing.nightsPerWeekMin,
            'Maximum Nights': listing.nightsPerWeekMax,
            'Cancellation Policy': listing.cancellationPolicy,
          }}
          editSection={editSection}
          onClose={handleCloseEdit}
          onSave={handleSaveEdit}
          updateListing={updateListing}
        />
      )}

      {/* Schedule Cohost Modal */}
      {showScheduleCohost && (
        <ScheduleCohost
          userId={currentUser?.userId || currentUser?._id || currentUser?.id || ''}
          userEmail={currentUser?.email || ''}
          userName={currentUser?.firstName || currentUser?.name || ''}
          listingId={listing?.id}
          existingRequest={existingCohostRequest}
          onRequestSubmitted={handleCohostRequestSubmitted}
          onClose={handleCloseScheduleCohost}
        />
      )}

      {/* Import Listing Reviews Modal */}
      <ImportListingReviewsModal
        isOpen={showImportReviews}
        onClose={handleCloseImportReviews}
        onSubmit={handleSubmitImportReviews}
        currentUserEmail={currentUser?.email || ''}
        listingId={listing?.id}
        isLoading={isImportingReviews}
      />

      {/* AI Import Assistant Modal */}
      <AIImportAssistantModal
        isOpen={showAIImportAssistant}
        onClose={handleCloseAIImportAssistant}
        onComplete={handleAIImportComplete}
        generationStatus={aiGenerationStatus}
        isGenerating={isAIGenerating}
        isComplete={isAIComplete}
        generatedData={aiGeneratedData}
        onStartGeneration={handleStartAIGeneration}
      />

      {/* Referral Modal */}
      <ReferralModal
        isOpen={showReferralModal}
        onClose={() => setShowReferralModal(false)}
        referralCode={currentUser?._id || currentUser?.id || 'user'}
        userType="host"
        referrerName={currentUser?.['Name - First'] || currentUser?.firstName || currentUser?.name || ''}
      />
    </>
  );
}
